using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Zentric.Domain.Inventories.Ports;
using Zentric.Domain.Orders;

namespace Zentric.Domain.Inventories.Services
{
    public class InventoryReservationService
    {
        private readonly IInventoryRepository _inventoryRepository;

        public InventoryReservationService(IInventoryRepository inventoryRepository)
        {
            _inventoryRepository = inventoryRepository;
        }

        public async Task ReserveForOrderAsync(CustomerOrder order, CancellationToken cancellationToken = default)
        {
            foreach (var item in order.Items)
            {
                // Find inventories for the given VariantId
                var inventories = await _inventoryRepository.GetByVariantIdAsync(item.VariantId, cancellationToken);
                
                int remainingToReserve = item.Quantity;
                foreach (var inventory in inventories)
                {
                    if (remainingToReserve == 0) break;

                    var available = inventory.AvailableQuantity;
                    if (available > 0)
                    {
                        var toReserve = Math.Min(available, remainingToReserve);
                        inventory.ReserveStock(toReserve);
                        await _inventoryRepository.UpdateAsync(inventory, cancellationToken);
                        remainingToReserve -= toReserve;
                    }
                }

                if (remainingToReserve > 0)
                {
                    throw new InvalidOperationException($"Not enough stock available for variant {item.VariantId}. Needed {item.Quantity}, but only could reserve {item.Quantity - remainingToReserve}.");
                }
            }
        }
    }
}
