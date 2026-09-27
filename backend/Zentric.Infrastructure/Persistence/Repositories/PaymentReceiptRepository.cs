using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Zentric.Domain.Payments;
using Zentric.Domain.Payments.Ports;
using Zentric.Infrastructure.Persistence.Mappers;

namespace Zentric.Infrastructure.Persistence.Repositories
{
    public class PaymentReceiptRepository : IPaymentReceiptRepository
    {
        private readonly ZentricDbContext _dbContext;

        public PaymentReceiptRepository(ZentricDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<PaymentReceipt?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var dbModel = await _dbContext.PaymentReceipts
                .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
            return dbModel == null ? null : PaymentReceiptMapper.ToDomain(dbModel);
        }

        public async Task<PaymentReceipt?> GetByOrderIdAsync(Guid orderId, CancellationToken cancellationToken = default)
        {
            // Un comprobante por pedido: se toma el mas reciente para que un
            // reintento de cobro no oculte el historial.
            var dbModel = await _dbContext.PaymentReceipts
                .AsNoTracking()
                .Where(r => r.OrderId == orderId)
                .OrderByDescending(r => r.CreatedAt)
                .FirstOrDefaultAsync(cancellationToken);
            return dbModel == null ? null : PaymentReceiptMapper.ToDomain(dbModel);
        }

        public async Task AddAsync(PaymentReceipt receipt, CancellationToken cancellationToken = default)
        {
            await _dbContext.PaymentReceipts.AddAsync(PaymentReceiptMapper.ToDbModel(receipt), cancellationToken);
        }

        public async Task UpdateAsync(PaymentReceipt receipt, CancellationToken cancellationToken = default)
        {
            _dbContext.PaymentReceipts.Update(PaymentReceiptMapper.ToDbModel(receipt));
        }
    }
}