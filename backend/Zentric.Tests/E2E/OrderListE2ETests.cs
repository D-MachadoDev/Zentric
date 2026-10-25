using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace Zentric.Tests.E2E
{
    /// <summary>
    /// Listado de pedidos verificado por HTTP real.
    ///
    /// El hueco más duro para el frontend: sin listado, "mis pedidos", "pedidos por
    /// despachar" y "pedidos del comprador" eran pantallas imposibles de construir. Solo se podia
    /// abrir un pedido si ya se conocia su GUID.
    ///
    /// Lo que se comprueba es lo importante: que el listado EXISTE y que cada rol ve lo suyo y
    /// nada mas. Un listado que devolviera de mas seria peor que no tenerlo, porque filtrar en el
    /// cliente es una illusion de seguridad.
    /// </summary>
    [Collection(ApiCollection.Name)]
    public sealed class OrderListE2ETests
    {
        private readonly ZentricApiFactory _factory;

        public OrderListE2ETests(ZentricApiFactory factory) => _factory = factory;

        [Fact]
        public async Task Listado_ElCompradorSoloVeSusPedidos()
        {
            var mine = await _factory.PaidOrder.GetAsync();

            using var client = _factory.Actors.ClientFor("Buyer");
            using var response = await client.GetAsync("/api/Orders");
            response.EnsureSuccessStatusCode();

            Assert.Contains(mine.OrderId, await ReadIdsAsync(response));
        }

        /// <summary>
        /// El segundo comprador NO ve el pedido del primero. Es la contraprueba que demuestra que
        /// el listado filtra de verdad: si devolviera todo y el frontend filtrara, aqui pasaria.
        /// </summary>
        [Fact]
        public async Task Listado_OtroCompradorNoVePedidosAjenos()
        {
            var mine = await _factory.PaidOrder.GetAsync();

            using var client = _factory.Actors.ClientFor("Buyer2");
            using var response = await client.GetAsync("/api/Orders");
            response.EnsureSuccessStatusCode();

            Assert.DoesNotContain(mine.OrderId, await ReadIdsAsync(response));
        }

        /// <summary>
        /// <summary>
        /// El Vendedor ve el pedido porque tiene una linea suya, pero del total solo ve SU subtotal
        /// y el BuyerId le llega VACIO (null): identificar al cliente final en cada venta es
        /// informacion que la regla decidio no exponerle. Comprador y roles operativos si lo ven:
        /// el comprador es el dueno del pedido y la operacion necesita saber a quien entrega.
        /// </summary>
        [Fact]
        public async Task Listado_ElVendedorVeSuSubtotalYNoElBuyerId()
        {
            var mine = await _factory.PaidOrder.GetAsync();

            using var client = _factory.Actors.ClientFor("Seller");
            using var response = await client.GetAsync("/api/Orders");
            response.EnsureSuccessStatusCode();

            using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var row = document.RootElement.EnumerateArray()
                .First(o => o.GetProperty("id").GetGuid() == mine.OrderId);

            Assert.Equal(20000m, row.GetProperty("totalAmount").GetDecimal());

            // El BuyerId llega, pero VACIO (null), no ausente. Es mejor que omitirlo: el frontend
            // recibe siempre la misma forma y no tiene que distinguir "no aplica" de "no vino".
            Assert.True(row.TryGetProperty("buyerId", out var buyerId));
            Assert.Equal(System.Text.Json.JsonValueKind.Null, buyerId.ValueKind);
        }

        /// <summary>
        /// Administrador, Operador y Supervisor ven la cola completa: es la reparacion de un 404
        /// que antes hacia imposible trabajar sin conocer el GUID.
        /// </summary>
        [Theory]
        [InlineData("Admin")]
        [InlineData("Operator")]
        [InlineData("Supervisor")]
        public async Task Listado_LosRolesOperativosVenLaColaCompleta(string actor)
        {
            var mine = await _factory.PaidOrder.GetAsync();

            using var client = _factory.Actors.ClientFor(actor);
            using var response = await client.GetAsync("/api/Orders");
            response.EnsureSuccessStatusCode();

            Assert.Contains(mine.OrderId, await ReadIdsAsync(response));
        }

        /// <summary>
        /// El filtro por estado llega por nombre y funciona. Sin el, el frontend no puede montar
        /// "pedidos pagados" ni "pedidos pendientes de despacho".
        /// </summary>
        [Fact]
        public async Task Listado_FiltraPorEstadoPorNombre()
        {
            var mine = await _factory.PaidOrder.GetAsync();

            using var client = _factory.Actors.ClientFor("Buyer");

            using var paid = await client.GetAsync("/api/Orders?status=Paid");
            paid.EnsureSuccessStatusCode();

            using var cart = await client.GetAsync("/api/Orders?status=Cart");
            cart.EnsureSuccessStatusCode();

            Assert.Contains(mine.OrderId, await ReadIdsAsync(paid));
            Assert.DoesNotContain(mine.OrderId, await ReadIdsAsync(cart));
        }

        /// <summary>
        /// Un estado invalido responde 400 en vez de devolver la lista completa. Lo segundo seria
        /// el peor fallo posible: el usuario creeria estar filtrando y estaria viendo de todo.
        /// </summary>
        [Fact]
        public async Task Listado_EstadoInvalidoResponde400()
        {
            using var client = _factory.Actors.ClientFor("Buyer");

            using var response = await client.GetAsync("/api/Orders?status=NoExisteEsteEstado");

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task Listado_SinTokenResponde401()
        {
            using var client = _factory.CreateClient();

            using var response = await client.GetAsync("/api/Orders");

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        private static async Task<List<Guid>> ReadIdsAsync(HttpResponseMessage response)
        {
            using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());

            return document.RootElement.EnumerateArray()
                .Select(order => order.GetProperty("id").GetGuid())
                .ToList();
        }
    }
}