using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace Zentric.Tests.E2E
{
    /// <summary>
    /// Visibilidad del catalogo verificada por HTTP real (Q-27, dictamen Q22=B).
    ///
    /// 01-endpoints.md §3.4 promete que al suspender "el producto deja de ser visible en
    /// busquedas". La prueba unitaria cubre la regla de negocio pero NO el SQL: en el
    /// listado paginado el total se cuenta antes del Skip/Take, de modo que un repositorio
    /// que filtrara en memoria devolveria la pagina bien pero un total inflado. Solo una
    /// corrida contra PostgreSQL comprueba que el filtro baja a la misma consulta que el
    /// conteo.
    /// </summary>
    [Collection(ApiCollection.Name)]
    public sealed class CatalogVisibilityE2ETests
    {
        private readonly ZentricApiFactory _factory;

        public CatalogVisibilityE2ETests(ZentricApiFactory factory) => _factory = factory;

        /// <summary>
        /// Sin filtro de vendedor el catalogo es el comercial: el producto suspendido no
        /// aparece para nadie.
        /// </summary>
        [Fact]
        public async Task Catalogo_ElProductoSuspendidoDejaDeVerseParaLosDemas()
        {
            var suspendedId = await CreateAndSuspendAsync("E2E Visibilidad 1", "E2E-VIS-SKU-1");

            using var client = _factory.Actors.ClientFor("Buyer");
            using var response = await client.GetAsync("/api/Catalog/products");
            response.EnsureSuccessStatusCode();

            Assert.DoesNotContain(suspendedId, await ReadIdsAsync(response));
        }

        /// <summary>
        /// Un vendedor ajeno que pide el catalogo de otro ve sólo lo publicado: filtrar por
        /// el vendorId de un tercero no es una vista de gestion.
        /// </summary>
        [Fact]
        public async Task Catalogo_ElVendedorAjenoNoVeLosSuspendidosDeOtro()
        {
            var scenario = await _factory.PaidOrder.GetAsync();
            var suspendedId = await CreateAndSuspendAsync("E2E Visibilidad 2", "E2E-VIS-SKU-2");

            using var client = _factory.Actors.ClientFor("Seller2");
            using var response = await client.GetAsync($"/api/Catalog/products?vendorId={scenario.SellerId}");
            response.EnsureSuccessStatusCode();

            Assert.DoesNotContain(suspendedId, await ReadIdsAsync(response));
        }

        /// <summary>
        /// El dictamen Q22=B: quien pide su propio vendorId obtiene la vista de gestion y
        /// si ve sus suspendidos. Sin esto, suspender seria un callejon sin salida porque
        /// publish (Q-25) exige encontrar antes el producto.
        /// </summary>
        [Fact]
        public async Task Catalogo_ElVendedorSiVeLosSuspendidosDeSuPropioCatalogo()
        {
            var scenario = await _factory.PaidOrder.GetAsync();
            var suspendedId = await CreateAndSuspendAsync("E2E Visibilidad 3", "E2E-VIS-SKU-3");

            using var client = _factory.Actors.ClientFor("Seller");
            using var response = await client.GetAsync($"/api/Catalog/products?vendorId={scenario.SellerId}");
            response.EnsureSuccessStatusCode();

            Assert.Contains(suspendedId, await ReadIdsAsync(response));
        }

        /// <summary>
        /// El total paginado cuenta los suspendidos SOLO para su dueno.
        ///
        /// Se mide contra una linea base propia en vez de contra un numero fijo: la suite
        /// entera comparte la base y otras pruebas crean productos, de modo que cualquier
        /// absoluto seria frágil. Lo que afirma el criterio es el DELTA: al suspender un
        /// producto, el total del dueno sube uno y el de los demas no se mueve.
        /// </summary>
        [Fact]
        public async Task CatalogoPaginado_ElTotalCuentaLosSuspendidosSoloParaSuDueno()
        {
            var scenario = await _factory.PaidOrder.GetAsync();

            var strangerBefore = await ReadTotalAsync("Seller2", scenario.SellerId);
            var ownerBefore = await ReadTotalAsync("Seller", scenario.SellerId);

            var suspendedId = await CreateAndSuspendAsync("E2E Visibilidad 4", "E2E-VIS-SKU-4");

            var strangerAfter = await ReadTotalAsync("Seller2", scenario.SellerId);
            var ownerAfter = await ReadTotalAsync("Seller", scenario.SellerId);

            // Si el estado se aplicara despues de contar, los dos totales subirian.
            Assert.Equal(strangerBefore, strangerAfter);
            Assert.Equal(ownerBefore + 1, ownerAfter);

            // Y la visibilidad acompana al total: el id esta en la pagina del dueno y no en la ajena.
            Assert.Contains(suspendedId, await ReadIdsAsync("Seller", scenario.SellerId));
            Assert.DoesNotContain(suspendedId, await ReadIdsAsync("Seller2", scenario.SellerId));
        }

        private async Task<List<Guid>> ReadIdsAsync(string actor, Guid vendorId)
        {
            using var client = _factory.Actors.ClientFor(actor);
            using var response = await client.GetAsync($"/api/Catalog/products?vendorId={vendorId}");
            response.EnsureSuccessStatusCode();

            using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());

            return document.RootElement.EnumerateArray()
                .Select(row => row.GetProperty("id").GetGuid())
                .ToList();
        }

        private async Task<Guid> CreateAndSuspendAsync(string name, string sku)
        {
            using var client = _factory.Actors.ClientFor("Seller");

            using var created = await client.PostAsJsonAsync("/api/Catalog/products", new
            {
                name,
                description = "Producto para comprobar la visibilidad del catalogo",
                priceAmount = 10000m,
                priceCurrency = "COP",
                type = "Physical",
                variants = new[]
                {
                    new { sku, attributes = new[] { new { name = "Color", value = "Azul" } } },
                },
            });
            created.EnsureSuccessStatusCode();

            Guid productId;
            using (var document = JsonDocument.Parse(await created.Content.ReadAsStringAsync()))
            {
                productId = document.RootElement.GetProperty("productId").GetGuid();
            }

            using var suspended = await client.PostAsJsonAsync(
                $"/api/Catalog/products/{productId}/suspend", new { });
            suspended.EnsureSuccessStatusCode();

            return productId;
        }

        private async Task<int> ReadTotalAsync(string actor, Guid vendorId)
        {
            using var client = _factory.Actors.ClientFor(actor);
            using var response = await client.GetAsync(
                $"/api/Catalog/products/paged?vendorId={vendorId}&page=0&size=1");
            response.EnsureSuccessStatusCode();

            using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            return document.RootElement.GetProperty("totalItems").GetInt32();
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
