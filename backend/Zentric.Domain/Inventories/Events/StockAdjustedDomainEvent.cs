using System;
using Zentric.Domain.Common.Models;

namespace Zentric.Domain.Inventories.Events
{
    public record StockAdjustedDomainEvent(
        Guid InventoryId,
        int SystemQuantity,
        int PhysicalQuantity,
        Guid CountedBy,
        string Reason) : IDomainEvent;
}
