using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace Zentric.Tests.E2E
{
    /// <summary>
    /// Ciclo de despacho completo por HTTP: los cinco estados del ADDENDUM Dominio 8.
    ///
    /// Antes de esto, el ciclo era IMPOSIBLE de completar por API: <c>Pack()</c> y
    /// <c>Deliver()</c> existian en el dominio con sus invariantes, pero ningun endpoint las
    /// llamaba. Un paquete se quedaba en Pendiente de Empaque para siempre, porque
    /// <c>Dispatch()</c> exige estar Packed, y ningun despacho llegaba a Delivered.
    ///
    /// La prueba recorre el ciclo entero en orden, que es justo lo que hace falta para que una
    /// transicion mal cableada rompa aqui y no en produccion.
    /// </summary>
    [Collection(ApiCollection.Name)]
    public sealed class FulfillmentLifecycleE2ETests
    {
        private readonly ZentricApiFactory _factory;

        public FulfillmentLifecycleE2ETests(ZentricApiFactory factory) => _factory = factory;

        [Fact]
        public async Task CicloCompleto_PaqueteSeEmpaquetaDespachaYEntrega()
        {
            var fulfillmentId = await CreateFulfillmentAsync();

            // 1. Nace en Pendiente de Empaque (ADDENDUM Dominio 8, estado 1).
            Assert.Equal("PendingPack", await StatusAsync(fulfillmentId));

            // 2. Empacado: listo para recoleccion.
            await ActAsync("Operator", fulfillmentId, "pack", HttpStatusCode.OK);
            Assert.Equal("Packed", await StatusAsync(fulfillmentId));

            // 3. Despachado: entregado a la transportadora.
            await ActAsync("Operator", fulfillmentId, "dispatch", HttpStatusCode.OK);
            Assert.Equal("Dispatched", await StatusAsync(fulfillmentId));

            // 4. Entregado. Solo el Operador puede cerrarlo (dictamen del Owner 2026-10-01).
            await ActAsync("Operator", fulfillmentId, "deliver", HttpStatusCode.OK);
            Assert.Equal("Delivered", await StatusAsync(fulfillmentId));
        }

        /// <summary>
        /// La invariante del dominio debe seguir valiendo a traves de HTTP: no se puede despachar
        /// sin haber empacado. Si el endpoint de despacho perdiera esa comprobacion, un paquete
        /// pasaria de Pendiente de Empaque a Despachado saltandose el empaque.
        /// </summary>
        [Fact]
        public async Task TransicionesInvalidas_SonRechazadasComoReglaDeNegocio()
        {
            var fulfillmentId = await CreateFulfillmentAsync();

            // Despeachar un paquete sin empacar.
            var early = await PostAsync("Operator", fulfillmentId, "dispatch");
            Assert.Equal(HttpStatusCode.BadRequest, early.StatusCode);

            // Entregar un paquete que no ha salido de bodega.
            var tooEarly = await PostAsync("Operator", fulfillmentId, "deliver");
            Assert.Equal(HttpStatusCode.BadRequest, tooEarly.StatusCode);
        }

        /// <summary>
        /// El Vendedor puede empacar y despachar su paquete, pero NO confirmar la entrega. Es la
        /// separacion que fija el dictamen del Owner: el vendedor certifica su propio empaque,
        /// no su propio servicio.
        /// </summary>
        [Fact]
        public async Task ElVendedor_NoConfirmaLaEntregaYResponde403()
        {
            var fulfillmentId = await CreateFulfillmentAsync();

            await ActAsync("Seller", fulfillmentId, "pack", HttpStatusCode.OK);
            await ActAsync("Seller", fulfillmentId, "dispatch", HttpStatusCode.OK);

            var forbidden = await PostAsync("Seller", fulfillmentId, "deliver");
            Assert.Equal(HttpStatusCode.Forbidden, forbidden.StatusCode);
        }

        /// <summary>
        /// El Comprador solo consulta. Tampoco puede empacar, ni despachar, ni cerrar la entrega.
        /// </summary>
        [Theory]
        [InlineData("pack")]
        [InlineData("dispatch")]
        [InlineData("deliver")]
        public async Task ElComprador_NoOperaElDespacho(string step)
        {
            var fulfillmentId = await CreateFulfillmentAsync();

            var forbidden = await PostAsync("Buyer", fulfillmentId, step);
            Assert.Equal(HttpStatusCode.Forbidden, forbidden.StatusCode);
        }

        /// <summary>
        /// Un paquete que ya se entrego no puede volver a entregarse, ni por el Operador.
        /// </summary>
        [Fact]
        public async Task EntregaRepetida_EsRechazada()
        {
            var fulfillmentId = await CreateFulfillmentAsync();

            await ActAsync("Operator", fulfillmentId, "pack", HttpStatusCode.OK);
            await ActAsync("Operator", fulfillmentId, "dispatch", HttpStatusCode.OK);
            await ActAsync("Operator", fulfillmentId, "deliver", HttpStatusCode.OK);

            var again = await PostAsync("Operator", fulfillmentId, "deliver");
            Assert.Equal(HttpStatusCode.BadRequest, again.StatusCode);
        }

        /// <summary>
        /// Un paquete ajeno responde 404, no 403. El vendedor no debe poder confirmar que el
        /// despacho de otro existe.
        /// </summary>
        [Fact]
        public async Task EmpaqueDePaqueteAjeno_Responde404()
        {
            var fulfillmentId = await CreateFulfillmentAsync();

            var response = await PostAsync("Seller2", fulfillmentId, "pack");
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        private async Task<Guid> CreateFulfillmentAsync()
        {
            var scenario = await _factory.PaidOrder.GetAsync();
            using var client = _factory.Actors.ClientFor("Seller");

            using var response = await client.PostAsJsonAsync("/api/logistics/fulfillment", new
            {
                customerOrderId = scenario.OrderId,
                vendorId = scenario.SellerId,
            });

            response.EnsureSuccessStatusCode();
            return Guid.Parse((await response.Content.ReadAsStringAsync()).Trim('"'));
        }

        private async Task<string> StatusAsync(Guid fulfillmentId)
        {
            using var client = _factory.Actors.ClientFor("Operator");

            using var response = await client.GetAsync($"/api/logistics/fulfillment/{fulfillmentId}");
            response.EnsureSuccessStatusCode();

            using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            return document.RootElement.GetProperty("status").GetString()!;
        }

        private async Task<HttpResponseMessage> PostAsync(string actor, Guid fulfillmentId, string step)
        {
            using var client = _factory.Actors.ClientFor(actor);

            return await client.PostAsync($"/api/logistics/fulfillment/{fulfillmentId}/{step}", content: null);
        }

        private async Task ActAsync(string actor, Guid fulfillmentId, string step, HttpStatusCode expected)
        {
            using var response = await PostAsync(actor, fulfillmentId, step);

            var body = await response.Content.ReadAsStringAsync();
            Assert.True(
                response.StatusCode == expected,
                $"{step} por {actor} debia responder {(int)expected} y respondio {(int)response.StatusCode}: {body}");
        }
    }
}