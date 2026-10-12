
using Zentric.Domain.Users.Enums;
using Zentric.Domain.Users.ValueObjects;

namespace Zentric.Domain.Users
{
    public sealed class User
    {
        public Guid Id { get; init; }

        /// <summary>
        /// Documento de identidad del usuario, almacenado como texto normalizado.
        ///
        /// Q-07 (ratificado por el Owner el 2026-09-27): se conserva como texto
        /// libre, OBLIGATORIO y no vacio, SIN formato ni longitud impuesta. La Ley
        /// no define un patron de documento y el pais de emision varia por
        /// vendedor; inventar una validacion (longitud fija, digito de control)
        /// rechazaria documentos legitimos.
        /// </summary>
        public string IdentityDocument { get; private set; }
        public FullName FullName { get; private set; }
        public Email Email { get; private set; }
        public string PasswordHash { get; private set; }
        public UserRole Role { get; private set; }
        public UserStatus Status { get; private set; }
        
        /// <summary>
        /// Tasa de stock fantasma del vendedor (0.0 a 1.0).
        /// Se incrementa cuando se detecta stock fantasma en sus productos.
        /// Se usa en INV-05 para bloquear ventas de vendedores reincidentes.
        /// </summary>
        public decimal StockFantasmaRate { get; private set; }
        
        public DateTime CreatedAt { get; private set; }
        public DateTime UpdatedAt { get; private set; }
        public DateTime? DeletedAt { get; private set; }
        public bool IsDeleted => DeletedAt.HasValue;
        public bool CanAuthenticate => Status == UserStatus.Active && !IsDeleted;

        private User()
        {
            IdentityDocument = null!;
            FullName = null!;
            Email = null!;
            PasswordHash = null!;
        } // For EF Core

        public User(string identityDocument, FullName fullName, Email email, string passwordHash, UserRole role)
        {
            if (string.IsNullOrWhiteSpace(identityDocument)) throw new ArgumentException("Identity document cannot be empty.", nameof(identityDocument));
            if (string.IsNullOrWhiteSpace(passwordHash)) throw new ArgumentException("Password hash cannot be empty.", nameof(passwordHash));
            if (!Enum.IsDefined(role)) throw new ArgumentOutOfRangeException(nameof(role), "Invalid user role.");

            Id = Guid.NewGuid();
            // Q-07 (ratificado): solo se recorta el espacio exterior. No se aplica
            // mas formato ni se valida un patron, porque la Ley no define ninguno.
            IdentityDocument = identityDocument.Trim();
            FullName = fullName;
            Email = email;
            PasswordHash = passwordHash;
            Role = role;
            Status = UserStatus.Active;
            CreatedAt = DateTime.UtcNow;
            UpdatedAt = CreatedAt;
            DeletedAt = null;
        }

        public void UpdateFullName(FullName newFullName)
        {
            if (IsDeleted)
            {
                throw new InvalidOperationException("Cannot update the full name of a deleted user.");
            }

            if (Status == UserStatus.Blocked)
            {
                throw new InvalidOperationException("Cannot update the full name of a blocked user.");
            }

            if (newFullName.Equals(FullName))
            {
                return;
            }

            FullName = newFullName;
            UpdatedAt = DateTime.UtcNow;
        }

        public void UpdateEmail(Email newEmail)
        {
            if (IsDeleted)
            {
                throw new InvalidOperationException("Cannot update the email of a deleted user.");
            }

            if (Status == UserStatus.Blocked)
            {
                throw new InvalidOperationException("Cannot update the email of a blocked user.");
            }

            if (newEmail.Equals(Email))
            {
                return;
            }

            Email = newEmail;
            UpdatedAt = DateTime.UtcNow;
        }

        public void UpdatePasswordHash(string newPasswordHash)
        {
            if (IsDeleted)
            {
                throw new InvalidOperationException("Cannot update the password of a deleted user.");
            }

            if (Status == UserStatus.Blocked)
            {
                throw new InvalidOperationException("Cannot update the password of a blocked user.");
            }

            if (newPasswordHash == PasswordHash)
            {
                return;
            }

            if (string.IsNullOrWhiteSpace(newPasswordHash))
            {
                throw new ArgumentException("Password hash cannot be empty.", nameof(newPasswordHash));
            }

            PasswordHash = newPasswordHash;
            UpdatedAt = DateTime.UtcNow;
        }

        public void Block()
        {
            if (IsDeleted)
            {
                throw new InvalidOperationException("Cannot block a deleted user.");
            }

            if (Status == UserStatus.Blocked)
            {
                throw new InvalidOperationException("User is already blocked.");
            }

            Status = UserStatus.Blocked;
            UpdatedAt = DateTime.UtcNow;
        }

        public void Activate()
        {
            if (IsDeleted)
            {
                throw new InvalidOperationException("Cannot activate a deleted user.");
            }

            if (Status == UserStatus.Active)
            {
                throw new InvalidOperationException("User is already active.");
            }

            Status = UserStatus.Active;
            UpdatedAt = DateTime.UtcNow;
        }

        public void UpdateRole(UserRole newRole)
        {
            if (IsDeleted)
            {
                throw new InvalidOperationException("Cannot update the role of a deleted user.");
            }

            if (Status == UserStatus.Blocked)
            {
                throw new InvalidOperationException("Cannot update the role of a blocked user.");
            }

            if (!Enum.IsDefined(typeof(UserRole), newRole))
            {
                throw new ArgumentOutOfRangeException(nameof(newRole), "Invalid user role.");
            }

            if (newRole == Role)
            {
                return;
            }

            Role = newRole;
            UpdatedAt = DateTime.UtcNow;
        }

        public void Delete()
        {
            if (IsDeleted)
            {
                throw new InvalidOperationException("User is already deleted.");
            }

            if (Status != UserStatus.Active)
            {
                throw new InvalidOperationException("Only active users can be deleted by themselves.");
            }

            DeletedAt = DateTime.UtcNow;
            Status = UserStatus.Deleted;
            UpdatedAt = DeletedAt.Value;
        }

        public void Restore()
        {
            if (!IsDeleted)
            {
                throw new InvalidOperationException("User is not deleted.");
            }

            DeletedAt = null;
            Status = UserStatus.Active;
            UpdatedAt = DateTime.UtcNow;
        }

        public void DeleteByAdmin()
        {
            if (IsDeleted)
            {
                throw new InvalidOperationException("User is already deleted.");
            }

            DeletedAt = DateTime.UtcNow;
            Status = UserStatus.Deleted;
            UpdatedAt = DeletedAt.Value;
        }

        /// <summary>
        /// Incrementa la tasa de stock fantasma del vendedor.
        /// Se invoca cuando se detecta stock fantasma en sus productos (ADR-0021).
        /// El incremento es fijo (0.1 = 10%) y se cap en 1.0 (100%).
        /// </summary>
        public void IncrementStockFantasmaRate()
        {
            if (Role != UserRole.Seller)
            {
                return; // Solo aplica a vendedores
            }

            const decimal Increment = 0.1m; // 10% por incidente
            StockFantasmaRate = Math.Min(StockFantasmaRate + Increment, 1.0m);
            UpdatedAt = DateTime.UtcNow;
        }

        /// <summary>
        /// Verifica si el vendedor supera el umbral de stock fantasma.
        /// Umbral por defecto: 30% (3 incidentes).
        /// </summary>
        public bool ExceedsStockFantasmaThreshold(decimal threshold = 0.3m)
        {
            if (Role != UserRole.Seller)
            {
                return false;
            }
            return StockFantasmaRate >= threshold;
        }
    }
}
