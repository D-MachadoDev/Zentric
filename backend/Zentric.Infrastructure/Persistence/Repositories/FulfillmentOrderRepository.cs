using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Zentric.Domain.Logistics.Ports;
using Zentric.Domain.Logistics;
using Zentric.Infrastructure.Persistence.Mappers;

namespace Zentric.Infrastructure.Persistence.Repositories
{
    public class FulfillmentOrderRepository : IFulfillmentOrderRepository
    {
        private readonly ZentricDbContext _dbContext;

        public FulfillmentOrderRepository(ZentricDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<FulfillmentOrder?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var dbModel = await _dbContext.FulfillmentOrders
                .Include(o => o.Shipments)
                .FirstOrDefaultAsync(o => o.Id == id, cancellationToken);
            return dbModel == null ? null : FulfillmentOrderMapper.ToDomain(dbModel);
        }

        public Task AddAsync(FulfillmentOrder order, CancellationToken cancellationToken = default)
        {
            var dbModel = FulfillmentOrderMapper.ToDbModel(order);
            _dbContext.FulfillmentOrders.Add(dbModel);
            return Task.CompletedTask;
        }

        public Task UpdateAsync(FulfillmentOrder order, CancellationToken cancellationToken = default)
        {
            var dbModel = FulfillmentOrderMapper.ToDbModel(order);
            _dbContext.FulfillmentOrders.Update(dbModel);
            return Task.CompletedTask;
        }
    }
}
