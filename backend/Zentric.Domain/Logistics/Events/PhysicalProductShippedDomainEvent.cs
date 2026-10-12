using System;
using Zentric.Domain.Common.Models;

namespace Zentric.Domain.Logistics.Events
{
    public record PhysicalProductShippedDomainEvent(Guid ShipmentId, Guid FulfillmentOrderId) : IDomainEvent;
}
