using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Xunit;
using Zentric.Application.Common.Ports;
using Zentric.Application.Inventories.Commands;
using Zentric.Domain.Inventories;
using Zentric.Domain.Inventories.Ports;
using Zentric.Domain.Products;
using Zentric.Domain.Products.Enums;
using Zentric.Domain.Products.Ports;
using Zentric.Domain.Products.ValueObjects;
using Zentric.Domain.Users.Enums;
using Zentric.Domain.Warehouses;
using Zentric.Domain.Warehouses.Enum;
using Zentric.Domain.Warehouses.Ports;

namespace Zentric.Tests.Application.Inventories
{
    public class FakeUnitOfWork : IUnitOfWork
    {
        public bool SaveChangesCalled { get; private set; }
        public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            SaveChangesCalled = true;
            return Task.FromResult(1);
        }
    }

    public class FakeInventoryRepository : IInventoryRepository
    {
        public List<Inventory> Inventories { get; } = new();

        public Task AddAsync(Inventory inventory, CancellationToken cancellationToken = default)
        {
            Inventories.Add(inventory);
            return Task.CompletedTask;
        }

        public Task<Inventory?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(Inventories.FirstOrDefault(i => i.Id == id));
        }

        public Task<Inventory?> GetByVariantAndWarehouseAsync(Guid variantId, Guid warehouseId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(Inventories.FirstOrDefault(i => i.VariantId == variantId && i.WarehouseId == warehouseId));
        }

        public Task<IEnumerable<Inventory>> GetByVariantIdAsync(Guid variantId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IEnumerable<Inventory>>(Inventories.Where(i => i.VariantId == variantId).ToList());
        }

        public Task<int> GetTotalAvailableStockAsync(Guid variantId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(Inventories.Where(i => i.VariantId == variantId).Sum(i => i.AvailableQuantity));
        }

        public Task UpdateAsync(Inventory inventory, CancellationToken cancellationToken = default)
        {
            return Task.CompletedTask;
        }
    }

    /// <summary>
    /// Q-21b: el dueño del stock es el dueño del producto, y la bodega donde
    /// entra tiene que ser del vendedor que lo ingresa.
    /// </summary>
    public class FakeStockOwnershipProductRepository : IProductRepository
    {
        public Dictionary<Guid, Product> ByVariant { get; } = new();

        public Task<Product?> GetByVariantIdAsync(Guid variantId, CancellationToken cancellationToken = default)
            => Task.FromResult(ByVariant.TryGetValue(variantId, out var product) ? product : null);

        public Task<Product?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
            => Task.FromResult<Product?>(null);

        public Task<IReadOnlyList<Product>> GetAllAsync(Guid? vendorId = null, CancellationToken cancellationToken = default)
            => Task.FromResult((IReadOnlyList<Product>)Array.Empty<Product>());

        public Task<(IReadOnlyList<Product> Items, int TotalItems)> GetPagedAsync(
            Guid? vendorId, int skip, int take, CancellationToken cancellationToken = default)
            => Task.FromResult(((IReadOnlyList<Product>)Array.Empty<Product>(), 0));

        public Task AddAsync(Product product, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task UpdateAsync(Product product, CancellationToken cancellationToken = default) => Task.CompletedTask;
    }

    public class FakeWarehouseRepository : IWarehouseRepository
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

        public Task UpdateAsync(Warehouse warehouse, CancellationToken cancellationToken = default) => Task.CompletedTask;
    }

    public class AddStockCommandHandlerTests
    {
        [Fact]
        public async Task Handle_NewInventory_CreatesAndAddsStock()
        {
            var repo = new FakeInventoryRepository();
            var uow = new FakeUnitOfWork();
            // Operador: recepcion transversal, sin filtro de dueno (Q-21b).
            var handler = new AddStockCommandHandler(repo, uow, new FakeStockOwnershipProductRepository(), new FakeWarehouseRepository());

            var variantId = Guid.NewGuid();
            var warehouseId = Guid.NewGuid();

            var command = new AddStockCommand(variantId, warehouseId, 50, Guid.NewGuid(), UserRole.LogisticsOperator);

            var result = await handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.Single(repo.Inventories);
            Assert.Equal(50, repo.Inventories[0].AvailableQuantity);
            Assert.True(uow.SaveChangesCalled);
        }

        [Fact]
        public async Task Handle_ExistingInventory_IncrementsStock()
        {
            var repo = new FakeInventoryRepository();
            var uow = new FakeUnitOfWork();
            var handler = new AddStockCommandHandler(repo, uow, new FakeStockOwnershipProductRepository(), new FakeWarehouseRepository());

            var variantId = Guid.NewGuid();
            var warehouseId = Guid.NewGuid();

            var existing = new Inventory(variantId, warehouseId, 20, 0, 0, 0);
            await repo.AddAsync(existing);

            var command = new AddStockCommand(variantId, warehouseId, 30, Guid.NewGuid(), UserRole.LogisticsOperator);

            var result = await handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.Single(repo.Inventories);
            Assert.Equal(50, repo.Inventories[0].AvailableQuantity);
        }

        [Fact]
        public async Task Handle_SellerOwnProductAndWarehouse_CreatesStock()
        {
            // Q-21b: el vendedor ingresa su stock en su bodega.
            var vendorId = Guid.NewGuid();
            var repo = new FakeInventoryRepository();
            var uow = new FakeUnitOfWork();
            var products = new FakeStockOwnershipProductRepository();
            var warehouses = new FakeWarehouseRepository();

            var variantId = Guid.NewGuid();
            products.ByVariant[variantId] = new Product("P", "D", new Money(10m, "COP"), vendorId, ProductType.Digital, null);
            var warehouse = new Warehouse("Central", "Bogota", 100, WarehouseType.Vendor, vendorId);
            warehouses.Warehouses.Add(warehouse);

            var handler = new AddStockCommandHandler(repo, uow, products, warehouses);
            var command = new AddStockCommand(variantId, warehouse.Id, 10, vendorId, UserRole.Seller);

            var result = await handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.Single(repo.Inventories);
        }

        [Fact]
        public async Task Handle_SellerForeignProduct_DoesNotEnterStock()
        {
            // Q-21b: antes, cualquier Seller metia stock del producto de otro.
            var vendorId = Guid.NewGuid();
            var repo = new FakeInventoryRepository();
            var uow = new FakeUnitOfWork();
            var products = new FakeStockOwnershipProductRepository();
            var warehouses = new FakeWarehouseRepository();

            var variantId = Guid.NewGuid();
            products.ByVariant[variantId] = new Product("P", "D", new Money(10m, "COP"), Guid.NewGuid(), ProductType.Digital, null);
            var warehouse = new Warehouse("Central", "Bogota", 100, WarehouseType.Vendor, vendorId);
            warehouses.Warehouses.Add(warehouse);

            var handler = new AddStockCommandHandler(repo, uow, products, warehouses);
            var command = new AddStockCommand(variantId, warehouse.Id, 10, vendorId, UserRole.Seller);

            var result = await handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.Contains("not found", result.Error);
            Assert.Empty(repo.Inventories);
            Assert.False(uow.SaveChangesCalled);
        }

        [Fact]
        public async Task Handle_SellerForeignWarehouse_DoesNotEnterStock()
        {
            // Q-21b: antes, cualquier Seller metia stock en la bodega de otro.
            var vendorId = Guid.NewGuid();
            var repo = new FakeInventoryRepository();
            var uow = new FakeUnitOfWork();
            var products = new FakeStockOwnershipProductRepository();
            var warehouses = new FakeWarehouseRepository();

            var variantId = Guid.NewGuid();
            products.ByVariant[variantId] = new Product("P", "D", new Money(10m, "COP"), vendorId, ProductType.Digital, null);
            var foreignWarehouse = new Warehouse("Ajena", "Medellin", 100, WarehouseType.Vendor, Guid.NewGuid());
            warehouses.Warehouses.Add(foreignWarehouse);

            var handler = new AddStockCommandHandler(repo, uow, products, warehouses);
            var command = new AddStockCommand(variantId, foreignWarehouse.Id, 10, vendorId, UserRole.Seller);

            var result = await handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.Contains("not found", result.Error);
            Assert.Empty(repo.Inventories);
            Assert.False(uow.SaveChangesCalled);
        }
    }
}
