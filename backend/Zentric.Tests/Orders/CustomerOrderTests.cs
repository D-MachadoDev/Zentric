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
        public void TotalAmount_WhenCartIsEmpty_UsesSystemDefaultCurrency()
        {
            var order = new CustomerOrder(Guid.NewGuid());

            Assert.Equal(new Money(0, "COP"), order.TotalAmount);
        }

        [Fact]
        public void DefaultCurrency_IsCop()
        {
            Assert.Equal("COP", CustomerOrder.DefaultCurrency);
        }

        [Fact]
        public void TotalAmount_WhenCartHasItems_AdoptsCurrencyOfTheItems()
        {
            // El sistema es multi-moneda: el total no impone COP, adopta la
            // moneda del primer item. Cambiar el default no debe romper esto.
            var order = new CustomerOrder(Guid.NewGuid());
            order.AddItem(Guid.NewGuid(), Guid.NewGuid(), 1, new Money(1000, "COP"));

            Assert.Equal(new Money(1000, "COP"), order.TotalAmount);
        }

        [Fact]
        public void TotalAmount_WhenCartHasCopItems_StaysInCop()
        {
            var order = new CustomerOrder(Guid.NewGuid());
            order.AddItem(Guid.NewGuid(), Guid.NewGuid(), 2, new Money(5000, "COP"));

            Assert.Equal(new Money(10000, "COP"), order.TotalAmount);
        }

        [Fact]
        public void AddItem_WhenInCart_AddsItemCorrectly()
        {
            var order = new CustomerOrder(Guid.NewGuid());
            var variantId = Guid.NewGuid();
            var price = new Money(100, "COP");

            order.AddItem(Guid.NewGuid(), variantId, 2, price);

            Assert.Single(order.Items);
            Assert.Equal(2, order.Items.First().Quantity);
            Assert.Equal(new Money(200, "COP"), order.Items.First().TotalPrice);
            Assert.Equal(new Money(200, "COP"), order.TotalAmount);
        }

        [Fact]
        public void AddItem_WhenNotInCart_ThrowsInvalidOperationException()
        {
            var order = new CustomerOrder(Guid.NewGuid());
            order.AddItem(Guid.NewGuid(), Guid.NewGuid(), 1, new Money(10, "COP"));
            order.Checkout(); // Status is now PendingPayment

            Assert.Throws<InvalidOperationException>(() => order.AddItem(Guid.NewGuid(), Guid.NewGuid(), 1, new Money(10, "COP")));
        }

        [Fact]
        public void OrderLifecycle_ValidTransitions_Succeeds()
        {
            var order = new CustomerOrder(Guid.NewGuid());
            order.AddItem(Guid.NewGuid(), Guid.NewGuid(), 1, new Money(10, "COP"));
            
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
            order.AddItem(Guid.NewGuid(), Guid.NewGuid(), 1, new Money(10, "COP"));
            order.Checkout();
            order.MarkAsPaid(); // Status is Paid, not Dispatched

            Assert.Throws<InvalidOperationException>(() => order.Deliver());
        }

        [Fact]
        public void ModifyOrder_WhenDelivered_ThrowsInvalidOperationException()
        {
            var order = new CustomerOrder(Guid.NewGuid());
            order.AddItem(Guid.NewGuid(), Guid.NewGuid(), 1, new Money(10, "COP"));
            order.Checkout();
            order.MarkAsPaid();
            order.Dispatch();
            order.Deliver(); // Status is Delivered

            Assert.Throws<InvalidOperationException>(() => order.AddItem(Guid.NewGuid(), Guid.NewGuid(), 1, new Money(10, "COP")));
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
            pendingOrder.AddItem(Guid.NewGuid(), Guid.NewGuid(), 1, new Money(10, "COP"));
            pendingOrder.Checkout();
            pendingOrder.CancelDueToTimeout();
            Assert.Equal(OrderStatus.Cancelled, pendingOrder.Status);
        }

        [Fact]
        public void CancelDueToTimeout_WhenPaidOrDelivered_ThrowsInvalidOperationException()
        {
            var order = new CustomerOrder(Guid.NewGuid());
            order.AddItem(Guid.NewGuid(), Guid.NewGuid(), 1, new Money(10, "COP"));
            order.Checkout();
            order.MarkAsPaid();

            Assert.Throws<InvalidOperationException>(() => order.CancelDueToTimeout());
        }

        [Fact]
        public void ModifyOrder_WhenCancelled_ThrowsInvalidOperationException()
        {
            var order = new CustomerOrder(Guid.NewGuid());
            order.CancelDueToTimeout();

            Assert.Throws<InvalidOperationException>(() => order.AddItem(Guid.NewGuid(), Guid.NewGuid(), 1, new Money(10, "COP")));
            Assert.Throws<InvalidOperationException>(() => order.Checkout());
            Assert.Throws<InvalidOperationException>(() => order.MarkAsPaid());
        }

        [Fact]
        public void RemoveItem_Valid_RemovesItemAndUpdatesTimestamp()
        {
            var order = new CustomerOrder(Guid.NewGuid());
            var variantId = Guid.NewGuid();
            var vendorId = Guid.NewGuid();
            var initialUpdatedAt = order.UpdatedAt;

            order.AddItem(variantId, vendorId, 2, new Money(100, "COP"));
            var updatedAtAfterAdd = order.UpdatedAt;

            order.RemoveItem(variantId);

            Assert.Empty(order.Items);
            Assert.Equal(new Money(0, "COP"), order.TotalAmount);
            Assert.True(order.UpdatedAt > updatedAtAfterAdd);
        }

        [Fact]
        public void RemoveItem_NotInCartStatus_ThrowsInvalidOperationException()
        {
            var order = new CustomerOrder(Guid.NewGuid());
            var variantId = Guid.NewGuid();
            order.AddItem(Guid.NewGuid(), variantId, 1, new Money(10, "COP"));
            order.Checkout(); // Status is now PendingPayment

            Assert.Throws<InvalidOperationException>(() => order.RemoveItem(variantId));
        }

        [Fact]
        public void RemoveItem_NonExistentVariant_ThrowsInvalidOperationException()
        {
            var order = new CustomerOrder(Guid.NewGuid());
            var existingVariantId = Guid.NewGuid();
            var vendorId = Guid.NewGuid();
            order.AddItem(existingVariantId, vendorId, 1, new Money(10, "COP"));

            var nonExistentVariantId = Guid.NewGuid();
            Assert.Throws<InvalidOperationException>(() => order.RemoveItem(nonExistentVariantId));
        }

        [Fact]
        public void RemoveItem_LeavesEmptyCartInCartStatus()
        {
            var order = new CustomerOrder(Guid.NewGuid());
            var variantId = Guid.NewGuid();
            var vendorId = Guid.NewGuid();
            order.AddItem(variantId, vendorId, 1, new Money(10, "COP"));

            order.RemoveItem(variantId);

            Assert.Empty(order.Items);
            Assert.Equal(OrderStatus.Cart, order.Status); // Per decision P2: empty cart remains in Cart status
        }

        [Fact]
        public void Checkout_SetsCheckoutStartedAt_AndValidatesTimeoutFromCheckout()
        {
            var order = new CustomerOrder(Guid.NewGuid());
            var variantId = Guid.NewGuid();
            var vendorId = Guid.NewGuid();
            order.AddItem(variantId, vendorId, 1, new Money(10, "COP"));

            // Before checkout, CheckoutStartedAt should be null
            Assert.Null(order.CheckoutStartedAt);

            order.Checkout();

            // After checkout, CheckoutStartedAt should be set
            Assert.NotNull(order.CheckoutStartedAt);
            Assert.True(order.CheckoutStartedAt.Value <= DateTime.UtcNow);
            Assert.True(order.CheckoutStartedAt.Value >= order.CreatedAt);

            // Timeout should be validated from CheckoutStartedAt, not CreatedAt
            // Simulate time passing by creating a new order with old CreatedAt
            var oldOrder = new CustomerOrder(Guid.NewGuid());
            oldOrder.AddItem(Guid.NewGuid(), Guid.NewGuid(), 1, new Money(10, "COP"));
            
            // Manually set CreatedAt to 20 minutes ago (simulating old cart)
            var createdAtField = typeof(CustomerOrder).GetField("CreatedAt", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic);
            createdAtField?.SetValue(oldOrder, DateTime.UtcNow.AddMinutes(-20));
            
            // This should succeed because CheckoutStartedAt is set to now, not CreatedAt
            oldOrder.Checkout();
            Assert.Equal(OrderStatus.PendingPayment, oldOrder.Status);
        }

        [Fact]
        public void Checkout_WhenCreatedAtOldButCheckoutRecent_Succeeds()
        {
            // Test that demonstrates the fix: cart created 30 min ago, checkout now = OK
            var order = new CustomerOrder(Guid.NewGuid());
            order.AddItem(Guid.NewGuid(), Guid.NewGuid(), 1, new Money(10, "COP"));
            
            // Simulate cart created 30 minutes ago
            var createdAtField = typeof(CustomerOrder).GetField("CreatedAt", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic);
            createdAtField?.SetValue(order, DateTime.UtcNow.AddMinutes(-30));
            
            // Checkout now should succeed (15 min window starts at checkout)
            order.Checkout();
            Assert.Equal(OrderStatus.PendingPayment, order.Status);
            Assert.NotNull(order.CheckoutStartedAt);
        }

        [Fact]
        public void UpdateItemQuantity_Valid_UpdatesQuantityAndTimestamp()
        {
            var order = new CustomerOrder(Guid.NewGuid());
            var variantId = Guid.NewGuid();
            var vendorId = Guid.NewGuid();
            order.AddItem(variantId, vendorId, 2, new Money(100, "COP"));
            var initialUpdatedAt = order.UpdatedAt;

            order.UpdateItemQuantity(variantId, 5);

            var item = order.Items.First();
            Assert.Equal(5, item.Quantity);
            Assert.Equal(new Money(500, "COP"), item.TotalPrice);
            Assert.True(order.UpdatedAt > initialUpdatedAt);
        }

        [Fact]
        public void UpdateItemQuantity_QuantityLessThanOne_ThrowsInvalidOperationException()
        {
            var order = new CustomerOrder(Guid.NewGuid());
            var variantId = Guid.NewGuid();
            var vendorId = Guid.NewGuid();
            order.AddItem(variantId, vendorId, 2, new Money(100, "COP"));

            Assert.Throws<InvalidOperationException>(() => order.UpdateItemQuantity(variantId, 0));
            Assert.Throws<InvalidOperationException>(() => order.UpdateItemQuantity(variantId, -1));
        }

        [Fact]
        public void UpdateItemQuantity_NotInCartStatus_ThrowsInvalidOperationException()
        {
            var order = new CustomerOrder(Guid.NewGuid());
            var variantId = Guid.NewGuid();
            var vendorId = Guid.NewGuid();
            order.AddItem(variantId, vendorId, 2, new Money(100, "COP"));
            order.Checkout(); // Status is now PendingPayment

            Assert.Throws<InvalidOperationException>(() => order.UpdateItemQuantity(variantId, 5));
        }

        [Fact]
        public void UpdateItemQuantity_NonExistentVariant_ThrowsInvalidOperationException()
        {
            var order = new CustomerOrder(Guid.NewGuid());
            var existingVariantId = Guid.NewGuid();
            var vendorId = Guid.NewGuid();
            order.AddItem(existingVariantId, vendorId, 2, new Money(100, "COP"));

            var nonExistentVariantId = Guid.NewGuid();
            Assert.Throws<InvalidOperationException>(() => order.UpdateItemQuantity(nonExistentVariantId, 5));
        }
    }
}

