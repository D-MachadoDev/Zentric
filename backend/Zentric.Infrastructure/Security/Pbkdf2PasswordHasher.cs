using System;
using System.Security.Cryptography;
using Zentric.Domain.Users.Ports;

namespace Zentric.Infrastructure.Security
{
    /// <summary>
    /// Adaptador de <see cref="IPasswordHasher"/> basado en PBKDF2-HMAC-SHA256.
    ///
    /// ADR-0009 fija este algoritmo y 600 000 iteraciones. Se eligio PBKDF2 y no
    /// bcrypt o Argon2id porque <c>Rfc2898DeriveBytes</c> viene en la biblioteca
    /// base de .NET: no se anade ninguna dependencia, que es el criterio que ya
    /// rige el proyecto desde ADR-0007 (riesgo de licencia de paquetes ajenos).
    ///
    /// El formato es autocontenido a proposito:
    /// <c>pbkdf2-sha256$&lt;iteraciones&gt;$&lt;salBase64&gt;$&lt;subclaveBase64&gt;</c>.
    /// Asi el coste puede subirse en el futuro y los hashes viejos siguen
    /// verificandose, porque cada hash recuerda con que coste se creo.
    /// </summary>
    public sealed class Pbkdf2PasswordHasher : IPasswordHasher
    {
        private const string Prefix = "pbkdf2-sha256";
        private const int SaltSizeInBytes = 16;
        private const int SubkeySizeInBytes = 32;

        /// <summary>Coste de derivacion. OWASP recomienda 600 000 para PBKDF2-HMAC-SHA256.</summary>
        public const int DefaultIterations = 600_000;

        private readonly int _iterations;

        public Pbkdf2PasswordHasher()
            : this(DefaultIterations)
        {
        }

        /// <param name="iterations">Coste de derivacion. Solo se admite en pruebas.</param>
        public Pbkdf2PasswordHasher(int iterations)
        {
            if (iterations < 1000)
            {
                throw new ArgumentOutOfRangeException(
                    nameof(iterations),
                    "The iteration count must be at least 1000; a lower value is not a security decision, it is a test shortcut.");
            }

            _iterations = iterations;
        }

        public string Hash(string password)
        {
            if (string.IsNullOrEmpty(password))
            {
                throw new ArgumentException("Password cannot be empty.", nameof(password));
            }

            byte[] salt = RandomNumberGenerator.GetBytes(SaltSizeInBytes);
            byte[] subkey = Derive(password, salt, _iterations, SubkeySizeInBytes);

            return string.Join(
                '$',
                Prefix,
                _iterations.ToString(System.Globalization.CultureInfo.InvariantCulture),
                Convert.ToBase64String(salt),
                Convert.ToBase64String(subkey));
        }

        public bool Verify(string password, string storedHash)
        {
            // Se devuelve false, no una excepcion: un hash con formato desconocido
            // (por ejemplo, uno que escribio un cliente antes de ADR-0009) es un
            // fallo de credencial, no un fallo tecnico.
            if (string.IsNullOrEmpty(password) || string.IsNullOrEmpty(storedHash))
            {
                return false;
            }

            string[] parts = storedHash.Split('$');
            if (parts.Length != 4 || !string.Equals(parts[0], Prefix, StringComparison.Ordinal))
            {
                return false;
            }

            if (!int.TryParse(parts[1], System.Globalization.CultureInfo.InvariantCulture, out int iterations)
                || iterations <= 0)
            {
                return false;
            }

            byte[] salt;
            byte[] expected;
            try
            {
                salt = Convert.FromBase64String(parts[2]);
                expected = Convert.FromBase64String(parts[3]);
            }
            catch (FormatException)
            {
                return false;
            }

            if (salt.Length == 0 || expected.Length == 0)
            {
                return false;
            }

            byte[] actual = Derive(password, salt, iterations, expected.Length);

            // Comparacion en tiempo constante: si se saliera en el primer byte
            // distinto, el tiempo de respuesta revelaria cuantos bytes correctos
            // lleva el atacante.
            return CryptographicOperations.FixedTimeEquals(actual, expected);
        }

        private static byte[] Derive(string password, byte[] salt, int iterations, int subkeyLength)
        {
            return Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, HashAlgorithmName.SHA256, subkeyLength);
        }
    }
}
