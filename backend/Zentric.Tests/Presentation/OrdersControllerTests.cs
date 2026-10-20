using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Zentric.Api;
using Zentric.Api.Contracts;
using Zentric.Application.Orders.Commands;
using Zentric.Tests.E2E;

namespace Zentric.Tests.Presentation
{
    public sealed class OrdersControllerTests : IClassFixture<ZentricApiFactory>
    {
        private readonly ZentricApiFactory _factory;
        private readonly ApiActors _actors;

        public OrdersControllerTests(ZentricApiFactory factory)
        {
            _factory = factory;
            _actors = new ApiActors(_factory);
        }

        [Fact]
        public async Task RemoveOrderItem_NoToken_ReturnsUnauthorized()
        {
            var client = _factory.CreateClient();
            var response = await client.DeleteAsync($"/api/orders/{Guid.NewGuid()}/items/{Guid.NewGuid()}");
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task RemoveOrderItem_SellerRole_ReturnsForbidden()
        {
            await _actors.EnsureSeededAsync();
            var sellerClient = _actors.ClientFor("Seller");

            var response = await sellerClient.DeleteAsync($"/api/orders/{Guid.NewGuid()}/items/{Guid.NewGuid()}");
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }
    }
}