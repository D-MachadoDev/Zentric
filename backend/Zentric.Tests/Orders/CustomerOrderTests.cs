using Xunit;
using Zentric.Domain.Orders;
using Zentric.Domain.Orders.Enums;
using Zentric.Domain.Products.ValueObjects;

namespace Zentric.Tests.Orders
{
    public class CustomerOrderTests
    {
        [Fact]
        public void Constructor_ValidBuyerId_CreatesOrderInCartStatus()
        {
            var buyerId = Guid.NewGuid();
            
            var order = new CustomerOrder(buyerId);
            
            Assert.Equal(buyerId, order.BuyerId);
            Assert.Equal(OrderStatus.Cart, order.Status);
            Assert.Empty(order.Items);
        }

        [Fact]
        public void AddItem_WhenInCart_AddsItemCorrectly()
        {
            var order = new CustomerOrder(Guid.NewGuid());
            var variantId = Guid.NewGuid();
            var price = new Money(100, "USD");

            order.AddItem(variantId, 2, price);

            Assert.Single(order.Items);
            Assert.Equal(2, order.Items.First().Quantity);
            Assert.Equal(new Money(200, "USD"), order.Items.First().TotalPrice);
            Assert.Equal(new Money(200, "USD"), order.TotalAmount);
        }

        [Fact]
        public void AddItem_WhenNotInCart_ThrowsInvalidOperationException()
        {
            var order = new CustomerOrder(Guid.NewGuid());
            order.AddItem(Guid.NewGuid(), 1, new Money(10, "USD"));
            order.Checkout(); // Status is now PendingPayment

            Assert.Throws<InvalidOperationException>(() => order.AddItem(Guid.NewGuid(), 1, new Money(10, "USD")));
        }

        [Fact]
        public void OrderLifecycle_ValidTransitions_Succeeds()
        {
            var order = new CustomerOrder(Guid.NewGuid());
            order.AddItem(Guid.NewGuid(), 1, new Money(10, "USD"));
            
            order.Checkout();
            Assert.Equal(OrderStatus.PendingPayment, order.Status);
            
            order.MarkAsPaid();
            Assert.Equal(OrderStatus.Paid, order.Status);
            
            order.Dispatch();
            Assert.Equal(OrderStatus.Dispatched, order.Status);
            
            order.Deliver();
            Assert.Equal(OrderStatus.Delivered, order.Status);
        }

        [Fact]
        public void Deliver_WhenNotDispatched_ThrowsInvalidOperationException()
        {
            var order = new CustomerOrder(Guid.NewGuid());
            order.AddItem(Guid.NewGuid(), 1, new Money(10, "USD"));
            order.Checkout();
            order.MarkAsPaid(); // Status is Paid, not Dispatched

            Assert.Throws<InvalidOperationException>(() => order.Deliver());
        }

        [Fact]
        public void ModifyOrder_WhenDelivered_ThrowsInvalidOperationException()
        {
            var order = new CustomerOrder(Guid.NewGuid());
            order.AddItem(Guid.NewGuid(), 1, new Money(10, "USD"));
            order.Checkout();
            order.MarkAsPaid();
            order.Dispatch();
            order.Deliver(); // Status is Delivered

            Assert.Throws<InvalidOperationException>(() => order.AddItem(Guid.NewGuid(), 1, new Money(10, "USD")));
            Assert.Throws<InvalidOperationException>(() => order.RemoveItem(order.Items.First().VariantId));
            Assert.Throws<InvalidOperationException>(() => order.MarkAsPaid());
        }

        [Fact]
        public void CancelDueToTimeout_WhenInCartOrPendingPayment_TransitionsToCancelled()
        {
            var cartOrder = new CustomerOrder(Guid.NewGuid());
            cartOrder.CancelDueToTimeout();
            Assert.Equal(OrderStatus.Cancelled, cartOrder.Status);

            var pendingOrder = new CustomerOrder(Guid.NewGuid());
            pendingOrder.AddItem(Guid.NewGuid(), 1, new Money(10, "USD"));
            pendingOrder.Checkout();
            pendingOrder.CancelDueToTimeout();
            Assert.Equal(OrderStatus.Cancelled, pendingOrder.Status);
        }

        [Fact]
        public void CancelDueToTimeout_WhenPaidOrDelivered_ThrowsInvalidOperationException()
        {
            var order = new CustomerOrder(Guid.NewGuid());
            order.AddItem(Guid.NewGuid(), 1, new Money(10, "USD"));
            order.Checkout();
            order.MarkAsPaid();

            Assert.Throws<InvalidOperationException>(() => order.CancelDueToTimeout());
        }

        [Fact]
        public void ModifyOrder_WhenCancelled_ThrowsInvalidOperationException()
        {
            var order = new CustomerOrder(Guid.NewGuid());
            order.CancelDueToTimeout();

            Assert.Throws<InvalidOperationException>(() => order.AddItem(Guid.NewGuid(), 1, new Money(10, "USD")));
            Assert.Throws<InvalidOperationException>(() => order.Checkout());
            Assert.Throws<InvalidOperationException>(() => order.MarkAsPaid());
        }
    }
}

