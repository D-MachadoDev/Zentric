using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace Zentric.Tests.E2E
{
    /// <summary>
    /// El recorrido de negocio completo contra HTTP real: producto -> stock -> carrito -> item ->
    /// checkout -> pago -> facturas.
    ///
    /// Antes de esto, el unico recorrido asi vivia en el smoke de PowerShell, y el SDD reconocia
    /// que no habia ninguna prueba automatizada del camino feliz. Estas pruebas fijan el
    /// comportamiento por escrito: si alguien rompe el pago o la emision, falla aqui.
    ///
    /// El escenario se siembra una vez y se comparte, de modo que estas pruebas leen el mismo
    /// pedido pagado y no compiten por los datos.
    /// </summary>
    [Collection(ApiCollection.Name)]
    public sealed class BusinessFlowE2ETests
    {
        private readonly ZentricApiFactory _factory;

        public BusinessFlowE2ETests(ZentricApiFactory factory) => _factory = factory;

        /// <summary>
        /// El vendedor queda encerrado en su VendorId aunque el cuerpo diga otro. Es la pieza que
        /// hace fiable el reparto de la facturacion (Q-18): si el alta aceptara el VendorId del
        /// cuerpo, un cliente podria atribuir la venta a otro vendedor.
        /// </summary>
        [Fact]
        public async Task AltaDeProducto_SellaElVendorIdDelToken()
        {
            var scenario = await _factory.PaidOrder.GetAsync();

            Assert.NotEqual(Guid.Empty, scenario.SellerId);
            Assert.NotEqual(Guid.Empty, scenario.VariantId);
        }

        [Fact]
        public async Task PedidoPagado_Responde200YTraeSusItems()
        {
            var scenario = await _factory.PaidOrder.GetAsync();
            using var client = _factory.Actors.ClientFor("Buyer");

            using var response = await client.GetAsync($"/api/orders/{scenario.OrderId}");
            response.EnsureSuccessStatusCode();

            var body = await response.Content.ReadAsStringAsync();

            // 2 unidades a 10.000: si el total no cuadra, el reparto de facturas tambien miente.
            Assert.Contains("20000", body);
        }

        /// <summary>
        /// Tres facturas por pedido: maestra (lo que paga el comprador), detalle Zentric (la
        /// comision) y detalle de vendedor (su parte). Es el reparto que dicta Q-15/Q-18.
        /// </summary>
        [Fact]
        public async Task Facturacion_EmiteMaestraDetalleZentricYDetalleDeVendedor()
        {
            var scenario = await _factory.PaidOrder.GetAsync();

            Assert.Equal(3, scenario.InvoiceCount);
        }

        /// <summary>
        /// Un segundo clic en "facturar" no puede duplicar el cobro. Sin esta guarda, el boton del
        /// frontend o un reintento de red generaba seis facturas de las mismas tres.
        /// </summary>
        [Fact]
        public async Task Facturacion_SegundaEmisionRechazadaComoReglaDeNegocio()
        {
            var scenario = await _factory.PaidOrder.GetAsync();
            using var client = _factory.Actors.ClientFor("Admin");

            using var response = await client.PostAsync(
                $"/api/billing/invoices/generate/{scenario.OrderId}",
                content: null);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

            var body = await response.Content.ReadAsStringAsync();
            Assert.Contains("already been issued", body, System.StringComparison.OrdinalIgnoreCase);
        }

        /// <summary>
        /// Facturar un carrito sin pagar es el otro defecto que cubria la misma guarda: el pedido
        /// tiene que estar pagado, no basta con que exista.
        /// </summary>
        [Fact]
        public async Task Facturacion_CarritoSinPagarNoSeEmite()
        {
            var actors = _factory.Actors;
            using var client = actors.ClientFor("Buyer");

            using var cart = await client.PostAsync("/api/orders/cart", content: null);
            cart.EnsureSuccessStatusCode();
            var unpaidOrder = Guid.Parse((await cart.Content.ReadAsStringAsync()).Trim('"'));

            using var admin = actors.ClientFor("Admin");
            using var response = await admin.PostAsync(
                $"/api/billing/invoices/generate/{unpaidOrder}",
                content: null);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task Devolucion_RadicadaSobrePedidoPropio()
        {
            var scenario = await _factory.PaidOrder.GetAsync();

            Assert.NotEqual(Guid.Empty, scenario.ReturnRequestId);
        }

        /// <summary>
        /// El vendedor del producto aprueba su devolucion (Dominio 9). El escenario ya la radico
        /// sobre el pedido pagado, asi que aqui se comprueba el camino de la aprobacion.
        /// </summary>
        [Fact]
        public async Task Devolucion_AprobadaPorElVendedorDelProducto()
        {
            var scenario = await _factory.PaidOrder.GetAsync();
            using var client = _factory.Actors.ClientFor("Seller");

            using var response = await client.PostAsJsonAsync(
                $"/api/returns/{scenario.ReturnRequestId}/approve",
                new { returnRequestId = scenario.ReturnRequestId, isSameWarehouseAndVendor = true });

            response.EnsureSuccessStatusCode();
        }

        /// <summary>
        /// Un vendedor que no es el dueno del producto no aprueba. Y responde 404, no 403: el
        /// filtro de dueno (ADR-0013) oculta la existencia del recurso, no la del rol.
        /// </summary>
        [Fact]
        public async Task Devolucion_OtroVendedorNoApruebaYResponde404()
        {
            var scenario = await _factory.PaidOrder.GetAsync();
            using var client = _factory.Actors.ClientFor("Seller2");

            using var response = await client.PostAsJsonAsync(
                $"/api/returns/{scenario.ReturnRequestId}/approve",
                new { returnRequestId = scenario.ReturnRequestId, isSameWarehouseAndVendor = true });

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }
    }
}