using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Zentric.Domain.Products;
using Zentric.Domain.Products.Enums;
using Zentric.Domain.Products.Ports;
using Zentric.Infrastructure.Persistence.Mappers;


namespace Zentric.Infrastructure.Persistence.Repositories
{
    public class ProductRepository : Zentric.Domain.Products.Ports.IProductRepository
    {
        private readonly ZentricDbContext _dbContext;

        public ProductRepository(ZentricDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<Product?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            // AsNoTracking por el mismo motivo que los listados de este repositorio
            // y que CustomerOrderRepository: el Update posterior adjunta un DbModel
            // nuevo y chocaria con la fila rastreada (H-15).
            var dbModel = await _dbContext.Products
                .AsNoTracking()
                .Include(p => p.Variants)
                .ThenInclude(v => v.Attributes)
                .FirstOrDefaultAsync(o => o.Id == id, cancellationToken);
            return dbModel == null ? null : ProductMapper.ToDomain(dbModel);
        }

        public async Task<Product?> GetByVariantIdAsync(Guid variantId, CancellationToken cancellationToken = default)
        {
            var dbModel = await _dbContext.Products
                .AsNoTracking()
                .Include(p => p.Variants)
                .ThenInclude(v => v.Attributes)
                .FirstOrDefaultAsync(p => p.Variants.Any(v => v.Id == variantId), cancellationToken);
            return dbModel == null ? null : ProductMapper.ToDomain(dbModel);
        }

        public Task<IReadOnlyList<Product>> GetAllAsync(
            Guid? vendorId = null, ProductStatus? status = null, CancellationToken cancellationToken = default)
            => GetAllAsync(vendorId, status, null, cancellationToken);

        public async Task<IReadOnlyList<Product>> GetAllAsync(
            Guid? vendorId, ProductStatus? status, string? category, CancellationToken cancellationToken = default)
        {
            var query = _dbContext.Products
                .Include(p => p.Variants)
                .ThenInclude(v => v.Attributes)
                .AsNoTracking();

            if (vendorId.HasValue)
            {
                query = query.Where(p => p.VendorId == vendorId.Value);
            }

            // Q-27: el estado se filtr aqui, en SQL, y no en el handler. El filtro de
            // visibilidad es una regla de negocio (ZENTRIC.md:101) y su lugar es la
            // capa de aplicacion, pero aplicarlo aqui evita traer la tabla entera
            // para descartarla en memoria.
            if (status.HasValue)
            {
                query = query.Where(p => p.Status == status.Value);
            }

            if (!string.IsNullOrWhiteSpace(category) && !string.Equals(category, "all", StringComparison.OrdinalIgnoreCase))
            {
                var catLower = category.Trim().ToLower();
                query = query.Where(p => p.Category != null && p.Category.ToLower() == catLower);
            }

            var list = await query.ToListAsync(cancellationToken);
            return list.Select(ProductMapper.ToDomain).ToList();
        }

        public Task<(IReadOnlyList<Product> Items, int TotalItems)> GetPagedAsync(
            Guid? vendorId, ProductStatus? status, int skip, int take, CancellationToken cancellationToken = default)
            => GetPagedAsync(vendorId, status, skip, take, null, null, ProductSort.Relevance, null, cancellationToken);

        public Task<(IReadOnlyList<Product> Items, int TotalItems)> GetPagedAsync(
            Guid? vendorId, ProductStatus? status, int skip, int take, string? category, CancellationToken cancellationToken = default)
            => GetPagedAsync(vendorId, status, skip, take, category, null, ProductSort.Relevance, null, cancellationToken);

        public async Task<(IReadOnlyList<Product> Items, int TotalItems)> GetPagedAsync(
            Guid? vendorId, ProductStatus? status, int skip, int take, string? category,
            string? search, ProductSort sort, ProductType? type, CancellationToken cancellationToken = default)
        {
            var query = _dbContext.Products
                .Include(p => p.Variants)
                .ThenInclude(v => v.Attributes)
                .AsNoTracking();

            if (vendorId.HasValue)
            {
                query = query.Where(p => p.VendorId == vendorId.Value);
            }

            // Q-27: el mismo filtro del conteo y de la pagina, asi el total refleja
            // solo lo visible. Contar sin filtrar y despues descartar dejaria un
            // total inflado y menos elementos de los pedidos por pagina.
            if (status.HasValue)
            {
                query = query.Where(p => p.Status == status.Value);
            }

            if (!string.IsNullOrWhiteSpace(category) && !string.Equals(category, "all", StringComparison.OrdinalIgnoreCase))
            {
                var catLower = category.Trim().ToLower();
                query = query.Where(p => p.Category != null && p.Category.ToLower() == catLower);
            }

            // S3: busqueda libre sobre nombre o descripcion, insensible a mayusculas
            // (el borde ya la recorto). Se usa ToLower() como en el filtro de categoria
            // para que la traduccion a SQL sea la misma (lower + LIKE) y no dependa del
            // proveedor de base de datos.
            if (!string.IsNullOrWhiteSpace(search))
            {
                var searchLower = search.Trim().ToLower();
                query = query.Where(p =>
                    p.Name.ToLower().Contains(searchLower) ||
                    p.Description.ToLower().Contains(searchLower));
            }

            // S3: el tipo acota el catalogo (Fisico con stock/logistica vs Digital).
            if (type.HasValue)
            {
                query = query.Where(p => p.Type == type.Value);
            }

            // El total se cuenta antes de aplicar Skip/Take: es lo que permite
            // al cliente saber cuantas paginas existen.
            var total = await query.CountAsync(cancellationToken);

            // S3: relevance conserva el orden historico (CreatedAt asc); los ordenes por
            // precio usan CreatedAt como desempate para que la paginacion sea estable
            // cuando dos productos comparten precio.
            query = sort switch
            {
                ProductSort.PriceAsc => query.OrderBy(p => p.Price.Amount).ThenBy(p => p.CreatedAt),
                ProductSort.PriceDesc => query.OrderByDescending(p => p.Price.Amount).ThenBy(p => p.CreatedAt),
                _ => query.OrderBy(p => p.CreatedAt),
            };

            var page = await query
                .Skip(skip)
                .Take(take)
                .ToListAsync(cancellationToken);

            return (page.Select(ProductMapper.ToDomain).ToList(), total);
        }

        /// <summary>
        /// Obtiene las categorías distintas con conteo de productos publicados.
        /// Solo incluye categorías que tienen al menos un producto publicado.
        /// </summary>
        public async Task<IReadOnlyList<Zentric.Domain.Products.Ports.CategoryDto>> GetCategoriesWithCountAsync(CancellationToken cancellationToken = default)
        {
            // La agrupacion y el conteo se resuelven en PostgreSQL: la clave del
            // grupo es la categoria normalizada (Trim + ToLower), que PostgreSQL
            // traduce a `btrim(lower(...))`.
            //
            // La capitalizacion de la primera letra NO puede vivir en la
            // proyeccion: `char.ToUpper(...) + Substring(1)` es manipulacion de
            // cadenas de .NET que EF Core no sabe traducir a SQL y la consulta
            // entera reventaba con InvalidOperationException ("could not be
            // translated") en cada peticion a /api/catalog/categories. Por eso
            // el agrupado baja a la base y la presentacion se resuelve en
            // memoria, que es donde vive esa regla de formato.
            var groups = await _dbContext.Products
                .Where(p => p.Status == ProductStatus.Published && p.Category != null && p.Category != "")
                .GroupBy(p => p.Category!.Trim().ToLower())
                .Select(g => new CategoryGroup(g.Key, g.Count()))
                .ToListAsync(cancellationToken);

            return groups
                .Select(g => new Zentric.Domain.Products.Ports.CategoryDto(
                    g.Id,
                    Capitalize(g.Id),
                    g.ProductCount))
                .OrderByDescending(c => c.ProductCount)
                .ThenBy(c => c.Name)
                .ToList();
        }

        /// <summary>
        /// Grupo categoria/conteo en memoria. Es un tipo concreto y no una
        /// proyeccion anonima para que el nombre de la propiedad llegue
        /// intacto al cliente de PostgreSQL.
        /// </summary>
        private sealed record CategoryGroup(string Id, int ProductCount);

        /// <summary>
        /// Primera letra en mayuscula, resto intacto. Regla de presentacion
        /// (backendSDD/Presentation/01-endpoints.md, endpoint de categorias).
        /// </summary>
        private static string Capitalize(string value)
        {
            if (string.IsNullOrEmpty(value)) return value;
            return char.ToUpperInvariant(value[0]) + value.Substring(1);
        }

        /// <summary>
        /// Obtiene una muestra aleatoria de productos publicados para el hero/mosaico.
        /// Usa ORDER BY RANDOM() para aleatoriedad en PostgreSQL.
        /// </summary>
        public async Task<IReadOnlyList<Product>> GetHeroProductsAsync(int count, CancellationToken cancellationToken = default)
        {
            if (count <= 0) return Array.Empty<Product>();

            // PostgreSQL usa RANDOM() para ordenamiento aleatorio
            var products = await _dbContext.Products
                .Where(p => p.Status == ProductStatus.Published)
                .Include(p => p.Variants)
                .ThenInclude(v => v.Attributes)
                .OrderBy(p => EF.Functions.Random())
                .Take(count)
                .AsNoTracking()
                .ToListAsync(cancellationToken);

            return products.Select(ProductMapper.ToDomain).ToList();
        }

        public Task AddAsync(Product product, CancellationToken cancellationToken = default)
        {
            var dbModel = ProductMapper.ToDbModel(product);
            _dbContext.Products.Add(dbModel);
            return Task.CompletedTask;
        }

        public Task UpdateAsync(Product product, CancellationToken cancellationToken = default)
        {
            var dbModel = ProductMapper.ToDbModel(product);
            TrackedState.ReplaceAsModified(_dbContext, _dbContext.Products, dbModel, p => p.Id);
            return Task.CompletedTask;
        }
    }
}