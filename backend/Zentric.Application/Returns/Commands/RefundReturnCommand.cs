using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Application.Common.Ports;
using Zentric.Domain.Orders.Ports;
using Zentric.Domain.Payments;
using Zentric.Domain.Payments.Ports;
using Zentric.Domain.Products.Ports;
using Zentric.Domain.Products.ValueObjects;
using Zentric.Domain.Returns.Ports;
using Zentric.Domain.Users.Enums;

namespace Zentric.Application.Returns.Commands
{
    /// <summary>
    /// Reembolsa una devolucion aprobada (ADDENDUM Dominio 10, estado "Reembolsada").
    ///
    /// Este estado existia en el enum y en <c>ReturnRequest.MarkAsRefunded()</c>, pero no habia
    /// comando ni endpoint. Ademas, <c>PaymentReceipt.Refund()</c> estaba implementado en el
    /// dominio con sus validaciones e idempotencia, y **nadie lo llamaba nunca**: el dinero nunca
    /// llegaba al comprador. Una devolucion aprobada se quedaba esperando un reembolso que no
    /// existia en ninguna parte del sistema.
    ///
    /// A diferencia del rechazo, aqui el estado NO basta: cambiar la devolucion a Reembolsada sin
    /// acreditar el comprobante dejaria al comprador con un estado que promete dinero que nunca se
    /// devolvio. Por eso este caso de uso hace las dos cosas y en una sola transaccion.
    ///
    /// Quien lo ejecuta (dictamen del Owner, 2026-10-01): solo el **Administrador**. Es dinero que
    /// sale de la plataforma y la separacion de poderes mas simple: quien aprueba el reingreso del
    /// producto (Vendedor) no es quien libera el dinero (Administrador). Es ademas el mismo criterio
    /// de la emision de facturas, que ADR-0014 ya dejo en manos del Administrador.
    /// </summary>
    public record RefundReturnCommand(
        Guid ReturnRequestId,
        Guid CallerId,
        UserRole CallerRole) : IRequest<Result<bool>>;

    public class RefundReturnCommandHandler : IRequestHandler<RefundReturnCommand, Result<bool>>
    {
        /// <summary>
        /// Identificador estable de la regla que se aplico, escrito en cada
        /// <see cref="Zentric.Domain.Payments.RefundCredit"/>. ADR-0020 decision 7
        /// exige registrar la "regla aplicada": en un string por credito y no en una
        /// columna de version, para que no dependa de tablas y responda exactamente
        /// cual regla se aplico en ese momento. Credito = precio congelado de la linea
        /// (invariante 15) x unidades devueltas, con el tope de invariante 14.
        /// </summary>
        private const string RefundRuleApplied = "EXC-02: frozen line price x returned units (ADR-0020 d.6, invariants 14-15)";

        private readonly IReturnRequestRepository _returnRepository;
        private readonly IPaymentReceiptRepository _receiptRepository;
        private readonly ICustomerOrderRepository _orderRepository;
        private readonly IUnitOfWork _unitOfWork;

        public RefundReturnCommandHandler(
            IReturnRequestRepository returnRepository,
            IPaymentReceiptRepository receiptRepository,
            ICustomerOrderRepository orderRepository,
            IUnitOfWork unitOfWork)
        {
            _returnRepository = returnRepository;
            _receiptRepository = receiptRepository;
            _orderRepository = orderRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<Result<bool>> Handle(RefundReturnCommand request, CancellationToken cancellationToken)
        {
            // Fail-closed: no se fia solo de la politica. Es dinero saliendo de la plataforma.
            if (request.CallerRole != UserRole.Administrator)
            {
                return Result<bool>.Failure("Only an administrator can issue a refund.");
            }

            var returnReq = await _returnRepository.GetByIdAsync(request.ReturnRequestId, cancellationToken);
            if (returnReq == null)
            {
                return Result<bool>.NotFound("Return request not found.");
            }

            // El comprobante del pedido: es el unico lugar donde vive el dinero. Sin comprobante
            // cobrado no hay nada que acreditar, y decirlo es mejor que marcar la devolucion como
            // reembolsada sin credito real.
            var receipt = await _receiptRepository.GetByOrderIdAsync(returnReq.CustomerOrderId, cancellationToken);
            if (receipt == null)
            {
                return Result<bool>.Failure(
                    $"Order {returnReq.CustomerOrderId} has no payment receipt, so there is nothing to refund.");
            }

            try
            {
                // ADR-0020: el credito es el precio CONGELADO de la linea por la cantidad devuelta,
                // no el total del comprobante. Conceder el total a cambio de una sola unidad
                // devuelta es la misma clase de fallo que el 'if (Status == Refunded) return;'
                // anterior, una capa mas arriba: el sistema responde 200 y el dinero sale.
                // El techo lo impone Receipt.Refund() contra el saldo pendiente, asi que una
                // cantidad devuelta corrupta no puede autorizar mas de lo cobrado.
                var credit = await BuildCreditAsync(returnReq, receipt, request.CallerId, cancellationToken);
                if (credit == null)
                {
                    return Result<bool>.Failure(
                        "The returned variant is not on the order, so there is nothing to credit.");
                }

                // Primero el dinero, despues el estado. Si Refund() falla por una invariante
                // (comprobante no cobrado, moneda distinta, credito mayor que el saldo), la
                // devolucion sigue Aprobada y se puede reintentar. Al reves, quedaria
                // "Reembolsada" sin dinero entregado.
                //
                // Se pasa el REGISTRO y no un Money suelto: acreditar sin dejar traza romperia
                // ADR-0020 decision 7, que exige poder responder de cada credito por separado.
                receipt.Refund(credit);
                returnReq.MarkAsRefunded();

                await _receiptRepository.UpdateAsync(receipt, cancellationToken);
                await _returnRepository.UpdateAsync(returnReq, cancellationToken);

                // Una sola transaccion: o se acreditan las dos cosas, o ninguna.
                await _unitOfWork.SaveChangesAsync(cancellationToken);

                return Result<bool>.Success(true);
            }
            catch (Exception ex) when (ex is ArgumentException || ex is InvalidOperationException)
            {
                return Result<bool>.Failure(ex.Message);
            }
        }

        /// <summary>
        /// Construye el registro de trazabilidad de este credito, o <c>null</c> cuando la
        /// variante devuelta no esta en el pedido y no hay nada que acreditar.
        ///
        /// El importe es el precio unitario congelado de la linea por las unidades
        /// devueltas, limitado a las unidades compradas para que una devolucion con mas
        /// unidades de las compradas no multiplique el credito.
        /// </summary>
        private async Task<RefundCredit?> BuildCreditAsync(
            Zentric.Domain.Returns.ReturnRequest returnReq,
            Zentric.Domain.Payments.PaymentReceipt receipt,
            Guid actorId,
            CancellationToken cancellationToken)
        {
            var order = await _orderRepository.GetByIdAsync(returnReq.CustomerOrderId, cancellationToken);
            if (order == null)
            {
                return null;
            }

            var line = order.Items.FirstOrDefault(i => i.VariantId == returnReq.VariantId);
            if (line == null)
            {
                return null;
            }

            var refundableUnits = Math.Min(returnReq.Quantity, line.Quantity);
            var amount = new Money(line.UnitPrice.Amount * refundableUnits, line.UnitPrice.Currency);

            return new RefundCredit(
                paymentReceiptId: receipt.Id,
                returnRequestId: returnReq.Id,
                customerOrderId: order.Id,
                orderItemId: line.Id,
                variantId: line.VariantId,
                quantity: refundableUnits,
                amount: amount,
                ruleApplied: RefundRuleApplied,
                actorId: actorId,
                occurredAt: DateTime.UtcNow);
        }
    }
}