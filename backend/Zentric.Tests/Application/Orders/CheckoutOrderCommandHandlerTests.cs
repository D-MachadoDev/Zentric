using Moq;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Xunit;
using Zentric.Application.Common.Ports;
using Zentric.Domain.Logistics.Ports;
using Zentric.Application.Orders.Commands;
using Zentric.Domain.Orders.Ports;
using Zentric.Domain.Inventories.Ports;
using Zentric.Domain.Inventories.Services;
using Zentric.Domain.Logistics;
using Zentric.Domain.Orders;
using Zentric.Domain.Products;
using Zentric.Domain.Products.Enums;
using Zentric.Domain.Products.Ports;
using Zentric.Domain.Products.ValueObjects;
using Zentric.Domain.Users;
using Zentric.Domain.Users.Enums;
using Zentric.Domain.Users.Ports;
using Zentric.Domain.Users.ValueObjects;

namespace Zentric.Tests.Application.Orders
{
    public class CheckoutOrderCommandHandlerTests
    {
        private readonly Mock<ICustomerOrderRepository> _orderRepoMock;
        private readonly Mock<IProductRepository> _productRepoMock;
        private readonly Mock<IFulfillmentOrderRepository> _fulfillmentRepoMock;
        private readonly Mock<IInventoryRepository> _inventoryRepoMock;
        private readonly Mock<IUserRepository> _userRepoMock;
        private readonly Mock<IUnitOfWork> _uowMock;
        private readonly InventoryReservationService _inventoryService;
        private readonly CheckoutOrderCommandHandler _handler;

        public CheckoutOrderCommandHandlerTests()
        {
            _orderRepoMock = new Mock<ICustomerOrderRepository>();
            _productRepoMock = new Mock<IProductRepository>();
            _fulfillmentRepoMock = new Mock<IFulfillmentOrderRepository>();
            _inventoryRepoMock = new Mock<IInventoryRepository>();
            _userRepoMock = new Mock<IUserRepository>();
            _uowMock = new Mock<IUnitOfWork>();

            // ADR-0025: la reserva es ahora un UPDATE condicional atomico en la base
            // (TryReserveStockAsync). El mock acepta la reserva por defecto para que
            // los flujos de exito lleguen hasta SaveChanges; el rechazo (false) se
            // prueba en InventoryReservationServiceTests con el fake que simula la
            // base.
            _inventoryRepoMock
                .Setup(r => r.TryReserveStockAsync(It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(true);

            _inventoryService = new InventoryReservationService(_inventoryRepoMock.Object, _productRepoMock.Object);
            _handler = new CheckoutOrderCommandHandler(
                _orderRepoMock.Object,
                _productRepoMock.Object,
                _fulfillmentRepoMock.Object,
                _inventoryService,
                _userRepoMock.Object,
                _uowMock.Object);
        }

        [Fact]
        public async Task Handle_WhenOrderDoesNotExist_ReturnsFailure()
        {
            var command = new CheckoutOrderCommand(Guid.NewGuid(), Guid.NewGuid());
            _orderRepoMock.Setup(r => r.GetByIdForBuyerAsync(command.OrderId, command.BuyerId, It.IsAny<CancellationToken>()))
                .ReturnsAsync((CustomerOrder)null!);

            var result = await _handler.Handle(command, CancellationToken.None);

            Assert.False(result.IsSuccess);
            Assert.Contains("not found", result.Error);
        }

        [Fact]
        public async Task Handle_WhenValidOrder_ReservesStockCreatesFulfillmentsAndSaves()
        {
            // Arrange
            var buyerId = Guid.NewGuid();
            var order = new CustomerOrder(buyerId);
            var variantId1 = Guid.NewGuid();
            var variantId2 = Guid.NewGuid();
            // Q-18: la linea guarda el VendorId como instantanea historica.
            // Orden de la firma: AddItem(variantId, vendorId, quantity, unitPrice).
            var vendor1Id = Guid.NewGuid();
            var vendor2Id = Guid.NewGuid();
            order.AddItem(variantId1, vendor1Id, 2, new Money(10, "COP"));
            order.AddItem(variantId2, vendor2Id, 1, new Money(20, "COP"));

            var command = new CheckoutOrderCommand(order.Id, buyerId);

            _orderRepoMock.Setup(r => r.GetByIdForBuyerAsync(command.OrderId, command.BuyerId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(order);

            // Mock Inventories
            var inventory1 = new Zentric.Domain.Inventories.Inventory(variantId1, Guid.NewGuid(), 5, 0, 0);
            var inventory2 = new Zentric.Domain.Inventories.Inventory(variantId2, Guid.NewGuid(), 5, 0, 0);
            
            _inventoryRepoMock.Setup(r => r.GetByVariantIdAsync(variantId1, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<Zentric.Domain.Inventories.Inventory> { inventory1 });
            _inventoryRepoMock.Setup(r => r.GetByVariantIdAsync(variantId2, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<Zentric.Domain.Inventories.Inventory> { inventory2 });

            // Mock Products
            var product1 = new Product("P1", "D1", new Money(10, "COP"), vendor1Id, ProductType.Physical, new List<(string, IEnumerable<VariantAttribute>)> { ("SKU1", new List<VariantAttribute> { new VariantAttribute("Color", "Red") }) });
            // For testing, we mock that the product has the exact variant ID (reflection or just return it).
            // Since our handler just uses the product's VendorId, we can just return a product with the matching VendorId.
            
            var product2 = new Product("P2", "D2", new Money(20, "COP"), vendor2Id, ProductType.Physical, new List<(string, IEnumerable<VariantAttribute>)> { ("SKU2", new List<VariantAttribute> { new VariantAttribute("Color", "Blue") }) });

            _productRepoMock.Setup(r => r.GetByVariantIdAsync(variantId1, It.IsAny<CancellationToken>()))
                .ReturnsAsync(product1);
            _productRepoMock.Setup(r => r.GetByVariantIdAsync(variantId2, It.IsAny<CancellationToken>()))
                .ReturnsAsync(product2);

            // Act
            var result = await _handler.Handle(command, CancellationToken.None);

            // Assert
            Assert.True(result.IsSuccess, result.Error);
            Assert.Equal(Zentric.Domain.Orders.Enums.OrderStatus.PendingPayment, order.Status);
            
            _fulfillmentRepoMock.Verify(r => r.AddAsync(It.Is<FulfillmentOrder>(f => f.CustomerOrderId == order.Id && f.VendorId == vendor1Id), It.IsAny<CancellationToken>()), Times.Once);
            _fulfillmentRepoMock.Verify(r => r.AddAsync(It.Is<FulfillmentOrder>(f => f.CustomerOrderId == order.Id && f.VendorId == vendor2Id), It.IsAny<CancellationToken>()), Times.Once);
            
            _orderRepoMock.Verify(r => r.UpdateAsync(order, It.IsAny<CancellationToken>()), Times.Once);
            _uowMock.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task Handle_ForeignBuyer_CannotCheckoutAnotherBuyersCart()
        {
            // Q-21b: el handler carga el carrito con el filtro por comprador, asi
            // que el de otro comprador no se materializa y el intento responde
            // "not found" sin reservar stock ni crear fulfillments.
            var command = new CheckoutOrderCommand(Guid.NewGuid(), Guid.NewGuid());
            _orderRepoMock.Setup(r => r.GetByIdForBuyerAsync(command.OrderId, command.BuyerId, It.IsAny<CancellationToken>()))
                .ReturnsAsync((CustomerOrder)null!);

            var result = await _handler.Handle(command, CancellationToken.None);

            Assert.False(result.IsSuccess);
            Assert.Contains("not found", result.Error);
            _fulfillmentRepoMock.Verify(r => r.AddAsync(It.IsAny<FulfillmentOrder>(), It.IsAny<CancellationToken>()), Times.Never);
            _uowMock.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
        }

        /// <summary>
        /// Criterio (dictamen del Owner sobre Q-21b): un recurso que es de otro se
        /// declara NotFound, no un fallo de validacion. Es lo que hace que la capa HTTP
        /// responda 404 y no 400, y por tanto que el cliente no pueda distinguir "no
        /// existe" de "es de otro" por el codigo de estado.
        /// </summary>
        [Fact]
        public async Task Handle_ForeignCart_IsClassifiedAsNotFoundNotValidation()
        {
            var command = new CheckoutOrderCommand(Guid.NewGuid(), Guid.NewGuid());
            _orderRepoMock.Setup(r => r.GetByIdForBuyerAsync(command.OrderId, command.BuyerId, It.IsAny<CancellationToken>()))
                .ReturnsAsync((CustomerOrder)null!);

            var result = await _handler.Handle(command, CancellationToken.None);

            Assert.Equal(Zentric.Application.Common.Models.ErrorKind.NotFound, result.ErrorKind);
        }

        /// <summary>
        /// CAT-02 / H-16: un producto Digital no lleva logistica ni stock, asi que un
        /// carrito solo digital debe poder hacer checkout sin existencias y sin generar
        /// despachos. Antes la reserva exigia stock para todos los items y el checkout
        /// fallaba con "Not enough stock".
        /// </summary>
        [Fact]
        public async Task Handle_DigitalOnlyCart_ChecksOutWithoutStockAndWithoutFulfillment()
        {
            var buyerId = Guid.NewGuid();
            var vendorId = Guid.NewGuid();
            var variantId = Guid.NewGuid();
            var order = new CustomerOrder(buyerId);
            order.AddItem(variantId, vendorId, 1, new Money(30, "COP"));

            var command = new CheckoutOrderCommand(order.Id, buyerId);
            _orderRepoMock.Setup(r => r.GetByIdForBuyerAsync(command.OrderId, command.BuyerId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(order);

            var digital = new Product("Ebook", "Libro digital", new Money(30, "COP"), vendorId, ProductType.Digital, null);
            _productRepoMock.Setup(r => r.GetByVariantIdAsync(variantId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(digital);
            _inventoryRepoMock.Setup(r => r.GetByVariantIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<Zentric.Domain.Inventories.Inventory>());

            var result = await _handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsSuccess, result.Error);
            Assert.Equal(Zentric.Domain.Orders.Enums.OrderStatus.PendingPayment, order.Status);
            _inventoryRepoMock.Verify(r => r.GetByVariantIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
            _fulfillmentRepoMock.Verify(r => r.AddAsync(It.IsAny<FulfillmentOrder>(), It.IsAny<CancellationToken>()), Times.Never);
            _uowMock.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        }

        /// <summary>
        /// Un carrito mixto reserva y despacha solo la linea fisica; el digital no
        /// genera despacho por su cuenta.
        /// </summary>
        [Fact]
        public async Task Handle_MixedCart_ReservesAndDispatchesOnlyThePhysicalLine()
        {
            var buyerId = Guid.NewGuid();
            var vendorId = Guid.NewGuid();
            var physicalVariant = Guid.NewGuid();
            var digitalVariant = Guid.NewGuid();
            var order = new CustomerOrder(buyerId);
            order.AddItem(physicalVariant, vendorId, 2, new Money(10, "COP"));
            order.AddItem(digitalVariant, vendorId, 1, new Money(30, "COP"));

            var command = new CheckoutOrderCommand(order.Id, buyerId);
            _orderRepoMock.Setup(r => r.GetByIdForBuyerAsync(command.OrderId, command.BuyerId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(order);

            var physical = new Product("Camiseta", "Camiseta", new Money(10, "COP"), vendorId, ProductType.Physical,
                new List<(string, IEnumerable<VariantAttribute>)> { ("SKU1", new List<VariantAttribute> { new VariantAttribute("Color", "Rojo") }) });
            var digital = new Product("Ebook", "Libro digital", new Money(30, "COP"), vendorId, ProductType.Digital, null);
            _productRepoMock.Setup(r => r.GetByVariantIdAsync(physicalVariant, It.IsAny<CancellationToken>())).ReturnsAsync(physical);
            _productRepoMock.Setup(r => r.GetByVariantIdAsync(digitalVariant, It.IsAny<CancellationToken>())).ReturnsAsync(digital);

            var stock = new Zentric.Domain.Inventories.Inventory(physicalVariant, Guid.NewGuid(), 5, 0, 0);
            _inventoryRepoMock.Setup(r => r.GetByVariantIdAsync(physicalVariant, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<Zentric.Domain.Inventories.Inventory> { stock });

            var result = await _handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsSuccess, result.Error);
            Assert.Equal(2, stock.ReservedQuantity);
            _fulfillmentRepoMock.Verify(r => r.AddAsync(It.IsAny<FulfillmentOrder>(), It.IsAny<CancellationToken>()), Times.Once);
            _uowMock.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        }

        private static User SellerWithStatus(UserStatus status)
        {
            var seller = new User(
                "DOC-55511",
                new FullName("Vendedor", "Con Estado"),
                new Email("vendedor@example.com"),
                "hashed::secret",
                UserRole.Seller);

            if (status == UserStatus.Blocked)
            {
                seller.Block();
            }

            return seller;
        }

        /// <summary>
        /// INV-05 (decision del Owner 2026-10-04): el checkout rechaza cualquier
        /// carrito que contenga un producto de un Vendedor bloqueado. Los productos
        /// siguen Published (no hay cascada), asi que esta comprobacion es la unica
        /// barrera que impide la venta. Debe ejecutarse ANTES de reservar stock,
        /// porque la reserva ya escribe en la base y dejaria reservas de un pedido
        /// que nunca se guarda.
        /// </summary>
        [Fact]
        public async Task Handle_WhenVendorIsBlocked_RejectsBeforeReservingStock()
        {
            var buyerId = Guid.NewGuid();
            var vendorId = Guid.NewGuid();
            var variantId = Guid.NewGuid();
            var order = new CustomerOrder(buyerId);
            order.AddItem(variantId, vendorId, 1, new Money(10, "COP"));

            var command = new CheckoutOrderCommand(order.Id, buyerId);
            _orderRepoMock.Setup(r => r.GetByIdForBuyerAsync(command.OrderId, command.BuyerId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(order);

            var product = new Product("P1", "D1", new Money(10, "COP"), vendorId, ProductType.Physical,
                new List<(string, IEnumerable<VariantAttribute>)> { ("SKU1", new List<VariantAttribute> { new VariantAttribute("Color", "Red") }) });
            _productRepoMock.Setup(r => r.GetByVariantIdAsync(variantId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(product);

            _userRepoMock.Setup(r => r.GetByIdAsync(vendorId))
                .ReturnsAsync(SellerWithStatus(UserStatus.Blocked));

            var result = await _handler.Handle(command, CancellationToken.None);

            Assert.False(result.IsSuccess);
            Assert.Contains("blocked", result.Error);
            _inventoryRepoMock.Verify(
                r => r.TryReserveStockAsync(It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<CancellationToken>()),
                Times.Never);
            _fulfillmentRepoMock.Verify(r => r.AddAsync(It.IsAny<FulfillmentOrder>(), It.IsAny<CancellationToken>()), Times.Never);
            _uowMock.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
        }

        /// <summary>
        /// La regla es "Vendedor bloqueado", no "Vendedor existente": un Vendedor
        /// activo pasa sin mas y la venta sigue adelante.
        /// </summary>
        [Fact]
        public async Task Handle_WhenVendorIsActive_ChecksOutNormally()
        {
            var buyerId = Guid.NewGuid();
            var vendorId = Guid.NewGuid();
            var variantId = Guid.NewGuid();
            var order = new CustomerOrder(buyerId);
            order.AddItem(variantId, vendorId, 1, new Money(10, "COP"));

            var command = new CheckoutOrderCommand(order.Id, buyerId);
            _orderRepoMock.Setup(r => r.GetByIdForBuyerAsync(command.OrderId, command.BuyerId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(order);

            var product = new Product("P1", "D1", new Money(10, "COP"), vendorId, ProductType.Physical,
                new List<(string, IEnumerable<VariantAttribute>)> { ("SKU1", new List<VariantAttribute> { new VariantAttribute("Color", "Red") }) });
            _productRepoMock.Setup(r => r.GetByVariantIdAsync(variantId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(product);

            _userRepoMock.Setup(r => r.GetByIdAsync(vendorId))
                .ReturnsAsync(SellerWithStatus(UserStatus.Active));

            var stock = new Zentric.Domain.Inventories.Inventory(variantId, Guid.NewGuid(), 5, 0, 0);
            _inventoryRepoMock.Setup(r => r.GetByVariantIdAsync(variantId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<Zentric.Domain.Inventories.Inventory> { stock });

            var result = await _handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsSuccess, result.Error);
            Assert.Equal(1, stock.ReservedQuantity);
            _uowMock.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        }
    }
}
