using System;
using System.Collections.Generic;
using System.Linq;
using Zentric.Domain.Buyers.ValueObjects;

namespace Zentric.Domain.Buyers
{
    /// <summary>
    /// Agregado raíz que representa al Comprador en el marketplace.
    /// </summary>
    /// <remarks>
    /// ZENTRIC.md Dominio 2: el Comprador tiene identidad compartida 1:1 con User (UserId == User.Id),
    /// separando las credenciales de acceso de las direcciones de entrega y el perfil comercial.
    /// </remarks>
    public sealed class Buyer
    {
        /// <summary>
        /// Identificador único del comprador, compartido de forma biunívoca con <c>User.Id</c>.
        /// </summary>
        public Guid UserId { get; init; }

        /// <summary>
        /// Dirección de entrega principal, obligatoria según ZENTRIC.md Dominio 2.
        /// Value Object inmutable: cualquier cambio sustituye la instancia completa.
        /// </summary>
        public Address MainAddress { get; private set; }

        /// <summary>
        /// Direcciones secundarias opcionales asociadas a la cuenta del comprador.
        /// </summary>
        public IReadOnlyList<Address> AdditionalAddresses => _additionalAddresses.AsReadOnly();

        private readonly List<Address> _additionalAddresses = new();

        /// <summary>
        /// Teléfono de contacto del comprador para entregas y notificaciones logísticas.
        /// </summary>
        public string? Phone { get; private set; }

        /// <summary>
        /// Indica si el comprador está habilitado para realizar transacciones comerciales.
        /// </summary>
        public bool IsActiveForCommerce { get; private set; }
        
        public DateTime CreatedAt { get; private set; }
        public DateTime UpdatedAt { get; private set; }

        /// <summary>
        /// Constructor protegido para hidratación de persistencia sin saltar guardas de dominio.
        /// </summary>
        private Buyer()
        {
            MainAddress = null!;
        }

        /// <summary>
        /// Crea una nueva instancia de Comprador validando sus invariantes obligatorias.
        /// </summary>
        /// <param name="userId">Identificador de usuario previamente autenticado.</param>
        /// <param name="mainAddress">Dirección física principal de entrega obligatoria.</param>
        /// <param name="phone">Teléfono de contacto opcional del comprador.</param>
        public Buyer(Guid userId, Address mainAddress, string? phone = null)
        {
            if (mainAddress is null)
            {
                throw new ArgumentException("Main address is required.", nameof(mainAddress));
            }

            if (userId == Guid.Empty)
            {
                throw new ArgumentException("UserId is required.", nameof(userId));
            }

            // ZENTRIC.md Dominio 2: Vinculación 1:1 con la cuenta de usuario
            UserId = userId;
            MainAddress = mainAddress;
            Phone = string.IsNullOrWhiteSpace(phone) ? null : phone.Trim();
            
            // ZENTRIC.md Dominio 2: El comprador nace habilitado inmediatamente para operar
            IsActiveForCommerce = true;
            CreatedAt = DateTime.UtcNow;
            UpdatedAt = CreatedAt;
        }

        /// <summary>
        /// Fabrica desde los componentes sueltos de la direccion. Permite a las
        /// capas superiores construir el VO sin conocer su tipo.
        /// </summary>
        public static Buyer Create(
            Guid userId,
            string street,
            string city,
            string state,
            string zipCode,
            string country,
            string? phone = null)
            => new(userId, new Address(street, city, state, zipCode, country), phone);

        /// <summary>
        /// Actualiza el teléfono de contacto del comprador.
        /// </summary>
        public void UpdatePhone(string? phone)
        {
            Phone = string.IsNullOrWhiteSpace(phone) ? null : phone.Trim();
            UpdatedAt = DateTime.UtcNow;
        }

        /// <summary>
        /// Registra domicilios alternativos de entrega permitidos por ZENTRIC.md Dominio 2.
        /// </summary>
        /// <remarks>
        /// Permite al comprador despachar a múltiples sedes (oficina, familiar) sin alterar su dirección fiscal principal.
        /// </remarks>
        public void AdditionalAddress(Address address)
        {
            if (address is null)
            {
                throw new ArgumentException("Address cannot be empty.", nameof(address));
            }

            _additionalAddresses.Add(address);
            UpdatedAt = DateTime.UtcNow;
        }

        /// <summary>
        /// Da de baja un domicilio secundario que el comprador ya no utiliza.
        /// </summary>
        /// <remarks>
        /// Invariante defensiva: lanza excepción si no existe para evitar confirmaciones falsas de eliminación.
        /// </remarks>
        public void RemoveAdditionalAddress(Address address)
        {
            if (!_additionalAddresses.Remove(address))
            {
                throw new InvalidOperationException("Address not found in additional addresses.");
            }

            UpdatedAt = DateTime.UtcNow;
        }

        /// <summary>
        /// Sustituye el domicilio fiscal y de entrega obligatorio del comprador (ZENTRIC.md Dominio 2).
        /// </summary>
        /// <remarks>
        /// Al ser un Value Object inmutable, una mudanza no altera campos internos sino que reemplaza la instancia completa.
        /// </remarks>
        public void UpdateMainAddress(Address newAddress)
        {
            if (newAddress is null)
            {
                throw new ArgumentException("New main address cannot be empty.", nameof(newAddress));
            }

            MainAddress = newAddress;
            UpdatedAt = DateTime.UtcNow;
        }
    }
}
