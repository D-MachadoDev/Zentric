namespace Zentric.Domain.Products.ValueObjects
{
    /// <summary>
    /// Value Object inmutable que representa un atributo de una variante de producto
    /// (ej. Talla = "M", Color = "Rojo", Modelo = "Pro 2024").
    /// Referencia: backendSDD/Domain/01-models.md, sección 2 y
    /// backendSDD/Domain/02-aggregates-and-entities.md, sección 2 (la variante "maneja las combinaciones").
    /// [PROPUESTO] ADR-0002: el detalle del modelo de atributos está pendiente de
    /// confirmación del owner (Q-11 en backendSDD/00-bootstrap/questions-for-owner.md).
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

        //! IA: C# lo exige al sobrescribir Equals y lo usa en HashSet/Dictionary.
        public override bool Equals(object? obj)
        {
            return obj is VariantAttribute other && Equals(other);
        }

        //! IA: C# lo usa para agrupar en colecciones basadas en hash.
        public override int GetHashCode()
        {
            return HashCode.Combine(
                StringComparer.OrdinalIgnoreCase.GetHashCode(Name),
                StringComparer.OrdinalIgnoreCase.GetHashCode(Value));
        }

        //! IA: C# lo usa al imprimir el objeto.
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

            //! IA: límite defensivo propuesto (no definido en la spec) — ver Q-11.
            if (normalized.Length > 50)
            {
                throw new ArgumentException("Variant attribute name and value cannot exceed 50 characters.", paramName);
            }

            return normalized;
        }
    }
}
