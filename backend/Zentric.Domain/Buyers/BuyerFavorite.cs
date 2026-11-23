using System;
using Zentric.Domain.Common.Models;

namespace Zentric.Domain.Buyers
{
    /// <summary>
    /// Representa un producto guardado en favoritos por un comprador autenticado.
    /// Invariante de persistencia: la combinación (UserId, ProductId) es única en el sistema.
    /// </summary>
    public sealed class BuyerFavorite : Entity
    {
        public Guid Id { get; init; } = Guid.NewGuid();
        public Guid UserId { get; private set; }
        public Guid ProductId { get; private set; }
        public DateTime CreatedAt { get; private set; }

        private BuyerFavorite() { }

        public BuyerFavorite(Guid userId, Guid productId, DateTime? createdAt = null, Guid? id = null)
        {
            if (userId == Guid.Empty)
            {
                throw new ArgumentException("El identificador de usuario no puede estar vacío.", nameof(userId));
            }

            if (productId == Guid.Empty)
            {
                throw new ArgumentException("El identificador de producto no puede estar vacío.", nameof(productId));
            }

            Id = id ?? Guid.NewGuid();
            UserId = userId;
            ProductId = productId;
            CreatedAt = createdAt ?? DateTime.UtcNow;
        }
    }
}
