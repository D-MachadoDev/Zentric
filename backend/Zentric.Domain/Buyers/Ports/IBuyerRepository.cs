using System;
using System.Threading;
using System.Threading.Tasks;

namespace Zentric.Domain.Buyers.Ports
{
    public interface IBuyerRepository
    {
        Task<Buyer?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
        Task AddAsync(Buyer buyer, CancellationToken cancellationToken = default);
        Task UpdateAsync(Buyer buyer, CancellationToken cancellationToken = default);
    }
}
