using System;
using System.Collections.Generic;
using System.Linq;
using Zentric.Domain.Buyers.ValueObjects;

namespace Zentric.Domain.Buyers
{
public sealed class Buyer
    {
        // El Id del Buyer será EXACTAMENTE EL MISMO que el Id del User.
        // Así los conectamos sin mezclar sus datos.
        public Guid UserId { get; init; }

        /// <summary>
        /// Direccion principal, obligatoria segun ZENTRIC.md Dominio 2.
        /// Es un Value Object: si el comprador cambia de casa se genera otra
        /// instancia, nunca se muta la existente.
        /// </summary>
        public Address MainAddress { get; private set; }

        /// <summary>Direcciones adicionales, opcionales (Dominio 2).</summary>
        public IReadOnlyList<Address> AdditionalAddresses => _additionalAddresses.AsReadOnly();

        private readonly List<Address> _additionalAddresses = new();

        public bool IsActiveForCommerce { get; private set; }
        
        public DateTime CreatedAt { get; private set; }
        public DateTime UpdatedAt { get; private set; }

        private Buyer()
        {
            MainAddress = null!;
            
        }

        public Buyer(Guid userId, Address mainAddress)
        {
            if (mainAddress is null)
            {
                throw new ArgumentException("Main address is required.", nameof(mainAddress));
            }

            if (userId == Guid.Empty)
            {
                throw new ArgumentException("UserId is required.", nameof(userId));
            }

            UserId = userId; // Vinculamos 1 a 1
            MainAddress = mainAddress;
            
            IsActiveForCommerce = true; // Empieza listo para comprar
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
            string country)
            => new(userId, new Address(street, city, state, zipCode, country));

        public void AdditionalAddress(Address address)
        {
            if (address is null)
            {
                throw new ArgumentException("Address cannot be empty.", nameof(address));
            }

            _additionalAddresses.Add(address);
            UpdatedAt = DateTime.UtcNow;

            // TODO: Domain event BuyerAdditionalAddressAdded
        }

        public void RemoveAdditionalAddress(Address address)
        {
            if (!_additionalAddresses.Remove(address))
            {
                throw new InvalidOperationException("Address not found in additional addresses.");
            }

            UpdatedAt = DateTime.UtcNow;

            // TODO: Domain event BuyerAdditionalAddressRemoved
        }

        public void UpdateMainAddress(Address newAddress)
        {
            if (newAddress is null)
            {
                throw new ArgumentException("New main address cannot be empty.", nameof(newAddress));
            }

            MainAddress = newAddress;
            UpdatedAt = DateTime.UtcNow;

            // TODO: Domain event BuyerMainAddressUpdated
        }

        public void SuspendCommerceActivity()
        {

            if (!IsActiveForCommerce)
            {
                throw new InvalidOperationException("Buyer is already inactive for commerce.");
            }

            IsActiveForCommerce = false;
            UpdatedAt = DateTime.UtcNow;

            // TODO: Domain event BuyerCommerceSuspended
        }
        public void ResumeCommerceActivity()
        {
            if (IsActiveForCommerce)
            {
                throw new InvalidOperationException("Buyer is already active for commerce.");
            }

            IsActiveForCommerce = true;
            UpdatedAt = DateTime.UtcNow;

            // TODO: Domain event BuyerCommerceResumed
        }

        

        

    }
}
