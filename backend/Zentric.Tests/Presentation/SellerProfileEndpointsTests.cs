using System;
using System.Net;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Xunit;
using Zentric.Api.Contracts;
using Zentric.Tests.E2E;

namespace Zentric.Tests.Presentation
{
    public sealed class SellerProfileEndpointsTests : IClassFixture<ZentricApiFactory>
    {
        private readonly ZentricApiFactory _factory;
        private readonly ApiActors _actors;

        public SellerProfileEndpointsTests(ZentricApiFactory factory)
        {
            _factory = factory;
            _actors = new ApiActors(_factory);
        }

        /// <summary>
        /// Objetivo: Validar que peticiones sin autenticación a GET /api/seller/profile respondan 401 Unauthorized.
        /// </summary>
        [Fact(DisplayName = "1. GET /api/seller/profile sin autenticación responde 401 Unauthorized")]
        public async Task GetProfile_Anonymous_ReturnsUnauthorized()
        {
            var anonymousClient = _factory.CreateClient();
            var response = await anonymousClient.GetAsync("/api/seller/profile");
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        /// <summary>
        /// Objetivo: Validar que usuarios sin rol Vendedor reciban 403 Forbidden al consultar el perfil de vendedor.
        /// </summary>
        [Fact(DisplayName = "2. GET /api/seller/profile con rol Comprador responde 403 Forbidden")]
        public async Task GetProfile_BuyerRole_ReturnsForbidden()
        {
            await _actors.EnsureSeededAsync();
            var buyerClient = _actors.ClientFor("Buyer");
            var response = await buyerClient.GetAsync("/api/seller/profile");
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        /// <summary>
        /// Objetivo: Validar que un vendedor autenticado obtenga su perfil de tienda (creado automáticamente si no existe).
        /// </summary>
        [Fact(DisplayName = "3. GET /api/seller/profile con vendedor autenticado responde 200 OK con datos de tienda")]
        public async Task GetProfile_SellerRole_ReturnsProfileSuccessfully()
        {
            await _actors.EnsureSeededAsync();
            var sellerClient = _actors.ClientFor("Seller");

            var response = await sellerClient.GetAsync("/api/seller/profile");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var profile = await response.Content.ReadFromJsonAsync<SellerProfileDto>();
            Assert.NotNull(profile);
            Assert.NotEqual(Guid.Empty, profile.Id);
            Assert.False(string.IsNullOrWhiteSpace(profile.StoreName));
        }

        /// <summary>
        /// Objetivo: Validar que un vendedor autenticado pueda actualizar el nombre comercial y logotipo de su tienda.
        /// </summary>
        [Fact(DisplayName = "4. PUT /api/seller/profile actualiza nombre y logotipo de la tienda exitosamente")]
        public async Task UpdateProfile_ValidRequest_UpdatesAndReturns200OK()
        {
            await _actors.EnsureSeededAsync();
            var sellerClient = _actors.ClientFor("Seller");

            var updateRequest = new UpdateSellerProfileRequest(
                StoreName: "Tienda Oficial Élite 2026",
                LogoUrl: "https://r2.zentric.com/logos/elite-store.png");

            var updateResponse = await sellerClient.PutAsJsonAsync("/api/seller/profile", updateRequest);
            Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);

            var updatedProfile = await updateResponse.Content.ReadFromJsonAsync<SellerProfileDto>();
            Assert.NotNull(updatedProfile);
            Assert.Equal("Tienda Oficial Élite 2026", updatedProfile.StoreName);
            Assert.Equal("https://r2.zentric.com/logos/elite-store.png", updatedProfile.LogoUrl);

            // Verificar persistencia volviendo a consultar con GET
            var getResponse = await sellerClient.GetAsync("/api/seller/profile");
            Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);
            var reloadedProfile = await getResponse.Content.ReadFromJsonAsync<SellerProfileDto>();
            Assert.NotNull(reloadedProfile);
            Assert.Equal("Tienda Oficial Élite 2026", reloadedProfile.StoreName);
        }

        /// <summary>
        /// Objetivo: Validar que PUT /api/seller/profile rechace nombres de tienda vacíos con 400 Bad Request.
        /// </summary>
        [Fact(DisplayName = "5. PUT /api/seller/profile con nombre de tienda vacío responde 400 Bad Request")]
        public async Task UpdateProfile_EmptyStoreName_ReturnsBadRequest()
        {
            await _actors.EnsureSeededAsync();
            var sellerClient = _actors.ClientFor("Seller");

            var invalidRequest = new UpdateSellerProfileRequest(
                StoreName: "",
                LogoUrl: "https://example.com/logo.png");

            var response = await sellerClient.PutAsJsonAsync("/api/seller/profile", invalidRequest);
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        /// <summary>
        /// Objetivo: Validar que PUT /api/seller/profile rechace nombres de tienda que excedan 150 caracteres.
        /// </summary>
        [Fact(DisplayName = "6. PUT /api/seller/profile con nombre de más de 150 caracteres responde 400 Bad Request")]
        public async Task UpdateProfile_StoreNameExceedsLimit_ReturnsBadRequest()
        {
            await _actors.EnsureSeededAsync();
            var sellerClient = _actors.ClientFor("Seller");

            var longName = new string('A', 151);
            var invalidRequest = new UpdateSellerProfileRequest(
                StoreName: longName,
                LogoUrl: null);

            var response = await sellerClient.PutAsJsonAsync("/api/seller/profile", invalidRequest);
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }
    }
}
