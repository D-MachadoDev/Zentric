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
using Zentric.Domain.Orders.Events;
using Zentric.Domain.Orders.Ports;
using Zentric.Domain.Products.ValueObjects;
using Zentric.Infrastructure.BackgroundServices;
using Zentric.Infrastructure.Persistence;
using Zentric.Tests.Security;

namespace Zentric.Tests.BackgroundServices
{
    public class CheckoutTimeoutServiceChallengeTests
    {
        private readonly Mock<ICustomerOrderRepository> _orderRepoMock = new();
        private readonly Mock<IInventoryRepository> _inventoryRepoMock = new();
        private readonly Mock<IUnitOfWork> _uowMock = new();
        private readonly Mock<IDomainEventDispatcher> _dispatcherMock = new();
        private readonly Mock<ILogger<CheckoutTimeoutService>> _loggerMock = new();
        private readonly ManualClock _clock = new(new DateTimeOffset(2026, 10, 16, 15, 0, 0, TimeSpan.Zero));

        private IServiceProvider CreateServiceProvider()
        {
            var services = new ServiceCollection();
            services.AddScoped(_ => _orderRepoMock.Object);
            services.AddScoped(_ => _inventoryRepoMock.Object);
            services.AddScoped(_ => _uowMock.Object);
            services.AddScoped(_ => _dispatcherMock.Object);
            return services.BuildServiceProvider();
        }

        [Fact]
        public async Task ProcessExpiredOrders_OrderWithZeroItems_CancelsOrderAndEmitsEvent()
        {
            // Boundary condition 1: Order with 0 items (e.g., abandoned empty cart)
            var buyerId = Guid.NewGuid();
            var emptyOrder = new CustomerOrder(buyerId); // Status = Cart, Items = []

            _orderRepoMock
                .Setup(r => r.GetExpiredOrdersAsync(It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<CustomerOrder> { emptyOrder });

            var sp = CreateServiceProvider();
            var service = new CheckoutTimeoutService(sp, _loggerMock.Object, _clock, _dispatcherMock.Object);

            var processed = await service.ProcessExpiredOrdersAsync(CancellationToken.None);

            Assert.Equal(1, processed);
            Assert.Equal(OrderStatus.Cancelled, emptyOrder.Status);
            Assert.Equal(OrderCancellationCause.PaymentTimeout, emptyOrder.CancellationCause);

            _orderRepoMock.Verify(r => r.UpdateAsync(emptyOrder, It.IsAny<CancellationToken>()), Times.Once);
            _dispatcherMock.Verify(d => d.AddEvent(It.Is<CartExpiredDomainEvent>(e => e.OrderId == emptyOrder.Id)), Times.Once);
            _dispatcherMock.Verify(d => d.DispatchEventsAsync(It.IsAny<CancellationToken>()), Times.Once);
            _uowMock.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
            _inventoryRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Inventory>(), It.IsAny<CancellationToken>()), Times.Never);
        }

        [Fact]
        public async Task ProcessExpiredOrders_NoAvailableReservation_CancelsOrderWithoutThrowing()
        {
            // Boundary condition 2: Expired order whose items have 0 reserved stock in inventory
            var buyerId = Guid.NewGuid();
            var variantId = Guid.NewGuid();
            var order = new CustomerOrder(buyerId);
            order.AddItem(variantId, Guid.NewGuid(), 5, new Money(20_000m, "COP"));
            order.Checkout();

            var warehouseId = Guid.NewGuid();
            var inventory = new Inventory(variantId, warehouseId, availableQuantity: 10, reservedQuantity: 0, damagedQuantity: 0);

            _orderRepoMock
                .Setup(r => r.GetExpiredOrdersAsync(It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<CustomerOrder> { order });

            _inventoryRepoMock
                .Setup(r => r.GetByVariantIdAsync(variantId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<Inventory> { inventory });

            var sp = CreateServiceProvider();
            var service = new CheckoutTimeoutService(sp, _loggerMock.Object, _clock, _dispatcherMock.Object);

            var processed = await service.ProcessExpiredOrdersAsync(CancellationToken.None);

            Assert.Equal(1, processed);
            Assert.Equal(OrderStatus.Cancelled, order.Status);
            Assert.Equal(OrderCancellationCause.PaymentTimeout, order.CancellationCause);
            Assert.Equal(10, inventory.AvailableQuantity);
            Assert.Equal(0, inventory.ReservedQuantity);

            _inventoryRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Inventory>(), It.IsAny<CancellationToken>()), Times.Never);
            _orderRepoMock.Verify(r => r.UpdateAsync(order, It.IsAny<CancellationToken>()), Times.Once);
            _uowMock.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task ProcessExpiredOrders_MultiWarehousePartialReservation_ReturnsAllAvailableReservationsAndCancels()
        {
            // Boundary condition 3: Multi-warehouse partial returns
            // Item quantity is 10, but only 5 are reserved across two warehouses (WH1: 3, WH2: 2)
            var buyerId = Guid.NewGuid();
            var variantId = Guid.NewGuid();
            var order = new CustomerOrder(buyerId);
            order.AddItem(variantId, Guid.NewGuid(), 10, new Money(15_000m, "COP"));
            order.Checkout();

            var wh1 = Guid.NewGuid();
            var wh2 = Guid.NewGuid();
            var inv1 = new Inventory(variantId, wh1, availableQuantity: 5, reservedQuantity: 3, damagedQuantity: 0);
            var inv2 = new Inventory(variantId, wh2, availableQuantity: 8, reservedQuantity: 2, damagedQuantity: 0);

            _orderRepoMock
                .Setup(r => r.GetExpiredOrdersAsync(It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<CustomerOrder> { order });

            _inventoryRepoMock
                .Setup(r => r.GetByVariantIdAsync(variantId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<Inventory> { inv1, inv2 });

            var sp = CreateServiceProvider();
            var service = new CheckoutTimeoutService(sp, _loggerMock.Object, _clock, _dispatcherMock.Object);

            var processed = await service.ProcessExpiredOrdersAsync(CancellationToken.None);

            Assert.Equal(1, processed);
            Assert.Equal(OrderStatus.Cancelled, order.Status);

            // inv1 had 3 reserved -> returned 3 -> reserved: 0, available: 8
            Assert.Equal(0, inv1.ReservedQuantity);
            Assert.Equal(8, inv1.AvailableQuantity);

            // inv2 had 2 reserved -> returned 2 -> reserved: 0, available: 10
            Assert.Equal(0, inv2.ReservedQuantity);
            Assert.Equal(10, inv2.AvailableQuantity);

            _inventoryRepoMock.Verify(r => r.UpdateAsync(inv1, It.IsAny<CancellationToken>()), Times.Once);
            _inventoryRepoMock.Verify(r => r.UpdateAsync(inv2, It.IsAny<CancellationToken>()), Times.Once);
            _orderRepoMock.Verify(r => r.UpdateAsync(order, It.IsAny<CancellationToken>()), Times.Once);
            _uowMock.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task ProcessExpiredOrders_MixedBatch_AllBoundaryOrdersProcessedIndependently()
        {
            var buyerId = Guid.NewGuid();
            var variant1 = Guid.NewGuid();
            var variant2 = Guid.NewGuid();

            // Order 1: 0 items
            var orderZero = new CustomerOrder(buyerId);

            // Order 2: No reservation in inventory
            var orderNoRes = new CustomerOrder(buyerId);
            orderNoRes.AddItem(variant1, Guid.NewGuid(), 2, new Money(10_000m, "COP"));
            orderNoRes.Checkout();
            var invNoRes = new Inventory(variant1, Guid.NewGuid(), availableQuantity: 5, reservedQuantity: 0, damagedQuantity: 0);

            // Order 3: Multi-warehouse partial reservation
            var orderPartial = new CustomerOrder(buyerId);
            orderPartial.AddItem(variant2, Guid.NewGuid(), 8, new Money(12_000m, "COP"));
            orderPartial.Checkout();
            var invPartA = new Inventory(variant2, Guid.NewGuid(), availableQuantity: 2, reservedQuantity: 3, damagedQuantity: 0);
            var invPartB = new Inventory(variant2, Guid.NewGuid(), availableQuantity: 4, reservedQuantity: 1, damagedQuantity: 0);

            _orderRepoMock
                .Setup(r => r.GetExpiredOrdersAsync(It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<CustomerOrder> { orderZero, orderNoRes, orderPartial });

            _inventoryRepoMock
                .Setup(r => r.GetByVariantIdAsync(variant1, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<Inventory> { invNoRes });

            _inventoryRepoMock
                .Setup(r => r.GetByVariantIdAsync(variant2, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<Inventory> { invPartA, invPartB });

            var sp = CreateServiceProvider();
            var service = new CheckoutTimeoutService(sp, _loggerMock.Object, _clock, _dispatcherMock.Object);

            var processed = await service.ProcessExpiredOrdersAsync(CancellationToken.None);

            Assert.Equal(3, processed);
            Assert.Equal(OrderStatus.Cancelled, orderZero.Status);
            Assert.Equal(OrderStatus.Cancelled, orderNoRes.Status);
            Assert.Equal(OrderStatus.Cancelled, orderPartial.Status);

            _uowMock.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Exactly(3));
        }

        [Fact]
        public async Task ProcessExpiredOrders_MultiVariantOrder_MixedReservations_RestoresAvailableAndCancels()
        {
            // Order with 2 variants:
            // Variant 1 has full reservation in WH1
            // Variant 2 has no reservation
            var buyerId = Guid.NewGuid();
            var variant1 = Guid.NewGuid();
            var variant2 = Guid.NewGuid();

            var order = new CustomerOrder(buyerId);
            order.AddItem(variant1, Guid.NewGuid(), 3, new Money(10_000m, "COP"));
            order.AddItem(variant2, Guid.NewGuid(), 2, new Money(15_000m, "COP"));
            order.Checkout();

            var invVar1 = new Inventory(variant1, Guid.NewGuid(), availableQuantity: 0, reservedQuantity: 3, damagedQuantity: 0);
            var invVar2 = new Inventory(variant2, Guid.NewGuid(), availableQuantity: 5, reservedQuantity: 0, damagedQuantity: 0);

            _orderRepoMock
                .Setup(r => r.GetExpiredOrdersAsync(It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<CustomerOrder> { order });

            _inventoryRepoMock
                .Setup(r => r.GetByVariantIdAsync(variant1, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<Inventory> { invVar1 });

            _inventoryRepoMock
                .Setup(r => r.GetByVariantIdAsync(variant2, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<Inventory> { invVar2 });

            var sp = CreateServiceProvider();
            var service = new CheckoutTimeoutService(sp, _loggerMock.Object, _clock, _dispatcherMock.Object);

            var processed = await service.ProcessExpiredOrdersAsync(CancellationToken.None);

            Assert.Equal(1, processed);
            Assert.Equal(OrderStatus.Cancelled, order.Status);

            // invVar1: restored 3 -> available: 3, reserved: 0
            Assert.Equal(3, invVar1.AvailableQuantity);
            Assert.Equal(0, invVar1.ReservedQuantity);
            _inventoryRepoMock.Verify(r => r.UpdateAsync(invVar1, It.IsAny<CancellationToken>()), Times.Once);

            // invVar2: never touched
            Assert.Equal(5, invVar2.AvailableQuantity);
            Assert.Equal(0, invVar2.ReservedQuantity);
            _inventoryRepoMock.Verify(r => r.UpdateAsync(invVar2, It.IsAny<CancellationToken>()), Times.Never);

            _orderRepoMock.Verify(r => r.UpdateAsync(order, It.IsAny<CancellationToken>()), Times.Once);
            _uowMock.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        }
    }
}
