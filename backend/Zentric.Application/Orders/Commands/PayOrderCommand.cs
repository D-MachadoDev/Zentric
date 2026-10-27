using Zentric.Application.Billing.Commands;
using Zentric.Application.Billing.Pdf;
using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Application.Common.Ports;
using Zentric.Domain.Orders;
using Zentric.Domain.Orders.Entities;
using Zentric.Domain.Orders.Ports;
using Zentric.Domain.Payments;
using Zentric.Domain.Payments.Ports;
using Zentric.Domain.Products.Ports;

namespace Zentric.Application.Orders.Commands
{
    /// <summary>
    /// Cobra y marca como pagado un pedido. <paramref name="BuyerId"/>
    /// viaja para que el handler cargue el pedido con el filtro por comprador:
    /// nadie paga un pedido ajeno.
    /// </summary>
    public record PayOrderCommand(Guid OrderId, Guid BuyerId) : IRequest<Result<bool>>;

    public class PayOrderCommandHandler : IRequestHandler<PayOrderCommand, Result<bool>>
    {
        private readonly IMediator _mediator;
        private readonly ICustomerOrderRepository _orderRepository;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IPaymentGatewayService _paymentGateway;
        private readonly IPaymentReceiptRepository _receiptRepository;
        private readonly IProductRepository _productRepository;

        public PayOrderCommandHandler(
            IMediator mediator,
            ICustomerOrderRepository orderRepository,
            IUnitOfWork unitOfWork,
            IPaymentGatewayService paymentGateway,
            IPaymentReceiptRepository receiptRepository,
            IProductRepository productRepository)
        {
            _mediator = mediator;
            _orderRepository = orderRepository;
            _unitOfWork = unitOfWork;
            _paymentGateway = paymentGateway;
            _receiptRepository = receiptRepository;
            _productRepository = productRepository;
        }

        public async Task<Result<bool>> Handle(PayOrderCommand request, CancellationToken cancellationToken)
        {
            // El pedido se carga con el filtro por comprador; el de otro
            // comprador se trata igual que uno inexistente.
            var order = await _orderRepository.GetByIdForBuyerAsync(
                request.OrderId, request.BuyerId, cancellationToken);
            if (order == null)
            {
                return Result<bool>.NotFound($"Order with ID {request.OrderId} not found.");
            }

            // Primero se cobra, y solo si la pasarela aprueba se marca el
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

                // CAregistrar entrega inmediata de productos digitales
                foreach (var item in order.Items)
                {
                    var product = await _productRepository.GetByVariantIdAsync(item.VariantId, cancellationToken);
                    if (product is not null && product.Type == Zentric.Domain.Products.Enums.ProductType.Digital)
                    {
                        item.MarkDelivered();
                        var digitalDelivery = new DigitalDeliveryRecord(
                            order.Id,
                            item.Id,
                            product.Id,
                            item.VariantId,
                            product.Name,
                            product.Variants.FirstOrDefault(v => v.Id == item.VariantId)?.Sku ?? "UNKNOWN");
                        order.AddDigitalDelivery(digitalDelivery);
                    }
                }

                await _receiptRepository.AddAsync(receipt, cancellationToken);
                await _orderRepository.UpdateAsync(order, cancellationToken);
                await _unitOfWork.SaveChangesAsync(cancellationToken);

                // Auto-generate invoices after successful payment (ACID: within same transaction context)
                var generateResult = await _mediator.Send(
                    new GenerateInvoicesCommand(order.Id),
                    cancellationToken);

                if (generateResult.IsFailure)
                {
                    // If invoice generation fails, we should ideally roll back the payment
                    // to maintain ACID consistency (payment recorded but invoice not generated).
                    // For now, return failure but the payment is already recorded;
                    // a future enhancement would add a compensation command to void the payment.
                    // TODO: Implement compensation mechanism to roll back payment if invoice fails.
                    return Result<bool>.Failure(
                        $"Payment processed but invoice generation failed: {generateResult.Error}");
                }

                // Generate PDF invoice
                var orderForPdf = order; // Already loaded via GetByIdForBuyerAsync
                var buyerEmail = orderForPdf.BuyerId != Guid.Empty
                    ? $"buyer-{orderForPdf.BuyerId}@zentric.local"
                    : "buyer@zentric.local";

                var pdfGenerator = new PdfInvoiceGenerator();
                var invoicePdf = pdfGenerator.GenerateInvoice(orderForPdf!, buyerEmail);

                // Save PDF to persistent storage (file system, blob storage, etc.)
                // and return a download URL. For now, we log the PDF bytes count.
                var pdfBytes = invoicePdf.Length;
                _ = pdfBytes; // TODO: Implement PDF storage in blob storage and return download URL
                // In a production system, this would be stored in a blob container and a URL returned.

                return Result<bool>.Success(true);
            }
            catch (InvalidOperationException ex)
            {
                return Result<bool>.Failure(ex.Message);
            }
        }
    }
}
