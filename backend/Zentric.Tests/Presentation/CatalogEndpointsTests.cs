using System;
using System.Net;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Xunit;
using Zentric.Api.Contracts;
using Zentric.Application.Catalog.Queries;
using Zentric.Tests.E2E;

namespace Zentric.Tests.Presentation
{
    public sealed class CatalogEndpointsTests : IClassFixture<ZentricApiFactory>
    {
        private readonly ZentricApiFactory _factory;
        private readonly ApiActors _actors;

        public CatalogEndpointsTests(ZentricApiFactory factory)
        {
            _factory = factory;
            _actors = new ApiActors(_factory);
        }

        /// <summary>
        /// Objetivo: Validar que un llamado sin token a /api/catalog/home retorne 200 OK permitiendo navegación pública a visitantes.
        /// </summary>
        [Fact(DisplayName = "1. GET /api/catalog/home sin autenticación responde 200 OK y estructura válida para visitantes")]
        public async Task GetCatalogHome_NoToken_ReturnsOk()
        {
            await _actors.EnsureSeededAsync();
            var client = _factory.CreateClient();
            var response = await client.GetAsync("/api/catalog/home");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var content = await response.Content.ReadFromJsonAsync<CatalogHomeDto>();
            Assert.NotNull(content);
            Assert.NotNull(content.Banners);
            Assert.NotNull(content.Categories);
            Assert.NotNull(content.OfficialStores);
            Assert.NotNull(content.FeaturedProducts);
        }

        /// <summary>
        /// Objetivo: Validar que un comprador autenticado obtenga la home del catálogo completa con banners, tiendas y productos.
        /// </summary>
        [Fact(DisplayName = "2. GET /api/catalog/home con comprador autenticado responde 200 OK y estructura válida")]
        public async Task GetCatalogHome_AuthenticatedBuyer_ReturnsOk()
        {
            await _actors.EnsureSeededAsync();
            var buyerClient = _actors.ClientFor("Buyer");

            var response = await buyerClient.GetAsync("/api/catalog/home");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var content = await response.Content.ReadFromJsonAsync<CatalogHomeDto>();
            Assert.NotNull(content);
            Assert.NotNull(content.Banners);
            Assert.NotNull(content.Categories);
            Assert.NotNull(content.OfficialStores);
            Assert.NotNull(content.FeaturedProducts);
        }

        /// <summary>
        /// Objetivo: Validar que GET /api/catalog/products devuelve productos con calificaciones reales sembradas.
        /// </summary>
        [Fact(DisplayName = "3. GET /api/catalog/products retorna lista de productos con métricas de calificación reales")]
        public async Task GetProducts_AuthenticatedBuyer_ReturnsProductsWithRatings()
        {
            await _actors.EnsureSeededAsync();
            var buyerClient = _actors.ClientFor("Buyer");

            var response = await buyerClient.GetAsync("/api/catalog/products");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var products = await response.Content.ReadFromJsonAsync<System.Collections.Generic.IReadOnlyList<ProductDto>>();
            Assert.NotNull(products);
            Assert.NotEmpty(products);

            // Verificar que al menos uno de los productos estrella contiene las métricas del seeder
            Assert.Contains(products, p => p.AverageRating > 0m && p.ReviewsCount > 0);
        }

        /// <summary>
        /// Objetivo: Validar que GET /api/catalog/products/{id} retorna la ficha técnica con AverageRating y ReviewsCount.
        /// </summary>
        [Fact(DisplayName = "4. GET /api/catalog/products/{id} retorna ficha técnica con calificación y reseñas")]
        public async Task GetProductById_AuthenticatedBuyer_ReturnsProductDetailWithRatings()
        {
            await _actors.EnsureSeededAsync();
            var buyerClient = _actors.ClientFor("Buyer");

            var listResponse = await buyerClient.GetAsync("/api/catalog/products");
            var products = await listResponse.Content.ReadFromJsonAsync<System.Collections.Generic.IReadOnlyList<ProductDto>>();
            Assert.NotNull(products);

            var target = System.Linq.Enumerable.FirstOrDefault(products, p => p.AverageRating > 0m)
                ?? System.Linq.Enumerable.First(products);

            var response = await buyerClient.GetAsync($"/api/catalog/products/{target.Id}");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var product = await response.Content.ReadFromJsonAsync<ProductDto>();
            Assert.NotNull(product);
            Assert.Equal(target.Id, product.Id);
            Assert.True(product.AverageRating >= 0m);
        }

        /// <summary>
        /// Objetivo: Validar que crear reseña sin autenticación responde 401 Unauthorized.
        /// </summary>
        [Fact(DisplayName = "5. POST /api/products/{id}/reviews sin token responde 401 Unauthorized")]
        public async Task CreateProductReview_NoToken_ReturnsUnauthorized()
        {
            var client = _factory.CreateClient();
            var request = new CreateProductReviewRequest(5, "Excelente!");
            var response = await client.PostAsJsonAsync($"/api/products/{Guid.NewGuid()}/reviews", request);

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        /// <summary>
        /// Objetivo: Validar que crear reseña para producto inexistente responde 404 NotFound.
        /// </summary>
        [Fact(DisplayName = "6. POST /api/products/{id}/reviews con producto inexistente responde 404 NotFound")]
        public async Task CreateProductReview_AuthenticatedBuyer_ProductNotFound_ReturnsNotFound()
        {
            await _actors.EnsureSeededAsync();
            var buyerClient = _actors.ClientFor("Buyer");

            var request = new CreateProductReviewRequest(5, "Excelente producto!");
            var response = await buyerClient.PostAsJsonAsync($"/api/products/{Guid.NewGuid()}/reviews", request);

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        /// <summary>
        /// Objetivo: Validar que un visitante anónimo sin token pueda consultar GET /api/catalog/products y recibir 200 OK.
        /// </summary>
        [Fact(DisplayName = "7. GET /api/catalog/products sin autenticación responde 200 OK para visitantes anónimos")]
        public async Task GetProducts_AnonymousVisitor_ReturnsOk()
        {
            await _actors.EnsureSeededAsync();
            var anonymousClient = _factory.CreateClient();

            var response = await anonymousClient.GetAsync("/api/catalog/products");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var products = await response.Content.ReadFromJsonAsync<System.Collections.Generic.IReadOnlyList<ProductDto>>();
            Assert.NotNull(products);
            Assert.NotEmpty(products);
        }

        /// <summary>
        /// Objetivo: Validar que un visitante anónimo sin token pueda consultar GET /api/catalog/products/paged y recibir 200 OK.
        /// </summary>
        [Fact(DisplayName = "8. GET /api/catalog/products/paged sin autenticación responde 200 OK con paginación")]
        public async Task GetProductsPaged_AnonymousVisitor_ReturnsOk()
        {
            await _actors.EnsureSeededAsync();
            var anonymousClient = _factory.CreateClient();

            var response = await anonymousClient.GetAsync("/api/catalog/products/paged?page=1&size=10");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var pagedResult = await response.Content.ReadFromJsonAsync<Zentric.Application.Common.Models.PagedResult<ProductDto>>();
            Assert.NotNull(pagedResult);
            Assert.NotEmpty(pagedResult.Items);
            Assert.True(pagedResult.TotalItems > 0);
        }

        /// <summary>
        /// Objetivo: Validar que un visitante anónimo sin token pueda consultar GET /api/catalog/products/{id} y recibir 200 OK.
        /// </summary>
        [Fact(DisplayName = "9. GET /api/catalog/products/{id} sin autenticación responde 200 OK")]
        public async Task GetProductById_AnonymousVisitor_ReturnsOk()
        {
            await _actors.EnsureSeededAsync();
            var anonymousClient = _factory.CreateClient();

            var listResponse = await anonymousClient.GetAsync("/api/catalog/products");
            var products = await listResponse.Content.ReadFromJsonAsync<System.Collections.Generic.IReadOnlyList<ProductDto>>();
            Assert.NotNull(products);
            var target = System.Linq.Enumerable.First(products);

            var response = await anonymousClient.GetAsync($"/api/catalog/products/{target.Id}");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var product = await response.Content.ReadFromJsonAsync<ProductDto>();
            Assert.NotNull(product);
            Assert.Equal(target.Id, product.Id);
        }

        /// <summary>
        /// Objetivo: Validar que GET /api/products/{id}/reviews sea público (AllowAnonymous) y retorne reseñas reales con autor y fotos.
        /// </summary>
        [Fact(DisplayName = "10. GET /api/products/{id}/reviews es público y retorna reseñas con autor, fotos y calificación")]
        public async Task GetProductReviews_Anonymous_ReturnsReviewsWithAuthorAndPhotos()
        {
            await _actors.EnsureSeededAsync();
            var anonymousClient = _factory.CreateClient();

            // Buscar un producto que tenga reviews (ej. MacBook Pro o Sony XM5 sembrados)
            var listResponse = await anonymousClient.GetAsync("/api/catalog/products");
            var products = await listResponse.Content.ReadFromJsonAsync<System.Collections.Generic.IReadOnlyList<ProductDto>>();
            Assert.NotNull(products);

            var productWithReviews = System.Linq.Enumerable.FirstOrDefault(products, p => p.ReviewsCount > 0)
                ?? System.Linq.Enumerable.First(products);

            var response = await anonymousClient.GetAsync($"/api/products/{productWithReviews.Id}/reviews");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var reviews = await response.Content.ReadFromJsonAsync<System.Collections.Generic.IReadOnlyList<Zentric.Application.Catalog.Commands.ReviewDto>>();
            Assert.NotNull(reviews);
            Assert.NotEmpty(reviews);

            var sample = reviews[0];
            Assert.True(sample.Rating >= 1 && sample.Rating <= 5);
            Assert.False(string.IsNullOrWhiteSpace(sample.BuyerName));
            Assert.NotNull(sample.ImageUrls);
        }

        /// <summary>
        /// Objetivo: Validar que POST /api/products/{id}/reviews guarde reseñas con fotos e infiera el nombre del comprador.
        /// </summary>
        [Fact(DisplayName = "11. POST /api/products/{id}/reviews persiste fotos y asigna autor al calificar")]
        public async Task CreateProductReview_WithPhotos_PersistsSuccessfully()
        {
            await _actors.EnsureSeededAsync();
            var buyerClient = _actors.ClientFor("Buyer");

            var listResponse = await buyerClient.GetAsync("/api/catalog/products");
            var products = await listResponse.Content.ReadFromJsonAsync<System.Collections.Generic.IReadOnlyList<ProductDto>>();
            Assert.NotNull(products);
            var target = System.Linq.Enumerable.First(products);

            var photos = new[] { "https://images.unsplash.com/photo-unboxing-1.jpg" };
            var request = new CreateProductReviewRequest(5, "Increíble empaque y sonido.", photos);

            var response = await buyerClient.PostAsJsonAsync($"/api/products/{target.Id}/reviews", request);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var created = await response.Content.ReadFromJsonAsync<Zentric.Application.Catalog.Commands.ReviewDto>();
            Assert.NotNull(created);
            Assert.Equal(5, created.Rating);
            Assert.Equal("Increíble empaque y sonido.", created.Comment);
            Assert.NotNull(created.ImageUrls);
            Assert.NotEmpty(created.ImageUrls);
            Assert.Equal(photos[0], created.ImageUrls[0]);
        }

        /// <summary>
        /// Objetivo: Validar que un visitante anónimo sin token pueda consultar GET /api/catalog/categories y recibir 200 OK.
        /// </summary>
        [Fact(DisplayName = "12. GET /api/catalog/categories sin autenticación responde 200 OK para visitantes")]
        public async Task GetCategories_AnonymousVisitor_ReturnsOk()
        {
            await _actors.EnsureSeededAsync();
            var anonymousClient = _factory.CreateClient();

            var response = await anonymousClient.GetAsync("/api/catalog/categories");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var categories = await response.Content.ReadFromJsonAsync<System.Collections.Generic.IReadOnlyList<CategoryDto>>();
            Assert.NotNull(categories);
            Assert.NotEmpty(categories);
        }

        /// <summary>
        /// Objetivo: Validar que un visitante anónimo sin token pueda consultar GET /api/catalog/products/hero y recibir 200 OK.
        /// </summary>
        [Fact(DisplayName = "13. GET /api/catalog/products/hero sin autenticación responde 200 OK para visitantes")]
        public async Task GetHeroProducts_AnonymousVisitor_ReturnsOk()
        {
            await _actors.EnsureSeededAsync();
            var anonymousClient = _factory.CreateClient();

            var response = await anonymousClient.GetAsync("/api/catalog/products/hero?count=4");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var heroProducts = await response.Content.ReadFromJsonAsync<System.Collections.Generic.IReadOnlyList<ProductDto>>();
            Assert.NotNull(heroProducts);
            Assert.NotEmpty(heroProducts);
        }
    }
}
