using System;
using Zentric.Domain.Common.Models;
using Zentric.Domain.Orders.Entities;
using System.Collections.Generic;

namespace Zentric.Domain.Orders.Events
{
    public record OrderCreatedDomainEvent(Guid OrderId, decimal TotalAmount, IEnumerable<OrderItem> Lines) : IDomainEvent;
}
