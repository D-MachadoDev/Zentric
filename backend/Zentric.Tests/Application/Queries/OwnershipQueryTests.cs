using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Xunit;
using Zentric.Application.Billing.Queries;
using Zentric.Application.Inventories.Queries;
using Zentric.Application.Logistics.Queries;
using Zentric.Application.Orders.Queries;
using Zentric.Application.Returns.Queries;
using Zentric.Application.Warehouses.Queries;
using Zentric.Domain.Billing;
using Zentric.Domain.Billing.Ports;
using Zentric.Domain.Inventories;
using Zentric.Domain.Inventories.Ports;
using Zentric.Domain.Logistics;
using Zentric.Domain.Logistics.Ports;
using Zentric.Domain.Orders;
using Zentric.Domain.Orders.Ports;
using Zentric.Domain.Products;
using Zentric.Domain.Products.Enums;
using Zentric.Domain.Products.Ports;
using Zentric.Domain.Products.ValueObjects;
using Zentric.Domain.Returns;
using Zentric.Domain.Returns.Ports;
using Zentric.Domain.Users.Enums;
using Zentric.Domain.Warehouses;
using Zentric.Domain.Warehouses.Enum;
using Zentric.Domain.Warehouses.Ports;

namespace Zentric.Tests.Application.Queries
{
    /// <summary>
    /// Propiedad del recurso en las lecturas de detalle (Q-21b, dictamen A):
    /// Comprador y Vendedor solo ven lo suyo; Operador, Administrador y
    /// Supervisor leen sin filtro de dueno. Un recurso ajeno responde igual que
    /// uno inexistente, para no permitir enumeracion por GUID.
    /// </summary>
    public class OwnershipQueryTests
    {
        private sealed class FakeOrderRepository : ICustomerOrderRepository
        {
            public List<CustomerOrder> Orders { get; } = new();

            public Task<CustomerOrder?> GetByIdForBuyerAsync(
                Guid id, Guid buyerId, CancellationToken cancellationToken = default)
                => Task.FromResult(Orders.FirstOrDefault(o => o.Id == id && o.BuyerId == buyerId));

            public Task<CustomerOrder?> GetByIdForVendorAsync(
                Guid id, Guid vendorId, CancellationToken cancellationToken = default)
                => Task.FromResult(Orders.FirstOrDefault(o => o.Id == id && o.Items.Any(i => i.VendorId == vendorId)));

            public Task<CustomerOrder?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
                => Task.FromResult(Orders.FirstOrDefault(o => o.Id == id));

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

        private static CustomerOrder OrderFor(Guid buyerId, params (Guid VendorId, int Quantity, decimal Price)[] lines)
        {
            var order = new CustomerOrder(buyerId);
            foreach (var line in lines)
            {
                order.AddItem(Guid.NewGuid(), line.VendorId, line.Quantity, new Money(line.Price, "COP"));
            }

            return order;
        }
        private sealed class FakeInvoiceRepository : IInvoiceRepository
        {
            public List<Invoice> Invoices { get; } = new();

            public Task<Invoice?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
                => Task.FromResult(Invoices.FirstOrDefault(i => i.Id == id));

            public Task<IReadOnlyList<Invoice>> GetByOrderIdAsync(Guid orderId, CancellationToken cancellationToken = default)
                => Task.FromResult((IReadOnlyList<Invoice>)Invoices.Where(i => i.CustomerOrderId == orderId).ToList());

            public Task AddAsync(Invoice invoice, CancellationToken cancellationToken = default)
            {
                Invoices.Add(invoice);
                return Task.CompletedTask;
            }

            public Task AddRangeAsync(IEnumerable<Invoice> invoices, CancellationToken cancellationToken = default)
            {
                Invoices.AddRange(invoices);
                return Task.CompletedTask;
            }

            public Task UpdateAsync(Invoice invoice, CancellationToken cancellationToken = default)
                => Task.CompletedTask;
        }

        private sealed class FakeReturnRepository : IReturnRequestRepository
        {
            public List<ReturnRequest> Requests { get; } = new();

            public Task<ReturnRequest?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
                => Task.FromResult(Requests.FirstOrDefault(r => r.Id == id));

            public Task AddAsync(ReturnRequest request, CancellationToken cancellationToken = default)
            {
                Requests.Add(request);
                return Task.CompletedTask;
            }

            public Task UpdateAsync(ReturnRequest request, CancellationToken cancellationToken = default)
                => Task.CompletedTask;
        }
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

        private sealed class FakeProductRepository : IProductRepository
        {
            public Dictionary<Guid, Product> ByVariant { get; } = new();

            // El handler de devoluciones solo consulta el dueno de la variante
            // (product.VendorId); el resto del puerto no se ejercita aqui.
            public Task<Product?> GetByVariantIdAsync(Guid variantId, CancellationToken cancellationToken = default)
                => Task.FromResult(ByVariant.TryGetValue(variantId, out var product) ? product : null);

            public Task<Product?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
                => Task.FromResult<Product?>(null);

            public Task<IReadOnlyList<Product>> GetAllAsync(Guid? vendorId = null, CancellationToken cancellationToken = default)
                => Task.FromResult((IReadOnlyList<Product>)Array.Empty<Product>());

            public Task<(IReadOnlyList<Product> Items, int TotalItems)> GetPagedAsync(
                Guid? vendorId, int skip, int take, CancellationToken cancellationToken = default)
                => Task.FromResult(((IReadOnlyList<Product>)Array.Empty<Product>(), 0));

            public Task AddAsync(Product product, CancellationToken cancellationToken = default)
                => Task.CompletedTask;

            public Task UpdateAsync(Product product, CancellationToken cancellationToken = default)
                => Task.CompletedTask;
        }
        // ---- Vista del pedido para el vendedor (P2 de la ronda 2) ----

        [Fact]
        public async Task SellerOrderView_ShowsOnlyOwnLinesAndSubtotal()
        {
            var vendorA = Guid.NewGuid();
            var vendorB = Guid.NewGuid();
            var orders = new FakeOrderRepository();
            var order = OrderFor(Guid.NewGuid(), (vendorA, 2, 10m), (vendorB, 1, 50m));
            orders.Orders.Add(order);
            var handler = new GetOrderByIdForSellerQueryHandler(orders);

            var result = await handler.Handle(new GetOrderByIdForSellerQuery(order.Id, vendorA), CancellationToken.None);

            Assert.True(result.IsSuccess);
            var item = Assert.Single(result.Value.Items);
            Assert.Equal(2, item.Quantity);
            Assert.Equal(20m, result.Value.VendorSubtotal);
        }

        [Fact]
        public async Task SellerOrderView_WhenSellerDoesNotParticipate_ReturnsNotFound()
        {
            var orders = new FakeOrderRepository();
            var order = OrderFor(Guid.NewGuid(), (Guid.NewGuid(), 1, 10m));
            orders.Orders.Add(order);
            var handler = new GetOrderByIdForSellerQueryHandler(orders);

            var result = await handler.Handle(new GetOrderByIdForSellerQuery(order.Id, Guid.NewGuid()), CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.Equal("Order not found.", result.Error);
        }

        // ---- Facturas por rol (P3) ----

        [Fact]
        public async Task BuyerSeesOnlyTheMasterInvoiceOfOwnOrder()
        {
            var buyer = Guid.NewGuid();
            var vendor = Guid.NewGuid();
            var orders = new FakeOrderRepository();
            var invoices = new FakeInvoiceRepository();
            var order = OrderFor(buyer, (vendor, 1, 100m));
            orders.Orders.Add(order);
            invoices.Invoices.Add(Invoice.CreateMaster(order.Id, new Money(100m, "COP")));
            invoices.Invoices.Add(Invoice.CreateZentricDetail(order.Id, new Money(5m, "COP")));
            invoices.Invoices.Add(Invoice.CreateVendorDetail(order.Id, vendor, new Money(95m, "COP")));
            var handler = new GetInvoicesByOrderQueryHandler(invoices, orders);

            var result = await handler.Handle(new GetInvoicesByOrderQuery(order.Id, buyer, UserRole.Buyer), CancellationToken.None);

            Assert.True(result.IsSuccess);
            var invoice = Assert.Single(result.Value);
            Assert.Equal("Master", invoice.Type);
        }

        [Fact]
        public async Task BuyerRequestingAnotherBuyersOrder_ReturnsNotFound()
        {
            var orders = new FakeOrderRepository();
            var invoices = new FakeInvoiceRepository();
            var order = OrderFor(Guid.NewGuid(), (Guid.NewGuid(), 1, 10m));
            orders.Orders.Add(order);
            invoices.Invoices.Add(Invoice.CreateMaster(order.Id, new Money(10m, "COP")));
            var handler = new GetInvoicesByOrderQueryHandler(invoices, orders);

            var result = await handler.Handle(new GetInvoicesByOrderQuery(order.Id, Guid.NewGuid(), UserRole.Buyer), CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.Equal("Order not found.", result.Error);
        }

        [Fact]
        public async Task SellerSeesOnlyOwnVendorInvoices()
        {
            var vendorA = Guid.NewGuid();
            var vendorB = Guid.NewGuid();
            var orders = new FakeOrderRepository();
            var invoices = new FakeInvoiceRepository();
            var order = OrderFor(Guid.NewGuid(), (vendorA, 1, 10m));
            orders.Orders.Add(order);
            invoices.Invoices.Add(Invoice.CreateMaster(order.Id, new Money(10m, "COP")));
            invoices.Invoices.Add(Invoice.CreateVendorDetail(order.Id, vendorA, new Money(9m, "COP")));
            invoices.Invoices.Add(Invoice.CreateVendorDetail(order.Id, vendorB, new Money(1m, "COP")));
            var handler = new GetInvoicesByOrderQueryHandler(invoices, orders);

            var result = await handler.Handle(new GetInvoicesByOrderQuery(order.Id, vendorA, UserRole.Seller), CancellationToken.None);

            Assert.True(result.IsSuccess);
            var invoice = Assert.Single(result.Value);
            Assert.Equal(vendorA, invoice.VendorId);
        }

        [Fact]
        public async Task AdministratorSeesAllInvoicesIncludingPlatformDetail()
        {
            var vendor = Guid.NewGuid();
            var orders = new FakeOrderRepository();
            var invoices = new FakeInvoiceRepository();
            var order = OrderFor(Guid.NewGuid(), (vendor, 1, 100m));
            orders.Orders.Add(order);
            invoices.Invoices.Add(Invoice.CreateMaster(order.Id, new Money(100m, "COP")));
            invoices.Invoices.Add(Invoice.CreateZentricDetail(order.Id, new Money(5m, "COP")));
            invoices.Invoices.Add(Invoice.CreateVendorDetail(order.Id, vendor, new Money(95m, "COP")));
            var handler = new GetInvoicesByOrderQueryHandler(invoices, orders);

            var result = await handler.Handle(new GetInvoicesByOrderQuery(order.Id, Guid.NewGuid(), UserRole.Administrator), CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.Equal(3, result.Value.Count);
        }
        // ---- Devoluciones por rol ----

        [Fact]
        public async Task BuyerCannotReadAnotherBuyersReturn()
        {
            var orders = new FakeOrderRepository();
            var returns = new FakeReturnRepository();
            var products = new FakeProductRepository();
            var order = OrderFor(Guid.NewGuid(), (Guid.NewGuid(), 1, 10m));
            orders.Orders.Add(order);
            var ret = new ReturnRequest(order.Id, Guid.NewGuid(), Guid.NewGuid(), 1, ProductType.Physical);
            returns.Requests.Add(ret);
            var handler = new GetReturnByIdQueryHandler(returns, orders, products);

            var result = await handler.Handle(new GetReturnByIdQuery(ret.Id, Guid.NewGuid(), UserRole.Buyer), CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.Equal("Return request not found.", result.Error);
        }

        [Fact]
        public async Task SellerCannotReadReturnsOfAnotherSellersProduct()
        {
            var vendorA = Guid.NewGuid();
            var variantId = Guid.NewGuid();
            var returns = new FakeReturnRepository();
            var products = new FakeProductRepository();
            // El tipo no importa para la comprobacion de dueno: solo su VendorId.
            products.ByVariant[variantId] = new Product("P", "D", new Money(1m, "COP"), vendorA, ProductType.Digital, null);
            var ret = new ReturnRequest(Guid.NewGuid(), variantId, Guid.NewGuid(), 1, ProductType.Physical);
            returns.Requests.Add(ret);
            var handler = new GetReturnByIdQueryHandler(returns, new FakeOrderRepository(), products);

            var result = await handler.Handle(new GetReturnByIdQuery(ret.Id, Guid.NewGuid(), UserRole.Seller), CancellationToken.None);

            Assert.True(result.IsFailure);
        }

        [Fact]
        public async Task SellerReadsOwnReturnAndOperatorReadsAnyReturn()
        {
            var vendorA = Guid.NewGuid();
            var variantId = Guid.NewGuid();
            var returns = new FakeReturnRepository();
            var products = new FakeProductRepository();
            products.ByVariant[variantId] = new Product("P", "D", new Money(1m, "COP"), vendorA, ProductType.Digital, null);
            var ret = new ReturnRequest(Guid.NewGuid(), variantId, Guid.NewGuid(), 1, ProductType.Physical);
            returns.Requests.Add(ret);
            var handler = new GetReturnByIdQueryHandler(returns, new FakeOrderRepository(), products);

            var asOwner = await handler.Handle(new GetReturnByIdQuery(ret.Id, vendorA, UserRole.Seller), CancellationToken.None);
            var asOperator = await handler.Handle(new GetReturnByIdQuery(ret.Id, Guid.NewGuid(), UserRole.LogisticsOperator), CancellationToken.None);

            Assert.True(asOwner.IsSuccess);
            Assert.True(asOperator.IsSuccess);
        }

        // ---- Despachos por rol ----

        [Fact]
        public async Task BuyerCannotReadAnotherBuyersFulfillment()
        {
            var orders = new FakeOrderRepository();
            var fulfillments = new FakeFulfillmentRepository();
            var order = OrderFor(Guid.NewGuid(), (Guid.NewGuid(), 1, 10m));
            orders.Orders.Add(order);
            var fulfillment = new FulfillmentOrder(order.Id, Guid.NewGuid());
            fulfillments.Orders.Add(fulfillment);
            var handler = new GetFulfillmentByIdQueryHandler(fulfillments, orders);

            var result = await handler.Handle(new GetFulfillmentByIdQuery(fulfillment.Id, Guid.NewGuid(), UserRole.Buyer), CancellationToken.None);

            Assert.True(result.IsFailure);
        }

        [Fact]
        public async Task BuyerReadsOwnOrdersFulfillmentTracking()
        {
            var buyer = Guid.NewGuid();
            var orders = new FakeOrderRepository();
            var order = OrderFor(buyer, (Guid.NewGuid(), 1, 10m));
            orders.Orders.Add(order);
            var fulfillments = new FakeFulfillmentRepository();
            var fulfillment = new FulfillmentOrder(order.Id, Guid.NewGuid());
            fulfillments.Orders.Add(fulfillment);
            var handler = new GetFulfillmentByIdQueryHandler(fulfillments, orders);

            var result = await handler.Handle(new GetFulfillmentByIdQuery(fulfillment.Id, buyer, UserRole.Buyer), CancellationToken.None);

            Assert.True(result.IsSuccess);
        }

        [Fact]
        public async Task SellerReadsOnlyOwnFulfillmentsWhileOperatorReadsAny()
        {
            var vendorA = Guid.NewGuid();
            var vendorB = Guid.NewGuid();
            var fulfillments = new FakeFulfillmentRepository();
            var fulfillment = new FulfillmentOrder(Guid.NewGuid(), vendorA);
            fulfillments.Orders.Add(fulfillment);
            var handler = new GetFulfillmentByIdQueryHandler(fulfillments, new FakeOrderRepository());

            var asOwner = await handler.Handle(new GetFulfillmentByIdQuery(fulfillment.Id, vendorA, UserRole.Seller), CancellationToken.None);
            var asOther = await handler.Handle(new GetFulfillmentByIdQuery(fulfillment.Id, vendorB, UserRole.Seller), CancellationToken.None);
            var asOperator = await handler.Handle(new GetFulfillmentByIdQuery(fulfillment.Id, Guid.NewGuid(), UserRole.LogisticsOperator), CancellationToken.None);

            Assert.True(asOwner.IsSuccess);
            Assert.True(asOther.IsFailure);
            Assert.True(asOperator.IsSuccess);
        }
        private sealed class FakeOwnershipWarehouseRepository : IWarehouseRepository
        {
            public List<Warehouse> Warehouses { get; } = new();

            public Task<Warehouse?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
                => Task.FromResult(Warehouses.FirstOrDefault(w => w.Id == id));

            public Task<IReadOnlyList<Warehouse>> GetAllAsync(Guid? vendorId = null, CancellationToken cancellationToken = default)
                => Task.FromResult<IReadOnlyList<Warehouse>>(
                    vendorId.HasValue
                        ? Warehouses.Where(w => w.VendorId == vendorId.Value).ToList()
                        : Warehouses.ToList());

            public Task AddAsync(Warehouse warehouse, CancellationToken cancellationToken = default)
            {
                Warehouses.Add(warehouse);
                return Task.CompletedTask;
            }

            public Task UpdateAsync(Warehouse warehouse, CancellationToken cancellationToken = default)
                => Task.CompletedTask;
        }

        private sealed class FakeOwnershipInventoryRepository : IInventoryRepository
        {
            public List<Inventory> Inventories { get; } = new();

            public Task<Inventory?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
                => Task.FromResult(Inventories.FirstOrDefault(i => i.Id == id));

            public Task<Inventory?> GetByVariantAndWarehouseAsync(Guid variantId, Guid warehouseId, CancellationToken cancellationToken = default)
                => Task.FromResult(Inventories.FirstOrDefault(i => i.VariantId == variantId && i.WarehouseId == warehouseId));

            public Task<IEnumerable<Inventory>> GetByVariantIdAsync(Guid variantId, CancellationToken cancellationToken = default)
                => Task.FromResult<IEnumerable<Inventory>>(Inventories.Where(i => i.VariantId == variantId).ToList());

            public Task<int> GetTotalAvailableStockAsync(Guid variantId, CancellationToken cancellationToken = default)
                => Task.FromResult(Inventories.Where(i => i.VariantId == variantId).Sum(i => i.AvailableQuantity));

            public Task AddAsync(Inventory inventory, CancellationToken cancellationToken = default)
            {
                Inventories.Add(inventory);
                return Task.CompletedTask;
            }

            public Task UpdateAsync(Inventory inventory, CancellationToken cancellationToken = default)
                => Task.CompletedTask;
        }
        // ---- Bodegas encerradas en el vendedor ----

        [Fact]
        public async Task SellerListsOnlyOwnWarehouses()
        {
            // Q-21b: antes, el Vendedor veia todas las bodegas del sistema y podia
            // filtrar por el vendorId de otro.
            var vendorId = Guid.NewGuid();
            var warehouses = new FakeOwnershipWarehouseRepository();
            warehouses.Warehouses.Add(new Warehouse("Mia", "Bogota", 100, WarehouseType.Vendor, vendorId));
            warehouses.Warehouses.Add(new Warehouse("Ajena", "Medellin", 100, WarehouseType.Vendor, Guid.NewGuid()));
            var handler = new GetWarehousesQueryHandler(warehouses);

            var result = await handler.Handle(
                new GetWarehousesQuery(null, vendorId, UserRole.Seller), CancellationToken.None);

            Assert.True(result.IsSuccess);
            var warehouse = Assert.Single(result.Value);
            Assert.Equal("Mia", warehouse.Name);
        }

        [Fact]
        public async Task SellerAskingForAnotherVendorsWarehouses_IsRejected()
        {
            // Q-21b: pedir el listado de otro vendedor responde 400 en vez de
            // devolver en silencio las propias.
            var warehouses = new FakeOwnershipWarehouseRepository();
            warehouses.Warehouses.Add(new Warehouse("Mia", "Bogota", 100, WarehouseType.Vendor, Guid.NewGuid()));
            var handler = new GetWarehousesQueryHandler(warehouses);

            var result = await handler.Handle(
                new GetWarehousesQuery(Guid.NewGuid(), Guid.NewGuid(), UserRole.Seller), CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.Contains("their own warehouses", result.Error);
        }

        [Fact]
        public async Task OperatorListsAllWarehouses()
        {
            // Q-21b: el Operador trabaja sobre toda la red logistica.
            var warehouses = new FakeOwnershipWarehouseRepository();
            warehouses.Warehouses.Add(new Warehouse("A", "Bogota", 100, WarehouseType.Vendor, Guid.NewGuid()));
            warehouses.Warehouses.Add(new Warehouse("B", "Medellin", 100, WarehouseType.Vendor, Guid.NewGuid()));
            var handler = new GetWarehousesQueryHandler(warehouses);

            var result = await handler.Handle(
                new GetWarehousesQuery(null, Guid.NewGuid(), UserRole.LogisticsOperator), CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.Equal(2, result.Value.Count);
        }

        [Fact]
        public async Task SellerCannotReadAnotherVendorsWarehouseById()
        {
            var warehouses = new FakeOwnershipWarehouseRepository();
            var foreign = new Warehouse("Ajena", "Medellin", 100, WarehouseType.Vendor, Guid.NewGuid());
            warehouses.Warehouses.Add(foreign);
            var handler = new GetWarehouseByIdQueryHandler(warehouses);

            var result = await handler.Handle(
                new GetWarehouseByIdQuery(foreign.Id, Guid.NewGuid(), UserRole.Seller), CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.Equal("Warehouse not found.", result.Error);
        }

        [Fact]
        public async Task SellerReadsOwnWarehouseById()
        {
            var vendorId = Guid.NewGuid();
            var warehouses = new FakeOwnershipWarehouseRepository();
            var own = new Warehouse("Mia", "Bogota", 100, WarehouseType.Vendor, vendorId);
            warehouses.Warehouses.Add(own);
            var handler = new GetWarehouseByIdQueryHandler(warehouses);

            var result = await handler.Handle(
                new GetWarehouseByIdQuery(own.Id, vendorId, UserRole.Seller), CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.Equal("Mia", result.Value.Name);
        }
        // ---- Inventario por dueno de producto ----

        [Fact]
        public async Task SellerSeesStockOfOwnProductInAnyWarehouse()
        {
            // Q-21b: el dueno del stock es el dueno del producto; sus bienes se leen
            // aunque esten en la bodega de otro (hub del Marketplace incluida).
            var vendorId = Guid.NewGuid();
            var variantId = Guid.NewGuid();
            var products = new FakeProductRepository();
            products.ByVariant[variantId] = new Product("P", "D", new Money(1m, "COP"), vendorId, ProductType.Digital, null);
            var inventories = new FakeOwnershipInventoryRepository();
            inventories.Inventories.Add(new Inventory(variantId, Guid.NewGuid(), 10, 0, 0, 0));
            var handler = new GetInventoryByVariantQueryHandler(inventories, products);

            var result = await handler.Handle(
                new GetInventoryByVariantQuery(variantId, vendorId, UserRole.Seller), CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.Single(result.Value);
        }

        [Fact]
        public async Task SellerCannotReadStockOfAnotherSellersProduct()
        {
            var variantId = Guid.NewGuid();
            var products = new FakeProductRepository();
            products.ByVariant[variantId] = new Product("P", "D", new Money(1m, "COP"), Guid.NewGuid(), ProductType.Digital, null);
            var inventories = new FakeOwnershipInventoryRepository();
            inventories.Inventories.Add(new Inventory(variantId, Guid.NewGuid(), 10, 0, 0, 0));
            var handler = new GetInventoryByVariantQueryHandler(inventories, products);

            var result = await handler.Handle(
                new GetInventoryByVariantQuery(variantId, Guid.NewGuid(), UserRole.Seller), CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.Equal("Variant not found.", result.Error);
        }

        [Fact]
        public async Task OperatorReadsStockOfAnyProduct()
        {
            var variantId = Guid.NewGuid();
            var products = new FakeProductRepository();
            products.ByVariant[variantId] = new Product("P", "D", new Money(1m, "COP"), Guid.NewGuid(), ProductType.Digital, null);
            var inventories = new FakeOwnershipInventoryRepository();
            inventories.Inventories.Add(new Inventory(variantId, Guid.NewGuid(), 10, 0, 0, 0));
            var handler = new GetInventoryByVariantQueryHandler(inventories, products);

            var result = await handler.Handle(
                new GetInventoryByVariantQuery(variantId, Guid.NewGuid(), UserRole.LogisticsOperator), CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.Single(result.Value);
        }
    }
}
