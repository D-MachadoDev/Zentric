using Moq;
using System;
using System.Threading;
using System.Threading.Tasks;
using Xunit;
using Zentric.Application.Common.Ports;
using Zentric.Application.Logistics.Commands;
using Zentric.Domain.Logistics.Ports;
using Zentric.Domain.Logistics;

namespace Zentric.Tests.Application.Logistics
{
    public class DispatchFulfillmentCommandHandlerTests
    {
        private readonly Mock<IFulfillmentOrderRepository> _repoMock;
        private readonly Mock<IUnitOfWork> _uowMock;
        private readonly DispatchFulfillmentCommandHandler _handler;

        public DispatchFulfillmentCommandHandlerTests()
        {
            _repoMock = new Mock<IFulfillmentOrderRepository>();
            _uowMock = new Mock<IUnitOfWork>();
            _handler = new DispatchFulfillmentCommandHandler(_repoMock.Object, _uowMock.Object);
        }

        [Fact]
        public async Task Handle_WhenFulfillmentOrderDoesNotExist_ReturnsFailure()
        {
            // Arrange
            var command = new DispatchFulfillmentCommand(Guid.NewGuid());
            _repoMock.Setup(r => r.GetByIdAsync(command.FulfillmentOrderId, It.IsAny<CancellationToken>()))
                .ReturnsAsync((FulfillmentOrder)null!);

            // Act
            var result = await _handler.Handle(command, CancellationToken.None);

            // Assert
            Assert.False(result.IsSuccess);
            Assert.Contains("not found", result.Error);
        }

        [Fact]
        public async Task Handle_WhenOrderIsNotPacked_ReturnsFailure()
        {
            // Arrange
            var order = new FulfillmentOrder(Guid.NewGuid(), Guid.NewGuid());
            // Nace en PendingPack, no Packed
            var command = new DispatchFulfillmentCommand(order.Id);

            _repoMock.Setup(r => r.GetByIdAsync(command.FulfillmentOrderId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(order);

            // Act
            var result = await _handler.Handle(command, CancellationToken.None);

            // Assert
            Assert.False(result.IsSuccess);
            Assert.Contains("must be packed", result.Error);
        }

        [Fact]
        public async Task Handle_WhenOrderIsPacked_DispatchesOrderAndReturnsSuccess()
        {
            // Arrange
            var order = new FulfillmentOrder(Guid.NewGuid(), Guid.NewGuid());
            order.Pack(); // Estado a Packed

            var command = new DispatchFulfillmentCommand(order.Id);

            _repoMock.Setup(r => r.GetByIdAsync(command.FulfillmentOrderId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(order);

            // Act
            var result = await _handler.Handle(command, CancellationToken.None);

            // Assert
            Assert.True(result.IsSuccess);
            Assert.Equal(Zentric.Domain.Logistics.Enums.FulfillmentStatus.Dispatched, order.Status);
            _repoMock.Verify(r => r.UpdateAsync(order, It.IsAny<CancellationToken>()), Times.Once);
            _uowMock.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        }
    }
}
