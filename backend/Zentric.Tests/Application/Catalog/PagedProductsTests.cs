using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Xunit;
using Zentric.Application.Catalog.Queries;
using Zentric.Application.Catalog.Validators;
using Zentric.Application.Common.Models;
using Zentric.Domain.Inventories.Ports;
using Zentric.Domain.Products;
using Zentric.Domain.Products.Enums;
using Zentric.Domain.Products.Ports;
using Zentric.Domain.Products.ValueObjects;

namespace Zentric.Tests.Application.Catalog
{
    /// <summary>
    /// Pruebas de la paginacion del catalogo (cierra el riesgo API4: recurso
    /// sin limitacion).
    /// </summary>
    public class PagedProductsTests
    {
        // Estas pruebas miden la paginacion, no la visibilidad: el llamante da igual.
        private static readonly Guid AnyCallerId = Guid.NewGuid();

        private sealed class PagedFakeProductRepository : IProductRepository
        {
            public List<Product> Products { get; } = new();

            public Task<(IReadOnlyList<Product> Items, int TotalItems)> GetPagedAsync(Guid? vendorId, ProductStatus? status, int skip, int take, CancellationToken cancellationToken = default)
            {
                var all = Products.AsEnumerable();
                if (vendorId.HasValue) all = all.Where(p => p.VendorId == vendorId.Value);
                // Replica el contrato del repositorio real: el estado se filtra ANTES
                // de contar, o el total no cuadra con la pagina devuelta.
                if (status.HasValue) all = all.Where(p => p.Status == status.Value);
                var list = all.ToList();
                return Task.FromResult<(IReadOnlyList<Product>, int)>(
                    (list.Skip(skip).Take(take).ToList(), list.Count));
            }

            /// <summary>
            /// Replica el contrato del repositorio real para los filtros del comprador
            /// (S3): busqueda por nombre o descripcion, orden y tipo, todos aplicados
            /// ANTES del conteo y la pagina, igual que la consulta EF.
            /// </summary>
            public Task<(IReadOnlyList<Product> Items, int TotalItems)> GetPagedAsync(
                Guid? vendorId, ProductStatus? status, int skip, int take, string? category,
                string? search, ProductSort sort, ProductType? type, CancellationToken cancellationToken = default)
            {
                var query = Products.AsEnumerable();
                if (vendorId.HasValue) query = query.Where(p => p.VendorId == vendorId.Value);
                if (status.HasValue) query = query.Where(p => p.Status == status.Value);

                if (!string.IsNullOrWhiteSpace(category) && !string.Equals(category, "all", StringComparison.OrdinalIgnoreCase))
                {
                    var catLower = category.Trim().ToLower();
                    query = query.Where(p => p.Category != null && p.Category.ToLower() == catLower);
                }

                if (!string.IsNullOrWhiteSpace(search))
                {
                    var searchLower = search.Trim().ToLower();
                    query = query.Where(p =>
                        p.Name.ToLower().Contains(searchLower) ||
                        p.Description.ToLower().Contains(searchLower));
                }

                if (type.HasValue) query = query.Where(p => p.Type == type.Value);

                // El orden por precio desempata por fecha de creacion, igual que la
                // consulta EF; relevance conserva el orden de insercion del doble.
                query = sort switch
                {
                    ProductSort.PriceAsc => query.OrderBy(p => p.Price.Amount).ThenBy(p => p.CreatedAt),
                    ProductSort.PriceDesc => query.OrderByDescending(p => p.Price.Amount).ThenBy(p => p.CreatedAt),
                    _ => query,
                };

                var list = query.ToList();
                return Task.FromResult<(IReadOnlyList<Product>, int)>(
                    (list.Skip(skip).Take(take).ToList(), list.Count));
            }

            public Task<IReadOnlyList<Product>> GetAllAsync(Guid? vendorId = null, ProductStatus? status = null, CancellationToken cancellationToken = default)
                => Task.FromResult<IReadOnlyList<Product>>(
                    Products
                        .Where(p => !vendorId.HasValue || p.VendorId == vendorId.Value)
                        .Where(p => !status.HasValue || p.Status == status.Value)
                        .ToList());

            public Task<Product?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
                => Task.FromResult(Products.FirstOrDefault(p => p.Id == id));

            public Task<Product?> GetByVariantIdAsync(Guid variantId, CancellationToken cancellationToken = default)
                => Task.FromResult(Products.FirstOrDefault(p => p.Variants.Any(v => v.Id == variantId)));

            public Task AddAsync(Product product, CancellationToken cancellationToken = default)
            {
                Products.Add(product);
                return Task.CompletedTask;
            }

            public Task UpdateAsync(Product product, CancellationToken cancellationToken = default) => Task.CompletedTask;

            public Task<IReadOnlyList<Zentric.Domain.Products.Ports.CategoryDto>> GetCategoriesWithCountAsync(CancellationToken cancellationToken = default)
                => Task.FromResult<IReadOnlyList<Zentric.Domain.Products.Ports.CategoryDto>>(Array.Empty<Zentric.Domain.Products.Ports.CategoryDto>());

            public Task<IReadOnlyList<Product>> GetHeroProductsAsync(int count, CancellationToken cancellationToken = default)
                => Task.FromResult<IReadOnlyList<Product>>(Array.Empty<Product>());
        }

        // Null Object para IInventoryRepository en tests de paginado (no necesitan stock real).
        private sealed class NullInventoryRepository : IInventoryRepository
        {
            public Task<int> GetTotalAvailableStockAsync(Guid variantId, CancellationToken cancellationToken = default)
                => Task.FromResult(0);

            public Task<Zentric.Domain.Inventories.Inventory?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
                => Task.FromResult<Zentric.Domain.Inventories.Inventory?>(null);

            public Task<Zentric.Domain.Inventories.Inventory?> GetByVariantAndWarehouseAsync(Guid variantId, Guid warehouseId, CancellationToken cancellationToken = default)
                => Task.FromResult<Zentric.Domain.Inventories.Inventory?>(null);

            public Task<IEnumerable<Zentric.Domain.Inventories.Inventory>> GetByVariantIdAsync(Guid variantId, CancellationToken cancellationToken = default)
                => Task.FromResult(Enumerable.Empty<Zentric.Domain.Inventories.Inventory>());

            public Task<IReadOnlyList<Zentric.Domain.Inventories.Inventory>> GetListAsync(Guid? vendorId, CancellationToken cancellationToken = default)
                => Task.FromResult<IReadOnlyList<Zentric.Domain.Inventories.Inventory>>(Array.Empty<Zentric.Domain.Inventories.Inventory>());

            public Task AddAsync(Zentric.Domain.Inventories.Inventory inventory, CancellationToken cancellationToken = default)
                => Task.CompletedTask;

            public Task UpdateAsync(Zentric.Domain.Inventories.Inventory inventory, CancellationToken cancellationToken = default)
                => Task.CompletedTask;

            public Task<Zentric.Domain.Inventories.Inventory> LoadWithHistoryAsync(Guid id, CancellationToken cancellationToken = default)
                => Task.FromResult<Zentric.Domain.Inventories.Inventory>(null!);

            public Task SaveAdjustmentAsync(Zentric.Domain.Inventories.Inventory inventory, Zentric.Domain.Inventories.StockAdjustmentRecord record, CancellationToken cancellationToken = default)
                => Task.CompletedTask;

            public Task<bool> TryReserveStockAsync(Guid inventoryId, int quantity, CancellationToken cancellationToken = default)
                => Task.FromResult(false);

            public Task ReleaseReservedStockAsync(Guid inventoryId, int quantity, CancellationToken cancellationToken = default)
                => Task.CompletedTask;
        }

        private static Product Product(
            string name,
            decimal price = 100m,
            string description = "desc",
            string? category = null,
            ProductType type = ProductType.Physical)
        {
            // Un producto fisico exige al menos una variante (ADR-0003), y el
            // constructor la valida, asi que se pasa desde el inicio. Un Digital
            // puede nacer sin ninguna (CAT-02).
            var seeds = type == ProductType.Physical
                ? new (string Sku, IEnumerable<VariantAttribute> Attributes)[]
                {
                    ($"SKU-{name}", new[] { new VariantAttribute("Color", "Rojo") })
                }
                : Array.Empty<(string Sku, IEnumerable<VariantAttribute> Attributes)>();

            return new Product(
                name, description, new Money(price, "COP"), Guid.NewGuid(), type, seeds, category: category);
        }

        [Fact]
        public void PageRequest_DefaultsToTwentyItems()
        {
            var page = new PageRequest(0, PageRequest.DefaultPageSize);

            Assert.Equal(0, page.Page);
            Assert.Equal(20, page.Size);
        }

        [Fact]
        public void PageRequest_NegativePage_ClampsToZero()
        {
            Assert.Equal(0, new PageRequest(-5, PageRequest.DefaultPageSize).Page);
        }

        [Fact]
        public void PageRequest_HugeSize_IsCappedAtOneHundred()
        {
            // Un cliente no puede pedir la tabla completa de un solo golpe.
            Assert.Equal(PageRequest.MaxPageSize, new PageRequest(0, 10_000).Size);
        }

        [Fact]
        public void PageRequest_ZeroOrNegativeSize_FallsBackToDefault()
        {
            Assert.Equal(PageRequest.DefaultPageSize, new PageRequest(0, 0).Size);
            Assert.Equal(PageRequest.DefaultPageSize, new PageRequest(0, -3).Size);
        }

        [Fact]
        public void PageRequest_SkipIsPageTimesSize()
        {
            var page = new PageRequest(3, 25);

            Assert.Equal(75, page.Skip);
            Assert.Equal(25, page.Take);
        }

        [Fact]
        public void PagedResult_ComputesTotalPagesAndNavigation()
        {
            var result = new PagedResult<string>(new[] { "a" }, Page: 0, Size: 10, TotalItems: 25);

            Assert.Equal(3, result.TotalPages);
            Assert.False(result.HasPrevious);
            Assert.True(result.HasNext);
        }

        [Fact]
        public async Task Handle_ReturnsRequestedSliceAndTotal()
        {
            var repo = new PagedFakeProductRepository();
            for (var i = 0; i < 25; i++) repo.Products.Add(Product($"P{i}"));
            var handler = new GetProductsPagedQueryHandler(repo, new NullInventoryRepository());

            var result = await handler.Handle(new GetProductsPagedQuery(null, AnyCallerId, Page: 1, Size: 10), CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.Equal(10, result.Value.Items.Count);
            Assert.Equal(25, result.Value.TotalItems);
            Assert.Equal(3, result.Value.TotalPages);
            Assert.Equal("P10", result.Value.Items[0].Name);
        }

        [Fact]
        public async Task Handle_PageBeyondEnd_ReturnsEmptyButKeepsTotal()
        {
            var repo = new PagedFakeProductRepository();
            for (var i = 0; i < 5; i++) repo.Products.Add(Product($"P{i}"));
            var handler = new GetProductsPagedQueryHandler(repo, new NullInventoryRepository());

            var result = await handler.Handle(new GetProductsPagedQuery(null, AnyCallerId, Page: 99, Size: 10), CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.Empty(result.Value.Items);
            Assert.Equal(5, result.Value.TotalItems);
        }

        [Fact]
        public async Task Handle_HugeSizeFromClient_IsCappedByPageRequest()
        {
            // Aunque el cliente pida 1000, el borde lo recorta a 100.
            var repo = new PagedFakeProductRepository();
            for (var i = 0; i < 150; i++) repo.Products.Add(Product($"P{i}"));
            var handler = new GetProductsPagedQueryHandler(repo, new NullInventoryRepository());

            var result = await handler.Handle(new GetProductsPagedQuery(null, AnyCallerId, Page: 0, Size: 1000), CancellationToken.None);

            Assert.Equal(PageRequest.MaxPageSize, result.Value.Size);
            Assert.Equal(100, result.Value.Items.Count);
        }

        // ---------------------------------------------------------------------
        // Filtros del comprador (S3): search, sort y type sobre TODO el catalogo.
        // ---------------------------------------------------------------------

        [Fact]
        public async Task Handle_SearchByNameDifferentCase_FiltersIgnoringCase()
        {
            var repo = new PagedFakeProductRepository();
            repo.Products.Add(Product("Teclado Mecanico"));
            repo.Products.Add(Product("Mouse Gamer"));
            var handler = new GetProductsPagedQueryHandler(repo, new NullInventoryRepository());

            var result = await handler.Handle(
                new GetProductsPagedQuery(null, AnyCallerId, Page: 0, Size: 20, Search: "TECLADO"),
                CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.Single(result.Value.Items);
            Assert.Equal("Teclado Mecanico", result.Value.Items[0].Name);
        }

        [Fact]
        public async Task Handle_SearchMatchesDescription_FiltersByDescription()
        {
            var repo = new PagedFakeProductRepository();
            repo.Products.Add(Product("Alpha", description: "una descripcion con auriculares bluetooth"));
            repo.Products.Add(Product("Beta", description: "solo texto plano"));
            var handler = new GetProductsPagedQueryHandler(repo, new NullInventoryRepository());

            var result = await handler.Handle(
                new GetProductsPagedQuery(null, AnyCallerId, Page: 0, Size: 20, Search: "auriculares"),
                CancellationToken.None);

            Assert.Single(result.Value.Items);
            Assert.Equal("Alpha", result.Value.Items[0].Name);
        }

        [Fact]
        public async Task Handle_BlankSearch_DoesNotFilterTheCatalog()
        {
            var repo = new PagedFakeProductRepository();
            repo.Products.Add(Product("Alpha"));
            repo.Products.Add(Product("Beta"));
            var handler = new GetProductsPagedQueryHandler(repo, new NullInventoryRepository());

            var result = await handler.Handle(
                new GetProductsPagedQuery(null, AnyCallerId, Page: 0, Size: 20, Search: "   "),
                CancellationToken.None);

            Assert.Equal(2, result.Value.TotalItems);
            Assert.Equal(2, result.Value.Items.Count);
        }

        [Fact]
        public async Task Handle_SortPriceAsc_OrdersByPriceAscending()
        {
            var repo = new PagedFakeProductRepository();
            repo.Products.Add(Product("Caro", price: 300m));
            repo.Products.Add(Product("Barato", price: 100m));
            repo.Products.Add(Product("Medio", price: 200m));
            var handler = new GetProductsPagedQueryHandler(repo, new NullInventoryRepository());

            var result = await handler.Handle(
                new GetProductsPagedQuery(null, AnyCallerId, Page: 0, Size: 20, Sort: "price-asc"),
                CancellationToken.None);

            Assert.Equal(new[] { "Barato", "Medio", "Caro" }, result.Value.Items.Select(i => i.Name));
        }

        [Fact]
        public async Task Handle_SortPriceDesc_OrdersByPriceDescending()
        {
            var repo = new PagedFakeProductRepository();
            repo.Products.Add(Product("Caro", price: 300m));
            repo.Products.Add(Product("Barato", price: 100m));
            repo.Products.Add(Product("Medio", price: 200m));
            var handler = new GetProductsPagedQueryHandler(repo, new NullInventoryRepository());

            var result = await handler.Handle(
                new GetProductsPagedQuery(null, AnyCallerId, Page: 0, Size: 20, Sort: "price-desc"),
                CancellationToken.None);

            Assert.Equal(new[] { "Caro", "Medio", "Barato" }, result.Value.Items.Select(i => i.Name));
        }

        [Fact]
        public async Task Handle_TypePhysical_ExcludesDigitalProducts()
        {
            var repo = new PagedFakeProductRepository();
            repo.Products.Add(Product("Fisico", type: ProductType.Physical));
            repo.Products.Add(Product("Digital", type: ProductType.Digital));
            var handler = new GetProductsPagedQueryHandler(repo, new NullInventoryRepository());

            var result = await handler.Handle(
                new GetProductsPagedQuery(null, AnyCallerId, Page: 0, Size: 20, Type: "Physical"),
                CancellationToken.None);

            Assert.Single(result.Value.Items);
            Assert.Equal("Fisico", result.Value.Items[0].Name);
        }

        [Fact]
        public async Task Handle_TypeDigitalLowercase_ExcludesPhysicalProducts()
        {
            var repo = new PagedFakeProductRepository();
            repo.Products.Add(Product("Fisico", type: ProductType.Physical));
            repo.Products.Add(Product("Digital", type: ProductType.Digital));
            var handler = new GetProductsPagedQueryHandler(repo, new NullInventoryRepository());

            var result = await handler.Handle(
                new GetProductsPagedQuery(null, AnyCallerId, Page: 0, Size: 20, Type: "digital"),
                CancellationToken.None);

            Assert.Single(result.Value.Items);
            Assert.Equal("Digital", result.Value.Items[0].Name);
        }

        [Fact]
        public async Task Handle_CategoryAndSearch_AppliesBothFilters()
        {
            var repo = new PagedFakeProductRepository();
            repo.Products.Add(Product("Laptop Pro", category: "computacion"));
            repo.Products.Add(Product("Mouse Pro", category: "computacion"));
            repo.Products.Add(Product("Laptop Gamer", category: "gaming"));
            var handler = new GetProductsPagedQueryHandler(repo, new NullInventoryRepository());

            var result = await handler.Handle(
                new GetProductsPagedQuery(
                    null, AnyCallerId, Page: 0, Size: 20, Category: "computacion", Search: "laptop"),
                CancellationToken.None);

            Assert.Single(result.Value.Items);
            Assert.Equal("Laptop Pro", result.Value.Items[0].Name);
        }

        [Fact]
        public async Task Handle_SearchAndSort_TotalReflectsFilteredCatalog()
        {
            // El total se calcula sobre el catalogo filtrado, no sobre la pagina:
            // es lo que permite al frontend saber cuantas paginas existen.
            var repo = new PagedFakeProductRepository();
            repo.Products.Add(Product("Laptop Uno", price: 100m));
            repo.Products.Add(Product("Laptop Dos", price: 200m));
            repo.Products.Add(Product("Mouse Uno", price: 50m));
            var handler = new GetProductsPagedQueryHandler(repo, new NullInventoryRepository());

            var result = await handler.Handle(
                new GetProductsPagedQuery(
                    null, AnyCallerId, Page: 0, Size: 1, Search: "laptop", Sort: "price-desc"),
                CancellationToken.None);

            Assert.Equal(2, result.Value.TotalItems);
            Assert.Single(result.Value.Items);
            Assert.Equal("Laptop Dos", result.Value.Items[0].Name);
        }

        [Theory]
        [InlineData("cheapest")]
        [InlineData("price")]
        [InlineData("PRICE_ASC")]
        public void Validator_UnknownSort_IsRejected(string sort)
        {
            var validator = new GetProductsPagedQueryValidator();

            var validation = validator.Validate(
                new GetProductsPagedQuery(null, AnyCallerId, Page: 0, Size: 20, Sort: sort));

            Assert.False(validation.IsValid);
            Assert.Contains(validation.Errors, e => e.ErrorMessage.Contains("sort"));
        }

        [Theory]
        [InlineData("Hybrid")]
        [InlineData("Physicals")]
        [InlineData("1")]
        public void Validator_UnknownType_IsRejected(string type)
        {
            var validator = new GetProductsPagedQueryValidator();

            var validation = validator.Validate(
                new GetProductsPagedQuery(null, AnyCallerId, Page: 0, Size: 20, Type: type));

            Assert.False(validation.IsValid);
            Assert.Contains(validation.Errors, e => e.ErrorMessage.Contains("type"));
        }

        [Theory]
        [InlineData(null, null)]
        [InlineData("relevance", null)]
        [InlineData("price-asc", "Physical")]
        [InlineData("price-desc", "digital")]
        [InlineData("", "")]
        public void Validator_KnownOrAbsentFilters_AreAccepted(string? sort, string? type)
        {
            var validator = new GetProductsPagedQueryValidator();

            var validation = validator.Validate(
                new GetProductsPagedQuery(null, AnyCallerId, Page: 0, Size: 20, Sort: sort, Type: type));

            Assert.True(validation.IsValid);
        }
    }
}