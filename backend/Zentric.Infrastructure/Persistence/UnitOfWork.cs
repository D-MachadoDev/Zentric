using System.Threading;
using System.Threading.Tasks;
using Zentric.Application.Common.Ports;

namespace Zentric.Infrastructure.Persistence
{
    public class UnitOfWork : IUnitOfWork
    {
        private readonly ZentricDbContext _dbContext;
        private readonly IDomainEventDispatcher _domainEventDispatcher;

        public UnitOfWork(ZentricDbContext dbContext, IDomainEventDispatcher domainEventDispatcher)
        {
            _dbContext = dbContext;
            _domainEventDispatcher = domainEventDispatcher;
        }

        public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            // Dispatch domain events BEFORE saving changes,
            // so handlers can enlist in the same DbContext transaction (e.g. updating other entities).
            await _domainEventDispatcher.DispatchEventsAsync(cancellationToken);

            return await _dbContext.SaveChangesAsync(cancellationToken);
        }
    }
}
