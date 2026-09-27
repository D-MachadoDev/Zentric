using Zentric.Domain.Products.Enums;
using Zentric.Domain.Warehouses;
using Zentric.Domain.Warehouses.Enum;

namespace Zentric.Tests.Warehouses;

/// <summary>
/// Pruebas de caracterización del agregado Warehouse.
/// Reglas protegidas: bodega Marketplace sin vendedor, bodega de vendedor con
/// dueño obligatorio, operaciones bloqueadas sobre bodegas inactivas o borradas.
/// Referencias: backendSDD/Domain/01-models.md, sección 3; backendSDD/Domain/02-value-objects.md.
/// Nota: la especificación usa el término "Vendor"; el código actual usa
/// "Seller". Hallazgo C-05 / R-09 (decisión pendiente Q-05). Estas pruebas fijan
/// el comportamiento actual sin resolver el naming.
/// </summary>
public sealed class WarehouseTests
{
    private static readonly Guid VendorId = Guid.NewGuid();

    private static Warehouse CreateMarketplaceWarehouse()
        => new("Bodega Central", "Calle 1 # 2-3", 1000, WarehouseType.Marketplace, null);

    private static Warehouse CreateSellerWarehouse()
        => new("Bodega del vendedor", "Carrera 9 # 10-11", 50, WarehouseType.Vendor, VendorId);

    [Fact]
    public void Constructor_MarketplaceWithSeller_ThrowsInvalidOperationException()
    {
        Assert.Throws<InvalidOperationException>(
            () => new Warehouse("Bodega", "Calle 1", 10, WarehouseType.Marketplace, VendorId));
    }

    [Fact]
    public void Constructor_SellerWarehouseWithoutSeller_ThrowsInvalidOperationException()
    {
        Assert.Throws<InvalidOperationException>(
            () => new Warehouse("Bodega", "Calle 1", 10, WarehouseType.Vendor, null));
    }

    [Fact]
    public void Constructor_ValidMarketplaceWarehouse_CreatesActiveWarehouse()
    {
        var warehouse = CreateMarketplaceWarehouse();

        Assert.NotEqual(Guid.Empty, warehouse.Id);
        Assert.Null(warehouse.VendorId);
        Assert.Equal(WarehouseType.Marketplace, warehouse.Type);
        Assert.True(warehouse.IsActive);
        Assert.False(warehouse.IsDeleted);
    }

    [Fact]
    public void Constructor_ValidSellerWarehouse_AssignsOwnerSeller()
    {
        var warehouse = CreateSellerWarehouse();

        Assert.Equal(VendorId, warehouse.VendorId);
        Assert.Equal(WarehouseType.Vendor, warehouse.Type);
    }

    [Fact]
    public void Constructor_EmptyName_ThrowsArgumentException()
    {
        Assert.Throws<ArgumentException>(
            () => new Warehouse("  ", "Calle 1", 10, WarehouseType.Marketplace, null));
    }

    [Fact]
    public void Constructor_EmptyLocation_ThrowsArgumentException()
    {
        Assert.Throws<ArgumentException>(
            () => new Warehouse("Bodega", "   ", 10, WarehouseType.Marketplace, null));
    }

    [Fact]
    public void Constructor_NegativeCapacity_ThrowsArgumentOutOfRangeException()
    {
        Assert.Throws<ArgumentOutOfRangeException>(
            () => new Warehouse("Bodega", "Calle 1", -1, WarehouseType.Marketplace, null));
    }

    [Fact]
    public void Rename_ValidName_TrimsAndUpdatesName()
    {
        var warehouse = CreateMarketplaceWarehouse();

        warehouse.Rename("  Bodega Norte  ");

        Assert.Equal("Bodega Norte", warehouse.Name);
    }

    [Fact]
    public void Rename_EmptyName_ThrowsArgumentException()
    {
        var warehouse = CreateMarketplaceWarehouse();

        Assert.Throws<ArgumentException>(() => warehouse.Rename("   "));
    }

    [Fact]
    public void Rename_DeletedWarehouse_ThrowsInvalidOperationException()
    {
        var warehouse = CreateMarketplaceWarehouse();
        warehouse.Delete();

        Assert.Throws<InvalidOperationException>(() => warehouse.Rename("Bodega Norte"));
    }

    [Fact]
    public void Rename_InactiveWarehouse_ThrowsInvalidOperationException()
    {
        var warehouse = CreateMarketplaceWarehouse();
        warehouse.Deactivate();

        Assert.Throws<InvalidOperationException>(() => warehouse.Rename("Bodega Norte"));
    }

    [Fact]
    public void Relocate_ValidLocation_UpdatesLocation()
    {
        var warehouse = CreateMarketplaceWarehouse();

        warehouse.Relocate("  Calle 45 # 12-00  ");

        Assert.Equal("Calle 45 # 12-00", warehouse.Location);
    }

    [Fact]
    public void Deactivate_ActiveWarehouse_SetsIsActiveFalse()
    {
        var warehouse = CreateMarketplaceWarehouse();

        warehouse.Deactivate();

        Assert.False(warehouse.IsActive);
    }

    [Fact]
    public void Deactivate_AlreadyInactive_ThrowsInvalidOperationException()
    {
        var warehouse = CreateMarketplaceWarehouse();
        warehouse.Deactivate();

        Assert.Throws<InvalidOperationException>(() => warehouse.Deactivate());
    }

    [Fact]
    public void Activate_InactiveWarehouse_SetsIsActiveTrue()
    {
        var warehouse = CreateMarketplaceWarehouse();
        warehouse.Deactivate();

        warehouse.Activate();

        Assert.True(warehouse.IsActive);
    }

    [Fact]
    public void ExpandCapacity_ValidAmount_IncreasesCapacity()
    {
        var warehouse = CreateMarketplaceWarehouse();

        warehouse.ExpandCapacity(250);

        Assert.Equal(1250, warehouse.Capacity);
    }

    [Fact]
    public void ExpandCapacity_NegativeAmount_ThrowsArgumentOutOfRangeException()
    {
        var warehouse = CreateMarketplaceWarehouse();

        Assert.Throws<ArgumentOutOfRangeException>(() => warehouse.ExpandCapacity(-1));
    }

    [Fact]
    public void NewCapacity_ValidValue_ReplacesCapacity()
    {
        var warehouse = CreateMarketplaceWarehouse();

        warehouse.NewCapacity(300);

        Assert.Equal(300, warehouse.Capacity);
    }

    [Fact]
    public void Delete_ActiveWarehouse_MarksAsDeletedAndInactive()
    {
        var warehouse = CreateMarketplaceWarehouse();

        warehouse.Delete();

        Assert.True(warehouse.IsDeleted);
        Assert.False(warehouse.IsActive);
    }

    [Fact]
    public void Delete_AlreadyDeleted_ThrowsInvalidOperationException()
    {
        var warehouse = CreateMarketplaceWarehouse();
        warehouse.Delete();

        Assert.Throws<InvalidOperationException>(() => warehouse.Delete());
    }

    [Fact]
    public void Restore_DeletedWarehouse_ReactivatesWarehouse()
    {
        var warehouse = CreateMarketplaceWarehouse();
        warehouse.Delete();

        warehouse.Restore();

        Assert.False(warehouse.IsDeleted);
        Assert.True(warehouse.IsActive);
    }

    [Fact]
    public void Restore_NotDeletedWarehouse_ThrowsInvalidOperationException()
    {
        var warehouse = CreateMarketplaceWarehouse();

        Assert.Throws<InvalidOperationException>(() => warehouse.Restore());
    }
}


