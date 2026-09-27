using Zentric.Domain.Returns;

namespace Zentric.Domain.Returns.Ports
{
    public interface IReturnRequestRepository
    {
        Task<ReturnRequest?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
        Task AddAsync(ReturnRequest request, CancellationToken cancellationToken = default);
        Task UpdateAsync(ReturnRequest request, CancellationToken cancellationToken = default);
    }
}
