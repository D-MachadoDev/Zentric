using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Domain.Common.Models;

namespace Zentric.Infrastructure.Persistence
{
    public class DomainEventDispatcher : IDomainEventDispatcher
    {
        private readonly IMediator _publisher;
        private readonly List<IDomainEvent> _domainEvents = new();

        public DomainEventDispatcher(IMediator publisher)
        {
            _publisher = publisher;
        }

        public void AddEvent(IDomainEvent domainEvent)
        {
            _domainEvents.Add(domainEvent);
        }

        public async Task DispatchEventsAsync(CancellationToken cancellationToken = default)
        {
            var eventsToDispatch = _domainEvents.ToList();
            _domainEvents.Clear();

            foreach (var domainEvent in eventsToDispatch)
            {
                // Create the generic DomainEventNotification<T> type
                var notificationType = typeof(DomainEventNotification<>).MakeGenericType(domainEvent.GetType());
                var notification = (INotification)Activator.CreateInstance(notificationType, domainEvent)!;
                
                await _publisher.Publish(notification, cancellationToken);
            }
        }
    }
}
