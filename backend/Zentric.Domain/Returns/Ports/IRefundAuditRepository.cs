using System;
using System.Threading;
using System.Threading.Tasks;
using Zentric.Domain.Returns;

namespace Zentric.Domain.Returns.Ports
{
    /// <summary>
    /// Puerto para persistir y consultar auditorías de reembolso (ADR-0020).
    /// </summary>
    public interface IRefundAuditRepository
    {
        Task AddAsync(RefundAudit audit, CancellationToken cancellationToken = default);
        Task<RefundAudit?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
        Task<System.Collections.Generic.IReadOnlyList<RefundAudit>> GetByReturnRequestIdAsync(Guid returnRequestId, CancellationToken cancellationToken = default);
        Task<System.Collections.Generic.IReadOnlyList<RefundAudit>> GetByOrderIdAsync(Guid customerOrderId, CancellationToken cancellationToken = default);
    }
}