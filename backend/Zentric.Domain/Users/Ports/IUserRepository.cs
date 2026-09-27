
using Zentric.Domain.Users.ValueObjects;
using Zentric.Domain.Users.Enums;

namespace Zentric.Domain.Users.Ports
{
    public interface IUserRepository
    {
        Task<User?> GetByIdAsync(Guid id);
        Task<User?> GetByEmailAsync(Email email);
        Task<IReadOnlyList<User>> GetAllAsync(UserRole? role = null, CancellationToken cancellationToken = default);
        Task<bool> IsEmailUniqueAsync(Email email, CancellationToken cancellationToken = default);
        Task<bool> IsIdentityDocumentUniqueAsync(string identityDocument, CancellationToken cancellationToken = default);
        Task AddAsync(User user); //! Reglas de unicidad de email 
        Task UpdateAsync(User user); //! Reglas de unicidad de email 
    }
}