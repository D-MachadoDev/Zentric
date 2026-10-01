using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace Zentric.Tests.E2E
{
    /// <summary>
    /// Propiedad del recurso verificada por HTTP real (Q-21b, ADR-0013).
    ///
    /// La regla es una sola y ya estaba dictada: un recurso ausente o de otro responde 404, nunca
    /// 403. La distincion importa por una razon concreta: un 403 confirmaria que el recurso EXISTE,
    /// lo que permitiria enumerar pedidos y devoluciones ajenos guid a guid. El 404 no distingue.
    ///
    /// Estas pruebas atacan el recurso desde el otro lado de cada frontera: segundo comprador,
    /// segundo vendedor y bodega ajena.
    /// </summary>
    [Collection(ApiCollection.Name)]
    public sealed class OwnershipE2ETests
    {
        private readonly ZentricApiFactory _factory;

        public OwnershipE2ETests(ZentricApiFactory factory) => _factory = factory;

        [Fact]
        public async Task LecturaDePedido_ElDuenoLaGetsYElOtroCompradorObtiene404()
        {
            var scenario = await _factory.PaidOrder.GetAsync();

            using var owner = _factory.Actors.ClientFor("Buyer");
            using var mine = await owner.GetAsync($"/api/orders/{scenario.OrderId}");

            using var stranger = _factory.Actors.ClientFor("Buyer2");
            using var theirs = await stranger.GetAsync($"/api/orders/{scenario.OrderId}");

            Assert.Equal(HttpStatusCode.OK, mine.StatusCode);
            Assert.Equal(HttpStatusCode.NotFound, theirs.StatusCode);
        }

        /// <summary>
        /// Administrador, Operador y Supervisor leen sin filtro de dueno. Es deliberado y es una
        /// reparacion de un 404 que antes hacia el trabajo imposible: sin ellos, nadie con rol
        /// operativo podia ver un pedido.
        /// </summary>
        [Theory]
        [InlineData("Admin")]
        [InlineData("Operator")]
        [InlineData("Supervisor")]
        public async Task LecturaDePedido_LosRolesOperativosLeenSinFiltro(string actor)
        {
            var scenario = await _factory.PaidOrder.GetAsync();
            using var client = _factory.Actors.ClientFor(actor);

            using var response = await client.GetAsync($"/api/orders/{scenario.OrderId}");

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        [Fact]
        public async Task Devolucion_ElCompradorAjenoNoRadaSobrePedidoAjeno()
        {
            var scenario = await _factory.PaidOrder.GetAsync();
            using var client = _factory.Actors.ClientFor("Buyer2");

            using var response = await client.PostAsJsonAsync("/api/returns/request", new
            {
                customerOrderId = scenario.OrderId,
                variantId = scenario.VariantId,
                warehouseId = scenario.WarehouseId,
                quantity = 1,
                productType = "Physical",
            });

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async Task Stock_EnBodegaAjenaResponde404()
        {
            var scenario = await _factory.PaidOrder.GetAsync();
            using var client = _factory.Actors.ClientFor("Seller");

            using var response = await client.PostAsJsonAsync("/api/Inventories/stock", new
            {
                variantId = scenario.VariantId,
                warehouseId = scenario.ForeignWarehouseId,
                quantity = 1,
            });

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        /// <summary>
        /// El segundo vendedor no puede ingresar stock ni siquiera en una bodega que existe. La
        /// bodega SI existe (la de otro), asi que un 403 revelaria el recurso; por eso se exige 404.
        /// </summary>
        [Fact]
        public async Task Stock_OtroVendedorNoIngresaEnBodegaAjena()
        {
            var scenario = await _factory.PaidOrder.GetAsync();
            using var client = _factory.Actors.ClientFor("Seller2");

            using var response = await client.PostAsJsonAsync("/api/Inventories/stock", new
            {
                variantId = scenario.VariantId,
                warehouseId = scenario.WarehouseId,
                quantity = 1,
            });

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async Task Facturas_ElCompradorAjenoNoLasVe()
        {
            var scenario = await _factory.PaidOrder.GetAsync();
            using var client = _factory.Actors.ClientFor("Buyer2");

            using var response = await client.GetAsync($"/api/billing/invoices/order/{scenario.OrderId}");

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        /// <summary>
        /// Cada rol ve solo su parte de la facturacion: el comprador su Factura Maestra, el
        /// vendedor la suya, el administrador las tres. Es el reparto que dicta Q-15/Q-18 visto
        /// desde la perspectiva de quien las pide.
        /// </summary>
        [Fact]
        public async Task Facturas_CadaRolSoloRecibeLasSuyas()
        {
            var scenario = await _factory.PaidOrder.GetAsync();

            using var buyer = _factory.Actors.ClientFor("Buyer");
            using var buyerResponse = await buyer.GetAsync($"/api/billing/invoices/order/{scenario.OrderId}");
            using var seller = _factory.Actors.ClientFor("Seller");
            using var sellerResponse = await seller.GetAsync($"/api/billing/invoices/order/{scenario.OrderId}");

            Assert.Equal(1, await CountAsync(buyerResponse));
            Assert.Equal(1, await CountAsync(sellerResponse));
            Assert.Equal(3, scenario.InvoiceCount);
        }

        private static async Task<int> CountAsync(HttpResponseMessage response)
        {
            response.EnsureSuccessStatusCode();

            using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            return document.RootElement.GetArrayLength();
        }
    }
}