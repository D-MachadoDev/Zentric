using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace Zentric.Tests.E2E
{
    /// <summary>
    /// Bandeja de devoluciones verificada por HTTP real.
    ///
    /// El hueco más grave de los tres: sin bandeja, ni el Comprador puede ver lo que
    /// devolvio, ni el Vendedor puede ver lo que tiene que aprobar o rechazar, ni el Supervisor
    /// puede auditar. Un recurso que solo se abre por GUID no esta terminado.
    ///
    /// Y a la inversa: una bandeja que devolviera de mas seria peor que no haberla, porque filtrar en
    /// el cliente es una ilusion de seguridad.
    /// </summary>
    [Collection(ApiCollection.Name)]
    public sealed class ReturnListE2ETests
    {
        private readonly ZentricApiFactory _factory;

        public ReturnListE2ETests(ZentricApiFactory factory) => _factory = factory;

        /// <summary>
        /// El Vendedor ve la devolucion de SU variante: es la bandeja con la que decide si aprueba
        /// o rechaza. Si no la viera, el flujo de devoluciones no tendria bandeja de entrada.
        /// </summary>
        [Fact]
        public async Task Bandeja_ElVendedorVeLaDevolucionDeSuVariante()
        {
            var returnId = await RequestReturnAsync();

            using var client = _factory.Actors.ClientFor("Seller");
            using var response = await client.GetAsync("/api/returns");
            response.EnsureSuccessStatusCode();

            Assert.Contains(returnId, await ReadIdsAsync(response));
        }

        /// <summary>
        /// El Comprador ve SUS devoluciones, y el Supervisor y el Administrador ven todas: el
        /// Supervisor es de solo lectura y existe justamente para poder auditar.
        /// </summary>
        [Theory]
        [InlineData("Buyer")]
        [InlineData("Supervisor")]
        [InlineData("Admin")]
        public async Task Bandeja_CadaRolVeLoQueLeCorresponde(string actor)
        {
            var returnId = await RequestReturnAsync();

            using var client = _factory.Actors.ClientFor(actor);
            using var response = await client.GetAsync("/api/returns");
            response.EnsureSuccessStatusCode();

            Assert.Contains(returnId, await ReadIdsAsync(response));
        }

        /// <summary>
        /// La contraprueba: el segundo comprador NO ve la devolucion del primero. Es la que
        /// demuestra que el listado filtra de verdad y no solo que responde 200.
        /// </summary>
        [Fact]
        public async Task Bandeja_OtroCompradorNoVeDevolucionesAjenas()
        {
            var returnId = await RequestReturnAsync();

            using var client = _factory.Actors.ClientFor("Buyer2");
            using var response = await client.GetAsync("/api/returns");
            response.EnsureSuccessStatusCode();

            Assert.DoesNotContain(returnId, await ReadIdsAsync(response));
        }

        /// <summary>
        /// El filtro por estado separa lo pendiente de lo ya resuelto, que es como se trabaja la
        /// bandeja: primero lo que espera accion.
        /// </summary>
        [Fact]
        public async Task Bandeja_FiltraPorEstadoPorNombre()
        {
            var returnId = await RequestReturnAsync();

            using var client = _factory.Actors.ClientFor("Seller");

            using var requested = await client.GetAsync("/api/returns?status=Requested");
            requested.EnsureSuccessStatusCode();

            using var approved = await client.GetAsync("/api/returns?status=Approved");
            approved.EnsureSuccessStatusCode();

            Assert.Contains(returnId, await ReadIdsAsync(requested));
            Assert.DoesNotContain(returnId, await ReadIdsAsync(approved));
        }

        /// <summary>
        /// Un estado desconocido responde 400 en vez de devolver la bandeja completa: devolverla
        /// seria el peor fallo posible, porque el usuario creeria estar filtrando y veria de todo.
        /// </summary>
        [Fact]
        public async Task Bandeja_EstadoInvalidoResponde400()
        {
            using var client = _factory.Actors.ClientFor("Seller");

            using var response = await client.GetAsync("/api/returns?status=NoExisteEsteEstado");

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task Bandeja_SinTokenResponde401()
        {
            using var client = _factory.CreateClient();

            using var response = await client.GetAsync("/api/returns");

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
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

        private static async Task<List<Guid>> ReadIdsAsync(HttpResponseMessage response)
        {
            using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());

            return document.RootElement.EnumerateArray()
                .Select(row => row.GetProperty("id").GetGuid())
                .ToList();
        }
    }
}
