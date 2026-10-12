using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Zentric.Domain.Returns.Ports;
using Zentric.Domain.Returns;
using Zentric.Domain.Returns.Enums;
using Zentric.Infrastructure.Persistence.Models;
using Zentric.Infrastructure.Persistence.Mappers;

namespace Zentric.Infrastructure.Persistence.Repositories
{
    public class ReturnRequestRepository : IReturnRequestRepository
    {
        private readonly ZentricDbContext _dbContext;
        private readonly IDomainEventDispatcher _domainEventDispatcher;

        public ReturnRequestRepository(ZentricDbContext dbContext, IDomainEventDispatcher domainEventDispatcher)
        {
            _dbContext = dbContext;
            _domainEventDispatcher = domainEventDispatcher;
        }

        public async Task<IReadOnlyList<ReturnRequest>> GetListAsync(
            Guid? buyerId, Guid? vendorId, ReturnStatus? status, CancellationToken cancellationToken = default)
        {
            IQueryable<ReturnRequestDbModel> query = _dbContext.ReturnRequests.AsNoTracking();

            // Los dos filtros se resuelven por las tablas que SI guardan al dueno, porque la
            // devolucion guarda el pedido y la variante, no suspropietarios (Q-21b).
            if (buyerId.HasValue)
            {
                var buyer = buyerId.Value;
                query = query.Where(o => _dbContext.CustomerOrders
                    .Any(co => co.Id == o.CustomerOrderId && co.BuyerId == buyer));
            }

            if (vendorId.HasValue)
            {
                // El vendedor se resuelve por la variante: variante -> producto -> vendedor. Es el
                // mismo criterio que usa el detalle, para que listar y abrir no discrepen.
                var vendor = vendorId.Value;
                query = query.Where(o => _dbContext.Products
                    .Any(p => p.VendorId == vendor && p.Variants.Any(v => v.Id == o.VariantId)));
            }

            if (status.HasValue)
            {
                query = query.Where(o => o.Status == status.Value);
            }

            // Del mas reciente al mas antiguo: en una bandeja de devoluciones lo relevante es lo
            // que entro despues. El desempate por Id mantiene el orden estable entre llamadas.
            var list = await query
                .OrderByDescending(o => o.CreatedAt)
                .ThenByDescending(o => o.Id)
                .ToListAsync(cancellationToken);

            return list.Select(ReturnRequestMapper.ToDomain).ToList();
        }

        public async Task<IReadOnlyList<ReturnRequest>> GetByOrderIdAsync(Guid customerOrderId, CancellationToken cancellationToken = default)
        {
            var list = await _dbContext.ReturnRequests
                .AsNoTracking()
                .Where(o => o.CustomerOrderId == customerOrderId)
                .OrderByDescending(o => o.CreatedAt)
                .ThenByDescending(o => o.Id)
                .ToListAsync(cancellationToken);

            return list.Select(ReturnRequestMapper.ToDomain).ToList();
        }

        public async Task<ReturnRequest?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            // AsNoTracking: la lectura devuelve un objeto de dominio independiente.
            // Si la fila quedara rastreada, el Update posterior (que adjunta un
            // DbModel nuevo con la misma clave) fallaria con "another instance
            // with the same key value is already being tracked" y la devolucion
            // no se podria aprobar. Verificado en Docker el 2026-09-29 (H-15).
            var dbModel = await _dbContext.ReturnRequests
                .AsNoTracking()
                .FirstOrDefaultAsync(o => o.Id == id, cancellationToken);
            return dbModel == null ? null : ReturnRequestMapper.ToDomain(dbModel);
        }

        public Task AddAsync(ReturnRequest request, CancellationToken cancellationToken = default)
        {
            foreach (var domainEvent in request.DomainEvents)
            {
                _domainEventDispatcher.AddEvent(domainEvent);
            }
            request.ClearDomainEvents();

            var dbModel = ReturnRequestMapper.ToDbModel(request);
            _dbContext.ReturnRequests.Add(dbModel);
            return Task.CompletedTask;
        }

        public Task UpdateAsync(ReturnRequest request, CancellationToken cancellationToken = default)
        {
            foreach (var domainEvent in request.DomainEvents)
            {
                _domainEventDispatcher.AddEvent(domainEvent);
            }
            request.ClearDomainEvents();

            var dbModel = ReturnRequestMapper.ToDbModel(request);
            _dbContext.ReturnRequests.Update(dbModel);
            return Task.CompletedTask;
        }
    }
}
