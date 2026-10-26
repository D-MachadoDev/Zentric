using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Zentric.Domain.Products;

namespace Zentric.Domain.Products.Ports
{
    public interface IUserRecentlyViewedRepository
    {
        /// <summary>
        /// Obtiene los productos vistos recientemente por un usuario, ordenados por fecha descendente.
        /// </summary>
        Task<IReadOnlyList<UserRecentlyViewed>> GetByUserIdAsync(Guid userId, int maxItems = 20, CancellationToken cancellationToken = default);

        /// <summary>
        /// Registra o actualiza la visualización de un producto por un usuario.
        /// </summary>
        Task UpsertAsync(Guid userId, Guid productId, DateTime viewedAt, CancellationToken cancellationToken = default);

        /// <summary>
        /// Elimina todos los registros de un usuario (para logout/limpieza).
        /// </summary>
        Task ClearAsync(Guid userId, CancellationToken cancellationToken = default);
    }
}