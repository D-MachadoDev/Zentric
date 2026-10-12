
namespace Zentric.Domain.Users.ValueObjects
{
    public sealed class Email : IEquatable<Email>
    {
        public string Value { get; }

        public Email(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                throw new ArgumentException("Email cannot be empty.", nameof(value));
            }

            var normalized = value.Trim();

            if (normalized.Length < 5)
            {
                throw new ArgumentException("Email is too short.", nameof(value));
            }

            if (!normalized.Contains('@'))
            {
                throw new ArgumentException("Invalid email format.", nameof(value));
            }

            var parts = normalized.Split('@');
            if (parts.Length != 2 || string.IsNullOrWhiteSpace(parts[0]) || string.IsNullOrWhiteSpace(parts[1]))
            {
                throw new ArgumentException("Invalid email format.", nameof(value));
            }

            if (!parts[1].Contains('.'))
            {
                throw new ArgumentException("Invalid email format.", nameof(value));
            }

            Value = normalized.ToLowerInvariant();
        }

        public bool Equals(Email? other)
        {
            if (other is null)
            {
                return false;
            }

            return string.Equals(Value, other.Value, StringComparison.OrdinalIgnoreCase);
        }

        public override bool Equals(object? obj)
        {
            return obj is Email other && Equals(other);
        }

        public override int GetHashCode()
        {
            return StringComparer.OrdinalIgnoreCase.GetHashCode(Value);
        }

        public override string ToString()
        {
            return Value;
        }
    }
}