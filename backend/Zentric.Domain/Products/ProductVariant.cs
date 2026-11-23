using Zentric.Domain.Products.ValueObjects;

namespace Zentric.Domain.Products
{
    /// <summary>
    /// Entidad hija del agregado <see cref="Product"/>. Representa la combinación
    /// vendible del producto (ej. Talla/Color) y su <see cref="Id"/> actúa como
    /// VariantId (SKU) que identifica el stock en el inventario.
    /// Referencia: AD.
    /// La vía prevista de creación es <see cref="Product.AddVariant"/>: el agregado
    /// controla el ciclo de vida de sus variantes.
    /// </summary>
    public sealed class ProductVariant
    {
        public Guid Id { get; init; } // VariantId: clave del inventario (SKU)
        public Guid ProductId { get; private set; }
        public string Sku { get; private set; }
        public decimal? PriceAmount { get; private set; }
        public bool IsActive { get; private set; }
        public DateTime CreatedAt { get; private set; }
        public DateTime UpdatedAt { get; private set; }
        public DateTime? DeletedAt { get; private set; }

        public bool IsDeleted => DeletedAt.HasValue;
        public bool CanBeSold => IsActive && !IsDeleted;

        private readonly List<VariantAttribute> _attributes = new();

        // Expone los atributos como solo lectura para no romper la invariante
        // desde fuera del agregado.
        public IReadOnlyCollection<VariantAttribute> Attributes => _attributes.AsReadOnly();

        private ProductVariant()
        {
            // For EF Core
            Sku = null!;
        }

        public ProductVariant(Guid productId, string sku, IEnumerable<VariantAttribute> attributes, decimal? priceAmount = null)
        {
            if (productId == Guid.Empty)
            {
                throw new ArgumentException("La variante debe pertenecer a un producto.", nameof(productId));
            }

            if (string.IsNullOrWhiteSpace(sku))
            {
                throw new ArgumentException("El SKU de la variante es obligatorio.", nameof(sku));
            }

            if (priceAmount.HasValue && priceAmount.Value <= 0)
            {
                throw new ArgumentException("El precio de la variante debe ser positivo cuando se especifica.", nameof(priceAmount));
            }

            ArgumentNullException.ThrowIfNull(attributes);

            var attributeList = ValidateAttributes(attributes);

            Id = Guid.NewGuid();
            ProductId = productId;
            Sku = sku.Trim().ToUpperInvariant();
            PriceAmount = priceAmount;
            _attributes.AddRange(attributeList);
            IsActive = true;
            CreatedAt = DateTime.UtcNow;
            UpdatedAt = CreatedAt;
            DeletedAt = null;
        }

        public void SetPrice(decimal? priceAmount)
        {
            if (IsDeleted)
            {
                throw new InvalidOperationException("No se puede actualizar el precio de una variante eliminada.");
            }

            if (priceAmount.HasValue && priceAmount.Value <= 0)
            {
                throw new ArgumentException("El precio de la variante debe ser positivo cuando se especifica.", nameof(priceAmount));
            }

            PriceAmount = priceAmount;
            UpdatedAt = DateTime.UtcNow;
        }

        private static List<VariantAttribute> ValidateAttributes(IEnumerable<VariantAttribute> attributes)
        {
            var attributeList = attributes.ToList();

            if (attributeList.Count == 0)
            {
                throw new ArgumentException("Una variante debe declarar al menos un atributo.", nameof(attributes));
            }

            if (attributeList.Any(attribute => attribute is null))
            {
                throw new ArgumentException("Los atributos de la variante no pueden contener entradas nulas.", nameof(attributes));
            }

            if (attributeList.Select(attribute => attribute.Name).Distinct(StringComparer.OrdinalIgnoreCase).Count()
                != attributeList.Count)
            {
                throw new ArgumentException("Una variante no puede repetir el mismo nombre de atributo.", nameof(attributes));
            }

            return attributeList;
        }

        public void UpdateSku(string newSku)
        {
            if (IsDeleted)
            {
                throw new InvalidOperationException("No se puede actualizar el SKU de una variante eliminada.");
            }

            if (string.IsNullOrWhiteSpace(newSku))
            {
                throw new ArgumentException("El SKU de la variante es obligatorio.", nameof(newSku));
            }

            Sku = newSku.Trim().ToUpperInvariant();
            UpdatedAt = DateTime.UtcNow;
        }

        public void UpdateAttributes(IEnumerable<VariantAttribute> attributes)
        {
            if (IsDeleted)
            {
                throw new InvalidOperationException("No se pueden actualizar los atributos de una variante eliminada.");
            }

            ArgumentNullException.ThrowIfNull(attributes);

            var attributeList = ValidateAttributes(attributes);

            _attributes.Clear();
            _attributes.AddRange(attributeList);
            UpdatedAt = DateTime.UtcNow;
        }

        public void Activate()
        {
            if (IsDeleted)
            {
                throw new InvalidOperationException("No se puede activar una variante eliminada.");
            }

            if (IsActive)
            {
                throw new InvalidOperationException("La variante ya está activa.");
            }

            IsActive = true;
            UpdatedAt = DateTime.UtcNow;
        }

        public void Deactivate()
        {
            if (IsDeleted)
            {
                throw new InvalidOperationException("No se puede desactivar una variante eliminada.");
            }

            if (!IsActive)
            {
                throw new InvalidOperationException("La variante ya está inactiva.");
            }

            IsActive = false;
            UpdatedAt = DateTime.UtcNow;
        }

        public void Delete()
        {
            if (IsDeleted)
            {
                throw new InvalidOperationException("La variante ya está eliminada.");
            }

            DeletedAt = DateTime.UtcNow;
            IsActive = false;
            UpdatedAt = DeletedAt.Value;
        }

        public void Restore()
        {
            if (!IsDeleted)
            {
                throw new InvalidOperationException("La variante no está eliminada.");
            }

            DeletedAt = null;
            IsActive = true;
            UpdatedAt = DateTime.UtcNow;
        }
    }
}
