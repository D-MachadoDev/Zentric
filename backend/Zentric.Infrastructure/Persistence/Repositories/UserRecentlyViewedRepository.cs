using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Zentric.Domain.Products;
using Zentric.Domain.Products.Ports;
using Zentric.Infrastructure.Persistence.Models;

namespace Zentric.Infrastructure.Persistence.Repositories
{
    public class UserRecentlyViewedRepository : IUserRecentlyViewedRepository
    {
        private readonly ZentricDbContext _dbContext;

        public UserRecentlyViewedRepository(ZentricDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<IReadOnlyList<UserRecentlyViewed>> GetByUserIdAsync(Guid userId, int maxItems = 20, CancellationToken cancellationToken = default)
        {
            var dbModels = await _dbContext.UserRecentlyViewed
                .AsNoTracking()
                .Where(x => x.UserId == userId)
                .OrderByDescending(x => x.ViewedAt)
                .Take(maxItems)
                .ToListAsync(cancellationToken);

            return dbModels.Select(ToDomain).ToList();
        }

        public async Task UpsertAsync(Guid userId, Guid productId, DateTime viewedAt, CancellationToken cancellationToken = default)
        {
            var existing = await _dbContext.UserRecentlyViewed
                .FirstOrDefaultAsync(x => x.UserId == userId && x.ProductId == productId, cancellationToken);

            if (existing != null)
            {
                existing.ViewedAt = viewedAt;
                _dbContext.UserRecentlyViewed.Update(existing);
            }
            else
            {
                var newEntry = new UserRecentlyViewedDbModel
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    ProductId = productId,
                    ViewedAt = viewedAt
                };
                await _dbContext.UserRecentlyViewed.AddAsync(newEntry, cancellationToken);
            }
        }

        public async Task ClearAsync(Guid userId, CancellationToken cancellationToken = default)
        {
            var entries = await _dbContext.UserRecentlyViewed
                .Where(x => x.UserId == userId)
                .ToListAsync(cancellationToken);

            if (entries.Count > 0)
            {
                _dbContext.UserRecentlyViewed.RemoveRange(entries);
            }
        }

        private static UserRecentlyViewed ToDomain(UserRecentlyViewedDbModel dbModel)
        {
            var domain = new UserRecentlyViewed(dbModel.UserId, dbModel.ProductId, dbModel.ViewedAt);
            // Id is not exposed in domain, but we could track it if needed
            return domain;
        }
    }
}