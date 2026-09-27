using System;
using System.Threading;
using System.Threading.Tasks;

namespace Zentric.Domain.Products.Ports
{
    public interface IProductRepository
    {
        Task<Product?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
        Task<Product?> GetByVariantIdAsync(Guid variantId, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<Product>> GetAllAsync(Guid? vendorId = null, CancellationToken cancellationToken = default);
        Task AddAsync(Product product, CancellationToken cancellationToken = default);
        Task UpdateAsync(Product product, CancellationToken cancellationToken = default);
    }
}
