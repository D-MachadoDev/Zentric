using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Zentric.Domain.Users.Ports
{
    public interface ISellerProfileRepository
    {
        Task<SellerProfile?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
        Task<SellerProfile?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<SellerProfile>> GetVerifiedSellersAsync(int limit = 10, CancellationToken cancellationToken = default);
        Task AddAsync(SellerProfile profile, CancellationToken cancellationToken = default);
        Task UpdateAsync(SellerProfile profile, CancellationToken cancellationToken = default);
    }
}
