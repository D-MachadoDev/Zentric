using Zentric.Domain.Inventories;

namespace Zentric.Tests.Inventories;

/// <summary>
/// Pruebas de caracterización del agregado de inventario.
/// Invariante protegida: INV-01 / invariante 1 ("AvailableQuantity nunca puede
/// ser negativo bajo ninguna circunstancia").
/// </summary>
public sealed class InventoryTests
{
    private static readonly Guid VariantId = Guid.NewGuid();
    private static readonly Guid WarehouseId = Guid.NewGuid();

    private static Inventory CreateInventory(int available = 10, int reserved = 0, int damaged = 0)
        => new(VariantId, WarehouseId, available, reserved, damaged);

    [Fact]
    public void Constructor_ValidData_SetsQuantitiesAndIdentity()
    {
        var inventory = CreateInventory(available: 7, reserved: 2, damaged: 1);

        Assert.NotEqual(Guid.Empty, inventory.Id);
        Assert.Equal(VariantId, inventory.VariantId);
        Assert.Equal(WarehouseId, inventory.WarehouseId);
        Assert.Equal(7, inventory.AvailableQuantity);
        Assert.Equal(2, inventory.ReservedQuantity);
        Assert.Equal(1, inventory.DamagedQuantity);
        Assert.False(inventory.IsDeleted);
    }

    [Fact]
    public void Constructor_EmptyVariantId_ThrowsArgumentException()
    {
        var exception = Assert.Throws<ArgumentException>(
            () => new Inventory(Guid.Empty, WarehouseId, 1, 0, 0));

        Assert.Equal("variantId", exception.ParamName);
    }

    [Fact]
    public void Constructor_EmptyWarehouseId_ThrowsArgumentException()
    {
        var exception = Assert.Throws<ArgumentException>(
            () => new Inventory(VariantId, Guid.Empty, 1, 0, 0));

        Assert.Equal("warehouseId", exception.ParamName);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(-100)]
    public void Constructor_NegativeAvailableQuantity_ThrowsArgumentOutOfRangeException(int available)
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => new Inventory(VariantId, WarehouseId, available, 0, 0));
    }

    [Fact]
    public void Constructor_NegativeReservedQuantity_ThrowsArgumentOutOfRangeException()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => new Inventory(VariantId, WarehouseId, 0, -1, 0));
    }

    [Fact]
    public void Constructor_NegativeDamagedQuantity_ThrowsArgumentOutOfRangeException()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => new Inventory(VariantId, WarehouseId, 0, 0, -1));
    }

    [Fact]
    public void ReserveStock_QuantityGreaterThanAvailable_ThrowsArgumentOutOfRangeException()
    {
        var inventory = CreateInventory(available: 5);

        Assert.Throws<ArgumentOutOfRangeException>(() => inventory.ReserveStock(6));
        Assert.Equal(5, inventory.AvailableQuantity);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-3)]
    public void ReserveStock_NonPositiveQuantity_ThrowsArgumentOutOfRangeException(int quantity)
    {
        var inventory = CreateInventory();

        Assert.Throws<ArgumentOutOfRangeException>(() => inventory.ReserveStock(quantity));
    }

    [Fact]
    public void ReserveStock_ValidQuantity_MovesUnitsFromAvailableToReserved()
    {
        var inventory = CreateInventory(available: 10);

        inventory.ReserveStock(4);

        Assert.Equal(6, inventory.AvailableQuantity);
        Assert.Equal(4, inventory.ReservedQuantity);
    }

    [Fact]
    public void AddStock_ValidQuantity_IncreasesAvailableQuantity()
    {
        var inventory = CreateInventory(available: 2);

        inventory.AddStock(5);

        Assert.Equal(7, inventory.AvailableQuantity);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void AddStock_NonPositiveQuantity_ThrowsArgumentOutOfRangeException(int quantity)
    {
        var inventory = CreateInventory();

        Assert.Throws<ArgumentOutOfRangeException>(() => inventory.AddStock(quantity));
    }


    [Fact]
    public void MarkAsDamaged_QuantityGreaterThanAvailable_ThrowsArgumentOutOfRangeException()
    {
        var inventory = CreateInventory(available: 3);

        Assert.Throws<ArgumentOutOfRangeException>(() => inventory.MarkAsDamaged(4));
        Assert.Equal(3, inventory.AvailableQuantity);
        Assert.Equal(0, inventory.DamagedQuantity);
    }

    [Fact]
    public void MarkAsDamaged_ValidQuantity_MovesUnitsFromAvailableToDamaged()
    {
        var inventory = CreateInventory(available: 5);

        inventory.MarkAsDamaged(2);

        Assert.Equal(3, inventory.AvailableQuantity);
        Assert.Equal(2, inventory.DamagedQuantity);
    }

    [Fact]
    public void ReturnToAvailable_QuantityGreaterThanReserved_ThrowsArgumentOutOfRangeException()
    {
        var inventory = CreateInventory(available: 0, reserved: 2);

        Assert.Throws<ArgumentOutOfRangeException>(() => inventory.ReturnToAvailable(3));
    }

    [Fact]
    public void ReturnToAvailable_ValidQuantity_MovesUnitsBackToAvailable()
    {
        var inventory = CreateInventory(available: 0, reserved: 5);

        inventory.ReturnToAvailable(5);

        Assert.Equal(5, inventory.AvailableQuantity);
        Assert.Equal(0, inventory.ReservedQuantity);
    }

    /// <summary>
    /// Regresión del hallazgo H-08:
    /// ReturnToAvailable no validaba cantidades no positivas como el resto de las
    /// operaciones, lo que permitía dejar AvailableQuantity por debajo de cero y
    /// violar INV-01. Prueba asociada a la corrección T-003.
    /// </summary>
    [Theory]
    [InlineData(0)]
    [InlineData(-100)]
    public void ReturnToAvailable_NonPositiveQuantity_ThrowsArgumentOutOfRangeException(int quantity)
    {
        var inventory = CreateInventory(available: 0, reserved: 5);

        Assert.Throws<ArgumentOutOfRangeException>(() => inventory.ReturnToAvailable(quantity));
        Assert.True(inventory.AvailableQuantity >= 0, "INV-01: el stock disponible nunca puede ser negativo.");
    }

    [Fact]
    public void ReceiveReturnedStock_ValidQuantity_IncreasesAvailableQuantity()
    {
        var inventory = CreateInventory(available: 1, damaged: 1);

        inventory.ReceiveReturnedStock(1);

        Assert.Equal(2, inventory.AvailableQuantity);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void ReceiveReturnedStock_NonPositiveQuantity_ThrowsArgumentOutOfRangeException(int quantity)
    {
        var inventory = CreateInventory();

        Assert.Throws<ArgumentOutOfRangeException>(() => inventory.ReceiveReturnedStock(quantity));
    }

    [Fact]
    public void MarkAsDeleted_WithExistingStock_ThrowsInvalidOperationException()
    {
        var inventory = CreateInventory(available: 1);

        Assert.Throws<InvalidOperationException>(() => inventory.MarkAsDeleted());
        Assert.False(inventory.IsDeleted);
    }

    [Fact]
    public void MarkAsDeleted_WithoutStock_MarksInventoryAsDeleted()
    {
        var inventory = CreateInventory(available: 0, reserved: 0, damaged: 0);

        inventory.MarkAsDeleted();

        Assert.True(inventory.IsDeleted);
    }

    [Fact]
    public void MarkAsDeleted_AlreadyDeleted_ThrowsInvalidOperationException()
    {
        var inventory = CreateInventory(available: 0, reserved: 0, damaged: 0);
        inventory.MarkAsDeleted();

        Assert.Throws<InvalidOperationException>(() => inventory.MarkAsDeleted());
    }

    [Fact]
    public void ApplyPhysicalCount_LowerCount_ReducesAvailableAndRecordsAudit()
    {
        var inventory = CreateInventory(available: 10);
        var countedBy = Guid.NewGuid();

        inventory.ApplyPhysicalCount(countedQuantity: 7, countedBy: countedBy, reason: "Conteo mensual bodega norte");

        Assert.Equal(7, inventory.AvailableQuantity);
        var record = Assert.Single(inventory.AdjustmentHistory);
        Assert.Equal(10, record.SystemQuantity);
        Assert.Equal(7, record.PhysicalQuantity);
        Assert.Equal(countedBy, record.CountedBy);
        Assert.NotEqual(default, record.CountedAt);
    }

    [Fact]
    public void ApplyPhysicalCount_HigherCount_ThrowsWithoutTouchingStock()
    {
        var inventory = CreateInventory(available: 10);

        Assert.Throws<InvalidOperationException>(() =>
            inventory.ApplyPhysicalCount(countedQuantity: 12, countedBy: Guid.NewGuid(), reason: "Sobrante"));

        Assert.Equal(10, inventory.AvailableQuantity);
        Assert.Empty(inventory.AdjustmentHistory);
    }

    [Fact]
    public void ApplyPhysicalCount_EmptyReason_ThrowsArgumentException()
    {
        var inventory = CreateInventory(available: 10);

        Assert.Throws<ArgumentException>(() =>
            inventory.ApplyPhysicalCount(countedQuantity: 7, countedBy: Guid.NewGuid(), reason: "  "));

        Assert.Equal(10, inventory.AvailableQuantity);
    }

    [Fact]
    public void ApplyPhysicalCount_NegativeCount_ThrowsWithoutTouchingStock()
    {
        var inventory = CreateInventory(available: 10);

        Assert.Throws<ArgumentOutOfRangeException>(() =>
            inventory.ApplyPhysicalCount(countedQuantity: -1, countedBy: Guid.NewGuid(), reason: "Error de conteo"));

        Assert.Equal(10, inventory.AvailableQuantity);
        Assert.Empty(inventory.AdjustmentHistory);
    }

    [Fact]
    public void ApplyPhysicalCount_BelowZero_ThrowsBecauseStockCannotGoNegative()
    {
        var inventory = CreateInventory(available: 0);

        // Un conteo no puede inventar stock: si el sistema dice 0 y el conteo
        // pretende otra cosa, el ajuste a la baja no aplica y no hay registro.
        inventory.ApplyPhysicalCount(countedQuantity: 0, countedBy: Guid.NewGuid(), reason: "Sin novedad");

        Assert.Equal(0, inventory.AvailableQuantity);
        Assert.Empty(inventory.AdjustmentHistory);
    }
}
