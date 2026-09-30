using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using Xunit;
using Zentric.Application;
using Zentric.Application.Common.Behaviors;
using Zentric.Application.Common.Messaging;
using Zentric.Application.Logistics.Commands;
using Zentric.Domain.Logistics.Ports;
using Zentric.Application.Orders.Commands;
using Zentric.Domain.Orders.Ports;
using Zentric.Domain.Logistics;
using Zentric.Domain.Orders;
using Zentric.Domain.Products.ValueObjects;

namespace Zentric.Tests.UseCases
{
    /// <summary>
    /// Verificación de integración en memoria del montaje de dependencias que usa
    /// <c>Zentric.Api/Program.cs</c>: descubrimiento de validadores FluentValidation,
    /// resolución del comportamiento genérico del pipeline de mensajes propio y ejecución real
    /// de los handlers. Cubre AGENTS.md, secciones 3.2, 3.4, 4.3 y 6.
    /// </summary>
    public class ValidationPipelineTests
    {
        private sealed class FakeCustomerOrderRepository : ICustomerOrderRepository
        {
            private readonly Dictionary<Guid, CustomerOrder> _orders = new();

            public int UpdateCalls { get; private set; }
            public int Count => _orders.Count;

            public void Seed(CustomerOrder order) => _orders[order.Id] = order;

            public Task<CustomerOrder?> GetByIdForBuyerAsync(
            Guid id, Guid buyerId, CancellationToken cancellationToken = default)
        {
            // El filtro por comprador se aplica en la consulta, igual que en el
            // repositorio real: un pedido ajeno devuelve null.
            var order = _orders.TryGetValue(id, out var found) && found.BuyerId == buyerId
                ? found
                : null;
            return Task.FromResult(order);
        }

        public Task<CustomerOrder?> GetByIdForVendorAsync(
            Guid id, Guid vendorId, CancellationToken cancellationToken = default)
        {
            // Q-21b: mismo filtro-en-consulta que el repositorio real.
            var order = _orders.TryGetValue(id, out var found)
                && found.Items.Any(i => i.VendorId == vendorId)
                ? found
                : null;
            return Task.FromResult(order);
        }

        public Task<CustomerOrder?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
                => Task.FromResult(_orders.TryGetValue(id, out var order) ? order : null);

            public Task<IReadOnlyList<CustomerOrder>> GetExpiredOrdersAsync(DateTime threshold, CancellationToken cancellationToken = default)
                => Task.FromResult((IReadOnlyList<CustomerOrder>)_orders.Values.Where(o => o.UpdatedAt < threshold).ToList());

            public Task AddAsync(CustomerOrder order, CancellationToken cancellationToken = default)
            {
                _orders[order.Id] = order;
                return Task.CompletedTask;
            }

            public Task UpdateAsync(CustomerOrder order, CancellationToken cancellationToken = default)
            {
                UpdateCalls++;
                _orders[order.Id] = order;
                return Task.CompletedTask;
            }
        }

        private sealed class FakeProductRepository : Zentric.Domain.Products.Ports.IProductRepository
        {
            // Q-18: el dueno del producto devuelto. Los tests deben pasar este
            // mismo valor como VendorId del comando para que la validacion
            // de propiedad (Q-18) pase.
            public static Guid VendorIdUnderTest { get; set; } = Guid.NewGuid();

            public Task<Zentric.Domain.Products.Product?> GetByIdAsync(Guid id, CancellationToken ct = default)
                => Task.FromResult<Zentric.Domain.Products.Product?>(null);

            public Task<Zentric.Domain.Products.Product?> GetByVariantIdAsync(Guid variantId, CancellationToken ct = default)
            {
                // Q-18: el handler valida que el VendorId de la linea coincida
                // con el dueno real de la variante. Este fake construye un
                // producto cuyo dueno es VendorIdUnderTest.
                var money = new Money(10m, "COP");
                var product = new Zentric.Domain.Products.Product(
                    name: "Producto",
                    description: "Descripcion",
                    price: money,
                    vendorId: VendorIdUnderTest,
                    type: Zentric.Domain.Products.Enums.ProductType.Physical,
                    variants: new (string, IEnumerable<Zentric.Domain.Products.ValueObjects.VariantAttribute>)[]
                    {
                        // Una variante debe declarar al menos un atributo (CAT-03).
                        ("SKU-1", new[]
                        {
                            new Zentric.Domain.Products.ValueObjects.VariantAttribute("Color", "Negro")
                        })
                    });
                return Task.FromResult<Zentric.Domain.Products.Product?>(product);
            }

            public Task<IReadOnlyList<Zentric.Domain.Products.Product>> GetAllAsync(Guid? vendorId = null, CancellationToken ct = default)
                => Task.FromResult((IReadOnlyList<Zentric.Domain.Products.Product>)new List<Zentric.Domain.Products.Product>());

        public Task<(IReadOnlyList<Zentric.Domain.Products.Product> Items, int TotalItems)> GetPagedAsync(
            Guid? vendorId, int skip, int take, CancellationToken cancellationToken = default)
        {
            // Los fakes en memoria no necesitan paginar de verdad.
            var all = GetAllAsync(vendorId, cancellationToken).Result;
            return Task.FromResult<(IReadOnlyList<Zentric.Domain.Products.Product>, int)>((all.Skip(skip).Take(take).ToList(), all.Count()));
        }

            public Task AddAsync(Zentric.Domain.Products.Product product, CancellationToken ct = default)
                => Task.CompletedTask;

            public Task UpdateAsync(Zentric.Domain.Products.Product product, CancellationToken ct = default)
                => Task.CompletedTask;
        }

        private sealed class FakeFulfillmentOrderRepository : IFulfillmentOrderRepository
        {
            public Task<FulfillmentOrder?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
                => Task.FromResult<FulfillmentOrder?>(null);

            public Task AddAsync(FulfillmentOrder order, CancellationToken cancellationToken = default)
                => Task.CompletedTask;

            public Task UpdateAsync(FulfillmentOrder order, CancellationToken cancellationToken = default)
                => Task.CompletedTask;
        }

        private sealed class FakeInventoryRepository : Zentric.Domain.Inventories.Ports.IInventoryRepository
        {
            public Task AddAsync(Zentric.Domain.Inventories.Inventory inventory, CancellationToken cancellationToken = default) => Task.CompletedTask;
            public Task<Zentric.Domain.Inventories.Inventory?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) => Task.FromResult<Zentric.Domain.Inventories.Inventory?>(null);
            public Task<IEnumerable<Zentric.Domain.Inventories.Inventory>> GetByVariantIdAsync(Guid variantId, CancellationToken cancellationToken = default) => Task.FromResult<IEnumerable<Zentric.Domain.Inventories.Inventory>>(new List<Zentric.Domain.Inventories.Inventory>());
            public Task<Zentric.Domain.Inventories.Inventory?> GetByVariantAndWarehouseAsync(Guid variantId, Guid warehouseId, CancellationToken cancellationToken = default) => Task.FromResult<Zentric.Domain.Inventories.Inventory?>(null);
            public Task<int> GetTotalAvailableStockAsync(Guid variantId, CancellationToken cancellationToken = default) => Task.FromResult(999);
            public Task UpdateAsync(Zentric.Domain.Inventories.Inventory inventory, CancellationToken cancellationToken = default) => Task.CompletedTask;
        }

        /// <summary>Reproduce el registro de servicios de la capa de presentación.</summary>
        private static (IMediator Mediator, FakeCustomerOrderRepository Orders) BuildMediator()
        {
            var orders = new FakeCustomerOrderRepository();
            var products = new FakeProductRepository();
            var services = new ServiceCollection();

            // MediatR 14 exige ILoggerFactory registrado antes de AddMediatR();
            // en Zentric.Api lo aporta WebApplicationBuilder.
            services.AddLogging();
            services.AddSingleton<ICustomerOrderRepository>(orders);
            services.AddSingleton<IFulfillmentOrderRepository, FakeFulfillmentOrderRepository>();
            services.AddSingleton<Zentric.Domain.Inventories.Ports.IInventoryRepository, FakeInventoryRepository>();
            services.AddSingleton<Zentric.Application.Common.Ports.IUnitOfWork>(new Moq.Mock<Zentric.Application.Common.Ports.IUnitOfWork>().Object);
            services.AddSingleton<Zentric.Domain.Products.Ports.IProductRepository>(products);
            services.AddSingleton<Zentric.Domain.Inventories.Services.InventoryReservationService>(new Zentric.Domain.Inventories.Services.InventoryReservationService(new FakeInventoryRepository()));

            // Q-14: el dispatcher propio registra validadores y handlers del ensamblado.
            services.AddZentricApplication(typeof(CreateCartCommand).Assembly);

            // El comportamiento de validacion envuelve la ejecucion del handler.
            services.AddScoped(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));

            var provider = services.BuildServiceProvider();
            return (provider.GetRequiredService<IMediator>(), orders);
        }

        [Fact]
        public async Task Send_ValidCreateCartCommand_ReturnsNewOrderAndPersistsIt()
        {
            var (mediator, orders) = BuildMediator();

            var result = await mediator.Send(new CreateCartCommand(Guid.NewGuid()));

            Assert.True(result.IsSuccess);
            Assert.NotEqual(Guid.Empty, result.Value);
            Assert.NotNull(await orders.GetByIdAsync(result.Value));
        }

        [Fact]
        public async Task Send_CreateCartCommandWithEmptyBuyerId_ReturnsValidationFailureWithoutPersisting()
        {
            var (mediator, orders) = BuildMediator();

            var result = await mediator.Send(new CreateCartCommand(Guid.Empty));

            Assert.True(result.IsFailure);
            Assert.Equal("BuyerId is required.", result.Error);
            Assert.Equal(0, orders.Count);
        }

        [Fact]
        public async Task Send_AddOrderItemCommandWithZeroQuantity_ReturnsValidationFailure()
        {
            var (mediator, _) = BuildMediator();

            var result = await mediator.Send(new AddOrderItemCommand(Guid.NewGuid(), Guid.NewGuid(), FakeProductRepository.VendorIdUnderTest, 0, 10m, "COP", Guid.NewGuid()));

            Assert.True(result.IsFailure);
            Assert.Contains("Quantity must be greater than zero.", result.Error);
        }

        [Fact]
        public async Task Send_AddOrderItemCommandWhenOrderDoesNotExist_ReturnsNotFoundFailure()
        {
            var (mediator, _) = BuildMediator();

            var result = await mediator.Send(new AddOrderItemCommand(Guid.NewGuid(), Guid.NewGuid(), FakeProductRepository.VendorIdUnderTest, 1, 10m, "COP", Guid.NewGuid()));

            Assert.True(result.IsFailure);
            Assert.Equal("Order not found.", result.Error);
        }

        [Fact]
        public async Task Send_AddOrderItemCommandWhenOrderIsNotInCart_ReturnsBusinessFailureWithoutThrowing()
        {
            // Regresión H-09: antes, la excepción del agregado se capturaba con un
            // catch (Exception) genérico; ahora el fallo previsible se informa como Result.
            var (mediator, orders) = BuildMediator();
            var buyerId = Guid.NewGuid();
            var order = new CustomerOrder(buyerId);
            order.AddItem(Guid.NewGuid(), Guid.NewGuid(), 1, new Money(10, "COP"));
            order.Checkout();
            orders.Seed(order);

            var result = await mediator.Send(new AddOrderItemCommand(order.Id, Guid.NewGuid(), FakeProductRepository.VendorIdUnderTest, 1, 10m, "COP", buyerId));

            Assert.True(result.IsFailure);
            Assert.Equal("Items can only be added while the order is in the Cart status.", result.Error);
            Assert.Equal(0, orders.UpdateCalls);
        }

        [Fact]
        public async Task Send_AddOrderItemCommandWhenOrderIsInCart_AddsItemAndPersists()
        {
            var (mediator, orders) = BuildMediator();
            var buyerId = Guid.NewGuid();
            var order = new CustomerOrder(buyerId);
            orders.Seed(order);
            var variantId = Guid.NewGuid();

            var result = await mediator.Send(new AddOrderItemCommand(order.Id, variantId, FakeProductRepository.VendorIdUnderTest, 2, 15m, "cop", buyerId));

            Assert.True(result.IsSuccess);
            Assert.Equal(1, orders.UpdateCalls);
            Assert.Single(order.Items);
            Assert.Equal(variantId, order.Items.First().VariantId);
            Assert.Equal(new Money(30m, "COP"), order.TotalAmount);
        }

        [Fact]
        public async Task Send_CreateFulfillmentOrderCommandWithEmptyVendorId_ReturnsValidationFailure()
        {
            var (mediator, _) = BuildMediator();

            var result = await mediator.Send(new CreateFulfillmentOrderCommand(Guid.NewGuid(), Guid.Empty, Guid.NewGuid(), Zentric.Domain.Users.Enums.UserRole.Administrator));

            Assert.True(result.IsFailure);
            Assert.Equal("Vendor ID is required.", result.Error);
        }

        [Fact]
        public async Task Send_AddOrderItemCommandForAnotherBuyersCart_ReturnsNotFoundAndPersistsNothing()
        {
            // Q-21b: el carrito ajeno se trata como inexistente. Antes, cualquier
            // comprador podia agregar items al de otro con solo conocer su GUID.
            var (mediator, orders) = BuildMediator();
            var ownerId = Guid.NewGuid();
            var order = new CustomerOrder(ownerId);
            orders.Seed(order);

            var result = await mediator.Send(new AddOrderItemCommand(
                order.Id, Guid.NewGuid(), FakeProductRepository.VendorIdUnderTest, 1, 10m, "COP", Guid.NewGuid()));

            Assert.True(result.IsFailure);
            Assert.Equal("Order not found.", result.Error);
            Assert.Equal(0, orders.UpdateCalls);
            Assert.Empty(order.Items);
        }
    }
}
