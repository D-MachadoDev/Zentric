using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Xunit;
using Zentric.Application.Billing.Commands;
using Zentric.Application.Common.Ports;
using Zentric.Domain.Billing;
using Zentric.Domain.Billing.Enums;
using Zentric.Domain.Billing.Ports;
using Zentric.Domain.Orders;
using Zentric.Domain.Orders.Enums;
using Zentric.Domain.Orders.Ports;
using Zentric.Domain.Products.ValueObjects;

namespace Zentric.Tests.Application.Billing
{
    /// <summary>
    /// Emision de facturas (Q-21d). El dictamen confirmo que solo el Administrador
    /// emite, y ordeno las dos guardas que la spec del endpoint prometia y el handler
    /// no tenia: no se factura un pedido sin pagar y no se factura dos veces.
    /// </summary>
    public class GenerateInvoicesCommandHandlerTests
    {
        private sealed class FakeInvoiceRepository : IInvoiceRepository
        {
            public List<Invoice> Invoices { get; } = new();

            public Task<Invoice?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
                => Task.FromResult(Invoices.FirstOrDefault(i => i.Id == id));

            public Task<IReadOnlyList<Invoice>> GetByOrderIdAsync(Guid orderId, CancellationToken cancellationToken = default)
                => Task.FromResult((IReadOnlyList<Invoice>)Invoices.Where(i => i.CustomerOrderId == orderId).ToList());

            public Task AddAsync(Invoice invoice, CancellationToken cancellationToken = default)
            {
                Invoices.Add(invoice);
                return Task.CompletedTask;
            }

            public Task AddRangeAsync(IEnumerable<Invoice> invoices, CancellationToken cancellationToken = default)
            {
                Invoices.AddRange(invoices);
                return Task.CompletedTask;
            }

            public Task UpdateAsync(Invoice invoice, CancellationToken cancellationToken = default)
                => Task.CompletedTask;
        }

        private sealed class FakeOrderRepository : ICustomerOrderRepository
        {
            public List<CustomerOrder> Orders { get; } = new();

            public Task<CustomerOrder?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
                => Task.FromResult(Orders.FirstOrDefault(o => o.Id == id));

            public Task<CustomerOrder?> GetByIdForBuyerAsync(Guid id, Guid buyerId, CancellationToken cancellationToken = default)
                => Task.FromResult(Orders.FirstOrDefault(o => o.Id == id && o.BuyerId == buyerId));

            public Task<CustomerOrder?> GetByIdForVendorAsync(Guid id, Guid vendorId, CancellationToken cancellationToken = default)
                => Task.FromResult(Orders.FirstOrDefault(o => o.Id == id && o.Items.Any(i => i.VendorId == vendorId)));

            public Task<IReadOnlyList<CustomerOrder>> GetExpiredOrdersAsync(DateTime threshold, CancellationToken cancellationToken = default)
                => Task.FromResult((IReadOnlyList<CustomerOrder>)Array.Empty<CustomerOrder>());

            public Task AddAsync(CustomerOrder order, CancellationToken cancellationToken = default)
            {
                Orders.Add(order);
                return Task.CompletedTask;
            }

            public Task UpdateAsync(CustomerOrder order, CancellationToken cancellationToken = default)
                => Task.CompletedTask;
        }

        private sealed class FakeUnitOfWork : IUnitOfWork
        {
            public bool SaveChangesCalled { get; private set; }

            public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
            {
                SaveChangesCalled = true;
                return Task.FromResult(1);
            }
        }

        private static CustomerOrder OrderIn(OrderStatus status, out Guid vendorId)
        {
            var order = new CustomerOrder(Guid.NewGuid());
            vendorId = Guid.NewGuid();
            order.AddItem(Guid.NewGuid(), vendorId, 1, new Money(100m, "COP"));
            if (status != OrderStatus.Cart)
            {
                order.Checkout();          // Cart -> PendingPayment
            }
            if (status is OrderStatus.Paid or OrderStatus.Dispatched or OrderStatus.Delivered)
            {
                order.MarkAsPaid();         // PendingPayment -> Paid
            }
            return order;
        }
        [Fact]
        public async Task Handle_OrderNotFound_ReturnsFailure()
        {
            var handler = new GenerateInvoicesCommandHandler(new FakeInvoiceRepository(), new FakeOrderRepository(), new FakeUnitOfWork());

            var result = await handler.Handle(new GenerateInvoicesCommand(Guid.NewGuid()), CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.Contains("not found", result.Error);
        }

        [Theory]
        [InlineData(OrderStatus.Cart)]
        [InlineData(OrderStatus.PendingPayment)]
        [InlineData(OrderStatus.Cancelled)]
        public async Task Handle_OrderNotPaid_RefusesToInvoice(OrderStatus status)
        {
            // Q-21d: la spec del endpoint ya prometia este 400 y no existia. Facturar un
            // carrito o un pedido pendiente de pago es emitir un documento financiero
            // sobre una operacion que no ocurrio.
            var invoices = new FakeInvoiceRepository();
            var orders = new FakeOrderRepository();
            var uow = new FakeUnitOfWork();
            var handler = new GenerateInvoicesCommandHandler(invoices, orders, uow);
            var order = OrderIn(status, out _);
            orders.Orders.Add(order);

            var result = await handler.Handle(new GenerateInvoicesCommand(order.Id), CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.Contains("has not been paid", result.Error);
            Assert.Empty(invoices.Invoices);
            Assert.False(uow.SaveChangesCalled);
        }

        [Fact]
        public async Task Handle_AlreadyInvoiced_RefusesToIssueThemTwice()
        {
            // Q-21d: un doble clic o un reintento duplicaba las tres facturas. Este caso
            // no lo puede cazar una prueba de autorizacion: es la misma peticion dos veces.
            var invoices = new FakeInvoiceRepository();
            var orders = new FakeOrderRepository();
            var uow = new FakeUnitOfWork();
            var handler = new GenerateInvoicesCommandHandler(invoices, orders, uow);
            var order = OrderIn(OrderStatus.Paid, out _);
            orders.Orders.Add(order);
            invoices.Invoices.Add(Invoice.CreateMaster(order.Id, new Money(100m, "COP")));

            var result = await handler.Handle(new GenerateInvoicesCommand(order.Id), CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.Contains("already been issued", result.Error);
            Assert.Single(invoices.Invoices);
            Assert.False(uow.SaveChangesCalled);
        }

        [Fact]
        public async Task Handle_PaidOrder_IssuesMasterZentricAndVendorInvoices()
        {
            var invoices = new FakeInvoiceRepository();
            var orders = new FakeOrderRepository();
            var uow = new FakeUnitOfWork();
            var handler = new GenerateInvoicesCommandHandler(invoices, orders, uow);
            var order = OrderIn(OrderStatus.Paid, out var vendorId);
            orders.Orders.Add(order);

            var result = await handler.Handle(new GenerateInvoicesCommand(order.Id), CancellationToken.None);

            Assert.True(result.IsSuccess, result.Error);
            Assert.Equal(3, invoices.Invoices.Count);
            Assert.Contains(invoices.Invoices, i => i.Type == InvoiceType.Master);
            Assert.Contains(invoices.Invoices, i => i.Type == InvoiceType.ZentricDetail);
            var vendorInvoice = Assert.Single(invoices.Invoices, i => i.Type == InvoiceType.VendorDetail);
            Assert.Equal(vendorId, vendorInvoice.VendorId);
            Assert.True(uow.SaveChangesCalled);
        }
    }
}
