using System;
using Zentric.Domain.Common.Models;

namespace Zentric.Domain.Inventories.Events
{
    public record CartExpiredDomainEvent(Guid OrderId) : IDomainEvent;
}
