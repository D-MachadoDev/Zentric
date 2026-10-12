using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Xunit;
using Zentric.Application.Catalog.Queries;
using Zentric.Domain.Products;
using Zentric.Domain.Products.Enums;
using Zentric.Domain.Products.Ports;
using Zentric.Domain.Products.ValueObjects;

namespace Zentric.Tests.Application.Catalog
{
    /// <summary>
    /// Visibilidad del catalogo (Q-27, dictamen Q22=B).
    ///
    /// ZENTRIC.md:101: "Publicacion: los productos se hacen visibles en el catalogo
    /// publico". 01-endpoints.md §3.4 promete ademas que al suspender "el producto
    /// deja de ser visible en busquedas".
    ///
    /// La unica excepcion es quien pide su propio VendorId: esa es su vista de
    /// gestion y si refleja los suspendidos, porque publish (Q-25) exige encontrar
    /// antes el producto y no existe listado de "mis productos".
    /// </summary>
    public class CatalogVisibilityTests
    {
        private sealed class VisibilityFakeRepository : IProductRepository
        {
            public List<Product> Products { get; } = new();

            public Task<IReadOnlyList<Product>> GetAllAsync(
                Guid? vendorId = null, ProductStatus? status = null, CancellationToken cancellationToken = default)
            {
                var query = Products.AsEnumerable();
                if (vendorId.HasValue) query = query.Where(p => p.VendorId == vendorId.Value);
                if (status.HasValue) query = query.Where(p => p.Status == status.Value);
                return Task.FromResult<IReadOnlyList<Product>>(query.ToList());
            }

            public Task<(IReadOnlyList<Product> Items, int TotalItems)> GetPagedAsync(
                Guid? vendorId, ProductStatus? status, int skip, int take, CancellationToken cancellationToken = default)
            {
                // Replica el contrato del repositorio real: el estado se filtra antes
                // de contar, o el total no cuadra con la pagina devuelta.
                var query = Products.AsEnumerable();
                if (vendorId.HasValue) query = query.Where(p => p.VendorId == vendorId.Value);
                if (status.HasValue) query = query.Where(p => p.Status == status.Value);
                var list = query.ToList();
                return Task.FromResult<(IReadOnlyList<Product>, int)>(
                    (list.Skip(skip).Take(take).ToList(), list.Count));
            }

            public Task<Product?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
                => Task.FromResult(Products.FirstOrDefault(p => p.Id == id));

            public Task<Product?> GetByVariantIdAsync(Guid variantId, CancellationToken cancellationToken = default)
                => Task.FromResult(Products.FirstOrDefault(p => p.Variants.Any(v => v.Id == variantId)));

            public Task AddAsync(Product product, CancellationToken cancellationToken = default)
            {
                Products.Add(product);
                return Task.CompletedTask;
            }

            public Task UpdateAsync(Product product, CancellationToken cancellationToken = default)
                => Task.CompletedTask;
        }

        private static Product NewProduct(Guid vendorId, string name, bool suspended = false)
        {
            // Un producto fisico exige al menos una variante (ADR-0003).
            var seeds = new (string Sku, IEnumerable<VariantAttribute> Attributes)[]
            {
                ($"SKU-{name}", new[] { new VariantAttribute("Color", "Rojo") })
            };

            var product = new Product(
                name, "descripcion", new Money(100m, "COP"), vendorId, ProductType.Physical, seeds);

            if (suspended) product.Suspend();
            return product;
        }

        [Fact(DisplayName = "CatalogoSinFiltroDeVendedor_OcultaLosSuspendidos")]
        public async Task Handle_NoVendorFilter_ReturnsOnlyPublished()
        {
            var vendorId = Guid.NewGuid();
            var repo = new VisibilityFakeRepository();
            repo.Products.Add(NewProduct(vendorId, "Publicado"));
            repo.Products.Add(NewProduct(vendorId, "Suspendido", suspended: true));

            var handler = new GetProductsQueryHandler(repo);

            var result = await handler.Handle(
                new GetProductsQuery(VendorId: null, CallerId: Guid.NewGuid()),
                CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.Equal(new[] { "Publicado" }, result.Value.Select(p => p.Name));
        }

        [Fact(DisplayName = "CatalogoDeOtroVendedor_TambienOcultaSusSuspendidos")]
        public async Task Handle_OtherVendorFilter_ReturnsOnlyPublished()
        {
            var vendorId = Guid.NewGuid();
            var repo = new VisibilityFakeRepository();
            repo.Products.Add(NewProduct(vendorId, "PublicadoAjeno"));
            repo.Products.Add(NewProduct(vendorId, "SuspendidoAjeno", suspended: true));

            var handler = new GetProductsQueryHandler(repo);

            var result = await handler.Handle(
                new GetProductsQuery(VendorId: vendorId, CallerId: Guid.NewGuid()),
                CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.Equal(new[] { "PublicadoAjeno" }, result.Value.Select(p => p.Name));
        }

        // El dictamen Q22=B: sin esta excepcion, suspender seria un callejon sin salida
        // porque el Vendedor no encontraria su producto para reactivarlo con publish.
        [Fact(DisplayName = "CatalogoDelPropioVendedor_ExponeSusSuspendidosParaReactivarlos")]
        public async Task Handle_OwnVendorFilter_ReturnsEveryStatus()
        {
            var vendorId = Guid.NewGuid();
            var repo = new VisibilityFakeRepository();
            repo.Products.Add(NewProduct(vendorId, "PublicadoPropio"));
            repo.Products.Add(NewProduct(vendorId, "SuspendidoPropio", suspended: true));

            var handler = new GetProductsQueryHandler(repo);

            var result = await handler.Handle(
                new GetProductsQuery(VendorId: vendorId, CallerId: vendorId),
                CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.Equal(
                new[] { "PublicadoPropio", "SuspendidoPropio" },
                result.Value.Select(p => p.Name));
        }

        [Fact(DisplayName = "PaginadoDeOtroVendedor_ElTotalSoloCuentaLosPublicados")]
        public async Task Paged_OtherVendorFilter_TotalCountsOnlyPublished()
        {
            var vendorId = Guid.NewGuid();
            var repo = new VisibilityFakeRepository();
            for (var i = 0; i < 3; i++) repo.Products.Add(NewProduct(vendorId, $"Publicado{i}"));
            repo.Products.Add(NewProduct(vendorId, "Suspendido", suspended: true));

            var handler = new GetProductsPagedQueryHandler(repo);

            var result = await handler.Handle(
                new GetProductsPagedQuery(vendorId, Guid.NewGuid(), Page: 0, Size: 10),
                CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.Equal(3, result.Value.TotalItems);
        }

        [Fact(DisplayName = "PaginadoDelPropioVendedor_ElTotalCuentaTambienLosSuspendidos")]
        public async Task Paged_OwnVendorFilter_TotalCountsUnpublishedToo()
        {
            var vendorId = Guid.NewGuid();
            var repo = new VisibilityFakeRepository();
            for (var i = 0; i < 3; i++) repo.Products.Add(NewProduct(vendorId, $"Publicado{i}"));
            repo.Products.Add(NewProduct(vendorId, "Suspendido", suspended: true));

            var handler = new GetProductsPagedQueryHandler(repo);

            var result = await handler.Handle(
                new GetProductsPagedQuery(vendorId, vendorId, Page: 0, Size: 10),
                CancellationToken.None);

            Assert.True(result.IsSuccess);

            // El total se cuenta con el mismo filtro que la pagina: si el estado se
            // aplicara despues de contar, aqui saldria 3 y la paginacion mentiria.
            Assert.Equal(4, result.Value.TotalItems);
        }
    }
}
