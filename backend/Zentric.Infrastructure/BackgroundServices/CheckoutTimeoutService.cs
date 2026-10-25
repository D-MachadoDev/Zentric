using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Zentric.Domain.Common.Ports;
using Zentric.Domain.Orders.Ports;
using Zentric.Domain.Inventories.Events;
using Zentric.Domain.Inventories.Ports;
using Zentric.Application.Common.Ports;
using Zentric.Infrastructure.Persistence;

namespace Zentric.Infrastructure.BackgroundServices
{
    public sealed class CheckoutTimeoutService : IHostedService, IDisposable
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<CheckoutTimeoutService> _logger;
        private readonly IClock _clock;
        private readonly IDomainEventDispatcher? _domainEventDispatcher;
        private PeriodicTimer? _timer;
        private Task? _executionTask;
        private readonly CancellationTokenSource _cancellationTokenSource = new();

        [ActivatorUtilitiesConstructor]
        public CheckoutTimeoutService(IServiceProvider serviceProvider, ILogger<CheckoutTimeoutService> logger, IClock clock)
            : this(serviceProvider, logger, clock, null)
        {
        }

        internal CheckoutTimeoutService(
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
            // FIX: El timeout de 15 minutos empieza en CheckoutStartedAt, no en CreatedAt.
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

        public Task StartAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("CheckoutTimeoutService starting.");
            _timer = new PeriodicTimer(TimeSpan.FromMinutes(1));
            _executionTask = ExecuteAsync(_cancellationTokenSource.Token);
            return Task.CompletedTask;
        }

        public async Task StopAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("CheckoutTimeoutService stopping.");
            _cancellationTokenSource.Cancel();
            _timer?.Dispose();
            if (_executionTask != null)
            {
                await Task.WhenAny(_executionTask, Task.Delay(TimeSpan.FromSeconds(10), cancellationToken));
            }
            _logger.LogInformation("CheckoutTimeoutService stopped.");
        }

        private async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            try
            {
                while (await _timer!.WaitForNextTickAsync(stoppingToken))
                {
                    try
                    {
                        await ProcessExpiredOrdersAsync(stoppingToken);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error occurred executing CheckoutTimeoutService iteration.");
                    }
                }
            }
            catch (OperationCanceledException)
            {
                _logger.LogInformation("CheckoutTimeoutService loop cancelled.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "CheckoutTimeoutService loop terminated unexpectedly.");
            }
        }

        public void Dispose()
        {
            _cancellationTokenSource.Dispose();
            _timer?.Dispose();
        }
    }
}
