using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Zentric.Domain.Inventories.Ports;
using Zentric.Domain.Inventories;
using Zentric.Infrastructure.Persistence.Mappers;

namespace Zentric.Infrastructure.Persistence.Repositories
{
    public class InventoryRepository : IInventoryRepository
    {
        private readonly ZentricDbContext _dbContext;

        public InventoryRepository(ZentricDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<Inventory?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var dbModel = await _dbContext.Inventories
                .AsNoTracking()
                .FirstOrDefaultAsync(o => o.Id == id, cancellationToken);
            return dbModel == null ? null : InventoryMapper.ToDomain(dbModel);
        }

        public Task AddAsync(Inventory inventory, CancellationToken cancellationToken = default)
        {
            var dbModel = InventoryMapper.ToDbModel(inventory);
            _dbContext.Inventories.Add(dbModel);
            return Task.CompletedTask;
        }

        public Task UpdateAsync(Inventory inventory, CancellationToken cancellationToken = default)
        {
            // Se actualiza la fila existente en lugar de llamar a DbSet.Update:
            // el checkout lee el stock y lo modifica dentro de la misma unidad de
            // trabajo, y Update provocaba un choque de clave en el IdentityMap.
            var tracked = _dbContext.Inventories
                .FirstOrDefault(i => i.Id == inventory.Id);

            if (tracked == null)
            {
                _dbContext.Inventories.Add(InventoryMapper.ToDbModel(inventory));
                return Task.CompletedTask;
            }

            tracked.VariantId = inventory.VariantId;
            tracked.WarehouseId = inventory.WarehouseId;
            tracked.AvailableQuantity = inventory.AvailableQuantity;
            tracked.ReservedQuantity = inventory.ReservedQuantity;
            tracked.DamagedQuantity = inventory.DamagedQuantity;
            tracked.UsedQuantity = inventory.UsedQuantity;
            tracked.UpdatedAt = inventory.UpdatedAt;

            return Task.CompletedTask;
        }

        public async Task<Inventory?> GetByVariantAndWarehouseAsync(Guid variantId, Guid warehouseId, CancellationToken cancellationToken = default)
        {
            var dbModel = await _dbContext.Inventories
                .AsNoTracking()
                .FirstOrDefaultAsync(i => i.VariantId == variantId && i.WarehouseId == warehouseId, cancellationToken);
            return dbModel == null ? null : InventoryMapper.ToDomain(dbModel);
        }

        public async Task<int> GetTotalAvailableStockAsync(Guid variantId, CancellationToken cancellationToken = default)
        {
            return await _dbContext.Inventories
                .Where(i => i.VariantId == variantId)
                .SumAsync(i => i.AvailableQuantity, cancellationToken);
        }

        public async Task<IEnumerable<Inventory>> GetByVariantIdAsync(Guid variantId, CancellationToken cancellationToken = default)
        {
            var dbModels = await _dbContext.Inventories
                .AsNoTracking()
                .Where(i => i.VariantId == variantId)
                .ToListAsync(cancellationToken);
            return dbModels.Select(InventoryMapper.ToDomain);
        }
    }
}
