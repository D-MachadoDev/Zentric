using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Zentric.Domain.Buyers;
using Zentric.Infrastructure.Persistence.Mappers;



namespace Zentric.Infrastructure.Persistence.Repositories
{
    public class BuyerRepository : Zentric.Domain.Buyers.Ports.IBuyerRepository
    {
        private readonly ZentricDbContext _dbContext;

        public BuyerRepository(ZentricDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<Buyer?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var dbModel = await _dbContext.Buyers
                .FirstOrDefaultAsync(o => o.UserId == id, cancellationToken);
            return dbModel == null ? null : BuyerMapper.ToDomain(dbModel);
        }

        public Task AddAsync(Buyer buyer, CancellationToken cancellationToken = default)
        {
            var dbModel = BuyerMapper.ToDbModel(buyer);
            _dbContext.Buyers.Add(dbModel);
            return Task.CompletedTask;
        }

        public Task UpdateAsync(Buyer buyer, CancellationToken cancellationToken = default)
        {
            var dbModel = BuyerMapper.ToDbModel(buyer);
            _dbContext.Buyers.Update(dbModel);
            return Task.CompletedTask;
        }
    }
}

