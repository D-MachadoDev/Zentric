using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Zentric.Domain.Warehouses;
using Zentric.Infrastructure.Persistence.Mappers;



namespace Zentric.Infrastructure.Persistence.Repositories
{
    public class WarehouseRepository : Zentric.Domain.Warehouses.Ports.IWarehouseRepository
    {
        private readonly ZentricDbContext _dbContext;

        public WarehouseRepository(ZentricDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<Warehouse?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            // AsNoTracking, igual que el listado de este repositorio y por el mismo
            // motivo que en los demas: el Update posterior adjunta un DbModel nuevo
            // y chocaria con la fila rastreada (H-15).
            var dbModel = await _dbContext.Warehouses
                .AsNoTracking()
                .FirstOrDefaultAsync(o => o.Id == id, cancellationToken);
            return dbModel == null ? null : WarehouseMapper.ToDomain(dbModel);
        }

        public async Task<IReadOnlyList<Warehouse>> GetAllAsync(Guid? vendorId = null, CancellationToken cancellationToken = default)
        {
            var query = _dbContext.Warehouses.AsNoTracking();
            if (vendorId.HasValue)
            {
                query = query.Where(w => w.VendorId == vendorId.Value);
            }
            var list = await query.ToListAsync(cancellationToken);
            return list.Select(WarehouseMapper.ToDomain).ToList();
        }

        public async Task<IReadOnlyList<Warehouse>> GetForSellerAsync(Guid sellerVendorId, CancellationToken cancellationToken = default)
        {
            var list = await _dbContext.Warehouses.AsNoTracking()
                .Where(w => w.VendorId == sellerVendorId || (w.Type == Zentric.Domain.Warehouses.Enum.WarehouseType.Marketplace && w.IsActive))
                .ToListAsync(cancellationToken);
            return list.Select(WarehouseMapper.ToDomain).ToList();
        }

        public Task AddAsync(Warehouse warehouse, CancellationToken cancellationToken = default)
        {
            var dbModel = WarehouseMapper.ToDbModel(warehouse);
            _dbContext.Warehouses.Add(dbModel);
            return Task.CompletedTask;
        }

        public Task UpdateAsync(Warehouse warehouse, CancellationToken cancellationToken = default)
        {
            var dbModel = WarehouseMapper.ToDbModel(warehouse);
            TrackedState.ReplaceAsModified(_dbContext, _dbContext.Warehouses, dbModel, w => w.Id);
            return Task.CompletedTask;
        }
    }
}

