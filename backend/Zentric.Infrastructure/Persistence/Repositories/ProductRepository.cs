using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Zentric.Domain.Products;
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
            var dbModel = await _dbContext.Products
                .Include(p => p.Variants)
                .ThenInclude(v => v.Attributes)
                .FirstOrDefaultAsync(o => o.Id == id, cancellationToken);
            return dbModel == null ? null : ProductMapper.ToDomain(dbModel);
        }

        public async Task<Product?> GetByVariantIdAsync(Guid variantId, CancellationToken cancellationToken = default)
        {
            var dbModel = await _dbContext.Products
                .Include(p => p.Variants)
                .ThenInclude(v => v.Attributes)
                .FirstOrDefaultAsync(p => p.Variants.Any(v => v.Id == variantId), cancellationToken);
            return dbModel == null ? null : ProductMapper.ToDomain(dbModel);
        }

        public async Task<IReadOnlyList<Product>> GetAllAsync(Guid? vendorId = null, CancellationToken cancellationToken = default)
        {
            var query = _dbContext.Products
                .Include(p => p.Variants)
                .ThenInclude(v => v.Attributes)
                .AsNoTracking();

            if (vendorId.HasValue)
            {
                query = query.Where(p => p.VendorId == vendorId.Value);
            }

            var list = await query.ToListAsync(cancellationToken);
            return list.Select(ProductMapper.ToDomain).ToList();
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
