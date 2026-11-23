using System;
using System.Threading;
using System.Threading.Tasks;

namespace Zentric.Domain.Users.Ports
{
    public interface IPasswordResetTokenRepository
    {
        Task AddAsync(PasswordResetToken token, CancellationToken cancellationToken = default);
        Task<PasswordResetToken?> GetByTokenHashAsync(string tokenHash, CancellationToken cancellationToken = default);
        Task UpdateAsync(PasswordResetToken token, CancellationToken cancellationToken = default);
        Task InvalidateActiveTokensForUserAsync(Guid userId, CancellationToken cancellationToken = default);
    }
}
