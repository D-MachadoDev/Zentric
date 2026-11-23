using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
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
using Zentric.Domain.Users.Ports;

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
        private readonly IUserRepository? _userRepository;
        private readonly IEmailSender? _emailSender;
        private readonly IConfiguration? _configuration;
        private readonly ILogger<PayOrderCommandHandler>? _logger;

        public PayOrderCommandHandler(
            IMediator mediator,
            ICustomerOrderRepository orderRepository,
            IUnitOfWork unitOfWork,
            IPaymentGatewayService paymentGateway,
            IPaymentReceiptRepository receiptRepository,
            IProductRepository productRepository,
            IUserRepository? userRepository = null,
            IEmailSender? emailSender = null,
            IConfiguration? configuration = null,
            ILogger<PayOrderCommandHandler>? logger = null)
        {
            _mediator = mediator;
            _orderRepository = orderRepository;
            _unitOfWork = unitOfWork;
            _paymentGateway = paymentGateway;
            _receiptRepository = receiptRepository;
            _productRepository = productRepository;
            _userRepository = userRepository;
            _emailSender = emailSender;
            _configuration = configuration;
            _logger = logger;
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

                // CAregistrar entrega inmediata de productos digitales. Tambien se
                // recolecta el enlace de descarga para el correo posterior.
                var digitalItems = new List<(string ProductName, string? DownloadUrl)>();
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
                        digitalItems.Add((product.Name, product.DigitalDownloadUrl));
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

                // Enviar la factura por correo al comprador: no fatal. El pago y
                // las facturas ya quedaron registrados, así que un fallo aquí no
                // revierte nada.
                try
                {
                    await SendInvoiceEmailAsync(order, cancellationToken);
                }
                catch (Exception ex)
                {
                    _logger?.LogError(
                        ex,
                        "[PayOrderCommand] Error al enviar el correo con la factura del pedido {OrderId}. El pago y las facturas ya quedaron registrados.",
                        order.Id);
                }

                // Enviar el correo de entrega por cada producto digital: no fatal.
                try
                {
                    await SendDigitalDeliveryEmailsAsync(order, digitalItems, cancellationToken);
                }
                catch (Exception ex)
                {
                    _logger?.LogError(
                        ex,
                        "[PayOrderCommand] Error al enviar los correos de entrega digital del pedido {OrderId}. El pago y la entrega ya quedaron registrados.",
                        order.Id);
                }

                return Result<bool>.Success(true);
            }
            catch (InvalidOperationException ex)
            {
                return Result<bool>.Failure(ex.Message);
            }
        }

        /// <summary>
        /// Genera el PDF de la factura y lo envía por correo al comprador real.
        /// Si no hay remitente configurado (por ejemplo, en tests) no hace nada.
        /// </summary>
        private async Task SendInvoiceEmailAsync(CustomerOrder order, CancellationToken cancellationToken)
        {
            if (_emailSender is null)
            {
                return;
            }

            var (buyerEmail, buyerName) = await ResolveBuyerContactAsync(order);

            var pdfGenerator = new PdfInvoiceGenerator();
            var invoicePdf = pdfGenerator.GenerateInvoice(order, buyerEmail);

            var baseUrl = _configuration?["Frontend:BaseUrl"] ?? "http://localhost:15434";
            var invoiceUrl = $"{baseUrl.TrimEnd('/')}/buyer/orders/{order.Id}";
            var orderCode = order.Id.ToString()[..8].ToUpperInvariant();

            await _emailSender.SendInvoiceEmailAsync(
                buyerEmail,
                buyerName,
                orderCode,
                invoicePdf,
                invoiceUrl,
                cancellationToken);
        }

        /// <summary>
        /// Envía un correo de entrega por cada producto digital del pedido. No
        /// fatal: el pago y la entrega ya quedaron registrados antes de llegar aquí.
        /// </summary>
        private async Task SendDigitalDeliveryEmailsAsync(
            CustomerOrder order,
            IReadOnlyList<(string ProductName, string? DownloadUrl)> digitalItems,
            CancellationToken cancellationToken)
        {
            if (_emailSender is null || digitalItems.Count == 0)
            {
                return;
            }

            var (buyerEmail, buyerName) = await ResolveBuyerContactAsync(order);

            foreach (var (productName, downloadUrl) in digitalItems)
            {
                await _emailSender.SendDigitalDeliveryEmailAsync(
                    buyerEmail,
                    buyerName,
                    productName,
                    downloadUrl,
                    order.Id.ToString(),
                    cancellationToken);
            }
        }

        /// <summary>
        /// Correo y nombre real del comprador desde su cuenta; si no está
        /// disponible, se degrada a un identificador determinista para no romper el envío.
        /// </summary>
        private async Task<(string Email, string Name)> ResolveBuyerContactAsync(CustomerOrder order)
        {
            string buyerEmail = $"buyer-{order.BuyerId}@zentric.local";
            string buyerName = "Comprador";

            if (_userRepository is not null)
            {
                var user = await _userRepository.GetByIdAsync(order.BuyerId);
                if (user is not null)
                {
                    if (!string.IsNullOrWhiteSpace(user.Email?.Value))
                    {
                        buyerEmail = user.Email.Value;
                    }

                    if (!string.IsNullOrWhiteSpace(user.FullName?.Value))
                    {
                        buyerName = user.FullName.Value;
                    }
                }
            }

            return (buyerEmail, buyerName);
        }
    }
}
