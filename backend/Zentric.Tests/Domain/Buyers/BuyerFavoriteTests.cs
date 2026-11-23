using System;
using Xunit;
using Zentric.Domain.Buyers;

namespace Zentric.Tests.Domain.Buyers
{
    public class BuyerFavoriteTests
    {
        /// <summary>
        /// Objetivo: Validar que una instancia de BuyerFavorite se inicialice correctamente con identificadores válidos y marca temporal.
        /// </summary>
        [Fact(DisplayName = "1. Creación exitosa de BuyerFavorite inicializa propiedades e id")]
        public void Create_ValidIdentifiers_InitializesCorrectly()
        {
            var userId = Guid.NewGuid();
            var productId = Guid.NewGuid();

            var favorite = new BuyerFavorite(userId, productId);

            Assert.NotEqual(Guid.Empty, favorite.Id);
            Assert.Equal(userId, favorite.UserId);
            Assert.Equal(productId, favorite.ProductId);
            Assert.True(favorite.CreatedAt <= DateTime.UtcNow);
        }

        /// <summary>
        /// Objetivo: Validar que BuyerFavorite rechace UserId vacío arrojando ArgumentException.
        /// </summary>
        [Fact(DisplayName = "2. Constructor de BuyerFavorite rechaza UserId vacío")]
        public void Constructor_EmptyUserId_ThrowsArgumentException()
        {
            var productId = Guid.NewGuid();
            Assert.Throws<ArgumentException>(() => new BuyerFavorite(Guid.Empty, productId));
        }

        /// <summary>
        /// Objetivo: Validar que BuyerFavorite rechace ProductId vacío arrojando ArgumentException.
        /// </summary>
        [Fact(DisplayName = "3. Constructor de BuyerFavorite rechaza ProductId vacío")]
        public void Constructor_EmptyProductId_ThrowsArgumentException()
        {
            var userId = Guid.NewGuid();
            Assert.Throws<ArgumentException>(() => new BuyerFavorite(userId, Guid.Empty));
        }
    }
}
