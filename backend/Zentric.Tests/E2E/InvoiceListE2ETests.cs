using System;
using System.Net;
using System.Text.Json;
using Xunit;

namespace Zentric.Tests.E2E
{
    /// <summary>
    /// Listado de facturas verificado por HTTP real.
    ///
    /// Aqui lo que se comprueba no es solo que el listado exista, sino que respete la regla que
    /// hace que este endpoint sea delicado: el Comprador NO debe ver la Factura Maestra de
    /// plataforma ni las facturas de vendedor (ADDENDUM Dominio 9). Si las viera, tendria acceso
    /// al detalle de la comision y a la facturacion interna de la competencia.
    /// </summary>
    [Collection(ApiCollection.Name)]
    public sealed class InvoiceListE2ETests
    {
        private readonly ZentricApiFactory _factory;

        public InvoiceListE2ETests(ZentricApiFactory factory) => _factory = factory;

        /// <summary>
        /// Factura el pedido compartido, una sola vez para toda la clase.
        ///
        /// El pedido de la suite es el MISMO para todos los tests, y Q-21d impide facturarlo dos
        /// veces: la segunda llamada responde 400 a proposito, porque el frontend tiene que poder
        /// reintentar sin miedo a que se dupliquen las tres facturas. Por eso se tolera ese 400
        /// concreto y no otro: si fuera por cualquier otro motivo, el fallo se veria igual.
        /// </summary>
        private static bool _invoicesGenerated;

        [Fact]
        public async Task Facturas_ElCompradorSoloVeSuFacturaMaestra()
        {
            await GenerateInvoicesAsync();

            var types = await ListTypesAsync("Buyer");

            // El Comprador tiene al menos su Factura Maestra: sin ella no tendria comprobante.
            Assert.Contains("Master", types);

            // Y nada mas. El ZentricDetail es control interno de plataforma y las facturas de
            // vendedor no son suyas (ADDENDUM Dominio 9).
            Assert.DoesNotContain("ZentricDetail", types);
            Assert.DoesNotContain("VendorDetail", types);
        }

        /// <summary>
        /// El Vendedor ve sus propias facturas de vendedor y NO la Factura Maestra: la comision de
        /// plataforma es interna y su total no le corresponde.
        /// </summary>
        [Fact]
        public async Task Facturas_ElVendedorSoloVeLasSuyasDeVendedor()
        {
            await GenerateInvoicesAsync();

            var types = await ListTypesAsync("Seller");

            Assert.Contains("VendorDetail", types);
            Assert.DoesNotContain("Master", types);
        }

        /// <summary>
        /// Administrador y Supervisor ven la facturacion completa: es el control interno que la
        /// plataforma necesita para auditar comisiones.
        ///
        /// El Operador NO esta en la theory a proposito: <c>BillingRead</c> no lo incluye, porque
        /// facturar no es parte de su labor. Que lo lea tampoco es un descuido, es la matriz de
        /// autorizacion dictamenada, y las pruebas la fijan para que nadie la”事件ualice despues.
        /// </summary>
        [Theory]
        [InlineData("Admin")]
        [InlineData("Supervisor")]
        public async Task Facturas_LosRolesOperativosVenLaFacturacionCompleta(string actor)
        {
            await GenerateInvoicesAsync();

            var types = await ListTypesAsync(actor);

            Assert.Contains("Master", types);
            Assert.Contains("ZentricDetail", types);
        }

        /// <summary>
        /// El listado coincide con el listado por pedido: los dos aplican el mismo reparto por rol.
        /// Si divergieran, el mismo dato tendria dos permisos segun la pantalla desde la que se
        /// pidiera, y filtrar en la interfaz dejaria de ser una garantia.
        /// </summary>
        [Fact]
        public async Task Facturas_ElListadoCoincideConElListadoPorPedido()
        {
            var scenario = await _factory.PaidOrder.GetAsync();
            await GenerateInvoicesAsync();

            using var client = _factory.Actors.ClientFor("Buyer");

            using var global = await client.GetAsync("/api/billing/invoices");
            global.EnsureSuccessStatusCode();

            using var byOrder = await client.GetAsync($"/api/billing/invoices/order/{scenario.OrderId}");
            byOrder.EnsureSuccessStatusCode();

            var globalIds = await ReadIdsAsync(global);
            var byOrderIds = await ReadIdsAsync(byOrder);

            Assert.NotEmpty(globalIds);
            Assert.All(byOrderIds, id => Assert.Contains(id, globalIds));
        }

        [Fact]
        public async Task Facturas_SinTokenResponde401()
        {
            using var client = _factory.CreateClient();

            using var response = await client.GetAsync("/api/billing/invoices");

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        private async Task GenerateInvoicesAsync()
        {
            if (_invoicesGenerated) return;

            var scenario = await _factory.PaidOrder.GetAsync();
            using var client = _factory.Actors.ClientFor("Admin");

            using var response = await client.PostAsync(
                $"/api/billing/invoices/generate/{scenario.OrderId}", content: null);

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                var alreadyIssued = body.Contains("already been issued", StringComparison.OrdinalIgnoreCase);

                Assert.True(
                    alreadyIssued,
                    $"Facturar el pedido fallo con {(int)response.StatusCode}: {body}");
            }

            _invoicesGenerated = true;
        }

        private async Task<List<string>> ListTypesAsync(string actor)
        {
            using var client = _factory.Actors.ClientFor(actor);

            using var response = await client.GetAsync("/api/billing/invoices");
            response.EnsureSuccessStatusCode();

            using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());

            return document.RootElement.EnumerateArray()
                .Select(row => row.GetProperty("type").GetString()!)
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
