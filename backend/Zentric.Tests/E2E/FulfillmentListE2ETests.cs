using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace Zentric.Tests.E2E
{
    /// <summary>
    /// Cola de despachos verificada por HTTP real.
    ///
    /// Antes de este listado, la pantalla de trabajo del Operador Logistico era inejecutable: no
    /// habia forma de descubrir que existia un despacho pendiente de empacar sin conocer el GUID.
    /// Un backend donde el recurso existe pero no se puede enumerar no esta terminado: el
    /// frontend no tiene de donde sacar la lista.
    ///
    /// Y a la inversa: un listado que devolviera de mas seria peor que no tenerlo, porque filtrar en
    /// el cliente es una ilusion de seguridad.
    /// </summary>
    [Collection(ApiCollection.Name)]
    public sealed class FulfillmentListE2ETests
    {
        private readonly ZentricApiFactory _factory;

        public FulfillmentListE2ETests(ZentricApiFactory factory) => _factory = factory;

        /// <summary>
        /// El Operador ve la cola completa. Es el caso que mas importa: es la pantalla con la que
        /// trabaja todos los dias.
        /// </summary>
        [Fact]
        public async Task Cola_ElOperadorVeLosDespachosPendientes()
        {
            var fulfillmentId = await CreateFulfillmentAsync();

            using var client = _factory.Actors.ClientFor("Operator");
            using var response = await client.GetAsync("/api/logistics/fulfillments?status=PendingPack");
            response.EnsureSuccessStatusCode();

            Assert.Contains(fulfillmentId, await ReadIdsAsync(response));
        }

        /// <summary>
        /// El Vendedor ve los suyos, que es lo unico que puede operar. Y el Comprador ve los
        /// despachos de SUS pedidos: el detalle ya se lo permitia, asi que el listado
        /// haciendo menos seria incoherente.
        /// </summary>
        [Fact]
        public async Task Cola_ElVendedorYElCompradorVenLoSuyo()
        {
            var fulfillmentId = await CreateFulfillmentAsync();

            using var seller = _factory.Actors.ClientFor("Seller");
            using var sellerResponse = await seller.GetAsync("/api/logistics/fulfillments");
            sellerResponse.EnsureSuccessStatusCode();
            Assert.Contains(fulfillmentId, await ReadIdsAsync(sellerResponse));

            using var buyer = _factory.Actors.ClientFor("Buyer");
            using var buyerResponse = await buyer.GetAsync("/api/logistics/fulfillments");
            buyerResponse.EnsureSuccessStatusCode();
            Assert.Contains(fulfillmentId, await ReadIdsAsync(buyerResponse));
        }

        /// <summary>
        /// El filtro por estado separa la cola: lo pendiente de empacar no es lo mismo que lo ya
        /// entregado, y sin esto el Operador no podria priorizar.
        /// </summary>
        [Fact]
        public async Task Cola_FiltraPorEstadoPorNombre()
        {
            var fulfillmentId = await CreateFulfillmentAsync();

            using var client = _factory.Actors.ClientFor("Operator");

            using var pending = await client.GetAsync("/api/logistics/fulfillments?status=PendingPack");
            pending.EnsureSuccessStatusCode();

            using var delivered = await client.GetAsync("/api/logistics/fulfillments?status=Delivered");
            delivered.EnsureSuccessStatusCode();

            Assert.Contains(fulfillmentId, await ReadIdsAsync(pending));
            Assert.DoesNotContain(fulfillmentId, await ReadIdsAsync(delivered));
        }

        /// <summary>
        /// Un estado desconocido responde 400 en vez de devolver la cola completa. Lo segundo
        /// seria el peor fallo posible: el Operador creeria estar filtrando y veria todo.
        /// </summary>
        [Fact]
        public async Task Cola_EstadoInvalidoResponde400()
        {
            using var client = _factory.Actors.ClientFor("Operator");

            using var response = await client.GetAsync("/api/logistics/fulfillments?status=NoExisteEsteEstado");

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task Cola_SinTokenResponde401()
        {
            using var client = _factory.CreateClient();

            using var response = await client.GetAsync("/api/logistics/fulfillments");

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
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

        private static async Task<List<Guid>> ReadIdsAsync(HttpResponseMessage response)
        {
            using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());

            return document.RootElement.EnumerateArray()
                .Select(row => row.GetProperty("id").GetGuid())
                .ToList();
        }
    }
}