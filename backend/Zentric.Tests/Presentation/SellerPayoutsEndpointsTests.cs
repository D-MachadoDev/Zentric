using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Xunit;
using Zentric.Api.Contracts;
using Zentric.Tests.E2E;

namespace Zentric.Tests.Presentation
{
    public sealed class SellerPayoutsEndpointsTests : IClassFixture<ZentricApiFactory>
    {
        private readonly ZentricApiFactory _factory;
        private readonly ApiActors _actors;

        public SellerPayoutsEndpointsTests(ZentricApiFactory factory)
        {
            _factory = factory;
            _actors = new ApiActors(_factory);
        }

        /// <summary>
        /// Objetivo: Validar que peticiones sin autenticación a GET /api/seller/payouts/summary respondan 401 Unauthorized.
        /// </summary>
        [Fact(DisplayName = "1. GET /api/seller/payouts/summary sin autenticación responde 401 Unauthorized")]
        public async Task GetSummary_Anonymous_ReturnsUnauthorized()
        {
            var anonymousClient = _factory.CreateClient();
            var response = await anonymousClient.GetAsync("/api/seller/payouts/summary");
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        /// <summary>
        /// Objetivo: Validar que usuarios sin rol Vendedor reciban 403 Forbidden al consultar el resumen de pagos y saldo.
        /// </summary>
        [Fact(DisplayName = "2. GET /api/seller/payouts/summary con rol Comprador responde 403 Forbidden")]
        public async Task GetSummary_BuyerRole_ReturnsForbidden()
        {
            await _actors.EnsureSeededAsync();
            var buyerClient = _actors.ClientFor("Buyer");
            var response = await buyerClient.GetAsync("/api/seller/payouts/summary");
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        /// <summary>
        /// Objetivo: Validar que un vendedor autenticado obtenga el resumen de saldo con propiedades numéricas y moneda COP.
        /// </summary>
        [Fact(DisplayName = "3. GET /api/seller/payouts/summary con vendedor autenticado responde 200 OK con balance disponible")]
        public async Task GetSummary_SellerRole_ReturnsSummarySuccessfully()
        {
            await _actors.EnsureSeededAsync();
            var sellerClient = _actors.ClientFor("Seller");

            var response = await sellerClient.GetAsync("/api/seller/payouts/summary");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var summary = await response.Content.ReadFromJsonAsync<SellerPayoutSummaryDto>();
            Assert.NotNull(summary);
            Assert.Equal("COP", summary.Currency);
            Assert.True(summary.AvailableBalance >= 0);
            Assert.True(summary.AvailableCredit >= 0);
            Assert.True(summary.TotalSettled >= 0);
            Assert.True(summary.PendingOrdersCredit >= 0);
        }

        /// <summary>
        /// Objetivo: Validar que un vendedor autenticado pueda configurar y actualizar su cuenta bancaria de dispersión.
        /// </summary>
        [Fact(DisplayName = "4. PUT /api/seller/payouts/bank-account guarda y actualiza la cuenta bancaria del vendedor")]
        public async Task SaveBankAccount_ValidData_SavesSuccessfully()
        {
            await _actors.EnsureSeededAsync();
            var sellerClient = _actors.ClientFor("Seller");

            var request = new SaveSellerBankAccountRequest(
                BankName: "Bancolombia",
                AccountType: "Ahorros",
                AccountNumber: "912-884920-11",
                AccountHolderName: "TechStore Colombia S.A.S.",
                DocumentNumber: "901.442.118-4");

            var response = await sellerClient.PutAsJsonAsync("/api/seller/payouts/bank-account", request);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var bankDto = await response.Content.ReadFromJsonAsync<SellerBankAccountDto>();
            Assert.NotNull(bankDto);
            Assert.Equal("Bancolombia", bankDto.BankName);
            Assert.Equal("Ahorros", bankDto.AccountType);
            Assert.Equal("912-884920-11", bankDto.AccountNumber);
            Assert.Equal("TechStore Colombia S.A.S.", bankDto.AccountHolderName);

            // Verificar que ahora el summary incluya la cuenta bancaria configurada
            var summaryResponse = await sellerClient.GetAsync("/api/seller/payouts/summary");
            Assert.Equal(HttpStatusCode.OK, summaryResponse.StatusCode);
            var summary = await summaryResponse.Content.ReadFromJsonAsync<SellerPayoutSummaryDto>();
            Assert.NotNull(summary?.BankAccount);
            Assert.Equal("Bancolombia", summary.BankAccount.BankName);
        }

        /// <summary>
        /// Objetivo: Validar que PUT /api/seller/payouts/bank-account rechace campos obligatorios en blanco con 400 Bad Request.
        /// </summary>
        [Fact(DisplayName = "5. PUT /api/seller/payouts/bank-account con campos incompletos responde 400 Bad Request")]
        public async Task SaveBankAccount_MissingFields_ReturnsBadRequest()
        {
            await _actors.EnsureSeededAsync();
            var sellerClient = _actors.ClientFor("Seller");

            var invalidRequest = new SaveSellerBankAccountRequest(
                BankName: "",
                AccountType: "Ahorros",
                AccountNumber: "",
                AccountHolderName: "TechStore",
                DocumentNumber: "123");

            var response = await sellerClient.PutAsJsonAsync("/api/seller/payouts/bank-account", invalidRequest);
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        /// <summary>
        /// Objetivo: Validar que POST /api/seller/payouts/request rechace montos menores o iguales a cero.
        /// </summary>
        [Fact(DisplayName = "6. POST /api/seller/payouts/request con monto cero o negativo responde 400 Bad Request")]
        public async Task RequestPayout_InvalidAmount_ReturnsBadRequest()
        {
            await _actors.EnsureSeededAsync();
            var sellerClient = _actors.ClientFor("Seller");

            var invalidRequest = new RequestPayoutRequest(Amount: 0m, Currency: "COP");
            var response = await sellerClient.PostAsJsonAsync("/api/seller/payouts/request", invalidRequest);
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        /// <summary>
        /// Objetivo: Validar que POST /api/seller/payouts/request rechace solicitudes que excedan el saldo disponible del vendedor.
        /// </summary>
        [Fact(DisplayName = "7. POST /api/seller/payouts/request con monto superior al saldo disponible responde 400 Bad Request")]
        public async Task RequestPayout_ExceedsAvailableBalance_ReturnsBadRequest()
        {
            await _actors.EnsureSeededAsync();
            var sellerClient = _actors.ClientFor("Seller");

            var summaryResponse = await sellerClient.GetAsync("/api/seller/payouts/summary");
            var summary = await summaryResponse.Content.ReadFromJsonAsync<SellerPayoutSummaryDto>();
            var available = summary?.AvailableBalance ?? 0m;

            var excessiveAmount = available + 999_999_999m;
            var request = new RequestPayoutRequest(Amount: excessiveAmount, Currency: "COP");

            var response = await sellerClient.PostAsJsonAsync("/api/seller/payouts/request", request);
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        /// <summary>
        /// Objetivo: Validar que GET /api/seller/payouts/history devuelva el historial de retiros del vendedor autenticado.
        /// </summary>
        [Fact(DisplayName = "8. GET /api/seller/payouts/history con vendedor autenticado responde 200 OK con lista de transacciones")]
        public async Task GetHistory_SellerRole_ReturnsHistoryListSuccessfully()
        {
            await _actors.EnsureSeededAsync();
            var sellerClient = _actors.ClientFor("Seller");

            var response = await sellerClient.GetAsync("/api/seller/payouts/history");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var history = await response.Content.ReadFromJsonAsync<IReadOnlyList<SellerPayoutDto>>();
            Assert.NotNull(history);
        }
    }
}
