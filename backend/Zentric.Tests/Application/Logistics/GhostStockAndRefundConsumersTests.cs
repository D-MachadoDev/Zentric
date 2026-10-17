using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using Zentric.Application.Common.Models;
using Zentric.Application.Common.Ports;
using Zentric.Application.Logistics.Commands;
using Zentric.Application.Orders.EventHandlers;
using Zentric.Application.Returns.EventHandlers;
using Zentric.Domain.Buyers;
using Zentric.Domain.Buyers.ValueObjects;
using Zentric.Domain.Inventories;
using Zentric.Domain.Inventories.Events;
using Zentric.Domain.Inventories.Ports;
using Zentric.Domain.Logistics;
using Zentric.Domain.Logistics.Enums;
using Zentric.Domain.Logistics.Events;
using Zentric.Domain.Logistics.Ports;
using Zentric.Domain.Orders;
using Zentric.Domain.Orders.Ports;
using Zentric.Domain.Orders.Services;
using Zentric.Domain.Payments;
using Zentric.Domain.Payments.Ports;
using Zentric.Domain.Products.Enums;
using Zentric.Domain.Products.ValueObjects;
using Zentric.Domain.Returns;
using Zentric.Domain.Returns.Enums;
using Zentric.Domain.Returns.Ports;
using Zentric.Domain.Returns.Services;
using Zentric.Domain.Users;
using Zentric.Domain.Users.Enums;
using Zentric.Domain.Users.Ports;
using Zentric.Domain.Users.ValueObjects;
using Zentric.Infrastructure.Persistence;
using Zentric.Infrastructure.Persistence.Mappers;
using Zentric.Infrastructure.Persistence.Repositories;

namespace Zentric.Tests.Application.Logistics
{
    /// <summary>
    /// Pruebas BDD para cancelación por quiebre de stock ("Stock Fantasma"),
    /// consumidor de reembolso automático (PartialFulfillmentCancelledConsumer, ADR-0020),
    /// consumidor de expiración de carrito (CartExpiredConsumer) y adaptadores de persistencia
    /// de Buyer y RefundAudit.
    /// </summary>
    public sealed class GhostStockAndRefundConsumersTests
    {
        private readonly Mock<IFulfillmentOrderRepository> _fulfillmentRepo = new();
        private readonly Mock<ICustomerOrderRepository> _orderRepo = new();
        private readonly Mock<IInventoryRepository> _inventoryRepo = new();
        private readonly Mock<IReturnRequestRepository> _returnRepo = new();
        private readonly Mock<IUserRepository> _userRepo = new();
        private readonly Mock<IPaymentReceiptRepository> _receiptRepo = new();
        private readonly Mock<IRefundAuditRepository> _auditRepo = new();
        private readonly Mock<IUnitOfWork> _uow = new();

        [Fact]
        public async Task CancelFulfillmentOrderDueToNoStock_WhenOrderDoesNotExist_ReturnsNotFound()
        {
            _fulfillmentRepo
                .Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync((FulfillmentOrder?)null);

            var handler = new CancelFulfillmentOrderDueToNoStockCommandHandler(
                _fulfillmentRepo.Object,
                _orderRepo.Object,
                new OrderFulfillmentProgressSynchronizer(),
                _inventoryRepo.Object,
                _returnRepo.Object,
                _userRepo.Object,
                _uow.Object);

            var result = await handler.Handle(
                new CancelFulfillmentOrderDueToNoStockCommand(
                    Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), 1, Guid.NewGuid(), UserRole.Seller),
                CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.Equal("Fulfillment order not found.", result.Error);
        }

        [Fact]
        public async Task CancelFulfillmentOrderDueToNoStock_WhenForeignSellerCalls_ReturnsNotFound()
        {
            var fulfillment = new FulfillmentOrder(Guid.NewGuid(), Guid.NewGuid());
            _fulfillmentRepo
                .Setup(r => r.GetByIdAsync(fulfillment.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(fulfillment);

            var handler = new CancelFulfillmentOrderDueToNoStockCommandHandler(
                _fulfillmentRepo.Object,
                _orderRepo.Object,
                new OrderFulfillmentProgressSynchronizer(),
                _inventoryRepo.Object,
                _returnRepo.Object,
                _userRepo.Object,
                _uow.Object);

            var result = await handler.Handle(
                new CancelFulfillmentOrderDueToNoStockCommand(
                    fulfillment.Id, Guid.NewGuid(), Guid.NewGuid(), 1, Guid.NewGuid(), UserRole.Seller),
                CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.Equal("Fulfillment order not found.", result.Error);
        }

        [Fact]
        public async Task CancelFulfillmentOrderDueToNoStock_ValidRequest_ReconcilesStockCreatesReturnIncrementsRateAndSyncsOrder()
        {
            var vendorId = Guid.NewGuid();
            var variantId = Guid.NewGuid();
            var warehouseId = Guid.NewGuid();

            var masterOrder = new CustomerOrder(Guid.NewGuid());
            masterOrder.AddItem(variantId, vendorId, 2, new Money(50_000m, "COP"));
            masterOrder.Checkout();
            masterOrder.MarkAsPaid();

            var fulfillment = new FulfillmentOrder(masterOrder.Id, vendorId);
            var siblingDelivered = new FulfillmentOrder(masterOrder.Id, Guid.NewGuid());
            siblingDelivered.Pack();
            siblingDelivered.Dispatch();
            siblingDelivered.Deliver();

            var inventory = new Inventory(variantId, warehouseId, availableQuantity: 5, reservedQuantity: 2, damagedQuantity: 0);
            var vendor = new User("900123", new FullName("Tienda", "Oficial"), new Email("tienda@zentric.com"), "hash", UserRole.Seller);

            _fulfillmentRepo
                .Setup(r => r.GetByIdAsync(fulfillment.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(fulfillment);
            _fulfillmentRepo
                .Setup(r => r.GetByCustomerOrderIdAsync(masterOrder.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<FulfillmentOrder> { fulfillment, siblingDelivered });
            _inventoryRepo
                .Setup(r => r.GetByVariantAndWarehouseAsync(variantId, warehouseId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(inventory);
            _userRepo
                .Setup(r => r.GetByIdAsync(vendorId))
                .ReturnsAsync(vendor);
            _orderRepo
                .Setup(r => r.GetByIdAsync(masterOrder.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(masterOrder);

            var handler = new CancelFulfillmentOrderDueToNoStockCommandHandler(
                _fulfillmentRepo.Object,
                _orderRepo.Object,
                new OrderFulfillmentProgressSynchronizer(),
                _inventoryRepo.Object,
                _returnRepo.Object,
                _userRepo.Object,
                _uow.Object);

            var result = await handler.Handle(
                new CancelFulfillmentOrderDueToNoStockCommand(
                    fulfillment.Id, variantId, warehouseId, 2, vendorId, UserRole.Seller),
                CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.True(result.Value);
            Assert.Equal(FulfillmentStatus.Cancelled, fulfillment.Status);
            Assert.Equal(0.1m, vendor.StockFantasmaRate);

            _inventoryRepo.Verify(r => r.UpdateAsync(inventory, It.IsAny<CancellationToken>()), Times.Once);
            _returnRepo.Verify(r => r.AddAsync(It.IsAny<ReturnRequest>(), It.IsAny<CancellationToken>()), Times.Once);
            _userRepo.Verify(r => r.UpdateAsync(vendor), Times.Once);
            _uow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task PartialFulfillmentCancelledConsumer_AutoRefundWithApprovedReceipt_CreditsReceiptAndSavesAudit()
        {
            var buyerId = Guid.NewGuid();
            var vendorId = Guid.NewGuid();
            var variantId = Guid.NewGuid();
            var warehouseId = Guid.NewGuid();

            var order = new CustomerOrder(buyerId);
            order.AddItem(variantId, vendorId, 2, new Money(30_000m, "COP"));
            order.Checkout();
            order.MarkAsPaid();

            var fulfillment = new FulfillmentOrder(order.Id, vendorId);
            var returnReq = new ReturnRequest(order.Id, variantId, warehouseId, 1, ProductType.Physical);
            var receipt = PaymentReceipt.Create(order.Id, new Money(60_000m, "COP"));
            receipt.Approve("TX-AUTO-1");

            _fulfillmentRepo
                .Setup(r => r.GetByIdAsync(fulfillment.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(fulfillment);
            _orderRepo
                .Setup(r => r.GetByIdAsync(order.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(order);
            _returnRepo
                .Setup(r => r.GetByOrderIdAsync(order.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<ReturnRequest> { returnReq });
            _receiptRepo
                .Setup(r => r.GetByOrderIdAsync(order.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(receipt);

            var policyService = new RefundPolicyService(_receiptRepo.Object, _orderRepo.Object);
            var consumer = new PartialFulfillmentCancelledConsumer(
                _fulfillmentRepo.Object,
                _returnRepo.Object,
                _receiptRepo.Object,
                _orderRepo.Object,
                _auditRepo.Object,
                _uow.Object,
                policyService);

            var evt = new PartialFulfillmentCancelledDomainEvent(fulfillment.Id, "stock_breakage");
            await consumer.Handle(new DomainEventNotification<PartialFulfillmentCancelledDomainEvent>(evt), CancellationToken.None);

            Assert.Equal(30_000m, receipt.RefundedAmount.Amount);
            _auditRepo.Verify(
                a => a.AddAsync(It.Is<RefundAudit>(ra => ra.AttemptedAmount == 30_000m), It.IsAny<CancellationToken>()),
                Times.Once);
            _uow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task PartialFulfillmentCancelledConsumer_WhenNoReceiptExists_LogsPolicyExceptionAudit()
        {
            var buyerId = Guid.NewGuid();
            var vendorId = Guid.NewGuid();
            var variantId = Guid.NewGuid();
            var warehouseId = Guid.NewGuid();

            var order = new CustomerOrder(buyerId);
            order.AddItem(variantId, vendorId, 1, new Money(25_000m, "COP"));

            var fulfillment = new FulfillmentOrder(order.Id, vendorId);
            var returnReq = new ReturnRequest(order.Id, variantId, warehouseId, 1, ProductType.Physical);

            _fulfillmentRepo
                .Setup(r => r.GetByIdAsync(fulfillment.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(fulfillment);
            _orderRepo
                .Setup(r => r.GetByIdAsync(order.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(order);
            _returnRepo
                .Setup(r => r.GetByOrderIdAsync(order.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<ReturnRequest> { returnReq });
            _receiptRepo
                .Setup(r => r.GetByOrderIdAsync(order.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync((PaymentReceipt?)null);

            var policyService = new RefundPolicyService(_receiptRepo.Object, _orderRepo.Object);
            var consumer = new PartialFulfillmentCancelledConsumer(
                _fulfillmentRepo.Object,
                _returnRepo.Object,
                _receiptRepo.Object,
                _orderRepo.Object,
                _auditRepo.Object,
                _uow.Object,
                policyService);

            var evt = new PartialFulfillmentCancelledDomainEvent(fulfillment.Id, "stock_breakage");
            await consumer.Handle(new DomainEventNotification<PartialFulfillmentCancelledDomainEvent>(evt), CancellationToken.None);

            _auditRepo.Verify(
                a => a.AddAsync(It.Is<RefundAudit>(ra => ra.Outcome == RefundAuditOutcome.Error), It.IsAny<CancellationToken>()),
                Times.Once);
            _uow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task CartExpiredConsumer_Handle_LogsInformationWithoutThrowing()
        {
            var loggerMock = new Mock<ILogger<CartExpiredConsumer>>();
            var consumer = new CartExpiredConsumer(loggerMock.Object);
            var evt = new CartExpiredDomainEvent(Guid.NewGuid(), DateTimeOffset.UtcNow);

            await consumer.Handle(new DomainEventNotification<CartExpiredDomainEvent>(evt), CancellationToken.None);

            loggerMock.Verify(
                x => x.Log(
                    LogLevel.Information,
                    It.IsAny<EventId>(),
                    It.IsAny<It.IsAnyType>(),
                    null,
                    It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
                Times.Once);
        }

        [Fact]
        public async Task BuyerRepository_And_BuyerMapper_RoundtripPersistence_Succeeds()
        {
            var options = new DbContextOptionsBuilder<ZentricDbContext>()
                .UseInMemoryDatabase("BuyerRepoTest_" + Guid.NewGuid())
                .Options;

            await using var context = new ZentricDbContext(options);
            var repo = new BuyerRepository(context);

            var userId = Guid.NewGuid();
            var address = new Address("Calle 100 #15-20", "Bogota", "Cundinamarca", "110111", "CO");
            var buyer = new Buyer(userId, address);

            await repo.AddAsync(buyer);
            await context.SaveChangesAsync();

            context.ChangeTracker.Clear();

            var loaded = await repo.GetByIdAsync(userId);
            Assert.NotNull(loaded);
            Assert.Equal(userId, loaded!.UserId);
            Assert.Equal("Calle 100 #15-20", loaded.MainAddress.Street);

            var newAddress = new Address("Carrera 7 #72-00", "Medellin", "Antioquia", "050001", "CO");
            loaded.UpdateMainAddress(newAddress);
            await repo.UpdateAsync(loaded);
            await context.SaveChangesAsync();

            context.ChangeTracker.Clear();
            var updated = await repo.GetByIdAsync(userId);
            Assert.NotNull(updated);
            Assert.Equal("Medellin", updated!.MainAddress.City);
        }

        [Fact]
        public async Task RefundAuditRepository_And_RefundAuditMapper_RoundtripPersistence_Succeeds()
        {
            var options = new DbContextOptionsBuilder<ZentricDbContext>()
                .UseInMemoryDatabase("RefundAuditRepoTest_" + Guid.NewGuid())
                .Options;

            await using var context = new ZentricDbContext(options);
            var repo = new RefundAuditRepository(context);

            var returnId = Guid.NewGuid();
            var orderId = Guid.NewGuid();
            var receiptId = Guid.NewGuid();
            var audit = RefundAudit.CreateAuto(
                returnRequestId: returnId,
                customerOrderId: orderId,
                orderLineId: Guid.NewGuid(),
                paymentReceiptId: receiptId,
                ruleApplied: "EXC-02: Auto stock breakage",
                outcome: RefundAuditOutcome.Credited,
                attemptedAmount: 45_000m,
                currency: "COP",
                errorMessage: null);

            await repo.AddAsync(audit);
            await context.SaveChangesAsync();

            var byId = await repo.GetByIdAsync(audit.Id);
            Assert.NotNull(byId);
            Assert.Equal(45_000m, byId!.AttemptedAmount);
            Assert.Equal(RefundAuditOutcome.Credited, byId.Outcome);

            var byReturn = await repo.GetByReturnRequestIdAsync(returnId);
            Assert.Single(byReturn);

            var byOrder = await repo.GetByOrderIdAsync(orderId);
            Assert.Single(byOrder);
        }
    }
}
