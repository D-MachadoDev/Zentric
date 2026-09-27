using Zentric.Domain.Billing;

namespace Zentric.Domain.Billing.Ports
{
    public interface IInvoiceRepository
    {
        Task<Invoice?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<Invoice>> GetByOrderIdAsync(Guid orderId, CancellationToken cancellationToken = default);
        Task AddAsync(Invoice invoice, CancellationToken cancellationToken = default);
        Task AddRangeAsync(IEnumerable<Invoice> invoices, CancellationToken cancellationToken = default);
        Task UpdateAsync(Invoice invoice, CancellationToken cancellationToken = default);
    }
}
