
using Zentric.Domain.Users.Enums;
using Zentric.Domain.Users.ValueObjects;

namespace Zentric.Domain.Users
{
    public sealed class User
    {
        public Guid Id { get; init; }

        /// <summary>
        /// Documento de identidad del usuario, almacenado como texto normalizado.
        /// Se conserva como texto libre obligatorio y no vacio, sin formato ni longitud fija.
        /// </summary>
        public string IdentityDocument { get; private set; }
        public FullName FullName { get; private set; }
        public Email Email { get; private set; }
        public string PasswordHash { get; private set; }
        public UserRole Role { get; private set; }
        public UserStatus Status { get; private set; }
        
        /// <summary>
        /// Tasa de stock fantasma del vendedor (0.0 a 1.0).
        /// Se incrementa cuando se detecta faltante fisico en bodega para penalizar reincidencia.
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
            if (string.IsNullOrWhiteSpace(identityDocument)) throw new ArgumentException("El documento de identidad no puede estar vacío.", nameof(identityDocument));
            if (string.IsNullOrWhiteSpace(passwordHash)) throw new ArgumentException("El hash de la contraseña no puede estar vacío.", nameof(passwordHash));
            if (!Enum.IsDefined(role)) throw new ArgumentOutOfRangeException(nameof(role), "Rol de usuario inválido.");

            Id = Guid.NewGuid();
            // Solo se recorta el espacio exterior. No se aplica
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
                throw new InvalidOperationException("No se puede actualizar el nombre completo de un usuario eliminado.");
            }

            if (Status == UserStatus.Blocked)
            {
                throw new InvalidOperationException("No se puede actualizar el nombre completo de un usuario bloqueado.");
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
                throw new InvalidOperationException("No se puede actualizar el correo de un usuario eliminado.");
            }

            if (Status == UserStatus.Blocked)
            {
                throw new InvalidOperationException("No se puede actualizar el correo de un usuario bloqueado.");
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
                throw new InvalidOperationException("No se puede actualizar la contraseña de un usuario eliminado.");
            }

            if (Status == UserStatus.Blocked)
            {
                throw new InvalidOperationException("No se puede actualizar la contraseña de un usuario bloqueado.");
            }

            if (newPasswordHash == PasswordHash)
            {
                return;
            }

            if (string.IsNullOrWhiteSpace(newPasswordHash))
            {
                throw new ArgumentException("El hash de la contraseña no puede estar vacío.", nameof(newPasswordHash));
            }

            PasswordHash = newPasswordHash;
            UpdatedAt = DateTime.UtcNow;
        }

        public void Block()
        {
            if (IsDeleted)
            {
                throw new InvalidOperationException("No se puede bloquear un usuario eliminado.");
            }

            if (Status == UserStatus.Blocked)
            {
                throw new InvalidOperationException("El usuario ya está bloqueado.");
            }

            Status = UserStatus.Blocked;
            UpdatedAt = DateTime.UtcNow;
        }

        public void Activate()
        {
            if (IsDeleted)
            {
                throw new InvalidOperationException("No se puede activar un usuario eliminado.");
            }

            if (Status == UserStatus.Active)
            {
                throw new InvalidOperationException("El usuario ya está activo.");
            }

            Status = UserStatus.Active;
            UpdatedAt = DateTime.UtcNow;
        }

        public void UpdateRole(UserRole newRole)
        {
            if (IsDeleted)
            {
                throw new InvalidOperationException("No se puede actualizar el rol de un usuario eliminado.");
            }

            if (Status == UserStatus.Blocked)
            {
                throw new InvalidOperationException("No se puede actualizar el rol de un usuario bloqueado.");
            }

            if (!Enum.IsDefined(typeof(UserRole), newRole))
            {
                throw new ArgumentOutOfRangeException(nameof(newRole), "Rol de usuario inválido.");
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
                throw new InvalidOperationException("El usuario ya está eliminado.");
            }

            if (Status != UserStatus.Active)
            {
                throw new InvalidOperationException("Solo los usuarios activos pueden eliminarse a sí mismos.");
            }

            DeletedAt = DateTime.UtcNow;
            Status = UserStatus.Deleted;
            UpdatedAt = DeletedAt.Value;
        }

        public void Restore()
        {
            if (!IsDeleted)
            {
                throw new InvalidOperationException("El usuario no está eliminado.");
            }

            DeletedAt = null;
            Status = UserStatus.Active;
            UpdatedAt = DateTime.UtcNow;
        }

        public void DeleteByAdmin()
        {
            if (IsDeleted)
            {
                throw new InvalidOperationException("El usuario ya está eliminado.");
            }

            DeletedAt = DateTime.UtcNow;
            Status = UserStatus.Deleted;
            UpdatedAt = DeletedAt.Value;
        }

        /// <summary>
        /// Incrementa la tasa de stock fantasma del vendedor.
        /// Se invoca cuando se detecta stock fantasma en sus productos.
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
