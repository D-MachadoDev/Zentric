using MediatR;
using Zentric.Application.Common.Models;
using Zentric.Domain.Inventories.Ports;
using Zentric.Domain.Returns.Events;

namespace Zentric.Application.Returns.EventHandlers
{
    public class ReturnApprovedEventHandler : INotificationHandler<DomainEventNotification<ReturnApprovedEvent>>
    {
        private readonly IInventoryRepository _inventoryRepository;

        public ReturnApprovedEventHandler(IInventoryRepository inventoryRepository)
        {
            _inventoryRepository = inventoryRepository;
        }

        public async Task Handle(DomainEventNotification<ReturnApprovedEvent> notification, CancellationToken cancellationToken)
        {
            var domainEvent = notification.DomainEvent;
            
            var inventory = await _inventoryRepository.GetByVariantAndWarehouseAsync(domainEvent.VariantId, domainEvent.WarehouseId, cancellationToken);
            if (inventory != null)
            {
                inventory.ReturnToUsedStock(domainEvent.Quantity);
                await _inventoryRepository.UpdateAsync(inventory, cancellationToken);
            }
        }
    }
}
