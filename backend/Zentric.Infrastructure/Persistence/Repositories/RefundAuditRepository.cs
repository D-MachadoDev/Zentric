using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Zentric.Domain.Returns;
using Zentric.Domain.Returns.Ports;
using Zentric.Infrastructure.Persistence.Mappers;
using Zentric.Infrastructure.Persistence.Models;

namespace Zentric.Infrastructure.Persistence.Repositories
{
    public sealed class RefundAuditRepository : IRefundAuditRepository
    {
        private readonly ZentricDbContext _context;

        public RefundAuditRepository(ZentricDbContext context)
        {
            _context = context;
        }

        public async Task AddAsync(RefundAudit audit, CancellationToken cancellationToken = default)
        {
            var dbModel = RefundAuditMapper.ToDbModel(audit);
            await _context.Set<RefundAuditDbModel>().AddAsync(dbModel, cancellationToken);
        }

        public async Task<RefundAudit?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var dbModel = await _context.Set<RefundAuditDbModel>()
                .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);
            return dbModel != null ? RefundAuditMapper.ToDomain(dbModel) : null;
        }

        public async Task<IReadOnlyList<RefundAudit>> GetByReturnRequestIdAsync(Guid returnRequestId, CancellationToken cancellationToken = default)
        {
            var dbModels = await _context.Set<RefundAuditDbModel>()
                .Where(a => a.ReturnRequestId == returnRequestId)
                .ToListAsync(cancellationToken);
            return dbModels.Select(RefundAuditMapper.ToDomain).ToList();
        }

        public async Task<IReadOnlyList<RefundAudit>> GetByOrderIdAsync(Guid customerOrderId, CancellationToken cancellationToken = default)
        {
            var dbModels = await _context.Set<RefundAuditDbModel>()
                .Where(a => a.CustomerOrderId == customerOrderId)
                .ToListAsync(cancellationToken);
            return dbModels.Select(RefundAuditMapper.ToDomain).ToList();
        }
    }
}