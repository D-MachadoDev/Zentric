
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

        //! IA
        // 1. C# usa este método automáticamente cuando trabaja con cosas genéricas (como LINQ).
        // A veces C# "olvida" que esto es un Email y lo trata como un objeto cualquiera (object).
        public override bool Equals(object? obj)
        {
            // Esto significa: "¿Oye objeto raro, eres secretamente un Email? 
            // Si sí, pásaselo a mi función real de arriba para compararlo".
            return obj is Email other && Equals(other);
        }

        // 2. Regla de oro de C#: Si modificas "Equals", ESTÁS OBLIGADO a poner este método.
        // C# lo usa automáticamente cuando metes tus correos en colecciones ultra-rápidas 
        // como HashSet<Email> o Dictionary<Email, ...> para agruparlos numéricamente.
        public override int GetHashCode()
        {
            // Genera un número de identidad único basado en el texto (ignorando mayúsculas/minúsculas)
            return StringComparer.OrdinalIgnoreCase.GetHashCode(Value);
        }

        // 3. C# usa esto automáticamente cuando intentas imprimir el objeto en pantalla.
        // Por ejemplo, al hacer Console.WriteLine(miEmail). 
        // Si no lo pones, C# imprimiría un texto feo así: "Zentric.Domain.Users.ValueObjects.Email".
        public override string ToString()
        {
            return Value;
        }
    }
}