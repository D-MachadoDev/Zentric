using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Domain.Billing.Enums;
using Zentric.Domain.Billing.Ports;
using Zentric.Domain.Orders.Ports;
using Zentric.Domain.Users.Enums;

namespace Zentric.Application.Billing.Queries
{
    public record InvoiceDto(
        Guid Id,
        Guid CustomerOrderId,
        Guid? VendorId,
        string Type,
        decimal TotalAmount,
        string Currency,
        DateTime IssuedAt);

    /// <summary>
    /// Facturas de un pedido. La visibilidad depende del rol del llamante
    /// (ver el handler). <paramref name="CallerId"/> es el <c>sub</c> del token y
    /// <paramref name="CallerRole"/> el rol ya autorizado por la matriz.
    /// </summary>
    public record GetInvoicesByOrderQuery(Guid OrderId, Guid CallerId, UserRole CallerRole, int Page = 0, int Size = PageRequest.DefaultPageSize) : IRequest<Result<PagedResult<InvoiceDto>>>;

    public class GetInvoicesByOrderQueryHandler : IRequestHandler<GetInvoicesByOrderQuery, Result<PagedResult<InvoiceDto>>>
    {
        private readonly IInvoiceRepository _invoiceRepository;
        private readonly ICustomerOrderRepository _customerOrderRepository;

        public GetInvoicesByOrderQueryHandler(
            IInvoiceRepository invoiceRepository,
            ICustomerOrderRepository customerOrderRepository)
        {
            _invoiceRepository = invoiceRepository;
            _customerOrderRepository = customerOrderRepository;
        }

        public async Task<Result<PagedResult<InvoiceDto>>> Handle(GetInvoicesByOrderQuery request, CancellationToken cancellationToken)
        {
            var invoices = await _invoiceRepository.GetByOrderIdAsync(request.OrderId, cancellationToken);

            switch (request.CallerRole)
            {
                case UserRole.Buyer:
                    // El Comprador solo ve la Factura Maestra de un pedido
                    // propio. El ZentricDetail es control interno de plataforma y
                    // las facturas de vendedor no son suyas .
                    var order = await _customerOrderRepository.GetByIdForBuyerAsync(
                        request.OrderId, request.CallerId, cancellationToken);
                    if (order == null)
                    {
                        return Result<PagedResult<InvoiceDto>>.NotFound("Order not found.");
                    }

                    invoices = invoices.Where(i => i.Type == InvoiceType.Master).ToList();
                    break;

                case UserRole.Seller:
                    // El Vendedor solo ve sus facturas de vendedor
                    // (VendorId == sub). Si no participo, la lista sale vacia:
                    // una lista vacia no revela nada.
                    invoices = invoices.Where(i => i.VendorId == request.CallerId).ToList();
                    break;

                default:
                    // Operador, Administrador y Supervisor: sin filtro de dueno
                    break;
            }

            var dtos = invoices.Select(i => new InvoiceDto(
                i.Id,
                i.CustomerOrderId,
                i.VendorId,
                i.Type.ToString(),
                i.TotalAmount.Amount,
                i.TotalAmount.Currency,
                i.IssuedAt
            )).ToList();

            var page = new PageRequest(request.Page, request.Size);
            var paged = dtos.Skip(page.Skip).Take(page.Take).ToList();
            return Result<PagedResult<InvoiceDto>>.Success(new PagedResult<InvoiceDto>(paged, page.Page, page.Size, dtos.Count));
        }
    }
}
