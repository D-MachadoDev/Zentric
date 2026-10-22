using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Zentric.Domain.Billing.Ports;
using Zentric.Domain.Billing;
using Zentric.Domain.Billing.Enums;
using Zentric.Infrastructure.Persistence.Models;
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

        public async Task<IReadOnlyList<Invoice>> GetListAsync(
            Guid? buyerId, Guid? vendorId, CancellationToken cancellationToken = default)
        {
            IQueryable<InvoiceDbModel> query = _dbContext.Invoices.AsNoTracking();

            if (buyerId.HasValue)
            {
                // El Comprador solo ve la Factura Maestra de SUS pedidos (ADDENDUM Dominio 9): el
                // ZentricDetail es control interno de plataforma y las facturas de vendedor no son
                // suyas. Los dos filtros se aplican de una vez, en la consulta, para que la
                // factura ajena ni siquiera llegue a materializarse.
                var buyer = buyerId.Value;
                query = query.Where(i =>
                    i.Type == InvoiceType.Master
                    && _dbContext.CustomerOrders.Any(o => o.Id == i.CustomerOrderId && o.BuyerId == buyer));
            }

            if (vendorId.HasValue)
            {
                // El Vendedor solo ve SUS facturas de vendedor. Si no participe, la lista sale
                // vacia: una lista vacia no revela nada.
                var vendor = vendorId.Value;
                query = query.Where(i => i.VendorId == vendor);
            }

            // De la mas reciente a la mas antigua: en un historial de facturas lo relevante es lo
            // mas nuevo. El desempate por Id mantiene el orden estable entre llamadas.
            var list = await query
                .OrderByDescending(i => i.IssuedAt)
                .ThenByDescending(i => i.Id)
                .ToListAsync(cancellationToken);

            return list.Select(InvoiceMapper.ToDomain).ToList();
        }

        public async Task<Invoice?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            // AsNoTracking, igual que el listado por pedido de este repositorio y
            // por el mismo motivo que en los demas (H-15).
            var dbModel = await _dbContext.Invoices
                .AsNoTracking()
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
            TrackedState.ReplaceAsModified(_dbContext, _dbContext.Invoices, dbModel, i => i.Id);
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
