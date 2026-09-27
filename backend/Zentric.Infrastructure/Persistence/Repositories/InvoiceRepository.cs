using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Zentric.Domain.Billing.Ports;
using Zentric.Domain.Billing;
using Zentric.Infrastructure.Persistence.Mappers;

namespace Zentric.Infrastructure.Persistence.Repositories
{
    public class InvoiceRepository : IInvoiceRepository
    {
        private readonly ZentricDbContext _dbContext;

        public InvoiceRepository(ZentricDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<Invoice?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var dbModel = await _dbContext.Invoices
                .FirstOrDefaultAsync(o => o.Id == id, cancellationToken);
            return dbModel == null ? null : InvoiceMapper.ToDomain(dbModel);
        }

        public async Task<IReadOnlyList<Invoice>> GetByOrderIdAsync(Guid orderId, CancellationToken cancellationToken = default)
        {
            var list = await _dbContext.Invoices
                .AsNoTracking()
                .Where(i => i.CustomerOrderId == orderId)
                .ToListAsync(cancellationToken);
            return list.Select(InvoiceMapper.ToDomain).ToList();
        }

        public Task AddAsync(Invoice invoice, CancellationToken cancellationToken = default)
        {
            var dbModel = InvoiceMapper.ToDbModel(invoice);
            _dbContext.Invoices.Add(dbModel);
            return Task.CompletedTask;
        }

        public Task UpdateAsync(Invoice invoice, CancellationToken cancellationToken = default)
        {
            var dbModel = InvoiceMapper.ToDbModel(invoice);
            _dbContext.Invoices.Update(dbModel);
            return Task.CompletedTask;
        }

        public Task AddRangeAsync(System.Collections.Generic.IEnumerable<Invoice> invoices, CancellationToken cancellationToken = default)
        {
            var dbModels = System.Linq.Enumerable.Select(invoices, InvoiceMapper.ToDbModel);
            _dbContext.Invoices.AddRange(dbModels);
            return Task.CompletedTask;
        }
    }
}
