using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Zentric.Domain.Users;
using Zentric.Domain.Users.Ports;
using Zentric.Infrastructure.Persistence.Mappers;

namespace Zentric.Infrastructure.Persistence.Repositories
{
    public class SellerProfileRepository : ISellerProfileRepository
    {
        private readonly ZentricDbContext _dbContext;

        public SellerProfileRepository(ZentricDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<SellerProfile?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
        {
            var dbModel = await _dbContext.SellerProfiles
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.UserId == userId, cancellationToken);

            return dbModel == null ? null : SellerProfileMapper.ToDomain(dbModel);
        }

        public async Task<SellerProfile?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var dbModel = await _dbContext.SellerProfiles
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

            return dbModel == null ? null : SellerProfileMapper.ToDomain(dbModel);
        }

        public async Task<IReadOnlyList<SellerProfile>> GetVerifiedSellersAsync(int limit = 10, CancellationToken cancellationToken = default)
        {
            var list = await _dbContext.SellerProfiles
                .AsNoTracking()
                .Where(s => s.IsVerified)
                .OrderBy(s => s.StoreName)
                .Take(limit)
                .ToListAsync(cancellationToken);

            return list.Select(SellerProfileMapper.ToDomain).ToList();
        }

        public async Task AddAsync(SellerProfile profile, CancellationToken cancellationToken = default)
        {
            var dbModel = SellerProfileMapper.ToDbModel(profile);
            await _dbContext.SellerProfiles.AddAsync(dbModel, cancellationToken);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        public async Task UpdateAsync(SellerProfile profile, CancellationToken cancellationToken = default)
        {
            var dbModel = await _dbContext.SellerProfiles
                .FirstOrDefaultAsync(s => s.Id == profile.Id, cancellationToken);

            if (dbModel != null)
            {
                dbModel.StoreName = profile.StoreName;
                dbModel.LogoUrl = profile.LogoUrl;
                dbModel.IsVerified = profile.IsVerified;
                dbModel.UpdatedAt = profile.UpdatedAt;

                await _dbContext.SaveChangesAsync(cancellationToken);
            }
        }
    }
}
