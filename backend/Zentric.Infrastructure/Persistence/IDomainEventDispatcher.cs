using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Zentric.Domain.Common.Models;

namespace Zentric.Infrastructure.Persistence
{
    public interface IDomainEventDispatcher
    {
        void AddEvent(IDomainEvent domainEvent);
        Task DispatchEventsAsync(CancellationToken cancellationToken = default);
    }
}
