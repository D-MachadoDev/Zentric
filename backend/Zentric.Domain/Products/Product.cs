using Zentric.Domain.Products.Enums;
using Zentric.Domain.Products.ValueObjects;

namespace Zentric.Domain.Products
{
    public sealed class Product
    {
        public Guid Id { get; init; }
        public Guid VendorId { get; private set; }
        public string Name { get; private set; }
        public string Description { get; private set; }
        public Money Price { get; private set; }
        public ProductType Type { get; private set; }
        public ProductStatus Status { get; private set; }
        public string? ImageUrl { get; private set; }
        public string? Category { get; private set; }
        public string? DigitalDownloadUrl { get; private set; }
        public decimal AverageRating { get; private set; }
        public int ReviewsCount { get; private set; }
        public DateTime CreatedAt { get; private set; }
        public DateTime UpdatedAt { get; private set; }
        public DateTime? DeletedAt { get; private set; }

        public bool IsDeleted => DeletedAt.HasValue;

        // Un producto físico siempre tiene al menos una variante; los digitales
        // (sin logística ni inventario) pueden no tenerla.
        public bool HasVariant => _variants.Any(variant => !variant.IsDeleted);

        public bool HasSellableVariant => _variants.Any(variant => variant.CanBeSold);

        public bool CanBeSold =>
            Status == ProductStatus.Published
            && !IsDeleted
            && (Type == ProductType.Digital || HasSellableVariant);

        // El agregado controla el ciclo de vida de sus variantes; se expone
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
        /// Crea el producto. Un producto
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
            IEnumerable<(string Sku, IEnumerable<VariantAttribute> Attributes)>? variants = null,
            string? imageUrl = null,
            string? category = null,
            string? digitalDownloadUrl = null)
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

            // El enlace de descarga solo tiene sentido en productos digitales y,
            // cuando se informa, debe ser una URL absoluta http(s): es lo que se
            // envia por correo al comprador tras el pago.
            if (!string.IsNullOrWhiteSpace(digitalDownloadUrl)
                && !IsAbsoluteHttpUrl(digitalDownloadUrl))
            {
                throw new ArgumentException(
                    "Digital download URL must be an absolute http(s) URL.",
                    nameof(digitalDownloadUrl));
            }

            var variantSeeds = variants?.ToList()
                ?? new List<(string Sku, IEnumerable<VariantAttribute> Attributes)>();

            // Un producto fisico no puede existir sin variante
            // porque la variante es la unidad de stock: sin ella no hay inventario
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
            ImageUrl = string.IsNullOrWhiteSpace(imageUrl) ? null : imageUrl.Trim();
            Category = string.IsNullOrWhiteSpace(category) ? null : category.Trim();
            DigitalDownloadUrl = string.IsNullOrWhiteSpace(digitalDownloadUrl) ? null : digitalDownloadUrl.Trim();
            AverageRating = 0m;
            ReviewsCount = 0;
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
        /// Referencia: clave de inventario por variante.
        /// </summary>
        public ProductVariant AddVariant(string sku, IEnumerable<VariantAttribute> attributes, decimal? priceAmount = null)
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

            // El SKU identifica el stock, por lo que no puede repetirse
            // dentro del mismo producto (frontera de consistencia del agregado).
            if (_variants.Any(variant => string.Equals(variant.Sku, normalizedSku, StringComparison.OrdinalIgnoreCase)))
            {
                throw new InvalidOperationException($"The product already has a variant with SKU '{normalizedSku}'.");
            }

            var variant = new ProductVariant(Id, normalizedSku, attributes, priceAmount);

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

            // Un producto fisico no puede quedarse sin variantes.
            if (Type == ProductType.Physical
                && _variants.Count(v => !v.IsDeleted && v.Id != variantId) == 0)
            {
                throw new InvalidOperationException("A physical product must keep at least one variant.");
            }

            _variants.Remove(variant);
            UpdatedAt = DateTime.UtcNow;
        }

        public void Update(string name, string description, Money price, string? imageUrl = null, string? category = null)
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
            if (imageUrl != null)
            {
                ImageUrl = string.IsNullOrWhiteSpace(imageUrl) ? null : imageUrl.Trim();
            }
            if (category != null)
            {
                Category = string.IsNullOrWhiteSpace(category) ? null : category.Trim();
            }
            UpdatedAt = DateTime.UtcNow;
        }

        public void UpdateCategory(string? category)
        {
            if (IsDeleted)
            {
                throw new InvalidOperationException("Cannot update category of a deleted product.");
            }

            Category = string.IsNullOrWhiteSpace(category) ? null : category.Trim();
            UpdatedAt = DateTime.UtcNow;
        }

        public void UpdateImageUrl(string? imageUrl)
        {
            if (IsDeleted)
            {
                throw new InvalidOperationException("Cannot update image of a deleted product.");
            }

            ImageUrl = string.IsNullOrWhiteSpace(imageUrl) ? null : imageUrl.Trim();
            UpdatedAt = DateTime.UtcNow;
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

            // Un producto no puede convertirse en fisico si no
            // tiene variantes, porque quedaria sin unidad de stock.
            if (newType == ProductType.Physical && !HasVariant)
            {
                throw new InvalidOperationException("A physical product requires at least one variant.");
            }

            Type = newType;
            UpdatedAt = DateTime.UtcNow;
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
        }

        /// <summary>
        /// Asigna y sincroniza explícitamente las métricas de calificación del producto (promedio y conteo de reseñas).
        /// </summary>
        public void SetRatingMetrics(decimal averageRating, int reviewsCount)
        {
            if (averageRating < 0 || averageRating > 5)
            {
                throw new ArgumentOutOfRangeException(nameof(averageRating), "Average rating must be between 0 and 5.");
            }

            if (reviewsCount < 0)
            {
                throw new ArgumentOutOfRangeException(nameof(reviewsCount), "Reviews count cannot be negative.");
            }

            AverageRating = Math.Round(averageRating, 2, MidpointRounding.AwayFromZero);
            ReviewsCount = reviewsCount;
            UpdatedAt = DateTime.UtcNow;
        }

        /// <summary>
        /// Aplica una calificación al producto de forma atómica.
        /// Si oldRating es null, se trata de una nueva reseña (incrementa ReviewsCount).
        /// Si oldRating tiene valor, es una actualización de calificación previa (conserva ReviewsCount).
        /// </summary>
        public void ApplyReview(int newRating, int? oldRating = null)
        {
            if (newRating < 1 || newRating > 5)
            {
                throw new ArgumentOutOfRangeException(nameof(newRating), "Rating must be between 1 and 5.");
            }

            if (oldRating.HasValue)
            {
                if (oldRating.Value < 1 || oldRating.Value > 5)
                {
                    throw new ArgumentOutOfRangeException(nameof(oldRating), "Old rating must be between 1 and 5.");
                }

                if (ReviewsCount <= 0)
                {
                    ReviewsCount = 1;
                }

                var totalScore = (AverageRating * ReviewsCount) - oldRating.Value + newRating;
                AverageRating = Math.Round(totalScore / ReviewsCount, 2, MidpointRounding.AwayFromZero);
            }
            else
            {
                var totalScore = (AverageRating * ReviewsCount) + newRating;
                ReviewsCount++;
                AverageRating = Math.Round(totalScore / ReviewsCount, 2, MidpointRounding.AwayFromZero);
            }

            UpdatedAt = DateTime.UtcNow;
        }

        /// <summary>
        /// Remueve una calificación previa recalculando el promedio atómicamente.
        /// </summary>
        public void RemoveReview(int rating)
        {
            if (rating < 1 || rating > 5)
            {
                throw new ArgumentOutOfRangeException(nameof(rating), "Rating must be between 1 and 5.");
            }

            if (ReviewsCount <= 1)
            {
                ReviewsCount = 0;
                AverageRating = 0m;
            }
            else
            {
                var totalScore = (AverageRating * ReviewsCount) - rating;
                ReviewsCount--;
                AverageRating = Math.Round(totalScore / ReviewsCount, 2, MidpointRounding.AwayFromZero);
            }

            UpdatedAt = DateTime.UtcNow;
        }

        private static bool IsAbsoluteHttpUrl(string url)
        {
            return Uri.TryCreate(url, UriKind.Absolute, out var uri)
                && (string.Equals(uri.Scheme, Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase)
                    || string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase));
        }
    }
}
