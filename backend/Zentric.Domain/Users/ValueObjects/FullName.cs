namespace Zentric.Domain.Users.ValueObjects
{
    public sealed class FullName : IEquatable<FullName>
    {
        public string FirstName { get; private set; }
        public string LastName { get; private set; }

        private FullName() { FirstName = ""; LastName = ""; }

        public FullName(string firstName, string lastName)
        {
            FirstName = NormalizeNamePart(firstName, "first name");
            LastName = NormalizeNamePart(lastName, "last name");
        }

        public FullName(string fullName)
        {
            if (string.IsNullOrWhiteSpace(fullName))
            {
                throw new ArgumentException("Full name cannot be empty.", nameof(fullName));
            }

            var parts = fullName.Trim()
                .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

            if (parts.Length < 2)
            {
                throw new ArgumentException("Full name must include first name and last name.", nameof(fullName));
            }

            FirstName = NormalizeNamePart(parts[0], "first name");
            LastName = NormalizeNamePart(string.Join(" ", parts.Skip(1)), "last name");
        }

        public string Value => $"{FirstName} {LastName}";

        public bool Equals(FullName? other)
        {
            if (other is null)
            {
                return false;
            }

            return string.Equals(FirstName, other.FirstName, StringComparison.OrdinalIgnoreCase)
                && string.Equals(LastName, other.LastName, StringComparison.OrdinalIgnoreCase);
        }

        //! IA
        public override bool Equals(object? obj)
        {
            return obj is FullName other && Equals(other);
        }

        //! IA
        public override int GetHashCode()
        {
            return HashCode.Combine(
                StringComparer.OrdinalIgnoreCase.GetHashCode(FirstName),
                StringComparer.OrdinalIgnoreCase.GetHashCode(LastName));
        }

        //! IA
        public override string ToString()
        {
            return Value;
        }

        private static string NormalizeNamePart(string value, string fieldName)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                throw new ArgumentException($"{fieldName} cannot be empty.", fieldName);
            }

            var normalized = value.Trim();

            if (normalized.Length < 2)
            {
                throw new ArgumentException($"{fieldName} is too short.", fieldName);
            }

            if (normalized.Length > 80)
            {
                throw new ArgumentException($"{fieldName} is too long.", fieldName);
            }

            if (normalized.Any(char.IsDigit))
            {
                throw new ArgumentException($"{fieldName} cannot contain numbers.", fieldName);
            }

            return char.ToUpperInvariant(normalized[0]) + normalized.Substring(1).ToLowerInvariant();
        }
    }
}
