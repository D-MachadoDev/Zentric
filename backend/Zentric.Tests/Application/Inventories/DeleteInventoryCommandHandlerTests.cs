using System;
using System.Threading;
using System.Threading.Tasks;
using Xunit;
using Zentric.Application.Inventories.Commands;
using Zentric.Domain.Inventories;
using Zentric.Domain.Products;
using Zentric.Domain.Products.Enums;
using Zentric.Domain.Products.ValueObjects;
using Zentric.Domain.Users.Enums;
using Zentric.Domain.Warehouses;
using Zentric.Domain.Warehouses.Enum;

namespace Zentric.Tests.Application.Inventories
{
    /// <summary>
    /// Borrado logico del inventario. La regla de negocio tiene dos capas:
    /// el dominio no deja borrar una fila con existencias y la autorizacion
    /// decide quien puede tocar que bodega.
    /// </summary>
    public class DeleteInventoryCommandHandlerTests
    {
        private static (FakeInventoryRepository Repo, FakeUnitOfWork Uow, FakeStockOwnershipProductRepository Products, FakeWarehouseRepository Warehouses, Inventory Inventory)
            Build(Guid vendorId, Guid warehouseId, int available = 0, int reserved = 0, int damaged = 0, int used = 0)
        {
            var repo = new FakeInventoryRepository();
            var uow = new FakeUnitOfWork();
            var products = new FakeStockOwnershipProductRepository();
            var warehouses = new FakeWarehouseRepository();

            var variantId = Guid.NewGuid();
            products.ByVariant[variantId] = new Product(
                "P", "D", new Money(10m, "COP"), vendorId, ProductType.Physical,
                new System.Collections.Generic.List<(string, System.Collections.Generic.IEnumerable<VariantAttribute>)>
                {
                    ("SKU-1", new System.Collections.Generic.List<VariantAttribute> { new VariantAttribute("Color", "Rojo") }),
                });

            var inventory = new Inventory(variantId, warehouseId, available, reserved, damaged, used);
            repo.Inventories.Add(inventory);

            return (repo, uow, products, warehouses, inventory);
        }

        [Fact]
        public async Task Handle_SellerDeletesOwnZeroStockInventory_MarksDeletedAndSaves()
        {
            var vendorId = Guid.NewGuid();
            var warehouse = new Warehouse("Propia", "Bogota", 100, WarehouseType.Vendor, vendorId);
            var (repo, uow, products, warehouses, inventory) = Build(vendorId, warehouse.Id);
            warehouses.Warehouses.Add(warehouse);

            var handler = new DeleteInventoryCommandHandler(repo, uow, products, warehouses);
            var result = await handler.Handle(
                new DeleteInventoryCommand(inventory.Id, vendorId, UserRole.Seller), CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.True(inventory.IsDeleted);
            Assert.True(uow.SaveChangesCalled);
        }

        [Fact]
        public async Task Handle_AdministratorDeletesZentricWarehouseInventory_IsAllowed()
        {
            // Decision del usuario: el admin administra la bodega de Zentric.
            var zentricWarehouse = new Warehouse("Central Zentric", "Bogota", 100, WarehouseType.Marketplace, null);
            var (repo, uow, products, warehouses, inventory) = Build(Guid.NewGuid(), zentricWarehouse.Id);
            warehouses.Warehouses.Add(zentricWarehouse);

            var handler = new DeleteInventoryCommandHandler(repo, uow, products, warehouses);
            var result = await handler.Handle(
                new DeleteInventoryCommand(inventory.Id, Guid.NewGuid(), UserRole.Administrator), CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.True(inventory.IsDeleted);
        }

        [Fact]
        public async Task Handle_AdministratorDeletesVendorWarehouseInventory_IsRejected()
        {
            // La bodega del vendedor es del vendedor: poder leerla no da la llave.
            var vendorId = Guid.NewGuid();
            var vendorWarehouse = new Warehouse("Propia", "Medellin", 100, WarehouseType.Vendor, vendorId);
            var (repo, uow, products, warehouses, inventory) = Build(vendorId, vendorWarehouse.Id);
            warehouses.Warehouses.Add(vendorWarehouse);

            var handler = new DeleteInventoryCommandHandler(repo, uow, products, warehouses);
            var result = await handler.Handle(
                new DeleteInventoryCommand(inventory.Id, Guid.NewGuid(), UserRole.Administrator), CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.False(inventory.IsDeleted);
            Assert.False(uow.SaveChangesCalled);
        }

        [Fact]
        public async Task Handle_InventoryWithPhysicalStock_IsRejectedWithActionableMessage()
        {
            var vendorId = Guid.NewGuid();
            var warehouse = new Warehouse("Propia", "Cali", 100, WarehouseType.Vendor, vendorId);
            var (repo, uow, products, warehouses, inventory) = Build(vendorId, warehouse.Id, available: 3);
            warehouses.Warehouses.Add(warehouse);

            var handler = new DeleteInventoryCommandHandler(repo, uow, products, warehouses);
            var result = await handler.Handle(
                new DeleteInventoryCommand(inventory.Id, vendorId, UserRole.Seller), CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.Contains("existencias f", result.Error);
            Assert.False(inventory.IsDeleted);
        }

        [Fact]
        public async Task Handle_SellerDeletesForeignProduct_ReturnsNotFound()
        {
            var vendorId = Guid.NewGuid();
            var warehouse = new Warehouse("Propia", "Bogota", 100, WarehouseType.Vendor, vendorId);
            var (repo, uow, products, warehouses, inventory) = Build(Guid.NewGuid(), warehouse.Id);
            warehouses.Warehouses.Add(warehouse);

            var handler = new DeleteInventoryCommandHandler(repo, uow, products, warehouses);
            var result = await handler.Handle(
                new DeleteInventoryCommand(inventory.Id, vendorId, UserRole.Seller), CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.False(inventory.IsDeleted);
        }
    }
}
