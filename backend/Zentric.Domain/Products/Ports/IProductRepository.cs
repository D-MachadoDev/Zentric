using System;
using System.Threading;
using System.Threading.Tasks;
using Zentric.Domain.Products.Enums;

namespace Zentric.Domain.Products.Ports
{
    public interface IProductRepository
    {
        Task<Product?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
        Task<Product?> GetByVariantIdAsync(Guid variantId, CancellationToken cancellationToken = default);

        /// <summary>
        /// Listado de productos. <paramref name="status"/> acota el estado visible:
        /// <c>Published</c> es el catalogo comercial; <c>null</c> no filtra y devuelve
        /// tambien los suspendidos, que es la vista de gestion del propio dueno.
        /// </summary>
        Task<IReadOnlyList<Product>> GetAllAsync(
            Guid? vendorId = null, ProductStatus? status = null, CancellationToken cancellationToken = default);

        /// <summary>
        /// Version paginada del listado, con el total de coincidencias.
        ///
        /// <paramref name="status"/> se aplica en la misma consulta que el conteo:
        /// el total se cuenta antes del <c>Skip/Take</c>, asi que filtrarlo fuera
        /// dejaria el total y el numero de paginas sin cuadrar.
        /// </summary>
        Task<(IReadOnlyList<Product> Items, int TotalItems)> GetPagedAsync(
            Guid? vendorId, ProductStatus? status, int skip, int take, CancellationToken cancellationToken = default);
        Task AddAsync(Product product, CancellationToken cancellationToken = default);
        Task UpdateAsync(Product product, CancellationToken cancellationToken = default);
    }
}
