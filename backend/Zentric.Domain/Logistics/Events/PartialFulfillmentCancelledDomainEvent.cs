using System;
using Zentric.Domain.Common.Models;

namespace Zentric.Domain.Logistics.Events
{
    public record PartialFulfillmentCancelledDomainEvent(Guid FulfillmentOrderId, string Reason) : IDomainEvent;
}
