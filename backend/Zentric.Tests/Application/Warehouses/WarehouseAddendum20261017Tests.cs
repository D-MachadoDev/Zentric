using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Moq;
using Xunit;
using Zentric.Application.Catalog.Commands;
using Zentric.Application.Common.Models;
using Zentric.Application.Common.Ports;
using Zentric.Application.Inventories.Commands;
using Zentric.Application.Warehouses.Queries;
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
using Zentric.Infrastructure.Persistence.Mappers;
using Zentric.Infrastructure.Persistence.Models;

namespace Zentric.Tests.Application.Warehouses
{
    public class WarehouseAddendum20261017Tests
    {
        [Fact]
        public async Task GetWarehouses_SellerCaller_ReturnsOwnAndActiveMarketplaceWarehouses()
        {
            var sellerId = Guid.NewGuid();
            var warehouseRepo = new Mock<IWarehouseRepository>();

            var ownWarehouse = new Warehouse("Bodega Vendedor", "Calle 10", 100, WarehouseType.Vendor, sellerId);
            var marketplaceWarehouse = new Warehouse("Centro Zentric Full", "Av Central", 5000, WarehouseType.Marketplace, null);

            warehouseRepo.Setup(r => r.GetForSellerAsync(sellerId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<Warehouse> { ownWarehouse, marketplaceWarehouse });

            var handler = new GetWarehousesQueryHandler(warehouseRepo.Object);
            var query = new GetWarehousesQuery(null, sellerId, UserRole.Seller);

            var result = await handler.Handle(query, CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.Equal(2, result.Value.Count);
            Assert.Contains(result.Value, w => w.Name == "Bodega Vendedor" && w.Type == "Vendor");
            Assert.Contains(result.Value, w => w.Name == "Centro Zentric Full" && w.Type == "Marketplace");
        }

        [Fact]
        public async Task GetWarehouseById_SellerCallerOnMarketplaceWarehouse_ReturnsSuccess()
        {
            var sellerId = Guid.NewGuid();
            var warehouseId = Guid.NewGuid();
            var warehouseRepo = new Mock<IWarehouseRepository>();

            var marketplaceWarehouse = new Warehouse("Centro Zentric Full", "Av Central", 5000, WarehouseType.Marketplace, null);
            typeof(Warehouse).GetProperty("Id")!.SetValue(marketplaceWarehouse, warehouseId);

            warehouseRepo.Setup(r => r.GetByIdAsync(warehouseId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(marketplaceWarehouse);

            var handler = new GetWarehouseByIdQueryHandler(warehouseRepo.Object);
            var query = new GetWarehouseByIdQuery(warehouseId, sellerId, UserRole.Seller);

            var result = await handler.Handle(query, CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.Equal("Centro Zentric Full", result.Value.Name);
            Assert.Equal("Marketplace", result.Value.Type);
        }

        [Fact]
        public async Task AddStock_SellerCallerInMarketplaceWarehouse_Succeeds()
        {
            var sellerId = Guid.NewGuid();
            var variantId = Guid.NewGuid();
            var warehouseId = Guid.NewGuid();

            var invRepo = new Mock<IInventoryRepository>();
            var uow = new Mock<IUnitOfWork>();
            var prodRepo = new Mock<IProductRepository>();
            var warehouseRepo = new Mock<IWarehouseRepository>();

            var product = new Product("Laptop Pro", "Desc", new Money(1200000m, "COP"), sellerId, ProductType.Physical,
                new (string Sku, IEnumerable<VariantAttribute> Attributes)[] { ("SKU-LAP", new List<VariantAttribute> { new("Color", "Gris") }) });
            var variant = product.Variants.First();

            prodRepo.Setup(r => r.GetByVariantIdAsync(variant.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(product);

            var marketplaceWarehouse = new Warehouse("Centro Zentric Full", "Av Central", 5000, WarehouseType.Marketplace, null);
            typeof(Warehouse).GetProperty("Id")!.SetValue(marketplaceWarehouse, warehouseId);

            warehouseRepo.Setup(r => r.GetByIdAsync(warehouseId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(marketplaceWarehouse);

            invRepo.Setup(r => r.GetByVariantAndWarehouseAsync(variant.Id, warehouseId, It.IsAny<CancellationToken>()))
                .ReturnsAsync((Inventory?)null);

            var handler = new AddStockCommandHandler(invRepo.Object, uow.Object, prodRepo.Object, warehouseRepo.Object);
            var cmd = new AddStockCommand(variant.Id, warehouseId, 25, sellerId, UserRole.Seller);

            var result = await handler.Handle(cmd, CancellationToken.None);

            Assert.True(result.IsSuccess);
            invRepo.Verify(r => r.AddAsync(It.Is<Inventory>(i => i.AvailableQuantity == 25), It.IsAny<CancellationToken>()), Times.Once);
            uow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task CreateProduct_WithImageUrl_PersistsImageUrl()
        {
            var prodRepo = new Mock<IProductRepository>();
            var uow = new Mock<IUnitOfWork>();
            Product? savedProduct = null;

            prodRepo.Setup(r => r.AddAsync(It.IsAny<Product>(), It.IsAny<CancellationToken>()))
                .Callback<Product, CancellationToken>((p, _) => savedProduct = p)
                .Returns(Task.CompletedTask);

            var handler = new CreateProductCommandHandler(prodRepo.Object, uow.Object);
            var cmd = new CreateProductCommand(
                "Smartphone X",
                "Flagship Phone",
                899000m,
                "COP",
                Guid.NewGuid(),
                ProductType.Physical,
                new List<CreateProductVariantDto>
                {
                    new("SKU-PHN-01", new List<VariantAttributeDto> { new("Color", "Black") })
                },
                "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9"
            );

            var result = await handler.Handle(cmd, CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.NotNull(savedProduct);
            Assert.Equal("https://images.unsplash.com/photo-1511707171634-5f897ff02aa9", savedProduct.ImageUrl);
        }

        [Fact]
        public void ProductMapper_MapsImageUrlBidirectionally()
        {
            var domain = new Product(
                "Cámara Reflex",
                "Cámara pro",
                new Money(750000m, "COP"),
                Guid.NewGuid(),
                ProductType.Physical,
                new (string Sku, IEnumerable<VariantAttribute> Attributes)[] { ("SKU-CAM-01", new List<VariantAttribute> { new("Color", "Negro") }) },
                "https://images.unsplash.com/photo-1516035069371-29a1b244cc32"
            );

            var dbModel = ProductMapper.ToDbModel(domain);
            Assert.Equal("https://images.unsplash.com/photo-1516035069371-29a1b244cc32", dbModel.ImageUrl);

            var backToDomain = ProductMapper.ToDomain(dbModel);
            Assert.Equal("https://images.unsplash.com/photo-1516035069371-29a1b244cc32", backToDomain.ImageUrl);
        }
    }
}
