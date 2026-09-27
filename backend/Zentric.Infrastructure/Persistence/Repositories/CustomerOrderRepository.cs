using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Zentric.Domain.Orders.Ports;
using Zentric.Domain.Orders;
using Zentric.Domain.Orders.Enums;
using Zentric.Infrastructure.Persistence.Mappers;
using Zentric.Infrastructure.Persistence.Models;

namespace Zentric.Infrastructure.Persistence.Repositories
{
    public class CustomerOrderRepository : ICustomerOrderRepository
    {
        private readonly ZentricDbContext _dbContext;

        public CustomerOrderRepository(ZentricDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<CustomerOrder?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            // AsNoTracking: el agregado se devuelve como objeto de dominio
            // independiente. Si la entidad quedara rastreada, un Update posterior
            // del mismo grafo fallaria con "another instance with the same key
            // value is already being tracked".
            var dbModel = await _dbContext.CustomerOrders
                .AsNoTracking()
                .Include(o => o.Items)
                .FirstOrDefaultAsync(o => o.Id == id, cancellationToken);
            return dbModel == null ? null : CustomerOrderMapper.ToDomain(dbModel);
        }

        public async Task<IReadOnlyList<CustomerOrder>> GetExpiredOrdersAsync(DateTime threshold, CancellationToken cancellationToken = default)
        {
            var list = await _dbContext.CustomerOrders
                .AsNoTracking()
                .Include(o => o.Items)
                .Where(o => (o.Status == OrderStatus.Cart || o.Status == OrderStatus.PendingPayment) && o.UpdatedAt < threshold)
                .ToListAsync(cancellationToken);

            return list.Select(CustomerOrderMapper.ToDomain).ToList();
        }

        public Task AddAsync(CustomerOrder order, CancellationToken cancellationToken = default)
        {
            var dbModel = CustomerOrderMapper.ToDbModel(order);
            _dbContext.CustomerOrders.Add(dbModel);
            return Task.CompletedTask;
        }

        public Task UpdateAsync(CustomerOrder order, CancellationToken cancellationToken = default)
        {
            // GetByIdAsync lee con AsNoTracking, asi que el agregado de dominio es
            // un objeto independiente y su escritura no colisiona con el
            // IdentityMap de EF Core.
            //
            // Se actualiza la cabecera de forma explicita y se sincroniza la
            // coleccion de lineas: se agregan las nuevas, se actualizan las
            // existentes y se eliminan las que ya no formen parte del pedido.
            var tracked = _dbContext.CustomerOrders
                .Include(o => o.Items)
                .FirstOrDefault(o => o.Id == order.Id);

            if (tracked == null)
            {
                // El pedido no existe todavia: se inserta completo.
                _dbContext.CustomerOrders.Add(CustomerOrderMapper.ToDbModel(order));
                return Task.CompletedTask;
            }

            tracked.BuyerId = order.BuyerId;
            tracked.Status = order.Status;
            tracked.CreatedAt = order.CreatedAt;
            tracked.UpdatedAt = order.UpdatedAt;

            var incoming = order.Items
                .Select(i => new OrderItemDbModel
                {
                    Id = i.Id,
                    CustomerOrderId = order.Id,
                    VariantId = i.VariantId,
                    Quantity = i.Quantity,
                    UnitPrice = new MoneyDbModel { Amount = i.UnitPrice.Amount, Currency = i.UnitPrice.Currency }
                })
                .ToList();

            var incomingIds = incoming.Select(i => i.Id).ToHashSet();

            // Eliminar las lineas que el agregado ya no contiene.
            var toRemove = _dbContext.Set<OrderItemDbModel>()
                .Where(e => e.CustomerOrderId == order.Id && !incomingIds.Contains(e.Id))
                .ToList();

            if (toRemove.Count > 0)
            {
                _dbContext.RemoveRange(toRemove);
            }

            // Agregar las lineas nuevas; las que ya existen se actualizan a traves
            // de la instancia que el DbContext tiene rastreada.
            var existingLines = _dbContext.Set<OrderItemDbModel>()
                .Where(e => e.CustomerOrderId == order.Id)
                .ToDictionary(e => e.Id);

            foreach (var item in incoming)
            {
                if (existingLines.TryGetValue(item.Id, out var current))
                {
                    current.VariantId = item.VariantId;
                    current.Quantity = item.Quantity;
                    current.UnitPrice = item.UnitPrice;
                }
                else
                {
                    _dbContext.Set<OrderItemDbModel>().Add(item);
                }
            }

            return Task.CompletedTask;
        }
    }
}
