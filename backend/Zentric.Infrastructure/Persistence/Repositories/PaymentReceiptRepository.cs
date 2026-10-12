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
            // AsNoTracking NO rellena colecciones por convencion: sin Include, la
            // lista de creditos vuelve vacia aunque en la base haya filas, y el
            // comprobante pareceria sin historial cada vez que se lee. ADR-0020
            // decision 7 pide poder responder de cada credito, y eso solo es
            // cierto si el lector los ve.
            var dbModel = await _dbContext.PaymentReceipts
                .AsNoTracking()
                .Include(r => r.Credits)
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
            var model = PaymentReceiptMapper.ToDbModel(receipt);
            _dbContext.PaymentReceipts.Update(model);

            // DbSet.Update marca todo el grafo como Modified porque las claves
            // vienen rellenadas. Para el comprobante esta bien, que su fila ya
            // existe; para un credito nuevo es un error silencioso: EF lanza un
            // UPDATE contra una fila que aun no existe, la base afecta 0 filas y
            // eso se convierte en DbUpdateConcurrencyException (500).
            //
            // La diferencia no la puede deducir EF: la clave es un Guid que el
            // dominio genera al crear el credito, asi que "tiene Id" no significa
            // "estaba en la base". Se pregunta. Son poquitas filas y el indice es
            // el propio Id.
            foreach (var credit in model.Credits)
            {
                var alreadyRecorded = await _dbContext.RefundCredits
                    .AnyAsync(c => c.Id == credit.Id, cancellationToken);

                if (!alreadyRecorded)
                {
                    // El owner de una entidad owned (Amount) hereda su estado, y
                    // Update() ya dejo ese Owned en Modified: queda entonces
                    // "owner Added / owned Modified" sobre la misma fila, que EF
                    // lo rechaza. Se alinean los dos a Added.
                    var creditEntry = _dbContext.Entry(credit);
                    creditEntry.State = EntityState.Added;
                    _dbContext.Entry(credit.Amount).State = EntityState.Added;
                }
            }
        }
    }
}