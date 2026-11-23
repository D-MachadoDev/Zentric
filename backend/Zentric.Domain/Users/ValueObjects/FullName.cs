namespace Zentric.Domain.Users.ValueObjects
{
    public sealed class FullName : IEquatable<FullName>
    {
        public string FirstName { get; private set; }
        public string LastName { get; private set; }

        private FullName() { FirstName = ""; LastName = ""; }

        public FullName(string firstName, string lastName)
        {
            FirstName = NormalizeNamePart(firstName, nameof(firstName), "El nombre");
            LastName = NormalizeNamePart(lastName, nameof(lastName), "El apellido");
        }

        public FullName(string fullName)
        {
            if (string.IsNullOrWhiteSpace(fullName))
            {
                throw new ArgumentException("El nombre completo no puede estar vacío.", nameof(fullName));
            }

            var parts = fullName.Trim()
                .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

            // Empresas o tiendas pueden tener un nombre de una sola palabra.
            if (parts.Length == 1)
            {
                FirstName = NormalizeNamePart(parts[0], nameof(fullName), "El nombre");
                LastName = "";
                return;
            }

            FirstName = NormalizeNamePart(parts[0], nameof(fullName), "El nombre");
            LastName = NormalizeNamePart(string.Join(" ", parts.Skip(1)), nameof(fullName), "El apellido");
        }

        public string Value => string.IsNullOrEmpty(LastName) ? FirstName : $"{FirstName} {LastName}";

        public bool Equals(FullName? other)
        {
            if (other is null)
            {
                return false;
            }

            return string.Equals(FirstName, other.FirstName, StringComparison.OrdinalIgnoreCase)
                && string.Equals(LastName, other.LastName, StringComparison.OrdinalIgnoreCase);
        }

        public override bool Equals(object? obj)
        {
            return obj is FullName other && Equals(other);
        }

        public override int GetHashCode()
        {
            return HashCode.Combine(
                StringComparer.OrdinalIgnoreCase.GetHashCode(FirstName),
                StringComparer.OrdinalIgnoreCase.GetHashCode(LastName));
        }

        public override string ToString()
        {
            return Value;
        }

        private static string NormalizeNamePart(string value, string paramName, string label)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                throw new ArgumentException($"{label} no puede estar vacío.", paramName);
            }

            var normalized = value.Trim();

            if (normalized.Length < 2)
            {
                throw new ArgumentException($"{label} es demasiado corto.", paramName);
            }

            if (normalized.Length > 80)
            {
                throw new ArgumentException($"{label} es demasiado largo.", paramName);
            }

            if (normalized.Any(char.IsDigit))
            {
                throw new ArgumentException($"{label} no puede contener números.", paramName);
            }

            return char.ToUpperInvariant(normalized[0]) + normalized.Substring(1).ToLowerInvariant();
        }
    }
}
