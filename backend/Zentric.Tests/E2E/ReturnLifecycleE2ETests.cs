using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Npgsql;
using Xunit;

namespace Zentric.Tests.E2E
{
    /// <summary>
    /// Ciclo de devoluciones completo por HTTP: los cuatro estados del ADDENDUM Dominio 10.
    ///
    /// Antes de esto, dos de los cuatro estados eran INALCANZABLES por API: <c>Reject()</c> y
    /// <c>MarkAsRefunded()</c> existian en el dominio, pero ningun comando ni endpoint los
    /// llamaba. Una devolucion podia solicitarse, inspeccionarse y aprobarse... y ahi se quedaba,
    /// para siempre. Peor: <c>PaymentReceipt.Refund()</c> estaba implementado con sus invariantes
    /// e idempotencia y **nadie lo invocaba nunca**, o sea que el dinero no llegaba al comprador.
    /// </summary>
    [Collection(ApiCollection.Name)]
    public sealed class ReturnLifecycleE2ETests
    {
        private readonly ZentricApiFactory _factory;

        public ReturnLifecycleE2ETests(ZentricApiFactory factory) => _factory = factory;

        /// <summary>
        /// Camino de rechazo: solicitada → rechazada, por el Vendedor del producto. El rechazo
        /// cierra la devolucion sin tocar el dinero, porque nunca hubo cobro que devolver.
        /// </summary>
        [Fact]
        public async Task CaminoDeRechazo_SolicitadaPasaARechazada()
        {
            var returnId = await RequestReturnAsync();

            Assert.Equal("Requested", await StatusAsync(returnId));

            await ActAsync("Seller", returnId, "reject", HttpStatusCode.OK);
            Assert.Equal("Rejected", await StatusAsync(returnId));
        }

        /// <summary>
        /// Camino de reembolso: solicitada → aprobada → reembolsada. El ultimo paso lo ejecuta el
        /// Administrador y es el que acredita el comprobante de pago del pedido.
        /// </summary>
        [Fact]
        public async Task CaminoDeReembolso_LlegaHastaReembolsada()
        {
            var returnId = await RequestReturnAsync();

            await ActAsync("Seller", returnId, "approve", HttpStatusCode.OK);
            Assert.Equal("Approved", await StatusAsync(returnId));

            await ActAsync("Admin", returnId, "refund", HttpStatusCode.OK);
            Assert.Equal("Refunded", await StatusAsync(returnId));
        }

        /// <summary>
        /// El reembolso es dinero que sale de la plataforma, asi que queda en el Administrador
        /// (dictamen del Owner 2026-10-01). Ni el Vendedor que aprueba el reingreso del producto,
        /// ni el Operador, ni el Supervisor pueden liberar el dinero.
        /// </summary>
        [Theory]
        [InlineData("Seller")]
        [InlineData("Operator")]
        [InlineData("Supervisor")]
        [InlineData("Buyer")]
        public async Task Reembolso_SoloElAdministradorYElRestoResponde403(string actor)
        {
            var returnId = await RequestReturnAsync();
            await ActAsync("Seller", returnId, "approve", HttpStatusCode.OK);

            var forbidden = await PostAsync(actor, returnId, "refund");
            Assert.Equal(HttpStatusCode.Forbidden, forbidden.StatusCode);
        }

        /// <summary>
        /// El rechazo es del Vendedor del producto, igual que la aprobacion. El Comprador no puede
        /// rechazar su propia devolucion.
        /// </summary>
        [Theory]
        [InlineData("Buyer")]
        [InlineData("Operator")]
        [InlineData("Admin")]
        public async Task Rechazo_NoLoPuedeElCompradorNiElOperador(string actor)
        {
            var returnId = await RequestReturnAsync();

            var forbidden = await PostAsync(actor, returnId, "reject");
            Assert.Equal(HttpStatusCode.Forbidden, forbidden.StatusCode);
        }

        /// <summary>
        /// El ciclo solo avanza hacia adelante. Una devolucion ya aprobada no puede rechazarse: si
        /// fuera posible, el producto volveria al stock y el comprador tendria el dinero, o sea una
        /// devolucion cobrada dos veces por caminos distintos.
        /// </summary>
        [Fact]
        public async Task RechazarUnaDevolucionAprobada_EsRechazado()
        {
            var returnId = await RequestReturnAsync();
            await ActAsync("Seller", returnId, "approve", HttpStatusCode.OK);

            var tooLate = await PostAsync("Seller", returnId, "reject");
            Assert.Equal(HttpStatusCode.BadRequest, tooLate.StatusCode);
        }

        /// <summary>
        /// Reembolsar sin haber aprobado antes es imposible: el dinero se libera contra una
        /// devolucion que el Vendedor todavia no ha aceptado.
        /// </summary>
        [Fact]
        public async Task ReembolsarSinAprobar_EsRechazado()
        {
            var returnId = await RequestReturnAsync();

            var tooEarly = await PostAsync("Admin", returnId, "refund");
            Assert.Equal(HttpStatusCode.BadRequest, tooEarly.StatusCode);
        }

        /// <summary>
        /// Un vendedor no rechaza la devolucion de otro: 404, para no confirmar que existe.
        /// </summary>
        [Fact]
        public async Task RechazoDeDevolucionAjena_Responde404()
        {
            var returnId = await RequestReturnAsync();

            var response = await PostAsync("Seller2", returnId, "reject");
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        /// <summary>
        /// El punto critico del reembolso: no basta con que la devolucion pase a "Reembolsada".
        /// El comprobante de pago del pedido tiene que quedar acreditado, porque
        /// <c>PaymentReceipt.Refund()</c> estaba implementado en el dominio y nunca se llamaba.
        /// Esta prueba falla si alguien deja el comando marcando solo el estado.
        /// </summary>
        [Fact]
        public async Task Reembolso_AcreditaElComprobanteDePagoDelPedido()
        {
            var returnId = await RequestReturnAsync();
            await ActAsync("Seller", returnId, "approve", HttpStatusCode.OK);

            var refundedBefore = await RefundedAmountAsync();
            Assert.Equal(0m, refundedBefore);

            await ActAsync("Admin", returnId, "refund", HttpStatusCode.OK);

            // El pedido se pago 20.000 (2 x 10.000), asi que el credito debe ser exactamente eso.
            var refundedAfter = await RefundedAmountAsync();
            Assert.Equal(20000m, refundedAfter);
        }

        /// <summary>
        /// El reembolso es idempotente en el dominio: un comprobante ya reembolsado conserva su
        /// credito. A traves de HTTP la segunda llamada debe rechazarse por la transicion de estado,
        /// no duplicar el dinero. Es el intento de doble reembolso, que es el fraude clasico.
        /// </summary>
        [Fact]
        public async Task DobleReembolso_NoDuplicaElCredito()
        {
            var returnId = await RequestReturnAsync();
            await ActAsync("Seller", returnId, "approve", HttpStatusCode.OK);
            await ActAsync("Admin", returnId, "refund", HttpStatusCode.OK);

            var second = await PostAsync("Admin", returnId, "refund");
            Assert.Equal(HttpStatusCode.BadRequest, second.StatusCode);

            Assert.Equal(20000m, await RefundedAmountAsync());
        }

        /// <summary>
        /// Lee el importe reembolsado del comprobante del pedido. Se consulta la base directamente
        /// porque no hay endpoint que exponga el comprobante, y esta es la unica forma de
        /// comprobar que el dinero se movio de verdad y no solo el estado del agregado.
        /// </summary>
        private async Task<decimal> RefundedAmountAsync()
        {
            var scenario = await _factory.PaidOrder.GetAsync();
            await using var connection = new NpgsqlConnection(_factory.ConnectionString);
            await connection.OpenAsync();

            await using var command = new NpgsqlCommand(
                "SELECT \"RefundedAmount\" FROM \"PaymentReceipts\" WHERE \"OrderId\" = @orderId",
                connection);
            command.Parameters.AddWithValue("orderId", scenario.OrderId);

            var value = await command.ExecuteScalarAsync();
            return value is null or DBNull ? 0m : Convert.ToDecimal(value);
        }

        private async Task<Guid> RequestReturnAsync()
        {
            var scenario = await _factory.PaidOrder.GetAsync();
            using var client = _factory.Actors.ClientFor("Buyer");

            using var response = await client.PostAsJsonAsync("/api/returns/request", new
            {
                customerOrderId = scenario.OrderId,
                variantId = scenario.VariantId,
                warehouseId = scenario.WarehouseId,
                quantity = 1,
                productType = "Physical",
            });

            response.EnsureSuccessStatusCode();
            return Guid.Parse((await response.Content.ReadAsStringAsync()).Trim('"'));
        }

        private async Task<string> StatusAsync(Guid returnId)
        {
            using var client = _factory.Actors.ClientFor("Admin");

            using var response = await client.GetAsync($"/api/returns/{returnId}");
            response.EnsureSuccessStatusCode();

            using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            return document.RootElement.GetProperty("status").GetString()!;
        }

        private async Task<HttpResponseMessage> PostAsync(string actor, Guid returnId, string step, object? body = null)
        {
            using var client = _factory.Actors.ClientFor(actor);

            // Ojo: `approve` recibe un ApproveReturnCommand en el cuerpo. Sin cuerpo, MVC responde
            // 415 Unsupported Media Type ANTES de mirar la autorizacion, y una prueba de permisos
            // que espera 403 se confundiria con un fallo de transporte. Por eso el cuerpo se pasa
            // explicito donde hace falta y el resto va sin el.
            return body is null
                ? await client.PostAsync($"/api/returns/{returnId}/{step}", content: null)
                : await client.PostAsJsonAsync($"/api/returns/{returnId}/{step}", body);
        }

        /// <summary>Aprueba con el cuerpo que exige el endpoint, que es distinto del de los demas pasos.</summary>
        private Task<HttpResponseMessage> ApproveAsync(Guid returnId) =>
            PostAsync("Seller", returnId, "approve", new { returnRequestId = returnId, isSameWarehouseAndVendor = true });

        private async Task ActAsync(string actor, Guid returnId, string step, HttpStatusCode expected)
        {
            using var response = step == "approve"
                ? await ApproveAsync(returnId)
                : await PostAsync(actor, returnId, step);

            var body = await response.Content.ReadAsStringAsync();
            Assert.True(
                response.StatusCode == expected,
                $"{step} por {actor} debia responder {(int)expected} y respondio {(int)response.StatusCode}: {body}");
        }
    }
}