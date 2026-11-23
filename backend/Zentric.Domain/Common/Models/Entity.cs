using System.Collections.Generic;

namespace Zentric.Domain.Common.Models
{
    public abstract class Entity
    {
        // Puede quedar en null cuando el agregado se reconstruye desde la persistencia
        // con RuntimeHelpers.GetUninitializedObject. Se inicializa perezosamente al registrar eventos.
        private List<IDomainEvent>? _domainEvents;

        private List<IDomainEvent> DomainEventsStore
            => _domainEvents ??= new List<IDomainEvent>();

        public IReadOnlyCollection<IDomainEvent> DomainEvents => DomainEventsStore.AsReadOnly();

        public void AddDomainEvent(IDomainEvent domainEvent)
        {
            DomainEventsStore.Add(domainEvent);
        }

        public void ClearDomainEvents()
        {
            DomainEventsStore.Clear();
        }
    }
}
