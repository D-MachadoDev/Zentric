using System;
using Xunit;
using Zentric.Domain.Warehouses;
using Zentric.Domain.Warehouses.Enum;

namespace Zentric.Tests.Domain.Warehouses
{
    public class WarehouseDomainTests
    {
        [Fact]
        public void Constructor_MarketplaceWarehouse_InstantiatesSuccessfully()
        {
            var warehouse = new Warehouse("Bodega Central", "Fontibón, Bogotá", 1000, WarehouseType.Marketplace, null);

            Assert.NotEqual(Guid.Empty, warehouse.Id);
            Assert.Equal("Bodega Central", warehouse.Name);
            Assert.Equal("Fontibón, Bogotá", warehouse.Location);
            Assert.Equal(1000, warehouse.Capacity);
            Assert.Equal(WarehouseType.Marketplace, warehouse.Type);
            Assert.Null(warehouse.VendorId);
            Assert.True(warehouse.IsActive);
            Assert.False(warehouse.IsDeleted);
        }

        [Fact]
        public void Constructor_VendorWarehouse_InstantiatesSuccessfully()
        {
            var vendorId = Guid.NewGuid();
            var warehouse = new Warehouse("Bodega Vendedor", "Medellín", 500, WarehouseType.Vendor, vendorId);

            Assert.Equal(WarehouseType.Vendor, warehouse.Type);
            Assert.Equal(vendorId, warehouse.VendorId);
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        [InlineData(null)]
        public void Constructor_InvalidName_ThrowsArgumentException(string? name)
        {
            Assert.Throws<ArgumentException>(() =>
                new Warehouse(name!, "Bogotá", 100, WarehouseType.Marketplace, null));
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        [InlineData(null)]
        public void Constructor_InvalidLocation_ThrowsArgumentException(string? location)
        {
            Assert.Throws<ArgumentException>(() =>
                new Warehouse("Bodega", location!, 100, WarehouseType.Marketplace, null));
        }

        [Fact]
        public void Constructor_NegativeCapacity_ThrowsArgumentOutOfRangeException()
        {
            Assert.Throws<ArgumentOutOfRangeException>(() =>
                new Warehouse("Bodega", "Bogotá", -10, WarehouseType.Marketplace, null));
        }

        [Fact]
        public void Constructor_MarketplaceWithVendor_ThrowsInvalidOperationException()
        {
            Assert.Throws<InvalidOperationException>(() =>
                new Warehouse("Bodega", "Bogotá", 100, WarehouseType.Marketplace, Guid.NewGuid()));
        }

        [Fact]
        public void Constructor_VendorWithoutVendor_ThrowsInvalidOperationException()
        {
            Assert.Throws<InvalidOperationException>(() =>
                new Warehouse("Bodega", "Bogotá", 100, WarehouseType.Vendor, null));
        }

        [Fact]
        public void Rename_ValidName_UpdatesName()
        {
            var warehouse = new Warehouse("Bodega", "Bogotá", 100, WarehouseType.Marketplace, null);
            warehouse.Rename("Nueva Bodega Central");
            Assert.Equal("Nueva Bodega Central", warehouse.Name);
        }

        [Theory]
        [InlineData("")]
        [InlineData("  ")]
        [InlineData(null)]
        public void Rename_InvalidName_ThrowsArgumentException(string? name)
        {
            var warehouse = new Warehouse("Bodega", "Bogotá", 100, WarehouseType.Marketplace, null);
            Assert.Throws<ArgumentException>(() => warehouse.Rename(name!));
        }

        [Fact]
        public void Relocate_ValidLocation_UpdatesLocation()
        {
            var warehouse = new Warehouse("Bodega", "Bogotá", 100, WarehouseType.Marketplace, null);
            warehouse.Relocate("Cali, Valle");
            Assert.Equal("Cali, Valle", warehouse.Location);
        }

        [Theory]
        [InlineData("")]
        [InlineData("  ")]
        [InlineData(null)]
        public void Relocate_InvalidLocation_ThrowsArgumentException(string? loc)
        {
            var warehouse = new Warehouse("Bodega", "Bogotá", 100, WarehouseType.Marketplace, null);
            Assert.Throws<ArgumentException>(() => warehouse.Relocate(loc!));
        }

        [Fact]
        public void ExpandCapacity_ValidAmount_IncreasesCapacity()
        {
            var warehouse = new Warehouse("Bodega", "Bogotá", 100, WarehouseType.Marketplace, null);
            warehouse.ExpandCapacity(50);
            Assert.Equal(150, warehouse.Capacity);
        }

        [Fact]
        public void ExpandCapacity_NegativeAmount_ThrowsArgumentOutOfRangeException()
        {
            var warehouse = new Warehouse("Bodega", "Bogotá", 100, WarehouseType.Marketplace, null);
            Assert.Throws<ArgumentOutOfRangeException>(() => warehouse.ExpandCapacity(-5));
        }

        [Fact]
        public void NewCapacity_ValidAmount_ReplacesCapacity()
        {
            var warehouse = new Warehouse("Bodega", "Bogotá", 100, WarehouseType.Marketplace, null);
            warehouse.NewCapacity(300);
            Assert.Equal(300, warehouse.Capacity);
        }

        [Fact]
        public void NewCapacity_NegativeAmount_ThrowsArgumentException()
        {
            var warehouse = new Warehouse("Bodega", "Bogotá", 100, WarehouseType.Marketplace, null);
            Assert.Throws<ArgumentException>(() => warehouse.NewCapacity(-1));
        }

        [Fact]
        public void Activation_Deactivation_LifecycleWorksCorrectly()
        {
            var warehouse = new Warehouse("Bodega", "Bogotá", 100, WarehouseType.Marketplace, null);
            Assert.True(warehouse.IsActive);

            warehouse.Deactivate();
            Assert.False(warehouse.IsActive);

            // Cannot deactivate again
            Assert.Throws<InvalidOperationException>(() => warehouse.Deactivate());

            // Operations when inactive throw InvalidOperationException
            Assert.Throws<InvalidOperationException>(() => warehouse.Rename("Otro Nombre"));
            Assert.Throws<InvalidOperationException>(() => warehouse.Relocate("Otra Ciudad"));
            Assert.Throws<InvalidOperationException>(() => warehouse.ExpandCapacity(10));
            Assert.Throws<InvalidOperationException>(() => warehouse.NewCapacity(20));

            // Reactivate
            warehouse.Activate();
            Assert.True(warehouse.IsActive);

            // Cannot activate already active
            Assert.Throws<InvalidOperationException>(() => warehouse.Activate());
        }

        [Fact]
        public void Deletion_And_Restoration_LifecycleWorksCorrectly()
        {
            var warehouse = new Warehouse("Bodega", "Bogotá", 100, WarehouseType.Marketplace, null);

            warehouse.Delete();
            Assert.True(warehouse.IsDeleted);
            Assert.False(warehouse.IsActive);

            // Cannot delete again
            Assert.Throws<InvalidOperationException>(() => warehouse.Delete());
            Assert.Throws<InvalidOperationException>(() => warehouse.MarkAsDeleted());

            // Operations when deleted throw InvalidOperationException
            Assert.Throws<InvalidOperationException>(() => warehouse.Rename("X"));
            Assert.Throws<InvalidOperationException>(() => warehouse.Relocate("X"));
            Assert.Throws<InvalidOperationException>(() => warehouse.ExpandCapacity(10));
            Assert.Throws<InvalidOperationException>(() => warehouse.NewCapacity(10));
            Assert.Throws<InvalidOperationException>(() => warehouse.Activate());
            Assert.Throws<InvalidOperationException>(() => warehouse.Deactivate());

            // Restore
            warehouse.Restore();
            Assert.False(warehouse.IsDeleted);
            Assert.True(warehouse.IsActive);

            // Cannot restore when not deleted
            Assert.Throws<InvalidOperationException>(() => warehouse.Restore());
        }
    }
}
