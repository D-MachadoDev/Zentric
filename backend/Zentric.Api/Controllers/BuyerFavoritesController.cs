using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Zentric.Api.Contracts;
using Zentric.Api.Security;
using Zentric.Infrastructure.Persistence;
using Zentric.Infrastructure.Persistence.Models;

namespace Zentric.Api.Controllers
{
    /// <summary>
    /// Gestión de la lista de productos favoritos multidispositivo del comprador.
    /// Garantiza persistencia en PostgreSQL con unicidad matemática por (UserId, ProductId).
    /// </summary>
    [ApiController]
    [Route("api/buyer/favorites")]
    [Tags("Buyer Favorites")]
    [Produces("application/json")]
    public class BuyerFavoritesController : ControllerBase
    {
        private readonly ZentricDbContext _dbContext;
        private readonly ICurrentUserAccessor _currentUser;

        public BuyerFavoritesController(ZentricDbContext dbContext, ICurrentUserAccessor currentUser)
        {
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
            _currentUser = currentUser ?? throw new ArgumentNullException(nameof(currentUser));
        }

        /// <summary>
        /// Obtiene la lista completa de productos favoritos guardados por el comprador autenticado.
        /// </summary>
        /// <response code="200">Lista de favoritos enriquecida con precio, imagen, disponibilidad y estrellas.</response>
        /// <response code="401">No autenticado o token inválido.</response>
        [HttpGet]
        [Authorize(Policy = AuthorizationPolicies.AnyAuthenticatedUser)]
        [ProducesResponseType(typeof(IReadOnlyList<BuyerFavoriteItemDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetFavorites(CancellationToken cancellationToken)
        {
            var userId = _currentUser.UserId;
            if (userId is null)
            {
                return Unauthorized(new ProblemDetails { Detail = "Missing or invalid bearer token." });
            }

            var favorites = await _dbContext.BuyerFavorites
                .AsNoTracking()
                .Where(f => f.UserId == userId.Value)
                .OrderByDescending(f => f.CreatedAt)
                .Include(f => f.Product)
                .ThenInclude(p => p!.Variants)
                .ToListAsync(cancellationToken);

            var allVariantIds = favorites
                .Where(f => f.Product != null)
                .SelectMany(f => f.Product!.Variants.Select(v => v.Id))
                .Distinct()
                .ToList();

            var stockByVariant = await _dbContext.Inventories
                .AsNoTracking()
                .Where(i => allVariantIds.Contains(i.VariantId) && i.DeletedAt == null)
                .GroupBy(i => i.VariantId)
                .Select(g => new { VariantId = g.Key, Available = g.Sum(x => x.AvailableQuantity) })
                .ToDictionaryAsync(x => x.VariantId, x => x.Available, cancellationToken);

            var items = favorites.Select(f =>
            {
                var product = f.Product;
                var productName = product?.Name ?? "Producto";
                var price = product?.Price?.Amount ?? 0m;
                var currency = product?.Price?.Currency ?? "COP";
                var imageUrl = product?.ImageUrl;
                var averageRating = product?.AverageRating ?? 0m;
                var reviewsCount = product?.ReviewsCount ?? 0;

                var totalStock = 0;
                if (product != null)
                {
                    foreach (var v in product.Variants)
                    {
                        if (stockByVariant.TryGetValue(v.Id, out var qty))
                        {
                            totalStock += qty;
                        }
                    }
                }

                return new BuyerFavoriteItemDto(
                    f.Id,
                    f.ProductId,
                    productName,
                    price,
                    currency,
                    imageUrl,
                    totalStock,
                    averageRating,
                    reviewsCount,
                    f.CreatedAt);
            }).ToList();

            return Ok(items);
        }

        /// <summary>
        /// Agrega un producto a la lista de favoritos del comprador.
        /// Idempotente: si el producto ya estaba en la lista, devuelve 200 OK sin duplicar registros.
        /// </summary>
        /// <param name="request">Payload con el ProductId.</param>
        /// <param name="cancellationToken">Token de cancelación.</param>
        /// <response code="200">Producto agregado o ya existente en favoritos.</response>
        /// <response code="400">Identificador de producto inválido.</response>
        /// <response code="401">No autenticado o token inválido.</response>
        /// <response code="404">El producto no existe en el catálogo.</response>
        [HttpPost]
        [Authorize(Policy = AuthorizationPolicies.AnyAuthenticatedUser)]
        [ProducesResponseType(typeof(BuyerFavoriteItemDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> AddFavorite([FromBody] AddBuyerFavoriteRequest request, CancellationToken cancellationToken)
        {
            var userId = _currentUser.UserId;
            if (userId is null)
            {
                return Unauthorized(new ProblemDetails { Detail = "Missing or invalid bearer token." });
            }

            if (request.ProductId == Guid.Empty)
            {
                return BadRequest(new ProblemDetails { Detail = "El identificador de producto es requerido." });
            }

            var product = await _dbContext.Products
                .AsNoTracking()
                .Include(p => p.Variants)
                .FirstOrDefaultAsync(p => p.Id == request.ProductId, cancellationToken);

            if (product is null)
            {
                return NotFound(new ProblemDetails { Detail = "Producto no encontrado en el catálogo." });
            }

            var existing = await _dbContext.BuyerFavorites
                .FirstOrDefaultAsync(f => f.UserId == userId.Value && f.ProductId == request.ProductId, cancellationToken);

            if (existing != null)
            {
                return Ok(new BuyerFavoriteItemDto(
                    existing.Id,
                    existing.ProductId,
                    product.Name,
                    product.Price?.Amount ?? 0m,
                    product.Price?.Currency ?? "COP",
                    product.ImageUrl,
                    0,
                    product.AverageRating,
                    product.ReviewsCount,
                    existing.CreatedAt));
            }

            var newFavorite = new BuyerFavoriteDbModel
            {
                Id = Guid.NewGuid(),
                UserId = userId.Value,
                ProductId = request.ProductId,
                CreatedAt = DateTime.UtcNow
            };

            _dbContext.BuyerFavorites.Add(newFavorite);
            await _dbContext.SaveChangesAsync(cancellationToken);

            return Ok(new BuyerFavoriteItemDto(
                newFavorite.Id,
                newFavorite.ProductId,
                product.Name,
                product.Price?.Amount ?? 0m,
                product.Price?.Currency ?? "COP",
                product.ImageUrl,
                0,
                product.AverageRating,
                product.ReviewsCount,
                newFavorite.CreatedAt));
        }

        /// <summary>
        /// Elimina un producto de la lista de favoritos del comprador.
        /// </summary>
        /// <param name="productId">Identificador del producto a remover.</param>
        /// <param name="cancellationToken">Token de cancelación.</param>
        /// <response code="204">Removido exitosamente.</response>
        /// <response code="401">No autenticado o token inválido.</response>
        [HttpDelete("{productId}")]
        [Authorize(Policy = AuthorizationPolicies.AnyAuthenticatedUser)]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> RemoveFavorite(Guid productId, CancellationToken cancellationToken)
        {
            var userId = _currentUser.UserId;
            if (userId is null)
            {
                return Unauthorized(new ProblemDetails { Detail = "Missing or invalid bearer token." });
            }

            var favorite = await _dbContext.BuyerFavorites
                .FirstOrDefaultAsync(f => f.UserId == userId.Value && f.ProductId == productId, cancellationToken);

            if (favorite != null)
            {
                _dbContext.BuyerFavorites.Remove(favorite);
                await _dbContext.SaveChangesAsync(cancellationToken);
            }

            return NoContent();
        }
    }
}
