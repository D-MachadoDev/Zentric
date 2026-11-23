using Moq;
using Zentric.Application.Common.Ports;
using Zentric.Application.Returns.Commands;
using Zentric.Domain.Buyers;
using Zentric.Domain.Buyers.Ports;
using Zentric.Domain.Orders;
using Zentric.Domain.Orders.Ports;
using Zentric.Domain.Payments;
using Zentric.Domain.Payments.Enums;
using Zentric.Domain.Payments.Ports;
using Zentric.Domain.Products;
using Zentric.Domain.Products.Enums;
using Zentric.Domain.Products.Ports;
using Zentric.Domain.Products.ValueObjects;
using Zentric.Domain.Returns;
using Zentric.Domain.Returns.Ports;
using Zentric.Domain.Users;
using Zentric.Domain.Users.Enums;
using Zentric.Domain.Users.Ports;
using Zentric.Domain.Users.ValueObjects;

namespace Zentric.Tests.Application.Returns
{
    /// <summary>
    /// El Handler de reembolso no tenia ninguna prueba. Fue el sitio donde el sistema concedia el
    /// total del comprobante a cambio de devolver una sola unidad, y ningun test lo cubria.
    /// </summary>
    public class RefundReturnCommandHandlerTests
    {
        private readonly Mock<IReturnRequestRepository> _returnRepoMock = new();
        private readonly Mock<IPaymentReceiptRepository> _receiptRepoMock = new();
        private readonly Mock<ICustomerOrderRepository> _orderRepoMock = new();
        private readonly Mock<IUnitOfWork> _uowMock = new();
        private readonly Mock<IProductRepository> _productRepoMock = new();
        private readonly Mock<IBuyerRepository> _buyerRepoMock = new();
        private readonly Mock<IUserRepository> _userRepoMock = new();
        private readonly Mock<IEmailSender> _emailSenderMock = new();

        private RefundReturnCommandHandler Handler =>
            new(
                _returnRepoMock.Object,
                _receiptRepoMock.Object,
                _orderRepoMock.Object,
                _uowMock.Object,
                _productRepoMock.Object,
                _buyerRepoMock.Object,
                _userRepoMock.Object,
                _emailSenderMock.Object);

        private static User NewBuyerUser() =>
            new("DOC-1", new FullName("Juan", "Perez"), new Email("juan@zentric.com"), "hash", UserRole.Buyer);

        private static Buyer NewBuyer(Guid userId) =>
            Buyer.Create(userId, "Calle 1", "Bogota", "Cundinamarca", "110111", "CO");

        private static CustomerOrder OrderWithLine(int quantity, decimal unitPrice)
        {
            var order = new CustomerOrder(Guid.NewGuid());
            order.AddItem(Guid.NewGuid(), Guid.NewGuid(), quantity, new Money(unitPrice, "COP"));
            return order;
        }

        private static ReturnRequest ApprovedReturn(Guid orderId, Guid variantId, int quantity)
        {
            var request = new ReturnRequest(orderId, variantId, Guid.NewGuid(), quantity, ProductType.Physical);
            request.InspectByLogistics(true);
            request.ApproveByVendor(false);
            return request;
        }

        private void Wire(CustomerOrder order, ReturnRequest returnReq, PaymentReceipt receipt)
        {
            _returnRepoMock.Setup(r => r.GetByIdAsync(returnReq.Id, It.IsAny<CancellationToken>())).ReturnsAsync(returnReq);
            _orderRepoMock.Setup(r => r.GetByIdAsync(order.Id, It.IsAny<CancellationToken>())).ReturnsAsync(order);
            _receiptRepoMock.Setup(r => r.GetByOrderIdAsync(order.Id, It.IsAny<CancellationToken>())).ReturnsAsync(receipt);
        }

        /// <summary>
        /// El fallo que motivo estos tests: 2 unidades compradas a 50.000, se devuelve 1 y el
        /// comprador recibia 100.000 (el total del comprobante). Credita lo devuelto, no lo cobrado.
        /// </summary>
        [Fact]
        public async Task ReembolsoParcial_CreditaSoloLasUnidadesDevueltas()
        {
            var variantId = Guid.NewGuid();
            var order = new CustomerOrder(Guid.NewGuid());
            order.AddItem(variantId, Guid.NewGuid(), 2, new Money(50_000m, "COP"));
            var returnReq = ApprovedReturn(order.Id, variantId, 1);

            var receipt = PaymentReceipt.Create(order.Id, new Money(100_000m, "COP"));
            receipt.Approve("tx-1");
            Wire(order, returnReq, receipt);

            var result = await Refund(returnReq);

            Assert.True(result.IsSuccess);
            Assert.Equal(50_000m, receipt.RefundedAmount.Amount);
            // El comprobante queda abierto: solo se ha devuelto la mitad.
            Assert.Equal(PaymentStatus.Approved, receipt.Status);
        }

        [Fact]
        public async Task ReembolsoTotal_CreditaElTotalYCierraElComprobante()
        {
            var variantId = Guid.NewGuid();
            var order = new CustomerOrder(Guid.NewGuid());
            order.AddItem(variantId, Guid.NewGuid(), 2, new Money(50_000m, "COP"));
            var returnReq = ApprovedReturn(order.Id, variantId, 2);

            var receipt = PaymentReceipt.Create(order.Id, new Money(100_000m, "COP"));
            receipt.Approve("tx-1");
            Wire(order, returnReq, receipt);

            var result = await Refund(returnReq);

            Assert.True(result.IsSuccess);
            Assert.Equal(100_000m, receipt.RefundedAmount.Amount);
            Assert.Equal(PaymentStatus.Refunded, receipt.Status);
        }

        /// <summary>
        /// Devolver mas unidades de las compradas no puede multiplicar el credito.
        /// </summary>
        [Fact]
        public async Task DevolverMasUnidadesDeLasCompradas_NoAmpliaElCredito()
        {
            var variantId = Guid.NewGuid();
            var order = new CustomerOrder(Guid.NewGuid());
            order.AddItem(variantId, Guid.NewGuid(), 2, new Money(50_000m, "COP"));
            var returnReq = ApprovedReturn(order.Id, variantId, 5);

            var receipt = PaymentReceipt.Create(order.Id, new Money(100_000m, "COP"));
            receipt.Approve("tx-1");
            Wire(order, returnReq, receipt);

            var result = await Refund(returnReq);

            Assert.True(result.IsSuccess);
            Assert.Equal(100_000m, receipt.RefundedAmount.Amount);
        }

        /// <summary>
        /// Sin linea que coincida no hay credito inventado: se rechaza en vez de acreditarse el total.
        /// </summary>
        [Fact]
        public async Task VarianteQueNoEstaEnElPedido_EsRechazada()
        {
            var order = new CustomerOrder(Guid.NewGuid());
            order.AddItem(Guid.NewGuid(), Guid.NewGuid(), 1, new Money(50_000m, "COP"));
            var returnReq = ApprovedReturn(order.Id, Guid.NewGuid(), 1);

            var receipt = PaymentReceipt.Create(order.Id, new Money(50_000m, "COP"));
            receipt.Approve("tx-1");
            Wire(order, returnReq, receipt);

            var result = await Refund(returnReq);

            Assert.True(result.IsFailure);
            Assert.Equal(0m, receipt.RefundedAmount.Amount);
        }

        /// <summary>
        /// Al reembolsar con exito se avisa al comprador exactamente una vez, con su
        /// correo, su nombre, el producto devuelto, el codigo del pedido y el importe
        /// acreditado con su divisa.
        /// </summary>
        [Fact(DisplayName = "ReembolsoExitoso_EnviaUnCorreoAlCompradorConLosDetalles")]
        public async Task ReembolsoExitoso_EnviaUnCorreoAlCompradorConImporteProductoYPedido()
        {
            var user = NewBuyerUser();
            var buyer = NewBuyer(user.Id);

            var variantId = Guid.NewGuid();
            var order = new CustomerOrder(user.Id);
            order.AddItem(variantId, Guid.NewGuid(), 2, new Money(50_000m, "COP"));
            var returnReq = ApprovedReturn(order.Id, variantId, 1);

            var receipt = PaymentReceipt.Create(order.Id, new Money(100_000m, "COP"));
            receipt.Approve("tx-1");

            var product = new Product("Audífonos", "Descripción", new Money(50_000m, "COP"), Guid.NewGuid(), ProductType.Digital, null);

            Wire(order, returnReq, receipt);
            _productRepoMock.Setup(r => r.GetByVariantIdAsync(variantId, It.IsAny<CancellationToken>())).ReturnsAsync(product);
            _buyerRepoMock.Setup(r => r.GetByIdAsync(user.Id, It.IsAny<CancellationToken>())).ReturnsAsync(buyer);
            _userRepoMock.Setup(r => r.GetByIdAsync(user.Id)).ReturnsAsync(user);

            var result = await Refund(returnReq);

            Assert.True(result.IsSuccess);
            var orderShortId = order.Id.ToString("N")[..8];
            _emailSenderMock.Verify(
                e => e.SendRefundProcessedEmailAsync(
                    "juan@zentric.com",
                    "Juan Perez",
                    "Audífonos",
                    orderShortId,
                    50_000m,
                    "COP",
                    It.IsAny<CancellationToken>()),
                Times.Once);
        }

        /// <summary>
        /// Un fallo del proveedor de correo no debe revertir el reembolso ya persistido
        /// ni hacer fallar el comando: el correo es best-effort.
        /// </summary>
        [Fact(DisplayName = "FalloDeCorreo_NoHaceFallarElReembolso")]
        public async Task FalloDeCorreo_NoHaceFallarElReembolso()
        {
            var user = NewBuyerUser();
            var buyer = NewBuyer(user.Id);

            var variantId = Guid.NewGuid();
            var order = new CustomerOrder(user.Id);
            order.AddItem(variantId, Guid.NewGuid(), 2, new Money(50_000m, "COP"));
            var returnReq = ApprovedReturn(order.Id, variantId, 1);

            var receipt = PaymentReceipt.Create(order.Id, new Money(100_000m, "COP"));
            receipt.Approve("tx-1");

            var product = new Product("Audífonos", "Descripción", new Money(50_000m, "COP"), Guid.NewGuid(), ProductType.Digital, null);

            Wire(order, returnReq, receipt);
            _productRepoMock.Setup(r => r.GetByVariantIdAsync(variantId, It.IsAny<CancellationToken>())).ReturnsAsync(product);
            _buyerRepoMock.Setup(r => r.GetByIdAsync(user.Id, It.IsAny<CancellationToken>())).ReturnsAsync(buyer);
            _userRepoMock.Setup(r => r.GetByIdAsync(user.Id)).ReturnsAsync(user);
            _emailSenderMock
                .Setup(e => e.SendRefundProcessedEmailAsync(
                    It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(),
                    It.IsAny<decimal>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .ThrowsAsync(new InvalidOperationException("SMTP down"));

            var result = await Refund(returnReq);

            Assert.True(result.IsSuccess);
            Assert.Equal(50_000m, receipt.RefundedAmount.Amount);
        }


        private Task<Zentric.Application.Common.Models.Result<bool>> Refund(ReturnRequest returnReq) =>
            Handler.Handle(
                new RefundReturnCommand(returnReq.Id, Guid.NewGuid(), UserRole.Administrator),
                CancellationToken.None);
    }
}