using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Xunit;
using Zentric.Application.Common.Ports;
using Zentric.Application.Orders.Commands;
using Zentric.Domain.Inventories;
using Zentric.Domain.Inventories.Ports;
using Zentric.Domain.Orders;
using Zentric.Domain.Orders.Enums;
using Zentric.Domain.Orders.Ports;
using Zentric.Domain.Products;
using Zentric.Domain.Products.Enums;
using Zentric.Domain.Products.Ports;
using Zentric.Domain.Products.ValueObjects;

namespace Zentric.Tests.Application.Orders
{
    public class FakeUnitOfWorkForCart : IUnitOfWork
    {
        public bool SaveChangesCalled { get; private set; }

        public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            SaveChangesCalled = true;
            return Task.FromResult(1);
        }
    }

    public class FakeOrderRepositoryForCart : ICustomerOrderRepository
    {
        private readonly List<CustomerOrder> _orders = new();

        public void Seed(CustomerOrder order) => _orders.Add(order);

        public Task<CustomerOrder?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
            => Task.FromResult(_orders.FirstOrDefault(o => o.Id == id));

        // El filtro por comprador va en la consulta, no despues: un carrito
        // ajeno es indistinguible de uno inexistente.
        public Task<CustomerOrder?> GetByIdForBuyerAsync(
            Guid id, Guid buyerId, CancellationToken cancellationToken = default)
            => Task.FromResult(_orders.FirstOrDefault(o => o.Id == id && o.BuyerId == buyerId));

        public Task<CustomerOrder?> GetByIdForVendorAsync(
            Guid id, Guid vendorId, CancellationToken cancellationToken = default)
            => Task.FromResult(
                _orders.FirstOrDefault(o => o.Id == id && o.Items.Any(i => i.VendorId == vendorId)));

        public Task<IReadOnlyList<CustomerOrder>> GetListAsync(
            Guid? buyerId, Guid? vendorId, OrderStatus? status, CancellationToken cancellationToken = default)
            => Task.FromResult<IReadOnlyList<CustomerOrder>>(new List<CustomerOrder>());

        public Task<IReadOnlyList<CustomerOrder>> GetExpiredOrdersAsync(
            DateTime threshold, CancellationToken cancellationToken = default)
            => Task.FromResult<IReadOnlyList<CustomerOrder>>(Array.Empty<CustomerOrder>());

        public Task AddAsync(CustomerOrder order, CancellationToken cancellationToken = default)
        {
            _orders.Add(order);
            return Task.CompletedTask;
        }

        public Task UpdateAsync(CustomerOrder order, CancellationToken cancellationToken = default)
            => Task.CompletedTask;

        public Task RemoveAsync(CustomerOrder order, CancellationToken cancellationToken = default)
            => Task.CompletedTask;
    }

    public class FakeProductRepositoryForCart : IProductRepository
    {
        public Product? Product { get; set; }

        public Task<Product?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
            => Task.FromResult(Product);

        public Task<Product?> GetByVariantIdAsync(Guid variantId, CancellationToken cancellationToken = default)
            => Task.FromResult(Product);

        public Task<IReadOnlyList<Product>> GetAllAsync(Guid? vendorId = null, ProductStatus? status = null, CancellationToken cancellationToken = default)
            => Task.FromResult<IReadOnlyList<Product>>(Array.Empty<Product>());

        public Task<(IReadOnlyList<Product> Items, int TotalItems)> GetPagedAsync(Guid? vendorId, ProductStatus? status, int skip, int take, CancellationToken cancellationToken = default)
            => Task.FromResult<(IReadOnlyList<Product> Items, int TotalItems)>((Array.Empty<Product>(), 0));

        public Task<IReadOnlyList<Zentric.Domain.Products.Ports.CategoryDto>> GetCategoriesWithCountAsync(CancellationToken cancellationToken = default)
            => Task.FromResult<IReadOnlyList<Zentric.Domain.Products.Ports.CategoryDto>>(Array.Empty<Zentric.Domain.Products.Ports.CategoryDto>());

        public Task<IReadOnlyList<Product>> GetHeroProductsAsync(int count, CancellationToken cancellationToken = default)
            => Task.FromResult<IReadOnlyList<Product>>(Array.Empty<Product>());

        public Task AddAsync(Product product, CancellationToken cancellationToken = default)
            => Task.CompletedTask;

        public Task UpdateAsync(Product product, CancellationToken cancellationToken = default)
            => Task.CompletedTask;
    }

    public class FakeInventoryRepositoryForCart : IInventoryRepository
    {
        public int AvailableStock { get; set; } = 100;

        public Task<Inventory?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
            => Task.FromResult<Inventory?>(null);

        public Task<Inventory?> GetByVariantAndWarehouseAsync(
            Guid variantId, Guid warehouseId, CancellationToken cancellationToken = default)
            => Task.FromResult<Inventory?>(null);

        public Task<IEnumerable<Inventory>> GetByVariantIdAsync(
            Guid variantId, CancellationToken cancellationToken = default)
            => Task.FromResult<IEnumerable<Inventory>>(Array.Empty<Inventory>());

        public Task<int> GetTotalAvailableStockAsync(Guid variantId, CancellationToken cancellationToken = default)
            => Task.FromResult(AvailableStock);

        public Task<IReadOnlyList<Inventory>> GetListAsync(
            Guid? vendorId, CancellationToken cancellationToken = default)
            => Task.FromResult<IReadOnlyList<Inventory>>(Array.Empty<Inventory>());

        public Task AddAsync(Inventory inventory, CancellationToken cancellationToken = default)
            => Task.CompletedTask;

        public Task UpdateAsync(Inventory inventory, CancellationToken cancellationToken = default)
            => Task.CompletedTask;

        public Task<Inventory> LoadWithHistoryAsync(Guid id, CancellationToken cancellationToken = default)
            => throw new InvalidOperationException("Este fake no carga historiales.");

        public Task SaveAdjustmentAsync(Inventory inventory, StockAdjustmentRecord record, CancellationToken cancellationToken = default)
            => Task.CompletedTask;

        public Task<bool> TryReserveStockAsync(Guid inventoryId, int quantity, CancellationToken cancellationToken = default)
            => Task.FromResult(false); // Este fake no guarda filas: el UPDATE condicional afectaria cero.

        public Task ReleaseReservedStockAsync(Guid inventoryId, int quantity, CancellationToken cancellationToken = default)
            => Task.CompletedTask;

    }

    public class AddOrderItemCommandHandlerTests
    {
        private const decimal CataloguePrice = 19999m;
        private const string Currency = "COP";

        private static (Product Product, Guid VariantId) BuildPhysicalProduct(Guid vendorId)
        {
            var product = new Product(
                "Camiseta Zentric",
                "Camiseta de algodon",
                new Money(CataloguePrice, Currency),
                vendorId,
                ProductType.Physical,
                new (string Sku, IEnumerable<VariantAttribute> Attributes)[]
                {
                    ("SKU-1", new List<VariantAttribute> { new VariantAttribute("Color", "Rojo") })
                });

            return (product, product.Variants.First().Id);
        }

        [Fact(DisplayName = "AltaDeLinea_ElPrecioLoMandaElCatalogo_NoElCliente")]
        public async Task Handle_UsesTheCataloguePrice_NotTheOneSentByTheClient()
        {
            var vendorId = Guid.NewGuid();
            var buyerId = Guid.NewGuid();
            var (product, variantId) = BuildPhysicalProduct(vendorId);

            var orders = new FakeOrderRepositoryForCart();
            var order = new CustomerOrder(buyerId);
            orders.Seed(order);

            var handler = new AddOrderItemCommandHandler(
                orders,
                new FakeInventoryRepositoryForCart(),
                new FakeProductRepositoryForCart { Product = product },
                new FakeUnitOfWorkForCart());

            // El cliente ya no puede mandar precio: el comando no lo admite.
            var result = await handler.Handle(
                new AddOrderItemCommand(order.Id, variantId, 2, buyerId),
                CancellationToken.None);

            Assert.False(result.IsFailure);

            var line = order.Items.Single();
            Assert.Equal(CataloguePrice, line.UnitPrice.Amount);
            Assert.Equal(Currency, line.UnitPrice.Currency);
        }

        // Criterio de aceptación: el producto suspendido
        // "no se puede agregar a carritos". Se afirma también que no queda linea: un
        // rechazo que aun asi mutara el pedido dejaria el carrito corrupto.
        [Fact(DisplayName = "AltaDeLinea_ProductoSuspendido_SeRechazaYTocaElCarrito")]
        public async Task Handle_SuspendedProduct_ReturnsFailureAndDoesNotAddLine()
        {
            var vendorId = Guid.NewGuid();
            var buyerId = Guid.NewGuid();
            var (product, variantId) = BuildPhysicalProduct(vendorId);
            product.Suspend();

            var orders = new FakeOrderRepositoryForCart();
            var order = new CustomerOrder(buyerId);
            orders.Seed(order);

            var handler = new AddOrderItemCommandHandler(
                orders,
                new FakeInventoryRepositoryForCart(),
                new FakeProductRepositoryForCart { Product = product },
                new FakeUnitOfWorkForCart());

            var result = await handler.Handle(
                new AddOrderItemCommand(order.Id, variantId, 1, buyerId),
                CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.Empty(order.Items);
        }

        // ZENTRIC.md:83 — el Comprador "adquiere productos publicados". Delete() deja el
        // producto Discontinued y borrado a la vez, de modo que el mismo guardia lo cubre.
        [Fact(DisplayName = "AltaDeLinea_ProductoDescontinuado_SeRechaza")]
        public async Task Handle_DeletedProduct_ReturnsFailure()
        {
            var vendorId = Guid.NewGuid();
            var buyerId = Guid.NewGuid();
            var (product, variantId) = BuildPhysicalProduct(vendorId);
            product.Delete();

            var orders = new FakeOrderRepositoryForCart();
            var order = new CustomerOrder(buyerId);
            orders.Seed(order);

            var handler = new AddOrderItemCommandHandler(
                orders,
                new FakeInventoryRepositoryForCart(),
                new FakeProductRepositoryForCart { Product = product },
                new FakeUnitOfWorkForCart());

            var result = await handler.Handle(
                new AddOrderItemCommand(order.Id, variantId, 1, buyerId),
                CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.Empty(order.Items);
        }
    }
}