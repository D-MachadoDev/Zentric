using Microsoft.EntityFrameworkCore;
using Zentric.Domain.Users;
using Zentric.Domain.Users.Enums;
using Zentric.Domain.Users.Ports;
using Zentric.Domain.Users.ValueObjects;
using Zentric.Infrastructure.Persistence.Mappers;

namespace Zentric.Infrastructure.Persistence.Repositories
{
    public class UserRepository : IUserRepository
    {
        private readonly ZentricDbContext _dbContext;

        public UserRepository(ZentricDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<User?> GetByIdAsync(Guid id)
        {
            var dbModel = await _dbContext.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id);
            return dbModel != null ? UserDbModelMapper.ToDomain(dbModel) : null;
        }

        public async Task<User?> GetByEmailAsync(Email email)
        {
            var dbModel = await _dbContext.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Email == email.Value);
            return dbModel != null ? UserDbModelMapper.ToDomain(dbModel) : null;
        }

        public async Task<IReadOnlyList<User>> GetAllAsync(UserRole? role = null, CancellationToken cancellationToken = default)
        {
            var query = _dbContext.Users.AsNoTracking();
            if (role.HasValue)
            {
                query = query.Where(u => u.Role == role.Value);
            }
            var list = await query.ToListAsync(cancellationToken);
            return list.Select(UserDbModelMapper.ToDomain).ToList();
        }

        public async Task<bool> IsEmailUniqueAsync(Email email, CancellationToken cancellationToken = default)
        {
            return !await _dbContext.Users.AnyAsync(u => u.Email == email.Value, cancellationToken);
        }

        public async Task<bool> IsIdentityDocumentUniqueAsync(string identityDocument, CancellationToken cancellationToken = default)
        {
            return !await _dbContext.Users.AnyAsync(u => u.IdentityDocument == identityDocument, cancellationToken);
        }

        public async Task AddAsync(User user)
        {
            var dbModel = UserDbModelMapper.ToDbModel(user);
            await _dbContext.Users.AddAsync(dbModel);
        }

        public Task UpdateAsync(User user)
        {
            var dbModel = UserDbModelMapper.ToDbModel(user);
            _dbContext.Users.Update(dbModel);
            return Task.CompletedTask;
        }
    }
}
