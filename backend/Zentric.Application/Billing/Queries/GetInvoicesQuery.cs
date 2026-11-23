using System;
using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Domain.Billing.Ports;
using Zentric.Domain.Users.Enums;

namespace Zentric.Application.Billing.Queries
{
    /// <summary>
    /// Listado de facturas.
    ///
    /// Devuelve el MISMO <see cref="InvoiceDto"/> que el listado por pedido. El reparto por rol es
    /// identico al de ahi y por eso ambos comparten DTO: si difirieran, el frontend
    /// tendria dos formas de la misma factura segun de que pantalla venga.
    /// </summary>
    public record GetInvoicesQuery(Guid CallerId, UserRole CallerRole, int Page = 0, int Size = PageRequest.DefaultPageSize) : IRequest<Result<PagedResult<InvoiceDto>>>;

    public class GetInvoicesQueryHandler : IRequestHandler<GetInvoicesQuery, Result<PagedResult<InvoiceDto>>>
    {
        private readonly IInvoiceRepository _invoiceRepository;

        public GetInvoicesQueryHandler(IInvoiceRepository invoiceRepository) => _invoiceRepository = invoiceRepository;

        public async Task<Result<PagedResult<InvoiceDto>>> Handle(
            GetInvoicesQuery request, CancellationToken cancellationToken)
        {
            // El rol se resuelve aqui y al repositorio le llega un identificador ya resuelto.
            // Comprador: solo la Factura Maestra de sus pedidos. Vendedor: solo sus facturas de
            // vendedor. Operador, Administrador y Supervisor: todas.
            Guid? buyerId = null;
            Guid? vendorId = null;

            switch (request.CallerRole)
            {
                case UserRole.Buyer:
                    buyerId = request.CallerId;
                    break;

                case UserRole.Seller:
                    vendorId = request.CallerId;
                    break;

                default:
                    break;
            }

            var invoices = await _invoiceRepository.GetListAsync(buyerId, vendorId, cancellationToken);

            var dtos = invoices
                .Select(i => new InvoiceDto(
                    i.Id,
                    i.CustomerOrderId,
                    i.VendorId,
                    i.Type.ToString(),
                    i.TotalAmount.Amount,
                    i.TotalAmount.Currency,
                    i.IssuedAt))
                .ToList();

            var page = new PageRequest(request.Page, request.Size);
            var paged = dtos.Skip(page.Skip).Take(page.Take).ToList();
            return Result<PagedResult<InvoiceDto>>.Success(new PagedResult<InvoiceDto>(paged, page.Page, page.Size, dtos.Count));
        }
    }
}

