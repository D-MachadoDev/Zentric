using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Zentric.Domain.Products.Ports
{
    public interface IReviewRepository
    {
        Task<Review?> GetByProductAndUserAsync(Guid productId, Guid userId, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<Review>> GetByProductIdAsync(Guid productId, int page = 0, int size = 20, CancellationToken cancellationToken = default);
        Task<int> GetCountByProductIdAsync(Guid productId, CancellationToken cancellationToken = default);
        Task AddAsync(Review review, CancellationToken cancellationToken = default);
        Task UpdateAsync(Review review, CancellationToken cancellationToken = default);
    }
}
