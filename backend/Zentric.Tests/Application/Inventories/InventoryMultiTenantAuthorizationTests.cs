using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http.Json;
using System.Threading;
using System.Threading.Tasks;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using Xunit;
using Zentric.Application.Common.Models;
using Zentric.Application.Common.Ports;
using Zentric.Application.Inventories.Commands;
using Zentric.Application.Inventories.Queries;
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
using Zentric.Tests.E2E;

namespace Zentric.Tests.Application.Inventories
{
    /// <summary>
    /// Pruebas integrales de autorizacion y aislamiento multinquilino server-side para inventario.
    /// Cubre:
    /// 1. Denegacion de usuarios anonimos (HTTP 401 Unauthorized en todos los endpoints).
    /// 2. Denegacion de roles no autorizados como Buyer o Supervisor (HTTP 403 Forbidden).
    /// 3. Aislamiento server-side de vendedor cruzado:
    ///    - Anti-enumeracion por GUID: respuestas 404 identicas al recurso inexistente (ADR-0013).
    ///    - Filtro estricto en la consulta de listado paginado por dueno del producto (ADR-0017).
    /// </summary>
    public sealed class InventoryMultiTenantAuthorizationTests : IClassFixture<ZentricApiFactory>
    {
        private readonly ZentricApiFactory _factory;

        public InventoryMultiTenantAuthorizationTests(ZentricApiFactory factory)
        {
            _factory = factory;
        }

        private HttpClient CreateClientWithRole(UserRole role, Guid? userId = null)
        {
            var client = _factory.CreateClient();
            var uid = userId ?? Guid.NewGuid();
            var claims = new List<Claim>
            {
                new(JwtRegisteredClaimNames.Sub, uid.ToString()),
                new(JwtRegisteredClaimNames.Email, $"test-{role.ToString().ToLowerInvariant()}@zentric-test.com"),
                new(JwtRegisteredClaimNames.Name, $"Test {role}"),
                new(ClaimTypes.Role, role.ToString()),
                new(ClaimTypes.NameIdentifier, uid.ToString())
            };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes("zentric-e2e-firma-solo-para-pruebas-automaticas-cambiar-0001"));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var jwt = new JwtSecurityToken(
                issuer: "zentric-e2e",
                audience: "zentric-e2e-client",
                claims: claims,
                notBefore: DateTime.UtcNow.AddMinutes(-5),
                expires: DateTime.UtcNow.AddMinutes(60),
                signingCredentials: credentials);

            var tokenString = new JwtSecurityTokenHandler().WriteToken(jwt);
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", tokenString);
            return client;
        }

        // =========================================================================
        // 1. RECHAZO A USUARIOS ANONIMOS (HTTP 401 UNAUTHORIZED)
        // =========================================================================

        [Fact]
        public async Task GetInventories_AnonymousUser_ReturnsUnauthorized401()
        {
            using var client = _factory.CreateClient();
            var response = await client.GetAsync("/api/Inventories");
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task GetInventoryByVariant_AnonymousUser_ReturnsUnauthorized401()
        {
            using var client = _factory.CreateClient();
            var response = await client.GetAsync($"/api/Inventories/{Guid.NewGuid()}");
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task AddStock_AnonymousUser_ReturnsUnauthorized401()
        {
            using var client = _factory.CreateClient();
            var response = await client.PostAsJsonAsync("/api/Inventories/stock", new
            {
                variantId = Guid.NewGuid(),
                warehouseId = Guid.NewGuid(),
                quantity = 10
            });
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task DeleteInventory_AnonymousUser_ReturnsUnauthorized401()
        {
            using var client = _factory.CreateClient();
            var response = await client.DeleteAsync($"/api/Inventories/{Guid.NewGuid()}");
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task AdjustInventory_AnonymousUser_ReturnsUnauthorized401()
        {
            using var client = _factory.CreateClient();
            var response = await client.PostAsJsonAsync($"/api/Inventories/{Guid.NewGuid()}/adjust", new
            {
                countedQuantity = 5,
                reason = "Auditoria fisica"
            });
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        // =========================================================================
        // 2. RECHAZO A ROLES NO AUTORIZADOS (HTTP 403 FORBIDDEN)
        // =========================================================================

        [Fact]
        public async Task GetInventories_BuyerRole_ReturnsForbidden403()
        {
            using var client = CreateClientWithRole(UserRole.Buyer);
            var response = await client.GetAsync("/api/Inventories");
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task GetInventoryByVariant_BuyerRole_ReturnsForbidden403()
        {
            using var client = CreateClientWithRole(UserRole.Buyer);
            var response = await client.GetAsync($"/api/Inventories/{Guid.NewGuid()}");
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task AddStock_BuyerRole_ReturnsForbidden403()
        {
            using var client = CreateClientWithRole(UserRole.Buyer);
            var response = await client.PostAsJsonAsync("/api/Inventories/stock", new
            {
                variantId = Guid.NewGuid(),
                warehouseId = Guid.NewGuid(),
                quantity = 10
            });
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task DeleteInventory_BuyerRole_ReturnsForbidden403()
        {
            using var client = CreateClientWithRole(UserRole.Buyer);
            var response = await client.DeleteAsync($"/api/Inventories/{Guid.NewGuid()}");
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task AdjustInventory_BuyerRole_ReturnsForbidden403()
        {
            using var client = CreateClientWithRole(UserRole.Buyer);
            var response = await client.PostAsJsonAsync($"/api/Inventories/{Guid.NewGuid()}/adjust", new
            {
                countedQuantity = 5,
                reason = "Intento no autorizado"
            });
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task AddStock_SupervisorRole_ReturnsForbidden403()
        {
            using var client = CreateClientWithRole(UserRole.Supervisor);
            var response = await client.PostAsJsonAsync("/api/Inventories/stock", new
            {
                variantId = Guid.NewGuid(),
                warehouseId = Guid.NewGuid(),
                quantity = 10
            });
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task DeleteInventory_SupervisorRole_ReturnsForbidden403()
        {
            using var client = CreateClientWithRole(UserRole.Supervisor);
            var response = await client.DeleteAsync($"/api/Inventories/{Guid.NewGuid()}");
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task AdjustInventory_SellerRole_ReturnsForbidden403()
        {
            using var client = CreateClientWithRole(UserRole.Seller);
            var response = await client.PostAsJsonAsync($"/api/Inventories/{Guid.NewGuid()}/adjust", new
            {
                countedQuantity = 5,
                reason = "Ajuste no permitido a vendedores"
            });
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        // =========================================================================
        // 3. AISLAMIENTO MULTINQUILINO SERVER-SIDE (CQRS & REPOSITORIOS)
        // =========================================================================

        [Fact]
        public async Task GetInventories_WhenCallerIsSeller_FiltersByCallerVendorId()
        {
            var sellerAId = Guid.NewGuid();
            var sellerBId = Guid.NewGuid();
            var warehouseId = Guid.NewGuid();

            var invA = new Inventory(Guid.NewGuid(), warehouseId, 10, 0, 0, 0);
            var invB = new Inventory(Guid.NewGuid(), warehouseId, 20, 0, 0, 0);

            var repository = new MultiTenantTestInventoryRepository();
            repository.SeedRow(invA, sellerAId, "Producto Vendedor A", "SKU-A");
            repository.SeedRow(invB, sellerBId, "Producto Vendedor B", "SKU-B");

            var handler = new GetInventoriesQueryHandler(repository);

            var query = new GetInventoriesQuery(
                CallerId: sellerAId,
                CallerRole: UserRole.Seller,
                Page: 0,
                Size: 10);

            var result = await handler.Handle(query, CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.Equal(1, result.Value.TotalItems);
            var item = Assert.Single(result.Value.Items);
            Assert.Equal(invA.Id, item.Id);
            Assert.Equal("Producto Vendedor A", item.ProductName);
            Assert.Equal(sellerAId, repository.LastQueriedVendorId);
        }

        [Fact]
        public async Task GetInventories_WhenCallerIsLogisticsOperatorOrAdmin_DoesNotFilterByVendorId()
        {
            var sellerAId = Guid.NewGuid();
            var sellerBId = Guid.NewGuid();
            var warehouseId = Guid.NewGuid();

            var invA = new Inventory(Guid.NewGuid(), warehouseId, 10, 0, 0, 0);
            var invB = new Inventory(Guid.NewGuid(), warehouseId, 20, 0, 0, 0);

            var repository = new MultiTenantTestInventoryRepository();
            repository.SeedRow(invA, sellerAId, "Producto Vendedor A", "SKU-A");
            repository.SeedRow(invB, sellerBId, "Producto Vendedor B", "SKU-B");

            var handler = new GetInventoriesQueryHandler(repository);

            // Operador logistico
            var operatorQuery = new GetInventoriesQuery(
                CallerId: Guid.NewGuid(),
                CallerRole: UserRole.LogisticsOperator,
                Page: 0,
                Size: 10);

            var operatorResult = await handler.Handle(operatorQuery, CancellationToken.None);
            Assert.True(operatorResult.IsSuccess);
            Assert.Equal(2, operatorResult.Value.TotalItems);
            Assert.Null(repository.LastQueriedVendorId);

            // Administrador
            var adminQuery = new GetInventoriesQuery(
                CallerId: Guid.NewGuid(),
                CallerRole: UserRole.Administrator,
                Page: 0,
                Size: 10);

            var adminResult = await handler.Handle(adminQuery, CancellationToken.None);
            Assert.True(adminResult.IsSuccess);
            Assert.Equal(2, adminResult.Value.TotalItems);
            Assert.Null(repository.LastQueriedVendorId);
        }

        [Fact]
        public async Task GetInventoryByVariant_WhenVariantBelongsToAnotherSeller_ReturnsNotFound404()
        {
            var sellerAId = Guid.NewGuid();
            var sellerBId = Guid.NewGuid();
            var variantBId = Guid.NewGuid();

            var productB = new Product(
                "Producto B", "Descripcion", new Money(100m, "COP"), sellerBId, ProductType.Physical,
                new List<(string, IEnumerable<VariantAttribute>)>
                {
                    ("SKU-B", new List<VariantAttribute> { new("Color", "Azul") })
                });

            // Asignar variantBId al ID de la variante creada
            var createdVariant = productB.Variants.First();
            var productRepository = new MultiTenantTestProductRepository();
            productRepository.ByVariant[createdVariant.Id] = productB;

            var inventoryRepository = new MultiTenantTestInventoryRepository();
            var handler = new GetInventoryByVariantQueryHandler(inventoryRepository, productRepository);

            var query = new GetInventoryByVariantQuery(createdVariant.Id, sellerAId, UserRole.Seller);
            var result = await handler.Handle(query, CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.Equal(ErrorKind.NotFound, result.ErrorKind);
            Assert.Equal("Variant not found.", result.Error);
        }

        [Fact]
        public async Task GetInventoryByVariant_WhenVariantDoesNotExist_ReturnsIdenticalNotFoundMessage()
        {
            var sellerAId = Guid.NewGuid();
            var nonExistentVariantId = Guid.NewGuid();

            var productRepository = new MultiTenantTestProductRepository();
            var inventoryRepository = new MultiTenantTestInventoryRepository();
            var handler = new GetInventoryByVariantQueryHandler(inventoryRepository, productRepository);

            var query = new GetInventoryByVariantQuery(nonExistentVariantId, sellerAId, UserRole.Seller);
            var result = await handler.Handle(query, CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.Equal(ErrorKind.NotFound, result.ErrorKind);
            Assert.Equal("Variant not found.", result.Error);
        }

        [Fact]
        public async Task AddStock_WhenVariantBelongsToAnotherSeller_ReturnsNotFound404()
        {
            var sellerAId = Guid.NewGuid();
            var sellerBId = Guid.NewGuid();

            var productB = new Product(
                "Producto B", "Descripcion", new Money(50m, "COP"), sellerBId, ProductType.Physical,
                new List<(string, IEnumerable<VariantAttribute>)>
                {
                    ("SKU-B1", new List<VariantAttribute> { new("Talla", "M") })
                });

            var variantB = productB.Variants.First();
            var productRepository = new MultiTenantTestProductRepository();
            productRepository.ByVariant[variantB.Id] = productB;

            var ownWarehouse = new Warehouse("Bodega A", "Bogota", 100, WarehouseType.Vendor, sellerAId);
            var warehouseRepository = new MultiTenantTestWarehouseRepository();
            warehouseRepository.Warehouses.Add(ownWarehouse);

            var inventoryRepository = new MultiTenantTestInventoryRepository();
            var unitOfWork = new MultiTenantTestUnitOfWork();

            var handler = new AddStockCommandHandler(inventoryRepository, unitOfWork, productRepository, warehouseRepository);

            var command = new AddStockCommand(
                VariantId: variantB.Id,
                WarehouseId: ownWarehouse.Id,
                Quantity: 10,
                CallerId: sellerAId,
                CallerRole: UserRole.Seller);

            var result = await handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.Equal(ErrorKind.NotFound, result.ErrorKind);
            Assert.Contains("not found", result.Error);
            Assert.False(unitOfWork.SaveChangesCalled);
        }

        [Fact]
        public async Task AddStock_WhenWarehouseBelongsToAnotherSellerAndNotMarketplace_ReturnsNotFound404()
        {
            var sellerAId = Guid.NewGuid();
            var sellerBId = Guid.NewGuid();

            var productA = new Product(
                "Producto A", "Descripcion", new Money(50m, "COP"), sellerAId, ProductType.Physical,
                new List<(string, IEnumerable<VariantAttribute>)>
                {
                    ("SKU-A1", new List<VariantAttribute> { new("Talla", "L") })
                });

            var variantA = productA.Variants.First();
            var productRepository = new MultiTenantTestProductRepository();
            productRepository.ByVariant[variantA.Id] = productA;

            var foreignWarehouse = new Warehouse("Bodega B", "Medellin", 100, WarehouseType.Vendor, sellerBId);
            var warehouseRepository = new MultiTenantTestWarehouseRepository();
            warehouseRepository.Warehouses.Add(foreignWarehouse);

            var inventoryRepository = new MultiTenantTestInventoryRepository();
            var unitOfWork = new MultiTenantTestUnitOfWork();

            var handler = new AddStockCommandHandler(inventoryRepository, unitOfWork, productRepository, warehouseRepository);

            var command = new AddStockCommand(
                VariantId: variantA.Id,
                WarehouseId: foreignWarehouse.Id,
                Quantity: 10,
                CallerId: sellerAId,
                CallerRole: UserRole.Seller);

            var result = await handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.Equal(ErrorKind.NotFound, result.ErrorKind);
            Assert.Contains("not found", result.Error);
            Assert.False(unitOfWork.SaveChangesCalled);
        }

        [Fact]
        public async Task AddStock_WhenWarehouseIsActiveMarketplace_AllowsSellerToStockOwnVariant()
        {
            var sellerAId = Guid.NewGuid();

            var productA = new Product(
                "Producto A", "Descripcion", new Money(50m, "COP"), sellerAId, ProductType.Physical,
                new List<(string, IEnumerable<VariantAttribute>)>
                {
                    ("SKU-A1", new List<VariantAttribute> { new("Talla", "S") })
                });

            var variantA = productA.Variants.First();
            var productRepository = new MultiTenantTestProductRepository();
            productRepository.ByVariant[variantA.Id] = productA;

            var marketplaceWarehouse = new Warehouse("Hub Central Zentric", "Bogota", 500, WarehouseType.Marketplace, null);
            var warehouseRepository = new MultiTenantTestWarehouseRepository();
            warehouseRepository.Warehouses.Add(marketplaceWarehouse);

            var inventoryRepository = new MultiTenantTestInventoryRepository();
            var unitOfWork = new MultiTenantTestUnitOfWork();

            var handler = new AddStockCommandHandler(inventoryRepository, unitOfWork, productRepository, warehouseRepository);

            var command = new AddStockCommand(
                VariantId: variantA.Id,
                WarehouseId: marketplaceWarehouse.Id,
                Quantity: 25,
                CallerId: sellerAId,
                CallerRole: UserRole.Seller);

            var result = await handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.True(unitOfWork.SaveChangesCalled);
        }

        [Fact]
        public async Task DeleteInventory_WhenInventoryBelongsToAnotherSeller_ReturnsNotFound404()
        {
            var sellerAId = Guid.NewGuid();
            var sellerBId = Guid.NewGuid();

            var productB = new Product(
                "Producto B", "Descripcion", new Money(30m, "COP"), sellerBId, ProductType.Physical,
                new List<(string, IEnumerable<VariantAttribute>)>
                {
                    ("SKU-B1", new List<VariantAttribute> { new("Color", "Verde") })
                });

            var variantB = productB.Variants.First();
            var productRepository = new MultiTenantTestProductRepository();
            productRepository.ByVariant[variantB.Id] = productB;

            var warehouse = new Warehouse("Bodega", "Bogota", 100, WarehouseType.Vendor, sellerBId);
            var warehouseRepository = new MultiTenantTestWarehouseRepository();
            warehouseRepository.Warehouses.Add(warehouse);

            var inventory = new Inventory(variantB.Id, warehouse.Id, 0, 0, 0, 0);
            var inventoryRepository = new MultiTenantTestInventoryRepository();
            inventoryRepository.Inventories.Add(inventory);

            var unitOfWork = new MultiTenantTestUnitOfWork();
            var handler = new DeleteInventoryCommandHandler(inventoryRepository, unitOfWork, productRepository, warehouseRepository);

            var command = new DeleteInventoryCommand(inventory.Id, sellerAId, UserRole.Seller);
            var result = await handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.Equal(ErrorKind.NotFound, result.ErrorKind);
            Assert.Contains("not found", result.Error);
            Assert.False(inventory.IsDeleted);
            Assert.False(unitOfWork.SaveChangesCalled);
        }

        [Fact]
        public async Task DeleteInventory_WhenInventoryBelongsToSellerAndHasZeroStock_MarksAsDeleted()
        {
            var sellerAId = Guid.NewGuid();

            var productA = new Product(
                "Producto A", "Descripcion", new Money(30m, "COP"), sellerAId, ProductType.Physical,
                new List<(string, IEnumerable<VariantAttribute>)>
                {
                    ("SKU-A1", new List<VariantAttribute> { new("Color", "Negro") })
                });

            var variantA = productA.Variants.First();
            var productRepository = new MultiTenantTestProductRepository();
            productRepository.ByVariant[variantA.Id] = productA;

            var warehouse = new Warehouse("Bodega A", "Bogota", 100, WarehouseType.Vendor, sellerAId);
            var warehouseRepository = new MultiTenantTestWarehouseRepository();
            warehouseRepository.Warehouses.Add(warehouse);

            var inventory = new Inventory(variantA.Id, warehouse.Id, 0, 0, 0, 0);
            var inventoryRepository = new MultiTenantTestInventoryRepository();
            inventoryRepository.Inventories.Add(inventory);

            var unitOfWork = new MultiTenantTestUnitOfWork();
            var handler = new DeleteInventoryCommandHandler(inventoryRepository, unitOfWork, productRepository, warehouseRepository);

            var command = new DeleteInventoryCommand(inventory.Id, sellerAId, UserRole.Seller);
            var result = await handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.True(inventory.IsDeleted);
            Assert.True(unitOfWork.SaveChangesCalled);
        }

        [Theory]
        [InlineData(5, 0, 0, 0)]
        [InlineData(0, 3, 0, 0)]
        [InlineData(0, 0, 2, 0)]
        [InlineData(0, 0, 0, 4)]
        public async Task DeleteInventory_WhenInventoryHasPhysicalStock_ReturnsBadRequest400(
            int available, int reserved, int damaged, int used)
        {
            var sellerAId = Guid.NewGuid();

            var productA = new Product(
                "Producto A", "Descripcion", new Money(30m, "COP"), sellerAId, ProductType.Physical,
                new List<(string, IEnumerable<VariantAttribute>)>
                {
                    ("SKU-A1", new List<VariantAttribute> { new("Color", "Blanco") })
                });

            var variantA = productA.Variants.First();
            var productRepository = new MultiTenantTestProductRepository();
            productRepository.ByVariant[variantA.Id] = productA;

            var warehouse = new Warehouse("Bodega A", "Bogota", 100, WarehouseType.Vendor, sellerAId);
            var warehouseRepository = new MultiTenantTestWarehouseRepository();
            warehouseRepository.Warehouses.Add(warehouse);

            var inventory = new Inventory(variantA.Id, warehouse.Id, available, reserved, damaged, used);
            var inventoryRepository = new MultiTenantTestInventoryRepository();
            inventoryRepository.Inventories.Add(inventory);

            var unitOfWork = new MultiTenantTestUnitOfWork();
            var handler = new DeleteInventoryCommandHandler(inventoryRepository, unitOfWork, productRepository, warehouseRepository);

            var command = new DeleteInventoryCommand(inventory.Id, sellerAId, UserRole.Seller);
            var result = await handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.Contains("existencias físicas", result.Error);
            Assert.False(inventory.IsDeleted);
            Assert.False(unitOfWork.SaveChangesCalled);
        }

        // =========================================================================
        // IMPLEMENTACION DE FAKES PARA PRUEBAS MULTINQUILINO EN MEMORIA
        // =========================================================================

        private sealed class MultiTenantTestUnitOfWork : IUnitOfWork
        {
            public bool SaveChangesCalled { get; private set; }

            public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
            {
                SaveChangesCalled = true;
                return Task.FromResult(1);
            }
        }

        private sealed class MultiTenantTestProductRepository : IProductRepository
        {
            public Dictionary<Guid, Product> ByVariant { get; } = new();

            public Task<Product?> GetByVariantIdAsync(Guid variantId, CancellationToken cancellationToken = default)
                => Task.FromResult(ByVariant.TryGetValue(variantId, out var product) ? product : null);

            public Task<Product?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
                => Task.FromResult<Product?>(null);

            public Task<IReadOnlyList<Product>> GetAllAsync(Guid? vendorId = null, ProductStatus? status = null, CancellationToken cancellationToken = default)
                => Task.FromResult((IReadOnlyList<Product>)Array.Empty<Product>());

            public Task<(IReadOnlyList<Product> Items, int TotalItems)> GetPagedAsync(Guid? vendorId, ProductStatus? status, int skip, int take, CancellationToken cancellationToken = default)
                => Task.FromResult(((IReadOnlyList<Product>)Array.Empty<Product>(), 0));

            public Task AddAsync(Product product, CancellationToken cancellationToken = default) => Task.CompletedTask;
            public Task UpdateAsync(Product product, CancellationToken cancellationToken = default) => Task.CompletedTask;
            public Task<IReadOnlyList<CategoryDto>> GetCategoriesWithCountAsync(CancellationToken cancellationToken = default)
                => Task.FromResult((IReadOnlyList<CategoryDto>)Array.Empty<CategoryDto>());
            public Task<IReadOnlyList<Product>> GetHeroProductsAsync(int count, CancellationToken cancellationToken = default)
                => Task.FromResult((IReadOnlyList<Product>)Array.Empty<Product>());
        }

        private sealed class MultiTenantTestWarehouseRepository : IWarehouseRepository
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

        private sealed class MultiTenantTestInventoryRepository : IInventoryRepository
        {
            private sealed record SeededRow(Inventory Inventory, Guid VendorId, string ProductName, string Sku);

            private readonly List<SeededRow> _rows = new();
            public List<Inventory> Inventories { get; } = new();
            public Guid? LastQueriedVendorId { get; private set; }

            public void SeedRow(Inventory inventory, Guid vendorId, string productName, string sku)
            {
                _rows.Add(new SeededRow(inventory, vendorId, productName, sku));
                Inventories.Add(inventory);
            }

            public Task<(IReadOnlyList<InventoryListRow> Items, int TotalItems)> GetPagedAsync(
                Guid? vendorId,
                Guid? warehouseId,
                string? search,
                int skip,
                int take,
                CancellationToken cancellationToken = default)
            {
                LastQueriedVendorId = vendorId;

                var query = _rows.AsEnumerable();

                if (vendorId.HasValue)
                {
                    query = query.Where(r => r.VendorId == vendorId.Value);
                }

                if (warehouseId.HasValue)
                {
                    query = query.Where(r => r.Inventory.WarehouseId == warehouseId.Value);
                }

                if (!string.IsNullOrWhiteSpace(search))
                {
                    query = query.Where(r =>
                        r.ProductName.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                        r.Sku.Contains(search, StringComparison.OrdinalIgnoreCase));
                }

                var list = query.ToList();
                var page = list
                    .Skip(skip)
                    .Take(take)
                    .Select(r => new InventoryListRow(r.Inventory, r.ProductName, r.Sku))
                    .ToList();

                return Task.FromResult(((IReadOnlyList<InventoryListRow>)page, list.Count));
            }

            public Task<Inventory?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
                => Task.FromResult(Inventories.FirstOrDefault(i => i.Id == id));

            public Task<Inventory?> GetByVariantAndWarehouseAsync(Guid variantId, Guid warehouseId, CancellationToken cancellationToken = default)
                => Task.FromResult(Inventories.FirstOrDefault(i => i.VariantId == variantId && i.WarehouseId == warehouseId));

            public Task<IEnumerable<Inventory>> GetByVariantIdAsync(Guid variantId, CancellationToken cancellationToken = default)
                => Task.FromResult<IEnumerable<Inventory>>(Inventories.Where(i => i.VariantId == variantId).ToList());

            public Task<int> GetTotalAvailableStockAsync(Guid variantId, CancellationToken cancellationToken = default)
                => Task.FromResult(Inventories.Where(i => i.VariantId == variantId).Sum(i => i.AvailableQuantity));

            public Task<IReadOnlyList<Inventory>> GetListAsync(Guid? vendorId, CancellationToken cancellationToken = default)
                => Task.FromResult<IReadOnlyList<Inventory>>(new List<Inventory>());

            public Task AddAsync(Inventory inventory, CancellationToken cancellationToken = default)
            {
                Inventories.Add(inventory);
                return Task.CompletedTask;
            }

            public Task UpdateAsync(Inventory inventory, CancellationToken cancellationToken = default) => Task.CompletedTask;

            public Task<Inventory> LoadWithHistoryAsync(Guid id, CancellationToken cancellationToken = default)
                => Task.FromResult(Inventories.First(i => i.Id == id));

            public Task SaveAdjustmentAsync(Inventory inventory, StockAdjustmentRecord record, CancellationToken cancellationToken = default)
                => Task.CompletedTask;

            public Task<bool> TryReserveStockAsync(Guid inventoryId, int quantity, CancellationToken cancellationToken = default)
            {
                var inv = Inventories.FirstOrDefault(i => i.Id == inventoryId);
                return Task.FromResult(inv is not null && inv.AvailableQuantity >= quantity);
            }

            public Task ReleaseReservedStockAsync(Guid inventoryId, int quantity, CancellationToken cancellationToken = default)
            {
                var inv = Inventories.FirstOrDefault(i => i.Id == inventoryId);
                if (inv is not null && inv.ReservedQuantity >= quantity)
                {
                    inv.ReturnToAvailable(quantity);
                }
                return Task.CompletedTask;
            }
        }
    }
}
