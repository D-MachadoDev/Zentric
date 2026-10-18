using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;
using Zentric.Api.Bootstrap;
using Zentric.Api.Controllers;
using Zentric.Api.Security;
using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Application.Common.Ports;
using Zentric.Application.Orders.Queries;
using Zentric.Application.Users.Commands;
using Zentric.Application.Users.Queries;
using Zentric.Application.Users.Validators;
using Zentric.Domain.Buyers;
using Zentric.Domain.Buyers.Ports;
using Zentric.Domain.Buyers.ValueObjects;
using Zentric.Domain.Inventories;
using Zentric.Domain.Inventories.Ports;
using Zentric.Domain.Orders;
using Zentric.Domain.Orders.Enums;
using Zentric.Domain.Orders.Ports;
using Zentric.Domain.Products;
using Zentric.Domain.Products.Enums;
using Zentric.Domain.Products.Ports;
using Zentric.Domain.Products.ValueObjects;
using Zentric.Domain.Users;
using Zentric.Domain.Users.Enums;
using Zentric.Domain.Users.Ports;
using Zentric.Domain.Users.ValueObjects;
using Zentric.Domain.Warehouses;
using Zentric.Domain.Warehouses.Enum;
using Zentric.Domain.Warehouses.Ports;
using Zentric.Infrastructure.Persistence;
using Zentric.Infrastructure.Persistence.Mappers;
using Zentric.Infrastructure.Persistence.Repositories;

namespace Zentric.Tests.Security
{
    public class BackendAdversarialChallengerTests
    {
        // ====================================================================
        // CHALLENGE 1: CATALOG SEEDING IDEMPOTENCY & INTEGRITY
        // ====================================================================

        [Fact]
        public void Product_Category_Reflection_CanSetProperty_OrThrows()
        {
            // Verify what happens when CatalogSeeder executes reflection on Category
            var vendorId = Guid.NewGuid();
            var product = new Product(
                "Test Product",
                "Description",
                new Money(1000m, "COP"),
                vendorId,
                ProductType.Physical,
                new (string Sku, IEnumerable<VariantAttribute> Attributes)[] { ("SKU-1", new[] { new VariantAttribute("A", "B") }) },
                "https://test.com/img.jpg"
            );

            var categoryProp = typeof(Product).GetProperty("Category");
            Assert.NotNull(categoryProp);

            // Reflection SetValue test: does it succeed or fail when setter is private?
            // In .NET 10, PropertyInfo.SetValue on private setter:
            var exception = Record.Exception(() =>
            {
                categoryProp.SetValue(product, "computacion");
            });

            // If this throws, CatalogSeeder.Seed will fail at runtime!
            Assert.Null(exception);
            Assert.Equal("computacion", product.Category);
        }

        [Fact]
        public async Task CatalogSeeder_IsStrictlyIdempotent_AcrossMultipleExecutions()
        {
            // Set up in-memory DbContext
            var options = new DbContextOptionsBuilder<ZentricDbContext>()
                .UseInMemoryDatabase(databaseName: $"Zentric_Seeder_Idempotency_{Guid.NewGuid()}")
                .Options;

            using var dbContext = new ZentricDbContext(options);

            var userRepo = new UserRepository(dbContext);
            var warehouseRepo = new WarehouseRepository(dbContext);
            var productRepo = new ProductRepository(dbContext);
            var inventoryRepo = new InventoryRepository(dbContext);
            var buyerRepo = new BuyerRepository(dbContext);
            var dispatcherMock = new Mock<IDomainEventDispatcher>();
            var uow = new UnitOfWork(dbContext, dispatcherMock.Object);

            var serviceCollection = new ServiceCollection();
            serviceCollection.AddSingleton<IUserRepository>(userRepo);
            serviceCollection.AddSingleton<IWarehouseRepository>(warehouseRepo);
            serviceCollection.AddSingleton<IProductRepository>(productRepo);
            serviceCollection.AddSingleton<IInventoryRepository>(inventoryRepo);
            serviceCollection.AddSingleton<IBuyerRepository>(buyerRepo);
            serviceCollection.AddSingleton<IUnitOfWork>(uow);

            var serviceProvider = serviceCollection.BuildServiceProvider();

            // First: seed Valeria and Andrés users
            var valeria = new User(
                "DOC-SELLER-001",
                new FullName("Valeria", "Mendoza"),
                new Email("seller@zentric.local"),
                "hashed_secret",
                UserRole.Seller)
            {
                Id = AdministratorBootstrapper.CanonicalSellerId
            };
            await userRepo.AddAsync(valeria);

            var andres = new User(
                "DOC-BUYER-001",
                new FullName("Andrés", "Castillo"),
                new Email("buyer@zentric.local"),
                "hashed_secret",
                UserRole.Buyer);
            await userRepo.AddAsync(andres);
            await uow.SaveChangesAsync();

            // EXECUTION 1
            CatalogSeeder.Seed(serviceProvider, NullLogger.Instance);

            var productsRun1 = await productRepo.GetAllAsync(vendorId: AdministratorBootstrapper.CanonicalSellerId);
            var warehousesRun1 = await warehouseRepo.GetAllAsync();
            var inventoriesRun1 = await dbContext.Inventories.ToListAsync();
            var buyersRun1 = await dbContext.Buyers.ToListAsync();

            Assert.Equal(14, productsRun1.Count);
            Assert.Equal(2, warehousesRun1.Count);
            Assert.Single(buyersRun1);
            Assert.True(inventoriesRun1.Count > 0);

            // EXECUTION 2 (Stress idempotency)
            CatalogSeeder.Seed(serviceProvider, NullLogger.Instance);

            var productsRun2 = await productRepo.GetAllAsync(vendorId: AdministratorBootstrapper.CanonicalSellerId);
            var warehousesRun2 = await warehouseRepo.GetAllAsync();
            var inventoriesRun2 = await dbContext.Inventories.ToListAsync();
            var buyersRun2 = await dbContext.Buyers.ToListAsync();

            Assert.Equal(productsRun1.Count, productsRun2.Count);
            Assert.Equal(warehousesRun1.Count, warehousesRun2.Count);
            Assert.Equal(inventoriesRun1.Count, inventoriesRun2.Count);
            Assert.Equal(buyersRun1.Count, buyersRun2.Count);

            // EXECUTION 3 (Triple execution stress)
            CatalogSeeder.Seed(serviceProvider, NullLogger.Instance);

            var productsRun3 = await productRepo.GetAllAsync(vendorId: AdministratorBootstrapper.CanonicalSellerId);
            var warehousesRun3 = await warehouseRepo.GetAllAsync();
            var inventoriesRun3 = await dbContext.Inventories.ToListAsync();

            Assert.Equal(14, productsRun3.Count);
            Assert.Equal(2, warehousesRun3.Count);
            Assert.Equal(inventoriesRun1.Count, inventoriesRun3.Count);
        }

        [Fact]
        public async Task CatalogSeeder_AllProducts_AreLinkedToCanonicalSellerId_AndPhysicalHaveStock()
        {
            var options = new DbContextOptionsBuilder<ZentricDbContext>()
                .UseInMemoryDatabase(databaseName: $"Zentric_Seeder_Integrity_{Guid.NewGuid()}")
                .Options;

            using var dbContext = new ZentricDbContext(options);

            var userRepo = new UserRepository(dbContext);
            var warehouseRepo = new WarehouseRepository(dbContext);
            var productRepo = new ProductRepository(dbContext);
            var inventoryRepo = new InventoryRepository(dbContext);
            var buyerRepo = new BuyerRepository(dbContext);
            var dispatcherMock = new Mock<IDomainEventDispatcher>();
            var uow = new UnitOfWork(dbContext, dispatcherMock.Object);

            var serviceCollection = new ServiceCollection();
            serviceCollection.AddSingleton<IUserRepository>(userRepo);
            serviceCollection.AddSingleton<IWarehouseRepository>(warehouseRepo);
            serviceCollection.AddSingleton<IProductRepository>(productRepo);
            serviceCollection.AddSingleton<IInventoryRepository>(inventoryRepo);
            serviceCollection.AddSingleton<IBuyerRepository>(buyerRepo);
            serviceCollection.AddSingleton<IUnitOfWork>(uow);

            var serviceProvider = serviceCollection.BuildServiceProvider();

            var valeria = new User(
                "DOC-SELLER-001",
                new FullName("Valeria", "Mendoza"),
                new Email("seller@zentric.local"),
                "hashed_secret",
                UserRole.Seller)
            {
                Id = AdministratorBootstrapper.CanonicalSellerId
            };
            await userRepo.AddAsync(valeria);
            await uow.SaveChangesAsync();

            CatalogSeeder.Seed(serviceProvider, NullLogger.Instance);

            var products = await productRepo.GetAllAsync(vendorId: AdministratorBootstrapper.CanonicalSellerId);
            Assert.Equal(14, products.Count);

            // Verify all products belong to Valeria
            Assert.All(products, p => Assert.Equal(AdministratorBootstrapper.CanonicalSellerId, p.VendorId));

            // Verify physical products have inventory
            var valeriaWarehouse = (await warehouseRepo.GetAllAsync()).First(w => w.VendorId == AdministratorBootstrapper.CanonicalSellerId);
            var inventories = await dbContext.Inventories.ToListAsync();

            foreach (var p in products.Where(p => p.Type == ProductType.Physical))
            {
                Assert.NotEmpty(p.Variants);
                foreach (var variant in p.Variants)
                {
                    var inv = inventories.FirstOrDefault(i => i.VariantId == variant.Id && i.WarehouseId == valeriaWarehouse.Id);
                    Assert.NotNull(inv);
                    Assert.True(inv.AvailableQuantity > 0, $"Variant {variant.Sku} of {p.Name} must have positive inventory.");
                }
            }
        }

        // ====================================================================
        // CHALLENGE 2: CATEGORY FILTERING ADVERSARIAL EDGE CASES
        // ====================================================================

        [Theory]
        [InlineData("all", 5)]
        [InlineData("ALL", 5)]
        [InlineData("All", 5)]
        [InlineData("", 5)]
        [InlineData("   ", 5)]
        [InlineData(null, 5)]
        [InlineData("computacion", 2)]
        [InlineData("COMPUTACION", 2)]
        [InlineData("CoMpUtAcIoN", 2)]
        [InlineData("audio", 1)]
        [InlineData("perifericos", 1)]
        [InlineData("non-existent-category", 0)]
        [InlineData("' OR 1=1 --", 0)]
        [InlineData("'; DROP TABLE Products; --", 0)]
        [InlineData("<script>alert(1)</script>", 0)]
        public async Task ProductRepository_CategoryFiltering_HandlesAdversarialInputsSafely(
            string? categoryQuery, int expectedCount)
        {
            var options = new DbContextOptionsBuilder<ZentricDbContext>()
                .UseInMemoryDatabase(databaseName: $"Zentric_Category_Filtering_{Guid.NewGuid()}")
                .Options;

            using var dbContext = new ZentricDbContext(options);
            var vendorId = Guid.NewGuid();

            // Seed products
            var p1 = new Product("Laptop 1", "Desc", new Money(100m, "COP"), vendorId, ProductType.Physical,
                new[] { ("SKU-1", (IEnumerable<VariantAttribute>)new[] { new VariantAttribute("A", "B") }) }, category: "computacion");
            var p2 = new Product("Laptop 2", "Desc", new Money(200m, "COP"), vendorId, ProductType.Physical,
                new[] { ("SKU-2", (IEnumerable<VariantAttribute>)new[] { new VariantAttribute("A", "B") }) }, category: "computacion");
            var p3 = new Product("Auricular 1", "Desc", new Money(50m, "COP"), vendorId, ProductType.Physical,
                new[] { ("SKU-3", (IEnumerable<VariantAttribute>)new[] { new VariantAttribute("A", "B") }) }, category: "audio");
            var p4 = new Product("Mouse 1", "Desc", new Money(30m, "COP"), vendorId, ProductType.Physical,
                new[] { ("SKU-4", (IEnumerable<VariantAttribute>)new[] { new VariantAttribute("A", "B") }) }, category: "perifericos");
            var p5 = new Product("Sin Categoria", "Desc", new Money(10m, "COP"), vendorId, ProductType.Digital, category: null);

            var repo = new ProductRepository(dbContext);
            await repo.AddAsync(p1);
            await repo.AddAsync(p2);
            await repo.AddAsync(p3);
            await repo.AddAsync(p4);
            await repo.AddAsync(p5);
            await dbContext.SaveChangesAsync();

            // Test GetAllAsync
            var result = await repo.GetAllAsync(vendorId: null, status: null, category: categoryQuery);
            Assert.Equal(expectedCount, result.Count);

            // Test GetPagedAsync
            var pagedResult = await repo.GetPagedAsync(vendorId: null, status: null, skip: 0, take: 50, category: categoryQuery);
            Assert.Equal(expectedCount, pagedResult.TotalItems);
            Assert.Equal(expectedCount, pagedResult.Items.Count);
        }

        // ====================================================================
        // CHALLENGE 3: EXPIRATION TIMESTAMP CALCULATIONS & TIMEZONE DRIFT
        // ====================================================================

        [Fact]
        public void OrderExpiration_AccuratelyAdds15Minutes_AndPreservesUtcKind()
        {
            var buyerId = Guid.NewGuid();
            var order = new CustomerOrder(buyerId);

            // CreatedAt is in UTC
            Assert.Equal(DateTimeKind.Utc, order.CreatedAt.Kind);

            // Calculate expiration
            var expiresAt = order.CreatedAt.AddMinutes(15);

            Assert.Equal(DateTimeKind.Utc, expiresAt.Kind);
            Assert.Equal(15, (expiresAt - order.CreatedAt).TotalMinutes);
            Assert.Equal(900, (expiresAt - order.CreatedAt).TotalSeconds);
        }

        [Fact]
        public void OrderExpiration_BoundaryEdgeCases_LeapYearAndYearTurnover()
        {
            // Leap year boundary: Feb 28 to Feb 29
            var leapDate = new DateTime(2028, 2, 29, 23, 50, 0, DateTimeKind.Utc);
            var leapExpires = leapDate.AddMinutes(15);
            Assert.Equal(new DateTime(2028, 3, 1, 0, 5, 0, DateTimeKind.Utc), leapExpires);

            // Year turnover: Dec 31 to Jan 1
            var newYearDate = new DateTime(2026, 12, 31, 23, 55, 0, DateTimeKind.Utc);
            var newYearExpires = newYearDate.AddMinutes(15);
            Assert.Equal(new DateTime(2027, 1, 1, 0, 10, 0, DateTimeKind.Utc), newYearExpires);
        }

        // ====================================================================
        // CHALLENGE 4: BUYER PROFILE SECURITY INVARIANTS
        // ====================================================================

        [Fact]
        public async Task UsersController_UpdateProfile_Unauthenticated_ReturnsUnauthorized()
        {
            var mediatorMock = new Mock<IMediator>();
            var currentUserMock = new Mock<ICurrentUserAccessor>();
            currentUserMock.Setup(c => c.UserId).Returns((Guid?)null);

            var controller = new UsersController(mediatorMock.Object, currentUserMock.Object);

            var request = new UpdateUserProfileRequest("Hacker Name", "+573001234567", null);
            var response = await controller.UpdateProfile(request);

            var unauthResult = Assert.IsType<UnauthorizedObjectResult>(response);
            Assert.IsType<ProblemDetails>(unauthResult.Value);
            mediatorMock.Verify(m => m.Send(It.IsAny<UpdateUserProfileCommand>(), It.IsAny<CancellationToken>()), Times.Never);
        }

        [Fact]
        public async Task UsersController_UpdateProfile_GuaranteesCommandUserIdMatchesCallerClaims()
        {
            var authenticatedUserId = Guid.NewGuid();
            var mediatorMock = new Mock<IMediator>();
            var currentUserMock = new Mock<ICurrentUserAccessor>();
            currentUserMock.Setup(c => c.UserId).Returns(authenticatedUserId);

            mediatorMock.Setup(m => m.Send(It.IsAny<UpdateUserProfileCommand>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(Result<UserProfileDto>.Success(new UserProfileDto(
                    authenticatedUserId, "user@zentric.local", "Valid Name", "DOC-001", "Buyer", null, null)));

            var controller = new UsersController(mediatorMock.Object, currentUserMock.Object);

            var request = new UpdateUserProfileRequest("Valid Name", "+573001234567", null);
            var response = await controller.UpdateProfile(request);

            Assert.IsType<OkObjectResult>(response);

            // Verify that command received the exact authenticated user ID, impossible to spoof
            mediatorMock.Verify(m => m.Send(It.Is<UpdateUserProfileCommand>(c => c.UserId == authenticatedUserId), It.IsAny<CancellationToken>()), Times.Once);
        }

        [Theory]
        [InlineData("", false)]
        [InlineData("   ", false)]
        [InlineData("Andres", false)] // Only single word
        [InlineData("Andrés Castillo", true)] // Valid first and last name
        [InlineData("Valeria Mendoza Silva", true)] // Multiple words
        [InlineData("  Juan Perez  ", true)] // Trimmed multiple words
        public void UpdateUserProfileCommandValidator_ValidatesFullNameStrictly(string name, bool expectedValid)
        {
            var validator = new UpdateUserProfileCommandValidator();
            var command = new UpdateUserProfileCommand(Guid.NewGuid(), name, null, null);

            var result = validator.Validate(command);
            Assert.Equal(expectedValid, result.IsValid);
        }

        [Fact]
        public void Buyer_Phone_TrimmingAndNullHandling()
        {
            var userId = Guid.NewGuid();
            var address = new Address("Calle 10", "Medellin", "Antioquia", "050001", "Colombia");

            // Empty phone should be normalized to null
            var buyer1 = new Buyer(userId, address, "   ");
            Assert.Null(buyer1.Phone);

            // Non-empty phone should be trimmed
            var buyer2 = new Buyer(userId, address, "  +57 300 123 4567  ");
            Assert.Equal("+57 300 123 4567", buyer2.Phone);

            // UpdatePhone with whitespace normalizes to null
            buyer2.UpdatePhone("   ");
            Assert.Null(buyer2.Phone);
        }
    }
}
