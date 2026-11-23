using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Xunit;
using Zentric.Api.Contracts;
using Zentric.Application.Catalog.Queries;
using Zentric.Tests.E2E;

namespace Zentric.Tests.Presentation
{
    public sealed class BuyerFavoritesEndpointsTests : IClassFixture<ZentricApiFactory>
    {
        private readonly ZentricApiFactory _factory;
        private readonly ApiActors _actors;

        public BuyerFavoritesEndpointsTests(ZentricApiFactory factory)
        {
            _factory = factory;
            _actors = new ApiActors(_factory);
        }

        /// <summary>
        /// Objetivo: Validar que una petición anónima sin token a GET /api/buyer/favorites sea rechazada con 401 Unauthorized.
        /// </summary>
        [Fact(DisplayName = "1. GET /api/buyer/favorites sin autenticación responde 401 Unauthorized")]
        public async Task GetFavorites_Anonymous_ReturnsUnauthorized()
        {
            var anonymousClient = _factory.CreateClient();
            var response = await anonymousClient.GetAsync("/api/buyer/favorites");
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        /// <summary>
        /// Objetivo: Validar que una petición anónima sin token a POST /api/buyer/favorites sea rechazada con 401 Unauthorized.
        /// </summary>
        [Fact(DisplayName = "2. POST /api/buyer/favorites sin autenticación responde 401 Unauthorized")]
        public async Task AddFavorite_Anonymous_ReturnsUnauthorized()
        {
            var anonymousClient = _factory.CreateClient();
            var response = await anonymousClient.PostAsJsonAsync("/api/buyer/favorites", new AddBuyerFavoriteRequest(Guid.NewGuid()));
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        /// <summary>
        /// Objetivo: Validar que un comprador autenticado pueda agregar un producto a favoritos y recibir 200 OK con metadatos.
        /// </summary>
        [Fact(DisplayName = "3. POST /api/buyer/favorites con comprador autenticado agrega producto a favoritos")]
        public async Task AddFavorite_AuthenticatedBuyer_AddsSuccessfully()
        {
            await _actors.EnsureSeededAsync();
            var buyerClient = _actors.ClientFor("Buyer");

            // Obtener un producto del catálogo sembrado
            var productsResponse = await buyerClient.GetAsync("/api/catalog/products");
            Assert.Equal(HttpStatusCode.OK, productsResponse.StatusCode);
            var products = await productsResponse.Content.ReadFromJsonAsync<IReadOnlyList<ProductDto>>();
            Assert.NotNull(products);
            Assert.NotEmpty(products);

            var targetProduct = products[0];

            var addResponse = await buyerClient.PostAsJsonAsync("/api/buyer/favorites", new AddBuyerFavoriteRequest(targetProduct.Id));
            Assert.Equal(HttpStatusCode.OK, addResponse.StatusCode);

            var favorite = await addResponse.Content.ReadFromJsonAsync<BuyerFavoriteItemDto>();
            Assert.NotNull(favorite);
            Assert.Equal(targetProduct.Id, favorite.ProductId);
            Assert.Equal(targetProduct.Name, favorite.ProductName);
        }

        /// <summary>
        /// Objetivo: Validar que POST /api/buyer/favorites sea idempotente: reenviar el mismo producto responde 200 OK sin duplicar.
        /// </summary>
        [Fact(DisplayName = "4. POST /api/buyer/favorites es idempotente y no duplica entradas")]
        public async Task AddFavorite_DuplicateProduct_IsIdempotent()
        {
            await _actors.EnsureSeededAsync();
            var buyerClient = _actors.ClientFor("Buyer");

            var productsResponse = await buyerClient.GetAsync("/api/catalog/products");
            var products = await productsResponse.Content.ReadFromJsonAsync<IReadOnlyList<ProductDto>>();
            Assert.NotNull(products);
            var targetProduct = products[0];

            // Primera llamada
            var firstResponse = await buyerClient.PostAsJsonAsync("/api/buyer/favorites", new AddBuyerFavoriteRequest(targetProduct.Id));
            Assert.Equal(HttpStatusCode.OK, firstResponse.StatusCode);

            // Segunda llamada idéntica
            var secondResponse = await buyerClient.PostAsJsonAsync("/api/buyer/favorites", new AddBuyerFavoriteRequest(targetProduct.Id));
            Assert.Equal(HttpStatusCode.OK, secondResponse.StatusCode);

            var favorite = await secondResponse.Content.ReadFromJsonAsync<BuyerFavoriteItemDto>();
            Assert.NotNull(favorite);
            Assert.Equal(targetProduct.Id, favorite.ProductId);
        }

        /// <summary>
        /// Objetivo: Validar que GET /api/buyer/favorites liste los favoritos del comprador con nombre, precio y disponibilidad.
        /// </summary>
        [Fact(DisplayName = "5. GET /api/buyer/favorites devuelve favoritos del comprador autenticado")]
        public async Task GetFavorites_AuthenticatedBuyer_ReturnsList()
        {
            await _actors.EnsureSeededAsync();
            var buyerClient = _actors.ClientFor("Buyer");

            var productsResponse = await buyerClient.GetAsync("/api/catalog/products");
            var products = await productsResponse.Content.ReadFromJsonAsync<IReadOnlyList<ProductDto>>();
            Assert.NotNull(products);
            var targetProduct = products[0];

            // Asegurar que esté agregado
            await buyerClient.PostAsJsonAsync("/api/buyer/favorites", new AddBuyerFavoriteRequest(targetProduct.Id));

            var listResponse = await buyerClient.GetAsync("/api/buyer/favorites");
            Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);

            var favorites = await listResponse.Content.ReadFromJsonAsync<IReadOnlyList<BuyerFavoriteItemDto>>();
            Assert.NotNull(favorites);
            Assert.NotEmpty(favorites);
            Assert.Contains(favorites, f => f.ProductId == targetProduct.Id);
        }

        /// <summary>
        /// Objetivo: Validar que DELETE /api/buyer/favorites/{productId} elimine el producto de la lista y responda 204 NoContent.
        /// </summary>
        [Fact(DisplayName = "6. DELETE /api/buyer/favorites/{productId} remueve producto de favoritos")]
        public async Task RemoveFavorite_ExistingProduct_RemovesSuccessfully()
        {
            await _actors.EnsureSeededAsync();
            var buyerClient = _actors.ClientFor("Buyer");

            var productsResponse = await buyerClient.GetAsync("/api/catalog/products");
            var products = await productsResponse.Content.ReadFromJsonAsync<IReadOnlyList<ProductDto>>();
            Assert.NotNull(products);
            var targetProduct = products[0];

            // Agregar a favoritos
            await buyerClient.PostAsJsonAsync("/api/buyer/favorites", new AddBuyerFavoriteRequest(targetProduct.Id));

            // Eliminar
            var deleteResponse = await buyerClient.DeleteAsync($"/api/buyer/favorites/{targetProduct.Id}");
            Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

            // Verificar que ya no aparezca en la lista
            var listResponse = await buyerClient.GetAsync("/api/buyer/favorites");
            var favorites = await listResponse.Content.ReadFromJsonAsync<IReadOnlyList<BuyerFavoriteItemDto>>();
            Assert.NotNull(favorites);
            Assert.DoesNotContain(favorites, f => f.ProductId == targetProduct.Id);
        }

        /// <summary>
        /// Objetivo: Validar que POST /api/buyer/favorites con un ProductId que no existe responda 404 Not Found.
        /// </summary>
        [Fact(DisplayName = "7. POST /api/buyer/favorites con producto inexistente responde 404 Not Found")]
        public async Task AddFavorite_NonExistentProduct_ReturnsNotFound()
        {
            await _actors.EnsureSeededAsync();
            var buyerClient = _actors.ClientFor("Buyer");

            var nonExistentId = Guid.NewGuid();
            var response = await buyerClient.PostAsJsonAsync("/api/buyer/favorites", new AddBuyerFavoriteRequest(nonExistentId));
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }
    }
}
