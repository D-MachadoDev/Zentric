using System;
using System.Reflection;
using Xunit;
using Zentric.Domain.Orders;
using Zentric.Domain.Orders.Entities;
using Zentric.Domain.Products.ValueObjects;

namespace Zentric.Tests.Domain.Orders
{
    public class OrderItemDomainTests
    {
        private static OrderItem CreateOrderItem(Guid customerOrderId, Guid variantId, Guid vendorId, int quantity, Money unitPrice)
        {
            var ctor = typeof(OrderItem).GetConstructor(
                BindingFlags.NonPublic | BindingFlags.Instance,
                null,
                new[] { typeof(Guid), typeof(Guid), typeof(Guid), typeof(int), typeof(Money) },
                null);

            try
            {
                return (OrderItem)ctor!.Invoke(new object[] { customerOrderId, variantId, vendorId, quantity, unitPrice });
            }
            catch (TargetInvocationException ex)
            {
                throw ex.InnerException!;
            }
        }

        private static void CallAddQuantity(OrderItem item, int qty)
        {
            var method = typeof(OrderItem).GetMethod("AddQuantity", BindingFlags.NonPublic | BindingFlags.Instance);
            try
            {
                method!.Invoke(item, new object[] { qty });
            }
            catch (TargetInvocationException ex)
            {
                throw ex.InnerException!;
            }
        }

        private static void CallUpdateQuantity(OrderItem item, int qty)
        {
            var method = typeof(OrderItem).GetMethod("UpdateQuantity", BindingFlags.NonPublic | BindingFlags.Instance);
            try
            {
                method!.Invoke(item, new object[] { qty });
            }
            catch (TargetInvocationException ex)
            {
                throw ex.InnerException!;
            }
        }

        [Fact]
        public void PrivateConstructor_InvokedByOrm_InitializesProperly()
        {
            var ctor = typeof(OrderItem).GetConstructor(BindingFlags.NonPublic | BindingFlags.Instance, Type.EmptyTypes);
            var item = (OrderItem)ctor!.Invoke(null);
            Assert.NotNull(item);
        }

        [Fact]
        public void Constructor_ValidParameters_InstantiatesSuccessfully()
        {
            var customerOrderId = Guid.NewGuid();
            var variantId = Guid.NewGuid();
            var vendorId = Guid.NewGuid();
            var price = new Money(25_000m, "COP");

            var item = CreateOrderItem(customerOrderId, variantId, vendorId, 3, price);

            Assert.NotEqual(Guid.Empty, item.Id);
            Assert.Equal(customerOrderId, item.CustomerOrderId);
            Assert.Equal(variantId, item.VariantId);
            Assert.Equal(vendorId, item.VendorId);
            Assert.Equal(3, item.Quantity);
            Assert.Equal(price, item.UnitPrice);
            Assert.Equal(new Money(75_000m, "COP"), item.TotalPrice);
            Assert.Null(item.DeliveredAt);
        }

        [Fact]
        public void Constructor_EmptyCustomerOrderId_ThrowsArgumentException()
        {
            Assert.Throws<ArgumentException>(() =>
                CreateOrderItem(Guid.Empty, Guid.NewGuid(), Guid.NewGuid(), 1, new Money(100m, "COP")));
        }

        [Fact]
        public void Constructor_EmptyVariantId_ThrowsArgumentException()
        {
            Assert.Throws<ArgumentException>(() =>
                CreateOrderItem(Guid.NewGuid(), Guid.Empty, Guid.NewGuid(), 1, new Money(100m, "COP")));
        }

        [Fact]
        public void Constructor_EmptyVendorId_ThrowsArgumentException()
        {
            Assert.Throws<ArgumentException>(() =>
                CreateOrderItem(Guid.NewGuid(), Guid.NewGuid(), Guid.Empty, 1, new Money(100m, "COP")));
        }

        [Theory]
        [InlineData(0)]
        [InlineData(-1)]
        [InlineData(-10)]
        public void Constructor_NonPositiveQuantity_ThrowsArgumentOutOfRangeException(int quantity)
        {
            Assert.Throws<ArgumentOutOfRangeException>(() =>
                CreateOrderItem(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), quantity, new Money(100m, "COP")));
        }

        [Fact]
        public void Constructor_NullUnitPrice_ThrowsArgumentNullException()
        {
            Assert.Throws<ArgumentNullException>(() =>
                CreateOrderItem(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), 1, null!));
        }

        [Fact]
        public void AddQuantity_ValidAmount_IncrementsQuantity()
        {
            var item = CreateOrderItem(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), 2, new Money(100m, "COP"));
            CallAddQuantity(item, 3);
            Assert.Equal(5, item.Quantity);
            Assert.Equal(new Money(500m, "COP"), item.TotalPrice);
        }

        [Theory]
        [InlineData(0)]
        [InlineData(-1)]
        public void AddQuantity_NonPositiveAmount_ThrowsArgumentOutOfRangeException(int additional)
        {
            var item = CreateOrderItem(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), 2, new Money(100m, "COP"));
            Assert.Throws<ArgumentOutOfRangeException>(() => CallAddQuantity(item, additional));
        }

        [Fact]
        public void UpdateQuantity_ValidAmount_ReplacesQuantity()
        {
            var item = CreateOrderItem(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), 2, new Money(100m, "COP"));
            CallUpdateQuantity(item, 10);
            Assert.Equal(10, item.Quantity);
        }

        [Theory]
        [InlineData(0)]
        [InlineData(-5)]
        public void UpdateQuantity_NonPositiveAmount_ThrowsArgumentOutOfRangeException(int newQty)
        {
            var item = CreateOrderItem(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), 2, new Money(100m, "COP"));
            Assert.Throws<ArgumentOutOfRangeException>(() => CallUpdateQuantity(item, newQty));
        }

        [Fact]
        public void MarkDelivered_FirstTime_SetsDeliveredAtTimestamp()
        {
            var item = CreateOrderItem(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), 1, new Money(100m, "COP"));
            var before = DateTime.UtcNow;

            item.MarkDelivered();

            Assert.NotNull(item.DeliveredAt);
            Assert.True(item.DeliveredAt >= before);
        }

        [Fact]
        public void MarkDelivered_WhenAlreadyDelivered_ThrowsInvalidOperationException()
        {
            var item = CreateOrderItem(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), 1, new Money(100m, "COP"));
            item.MarkDelivered();

            var ex = Assert.Throws<InvalidOperationException>(() => item.MarkDelivered());
            Assert.Contains("already marked as delivered", ex.Message);
        }

        [Fact]
        public void CustomerOrder_AddItem_RepeatedVariant_InvokesAddQuantity()
        {
            var order = new CustomerOrder(Guid.NewGuid());
            var variantId = Guid.NewGuid();
            var vendorId = Guid.NewGuid();
            var price = new Money(10_000m, "COP");

            order.AddItem(variantId, vendorId, 2, price);
            order.AddItem(variantId, vendorId, 3, price);

            Assert.Single(order.Items);
            var item = System.Linq.Enumerable.First(order.Items);
            Assert.Equal(5, item.Quantity);
            Assert.Equal(new Money(50_000m, "COP"), order.TotalAmount);
        }
    }
}
