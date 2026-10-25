using Zentric.Domain.Billing;

namespace Zentric.Domain.Billing.Ports
{
    public interface IInvoiceRepository
    {
        Task<Invoice?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<Invoice>> GetByOrderIdAsync(Guid orderId, CancellationToken cancellationToken = default);

        /// <summary>
        /// Listado de facturas segun quien pregunta.
        ///
        /// A diferencia de las devoluciones, aqui los tres filtros se resuelven SIN traversias:
        /// la factura guarda su <c>VendorId</c> y su <c>Type</c>, y el comprador se resuelve por el
        /// pedido. Por eso los filtros pueden ir dentro de la consulta en vez de en el handler, que
        /// es donde acabaria si se copiaran fila por fila los <c>Where</c> de GetInvoicesByOrderQuery.
        /// </summary>
        Task<IReadOnlyList<Invoice>> GetListAsync(
            Guid? buyerId, Guid? vendorId, CancellationToken cancellationToken = default);

        Task AddAsync(Invoice invoice, CancellationToken cancellationToken = default);
        Task AddRangeAsync(IEnumerable<Invoice> invoices, CancellationToken cancellationToken = default);
        Task UpdateAsync(Invoice invoice, CancellationToken cancellationToken = default);
    }
}
