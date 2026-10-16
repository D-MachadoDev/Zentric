using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Zentric.Domain.Common.Ports;
using Zentric.Domain.Orders.Ports;
using Zentric.Domain.Orders.Events;
using Zentric.Domain.Inventories.Events;
using Zentric.Domain.Inventories.Ports;
using Zentric.Application.Common.Ports;
using Zentric.Infrastructure.Persistence;

namespace Zentric.Infrastructure.BackgroundServices
{
    public class CheckoutTimeoutService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<CheckoutTimeoutService> _logger;
        private readonly IClock _clock;
        private readonly IDomainEventDispatcher? _domainEventDispatcher;

        public CheckoutTimeoutService(IServiceProvider serviceProvider, ILogger<CheckoutTimeoutService> logger, IClock clock)
            : this(serviceProvider, logger, clock, null)
        {
        }

        public CheckoutTimeoutService(
            IServiceProvider serviceProvider,
            ILogger<CheckoutTimeoutService> logger,
            IClock clock,
            IDomainEventDispatcher? domainEventDispatcher)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
            _clock = clock;
            _domainEventDispatcher = domainEventDispatcher;
        }

        public async Task<int> ProcessExpiredOrdersAsync(CancellationToken stoppingToken = default)
        {
            using var scope = _serviceProvider.CreateScope();
            var orderRepo = scope.ServiceProvider.GetRequiredService<ICustomerOrderRepository>();
            var inventoryRepo = scope.ServiceProvider.GetRequiredService<IInventoryRepository>();
            var uow = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
            var dispatcher = _domainEventDispatcher ?? scope.ServiceProvider.GetService<IDomainEventDispatcher>();

            // T-004 (H-06/R-06): el umbral sale del reloj inyectado, no de
            // DateTime.UtcNow, para que el barrido sea determinista en pruebas.
            var threshold = _clock.UtcNow.AddMinutes(-15).UtcDateTime;
            var expiredOrders = await orderRepo.GetExpiredOrdersAsync(threshold, stoppingToken);

            if (expiredOrders.Count == 0)
            {
                return 0;
            }

            int processedCount = 0;

            foreach (var order in expiredOrders)
            {
                try
                {
                    // Restitucion de inventario multialmacen (ADR-0001 / ADR-0025):
                    // No asume una sola bodega; busca y casa las cantidades reservadas
                    // entre todas las bodegas asociadas a la variante.
                    foreach (var item in order.Items)
                    {
                        var inventories = await inventoryRepo.GetByVariantIdAsync(item.VariantId, stoppingToken);
                        var reservedInventories = inventories
                            .Where(i => i.ReservedQuantity > 0)
                            .OrderByDescending(i => i.ReservedQuantity)
                            .ToList();

                        int remainingToReturn = item.Quantity;
                        foreach (var inventory in reservedInventories)
                        {
                            if (remainingToReturn <= 0) break;

                            var toReturn = Math.Min(inventory.ReservedQuantity, remainingToReturn);
                            if (toReturn > 0)
                            {
                                inventory.ReturnToAvailable(toReturn);
                                await inventoryRepo.UpdateAsync(inventory, stoppingToken);
                                remainingToReturn -= toReturn;
                            }
                        }
                    }

                    order.CancelDueToTimeout();
                    await orderRepo.UpdateAsync(order, stoppingToken);

                    // ADR-0020: notificacion y despacho de evento CartExpiredDomainEvent
                    var expiredEvent = new CartExpiredDomainEvent(order.Id, _clock.UtcNow);
                    if (dispatcher != null)
                    {
                        dispatcher.AddEvent(expiredEvent);
                        await dispatcher.DispatchEventsAsync(stoppingToken);
                    }
                    _logger.LogInformation("CartExpiredDomainEvent emitted: OrderId={OrderId}, ExpiredAt={ExpiredAt}", expiredEvent.OrderId, expiredEvent.ExpiredAt);

                    // Persistencia individual por pedido: un fallo en una orden aislada no anula el lote
                    await uow.SaveChangesAsync(stoppingToken);
                    processedCount++;
                    _logger.LogInformation("CheckoutTimeoutService: Expired order {OrderId} and returned inventory to available.", order.Id);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "CheckoutTimeoutService: Error processing expired order {OrderId}. Skipping order to preserve batch progress.", order.Id);
                }
            }

            return processedCount;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessExpiredOrdersAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred executing CheckoutTimeoutService.");
                }

                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
            }
        }
    }
}
