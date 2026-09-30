using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Xunit;
using Zentric.Application.Common.Ports;
using Zentric.Application.Returns.Commands;
using Zentric.Domain.Orders;
using Zentric.Domain.Orders.Ports;
using Zentric.Domain.Returns.Ports;
using Zentric.Domain.Returns;
using Zentric.Domain.Products.Enums;

namespace Zentric.Tests.Application.Returns
{
    public class FakeUnitOfWork : IUnitOfWork
    {
        public bool SaveChangesCalled { get; private set; }
        public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            SaveChangesCalled = true;
            return Task.FromResult(1);
        }
    }

    public class FakeReturnRequestRepository : IReturnRequestRepository
    {
        public List<ReturnRequest> Requests { get; } = new();

        public Task AddAsync(ReturnRequest request, CancellationToken cancellationToken = default)
        {
            Requests.Add(request);
            return Task.CompletedTask;
        }

        public Task<ReturnRequest?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(Requests.FirstOrDefault(r => r.Id == id));
        }

        public Task UpdateAsync(ReturnRequest request, CancellationToken cancellationToken = default)
        {
            var existing = Requests.FirstOrDefault(r => r.Id == request.Id);
            if (existing != null)
            {
                Requests.Remove(existing);
                Requests.Add(request);
            }
            return Task.CompletedTask;
        }
    }

    /// <summary>
    /// Pedidos en memoria con el filtro por comprador del repositorio real
    /// (Q-21b): la propiedad se comprueba en la consulta, no despues.
    /// </summary>
    public class FakeCustomerOrderRepositoryForReturns : ICustomerOrderRepository
    {
        public List<CustomerOrder> Orders { get; } = new();

        public void Seed(CustomerOrder order) => Orders.Add(order);

        public Task<CustomerOrder?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
            => Task.FromResult(Orders.FirstOrDefault(o => o.Id == id));

        public Task<CustomerOrder?> GetByIdForBuyerAsync(
            Guid id, Guid buyerId, CancellationToken cancellationToken = default)
            => Task.FromResult(Orders.FirstOrDefault(o => o.Id == id && o.BuyerId == buyerId));

        public Task<IReadOnlyList<CustomerOrder>> GetExpiredOrdersAsync(
            DateTime threshold, CancellationToken cancellationToken = default)
            => Task.FromResult((IReadOnlyList<CustomerOrder>)Array.Empty<CustomerOrder>());

        public Task AddAsync(CustomerOrder order, CancellationToken cancellationToken = default)
        {
            Orders.Add(order);
            return Task.CompletedTask;
        }

        public Task UpdateAsync(CustomerOrder order, CancellationToken cancellationToken = default)
            => Task.CompletedTask;
    }

    public class RequestReturnCommandHandlerTests
    {
        [Fact]
        public async Task Handle_ValidCommand_CreatesReturnRequestAndSaves()
        {
            var repository = new FakeReturnRequestRepository();
            var unitOfWork = new FakeUnitOfWork();
            var orders = new FakeCustomerOrderRepositoryForReturns();
            var handler = new RequestReturnCommandHandler(repository, unitOfWork, orders);

            var buyerId = Guid.NewGuid();
            var order = new CustomerOrder(buyerId);
            orders.Seed(order);

            var command = new RequestReturnCommand(
                CustomerOrderId: order.Id,
                VariantId: Guid.NewGuid(),
                WarehouseId: Guid.NewGuid(),
                Quantity: 2,
                ProductType: ProductType.Physical,
                BuyerId: buyerId
            );

            var result = await handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.NotEqual(Guid.Empty, result.Value);
            
            var savedReq = repository.Requests.SingleOrDefault(r => r.Id == result.Value);
            Assert.NotNull(savedReq);
            Assert.Equal(2, savedReq.Quantity);
            Assert.True(unitOfWork.SaveChangesCalled);
        }

        [Fact]
        public async Task Handle_ForeignBuyer_CannotRequestReturnAgainstAnotherBuyersOrder()
        {
            // Q-21b: la devolucion se radica contra un pedido propio; el filtro
            // por comprador lo garantiza antes de tocar el dominio, y el intento
            // responde igual que un pedido inexistente (anti-enumeracion).
            var repository = new FakeReturnRequestRepository();
            var unitOfWork = new FakeUnitOfWork();
            var orders = new FakeCustomerOrderRepositoryForReturns();
            var handler = new RequestReturnCommandHandler(repository, unitOfWork, orders);

            var order = new CustomerOrder(Guid.NewGuid());
            orders.Seed(order);

            var command = new RequestReturnCommand(
                CustomerOrderId: order.Id,
                VariantId: Guid.NewGuid(),
                WarehouseId: Guid.NewGuid(),
                Quantity: 1,
                ProductType: ProductType.Physical,
                BuyerId: Guid.NewGuid()
            );

            var result = await handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.Equal("Order not found.", result.Error);
            Assert.Empty(repository.Requests);
            Assert.False(unitOfWork.SaveChangesCalled);
        }
    }
}
