using System;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Xunit;
using Zentric.Api;
using Zentric.Tests.E2E;

namespace Zentric.Tests.E2E
{
    /// <summary>
    /// Tests de aislamiento de privacidad para "Vistos recientemente" (AD, ).
    /// Verifica que el historial de un usuario no se filtre a otro usuario.
    /// </summary>
    [Collection(ApiCollection.Name)]
    public class RecentlyViewedPrivacyTests
    {
        private readonly ZentricApiFactory _factory;
        private readonly ApiActors _actors;

        public RecentlyViewedPrivacyTests(ZentricApiFactory factory)
        {
            _factory = factory;
            _actors = factory.Actors;
        }

        [Fact]
        public async Task UserA_SeesOwnHistory_NotUserB()
        {
            await _actors.EnsureSeededAsync();
            using var client = _factory.CreateClient();

            var tokenA = _actors.Buyer.Token;
            var tokenB = _actors.Buyer2.Token;
            var sellerToken = _actors.Seller.Token;

            var productId = await CreatePublishedProduct(client, sellerToken);

            await TrackView(client, tokenA, productId);

            var historyA = await GetRecentlyViewed(client, tokenA);
            Assert.Contains(historyA, p => p.Id == productId);

            var historyB = await GetRecentlyViewed(client, tokenB);
            Assert.DoesNotContain(historyB, p => p.Id == productId);
        }

        [Fact]
        public async Task DifferentSellers_IsolatedHistories()
        {
            await _actors.EnsureSeededAsync();
            using var client = _factory.CreateClient();

            var tokenSellerA = _actors.Seller.Token;
            var tokenSellerB = _actors.Seller2.Token;

            var productA = await CreatePublishedProduct(client, tokenSellerA);
            var productB = await CreatePublishedProduct(client, tokenSellerB);

            await TrackView(client, tokenSellerA, productA);
            await TrackView(client, tokenSellerB, productB);

            var historyA = await GetRecentlyViewed(client, tokenSellerA);
            Assert.Contains(historyA, p => p.Id == productA);
            Assert.DoesNotContain(historyA, p => p.Id == productB);

            var historyB = await GetRecentlyViewed(client, tokenSellerB);
            Assert.Contains(historyB, p => p.Id == productB);
            Assert.DoesNotContain(historyB, p => p.Id == productA);
        }

        private static async Task<Guid> CreatePublishedProduct(HttpClient client, string sellerToken)
        {
            var request = new HttpRequestMessage(HttpMethod.Post, "/api/Catalog/products");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", sellerToken);
            request.Content = JsonContent.Create(new
            {
                name = $"Producto Test {Guid.NewGuid():N}",
                description = "Para test de aislamiento de privacidad",
                priceAmount = 1000,
                priceCurrency = "COP",
                type = "Physical",
                variants = new[] { new { sku = $"PRIV-{Guid.NewGuid():N}", attributes = new[] { new { name = "Default", value = "Standard" } } } }
            });
            var response = await client.SendAsync(request);
            response.EnsureSuccessStatusCode();
            var result = await response.Content.ReadFromJsonAsync<CreateProductResponse>();
            return result!.ProductId;
        }

        private static async Task TrackView(HttpClient client, string token, Guid productId)
        {
            var request = new HttpRequestMessage(HttpMethod.Post, $"/api/Catalog/products/{productId}/track-view");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            var response = await client.SendAsync(request);
            response.EnsureSuccessStatusCode();
        }

        private static async Task<GetRecentlyViewedResponse[]> GetRecentlyViewed(HttpClient client, string token)
        {
            var request = new HttpRequestMessage(HttpMethod.Get, "/api/Catalog/products/recently-viewed");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            var response = await client.SendAsync(request);
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadFromJsonAsync<GetRecentlyViewedResponse[]>() ?? Array.Empty<GetRecentlyViewedResponse>();
        }

        private class CreateProductResponse
        {
            public Guid ProductId { get; set; }
            public Guid[] VariantIds { get; set; } = Array.Empty<Guid>();
        }

        private class GetRecentlyViewedResponse
        {
            public Guid Id { get; set; }
            public string Name { get; set; } = "";
            public decimal Price { get; set; }
        }
    }
}
