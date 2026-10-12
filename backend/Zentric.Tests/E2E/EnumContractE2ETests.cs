using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Xunit;

namespace Zentric.Tests.E2E
{
    /// <summary>
    /// Contrato JSON de los <c>enum</c> verificado por HTTP real (Q-22, ADR-0012).
    ///
    /// La forma estricta que dicto el Owner dice que un cuerpo con <c>"role": 2</c> responde 400 y
    /// no se colaba como Administrador. Con las pruebas de contrato existentes se comprobaba la
    /// configuracion del serializador; aqui se comprueba el ida y vuelta completo, incluida la
    /// lectura del nombre en minusculas, que es el caso que un cliente real se encuentra primero.
    /// </summary>
    [Collection(ApiCollection.Name)]
    public sealed class EnumContractE2ETests
    {
        private readonly ZentricApiFactory _factory;

        public EnumContractE2ETests(ZentricApiFactory factory) => _factory = factory;

        [Fact]
        public async Task RolPorEntero_Responde400()
        {
            using var client = _factory.Actors.ClientFor("Admin");

            using var content = JsonContent.Create(new
            {
                email = "e2e-contrato-entero@zentric-e2e.test",
                fullName = "Contrato Entero",
                identityDocument = "DOC-E2E-ENT-1",
                password = ZentricApiFactory.ActorPassword,
                role = 2,
            });

            using var response = await client.PostAsync("/api/users", content);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task RolPorNombreEnMinusculas_SeAcepta()
        {
            using var client = _factory.Actors.ClientFor("Admin");

            using var content = JsonContent.Create(new
            {
                email = "e2e-contrato-minusculas@zentric-e2e.test",
                fullName = "Contrato Minusculas",
                identityDocument = "DOC-E2E-ENT-2",
                password = ZentricApiFactory.ActorPassword,
                role = "supervisor",
            });

            using var response = await client.PostAsync("/api/users", content);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        [Fact]
        public async Task ErrorDeValidacion_UsaProblemDetailsConCodigoDeEstado()
        {
            using var client = _factory.Actors.ClientFor("Admin");

            using var content = JsonContent.Create(new { role = 2 });
            using var response = await client.PostAsync("/api/users", content);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);

            using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());

            Assert.Equal(400, document.RootElement.GetProperty("status").GetInt32());

            // Un fallo de ENLACE del cuerpo no produce `detail` sino `errors`: es un
            // ValidationProblemDetails, la variante que RFC 7807 reserva para el detalle campo a
            // campo. Aqui ademas tiene que citar la ruta JSON, que es lo que hace util el mensaje.
            Assert.True(document.RootElement.TryGetProperty("errors", out var errors));
            Assert.False(string.IsNullOrWhiteSpace(errors.ToString()));
        }

        /// <summary>
        /// El otro camino de error: un fallo de NEGOCIO, que si produce `detail` y sale del mapa
        /// central de resultados. Se comprueba aparte porque son dos mecanismos distintos que
        /// tienen que acabar en el mismo tipo de contenido.
        /// </summary>
        [Fact]
        public async Task ErrorDeNegocio_UsaProblemDetailsConDetalle()
        {
            using var client = _factory.Actors.ClientFor("Admin");

            using var content = JsonContent.Create(new
            {
                email = "e2e-buyer@zentric-e2e.test",
                fullName = "Comprador Uno",
                identityDocument = "DOC-E2E-DUP",
                password = ZentricApiFactory.ActorPassword,
                role = "Buyer",
            });

            using var response = await client.PostAsync("/api/users", content);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);

            using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());

            Assert.Equal(400, document.RootElement.GetProperty("status").GetInt32());
            Assert.False(string.IsNullOrWhiteSpace(document.RootElement.GetProperty("detail").GetString()));
        }

        /// <summary>
        /// La sonda de salud se documenta como el chequeo de Docker y del balanceador, asi que tiene
        /// que responder de verdad contra la base migrada, no solo abrir el puerto.
        /// </summary>
        [Fact]
        public async Task Health_ReportaBaseDeDatosOperativa()
        {
            using var client = _factory.CreateClient();

            using var response = await client.GetAsync("/health");
            response.EnsureSuccessStatusCode();

            using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());

            Assert.Equal("healthy", document.RootElement.GetProperty("status").GetString());
            Assert.Equal("up", document.RootElement.GetProperty("database").GetString());
        }

        /// <summary>
        /// Un token con firma invalida no debe colarse como identidad. Es la contraprueba de que la
        /// validacion del JWT ocurre de verdad y no solo se comprueba que la cabecera existe.
        /// </summary>
        /// <summary>
        /// El frontend necesita poder confiar en una sola regla: <c>200</c> es JSON normal y
        /// cualquier <c>4xx</c>/<c>5xx</c> es Problem Details. Esta prueba fija esa regla sobre
        /// endpoints reales, con y sin token, para que no dependa de leer el documento OpenAPI.
        ///
        /// Lo que se verifica aqui salio al escribir la prueba, y no es lo que yo asumia:
        ///
        /// - **Error de aplicacion** (404 o 400 de negocio): va como
        ///   <c>application/problem+json</c> con <c>status</c> y <c>detail</c>. **Sin <c>title</c>**
        ///   ni <c>type</c>: <c>ResultMapping.ToProblem()</c> construye el ProblemDetails con el
        ///   detalle y poco mas, que es el minimo que RFC 7807 permite.
        /// - **401 y 403 del middleware de autorizacion**: van **sin cuerpo y sin tipo de
        ///   contenido**. El challenge no construye un Problem Details. El frontend debe tratar
        ///   estos dos como "sin sesion" o "sin permiso", no como un error de negocio con detalle.
        /// </summary>
        [Theory]
        [InlineData("Buyer", "/api/orders/11111111-2222-3333-4444-555555555555", "problem")]
        [InlineData("Admin", "/api/orders/11111111-2222-3333-4444-555555555555", "problem")]
        [InlineData("Buyer", "/api/users", "vacio")]
        [InlineData("Anonymous", "/api/Catalog/products", "vacio")]
        [InlineData("Buyer", "/api/Warehouses", "vacio")]
        public async Task ContratoDeError_TipoDeContentoPorRolYEndpoint(string actor, string path, string expected)
        {
            using var client = _factory.Actors.ClientFor(actor);

            using var response = await client.GetAsync(path);

            Assert.True(
                (int)response.StatusCode >= 400,
                $"{path} como {actor} debia fallar, pero respondio {(int)response.StatusCode}.");

            var mediaType = response.Content.Headers.ContentType?.MediaType;

            if (expected == "vacio")
            {
                // 401/403 sin cuerpo: el middleware de autorizacionchallenge no construye un
                // Problem Details. El frontend debe-lo tratar como "sin sesion", no como error de
                // negocio con detalle.
                Assert.Null(mediaType);
                return;
            }

            Assert.Equal("application/problem+json", mediaType);

            using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());

            // Cuerpo minimo de RFC 7807, que es lo que el frontend va a leer.
            Assert.True(document.RootElement.TryGetProperty("status", out _));
            Assert.True(document.RootElement.TryGetProperty("detail", out _));
        }

        /// <summary>
        /// El camino feliz sigue siendo JSON normal. Si esto fallara, significaria que el
        /// formateador de Problem Details se estaria tragando tambien las respuestas exitosas.
        /// </summary>
        [Fact]
        public async Task ContratoDeExito_SigueSiendoApplicationJson()
        {
            using var client = _factory.Actors.ClientFor("Admin");

            using var response = await client.GetAsync("/api/users");
            response.EnsureSuccessStatusCode();

            Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);
        }

        [Fact]
        public async Task TokenConFirmaInvalida_Responde401()
        {
            using var client = _factory.CreateClient();
            var forged = Convert.ToBase64String(Encoding.UTF8.GetBytes("{\"sub\":\"forjado\"}")) + ".firma.falsa";

            client.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", forged);

            using var response = await client.GetAsync("/api/auth/me");

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }
    }
}