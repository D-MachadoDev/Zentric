using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Zentric.Domain.Inventories;

namespace Zentric.Domain.Inventories.Ports
{
    public interface IInventoryRepository
    {
        Task<Inventory?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
        Task<Inventory?> GetByVariantAndWarehouseAsync(Guid variantId, Guid warehouseId, CancellationToken cancellationToken = default);
        Task<IEnumerable<Inventory>> GetByVariantIdAsync(Guid variantId, CancellationToken cancellationToken = default);
        Task<int> GetTotalAvailableStockAsync(Guid variantId, CancellationToken cancellationToken = default);
        Task AddAsync(Inventory inventory, CancellationToken cancellationToken = default);
        Task UpdateAsync(Inventory inventory, CancellationToken cancellationToken = default);
    }
}
