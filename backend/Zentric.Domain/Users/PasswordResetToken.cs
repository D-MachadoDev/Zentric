using System;
using System.Security.Cryptography;
using System.Text;

namespace Zentric.Domain.Users
{
    /// <summary>
    /// Entidad de dominio que representa un token criptográfico efímero
    /// para la recuperación y restablecimiento de contraseña.
    /// Invariante de seguridad: El token plano nunca se persiste en la base de datos;
    /// únicamente se almacena su hash SHA-256.
    /// </summary>
    public sealed class PasswordResetToken
    {
        public Guid Id { get; init; }
        public Guid UserId { get; private set; }
        public string TokenHash { get; private set; }
        public DateTime CreatedAt { get; private set; }
        public DateTime ExpiresAt { get; private set; }
        public DateTime? UsedAt { get; private set; }

        public bool IsUsed => UsedAt.HasValue;
        public bool IsExpired(DateTime nowUtc) => nowUtc > ExpiresAt;
        public bool IsValid(DateTime nowUtc) => !IsUsed && !IsExpired(nowUtc);

        private PasswordResetToken()
        {
            TokenHash = null!;
        } // EF Core constructor

        public PasswordResetToken(Guid userId, string tokenHash, DateTime expiresAt, DateTime? createdAt = null)
        {
            if (userId == Guid.Empty) throw new ArgumentException("UserId cannot be empty.", nameof(userId));
            if (string.IsNullOrWhiteSpace(tokenHash)) throw new ArgumentException("TokenHash cannot be empty.", nameof(tokenHash));

            Id = Guid.NewGuid();
            UserId = userId;
            TokenHash = tokenHash.Trim();
            CreatedAt = createdAt ?? DateTime.UtcNow;
            ExpiresAt = expiresAt;
            UsedAt = null;

            if (ExpiresAt <= CreatedAt)
            {
                throw new ArgumentException("ExpiresAt must be after CreatedAt.", nameof(expiresAt));
            }
        }

        /// <summary>
        /// Constructor para hidratación desde la capa de persistencia.
        /// </summary>
        public PasswordResetToken(Guid id, Guid userId, string tokenHash, DateTime createdAt, DateTime expiresAt, DateTime? usedAt)
        {
            Id = id;
            UserId = userId;
            TokenHash = tokenHash;
            CreatedAt = createdAt;
            ExpiresAt = expiresAt;
            UsedAt = usedAt;
        }

        /// <summary>
        /// Genera un token aleatorio seguro de 32 bytes (64 caracteres hexadecimales)
        /// y retorna el valor plano junto con su entidad asociada calculada con su hash SHA-256.
        /// </summary>
        public static (string RawToken, PasswordResetToken TokenEntity) Create(Guid userId, TimeSpan? lifetime = null)
        {
            byte[] randomBytes = RandomNumberGenerator.GetBytes(32);
            string rawToken = Convert.ToHexString(randomBytes).ToLowerInvariant();
            string hash = ComputeHash(rawToken);

            DateTime now = DateTime.UtcNow;
            DateTime expiresAt = now.Add(lifetime ?? TimeSpan.FromMinutes(15));

            var entity = new PasswordResetToken(userId, hash, expiresAt, now);
            return (rawToken, entity);
        }

        /// <summary>
        /// Calcula el hash SHA-256 de un token en claro.
        /// </summary>
        public static string ComputeHash(string rawToken)
        {
            if (string.IsNullOrWhiteSpace(rawToken))
            {
                throw new ArgumentException("Raw token cannot be empty.", nameof(rawToken));
            }

            byte[] inputBytes = Encoding.UTF8.GetBytes(rawToken.Trim());
            byte[] hashBytes = SHA256.HashData(inputBytes);
            return Convert.ToHexString(hashBytes).ToLowerInvariant();
        }

        /// <summary>
        /// Marca el token como consumido, impidiendo su reutilización.
        /// </summary>
        public void Use(DateTime nowUtc)
        {
            if (IsUsed)
            {
                throw new InvalidOperationException("The password reset token has already been used.");
            }

            if (IsExpired(nowUtc))
            {
                throw new InvalidOperationException("The password reset token has expired.");
            }

            UsedAt = nowUtc;
        }
    }
}
