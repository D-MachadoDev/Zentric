using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Zentric.Domain.Products;
using Zentric.Domain.Products.Enums;
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
            => GetPagedAsync(vendorId, status, skip, take, null, cancellationToken);

        public async Task<(IReadOnlyList<Product> Items, int TotalItems)> GetPagedAsync(
            Guid? vendorId, ProductStatus? status, int skip, int take, string? category, CancellationToken cancellationToken = default)
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

            // El total se cuenta antes de aplicar Skip/Take: es lo que permite
            // al cliente saber cuantas paginas existen.
            var total = await query.CountAsync(cancellationToken);

            var page = await query
                .OrderBy(p => p.CreatedAt)
                .Skip(skip)
                .Take(take)
                .ToListAsync(cancellationToken);

            return (page.Select(ProductMapper.ToDomain).ToList(), total);
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
            _dbContext.Products.Update(dbModel);
            return Task.CompletedTask;
        }
    }
}
