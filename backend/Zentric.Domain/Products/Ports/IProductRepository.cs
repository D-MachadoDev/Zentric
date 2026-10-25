using System;
using System.Collections.Generic;
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

        Task<IReadOnlyList<Product>> GetAllAsync(
            Guid? vendorId, ProductStatus? status, string? category, CancellationToken cancellationToken = default)
            => GetAllAsync(vendorId, status, cancellationToken);

        /// <summary>
        /// Version paginada del listado, con el total de coincidencias.
        ///
        /// <paramref name="status"/> se aplica en la misma consulta que el conteo:
        /// el total se cuenta antes del <c>Skip/Take</c>, asi que filtrarlo fuera
        /// dejaria el total y el numero de paginas sin cuadrar.
        /// </summary>
        Task<(IReadOnlyList<Product> Items, int TotalItems)> GetPagedAsync(
            Guid? vendorId, ProductStatus? status, int skip, int take, CancellationToken cancellationToken = default);

        Task<(IReadOnlyList<Product> Items, int TotalItems)> GetPagedAsync(
            Guid? vendorId, ProductStatus? status, int skip, int take, string? category, CancellationToken cancellationToken = default)
            => GetPagedAsync(vendorId, status, skip, take, cancellationToken);

        /// <summary>
        /// Version paginada con los filtros del catalogo del comprador (S3): busqueda
        /// por texto, orden y tipo. Los tres son opcionales en el contrato HTTP y su
        /// ausencia equivale a <c>search == null</c>, <see cref="ProductSort.Relevance"/>
        /// y <c>type == null</c>, que reproducen el listado categorico de siempre.
        ///
        /// <paramref name="search"/> baja ya recortado y en minusculas: el repositorio
        /// aplica el filtro, no decide si existe. El filtro recae sobre <c>Name</c> o
        /// <c>Description</c> con <c>contains</c> insensible a mayusculas.
        ///
        /// La implementacion por defecto delega en el overload categorico para no
        /// romper a los dobles de prueba que solo conocen el contrato anterior; un
        /// implementador que deba honrar los filtros nuevos lo sobrescribe (el
        /// repositorio de Postgres es el unico adaptador real y si lo implementa).
        /// </summary>
        Task<(IReadOnlyList<Product> Items, int TotalItems)> GetPagedAsync(
            Guid? vendorId, ProductStatus? status, int skip, int take, string? category,
            string? search, ProductSort sort, ProductType? type, CancellationToken cancellationToken = default)
            => GetPagedAsync(vendorId, status, skip, take, category, cancellationToken);

        /// <summary>
        /// Obtiene las categorías distintas con conteo de productos publicados.
        /// Solo incluye categorías que tienen al menos un producto publicado.
        /// </summary>
        Task<IReadOnlyList<CategoryDto>> GetCategoriesWithCountAsync(CancellationToken cancellationToken = default);

        /// <summary>
        /// Obtiene una muestra aleatoria de productos publicados para el hero/mosaico.
        /// </summary>
        Task<IReadOnlyList<Product>> GetHeroProductsAsync(int count, CancellationToken cancellationToken = default);

        Task AddAsync(Product product, CancellationToken cancellationToken = default);
        Task UpdateAsync(Product product, CancellationToken cancellationToken = default);
    }

    /// <summary>
    /// Orden del listado paginado del catalogo (contrato S3).
    ///
    /// El contrato HTTP usa valores con guion (<c>price-asc</c>) que no pueden ser
    /// nombres de miembro de enum; el borde los traduce a este tipo antes de bajar
    /// al repositorio, de modo que la capa de persistencia no compara cadenas magicas.
    /// </summary>
    public enum ProductSort
    {
        /// <summary>Orden por relevancia: fecha de creacion ascendente (el orden historico).</summary>
        Relevance = 0,

        /// <summary>Precio ascendente (menor primero).</summary>
        PriceAsc = 1,

        /// <summary>Precio descendente (mayor primero).</summary>
        PriceDesc = 2,
    }

    /// <summary>
    /// DTO para categorías con conteo de productos.
    /// </summary>
    public sealed record CategoryDto(string Id, string Name, int ProductCount);
}
