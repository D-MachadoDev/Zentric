using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Xunit;
using Zentric.Application.Orders.Queries;
using Zentric.Domain.Orders;
using Zentric.Domain.Orders.Enums;
using Zentric.Domain.Orders.Ports;
using Zentric.Domain.Products.ValueObjects;

namespace Zentric.Tests.Application.Orders
{
    /// <summary>
    /// Aislamiento por comprador (ZENTRIC.md Dominio 2: el comprador nunca
    /// administra informacion de otros compradores).
    /// </summary>
    public class GetOrderByIdForBuyerQueryTests
    {
        private sealed class ScopedOrderRepository : ICustomerOrderRepository
        {
            public List<CustomerOrder> Orders { get; } = new();

            public Task<CustomerOrder?> GetByIdForBuyerAsync(
                Guid id, Guid buyerId, CancellationToken cancellationToken = default)
                => Task.FromResult(Orders.FirstOrDefault(o => o.Id == id && o.BuyerId == buyerId));

            public Task<CustomerOrder?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
                => Task.FromResult(Orders.FirstOrDefault(o => o.Id == id));

            public Task<IReadOnlyList<CustomerOrder>> GetExpiredOrdersAsync(
                DateTime threshold, CancellationToken cancellationToken = default)
                => Task.FromResult<IReadOnlyList<CustomerOrder>>(new List<CustomerOrder>());

            public Task AddAsync(CustomerOrder order, CancellationToken cancellationToken = default)
            {
                Orders.Add(order);
                return Task.CompletedTask;
            }

            public Task UpdateAsync(CustomerOrder order, CancellationToken cancellationToken = default)
                => Task.CompletedTask;
        }

        private static CustomerOrder OrderFor(Guid buyerId)
        {
            var order = new CustomerOrder(buyerId);
            order.AddItem(Guid.NewGuid(), Guid.NewGuid(), 1, new Money(10m, "COP"));
            return order;
        }

        [Fact]
        public async Task Handle_OwnOrder_ReturnsIt()
        {
            var repo = new ScopedOrderRepository();
            var buyer = Guid.NewGuid();
            var order = OrderFor(buyer);
            repo.Orders.Add(order);
            var handler = new GetOrderByIdForBuyerQueryHandler(repo);

            var result = await handler.Handle(
                new GetOrderByIdForBuyerQuery(order.Id, buyer), CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.Equal(order.Id, result.Value.Id);
        }

        [Fact]
        public async Task Handle_AnotherBuyersOrder_ReturnsNotFound()
        {
            // El caso que motiva el lote: no basta con que el pedido exista.
            var repo = new ScopedOrderRepository();
            var owner = Guid.NewGuid();
            var intruder = Guid.NewGuid();
            var order = OrderFor(owner);
            repo.Orders.Add(order);
            var handler = new GetOrderByIdForBuyerQueryHandler(repo);

            var result = await handler.Handle(
                new GetOrderByIdForBuyerQuery(order.Id, intruder), CancellationToken.None);

            Assert.True(result.IsFailure);
        }

        [Fact]
        public async Task Handle_AnotherBuyersOrder_UsesTheSameMessageAsMissing()
        {
            // Distinguir "no existe" de "no es tuyo" permitiria enumerar GUIDs.
            var repo = new ScopedOrderRepository();
            var owner = Guid.NewGuid();
            var order = OrderFor(owner);
            repo.Orders.Add(order);
            var handler = new GetOrderByIdForBuyerQueryHandler(repo);

            var ajeno = await handler.Handle(
                new GetOrderByIdForBuyerQuery(order.Id, Guid.NewGuid()), CancellationToken.None);
            var inexistente = await handler.Handle(
                new GetOrderByIdForBuyerQuery(Guid.NewGuid(), Guid.NewGuid()), CancellationToken.None);

            Assert.Equal(ajeno.Error, inexistente.Error);
        }

        [Fact]
        public async Task Handle_EmptyGuidBuyer_DoesNotMatch()
        {
            var repo = new ScopedOrderRepository();
            var order = OrderFor(Guid.NewGuid());
            repo.Orders.Add(order);
            var handler = new GetOrderByIdForBuyerQueryHandler(repo);

            var result = await handler.Handle(
                new GetOrderByIdForBuyerQuery(order.Id, Guid.Empty), CancellationToken.None);

            Assert.True(result.IsFailure);
        }
    }
}