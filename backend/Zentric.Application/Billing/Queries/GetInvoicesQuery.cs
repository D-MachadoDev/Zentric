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
    /// identico al de ahi (Q-21b) y por eso ambos comparten DTO: si difirieran, el frontend
    /// tendria dos formas de la misma factura segun de que pantalla venga.
    /// </summary>
    public record GetInvoicesQuery(Guid CallerId, UserRole CallerRole) : IRequest<Result<IReadOnlyList<InvoiceDto>>>;

    public class GetInvoicesQueryHandler : IRequestHandler<GetInvoicesQuery, Result<IReadOnlyList<InvoiceDto>>>
    {
        private readonly IInvoiceRepository _invoiceRepository;

        public GetInvoicesQueryHandler(IInvoiceRepository invoiceRepository) => _invoiceRepository = invoiceRepository;

        public async Task<Result<IReadOnlyList<InvoiceDto>>> Handle(
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

            return Result<IReadOnlyList<InvoiceDto>>.Success(dtos);
        }
    }
}
