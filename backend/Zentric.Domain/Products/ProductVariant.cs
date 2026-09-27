using Zentric.Domain.Products.ValueObjects;

namespace Zentric.Domain.Products
{
    /// <summary>
    /// Entidad hija del agregado <see cref="Product"/>. Representa la combinación
    /// vendible del producto (ej. Talla/Color) y su <see cref="Id"/> actúa como
    /// VariantId (SKU) que identifica el stock en el inventario.
    /// Referencia: backendSDD/Domain/02-aggregates-and-entities.md, sección 2,
    /// backendSDD/Domain/03-value-objects.md (Identificadores fuertemente tipados) y
    /// backendSDD/Adr/0002-clave-inventario-variantid.md.
    /// La vía prevista de creación es <see cref="Product.AddVariant"/>: el agregado
    /// controla el ciclo de vida de sus variantes.
    /// </summary>
    public sealed class ProductVariant
    {
        public Guid Id { get; init; } // VariantId: clave del inventario (SKU)
        public Guid ProductId { get; private set; }
        public string Sku { get; private set; }
        public bool IsActive { get; private set; }
        public DateTime CreatedAt { get; private set; }
        public DateTime UpdatedAt { get; private set; }
        public DateTime? DeletedAt { get; private set; }

        public bool IsDeleted => DeletedAt.HasValue;
        public bool CanBeSold => IsActive && !IsDeleted;

        private readonly List<VariantAttribute> _attributes = new();

        //! IA: expone los atributos como solo lectura para no romper la invariante
        // desde fuera del agregado.
        public IReadOnlyCollection<VariantAttribute> Attributes => _attributes.AsReadOnly();

        private ProductVariant()
        {
            // For EF Core
            Sku = null!;
        }

        public ProductVariant(Guid productId, string sku, IEnumerable<VariantAttribute> attributes)
        {
            if (productId == Guid.Empty)
            {
                throw new ArgumentException("The variant must belong to a product.", nameof(productId));
            }

            if (string.IsNullOrWhiteSpace(sku))
            {
                throw new ArgumentException("Variant SKU is required.", nameof(sku));
            }

            ArgumentNullException.ThrowIfNull(attributes);

            var attributeList = ValidateAttributes(attributes);

            Id = Guid.NewGuid();
            ProductId = productId;
            Sku = sku.Trim().ToUpperInvariant();
            _attributes.AddRange(attributeList);
            IsActive = true;
            CreatedAt = DateTime.UtcNow;
            UpdatedAt = CreatedAt;
            DeletedAt = null;
        }

        private static List<VariantAttribute> ValidateAttributes(IEnumerable<VariantAttribute> attributes)
        {
            var attributeList = attributes.ToList();

            if (attributeList.Count == 0)
            {
                throw new ArgumentException("A variant must declare at least one attribute.", nameof(attributes));
            }

            if (attributeList.Any(attribute => attribute is null))
            {
                throw new ArgumentException("Variant attributes cannot contain null entries.", nameof(attributes));
            }

            if (attributeList.Select(attribute => attribute.Name).Distinct(StringComparer.OrdinalIgnoreCase).Count()
                != attributeList.Count)
            {
                throw new ArgumentException("A variant cannot repeat the same attribute name.", nameof(attributes));
            }

            return attributeList;
        }

        public void UpdateSku(string newSku)
        {
            if (IsDeleted)
            {
                throw new InvalidOperationException("Cannot update the SKU of a deleted variant.");
            }

            if (string.IsNullOrWhiteSpace(newSku))
            {
                throw new ArgumentException("Variant SKU is required.", nameof(newSku));
            }

            Sku = newSku.Trim().ToUpperInvariant();
            UpdatedAt = DateTime.UtcNow;
        }

        public void UpdateAttributes(IEnumerable<VariantAttribute> attributes)
        {
            if (IsDeleted)
            {
                throw new InvalidOperationException("Cannot update the attributes of a deleted variant.");
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
                throw new InvalidOperationException("Cannot activate a deleted variant.");
            }

            if (IsActive)
            {
                throw new InvalidOperationException("Variant is already active.");
            }

            IsActive = true;
            UpdatedAt = DateTime.UtcNow;
        }

        public void Deactivate()
        {
            if (IsDeleted)
            {
                throw new InvalidOperationException("Cannot deactivate a deleted variant.");
            }

            if (!IsActive)
            {
                throw new InvalidOperationException("Variant is already inactive.");
            }

            IsActive = false;
            UpdatedAt = DateTime.UtcNow;
        }

        public void Delete()
        {
            if (IsDeleted)
            {
                throw new InvalidOperationException("Variant is already deleted.");
            }

            DeletedAt = DateTime.UtcNow;
            IsActive = false;
            UpdatedAt = DeletedAt.Value;
        }

        public void Restore()
        {
            if (!IsDeleted)
            {
                throw new InvalidOperationException("Variant is not deleted.");
            }

            DeletedAt = null;
            IsActive = true;
            UpdatedAt = DateTime.UtcNow;
        }
    }
}