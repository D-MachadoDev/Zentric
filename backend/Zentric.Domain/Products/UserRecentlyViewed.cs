using Zentric.Domain.Common.Models;

namespace Zentric.Domain.Products
{
    /// <summary>
    /// Registro de producto visto recientemente por un usuario.
    /// Una entrada por (UserId, ProductId) con timestamp de última visualización.
    /// </summary>
    public sealed class UserRecentlyViewed : Entity
    {
        public Guid UserId { get; private set; }
        public Guid ProductId { get; private set; }
        public DateTime ViewedAt { get; private set; }

        private UserRecentlyViewed() { }

        public UserRecentlyViewed(Guid userId, Guid productId, DateTime viewedAt)
        {
            if (userId == Guid.Empty) throw new ArgumentException("UserId cannot be empty", nameof(userId));
            if (productId == Guid.Empty) throw new ArgumentException("ProductId cannot be empty", nameof(productId));

            UserId = userId;
            ProductId = productId;
            ViewedAt = viewedAt;
        }

        public void UpdateViewedAt(DateTime viewedAt)
        {
            ViewedAt = viewedAt;
        }
    }
}