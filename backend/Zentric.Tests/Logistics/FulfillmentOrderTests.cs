using Xunit;
using Zentric.Domain.Logistics;
using Zentric.Domain.Logistics.Enums;
using System;

namespace Zentric.Tests.Logistics
{
    public class FulfillmentOrderTests
    {
        [Fact]
        public void Constructor_Valid_CreatesOrderInPendingPack()
        {
            var order = new FulfillmentOrder(Guid.NewGuid(), Guid.NewGuid());
            Assert.Equal(FulfillmentStatus.PendingPack, order.Status);
        }

        [Fact]
        public void Pack_WhenPendingPack_ChangesStatusToPacked()
        {
            var order = new FulfillmentOrder(Guid.NewGuid(), Guid.NewGuid());
            order.Pack();
            Assert.Equal(FulfillmentStatus.Packed, order.Status);
        }

        [Fact]
        public void Dispatch_WhenPacked_ChangesStatusToDispatched()
        {
            var order = new FulfillmentOrder(Guid.NewGuid(), Guid.NewGuid());
            order.Pack();
            order.Dispatch();
            Assert.Equal(FulfillmentStatus.Dispatched, order.Status);
        }

        [Fact]
        public void Deliver_WhenDispatched_ChangesStatusToDelivered()
        {
            var order = new FulfillmentOrder(Guid.NewGuid(), Guid.NewGuid());
            order.Pack();
            order.Dispatch();
            order.Deliver();
            Assert.Equal(FulfillmentStatus.Delivered, order.Status);
        }

        [Fact]
        public void CancelDueToNoStock_WhenPendingPack_ChangesStatusToCancelled()
        {
            var order = new FulfillmentOrder(Guid.NewGuid(), Guid.NewGuid());
            order.CancelDueToNoStock();
            Assert.Equal(FulfillmentStatus.Cancelled, order.Status);
        }

        [Fact]
        public void CancelDueToNoStock_WhenDispatched_Throws()
        {
            var order = new FulfillmentOrder(Guid.NewGuid(), Guid.NewGuid());
            order.Pack();
            order.Dispatch();
            Assert.Throws<InvalidOperationException>(() => order.CancelDueToNoStock());
        }
    }
}
