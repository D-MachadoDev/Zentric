using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Zentric.Domain.Logistics.Ports;
using Zentric.Domain.Logistics;
using Zentric.Infrastructure.Persistence.Mappers;

using Zentric.Domain.Logistics.Enums;
using Zentric.Infrastructure.Persistence.Models;

namespace Zentric.Infrastructure.Persistence.Repositories
{
    public class FulfillmentOrderRepository : IFulfillmentOrderRepository
    {
        private readonly ZentricDbContext _dbContext;

        public FulfillmentOrderRepository(ZentricDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<IReadOnlyList<FulfillmentOrder>> GetListAsync(
            Guid? vendorId, Guid? buyerId, FulfillmentStatus? status, CancellationToken cancellationToken = default)
        {
            // Tipo explicito por el mismo motivo que en CustomerOrderRepository: con "var" los
            // Where encadenados sobre una consulta que ya trae Include no resuelven.
            IQueryable<FulfillmentOrderDbModel> query = _dbContext.FulfillmentOrders
                .AsNoTracking()
                .Include(o => o.Shipments);

            // El filtro va en la consulta (Q-21b). Traerlo todo y descartar en memoria daria el
            // mismo resultado visible, pero moveria por la base los despachos de otros
            // vendedores: esa es exactamente la superficie que la propiedad oculta.
            if (vendorId.HasValue)
            {
                query = query.Where(o => o.VendorId == vendorId.Value);
            }

            if (buyerId.HasValue)
            {
                // El despacho no guarda al comprador: guarda el pedido. Se resuelve por ahi, que
                // es donde vive el BuyerId (Q-21b).
                var buyer = buyerId.Value;
                query = query.Where(o => _dbContext.CustomerOrders.Any(co => co.Id == o.CustomerOrderId && co.BuyerId == buyer));
            }
            if (status.HasValue)
            {
                query = query.Where(o => o.Status == status.Value);
            }

            // Del mas reciente al mas antiguo: en la cola de despacho lo relevante es lo que entro
            // despues. El desempate por Id mantiene el orden estable entre llamadas.
            var list = await query
                .OrderByDescending(o => o.UpdatedAt)
                .ThenByDescending(o => o.Id)
                .ToListAsync(cancellationToken);

            return list.Select(FulfillmentOrderMapper.ToDomain).ToList();
        }

        public async Task<IReadOnlyList<FulfillmentOrder>> GetByCustomerOrderIdAsync(
            Guid customerOrderId, CancellationToken cancellationToken = default)
        {
            // PED-05: el minimo comun se calcula sobre TODOS los despachos del pedido,
            // incluidos los cancelados (se excluyen despues, en el servicio de dominio,
            // porque un cancelado no bloquea al maestro). Por eso no se filtra por estado.
            var dbModels = await _dbContext.FulfillmentOrders
                .AsNoTracking()
                .Include(o => o.Shipments)
                .Where(o => o.CustomerOrderId == customerOrderId)
                .ToListAsync(cancellationToken);

            return dbModels.Select(FulfillmentOrderMapper.ToDomain).ToList();
        }

        public async Task<FulfillmentOrder?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            // AsNoTracking: la lectura devuelve un objeto de dominio independiente.
            // Con la fila rastreada, el Update posterior adjuntaria un segundo
            // instancia con la misma clave y el despacho no se podria persistir
            // (H-15, mismo fallo que en devoluciones).
            var dbModel = await _dbContext.FulfillmentOrders
                .AsNoTracking()
                .Include(o => o.Shipments)
                .FirstOrDefaultAsync(o => o.Id == id, cancellationToken);
            return dbModel == null ? null : FulfillmentOrderMapper.ToDomain(dbModel);
        }

        public Task AddAsync(FulfillmentOrder order, CancellationToken cancellationToken = default)
        {
            var dbModel = FulfillmentOrderMapper.ToDbModel(order);
            _dbContext.FulfillmentOrders.Add(dbModel);
            return Task.CompletedTask;
        }

        public Task UpdateAsync(FulfillmentOrder order, CancellationToken cancellationToken = default)
        {
            var dbModel = FulfillmentOrderMapper.ToDbModel(order);
            _dbContext.FulfillmentOrders.Update(dbModel);
            return Task.CompletedTask;
        }
    }
}
