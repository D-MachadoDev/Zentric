using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Zentric.Domain.Inventories.Ports;
using Zentric.Domain.Inventories;
using Zentric.Infrastructure.Persistence.Models;
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

        public async Task<IReadOnlyList<Inventory>> GetListAsync(
            Guid? vendorId, CancellationToken cancellationToken = default)
        {
            IQueryable<InventoryDbModel> query = _dbContext.Inventories.AsNoTracking();

            if (vendorId.HasValue)
            {
                // La existencia no guarda al vendedor: guarda la variante. Se resuelve por ahi, que
                // es donde vive el dueno del producto (Q-21b). Mismo criterio que el detalle.
                var vendor = vendorId.Value;
                query = query.Where(i => _dbContext.Products
                    .Any(p => p.VendorId == vendor && p.Variants.Any(v => v.Id == i.VariantId)));
            }

            // Por variante y bodega: la unidad en la que el stock se cuenta de verdad. Ordenar por
            // variante primero hace que las filas de un mismo producto queden juntas, que es como se
            // lee una pantalla de inventario.
            var list = await query
                .OrderBy(i => i.VariantId)
                .ThenBy(i => i.WarehouseId)
                .ToListAsync(cancellationToken);

            return list.Select(InventoryMapper.ToDomain).ToList();
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

        public async Task<Inventory> LoadWithHistoryAsync(Guid id, CancellationToken cancellationToken = default)
        {
            // La auditoria solo sirve si sobrevive a la recarga: el historial
            // se guarda en su tabla y se reconstruye en orden cronologico.
            var dbModel = await _dbContext.Inventories
                .AsNoTracking()
                .FirstOrDefaultAsync(i => i.Id == id, cancellationToken)
                ?? throw new InvalidOperationException($"Inventory {id} not found.");

            var inventory = InventoryMapper.ToDomain(dbModel);

            var records = await _dbContext.StockAdjustments
                .AsNoTracking()
                .Where(a => a.InventoryId == id)
                .ToListAsync(cancellationToken);

            return InventoryMapper.WithAdjustments(inventory, records);
        }

        public async Task SaveAdjustmentAsync(Inventory inventory, StockAdjustmentRecord record, CancellationToken cancellationToken = default)
        {
            // El agregado ya aplico el ajuste en memoria; aca se persiste el
            // contador nuevo y el registro de auditoria en la misma unidad.
            await UpdateAsync(inventory, cancellationToken);

            _dbContext.StockAdjustments.Add(new StockAdjustmentDbModel
            {
                Id = Guid.NewGuid(),
                InventoryId = inventory.Id,
                SystemQuantity = record.SystemQuantity,
                PhysicalQuantity = record.PhysicalQuantity,
                CountedBy = record.CountedBy,
                Reason = record.Reason,
                CountedAt = record.CountedAt
            });
        }

        public async Task<IEnumerable<Inventory>> GetByVariantIdAsync(Guid variantId, CancellationToken cancellationToken = default)
        {
            var dbModels = await _dbContext.Inventories
                .AsNoTracking()
                .Where(i => i.VariantId == variantId)
                .ToListAsync(cancellationToken);
            return dbModels.Select(InventoryMapper.ToDomain);
        }

        public async Task<bool> TryReserveStockAsync(Guid inventoryId, int quantity, CancellationToken cancellationToken = default)
        {
            // ADR-0025: leer-comprobar-escribir es UNA sola sentencia. La condicion
            // available >= quantity vive en el WHERE, asi que la base garantiza sola
            // que dos reservas simultaneas sobre la misma fila no pueden dejar el
            // contador negativo ni perder actualizaciones (INV-01). Cero filas
            // afectadas = no habia stock = se rechaza; no hay nada que reintentar.
            if (quantity <= 0)
            {
                throw new ArgumentOutOfRangeException(nameof(quantity), "Quantity to reserve must be greater than zero.");
            }

            var affected = await _dbContext.Inventories
                .Where(i => i.Id == inventoryId && i.AvailableQuantity >= quantity)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(i => i.AvailableQuantity, i => i.AvailableQuantity - quantity)
                    .SetProperty(i => i.ReservedQuantity, i => i.ReservedQuantity + quantity)
                    .SetProperty(i => i.UpdatedAt, DateTime.UtcNow), cancellationToken);

            return affected > 0;
        }

        public async Task ReleaseReservedStockAsync(Guid inventoryId, int quantity, CancellationToken cancellationToken = default)
        {
            // Compensacion de ADR-0001 en el mismo estilo atomico que la reserva:
            // el WHERE reservado >= quantity impide que la liberacion deje la
            // columna reservado en negativo si otra peticion toco la fila.
            if (quantity <= 0)
            {
                throw new ArgumentOutOfRangeException(nameof(quantity), "Quantity to release must be greater than zero.");
            }

            await _dbContext.Inventories
                .Where(i => i.Id == inventoryId && i.ReservedQuantity >= quantity)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(i => i.AvailableQuantity, i => i.AvailableQuantity + quantity)
                    .SetProperty(i => i.ReservedQuantity, i => i.ReservedQuantity - quantity)
                    .SetProperty(i => i.UpdatedAt, DateTime.UtcNow), cancellationToken);
        }
    }
}
