using System.Threading;
using System.Threading.Tasks;

namespace Zentric.Application.Common.Ports
{
    public interface IUnitOfWork
    {
        Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}
