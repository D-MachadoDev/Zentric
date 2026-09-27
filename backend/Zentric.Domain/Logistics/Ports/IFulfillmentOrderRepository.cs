using Zentric.Domain.Logistics;

namespace Zentric.Domain.Logistics.Ports
{
    public interface IFulfillmentOrderRepository
    {
        Task<FulfillmentOrder?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
        Task AddAsync(FulfillmentOrder order, CancellationToken cancellationToken = default);
        Task UpdateAsync(FulfillmentOrder order, CancellationToken cancellationToken = default);
    }
}
