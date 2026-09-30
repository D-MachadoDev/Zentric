using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Xunit;
using Zentric.Application.Common.Ports;
using Zentric.Application.Logistics.Commands;
using Zentric.Domain.Logistics;
using Zentric.Domain.Logistics.Ports;
using Zentric.Domain.Users.Enums;

namespace Zentric.Tests.Application.Logistics
{
    /// <summary>
    /// Alta de despachos (Q-21b): el Vendedor solo crea despachos a su nombre; el
    /// Operador puede crearlos para cualquier vendedor.
    /// </summary>
    public class CreateFulfillmentOrderCommandHandlerTests
    {
        private sealed class FakeFulfillmentRepository : IFulfillmentOrderRepository
        {
            public List<FulfillmentOrder> Orders { get; } = new();

            public Task<FulfillmentOrder?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
                => Task.FromResult(Orders.FirstOrDefault(o => o.Id == id));

            public Task AddAsync(FulfillmentOrder order, CancellationToken cancellationToken = default)
            {
                Orders.Add(order);
                return Task.CompletedTask;
            }

            public Task UpdateAsync(FulfillmentOrder order, CancellationToken cancellationToken = default)
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

        [Fact]
        public async Task Handle_SellerCreatesOwnFulfillment()
        {
            var repo = new FakeFulfillmentRepository();
            var uow = new FakeUnitOfWork();
            var handler = new CreateFulfillmentOrderCommandHandler(repo, uow);
            var vendorId = Guid.NewGuid();

            var result = await handler.Handle(
                new CreateFulfillmentOrderCommand(Guid.NewGuid(), vendorId, vendorId, UserRole.Seller),
                CancellationToken.None);

            Assert.True(result.IsSuccess);
            var order = Assert.Single(repo.Orders);
            Assert.Equal(vendorId, order.VendorId);
            Assert.True(uow.SaveChangesCalled);
        }

        [Fact]
        public async Task Handle_SellerCannotCreateFulfillmentForAnotherVendor()
        {
            // Q-21b: antes, un Seller creaba despachos a nombre de otro vendedor
            // escribiendo su VendorId en el cuerpo.
            var repo = new FakeFulfillmentRepository();
            var uow = new FakeUnitOfWork();
            var handler = new CreateFulfillmentOrderCommandHandler(repo, uow);

            var result = await handler.Handle(
                new CreateFulfillmentOrderCommand(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), UserRole.Seller),
                CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.Empty(repo.Orders);
            Assert.False(uow.SaveChangesCalled);
        }

        [Fact]
        public async Task Handle_OperatorCreatesFulfillmentForAnyVendor()
        {
            // Q-21b: el Operador prepara despachos de toda la red.
            var repo = new FakeFulfillmentRepository();
            var uow = new FakeUnitOfWork();
            var handler = new CreateFulfillmentOrderCommandHandler(repo, uow);
            var vendorId = Guid.NewGuid();

            var result = await handler.Handle(
                new CreateFulfillmentOrderCommand(Guid.NewGuid(), vendorId, Guid.NewGuid(), UserRole.LogisticsOperator),
                CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.Single(repo.Orders);
        }
    }
}