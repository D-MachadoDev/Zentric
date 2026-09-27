using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Application.Common.Ports;
using Zentric.Domain.Orders.Ports;
using Zentric.Domain.Payments;
using Zentric.Domain.Payments.Ports;

namespace Zentric.Application.Orders.Commands
{
    public record PayOrderCommand(Guid OrderId) : IRequest<Result<bool>>;

    public class PayOrderCommandHandler : IRequestHandler<PayOrderCommand, Result<bool>>
    {
        private readonly ICustomerOrderRepository _orderRepository;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IPaymentGatewayService _paymentGateway;
        private readonly IPaymentReceiptRepository _receiptRepository;

        public PayOrderCommandHandler(
            ICustomerOrderRepository orderRepository,
            IUnitOfWork unitOfWork,
            IPaymentGatewayService paymentGateway,
            IPaymentReceiptRepository receiptRepository)
        {
            _orderRepository = orderRepository;
            _unitOfWork = unitOfWork;
            _paymentGateway = paymentGateway;
            _receiptRepository = receiptRepository;
        }

        public async Task<Result<bool>> Handle(PayOrderCommand request, CancellationToken cancellationToken)
        {
            var order = await _orderRepository.GetByIdAsync(request.OrderId, cancellationToken);
            if (order == null)
            {
                return Result<bool>.Failure($"Order with ID {request.OrderId} not found.");
            }

            // Q-08: primero se cobra, y solo si la pasarela aprueba se marca el
            // pedido como pagado. El inverso (marcar pagado y cobrar despues)
            // dejaria pedidos pagados sin Cobro, que es el fallo que la pasarela
            // existe para evitar. Un rechazo es un resultado previsto, no una
            // excepcion: se devuelve como Result.Failure.
            var charge = await _paymentGateway.ChargeAsync(order.Id, order.TotalAmount, cancellationToken);

            // El comprobante (invariante 9) se emite siempre, incluso si la pasarela
            // rechaza: es el unico registro de que se intento cobrar.
            var receipt = PaymentReceipt.Create(order.Id, order.TotalAmount);

            if (!charge.Approved)
            {
                receipt.Decline();
                await _receiptRepository.AddAsync(receipt, cancellationToken);
                await _unitOfWork.SaveChangesAsync(cancellationToken);

                return Result<bool>.Failure(
                    $"Payment was declined for order {order.Id}." +
                    (charge.DeclineReason is null ? string.Empty : $" Reason: {charge.DeclineReason}"));
            }

            try
            {
                receipt.Approve(charge.TransactionId!);
                order.MarkAsPaid();

                await _receiptRepository.AddAsync(receipt, cancellationToken);
                await _orderRepository.UpdateAsync(order, cancellationToken);
                await _unitOfWork.SaveChangesAsync(cancellationToken);

                return Result<bool>.Success(true);
            }
            catch (InvalidOperationException ex)
            {
                return Result<bool>.Failure(ex.Message);
            }
        }
    }
}
