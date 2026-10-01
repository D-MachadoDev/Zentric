using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Zentric.Domain.Common.Ports;
using Zentric.Domain.Orders.Ports;
using Zentric.Domain.Inventories.Ports;
using Zentric.Application.Common.Ports;

namespace Zentric.Infrastructure.BackgroundServices
{
    public class CheckoutTimeoutService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<CheckoutTimeoutService> _logger;
        private readonly IClock _clock;

        public CheckoutTimeoutService(IServiceProvider serviceProvider, ILogger<CheckoutTimeoutService> logger, IClock clock)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
            _clock = clock;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = _serviceProvider.CreateScope();
                    var orderRepo = scope.ServiceProvider.GetRequiredService<ICustomerOrderRepository>();
                    var inventoryRepo = scope.ServiceProvider.GetRequiredService<IInventoryRepository>();
                    var uow = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();

                    // T-004 (H-06/R-06): el umbral sale del reloj inyectado, no de
                    // DateTime.UtcNow, para que el barrido sea determinista en pruebas.
                    var threshold = _clock.UtcNow.AddMinutes(-15).UtcDateTime;
                    var expiredOrders = await orderRepo.GetExpiredOrdersAsync(threshold, stoppingToken);

                    if (expiredOrders.Count > 0)
                    {
                        foreach (var order in expiredOrders)
                        {
                            foreach (var item in order.Items)
                            {
                                var inventories = await inventoryRepo.GetByVariantIdAsync(item.VariantId, stoppingToken);
                                var inventory = inventories.FirstOrDefault();
                                if (inventory != null && inventory.ReservedQuantity >= item.Quantity)
                                {
                                    inventory.ReturnToAvailable(item.Quantity);
                                    await inventoryRepo.UpdateAsync(inventory, stoppingToken);
                                }
                            }

                            order.CancelDueToTimeout();
                            await orderRepo.UpdateAsync(order, stoppingToken);
                        }

                        await uow.SaveChangesAsync(stoppingToken);
                        _logger.LogInformation("CheckoutTimeoutService: Expired {Count} orders and returned inventory to available.", expiredOrders.Count);
                    }
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
