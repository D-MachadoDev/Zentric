using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Xunit;
using Zentric.Application.Common.Ports;
using Zentric.Application.Orders.Commands;
using Zentric.Domain.Orders;
using Zentric.Domain.Orders.Enums;
using Zentric.Domain.Orders.Ports;
using Zentric.Domain.Payments;
using Zentric.Domain.Payments.Enums;
using Zentric.Domain.Payments.Ports;
using Zentric.Domain.Products.ValueObjects;
using Zentric.Tests.Application.Catalog;

namespace Zentric.Tests.Application.Orders
{
    /// <summary>
    /// Pasarela que aprueba siempre. Q-08: el cobro ocurre antes de marcar el
    /// pedido como pagado, asi que los tests del handler necesitan una pasarela.
    /// </summary>
    public sealed class ApprovingPaymentGateway : IPaymentGatewayService
    {
        public List<Money> ChargedAmounts { get; } = new();

        public Task<PaymentResult> ChargeAsync(
            Guid orderId, Money amount, CancellationToken cancellationToken = default)
        {
            ChargedAmounts.Add(amount);
            return Task.FromResult(PaymentResult.Success($"SIM-{orderId:N}"));
        }
    }

    /// <summary>Pasarela que rechaza siempre, para probar el rechazo como resultado de negocio.</summary>
    public sealed class DecliningPaymentGateway : IPaymentGatewayService
    {
        public Task<PaymentResult> ChargeAsync(
            Guid orderId, Money amount, CancellationToken cancellationToken = default)
            => Task.FromResult(PaymentResult.Rejected("insufficient-funds"));
    }

    /// <summary>
    /// Repositorio de comprobantes en memoria. Permite afirmar que el cobro
    /// quedo registrado, no solo que el pedido quedo pagado.
    /// </summary>
    public sealed class FakePaymentReceiptRepository : IPaymentReceiptRepository
    {
        public List<PaymentReceipt> Receipts { get; } = new();

        public Task AddAsync(PaymentReceipt receipt, CancellationToken cancellationToken = default)
        {
            Receipts.Add(receipt);
            return Task.CompletedTask;
        }

        public Task UpdateAsync(PaymentReceipt receipt, CancellationToken cancellationToken = default)
        {
            return Task.CompletedTask;
        }

        public Task<PaymentReceipt?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
            => Task.FromResult(Receipts.FirstOrDefault(r => r.Id == id));

        public Task<PaymentReceipt?> GetByOrderIdAsync(Guid orderId, CancellationToken cancellationToken = default)
            => Task.FromResult(Receipts.LastOrDefault(r => r.OrderId == orderId));
    }

    public class FakeCustomerOrderRepositoryForPay : ICustomerOrderRepository
    {
        public List<CustomerOrder> Orders { get; } = new();

        public Task AddAsync(CustomerOrder order, CancellationToken cancellationToken = default)
        {
            Orders.Add(order);
            return Task.CompletedTask;
        }

        public Task<CustomerOrder?> GetByIdForBuyerAsync(
            Guid id, Guid buyerId, CancellationToken cancellationToken = default)
        {
            var order = Orders.FirstOrDefault(o => o.Id == id && o.BuyerId == buyerId);
            return Task.FromResult(order);
        }

        public Task<CustomerOrder?> GetByIdForVendorAsync(
            Guid id, Guid vendorId, CancellationToken cancellationToken = default)
        {
            var order = Orders.FirstOrDefault(o => o.Id == id && o.Items.Any(i => i.VendorId == vendorId));
            return Task.FromResult(order);
        }

        public Task<CustomerOrder?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(Orders.FirstOrDefault(o => o.Id == id));
        }

        public Task<IReadOnlyList<CustomerOrder>> GetExpiredOrdersAsync(DateTime threshold, CancellationToken cancellationToken = default)
        {
            var result = (IReadOnlyList<CustomerOrder>)Orders.Where(o => o.UpdatedAt < threshold).ToList();
            return Task.FromResult(result);
        }

        public Task UpdateAsync(CustomerOrder order, CancellationToken cancellationToken = default)
        {
            return Task.CompletedTask;
        }
    }

    public class PayOrderCommandHandlerTests
    {
        [Fact]
        public async Task Handle_PersistsThePaymentReceipt_WhenApproved()
        {
            // El cobro debe quedar registrado, no solo el pedido pagado: sin
            // comprobante no hay forma de saber que se cobro ni por cuanto.
            var repo = new FakeCustomerOrderRepositoryForPay();
            var receipts = new FakePaymentReceiptRepository();
            var handler = new PayOrderCommandHandler(
                repo, new FakeUnitOfWork(), new ApprovingPaymentGateway(), receipts);

            var buyerId = Guid.NewGuid();
            var order = new CustomerOrder(buyerId);
            order.AddItem(Guid.NewGuid(), Guid.NewGuid(), 2, new Money(50m, "COP"));
            order.Checkout();
            await repo.AddAsync(order);

            var result = await handler.Handle(new PayOrderCommand(order.Id, buyerId), CancellationToken.None);

            Assert.True(result.IsSuccess);
            var receipt = Assert.Single(receipts.Receipts);
            Assert.Equal(PaymentStatus.Approved, receipt.Status);
            Assert.Equal(order.Id, receipt.OrderId);
            Assert.Equal(new Money(100m, "COP"), receipt.Amount);
        }

        [Fact]
        public async Task Handle_PersistsDeclinedReceipt_WhenGatewayRejects()
        {
            // Aunque se rechace, queda constancia del intento de cobro.
            var repo = new FakeCustomerOrderRepositoryForPay();
            var receipts = new FakePaymentReceiptRepository();
            var handler = new PayOrderCommandHandler(
                repo, new FakeUnitOfWork(), new DecliningPaymentGateway(), receipts);

            var buyerId = Guid.NewGuid();
            var order = new CustomerOrder(buyerId);
            order.AddItem(Guid.NewGuid(), Guid.NewGuid(), 1, new Money(50m, "COP"));
            order.Checkout();
            await repo.AddAsync(order);

            await handler.Handle(new PayOrderCommand(order.Id, buyerId), CancellationToken.None);

            var receipt = Assert.Single(receipts.Receipts);
            Assert.Equal(PaymentStatus.Declined, receipt.Status);
        }

        [Fact]
        public async Task Handle_WhenGatewayDeclines_DoesNotMarkOrderAsPaid()
        {
            // Q-08: un rechazo es un resultado previsto de negocio, no una excepcion,
            // y el pedido NO debe quedar pagado (seria un pedido cobrado sin cobrar).
            var repo = new FakeCustomerOrderRepositoryForPay();
            var uow = new FakeUnitOfWork();
            var handler = new PayOrderCommandHandler(repo, uow, new DecliningPaymentGateway(), new FakePaymentReceiptRepository());

            var buyerId = Guid.NewGuid();
            var order = new CustomerOrder(buyerId);
            order.AddItem(Guid.NewGuid(), Guid.NewGuid(), 1, new Money(50m, "COP"));
            order.Checkout();
            await repo.AddAsync(order);

            var result = await handler.Handle(new PayOrderCommand(order.Id, buyerId), CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.Contains("declined", result.Error);
            Assert.Equal(OrderStatus.PendingPayment, order.Status);
        }

        [Fact]
        public async Task Handle_ChargesTheOrderTotalThroughTheGateway()
        {
            // El importe cobrado debe ser el total del pedido, no una unidad ni un cero.
            var repo = new FakeCustomerOrderRepositoryForPay();
            var gateway = new ApprovingPaymentGateway();
            var handler = new PayOrderCommandHandler(repo, new FakeUnitOfWork(), gateway, new FakePaymentReceiptRepository());

            var buyerId = Guid.NewGuid();
            var order = new CustomerOrder(buyerId);
            order.AddItem(Guid.NewGuid(), Guid.NewGuid(), 2, new Money(50m, "COP"));
            order.Checkout();
            await repo.AddAsync(order);

            await handler.Handle(new PayOrderCommand(order.Id, buyerId), CancellationToken.None);

            Assert.Single(gateway.ChargedAmounts);
            Assert.Equal(new Money(100m, "COP"), gateway.ChargedAmounts[0]);
        }

        [Fact]
        public async Task Handle_PendingPaymentOrder_MarksAsPaid()
        {
            var repo = new FakeCustomerOrderRepositoryForPay();
            var uow = new FakeUnitOfWork();
            var handler = new PayOrderCommandHandler(repo, uow, new ApprovingPaymentGateway(), new FakePaymentReceiptRepository());

            var buyerId = Guid.NewGuid();
            var order = new CustomerOrder(buyerId);
            order.AddItem(Guid.NewGuid(), Guid.NewGuid(), 2, new Zentric.Domain.Products.ValueObjects.Money(50m, "COP"));
            order.Checkout(); // Moves Cart -> PendingPayment
            await repo.AddAsync(order);

            var command = new PayOrderCommand(order.Id, buyerId);
            var result = await handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.Equal(OrderStatus.Paid, order.Status);
            Assert.True(uow.SaveChangesCalled);
        }

        [Fact]
        public async Task Handle_OrderNotFound_ReturnsFailure()
        {
            var repo = new FakeCustomerOrderRepositoryForPay();
            var uow = new FakeUnitOfWork();
            var handler = new PayOrderCommandHandler(repo, uow, new ApprovingPaymentGateway(), new FakePaymentReceiptRepository());

            var command = new PayOrderCommand(Guid.NewGuid(), Guid.NewGuid());
            var result = await handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.Contains("not found", result.Error);
        }

        [Fact]
        public async Task Handle_ForeignBuyer_CannotPayAnotherBuyersOrder()
        {
            // Q-21b: sin el filtro por comprador, cualquier Buyer podia disparar
            // el cobro de un pedido ajeno con solo conocer su GUID. El intento
            // debe responder igual que un pedido inexistente ("not found"), el
            // pedido debe seguir sin pagar y la pasarela sin ser invocada.
            var repo = new FakeCustomerOrderRepositoryForPay();
            var uow = new FakeUnitOfWork();
            var gateway = new ApprovingPaymentGateway();
            var handler = new PayOrderCommandHandler(repo, uow, gateway, new FakePaymentReceiptRepository());

            var ownerId = Guid.NewGuid();
            var order = new CustomerOrder(ownerId);
            order.AddItem(Guid.NewGuid(), Guid.NewGuid(), 1, new Money(50m, "COP"));
            order.Checkout();
            await repo.AddAsync(order);

            var result = await handler.Handle(new PayOrderCommand(order.Id, Guid.NewGuid()), CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.Contains("not found", result.Error);
            Assert.Equal(OrderStatus.PendingPayment, order.Status);
            Assert.Empty(gateway.ChargedAmounts);
            Assert.False(uow.SaveChangesCalled);
        }
    }
}
