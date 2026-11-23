using Moq;
using System;
using System.Threading;
using System.Threading.Tasks;
using Xunit;
using Zentric.Application.Common.Ports;
using Zentric.Application.Logistics.Commands;
using Zentric.Domain.Buyers;
using Zentric.Domain.Buyers.Ports;
using Zentric.Domain.Logistics.Ports;
using Zentric.Domain.Logistics;
using Zentric.Domain.Orders;
using Zentric.Domain.Orders.Enums;
using Zentric.Domain.Orders.Ports;
using Zentric.Domain.Orders.Services;
using Zentric.Domain.Products.ValueObjects;
using Zentric.Domain.Users;
using Zentric.Domain.Users.Enums;
using Zentric.Domain.Users.Ports;
using Zentric.Domain.Users.ValueObjects;

namespace Zentric.Tests.Application.Logistics
{
    public class DispatchFulfillmentCommandHandlerTests
    {
        private readonly Mock<IFulfillmentOrderRepository> _repoMock;
        private readonly Mock<ICustomerOrderRepository> _orderRepoMock;
        private readonly Mock<IUnitOfWork> _uowMock;
        private readonly Mock<IBuyerRepository> _buyerRepoMock;
        private readonly Mock<IUserRepository> _userRepoMock;
        private readonly Mock<IEmailSender> _emailSenderMock;
        private readonly DispatchFulfillmentCommandHandler _handler;

        public DispatchFulfillmentCommandHandlerTests()
        {
            _repoMock = new Mock<IFulfillmentOrderRepository>();
            _orderRepoMock = new Mock<ICustomerOrderRepository>();
            _uowMock = new Mock<IUnitOfWork>();
            _buyerRepoMock = new Mock<IBuyerRepository>();
            _userRepoMock = new Mock<IUserRepository>();
            _emailSenderMock = new Mock<IEmailSender>();
            _handler = new DispatchFulfillmentCommandHandler(
                _repoMock.Object,
                _orderRepoMock.Object,
                new OrderFulfillmentProgressSynchronizer(),
                _uowMock.Object,
                _buyerRepoMock.Object,
                _userRepoMock.Object,
                _emailSenderMock.Object);
        }

        private static User NewBuyerUser() =>
            new("DOC-1", new FullName("Juan", "Perez"), new Email("juan@zentric.com"), "hash", UserRole.Buyer);

        private static Buyer NewBuyer(Guid userId) =>
            Buyer.Create(userId, "Calle 1", "Bogota", "Cundinamarca", "110111", "CO");

        private static CustomerOrder PaidOrder(Guid buyerId)
        {
            var order = new CustomerOrder(buyerId);
            order.AddItem(Guid.NewGuid(), Guid.NewGuid(), 1, new Money(100m, "COP"));
            order.Checkout();
            order.MarkAsPaid();
            return order;
        }

        [Fact]
        public async Task Handle_WhenFulfillmentOrderDoesNotExist_ReturnsFailure()
        {
            // Arrange
            var command = new DispatchFulfillmentCommand(Guid.NewGuid(), Guid.NewGuid(), UserRole.LogisticsOperator);
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
            var command = new DispatchFulfillmentCommand(order.Id, Guid.NewGuid(), UserRole.LogisticsOperator);

            _repoMock.Setup(r => r.GetByIdAsync(command.FulfillmentOrderId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(order);

            // Act
            var result = await _handler.Handle(command, CancellationToken.None);

            // Assert
            Assert.False(result.IsSuccess);
            Assert.Contains("debe estar empacado", result.Error);
        }

        [Fact]
        public async Task Handle_WhenOrderIsPacked_DispatchesOrderAndReturnsSuccess()
        {
            // Arrange
            var order = new FulfillmentOrder(Guid.NewGuid(), Guid.NewGuid());
            order.Pack(); // Estado a Packed

            var command = new DispatchFulfillmentCommand(order.Id, Guid.NewGuid(), UserRole.LogisticsOperator);

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

        [Fact]
        public async Task Handle_ForeignSeller_CannotDispatchAnotherSellersPackage()
        {
            // Antes, cualquier Seller despachaba el paquete de otro con solo
            // conocer su GUID. La respuesta debe ser la de "no existe" y el paquete
            // no debe cambiar de estado.
            var order = new FulfillmentOrder(Guid.NewGuid(), Guid.NewGuid());
            order.Pack();
            var command = new DispatchFulfillmentCommand(order.Id, Guid.NewGuid(), UserRole.Seller);

            _repoMock.Setup(r => r.GetByIdAsync(command.FulfillmentOrderId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(order);

            var result = await _handler.Handle(command, CancellationToken.None);

            Assert.False(result.IsSuccess);
            Assert.Contains("not found", result.Error);
            Assert.Equal(Zentric.Domain.Logistics.Enums.FulfillmentStatus.Packed, order.Status);
            _uowMock.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
        }

        [Fact]
        public async Task Handle_OwnSeller_CanDispatchOwnPackage()
        {
            // El vendedor sí despacha lo suyo.
            var vendorId = Guid.NewGuid();
            var order = new FulfillmentOrder(Guid.NewGuid(), vendorId);
            order.Pack();
            var command = new DispatchFulfillmentCommand(order.Id, vendorId, UserRole.Seller);

            _repoMock.Setup(r => r.GetByIdAsync(command.FulfillmentOrderId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(order);

            var result = await _handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.Equal(Zentric.Domain.Logistics.Enums.FulfillmentStatus.Dispatched, order.Status);
        }

        [Fact(DisplayName = "UltimoDespacho_ElPedidoMaestroPasaADispatched")]
        public async Task Handle_LastFulfillmentDispatched_MovesMasterOrderToDispatched()
        {
            // Antes nadie llamaba a CustomerOrder.Dispatch(), asi que un pedido
            // pagado se quedaba en Paid para siempre aunque todo se hubiera enviado.
            var master = PaidOrder(Guid.NewGuid());
            var fulfillment = new FulfillmentOrder(master.Id, Guid.NewGuid());
            fulfillment.Pack();

            var command = new DispatchFulfillmentCommand(fulfillment.Id, Guid.NewGuid(), UserRole.LogisticsOperator);

            _repoMock.Setup(r => r.GetByIdAsync(fulfillment.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(fulfillment);
            _repoMock.Setup(r => r.GetByCustomerOrderIdAsync(master.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<FulfillmentOrder> { fulfillment });
            _orderRepoMock.Setup(r => r.GetByIdAsync(master.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(master);

            var result = await _handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.Equal(OrderStatus.Dispatched, master.Status);
            _orderRepoMock.Verify(r => r.UpdateAsync(master, It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact(DisplayName = "DespachoActivoPendiente_ElPedidoMaestroNoAvanza")]
        public async Task Handle_AnotherFulfillmentStillPending_LeavesMasterOrderPaid()
        {
            var master = PaidOrder(Guid.NewGuid());
            var dispatched = new FulfillmentOrder(master.Id, Guid.NewGuid());
            dispatched.Pack();
            var stillPacked = new FulfillmentOrder(master.Id, Guid.NewGuid());
            stillPacked.Pack();

            var command = new DispatchFulfillmentCommand(dispatched.Id, Guid.NewGuid(), UserRole.LogisticsOperator);

            _repoMock.Setup(r => r.GetByIdAsync(dispatched.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(dispatched);
            _repoMock.Setup(r => r.GetByCustomerOrderIdAsync(master.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<FulfillmentOrder> { dispatched, stillPacked });
            _orderRepoMock.Setup(r => r.GetByIdAsync(master.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(master);

            var result = await _handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.Equal(OrderStatus.Paid, master.Status);
            _orderRepoMock.Verify(r => r.UpdateAsync(master, It.IsAny<CancellationToken>()), Times.Never);
        }

        /// <summary>
        /// Al despachar con exito se avisa al comprador exactamente una vez, con su
        /// correo, su nombre, el codigo del pedido y el codigo de seguimiento del envio.
        /// La transportadora no existe en el modelo, asi que viaja nula.
        /// </summary>
        [Fact(DisplayName = "DespachoExitoso_EnviaUnCorreoAlCompradorConLosDetalles")]
        public async Task Handle_SuccessfulDispatch_SendsExactlyOneOrderShippedEmail()
        {
            var user = NewBuyerUser();
            var buyer = NewBuyer(user.Id);
            var master = PaidOrder(user.Id);

            var fulfillment = new FulfillmentOrder(master.Id, Guid.NewGuid());
            fulfillment.AddShipment(Guid.NewGuid(), "TRK-123");
            fulfillment.Pack();

            var command = new DispatchFulfillmentCommand(fulfillment.Id, Guid.NewGuid(), UserRole.LogisticsOperator);

            _repoMock.Setup(r => r.GetByIdAsync(fulfillment.Id, It.IsAny<CancellationToken>())).ReturnsAsync(fulfillment);
            _repoMock.Setup(r => r.GetByCustomerOrderIdAsync(master.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<FulfillmentOrder> { fulfillment });
            _orderRepoMock.Setup(r => r.GetByIdAsync(master.Id, It.IsAny<CancellationToken>())).ReturnsAsync(master);
            _buyerRepoMock.Setup(r => r.GetByIdAsync(user.Id, It.IsAny<CancellationToken>())).ReturnsAsync(buyer);
            _userRepoMock.Setup(r => r.GetByIdAsync(user.Id)).ReturnsAsync(user);

            var result = await _handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsSuccess);
            var orderShortId = master.Id.ToString("N")[..8];
            _emailSenderMock.Verify(
                e => e.SendOrderShippedEmailAsync(
                    "juan@zentric.com",
                    "Juan Perez",
                    orderShortId,
                    null,
                    "TRK-123",
                    It.IsAny<CancellationToken>()),
                Times.Once);
        }

        /// <summary>
        /// Un fallo del proveedor de correo no debe revertir el despacho ya persistido
        /// ni hacer fallar el comando: el correo es best-effort.
        /// </summary>
        [Fact(DisplayName = "FalloDeCorreo_NoHaceFallarElDespacho")]
        public async Task Handle_EmailSenderThrows_DoesNotFailDispatch()
        {
            var user = NewBuyerUser();
            var buyer = NewBuyer(user.Id);
            var master = PaidOrder(user.Id);

            var fulfillment = new FulfillmentOrder(master.Id, Guid.NewGuid());
            fulfillment.Pack();

            var command = new DispatchFulfillmentCommand(fulfillment.Id, Guid.NewGuid(), UserRole.LogisticsOperator);

            _repoMock.Setup(r => r.GetByIdAsync(fulfillment.Id, It.IsAny<CancellationToken>())).ReturnsAsync(fulfillment);
            _repoMock.Setup(r => r.GetByCustomerOrderIdAsync(master.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<FulfillmentOrder> { fulfillment });
            _orderRepoMock.Setup(r => r.GetByIdAsync(master.Id, It.IsAny<CancellationToken>())).ReturnsAsync(master);
            _buyerRepoMock.Setup(r => r.GetByIdAsync(user.Id, It.IsAny<CancellationToken>())).ReturnsAsync(buyer);
            _userRepoMock.Setup(r => r.GetByIdAsync(user.Id)).ReturnsAsync(user);
            _emailSenderMock
                .Setup(e => e.SendOrderShippedEmailAsync(
                    It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(),
                    It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
                .ThrowsAsync(new InvalidOperationException("SMTP down"));

            var result = await _handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.Equal(Zentric.Domain.Logistics.Enums.FulfillmentStatus.Dispatched, fulfillment.Status);
            _uowMock.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        }
    }
}
