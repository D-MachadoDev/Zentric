using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace Zentric.Tests.E2E
{
    /// <summary>
    /// Matriz de autorizacion ejecutada contra HTTP real (RG-03, ADR-0011).
    ///
    /// Antes de T-032 esta matriz vivia solo en <c>authorization-smoke.ps1</c>, que se lanzaba a mano
    /// contra el contenedor. Consecuencia: la puerta de seguridad que mas caro salio no la
    /// comprobaba nadie de forma automatica. Aqui es codigo de produccion que nadie puede saltarse
    /// sin que se rompa el pipeline.
    ///
    /// Cada caso traduce una fila de la matriz de <c>backendSDD/Presentation/02-authorization.md</c>.
    /// "Abierto" no es un codigo: significa que la peticion SUPERA la barrera de autorizacion y
    /// muere mas adelante, en validacion (400) o por recurso inexistente (404). Un 401 o un 403
    /// donde se esperaba "abierto" significa que la politica de rol se aplico cuando no tocaba.
    /// </summary>
    [Collection(ApiCollection.Name)]
    public sealed class AuthorizationMatrixE2ETests
    {
        /// <summary>GUID inexistente a proposito: separa "no autorizado" de "no encontrado".</summary>
        private const string Missing = "11111111-2222-3333-4444-555555555555";

        private readonly ZentricApiFactory _factory;

        public AuthorizationMatrixE2ETests(ZentricApiFactory factory) => _factory = factory;

        public static TheoryData<string, string, string, string> Matrix => new()
        {
            // Sin token: RG-01. La politica de reserva exige identidad en todos los endpoints.
            { "GET", "/api/Catalog/products", "Anonymous", "401" },

            // Usuarios: solo Administrador.
            { "GET", "/api/users", "Buyer", "403" },
            { "GET", "/api/users", "Supervisor", "403" },
            { "GET", "/api/users", "Admin", "200" },

            // Bodegas: el Comprador no lista, el Vendedor si.
            { "GET", "/api/Warehouses", "Buyer", "403" },
            { "GET", "/api/Warehouses", "Seller", "200" },

            // Inventario: el Comprador no lee stock.
            { "GET", $"/api/Inventories/{Missing}", "Buyer", "403" },
            { "GET", $"/api/Inventories/{Missing}", "Seller", "abierto" },

            // Entrada de stock: Vendedor y Operador; el Supervisor solo audita.
            { "POST", "/api/Inventories/stock", "Seller", "abierto" },
            { "POST", "/api/Inventories/stock", "Operator", "abierto" },
            { "POST", "/api/Inventories/stock", "Supervisor", "403" },

            // Catalogo: solo el Vendedor publica; ni el Operador ni el Administrador.
            { "POST", "/api/Catalog/products", "Seller", "abierto" },
            { "POST", "/api/Catalog/products", "Operator", "403" },
            { "POST", "/api/Catalog/products", "Admin", "403" },

            // Carrito: solo el Comprador.
            { "POST", "/api/orders/cart", "Buyer", "abierto" },
            { "POST", "/api/orders/cart", "Seller", "403" },
            { "POST", "/api/orders/cart", "Supervisor", "403" },

            // Lectura de pedido: Comprador y Supervisor.
            { "GET", $"/api/orders/{Missing}", "Buyer", "abierto" },
            { "GET", $"/api/orders/{Missing}", "Supervisor", "abierto" },

            // Aprobar devoluciones: el Vendedor del producto.
            { "POST", $"/api/returns/{Missing}/approve", "Seller", "abierto" },
            { "POST", $"/api/returns/{Missing}/approve", "Admin", "403" },
            { "POST", $"/api/returns/{Missing}/approve", "Buyer", "403" },

            // Inspeccionar devoluciones: el Operador Logistico.
            { "POST", $"/api/returns/{Missing}/inspect", "Operator", "abierto" },
            { "POST", $"/api/returns/{Missing}/inspect", "Seller", "403" },

            // Crear orden de entrega: el Vendedor.
            { "POST", "/api/logistics/fulfillment", "Seller", "abierto" },
            { "POST", "/api/logistics/fulfillment", "Buyer", "403" },

            // Cancelar por stock fantasma: Vendedor u Operador (Q-21c: quien esta en bodega
            // detecta el faltante). El Operador puede, no es un descuido de la matriz.
            { "POST", "/api/logistics/fulfillment/cancel-ghost-stock", "Seller", "abierto" },
            { "POST", "/api/logistics/fulfillment/cancel-ghost-stock", "Operator", "abierto" },

            // Emitir facturas: solo Administrador (Q-21d).
            { "POST", $"/api/billing/invoices/generate/{Missing}", "Admin", "abierto" },
            { "POST", $"/api/billing/invoices/generate/{Missing}", "Seller", "403" },

            // Identidad propia: cualquier autenticado.
            { "GET", "/api/auth/me", "Operator", "200" },
        };

        [Theory]
        [MemberData(nameof(Matrix))]
        public async Task MatrizDeAutorizacion_RespetaElCodigoPactado(string method, string path, string actor, string expected)
        {
            using var client = _factory.Actors.ClientFor(actor);

            using var request = new HttpRequestMessage(new HttpMethod(method), path);

            // El smoke envia "{}" en las escrituras; aqui se envia cuerpo vacio, que es lo mismo
            // para el proposito de esta prueba: medir la barrera de autorizacion, no el payload.
            if (method == "POST")
            {
                request.Content = JsonContent.Create(new { });
            }

            using var response = await client.SendAsync(request);
            var status = (int)response.StatusCode;

            if (expected == "abierto")
            {
                Assert.True(
                    status != 401 && status != 403,
                    $"{method} {path} como {actor} debia superar la barrera de autorizacion, pero respondio {status}.");
            }
            else
            {
                Assert.True(
                    status == int.Parse(expected),
                    $"{method} {path} como {actor} debia responder {expected}, pero respondio {status}.");
            }
        }

        /// <summary>
        /// La unica excepcion a RG-01 es el auto-registro de Comprador (ZENTRIC.md, Dominio 3). Se
        /// comprueba aqui su contra-prueba: el mismo endpoint abierto NO admite auto-registrarse
        /// como Vendedor, porque eso seria una escalada de privilegios sin token.
        /// </summary>
        [Fact]
        public async Task AutoRegistro_AdmiteCompradorYRechazaVendedor()
        {
            using var client = _factory.CreateClient();

            var buyer = new
            {
                email = "e2e-anonimo-comprador@zentric-e2e.test",
                fullName = "Compra Anonima",
                identityDocument = "DOC-E2E-ANON-1",
                password = ZentricApiFactory.ActorPassword,
                role = "Buyer",
            };

            var seller = buyer with { email = "e2e-anonimo-vendedor@zentric-e2e.test", role = "Seller" };

            using var asBuyer = await client.PostAsJsonAsync("/api/users", buyer);
            using var asSeller = await client.PostAsJsonAsync("/api/users", seller);

            Assert.Equal(HttpStatusCode.OK, asBuyer.StatusCode);
            Assert.Equal(HttpStatusCode.Forbidden, asSeller.StatusCode);
        }
    }
}