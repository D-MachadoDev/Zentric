using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using Zentric.Application.Common.Ports;
using Zentric.Domain.Common.Ports;
using Zentric.Domain.Inventories;
using Zentric.Domain.Inventories.Events;
using Zentric.Domain.Inventories.Ports;
using Zentric.Domain.Orders;
using Zentric.Domain.Orders.Enums;
using Zentric.Domain.Orders.Ports;
using Zentric.Domain.Products.ValueObjects;
using Zentric.Infrastructure.BackgroundServices;
using Zentric.Infrastructure.Persistence;
using Zentric.Tests.Security;

namespace Zentric.Tests.BackgroundServices
{
    public class CheckoutTimeoutServiceTests
    {
        private readonly Mock<ICustomerOrderRepository> _orderRepoMock = new();
        private readonly Mock<IInventoryRepository> _inventoryRepoMock = new();
        private readonly Mock<IUnitOfWork> _uowMock = new();
        private readonly Mock<IDomainEventDispatcher> _dispatcherMock = new();
        private readonly Mock<ILogger<CheckoutTimeoutService>> _loggerMock = new();
        private readonly ManualClock _clock = new(new DateTimeOffset(2026, 10, 16, 12, 0, 0, TimeSpan.Zero));

        private IServiceProvider CreateServiceProvider()
        {
            var services = new ServiceCollection();
            services.AddScoped(_ => _orderRepoMock.Object);
            services.AddScoped(_ => _inventoryRepoMock.Object);
            services.AddScoped(_ => _uowMock.Object);
            services.AddScoped(_ => _dispatcherMock.Object);
            return services.BuildServiceProvider();
        }

        private CustomerOrder CreateSampleOrder(Guid buyerId, Guid variantId, int quantity)
        {
            var order = new CustomerOrder(buyerId);
            order.AddItem(variantId, Guid.NewGuid(), quantity, new Money(50_000m, "COP"));
            order.Checkout();
            return order;
        }

        [Fact]
        public async Task ProcessExpiredOrders_15MinuteCutoff_QueriesUsingInjectedClockThreshold()
        {
            // Umbral de 15 minutos exactos desde el reloj inyectado
            DateTime capturedThreshold = DateTime.MinValue;
            _orderRepoMock
                .Setup(r => r.GetExpiredOrdersAsync(It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
                .Callback<DateTime, CancellationToken>((threshold, _) => capturedThreshold = threshold)
                .ReturnsAsync(new List<CustomerOrder>());

            var sp = CreateServiceProvider();
            var service = new CheckoutTimeoutService(sp, _loggerMock.Object, _clock, _dispatcherMock.Object);

            var processed = await service.ProcessExpiredOrdersAsync(CancellationToken.None);

            Assert.Equal(0, processed);
            var expectedThreshold = _clock.UtcNow.AddMinutes(-15).UtcDateTime;
            Assert.Equal(expectedThreshold, capturedThreshold);
        }

        [Fact]
        public async Task ProcessExpiredOrders_InventoryRestitution_MatchesReservedStockAcrossWarehouses()
        {
            // Pedido con item de cantidad 5
            var buyerId = Guid.NewGuid();
            var variantId = Guid.NewGuid();
            var order = CreateSampleOrder(buyerId, variantId, 5);

            // 2 bodegas distintas: Bodega A tiene 3 reservadas, Bodega B tiene 4 reservadas
            var warehouseA = Guid.NewGuid();
            var warehouseB = Guid.NewGuid();
            var inventoryA = new Inventory(variantId, warehouseA, availableQuantity: 10, reservedQuantity: 3, damagedQuantity: 0);
            var inventoryB = new Inventory(variantId, warehouseB, availableQuantity: 20, reservedQuantity: 4, damagedQuantity: 0);

            _orderRepoMock
                .Setup(r => r.GetExpiredOrdersAsync(It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<CustomerOrder> { order });

            _inventoryRepoMock
                .Setup(r => r.GetByVariantIdAsync(variantId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<Inventory> { inventoryA, inventoryB });

            var sp = CreateServiceProvider();
            var service = new CheckoutTimeoutService(sp, _loggerMock.Object, _clock, _dispatcherMock.Object);

            var processed = await service.ProcessExpiredOrdersAsync(CancellationToken.None);

            Assert.Equal(1, processed);
            Assert.Equal(OrderStatus.Cancelled, order.Status);

            // Bodega B (tenia 4 reservadas) devolvio 4 a disponible -> disponible 24, reservado 0
            // Bodega A (tenia 3 reservadas) devolvio 1 restante -> disponible 11, reservado 2
            // Total retornado = 4 + 1 = 5
            Assert.Equal(0, inventoryB.ReservedQuantity);
            Assert.Equal(24, inventoryB.AvailableQuantity);
            Assert.Equal(2, inventoryA.ReservedQuantity);
            Assert.Equal(11, inventoryA.AvailableQuantity);

            _inventoryRepoMock.Verify(r => r.UpdateAsync(inventoryB, It.IsAny<CancellationToken>()), Times.Once);
            _inventoryRepoMock.Verify(r => r.UpdateAsync(inventoryA, It.IsAny<CancellationToken>()), Times.Once);
            _orderRepoMock.Verify(r => r.UpdateAsync(order, It.IsAny<CancellationToken>()), Times.Once);
            _uowMock.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task ProcessExpiredOrders_Idempotency_SecondRunDoesNotReProcess()
        {
            var buyerId = Guid.NewGuid();
            var variantId = Guid.NewGuid();
            var order = CreateSampleOrder(buyerId, variantId, 2);

            var inventory = new Inventory(variantId, Guid.NewGuid(), availableQuantity: 10, reservedQuantity: 2, damagedQuantity: 0);

            // Primera ejecucion: devuelve la orden
            // Segunda ejecucion: base de datos devuelve vacio (la orden ya esta Cancelled)
            var invocation = 0;
            _orderRepoMock
                .Setup(r => r.GetExpiredOrdersAsync(It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(() =>
                {
                    invocation++;
                    return invocation == 1 ? new List<CustomerOrder> { order } : new List<CustomerOrder>();
                });

            _inventoryRepoMock
                .Setup(r => r.GetByVariantIdAsync(variantId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<Inventory> { inventory });

            var sp = CreateServiceProvider();
            var service = new CheckoutTimeoutService(sp, _loggerMock.Object, _clock, _dispatcherMock.Object);

            // Primera corrida
            var run1 = await service.ProcessExpiredOrdersAsync(CancellationToken.None);
            Assert.Equal(1, run1);
            Assert.Equal(OrderStatus.Cancelled, order.Status);
            Assert.Equal(0, inventory.ReservedQuantity);
            Assert.Equal(12, inventory.AvailableQuantity);

            // Segunda corrida (idempotencia)
            var run2 = await service.ProcessExpiredOrdersAsync(CancellationToken.None);
            Assert.Equal(0, run2);

            // Verificaciones: los repositorios solo se invocaron una vez en total
            _orderRepoMock.Verify(r => r.UpdateAsync(order, It.IsAny<CancellationToken>()), Times.Once);
            _inventoryRepoMock.Verify(r => r.UpdateAsync(inventory, It.IsAny<CancellationToken>()), Times.Once);
            _uowMock.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task ProcessExpiredOrders_RestartRecovery_ProcessesPendingExpiredOrdersAfterRestart()
        {
            // Simula reinicio de proceso: una nueva instancia de CheckoutTimeoutService arranca
            // y recupera pedidos pendientes directamente de la base de datos persistida.
            var buyerId = Guid.NewGuid();
            var variantId = Guid.NewGuid();
            var order = CreateSampleOrder(buyerId, variantId, 1);
            var inventory = new Inventory(variantId, Guid.NewGuid(), availableQuantity: 5, reservedQuantity: 1, damagedQuantity: 0);

            _orderRepoMock
                .Setup(r => r.GetExpiredOrdersAsync(It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<CustomerOrder> { order });

            _inventoryRepoMock
                .Setup(r => r.GetByVariantIdAsync(variantId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<Inventory> { inventory });

            var sp = CreateServiceProvider();
            var newServiceInstanceAfterRestart = new CheckoutTimeoutService(sp, _loggerMock.Object, _clock, _dispatcherMock.Object);

            var processed = await newServiceInstanceAfterRestart.ProcessExpiredOrdersAsync(CancellationToken.None);

            Assert.Equal(1, processed);
            Assert.Equal(OrderStatus.Cancelled, order.Status);
            Assert.Equal(0, inventory.ReservedQuantity);
            Assert.Equal(6, inventory.AvailableQuantity);
            _uowMock.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task ProcessExpiredOrders_DispatchesCartExpiredDomainEvent()
        {
            var buyerId = Guid.NewGuid();
            var variantId = Guid.NewGuid();
            var order = CreateSampleOrder(buyerId, variantId, 1);
            var inventory = new Inventory(variantId, Guid.NewGuid(), availableQuantity: 5, reservedQuantity: 1, damagedQuantity: 0);

            _orderRepoMock
                .Setup(r => r.GetExpiredOrdersAsync(It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<CustomerOrder> { order });

            _inventoryRepoMock
                .Setup(r => r.GetByVariantIdAsync(variantId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<Inventory> { inventory });

            var sp = CreateServiceProvider();
            var service = new CheckoutTimeoutService(sp, _loggerMock.Object, _clock, _dispatcherMock.Object);

            await service.ProcessExpiredOrdersAsync(CancellationToken.None);

            _dispatcherMock.Verify(
                d => d.AddEvent(It.Is<CartExpiredDomainEvent>(e => e.OrderId == order.Id && e.ExpiredAt == _clock.UtcNow)),
                Times.Once);

            _dispatcherMock.Verify(d => d.DispatchEventsAsync(It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task ProcessExpiredOrders_ErrorInOneOrder_DoesNotAbortRemainingOrdersInBatch()
        {
            var buyerId = Guid.NewGuid();
            var variantId = Guid.NewGuid();

            var failingOrder = CreateSampleOrder(buyerId, variantId, 1);
            var successfulOrder = CreateSampleOrder(buyerId, variantId, 1);

            var inventory = new Inventory(variantId, Guid.NewGuid(), availableQuantity: 10, reservedQuantity: 2, damagedQuantity: 0);

            _orderRepoMock
                .Setup(r => r.GetExpiredOrdersAsync(It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<CustomerOrder> { failingOrder, successfulOrder });

            _inventoryRepoMock
                .Setup(r => r.GetByVariantIdAsync(variantId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<Inventory> { inventory });

            // failingOrder falla al actualizarse
            _orderRepoMock
                .Setup(r => r.UpdateAsync(failingOrder, It.IsAny<CancellationToken>()))
                .ThrowsAsync(new InvalidOperationException("Simulated database failure for order 1"));

            _orderRepoMock
                .Setup(r => r.UpdateAsync(successfulOrder, It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);

            var sp = CreateServiceProvider();
            var service = new CheckoutTimeoutService(sp, _loggerMock.Object, _clock, _dispatcherMock.Object);

            var processed = await service.ProcessExpiredOrdersAsync(CancellationToken.None);

            // Solo 1 orden se proceso con exito, pero el lote no se aborto
            Assert.Equal(1, processed);
            Assert.Equal(OrderStatus.Cancelled, successfulOrder.Status);
            _orderRepoMock.Verify(r => r.UpdateAsync(successfulOrder, It.IsAny<CancellationToken>()), Times.Once);
            _uowMock.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task BackgroundService_ExecuteAsync_StartsAndStopsGracefully()
        {
            _orderRepoMock
                .Setup(r => r.GetExpiredOrdersAsync(It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<CustomerOrder>());

            var sp = CreateServiceProvider();
            var service = new CheckoutTimeoutService(sp, _loggerMock.Object, _clock, _dispatcherMock.Object);

            using var cts = new CancellationTokenSource();
            var startTask = service.StartAsync(cts.Token);
            cts.Cancel();
            await service.StopAsync(CancellationToken.None);
            await startTask;
        }
    }
}
