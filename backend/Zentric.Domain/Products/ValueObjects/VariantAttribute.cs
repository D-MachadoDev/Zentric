namespace Zentric.Domain.Products.ValueObjects
{
    /// <summary>
    /// Value Object inmutable que representa un atributo de una variante de producto
    /// (ej. Talla = "M", Color = "Rojo", Modelo = "Pro 2024").
    ///
    /// El nombre y el valor son
    /// texto libre, obligatorios, con un maximo de 50 caracteres. No se usa un
    /// catalogo cerrado porque la Ley no lo define y cada vendedor comercializa
    /// atributos distintos.
    /// </summary>
    public sealed class VariantAttribute : IEquatable<VariantAttribute>
    {
        public string Name { get; private set; }
        public string Value { get; private set; }

        private VariantAttribute() { Name = ""; Value = ""; }

        public VariantAttribute(string name, string value)
        {
            Name = Normalize(name, nameof(name));
            Value = Normalize(value, nameof(value));
        }

        public bool Equals(VariantAttribute? other)
        {
            if (other is null)
            {
                return false;
            }

            return string.Equals(Name, other.Name, StringComparison.OrdinalIgnoreCase)
                && string.Equals(Value, other.Value, StringComparison.OrdinalIgnoreCase);
        }

        public override bool Equals(object? obj)
        {
            return obj is VariantAttribute other && Equals(other);
        }

        public override int GetHashCode()
        {
            return HashCode.Combine(
                StringComparer.OrdinalIgnoreCase.GetHashCode(Name),
                StringComparer.OrdinalIgnoreCase.GetHashCode(Value));
        }

        public override string ToString()
        {
            return $"{Name}={Value}";
        }

        private static string Normalize(string value, string paramName)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                throw new ArgumentException("Variant attribute name and value are required.", paramName);
            }

            var normalized = value.Trim();

            // Maximo de 50 caracteres por nombre y
            // valor, y ambos son obligatorios.
            if (normalized.Length > 50)
            {
                throw new ArgumentException("Variant attribute name and value cannot exceed 50 characters.", paramName);
            }

            return normalized;
        }
    }
}
