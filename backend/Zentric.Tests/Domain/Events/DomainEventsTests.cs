using System;
using Xunit;
using Zentric.Domain.Inventories.Events;

namespace Zentric.Tests.Domain.Events
{
    public class DomainEventsTests
    {
        [Fact]
        public void CartExpiredDomainEvent_PropertiesAndEquality_MatchRecordContract()
        {
            var orderId = Guid.NewGuid();
            var expiredAt = new DateTimeOffset(2026, 10, 16, 15, 30, 0, TimeSpan.Zero);

            var event1 = new CartExpiredDomainEvent(orderId, expiredAt);
            var event2 = new CartExpiredDomainEvent(orderId, expiredAt);

            Assert.Equal(orderId, event1.OrderId);
            Assert.Equal(expiredAt, event1.ExpiredAt);
            Assert.Equal(event1, event2);
            Assert.Equal(event1.GetHashCode(), event2.GetHashCode());
        }

        [Fact]
        public void StockAdjustedDomainEvent_PropertiesAndEquality_MatchRecordContract()
        {
            var inventoryId = Guid.NewGuid();
            var countedBy = Guid.NewGuid();
            var reason = "Auditoría física trimestral";

            var event1 = new StockAdjustedDomainEvent(inventoryId, 100, 95, countedBy, reason);
            var event2 = new StockAdjustedDomainEvent(inventoryId, 100, 95, countedBy, reason);

            Assert.Equal(inventoryId, event1.InventoryId);
            Assert.Equal(100, event1.SystemQuantity);
            Assert.Equal(95, event1.PhysicalQuantity);
            Assert.Equal(countedBy, event1.CountedBy);
            Assert.Equal(reason, event1.Reason);
            Assert.Equal(event1, event2);
            Assert.Equal(event1.GetHashCode(), event2.GetHashCode());
        }
    }
}
