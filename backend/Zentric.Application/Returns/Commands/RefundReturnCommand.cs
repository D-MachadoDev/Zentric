using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Application.Common.Ports;
using Zentric.Domain.Payments.Ports;
using Zentric.Domain.Products.Ports;
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
        private readonly IReturnRequestRepository _returnRepository;
        private readonly IPaymentReceiptRepository _receiptRepository;
        private readonly IUnitOfWork _unitOfWork;

        public RefundReturnCommandHandler(
            IReturnRequestRepository returnRepository,
            IPaymentReceiptRepository receiptRepository,
            IUnitOfWork unitOfWork)
        {
            _returnRepository = returnRepository;
            _receiptRepository = receiptRepository;
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
                // Primero el dinero, despues el estado. Si Refund() falla por una invariante
                // (comprobante no cobrado, moneda distinta), la devolucion sigue Aprobada y se
                // puede reintentar. Al reves, quedaria "Reembolsada" sin dinero entregado.
                receipt.Refund(receipt.Amount);
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
    }
}