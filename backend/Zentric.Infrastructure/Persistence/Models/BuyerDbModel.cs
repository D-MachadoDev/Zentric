using System;
using Zentric.Domain.Buyers.ValueObjects;

namespace Zentric.Infrastructure.Persistence.Models
{
    public class BuyerDbModel
    {
        public Guid UserId { get; set; }

        /// <summary>
        /// Direccion principal del comprador (ZENTRIC.md Dominio 2, obligatoria).
        /// Se persiste descompuesta en columnas: el Value Object no se guarda
        /// como tipo opaco.
        /// </summary>
        public AddressDbModel MainAddress { get; set; } = null!;

        public bool IsActiveForCommerce { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    /// <summary>Proyeccion de <see cref="Address"/> en columnas.</summary>
    public class AddressDbModel
    {
        public string Street { get; set; } = null!;
        public string City { get; set; } = null!;
        public string State { get; set; } = null!;
        public string ZipCode { get; set; } = null!;
        public string Country { get; set; } = null!;
    }
}
