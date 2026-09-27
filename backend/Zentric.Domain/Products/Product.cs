using Zentric.Domain.Products.Enums;
using Zentric.Domain.Products.ValueObjects;

namespace Zentric.Domain.Products
{
    public sealed class Product
    {
        public Guid Id { get; init; }
        public Guid VendorId { get; private set; } // INIT?
        public string Name { get; private set; }
        public string Description { get; private set; }
        public Money Price { get; private set; }
        public ProductType Type { get; private set; }
        public ProductStatus Status { get; private set; }
        public DateTime CreatedAt { get; private set; }
        public DateTime UpdatedAt { get; private set; }
        public DateTime? DeletedAt { get; private set; }

        public bool IsDeleted => DeletedAt.HasValue;

        //! IA: Q-10 = C3 (ADR-0003): un producto Fisico siempre tiene al menos una
        // variante; los Digitales (CAT-02: sin logistica ni inventario) pueden no tenerla.
        public bool HasVariant => _variants.Any(variant => !variant.IsDeleted);

        public bool HasSellableVariant => _variants.Any(variant => variant.CanBeSold);

        public bool CanBeSold =>
            Status == ProductStatus.Published
            && !IsDeleted
            && (Type == ProductType.Digital || HasSellableVariant);

        //! IA: el agregado controla el ciclo de vida de sus variantes; se expone
        // como solo lectura para que nadie mute la coleccion desde fuera.
        private readonly List<ProductVariant> _variants = new();

        public IReadOnlyCollection<ProductVariant> Variants => _variants.AsReadOnly();

        private Product()
        {
            Name = null!;
            Description = null!;
            Price = null!;
        }

        /// <summary>
        /// Crea el producto. Segun Q-10 = C3 (ADR-0003) un producto
        /// <see cref="ProductType.Physical"/> exige al menos una variante; un
        /// <see cref="ProductType.Digital"/> puede nacer sin ninguna.
        /// Cada semilla se compone del SKU y de sus atributos, con la misma forma que
        /// <see cref="AddVariant"/>, para no introducir tipos nuevos en el dominio.
        /// </summary>
        public Product(
            string name,
            string description,
            Money price,
            Guid vendorId,
            ProductType type,
            IEnumerable<(string Sku, IEnumerable<VariantAttribute> Attributes)>? variants = null)
        {
            if (string.IsNullOrWhiteSpace(name))
            {
                throw new ArgumentException("Product name cannot be empty.", nameof(name));
            }

            if (string.IsNullOrWhiteSpace(description))
            {
                throw new ArgumentException("Product description cannot be empty.", nameof(description));
            }

            if (vendorId == Guid.Empty)
            {
                throw new ArgumentException("The product must belong to a vendor.", nameof(vendorId));
            }
            if (!Enum.IsDefined(typeof(ProductType), type))
            {
                throw new ArgumentOutOfRangeException(nameof(type), "Invalid product type.");
            }

            ArgumentNullException.ThrowIfNull(price);

            var variantSeeds = variants?.ToList()
                ?? new List<(string Sku, IEnumerable<VariantAttribute> Attributes)>();

            //! IA: Q-10 = C3 (ADR-0003). Un producto Fisico no puede existir sin variante
            // porque la variante es la unidad de stock (INV-03): sin ella no hay inventario
            // ni reserva posible, y ese estado bloqueaba al InventoryReservationService.
            if (type == ProductType.Physical && variantSeeds.Count == 0)
            {
                throw new ArgumentException("A physical product requires at least one variant.", nameof(variants));
            }

            Id = Guid.NewGuid();
            VendorId = vendorId;
            Name = name.Trim();
            Description = description.Trim();
            Price = price;
            Type = type;
            Status = ProductStatus.Published;
            CreatedAt = DateTime.UtcNow;
            UpdatedAt = CreatedAt;
            DeletedAt = null;

            foreach (var seed in variantSeeds)
            {
                AddVariant(seed.Sku, seed.Attributes);
            }
        }

        /// <summary>
        /// Crea y agrega una variante (SKU) al producto. El VariantId resultante es
        /// la clave con la que el inventario identifica el stock.
        /// Referencia: backendSDD/Domain/02-aggregates-and-entities.md, sección 2 y ADR-0002.
        /// </summary>
        public ProductVariant AddVariant(string sku, IEnumerable<VariantAttribute> attributes)
        {
            if (IsDeleted)
            {
                throw new InvalidOperationException("Cannot add variants to a deleted product.");
            }

            if (string.IsNullOrWhiteSpace(sku))
            {
                throw new ArgumentException("Variant SKU is required.", nameof(sku));
            }

            var normalizedSku = sku.Trim().ToUpperInvariant();

            //! IA: el SKU identifica el stock (ADR-0002), por lo que no puede repetirse
            // dentro del mismo producto (frontera de consistencia del agregado).
            if (_variants.Any(variant => string.Equals(variant.Sku, normalizedSku, StringComparison.OrdinalIgnoreCase)))
            {
                throw new InvalidOperationException($"The product already has a variant with SKU '{normalizedSku}'.");
            }

            var variant = new ProductVariant(Id, normalizedSku, attributes);

            _variants.Add(variant);
            UpdatedAt = DateTime.UtcNow;

            return variant;
        }

        public void RemoveVariant(Guid variantId)
        {
            if (IsDeleted)
            {
                throw new InvalidOperationException("Cannot remove variants from a deleted product.");
            }

            var variant = _variants.SingleOrDefault(variant => variant.Id == variantId);

            if (variant is null)
            {
                throw new InvalidOperationException("Variant not found in this product.");
            }

            //! IA: Q-10 = C3 (ADR-0003): un producto Fisico no puede quedarse sin variantes.
            if (Type == ProductType.Physical
                && _variants.Count(v => !v.IsDeleted && v.Id != variantId) == 0)
            {
                throw new InvalidOperationException("A physical product must keep at least one variant.");
            }

            _variants.Remove(variant);
            UpdatedAt = DateTime.UtcNow;
        }

        public void Update(string name, string description, Money price)
        {
            if (IsDeleted)
            {
                throw new InvalidOperationException("Cannot update a deleted product.");
            }

            if (string.IsNullOrWhiteSpace(name))
            {
                throw new ArgumentException("Product name cannot be empty.", nameof(name));
            }

            if (string.IsNullOrWhiteSpace(description))
            {
                throw new ArgumentException("Product description cannot be empty.", nameof(description));
            }

            ArgumentNullException.ThrowIfNull(price);

            Name = name.Trim();
            Description = description.Trim();
            Price = price;
            UpdatedAt = DateTime.UtcNow;

            // TODO: Domain event ProductUpdated
        }

        public void UpdatePrice(Money newPrice)
        {
            if (IsDeleted)
            {
                throw new InvalidOperationException("Cannot update the price of a deleted product.");
            }

            ArgumentNullException.ThrowIfNull(newPrice);

            Price = newPrice;
            UpdatedAt = DateTime.UtcNow;

            // TODO: Domain event ProductPriceUpdated
        }

        public void UpdateType(ProductType newType)
        {
            if (IsDeleted)
            {
                throw new InvalidOperationException("Cannot update the type of a deleted product.");
            }

            if (!Enum.IsDefined(typeof(ProductType), newType))
            {
                throw new ArgumentOutOfRangeException(nameof(newType), "Invalid product type.");
            }

            //! IA: Q-10 = C3 (ADR-0003): un producto no puede convertirse en Fisico si no
            // tiene variantes, porque quedaria sin unidad de stock.
            if (newType == ProductType.Physical && !HasVariant)
            {
                throw new InvalidOperationException("A physical product requires at least one variant.");
            }

            Type = newType;
            UpdatedAt = DateTime.UtcNow;
        }
        
        public void UpdateName(string newName)
        {
            if (IsDeleted)
            {
                throw new InvalidOperationException("Cannot update the name of a deleted product.");
            }

            if (string.IsNullOrWhiteSpace(newName))
            {
                throw new ArgumentException("Product name cannot be empty.", nameof(newName));
            }

            Name = newName.Trim();
            UpdatedAt = DateTime.UtcNow;

            // TODO: Domain event ProductNameUpdated
        }

        public void UpdateDescription(string newDescription)
        {
            if (IsDeleted)
            {
                throw new InvalidOperationException("Cannot update the description of a deleted product.");
            }

            if (string.IsNullOrWhiteSpace(newDescription))
            {
                throw new ArgumentException("Product description cannot be empty.", nameof(newDescription));
            }

            Description = newDescription.Trim();
            UpdatedAt = DateTime.UtcNow;

            // TODO: Domain event ProductDescriptionUpdated
        }

        public void Publish()
        {
            if (IsDeleted)
            {
                throw new InvalidOperationException("Cannot publish a deleted product.");
            }

            if (Status == ProductStatus.Published)
            {
                throw new InvalidOperationException("Product is already published.");
            }

            Status = ProductStatus.Published;
            UpdatedAt = DateTime.UtcNow;

            // TODO: Domain event ProductPublished
        }

        public void Suspend()
        {
            if (IsDeleted)
            {
                throw new InvalidOperationException("Cannot suspend a deleted product.");
            }

            if (Status == ProductStatus.Suspended)
            {
                throw new InvalidOperationException("Product is already suspended.");
            }

            Status = ProductStatus.Suspended;
            UpdatedAt = DateTime.UtcNow;

            // TODO: Domain event ProductSuspended
        }

        public void Delete()
        {
            if (IsDeleted)
            {
                throw new InvalidOperationException("Product is already deleted.");
            }

            DeletedAt = DateTime.UtcNow;
            Status = ProductStatus.Discontinued;
            UpdatedAt = DeletedAt.Value;

            // TODO: Domain event ProductDeleted
        }

        public void Restore()
        {
            if (!IsDeleted)
            {
                throw new InvalidOperationException("Product is not deleted.");
            }

            DeletedAt = null;
            Status = ProductStatus.Published;
            UpdatedAt = DateTime.UtcNow;

            // TODO: Domain event ProductRestored
        }
    }
}

