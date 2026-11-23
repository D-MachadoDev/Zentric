using Zentric.Application.Billing.Pdf;
using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Domain.Billing.Enums;
using Zentric.Domain.Billing.Ports;
using Zentric.Domain.Orders;
using Zentric.Domain.Orders.Ports;
using Zentric.Domain.Users.Enums;
using Zentric.Domain.Users.Ports;

namespace Zentric.Application.Billing.Queries;

/// <summary>
/// Consulta para descargar la representación gráfica oficial en PDF de una factura electrónica DIAN.
/// Aplica Zero Trust:
/// - Comprador: Únicamente Factura Maestra de sus propios pedidos.
/// - Vendedor: Únicamente sus facturas de detalle comercial.
/// - Administrador / Supervisor: Acceso irrestricto de auditoría.
/// </summary>
public sealed record GetInvoicePdfQuery(
    Guid InvoiceId,
    Guid CallerId,
    UserRole CallerRole
) : IRequest<Result<InvoicePdfResult>>;

/// <summary>
/// Resultado binario de la generación de PDF tributario para streaming HTTP seguro.
/// </summary>
public sealed record InvoicePdfResult(
    byte[] FileBytes,
    string FileName,
    string ContentType
);

public sealed class GetInvoicePdfQueryHandler : IRequestHandler<GetInvoicePdfQuery, Result<InvoicePdfResult>>
{
    private readonly IInvoiceRepository _invoiceRepository;
    private readonly ICustomerOrderRepository _customerOrderRepository;
    private readonly IUserRepository? _userRepository;

    public GetInvoicePdfQueryHandler(
        IInvoiceRepository invoiceRepository,
        ICustomerOrderRepository customerOrderRepository,
        IUserRepository? userRepository = null)
    {
        _invoiceRepository = invoiceRepository;
        _customerOrderRepository = customerOrderRepository;
        _userRepository = userRepository;
    }

    public async Task<Result<InvoicePdfResult>> Handle(GetInvoicePdfQuery request, CancellationToken cancellationToken)
    {
        var invoice = await _invoiceRepository.GetByIdAsync(request.InvoiceId, cancellationToken);
        if (invoice == null)
        {
            return Result<InvoicePdfResult>.NotFound("Factura no encontrada.");
        }

        CustomerOrder? order;

        switch (request.CallerRole)
        {
            case UserRole.Buyer:
                // El comprador solo puede descargar la Factura Maestra de su pedido
                if (invoice.Type != InvoiceType.Master)
                {
                    return Result<InvoicePdfResult>.NotFound("Factura no encontrada.");
                }

                order = await _customerOrderRepository.GetByIdForBuyerAsync(
                    invoice.CustomerOrderId, request.CallerId, cancellationToken);

                if (order == null)
                {
                    return Result<InvoicePdfResult>.NotFound("Factura no encontrada.");
                }
                break;

            case UserRole.Seller:
                // El vendedor solo puede descargar facturas donde es titular
                if (invoice.VendorId != request.CallerId)
                {
                    return Result<InvoicePdfResult>.NotFound("Factura no encontrada.");
                }

                order = await _customerOrderRepository.GetByIdAsync(invoice.CustomerOrderId, cancellationToken);
                if (order == null)
                {
                    return Result<InvoicePdfResult>.NotFound("Pedido no encontrado.");
                }
                break;

            case UserRole.Administrator:
            case UserRole.Supervisor:
            case UserRole.LogisticsOperator:
                order = await _customerOrderRepository.GetByIdAsync(invoice.CustomerOrderId, cancellationToken);
                if (order == null)
                {
                    return Result<InvoicePdfResult>.NotFound("Pedido no encontrado.");
                }
                break;

            default:
                return Result<InvoicePdfResult>.NotFound("Factura no encontrada.");
        }

        string buyerEmail = $"comprador-{order.BuyerId.ToString()[..8].ToLowerInvariant()}@zentric.co";
        if (_userRepository != null)
        {
            try
            {
                var buyerUser = await _userRepository.GetByIdAsync(order.BuyerId);
                if (buyerUser != null && !string.IsNullOrWhiteSpace(buyerUser.Email?.Value))
                {
                    buyerEmail = buyerUser.Email.Value;
                }
            }
            catch
            {
                // Fallback al identificador determinista del comprador
            }
        }

        var generator = new PdfInvoiceGenerator();
        var pdfBytes = generator.GenerateInvoice(invoice, order, buyerEmail);
        var fileName = $"Factura-DIAN-{invoice.Id.ToString()[..8].ToUpperInvariant()}.pdf";

        return Result<InvoicePdfResult>.Success(new InvoicePdfResult(pdfBytes, fileName, "application/pdf"));
    }
}
