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
            var dbModel = await _dbContext.Warehouses
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

        public Task AddAsync(Warehouse warehouse, CancellationToken cancellationToken = default)
        {
            var dbModel = WarehouseMapper.ToDbModel(warehouse);
            _dbContext.Warehouses.Add(dbModel);
            return Task.CompletedTask;
        }

        public Task UpdateAsync(Warehouse warehouse, CancellationToken cancellationToken = default)
        {
            var dbModel = WarehouseMapper.ToDbModel(warehouse);
            _dbContext.Warehouses.Update(dbModel);
            return Task.CompletedTask;
        }
    }
}

