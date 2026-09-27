using System;
using Zentric.Domain.Common.Models;

namespace Zentric.Domain.Orders.Events
{
    public record OrderPaidDomainEvent(Guid OrderId) : IDomainEvent;
}
