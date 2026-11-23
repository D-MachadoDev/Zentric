using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Zentric.Domain.Users;
using Zentric.Domain.Users.Ports;
using Zentric.Infrastructure.Persistence.Models;

namespace Zentric.Infrastructure.Persistence.Repositories
{
    public class PasswordResetTokenRepository : IPasswordResetTokenRepository
    {
        private readonly ZentricDbContext _dbContext;

        public PasswordResetTokenRepository(ZentricDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task AddAsync(PasswordResetToken token, CancellationToken cancellationToken = default)
        {
            var dbModel = ToDbModel(token);
            await _dbContext.Set<PasswordResetTokenDbModel>().AddAsync(dbModel, cancellationToken);
        }

        public async Task<PasswordResetToken?> GetByTokenHashAsync(string tokenHash, CancellationToken cancellationToken = default)
        {
            var normalizedHash = tokenHash.Trim().ToLowerInvariant();
            var dbModel = await _dbContext.Set<PasswordResetTokenDbModel>()
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.TokenHash == normalizedHash, cancellationToken);

            return dbModel != null ? ToDomain(dbModel) : null;
        }

        public Task UpdateAsync(PasswordResetToken token, CancellationToken cancellationToken = default)
        {
            var dbModel = ToDbModel(token);
            TrackedState.ReplaceAsModified(_dbContext, _dbContext.Set<PasswordResetTokenDbModel>(), dbModel, t => t.Id);
            return Task.CompletedTask;
        }

        public async Task InvalidateActiveTokensForUserAsync(Guid userId, CancellationToken cancellationToken = default)
        {
            var activeTokens = await _dbContext.Set<PasswordResetTokenDbModel>()
                .Where(t => t.UserId == userId && t.UsedAt == null)
                .ToListAsync(cancellationToken);

            var now = DateTime.UtcNow;
            foreach (var token in activeTokens)
            {
                token.UsedAt = now;
            }
        }

        private static PasswordResetTokenDbModel ToDbModel(PasswordResetToken domain)
        {
            return new PasswordResetTokenDbModel
            {
                Id = domain.Id,
                UserId = domain.UserId,
                TokenHash = domain.TokenHash,
                CreatedAt = domain.CreatedAt,
                ExpiresAt = domain.ExpiresAt,
                UsedAt = domain.UsedAt,
            };
        }

        private static PasswordResetToken ToDomain(PasswordResetTokenDbModel db)
        {
            return new PasswordResetToken(
                db.Id,
                db.UserId,
                db.TokenHash,
                db.CreatedAt,
                db.ExpiresAt,
                db.UsedAt
            );
        }
    }
}
