using Zentric.Domain.Products;
using Zentric.Domain.Products.Enums;
using Zentric.Domain.Products.ValueObjects;

namespace Zentric.Tests.Products;

/// <summary>
/// Pruebas de caracterización del agregado Product.
/// Regla protegida: CAT-01 / invariante 5 ("todo producto creado entra de
/// inmediato a estado publicado, sin aprobación previa").
/// Referencias: backendSDD/Domain/01-models.md, sección 2; backendSDD/Domain/06-business-rules.md, sección 3.
/// Nota: la especificación declara ProductStatus (Published/Suspended/
/// Discontinued); el código usa IsActive + DeletedAt. Hallazgo C-05/R-09,
/// decisión pendiente. Estas pruebas fijan el comportamiento actual.
/// </summary>
public sealed class ProductTests
{
    private static readonly Guid VendorId = Guid.NewGuid();

    //! IA: Q-10 = C3 (ADR-0003) — un producto Fisico exige al menos una variante, por
    // eso el helper por defecto crea un Digital (CAT-02: sin logistica ni inventario).
    private static Product CreateProduct(ProductType type = ProductType.Digital)
        => new("Camiseta", "Camiseta de algodón", new Money(25.50m, "COP"), VendorId, type);

    private static Product CreatePhysicalProduct(string sku = "CAM-M")
        => new(
            "Camiseta",
            "Camiseta de algodón",
            new Money(25.50m, "COP"),
            VendorId,
            ProductType.Physical,
            new List<(string Sku, IEnumerable<VariantAttribute> Attributes)>
            {
                (sku, new List<VariantAttribute> { new("Talla", "M") })
            });

    [Fact]
    public void Constructor_ValidData_StartsActiveAndSellable()
    {
        var product = CreateProduct();

        Assert.NotEqual(Guid.Empty, product.Id);
        Assert.Equal(VendorId, product.VendorId);
        Assert.Equal(ProductStatus.Published, product.Status);
        Assert.True(product.CanBeSold);
        Assert.False(product.IsDeleted);
    }

    [Fact]
    public void Constructor_ValidData_TrimsTextFields()
    {
        var product = new Product("  Camiseta  ", "  Tela  ", new Money(1m, "COP"), VendorId, ProductType.Digital);

        Assert.Equal("Camiseta", product.Name);
        Assert.Equal("Tela", product.Description);
    }

    [Fact]
    public void Constructor_EmptyName_ThrowsArgumentException()
    {
        var exception = Assert.Throws<ArgumentException>(
            () => new Product(" ", "Descripción", new Money(1m, "COP"), VendorId, ProductType.Physical));

        Assert.Equal("name", exception.ParamName);
    }

    [Fact]
    public void Constructor_EmptyDescription_ThrowsArgumentException()
    {
        Assert.Throws<ArgumentException>(
            () => new Product("Camiseta", " ", new Money(1m, "COP"), VendorId, ProductType.Physical));
    }

    [Fact]
    public void Constructor_EmptyVendorId_ThrowsArgumentException()
    {
        var exception = Assert.Throws<ArgumentException>(
            () => new Product("Camiseta", "Descripción", new Money(1m, "COP"), Guid.Empty, ProductType.Physical));

        Assert.Equal("vendorId", exception.ParamName);
    }

    [Fact]
    public void Constructor_UndefinedProductType_ThrowsArgumentOutOfRangeException()
    {
        Assert.Throws<ArgumentOutOfRangeException>(
            () => new Product("Camiseta", "Descripción", new Money(1m, "COP"), VendorId, (ProductType)99));
    }

    [Fact]
    public void Constructor_NullPrice_ThrowsArgumentNullException()
    {
        Assert.Throws<ArgumentNullException>(
            () => new Product("Camiseta", "Descripción", null!, VendorId, ProductType.Physical));
    }

    [Fact]
    public void UpdatePrice_ActiveProduct_ReplacesPrice()
    {
        var product = CreateProduct();
        var newPrice = new Money(30m, "COP");

        product.UpdatePrice(newPrice);

        Assert.Equal(newPrice, product.Price);
    }

    [Fact]
    public void UpdatePrice_DeletedProduct_ThrowsInvalidOperationException()
    {
        var product = CreateProduct();
        product.Delete();

        Assert.Throws<InvalidOperationException>(() => product.UpdatePrice(new Money(30m, "COP")));
    }

    [Fact]
    public void Suspend_ActiveProduct_DeactivatesAndBlocksSale()
    {
        var product = CreateProduct();

        product.Suspend();

        Assert.NotEqual(ProductStatus.Published, product.Status);
        Assert.False(product.CanBeSold);
    }

    [Fact]
    public void Suspend_AlreadyInactiveProduct_ThrowsInvalidOperationException()
    {
        var product = CreateProduct();
        product.Suspend();

        Assert.Throws<InvalidOperationException>(() => product.Suspend());
    }

    [Fact]
    public void Publish_InactiveProduct_ActivatesProduct()
    {
        var product = CreateProduct();
        product.Suspend();

        product.Publish();

        Assert.Equal(ProductStatus.Published, product.Status);
        Assert.True(product.CanBeSold);
    }

    [Fact]
    public void Deactivate_DeletedProduct_ThrowsInvalidOperationException()
    {
        var product = CreateProduct();
        product.Delete();

        Assert.Throws<InvalidOperationException>(() => product.Suspend());
    }

    [Fact]
    public void Delete_ActiveProduct_MarksAsDeletedAndNotSellable()
    {
        var product = CreateProduct();

        product.Delete();

        Assert.True(product.IsDeleted);
        Assert.False(product.CanBeSold);
    }

    [Fact]
    public void Delete_AlreadyDeletedProduct_ThrowsInvalidOperationException()
    {
        var product = CreateProduct();
        product.Delete();

        Assert.Throws<InvalidOperationException>(() => product.Delete());
    }

    [Fact]
    public void Restore_DeletedProduct_ReactivatesProduct()
    {
        var product = CreateProduct();
        product.Delete();

        product.Restore();

        Assert.False(product.IsDeleted);
        Assert.True(product.CanBeSold);
    }

    [Fact]
    public void Restore_NotDeletedProduct_ThrowsInvalidOperationException()
    {
        var product = CreateProduct();

        Assert.Throws<InvalidOperationException>(() => product.Restore());
    }

    [Fact]
    public void UpdateType_PhysicalProductToDigital_ReplacesType()
    {
        var product = CreatePhysicalProduct();

        product.UpdateType(ProductType.Digital);

        Assert.Equal(ProductType.Digital, product.Type);
    }

    [Fact]
    public void Variants_NewProduct_StartsEmpty()
    {
        var product = CreateProduct();

        Assert.Empty(product.Variants);
    }

    [Fact]
    public void AddVariant_ValidSku_AddsVariantLinkedToProduct()
    {
        var product = CreateProduct();

        var variant = product.AddVariant("cam-m", new List<VariantAttribute> { new("Talla", "M") });

        Assert.Single(product.Variants);
        Assert.Equal(product.Id, variant.ProductId);
        Assert.Contains(product.Variants, v => v.Id == variant.Id);
    }

    [Fact]
    public void AddVariant_LowerCaseSku_NormalizesToUpperCase()
    {
        var product = CreateProduct();

        var variant = product.AddVariant("  cam-m  ", new List<VariantAttribute> { new("Talla", "M") });

        Assert.Equal("CAM-M", variant.Sku);
    }

    [Fact]
    public void AddVariant_EmptySku_ThrowsArgumentException()
    {
        var product = CreateProduct();

        var exception = Assert.Throws<ArgumentException>(
            () => product.AddVariant("   ", new List<VariantAttribute> { new("Talla", "M") }));

        Assert.Equal("sku", exception.ParamName);
    }

    [Fact]
    public void AddVariant_RepeatedSkuInSameProduct_ThrowsInvalidOperationException()
    {
        var product = CreateProduct();
        product.AddVariant("CAM-M", new List<VariantAttribute> { new("Talla", "M") });

        Assert.Throws<InvalidOperationException>(
            () => product.AddVariant("cam-m", new List<VariantAttribute> { new("Talla", "L") }));

        Assert.Single(product.Variants);
    }

    [Fact]
    public void AddVariant_DeletedProduct_ThrowsInvalidOperationException()
    {
        var product = CreateProduct();
        product.Delete();

        Assert.Throws<InvalidOperationException>(
            () => product.AddVariant("CAM-M", new List<VariantAttribute> { new("Talla", "M") }));
    }

    [Fact]
    public void AddVariant_NoAttributes_ThrowsArgumentException()
    {
        var product = CreateProduct();

        Assert.Throws<ArgumentException>(() => product.AddVariant("CAM-M", new List<VariantAttribute>()));
    }

    [Fact]
    public void RemoveVariant_ExistingVariant_RemovesItFromProduct()
    {
        var product = CreateProduct();
        var variant = product.AddVariant("CAM-M", new List<VariantAttribute> { new("Talla", "M") });

        product.RemoveVariant(variant.Id);

        Assert.Empty(product.Variants);
    }

    [Fact]
    public void RemoveVariant_UnknownVariant_ThrowsInvalidOperationException()
    {
        var product = CreateProduct();

        Assert.Throws<InvalidOperationException>(() => product.RemoveVariant(Guid.NewGuid()));
    }

    [Fact]
    public void RemoveVariant_DeletedProduct_ThrowsInvalidOperationException()
    {
        var product = CreateProduct();
        var variant = product.AddVariant("CAM-M", new List<VariantAttribute> { new("Talla", "M") });
        product.Delete();

        Assert.Throws<InvalidOperationException>(() => product.RemoveVariant(variant.Id));
    }

    [Fact]
    public void Variants_ExposedAsReadOnly_MutableCastThrowsNotSupportedException()
    {
        var product = CreateProduct();
        var variants = (IList<ProductVariant>)product.Variants;

        Assert.Throws<NotSupportedException>(
            () => variants.Add(product.AddVariant("CAM-M", new List<VariantAttribute> { new("Talla", "M") })));
    }

    // --- Q-10 = C3 (ADR-0003): la variante es obligatoria solo para productos Fisicos ---

    [Fact]
    public void Constructor_PhysicalWithoutVariants_ThrowsArgumentException()
    {
        var exception = Assert.Throws<ArgumentException>(
            () => new Product("Camiseta", "Algodón", new Money(1m, "COP"), VendorId, ProductType.Physical));

        Assert.Equal("variants", exception.ParamName);
    }

    [Fact]
    public void Constructor_PhysicalWithEmptyVariantList_ThrowsArgumentException()
    {
        Assert.Throws<ArgumentException>(
            () => new Product(
                "Camiseta",
                "Algodón",
                new Money(1m, "COP"),
                VendorId,
                ProductType.Physical,
                new List<(string Sku, IEnumerable<VariantAttribute> Attributes)>()));
    }

    [Fact]
    public void Constructor_DigitalWithoutVariants_CreatesProductWithoutVariants()
    {
        var product = new Product("Ebook", "PDF", new Money(1m, "COP"), VendorId, ProductType.Digital);

        Assert.Empty(product.Variants);
        Assert.False(product.HasVariant);
        Assert.True(product.CanBeSold);
    }

    [Fact]
    public void Constructor_PhysicalWithVariants_CreatesProductWithVariant()
    {
        var product = CreatePhysicalProduct();

        Assert.Single(product.Variants);
        Assert.True(product.HasVariant);
        Assert.True(product.CanBeSold);
        Assert.All(product.Variants, variant => Assert.Equal(product.Id, variant.ProductId));
    }

    [Fact]
    public void Constructor_DigitalWithVariants_CreatesProductWithVariant()
    {
        var product = new Product(
            "Ebook",
            "PDF",
            new Money(1m, "COP"),
            VendorId,
            ProductType.Digital,
            new List<(string Sku, IEnumerable<VariantAttribute> Attributes)>
            {
                ("EBK-PRO", new List<VariantAttribute> { new("Edicion", "Pro") })
            });

        Assert.Single(product.Variants);
        Assert.True(product.CanBeSold);
    }

    [Fact]
    public void Constructor_PhysicalWithRepeatedSkuInSeeds_ThrowsInvalidOperationException()
    {
        var seeds = new List<(string Sku, IEnumerable<VariantAttribute> Attributes)>
        {
            ("CAM-M", new List<VariantAttribute> { new("Talla", "M") }),
            ("cam-m", new List<VariantAttribute> { new("Talla", "L") })
        };

        Assert.Throws<InvalidOperationException>(
            () => new Product("Camiseta", "Algodón", new Money(1m, "COP"), VendorId, ProductType.Physical, seeds));
    }

    [Fact]
    public void UpdateType_ProductWithoutVariantsToPhysical_ThrowsInvalidOperationException()
    {
        var product = CreateProduct(ProductType.Digital);

        Assert.Throws<InvalidOperationException>(() => product.UpdateType(ProductType.Physical));
        Assert.Equal(ProductType.Digital, product.Type);
    }

    [Fact]
    public void UpdateType_ProductWithVariantToPhysical_ReplacesType()
    {
        var product = CreateProduct(ProductType.Digital);
        product.AddVariant("CAM-M", new List<VariantAttribute> { new("Talla", "M") });

        product.UpdateType(ProductType.Physical);

        Assert.Equal(ProductType.Physical, product.Type);
        Assert.True(product.CanBeSold);
    }

    [Fact]
    public void RemoveVariant_LastVariantOfPhysicalProduct_ThrowsInvalidOperationException()
    {
        var product = CreatePhysicalProduct();
        var variantId = product.Variants.First().Id;

        Assert.Throws<InvalidOperationException>(() => product.RemoveVariant(variantId));
        Assert.Single(product.Variants);
    }

    [Fact]
    public void RemoveVariant_NonLastVariantOfPhysicalProduct_RemovesOnlyThatVariant()
    {
        var product = CreatePhysicalProduct();
        var firstVariantId = product.Variants.First().Id;
        product.AddVariant("CAM-L", new List<VariantAttribute> { new("Talla", "L") });

        product.RemoveVariant(firstVariantId);

        Assert.Single(product.Variants);
        Assert.Equal("CAM-L", product.Variants.First().Sku);
    }

    [Fact]
    public void RemoveVariant_LastVariantOfDigitalProduct_RemovesIt()
    {
        var product = CreateProduct(ProductType.Digital);
        var variant = product.AddVariant("EBK-PRO", new List<VariantAttribute> { new("Edicion", "Pro") });

        product.RemoveVariant(variant.Id);

        Assert.Empty(product.Variants);
        Assert.True(product.CanBeSold);
    }

    [Fact]
    public void HasVariant_PhysicalProductWithDeletedVariant_ReturnsFalse()
    {
        var product = CreatePhysicalProduct();

        product.Variants.First().Delete();

        Assert.False(product.HasVariant);
    }

    [Fact]
    public void CanBeSold_PhysicalProductWithDeletedOnlyVariant_ReturnsFalse()
    {
        var product = CreatePhysicalProduct();

        product.Variants.First().Delete();

        Assert.False(product.CanBeSold);
    }

    [Fact]
    public void CanBeSold_PhysicalProductWithDeactivatedVariant_ReturnsFalse()
    {
        var product = CreatePhysicalProduct();

        product.Variants.First().Deactivate();

        Assert.True(product.HasVariant);
        Assert.False(product.CanBeSold);
    }
}






