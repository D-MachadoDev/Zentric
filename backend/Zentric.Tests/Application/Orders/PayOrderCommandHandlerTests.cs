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
using Zentric.Tests.Application.Catalog;

namespace Zentric.Tests.Application.Orders
{
    public class FakeCustomerOrderRepositoryForPay : ICustomerOrderRepository
    {
        public List<CustomerOrder> Orders { get; } = new();

        public Task AddAsync(CustomerOrder order, CancellationToken cancellationToken = default)
        {
            Orders.Add(order);
            return Task.CompletedTask;
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
        public async Task Handle_PendingPaymentOrder_MarksAsPaid()
        {
            var repo = new FakeCustomerOrderRepositoryForPay();
            var uow = new FakeUnitOfWork();
            var handler = new PayOrderCommandHandler(repo, uow);

            var order = new CustomerOrder(Guid.NewGuid());
            order.AddItem(Guid.NewGuid(), 2, new Zentric.Domain.Products.ValueObjects.Money(50m, "USD"));
            order.Checkout(); // Moves Cart -> PendingPayment
            await repo.AddAsync(order);

            var command = new PayOrderCommand(order.Id);
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
            var handler = new PayOrderCommandHandler(repo, uow);

            var command = new PayOrderCommand(Guid.NewGuid());
            var result = await handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.Contains("not found", result.Error);
        }
    }
}
