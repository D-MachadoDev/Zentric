using System;
using Xunit;
using Zentric.Domain.Inventories;

namespace Zentric.Tests.Domain.Inventories
{
    public class InventoryDomainTests
    {
        [Fact]
        public void Constructor_ValidArguments_InitializesProperly()
        {
            var variantId = Guid.NewGuid();
            var warehouseId = Guid.NewGuid();

            var inv = new Inventory(variantId, warehouseId, 50, 10, 2, 5);

            Assert.NotEqual(Guid.Empty, inv.Id);
            Assert.Equal(variantId, inv.VariantId);
            Assert.Equal(warehouseId, inv.WarehouseId);
            Assert.Equal(50, inv.AvailableQuantity);
            Assert.Equal(10, inv.ReservedQuantity);
            Assert.Equal(2, inv.DamagedQuantity);
            Assert.Equal(5, inv.UsedQuantity);
            Assert.False(inv.IsDeleted);
        }

        [Fact]
        public void Constructor_EmptyVariantId_ThrowsArgumentException()
        {
            Assert.Throws<ArgumentException>(() =>
                new Inventory(Guid.Empty, Guid.NewGuid(), 10, 0, 0));
        }

        [Fact]
        public void Constructor_EmptyWarehouseId_ThrowsArgumentException()
        {
            Assert.Throws<ArgumentException>(() =>
                new Inventory(Guid.NewGuid(), Guid.Empty, 10, 0, 0));
        }

        [Fact]
        public void Constructor_NegativeAvailableQuantity_ThrowsArgumentOutOfRangeException()
        {
            Assert.Throws<ArgumentOutOfRangeException>(() =>
                new Inventory(Guid.NewGuid(), Guid.NewGuid(), -1, 0, 0));
        }

        [Fact]
        public void Constructor_NegativeReservedQuantity_ThrowsArgumentOutOfRangeException()
        {
            Assert.Throws<ArgumentOutOfRangeException>(() =>
                new Inventory(Guid.NewGuid(), Guid.NewGuid(), 10, -1, 0));
        }

        [Fact]
        public void Constructor_NegativeDamagedQuantity_ThrowsArgumentOutOfRangeException()
        {
            Assert.Throws<ArgumentOutOfRangeException>(() =>
                new Inventory(Guid.NewGuid(), Guid.NewGuid(), 10, 0, -1));
        }

        [Fact]
        public void DispatchStock_ValidQuantity_ReducesReservedQuantity()
        {
            var inv = new Inventory(Guid.NewGuid(), Guid.NewGuid(), 10, 5, 0);

            inv.DispatchStock(3);

            Assert.Equal(2, inv.ReservedQuantity);
            Assert.Equal(10, inv.AvailableQuantity);
        }

        [Theory]
        [InlineData(0)]
        [InlineData(-2)]
        public void DispatchStock_NonPositiveQuantity_ThrowsArgumentOutOfRangeException(int qty)
        {
            var inv = new Inventory(Guid.NewGuid(), Guid.NewGuid(), 10, 5, 0);
            Assert.Throws<ArgumentOutOfRangeException>(() => inv.DispatchStock(qty));
        }

        [Fact]
        public void DispatchStock_ExceedingReserved_ThrowsArgumentOutOfRangeException()
        {
            var inv = new Inventory(Guid.NewGuid(), Guid.NewGuid(), 10, 5, 0);
            Assert.Throws<ArgumentOutOfRangeException>(() => inv.DispatchStock(6));
        }

        [Fact]
        public void MarkAsDamaged_ValidQuantity_MovesAvailableToDamaged()
        {
            var inv = new Inventory(Guid.NewGuid(), Guid.NewGuid(), 10, 5, 2);

            inv.MarkAsDamaged(4);

            Assert.Equal(6, inv.AvailableQuantity);
            Assert.Equal(6, inv.DamagedQuantity);
        }

        [Theory]
        [InlineData(0)]
        [InlineData(-1)]
        public void MarkAsDamaged_NonPositiveQuantity_ThrowsArgumentOutOfRangeException(int qty)
        {
            var inv = new Inventory(Guid.NewGuid(), Guid.NewGuid(), 10, 5, 2);
            Assert.Throws<ArgumentOutOfRangeException>(() => inv.MarkAsDamaged(qty));
        }

        [Fact]
        public void MarkAsDamaged_ExceedingAvailable_ThrowsArgumentOutOfRangeException()
        {
            var inv = new Inventory(Guid.NewGuid(), Guid.NewGuid(), 10, 5, 2);
            Assert.Throws<ArgumentOutOfRangeException>(() => inv.MarkAsDamaged(15));
        }

        [Fact]
        public void ReturnToUsedStock_ValidQuantity_IncrementsUsedQuantity()
        {
            var inv = new Inventory(Guid.NewGuid(), Guid.NewGuid(), 10, 0, 0, usedQuantity: 3);

            inv.ReturnToUsedStock(2);

            Assert.Equal(5, inv.UsedQuantity);
        }

        [Theory]
        [InlineData(0)]
        [InlineData(-3)]
        public void ReturnToUsedStock_NonPositiveQuantity_ThrowsArgumentOutOfRangeException(int qty)
        {
            var inv = new Inventory(Guid.NewGuid(), Guid.NewGuid(), 10, 0, 0);
            Assert.Throws<ArgumentOutOfRangeException>(() => inv.ReturnToUsedStock(qty));
        }
    }
}
