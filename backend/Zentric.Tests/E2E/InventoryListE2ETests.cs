using System.Net;
using System.Text.Json;
using Xunit;

namespace Zentric.Tests.E2E
{
    /// <summary>
    /// Listado de existencias verificado por HTTP real.
    ///
    /// Sin este listado no hay pantalla de inventario: el Vendedor no puede revisar su stock y el
    /// Operador no puede ver la red de bodegas, solo abrir una variante si ya conocia su GUID.
    ///
    /// Lo que se comprueba es que el Vendedor ve SU stock y el Operador ve la red. Un listado que
    /// devolviera el stock de la competencia seria peor que no tenerlo, porque el precio de venta y
    /// el nivel de existencias son los dos datos que un vendedor no debe ver de otro.
    /// </summary>
    [Collection(ApiCollection.Name)]
    public sealed class InventoryListE2ETests
    {
        private readonly ZentricApiFactory _factory;

        public InventoryListE2ETests(ZentricApiFactory factory) => _factory = factory;

        /// <summary>
        /// El Vendedor ve el stock de SU variante. Es su pantalla de trabajo: sin ella no puede
        /// saber cuanto tiene ni cuando reponer.
        /// </summary>
        [Fact]
        public async Task Inventario_ElVendedorVeElStockDeSuVariante()
        {
            var scenario = await _factory.PaidOrder.GetAsync();

            using var client = _factory.Actors.ClientFor("Seller");
            using var response = await client.GetAsync("/api/Inventories");
            response.EnsureSuccessStatusCode();

            var variantIds = await ReadVariantIdsAsync(response);
            Assert.Contains(scenario.VariantId, variantIds);
        }

        /// <summary>
        /// El Operador ve la red completa: el stock de la red es literalmente su trabajo.
        /// Es el mismo criterio que aplica el detalle por variante.
        /// </summary>
        [Fact]
        public async Task Inventario_ElOperadorVeLaRedCompleta()
        {
            var scenario = await _factory.PaidOrder.GetAsync();

            using var client = _factory.Actors.ClientFor("Operator");
            using var response = await client.GetAsync("/api/Inventories");
            response.EnsureSuccessStatusCode();

            var variantIds = await ReadVariantIdsAsync(response);
            Assert.Contains(scenario.VariantId, variantIds);
        }

        /// <summary>
        /// El listado coincide con el detalle por variante: el mismo dato no puede tener dos
        /// permisos segun de que pantalla se pida.
        /// </summary>
        [Fact]
        public async Task Inventario_ElListadoCoincideConElDetallePorVariante()
        {
            var scenario = await _factory.PaidOrder.GetAsync();

            using var client = _factory.Actors.ClientFor("Seller");

            using var list = await client.GetAsync("/api/Inventories");
            list.EnsureSuccessStatusCode();

            using var detail = await client.GetAsync($"/api/Inventories/{scenario.VariantId}");
            detail.EnsureSuccessStatusCode();

            var detailIds = await ReadIdsAsync(detail);

            var listedIds = await ReadIdsAsync(list);
            Assert.NotEmpty(detailIds);
            Assert.All(detailIds, id => Assert.Contains(id, listedIds));
        }

        [Fact]
        public async Task Inventario_SinTokenResponde401()
        {
            using var client = _factory.CreateClient();

            using var response = await client.GetAsync("/api/Inventories");

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        private static async Task<List<Guid>> ReadVariantIdsAsync(HttpResponseMessage response)
        {
            using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());

            return document.RootElement.EnumerateArray()
                .Select(row => row.GetProperty("variantId").GetGuid())
                .ToList();
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
