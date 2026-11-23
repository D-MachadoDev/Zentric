using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Zentric.Domain.Products;
using Zentric.Domain.Products.Ports;
using Zentric.Infrastructure.Persistence.Mappers;

namespace Zentric.Infrastructure.Persistence.Repositories
{
    public class ReviewRepository : IReviewRepository
    {
        private readonly ZentricDbContext _dbContext;

        public ReviewRepository(ZentricDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<Review?> GetByProductAndUserAsync(Guid productId, Guid userId, CancellationToken cancellationToken = default)
        {
            var dbModel = await _dbContext.Reviews
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.ProductId == productId && r.UserId == userId, cancellationToken);

            return dbModel == null ? null : ReviewMapper.ToDomain(dbModel);
        }

        public async Task<IReadOnlyList<Review>> GetByProductIdAsync(Guid productId, int page = 0, int size = 20, CancellationToken cancellationToken = default)
        {
            var list = await _dbContext.Reviews
                .AsNoTracking()
                .Where(r => r.ProductId == productId)
                .OrderByDescending(r => r.CreatedAt)
                .Skip(page * size)
                .Take(size)
                .ToListAsync(cancellationToken);

            return list.Select(ReviewMapper.ToDomain).ToList();
        }

        public async Task<int> GetCountByProductIdAsync(Guid productId, CancellationToken cancellationToken = default)
        {
            return await _dbContext.Reviews
                .CountAsync(r => r.ProductId == productId, cancellationToken);
        }

        public async Task AddAsync(Review review, CancellationToken cancellationToken = default)
        {
            var dbModel = ReviewMapper.ToDbModel(review);
            await _dbContext.Reviews.AddAsync(dbModel, cancellationToken);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        public async Task UpdateAsync(Review review, CancellationToken cancellationToken = default)
        {
            var dbModel = await _dbContext.Reviews
                .FirstOrDefaultAsync(r => r.Id == review.Id, cancellationToken);

            if (dbModel != null)
            {
                dbModel.Rating = review.Rating;
                dbModel.Comment = review.Comment;
                dbModel.UpdatedAt = review.UpdatedAt;

                await _dbContext.SaveChangesAsync(cancellationToken);
            }
        }
    }
}
