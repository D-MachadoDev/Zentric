using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Zentric.Domain.Returns.Ports;
using Zentric.Domain.Returns;
using Zentric.Infrastructure.Persistence.Mappers;

namespace Zentric.Infrastructure.Persistence.Repositories
{
    public class ReturnRequestRepository : IReturnRequestRepository
    {
        private readonly ZentricDbContext _dbContext;
        private readonly IDomainEventDispatcher _domainEventDispatcher;

        public ReturnRequestRepository(ZentricDbContext dbContext, IDomainEventDispatcher domainEventDispatcher)
        {
            _dbContext = dbContext;
            _domainEventDispatcher = domainEventDispatcher;
        }

        public async Task<ReturnRequest?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var dbModel = await _dbContext.ReturnRequests
                .FirstOrDefaultAsync(o => o.Id == id, cancellationToken);
            return dbModel == null ? null : ReturnRequestMapper.ToDomain(dbModel);
        }

        public Task AddAsync(ReturnRequest request, CancellationToken cancellationToken = default)
        {
            foreach (var domainEvent in request.DomainEvents)
            {
                _domainEventDispatcher.AddEvent(domainEvent);
            }
            request.ClearDomainEvents();

            var dbModel = ReturnRequestMapper.ToDbModel(request);
            _dbContext.ReturnRequests.Add(dbModel);
            return Task.CompletedTask;
        }

        public Task UpdateAsync(ReturnRequest request, CancellationToken cancellationToken = default)
        {
            foreach (var domainEvent in request.DomainEvents)
            {
                _domainEventDispatcher.AddEvent(domainEvent);
            }
            request.ClearDomainEvents();

            var dbModel = ReturnRequestMapper.ToDbModel(request);
            _dbContext.ReturnRequests.Update(dbModel);
            return Task.CompletedTask;
        }
    }
}
