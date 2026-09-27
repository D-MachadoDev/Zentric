using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Xunit;
using Zentric.Application.Catalog.Queries;
using Zentric.Application.Common.Models;
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
        private sealed class PagedFakeProductRepository : IProductRepository
        {
            public List<Product> Products { get; } = new();

            public Task<(IReadOnlyList<Product> Items, int TotalItems)> GetPagedAsync(
                Guid? vendorId, int skip, int take, CancellationToken cancellationToken = default)
            {
                var all = Products.AsEnumerable();
                if (vendorId.HasValue) all = all.Where(p => p.VendorId == vendorId.Value);
                var list = all.ToList();
                return Task.FromResult<(IReadOnlyList<Product>, int)>(
                    (list.Skip(skip).Take(take).ToList(), list.Count));
            }

            public Task<IReadOnlyList<Product>> GetAllAsync(Guid? vendorId = null, CancellationToken cancellationToken = default)
                => Task.FromResult<IReadOnlyList<Product>>(
                    Products.Where(p => !vendorId.HasValue || p.VendorId == vendorId.Value).ToList());

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
        }

        private static Product Product(string name)
        {
            // Un producto fisico exige al menos una variante (ADR-0003), y el
            // constructor la valida, asi que se pasa desde el inicio.
            var seeds = new (string Sku, IEnumerable<VariantAttribute> Attributes)[]
            {
                ($"SKU-{name}", new[] { new VariantAttribute("Color", "Rojo") })
            };

            return new Product(
                name, "desc", new Money(100m, "COP"), Guid.NewGuid(), ProductType.Physical, seeds);
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
            var handler = new GetProductsPagedQueryHandler(repo);

            var result = await handler.Handle(new GetProductsPagedQuery(Page: 1, Size: 10), CancellationToken.None);

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
            var handler = new GetProductsPagedQueryHandler(repo);

            var result = await handler.Handle(new GetProductsPagedQuery(Page: 99, Size: 10), CancellationToken.None);

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
            var handler = new GetProductsPagedQueryHandler(repo);

            var result = await handler.Handle(new GetProductsPagedQuery(Page: 0, Size: 1000), CancellationToken.None);

            Assert.Equal(PageRequest.MaxPageSize, result.Value.Size);
            Assert.Equal(100, result.Value.Items.Count);
        }
    }
}