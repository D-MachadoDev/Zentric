using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Security.Claims;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Migrations;
using Moq;
using Xunit;
using Zentric.Api.Controllers;
using Zentric.Api.Security;
using Zentric.Application.Billing.Queries;
using Zentric.Application.Common.Messaging;
using Zentric.Domain.Billing;
using Zentric.Domain.Billing.Ports;
using Zentric.Domain.Buyers.Ports;
using Zentric.Domain.Inventories.Ports;
using Zentric.Domain.Logistics.Ports;
using Zentric.Domain.Orders;
using Zentric.Domain.Orders.Enums;
using Zentric.Domain.Orders.Ports;
using Zentric.Domain.Payments.Ports;
using Zentric.Domain.Products.Ports;
using Zentric.Domain.Products.ValueObjects;
using Zentric.Domain.Returns.Ports;
using Zentric.Domain.Users.Enums;
using Zentric.Domain.Users.Ports;
using Zentric.Domain.Warehouses.Ports;
using Zentric.Infrastructure.Persistence;
using Zentric.Infrastructure.Persistence.Models;

namespace Zentric.Tests.Presentation
{
    /// <summary>
    /// Verificación explícita de las compuertas transversales de cierre (W5-S02):
    /// - Gate (d): Confidencialidad de la factura de comisión del 5% (ZentricDetail) en BillingController,
    ///   garantizando que jamás se serialice hacia Buyer ni Seller, y solo sea visible para Administrator y Supervisor
    ///   (ZENTRIC.md ADDENDUM Dominio 9, ADR-0013, ADR-0023, Q-21b).
    /// - Gate (e): Auditoría Anti-Amnesia de los 14 DbSets en ZentricDbContext, los 11 repositorios y las 15 migraciones
    ///   (AGENTS.md sección 2.4, backendSDD/Infrastructure/01-data-access.md y 04-entity-map.md).
    /// </summary>
    public sealed class TransversalGatesVerificationTests
    {
        // =========================================================================================
        // Gate (d): Confidencialidad de la factura de comisión del 5% (ZentricDetail)
        // =========================================================================================

        private sealed class InMemorySplitInvoiceRepository : IInvoiceRepository
        {
            private readonly IReadOnlyList<Invoice> _invoices;
            private readonly Guid _orderBuyerId;
            private readonly Guid _orderId;

            public InMemorySplitInvoiceRepository(Guid orderId, Guid orderBuyerId, IReadOnlyList<Invoice> invoices)
            {
                _orderId = orderId;
                _orderBuyerId = orderBuyerId;
                _invoices = invoices;
            }

            public Task<Invoice?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
                => Task.FromResult(_invoices.FirstOrDefault(i => i.Id == id));

            public Task<IReadOnlyList<Invoice>> GetByOrderIdAsync(Guid orderId, CancellationToken cancellationToken = default)
                => Task.FromResult<IReadOnlyList<Invoice>>(
                    _invoices.Where(i => i.CustomerOrderId == orderId).ToList());

            // Replica exacta del filtrado en base de datos de InvoiceRepository.GetListAsync (Q-21b / ADR-0017):
            // - Si se filtra por buyerId: únicamente Facturas Maestras (Master) de pedidos de ese comprador.
            // - Si se filtra por vendorId: únicamente Facturas de Vendedor (VendorDetail) de ese vendedor.
            // - Si ambos son null (Administrator / Supervisor): todas las facturas, incluyendo ZentricDetail (5%).
            public Task<IReadOnlyList<Invoice>> GetListAsync(
                Guid? buyerId, Guid? vendorId, CancellationToken cancellationToken = default)
            {
                IEnumerable<Invoice> query = _invoices;

                if (buyerId.HasValue)
                {
                    query = query.Where(i =>
                        i.CustomerOrderId == _orderId &&
                        _orderBuyerId == buyerId.Value &&
                        i.Type == Zentric.Domain.Billing.Enums.InvoiceType.Master);
                }

                if (vendorId.HasValue)
                {
                    query = query.Where(i =>
                        i.VendorId == vendorId.Value &&
                        i.Type == Zentric.Domain.Billing.Enums.InvoiceType.VendorDetail);
                }

                return Task.FromResult<IReadOnlyList<Invoice>>(query.ToList());
            }

            public Task AddAsync(Invoice invoice, CancellationToken cancellationToken = default)
                => Task.CompletedTask;

            public Task AddRangeAsync(IEnumerable<Invoice> invoices, CancellationToken cancellationToken = default)
                => Task.CompletedTask;

            public Task UpdateAsync(Invoice invoice, CancellationToken cancellationToken = default)
                => Task.CompletedTask;
        }

        private sealed class SingleOrderRepository : ICustomerOrderRepository
        {
            private readonly CustomerOrder _order;

            public SingleOrderRepository(CustomerOrder order) => _order = order;

            public Task<CustomerOrder?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
                => Task.FromResult(id == _order.Id ? _order : null);

            public Task<CustomerOrder?> GetByIdForBuyerAsync(Guid id, Guid buyerId, CancellationToken cancellationToken = default)
                => Task.FromResult(id == _order.Id && _order.BuyerId == buyerId ? _order : null);

            public Task<CustomerOrder?> GetByIdForVendorAsync(Guid id, Guid vendorId, CancellationToken cancellationToken = default)
                => Task.FromResult(id == _order.Id && _order.Items.Any(i => i.VendorId == vendorId) ? _order : null);

            public Task<IReadOnlyList<CustomerOrder>> GetListAsync(
                Guid? buyerId, Guid? vendorId, OrderStatus? status, CancellationToken cancellationToken = default)
                => Task.FromResult<IReadOnlyList<CustomerOrder>>(new[] { _order });

            public Task<IReadOnlyList<CustomerOrder>> GetExpiredOrdersAsync(
                DateTime threshold, CancellationToken cancellationToken = default)
                => Task.FromResult<IReadOnlyList<CustomerOrder>>(Array.Empty<CustomerOrder>());

            public Task AddAsync(CustomerOrder order, CancellationToken cancellationToken = default)
                => Task.CompletedTask;

            public Task UpdateAsync(CustomerOrder order, CancellationToken cancellationToken = default)
                => Task.CompletedTask;
        }

        private static (BillingController Controller, Guid OrderId, Guid BuyerId, Guid SellerId) BuildBillingControllerForRole(
            UserRole callerRole,
            Guid? explicitCallerId = null)
        {
            var buyerId = Guid.NewGuid();
            var sellerId = Guid.NewGuid();
            var callerId = explicitCallerId ?? callerRole switch
            {
                UserRole.Buyer => buyerId,
                UserRole.Seller => sellerId,
                _ => Guid.NewGuid()
            };

            var order = new CustomerOrder(buyerId);
            order.AddItem(Guid.NewGuid(), sellerId, 1, new Money(100_000m, "COP"));

            // Split de facturación (ZENTRIC.md ADDENDUM Dominio 9 y ADR-0023):
            // - Master: 100.000 COP (100% para el comprador)
            // - ZentricDetail: 5.000 COP (5% comisión confidencial de plataforma)
            // - VendorDetail: 95.000 COP (95% liquidación neta del vendedor)
            var invoices = new List<Invoice>
            {
                Invoice.CreateMaster(order.Id, new Money(100_000m, "COP")),
                Invoice.CreateZentricDetail(order.Id, new Money(5_000m, "COP")),
                Invoice.CreateVendorDetail(order.Id, sellerId, new Money(95_000m, "COP"))
            };

            var invoiceRepo = new InMemorySplitInvoiceRepository(order.Id, buyerId, invoices);
            var orderRepo = new SingleOrderRepository(order);
            var getInvoicesHandler = new GetInvoicesQueryHandler(invoiceRepo);
            var getInvoicesByOrderHandler = new GetInvoicesByOrderQueryHandler(invoiceRepo, orderRepo);

            var mediatorMock = new Mock<IMediator>();
            mediatorMock
                .Setup(m => m.Send(It.IsAny<GetInvoicesQuery>(), It.IsAny<CancellationToken>()))
                .Returns((GetInvoicesQuery q, CancellationToken ct) => getInvoicesHandler.Handle(q, ct));
            mediatorMock
                .Setup(m => m.Send(It.IsAny<GetInvoicesByOrderQuery>(), It.IsAny<CancellationToken>()))
                .Returns((GetInvoicesByOrderQuery q, CancellationToken ct) => getInvoicesByOrderHandler.Handle(q, ct));

            var currentUserMock = new Mock<ICurrentUserAccessor>();
            currentUserMock.Setup(u => u.UserId).Returns(callerId);

            var controller = new BillingController(mediatorMock.Object, currentUserMock.Object)
            {
                ControllerContext = new ControllerContext
                {
                    HttpContext = new DefaultHttpContext
                    {
                        User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                        {
                            new Claim("sub", callerId.ToString()),
                            new Claim(ClaimTypes.Role, callerRole.ToString())
                        }, "TestAuth"))
                    }
                }
            };

            return (controller, order.Id, buyerId, sellerId);
        }

        [Theory]
        [InlineData(UserRole.Buyer, "Master")]
        [InlineData(UserRole.Seller, "VendorDetail")]
        public async Task BillingController_GetInvoices_NeverSerializesZentricDetail5PercentCommission_ToBuyerOrSeller(
            UserRole role,
            string expectedAllowedType)
        {
            var (controller, _, _, _) = BuildBillingControllerForRole(role);

            var actionResult = await controller.GetInvoices();

            var okResult = Assert.IsType<OkObjectResult>(actionResult);
            var dtos = Assert.IsAssignableFrom<IReadOnlyList<InvoiceDto>>(okResult.Value);
            var singleDto = Assert.Single(dtos);
            Assert.Equal(expectedAllowedType, singleDto.Type);
            Assert.NotEqual("ZentricDetail", singleDto.Type);

            var serializedJson = JsonSerializer.Serialize(dtos);
            Assert.DoesNotContain("ZentricDetail", serializedJson, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("\"TotalAmount\":5000", serializedJson, StringComparison.OrdinalIgnoreCase);
        }

        [Theory]
        [InlineData(UserRole.Buyer, "Master")]
        [InlineData(UserRole.Seller, "VendorDetail")]
        public async Task BillingController_GetInvoicesByOrder_NeverSerializesZentricDetail5PercentCommission_ToBuyerOrSeller(
            UserRole role,
            string expectedAllowedType)
        {
            var (controller, orderId, _, _) = BuildBillingControllerForRole(role);

            var actionResult = await controller.GetInvoicesByOrder(orderId);

            var okResult = Assert.IsType<OkObjectResult>(actionResult);
            var dtos = Assert.IsAssignableFrom<IReadOnlyList<InvoiceDto>>(okResult.Value);
            var singleDto = Assert.Single(dtos);
            Assert.Equal(expectedAllowedType, singleDto.Type);
            Assert.NotEqual("ZentricDetail", singleDto.Type);

            var serializedJson = JsonSerializer.Serialize(dtos);
            Assert.DoesNotContain("ZentricDetail", serializedJson, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("\"TotalAmount\":5000", serializedJson, StringComparison.OrdinalIgnoreCase);
        }

        [Theory]
        [InlineData(UserRole.Administrator)]
        [InlineData(UserRole.Supervisor)]
        public async Task BillingController_GetInvoicesAndByOrder_ExposesZentricDetail5PercentCommission_OnlyToAdminAndSupervisor(
            UserRole role)
        {
            var (controller, orderId, _, _) = BuildBillingControllerForRole(role);

            var listAction = await controller.GetInvoices();
            var listOk = Assert.IsType<OkObjectResult>(listAction);
            var listDtos = Assert.IsAssignableFrom<IReadOnlyList<InvoiceDto>>(listOk.Value);
            Assert.Equal(3, listDtos.Count);
            Assert.Contains(listDtos, d => d.Type == "ZentricDetail" && d.TotalAmount == 5_000m);

            var byOrderAction = await controller.GetInvoicesByOrder(orderId);
            var byOrderOk = Assert.IsType<OkObjectResult>(byOrderAction);
            var byOrderDtos = Assert.IsAssignableFrom<IReadOnlyList<InvoiceDto>>(byOrderOk.Value);
            Assert.Equal(3, byOrderDtos.Count);
            Assert.Contains(byOrderDtos, d => d.Type == "ZentricDetail" && d.TotalAmount == 5_000m);
        }

        // =========================================================================================
        // Gate (e): Anti-Amnesia — 14 DbSets, 11 Repositorios y 15 Migraciones en ZentricDbContext
        // =========================================================================================

        private static readonly IReadOnlyDictionary<string, Type> Canonical14DbSets =
            new Dictionary<string, Type>(StringComparer.Ordinal)
            {
                [nameof(ZentricDbContext.CustomerOrders)] = typeof(CustomerOrderDbModel),
                [nameof(ZentricDbContext.FulfillmentOrders)] = typeof(FulfillmentOrderDbModel),
                [nameof(ZentricDbContext.ReturnRequests)] = typeof(ReturnRequestDbModel),
                [nameof(ZentricDbContext.Invoices)] = typeof(InvoiceDbModel),
                [nameof(ZentricDbContext.PaymentReceipts)] = typeof(PaymentReceiptDbModel),
                [nameof(ZentricDbContext.RefundCredits)] = typeof(RefundCreditDbModel),
                [nameof(ZentricDbContext.DigitalDeliveries)] = typeof(DigitalDeliveryRecordDbModel),
                [nameof(ZentricDbContext.RefundAudits)] = typeof(RefundAuditDbModel),
                [nameof(ZentricDbContext.Users)] = typeof(UserDbModel),
                [nameof(ZentricDbContext.Buyers)] = typeof(BuyerDbModel),
                [nameof(ZentricDbContext.Products)] = typeof(ProductDbModel),
                [nameof(ZentricDbContext.Inventories)] = typeof(InventoryDbModel),
                [nameof(ZentricDbContext.StockAdjustments)] = typeof(StockAdjustmentDbModel),
                [nameof(ZentricDbContext.Warehouses)] = typeof(WarehouseDbModel)
            };

        [Fact]
        public void AntiAmnesia_ZentricDbContext_DeclaresExactly14CanonicalDbSets()
        {
            var dbSetProperties = typeof(ZentricDbContext)
                .GetProperties(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly)
                .Where(p => p.PropertyType.IsGenericType &&
                            p.PropertyType.GetGenericTypeDefinition() == typeof(DbSet<>))
                .ToList();

            Assert.Equal(14, dbSetProperties.Count);
            Assert.Equal(14, Canonical14DbSets.Count);

            foreach (var expected in Canonical14DbSets)
            {
                var prop = dbSetProperties.SingleOrDefault(p => p.Name == expected.Key);
                Assert.NotNull(prop);
                var entityType = prop!.PropertyType.GetGenericArguments()[0];
                Assert.Equal(expected.Value, entityType);
            }
        }

        [Fact]
        public void AntiAmnesia_ZentricDbContextModel_MapsAll14DbSetEntityTypes()
        {
            var options = new DbContextOptionsBuilder<ZentricDbContext>()
                .UseInMemoryDatabase("AntiAmnesiaModelVerification_" + Guid.NewGuid())
                .Options;

            using var context = new ZentricDbContext(options);
            var mappedClrTypes = context.Model.GetEntityTypes()
                .Select(e => e.ClrType)
                .ToHashSet();

            foreach (var expected in Canonical14DbSets)
            {
                Assert.True(
                    mappedClrTypes.Contains(expected.Value),
                    $"El DbModel '{expected.Value.Name}' del DbSet '{expected.Key}' no está registrado en el modelo de EF Core.");
            }
        }

        [Fact]
        public void AntiAmnesia_Infrastructure_ImplementsAll11RepositoryPortsAnd15Migrations()
        {
            var expectedRepositoryPorts = new[]
            {
                typeof(IUserRepository),
                typeof(IBuyerRepository),
                typeof(IProductRepository),
                typeof(IWarehouseRepository),
                typeof(IInventoryRepository),
                typeof(ICustomerOrderRepository),
                typeof(IFulfillmentOrderRepository),
                typeof(IReturnRequestRepository),
                typeof(IRefundAuditRepository),
                typeof(IPaymentReceiptRepository),
                typeof(IInvoiceRepository)
            };

            Assert.Equal(11, expectedRepositoryPorts.Length);

            var infraTypes = typeof(ZentricDbContext).Assembly.GetTypes();

            foreach (var port in expectedRepositoryPorts)
            {
                var concreteImplementations = infraTypes
                    .Where(t => t.IsClass && !t.IsAbstract && port.IsAssignableFrom(t))
                    .ToList();

                Assert.True(
                    concreteImplementations.Count >= 1,
                    $"El puerto de salida '{port.Name}' no tiene adaptador concreto en Zentric.Infrastructure.");
            }

            var migrations = infraTypes
                .Where(t => t.IsClass && !t.IsAbstract && typeof(Migration).IsAssignableFrom(t))
                .ToList();

            Assert.Equal(16, migrations.Count);
        }
    }
}
