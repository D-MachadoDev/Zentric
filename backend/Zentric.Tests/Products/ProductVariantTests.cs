using Zentric.Domain.Products.Enums;
using Zentric.Domain.Products;
using Zentric.Domain.Products.ValueObjects;

namespace Zentric.Tests.Products;

/// <summary>
/// Pruebas de caracterización de la entidad hija ProductVariant.
/// Regla clave: el Id de la variante (VariantId) es la clave del inventario (SKU),
/// según ADR-0002. Referencias: backendSDD/Domain/02-aggregates-and-entities.md, sección 2,
/// backendSDD/Domain/03-value-objects.md.
/// </summary>
public sealed class ProductVariantTests
{
    private static readonly Guid ProductId = Guid.NewGuid();

    private static List<VariantAttribute> DefaultAttributes()
        => new() { new VariantAttribute("Talla", "M") };

    private static ProductVariant CreateVariant()
        => new(ProductId, "cam-m", DefaultAttributes());

    [Fact]
    public void Constructor_ValidData_CreatesActiveSellableVariant()
    {
        var variant = CreateVariant();

        Assert.NotEqual(Guid.Empty, variant.Id);
        Assert.Equal(ProductId, variant.ProductId);
        Assert.Equal("CAM-M", variant.Sku);
        Assert.True(variant.IsActive);
        Assert.True(variant.CanBeSold);
        Assert.False(variant.IsDeleted);
        Assert.Single(variant.Attributes);
    }

    [Fact]
    public void Constructor_LowerCaseSku_NormalizesToUpperCase()
    {
        var variant = new ProductVariant(ProductId, "  cam-m  ", DefaultAttributes());

        Assert.Equal("CAM-M", variant.Sku);
    }

    [Fact]
    public void Constructor_EmptyProductId_ThrowsArgumentException()
    {
        var exception = Assert.Throws<ArgumentException>(
            () => new ProductVariant(Guid.Empty, "CAM-M", DefaultAttributes()));

        Assert.Equal("productId", exception.ParamName);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Constructor_EmptySku_ThrowsArgumentException(string sku)
    {
        var exception = Assert.Throws<ArgumentException>(() => new ProductVariant(ProductId, sku, DefaultAttributes()));

        Assert.Equal("sku", exception.ParamName);
    }

    [Fact]
    public void Constructor_NullAttributes_ThrowsArgumentNullException()
    {
        Assert.Throws<ArgumentNullException>(() => new ProductVariant(ProductId, "CAM-M", null!));
    }

    [Fact]
    public void Constructor_NoAttributes_ThrowsArgumentException()
    {
        var exception = Assert.Throws<ArgumentException>(
            () => new ProductVariant(ProductId, "CAM-M", new List<VariantAttribute>()));

        Assert.Equal("attributes", exception.ParamName);
    }

    [Fact]
    public void Constructor_RepeatedAttributeName_ThrowsArgumentException()
    {
        var attributes = new List<VariantAttribute>
        {
            new("Talla", "M"),
            new("talla", "L")
        };

        var exception = Assert.Throws<ArgumentException>(() => new ProductVariant(ProductId, "CAM-M", attributes));

        Assert.Equal("attributes", exception.ParamName);
    }

    [Fact]
    public void UpdateSku_ValidSku_NormalizesToUpperCase()
    {
        var variant = CreateVariant();

        variant.UpdateSku("  cam-l  ");

        Assert.Equal("CAM-L", variant.Sku);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void UpdateSku_EmptySku_ThrowsArgumentException(string sku)
    {
        var variant = CreateVariant();

        Assert.Throws<ArgumentException>(() => variant.UpdateSku(sku));
    }

    [Fact]
    public void UpdateSku_DeletedVariant_ThrowsInvalidOperationException()
    {
        var variant = CreateVariant();
        variant.Delete();

        Assert.Throws<InvalidOperationException>(() => variant.UpdateSku("CAM-L"));
    }

    [Fact]
    public void UpdateAttributes_ValidAttributes_ReplacesCollection()
    {
        var variant = CreateVariant();

        variant.UpdateAttributes(new List<VariantAttribute>
        {
            new("Talla", "L"),
            new("Color", "Rojo")
        });

        Assert.Equal(2, variant.Attributes.Count);
        Assert.Contains(variant.Attributes, attribute => attribute.Name == "Color" && attribute.Value == "Rojo");
    }

    [Fact]
    public void UpdateAttributes_NoAttributes_ThrowsArgumentException()
    {
        var variant = CreateVariant();

        Assert.Throws<ArgumentException>(() => variant.UpdateAttributes(new List<VariantAttribute>()));
    }

    [Fact]
    public void UpdateAttributes_DeletedVariant_ThrowsInvalidOperationException()
    {
        var variant = CreateVariant();
        variant.Delete();

        Assert.Throws<InvalidOperationException>(() => variant.UpdateAttributes(DefaultAttributes()));
    }

    [Fact]
    public void Deactivate_ActiveVariant_BlocksSale()
    {
        var variant = CreateVariant();

        variant.Deactivate();

        Assert.False(variant.IsActive);
        Assert.False(variant.CanBeSold);
    }

    [Fact]
    public void Deactivate_AlreadyInactiveVariant_ThrowsInvalidOperationException()
    {
        var variant = CreateVariant();
        variant.Deactivate();

        Assert.Throws<InvalidOperationException>(() => variant.Deactivate());
    }

    [Fact]
    public void Activate_InactiveVariant_EnablesSale()
    {
        var variant = CreateVariant();
        variant.Deactivate();

        variant.Activate();

        Assert.True(variant.CanBeSold);
    }

    [Fact]
    public void Activate_AlreadyActiveVariant_ThrowsInvalidOperationException()
    {
        var variant = CreateVariant();

        Assert.Throws<InvalidOperationException>(() => variant.Activate());
    }

    [Fact]
    public void Delete_ActiveVariant_MarksAsDeletedAndNotSellable()
    {
        var variant = CreateVariant();

        variant.Delete();

        Assert.True(variant.IsDeleted);
        Assert.False(variant.CanBeSold);
    }

    [Fact]
    public void Delete_AlreadyDeletedVariant_ThrowsInvalidOperationException()
    {
        var variant = CreateVariant();
        variant.Delete();

        Assert.Throws<InvalidOperationException>(() => variant.Delete());
    }

    [Fact]
    public void Restore_DeletedVariant_ReactivatesVariant()
    {
        var variant = CreateVariant();
        variant.Delete();

        variant.Restore();

        Assert.False(variant.IsDeleted);
        Assert.True(variant.CanBeSold);
    }

    [Fact]
    public void Restore_NotDeletedVariant_ThrowsInvalidOperationException()
    {
        var variant = CreateVariant();

        Assert.Throws<InvalidOperationException>(() => variant.Restore());
    }

    [Fact]
    public void Attributes_ExposedAsReadOnly_MutableCastThrowsNotSupportedException()
    {
        var variant = CreateVariant();
        var attributes = (IList<VariantAttribute>)variant.Attributes;

        Assert.Throws<NotSupportedException>(() => attributes.Add(new VariantAttribute("Color", "Rojo")));
    }
}

