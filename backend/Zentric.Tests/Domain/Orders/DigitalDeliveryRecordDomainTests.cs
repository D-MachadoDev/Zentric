using System;
using Xunit;
using Zentric.Domain.Orders.Entities;

namespace Zentric.Tests.Domain.Orders
{
    public class DigitalDeliveryRecordDomainTests
    {
        [Fact]
        public void Constructor_ValidArguments_InitializesProperly()
        {
            var orderId = Guid.NewGuid();
            var orderItemId = Guid.NewGuid();
            var productId = Guid.NewGuid();
            var variantId = Guid.NewGuid();

            var before = DateTime.UtcNow;
            var record = new DigitalDeliveryRecord(orderId, orderItemId, productId, variantId, "  E-Book .NET 10  ", "  SKU-DIG-001  ");

            Assert.NotEqual(Guid.Empty, record.Id);
            Assert.Equal(orderId, record.OrderId);
            Assert.Equal(orderItemId, record.OrderItemId);
            Assert.Equal(productId, record.ProductId);
            Assert.Equal(variantId, record.VariantId);
            Assert.Equal("E-Book .NET 10", record.ProductName);
            Assert.Equal("SKU-DIG-001", record.VariantSku);
            Assert.Equal("system", record.DeliveredBy);
            Assert.True(record.DeliveredAt >= before);
        }

        [Fact]
        public void Constructor_EmptyOrderId_ThrowsArgumentException()
        {
            Assert.Throws<ArgumentException>(() =>
                new DigitalDeliveryRecord(Guid.Empty, Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), "Name", "SKU"));
        }

        [Fact]
        public void Constructor_EmptyOrderItemId_ThrowsArgumentException()
        {
            Assert.Throws<ArgumentException>(() =>
                new DigitalDeliveryRecord(Guid.NewGuid(), Guid.Empty, Guid.NewGuid(), Guid.NewGuid(), "Name", "SKU"));
        }

        [Fact]
        public void Constructor_EmptyProductId_ThrowsArgumentException()
        {
            Assert.Throws<ArgumentException>(() =>
                new DigitalDeliveryRecord(Guid.NewGuid(), Guid.NewGuid(), Guid.Empty, Guid.NewGuid(), "Name", "SKU"));
        }

        [Fact]
        public void Constructor_EmptyVariantId_ThrowsArgumentException()
        {
            Assert.Throws<ArgumentException>(() =>
                new DigitalDeliveryRecord(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.Empty, "Name", "SKU"));
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        [InlineData(null)]
        public void Constructor_InvalidProductName_ThrowsArgumentException(string? name)
        {
            Assert.Throws<ArgumentException>(() =>
                new DigitalDeliveryRecord(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), name!, "SKU"));
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        [InlineData(null)]
        public void Constructor_InvalidVariantSku_ThrowsArgumentException(string? sku)
        {
            Assert.Throws<ArgumentException>(() =>
                new DigitalDeliveryRecord(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), "Name", sku!));
        }
    }
}
