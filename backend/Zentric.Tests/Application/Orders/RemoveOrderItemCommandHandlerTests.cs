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

namespace Zentric.Tests.Application.Orders
{
    public class RemoveOrderItemCommandHandlerTests
    {
        private readonly FakeOrderRepositoryForCart _orders = new();
        private readonly FakeUnitOfWorkForCart _uow = new();
        private readonly RemoveOrderItemCommandHandler _handler;

        public RemoveOrderItemCommandHandlerTests()
        {
            _handler = new RemoveOrderItemCommandHandler(_orders, _uow);
        }

        [Fact(DisplayName = "RemoverItem_ItemExistenteEnCart_SeRemueveYGuarda")]
        public async Task Handle_ExistingItemInCart_RemovesAndSaves()
        {
            var buyerId = Guid.NewGuid();
            var variantId = Guid.NewGuid();
            var vendorId = Guid.NewGuid();

            var order = new CustomerOrder(buyerId);
            order.AddItem(variantId, vendorId, 2, new Zentric.Domain.Products.ValueObjects.Money(100, "COP"));
            _orders.Seed(order);

            var result = await _handler.Handle(
                new RemoveOrderItemCommand(order.Id, variantId, buyerId),
                CancellationToken.None);

            Assert.False(result.IsFailure);
            Assert.Empty(order.Items);
            Assert.True(_uow.SaveChangesCalled);
        }

        [Fact(DisplayName = "RemoverItem_OrdenNoExiste_NoFound")]
        public async Task Handle_OrderNotFound_ReturnsNotFound()
        {
            var result = await _handler.Handle(
                new RemoveOrderItemCommand(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid()),
                CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.Equal("Order not found.", result.Error);
        }

        [Fact(DisplayName = "RemoverItem_OrdenAjeno_NoFound")]
        public async Task Handle_OrderBelongsToOtherBuyer_ReturnsNotFound()
        {
            var buyerId = Guid.NewGuid();
            var otherBuyerId = Guid.NewGuid();
            var variantId = Guid.NewGuid();

            var order = new CustomerOrder(buyerId);
            _orders.Seed(order);

            var result = await _handler.Handle(
                new RemoveOrderItemCommand(order.Id, variantId, otherBuyerId),
                CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.Equal("Order not found.", result.Error);
        }

        [Fact(DisplayName = "RemoverItem_OrdenNoEnCart_Falla")]
        public async Task Handle_OrderNotInCart_ReturnsFailure()
        {
            var buyerId = Guid.NewGuid();
            var vendorId = Guid.NewGuid();
            var variantId = Guid.NewGuid();

            var order = new CustomerOrder(buyerId);
            order.AddItem(variantId, vendorId, 1, new Zentric.Domain.Products.ValueObjects.Money(100, "COP"));
            order.Checkout();
            _orders.Seed(order);

            var result = await _handler.Handle(
                new RemoveOrderItemCommand(order.Id, variantId, buyerId),
                CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.Equal("Items can only be removed while the order is in the Cart status.", result.Error);
        }

        [Fact(DisplayName = "RemoverItem_VariantIdNoExisteEnCarrito_Falla")]
        public async Task Handle_VariantNotInCart_ReturnsFailure()
        {
            var buyerId = Guid.NewGuid();
            var vendorId = Guid.NewGuid();
            var variantId = Guid.NewGuid();
            var otherVariantId = Guid.NewGuid();

            var order = new CustomerOrder(buyerId);
            order.AddItem(variantId, vendorId, 1, new Zentric.Domain.Products.ValueObjects.Money(100, "COP"));
            _orders.Seed(order);

            var result = await _handler.Handle(
                new RemoveOrderItemCommand(order.Id, otherVariantId, buyerId),
                CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.Equal("Item not found in cart", result.Error);
            Assert.Single(order.Items);
        }
    }
}