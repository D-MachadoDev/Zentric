using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace Zentric.Tests.E2E
{
    /// <summary>
    /// Categorias del catalogo verificadas por HTTP real contra PostgreSQL.
    ///
    /// Este endpoint existia en el codigo pero NO en la especificacion
    /// (backendSDD/Presentation/01-endpoints.md). Se documento antes de
    /// arreglarlo y sus reglas son las que estas pruebas comprueban.
    ///
    /// El motivo de que la prueba sea E2E y no unitaria: el defecto que estos
    /// tests persiguen era de TRADUCCION A SQL, no de regla de negocio. La
    /// proyeccion original capitalizaba la primera letra de la categoria
    /// dentro del `Select` de EF Core (`char.ToUpper(...) + Substring(1)`),
    /// que EF Core no traduce a PostgreSQL: la consulta entera reventaba con
    /// `InvalidOperationException: ... could not be translated` y el endpoint
    /// respondia 500 en CADA peticion. Las pruebas unitarias del
    /// repositorio no lo detectaron porque sustituyen el almacen por un doble.
    /// Solo una consulta real a PostgreSQL lo detecta.
    /// </summary>
    [Collection(ApiCollection.Name)]
    public sealed class CatalogCategoriesE2ETests
    {
        private readonly ZentricApiFactory _factory;

        public CatalogCategoriesE2ETests(ZentricApiFactory factory) => _factory = factory;

        /// <summary>
        /// Regresion del defecto: el endpoint debe responder 200 y no 500.
        /// Antes del arreglo, EF Core lanzaba al traducir la proyeccion y el
        /// middleware de excepcion devolvia 500 con el detalle de LINQ.
        /// </summary>
        [Fact]
        public async Task Categorias_RespondenOkContraPostgresReal()
        {
            using var client = _factory.Actors.ClientFor("Buyer");
            using var response = await client.GetAsync("/api/Catalog/categories");

            Assert.True(
                response.IsSuccessStatusCode,
                $"GET /api/Catalog/categories devolvio {(int)response.StatusCode}. " +
                $"Cuerpo: {await response.Content.ReadAsStringAsync()}");
        }

        /// <summary>
        /// Regla (2) de la especificacion: la clave de agrupacion es la
        /// categoria normalizada (Trim + ToLower). Dos escrituras con distinta
        /// capitalizacion son la MISMA categoria y el conteo las suma.
        /// </summary>
        [Fact]
        public async Task Categorias_AgrupanPorClaveNormalizada()
        {
            var suffix = Guid.NewGuid().ToString("N")[..8];

            await CreateProductAsync($"E2E Cat Mayus {suffix}", "E2E-CAT-MAY-" + suffix, "Perifericos E2E " + suffix);
            await CreateProductAsync($"E2E Cat Minuscula {suffix}", "E2E-CAT-MIN-" + suffix, "perifericos e2e " + suffix);
            await CreateProductAsync($"E2E Cat ConEspacios {suffix}", "E2E-CAT-ESP-" + suffix, "  Perifericos E2E " + suffix + "  ");

            var categories = await ReadCategoriesAsync();

            var grouped = categories
                .Where(c => c.Name.Contains("Perifericos E2E " + suffix, StringComparison.OrdinalIgnoreCase))
                .ToList();

            Assert.True(
                grouped.Count == 1,
                $"Se esperaba UNA sola categoria normalizada para 'Perifericos E2E {suffix}', " +
                $"pero se obtuvieron {grouped.Count}: " +
                string.Join(", ", grouped.Select(c => $"[{c.Id}/{c.Name}/{c.ProductCount}]")));

            Assert.Equal(3, grouped[0].ProductCount);
        }

        /// <summary>
        /// Regla (1) de la especificacion: solo entran las categorias con al
        /// menos un producto PUBLICADO. Un producto suspendido no crea ni
        /// sostiene una categoria.
        /// </summary>
        [Fact]
        public async Task Categorias_SoloIncluyenCategoriasConProductosPublicados()
        {
            var suffix = Guid.NewGuid().ToString("N")[..8];
            var category = "Categoria Solo Suspendidos " + suffix;

            var productId = await CreateProductAsync($"E2E Cat Suspendida {suffix}", "E2E-CAT-SUS-" + suffix, category);

            using (var seller = _factory.Actors.ClientFor("Seller"))
            using (var suspended = await seller.PostAsJsonAsync($"/api/Catalog/products/{productId}/suspend", new { }))
            {
                suspended.EnsureSuccessStatusCode();
            }

            var categories = await ReadCategoriesAsync();

            Assert.DoesNotContain(
                categories,
                c => c.Name.Contains(category, StringComparison.OrdinalIgnoreCase));
        }

        /// <summary>
        /// Reglas (3) y (4) de la especificacion: `Id` es la clave
        /// normalizada (y es lo que viaja en el filtro `category` del listado
        /// paginado) y `Name` es esa misma clave con la primera letra en
        /// mayuscula, para presentacion.
        /// </summary>
        [Fact]
        public async Task Categorias_IdNormalizadoYNombreCapitalizado()
        {
            var suffix = Guid.NewGuid().ToString("N")[..8];
            var raw = "componentes office " + suffix;

            await CreateProductAsync($"E2E Cat Formato {suffix}", "E2E-CAT-FMT-" + suffix, raw);

            var categories = await ReadCategoriesAsync();
            var found = categories.FirstOrDefault(c => c.Id.Contains("componentes office " + suffix, StringComparison.OrdinalIgnoreCase));

            Assert.NotNull(found);
            Assert.Equal(found.Id.ToLowerInvariant(), found.Id);
            Assert.Equal(char.ToUpperInvariant(found.Id[0]) + found.Id.Substring(1), found.Name);
        }

        /// <summary>
        /// Regla (5): el orden es `productCount` descendente y, a igualdad de
        /// conteo, `Name` ascendente. Sin el desempate el orden seria
        /// inestable entre invocaciones y el chip de categorias de la UI
        /// saltaria de sitio.
        /// </summary>
        [Fact]
        public async Task Categorias_OrdenanPorConteoDescendenteYNombreAscendente()
        {
            var categories = await ReadCategoriesAsync();

            for (var i = 1; i < categories.Count; i++)
            {
                var previous = categories[i - 1];
                var current = categories[i];

                if (previous.ProductCount == current.ProductCount)
                {
                    Assert.True(
                        string.Compare(previous.Name, current.Name, StringComparison.Ordinal) <= 0,
                        $"A igualdad de conteo, el nombre debe ser ascendente: " +
                        $"'{previous.Name}' no puede ir antes que '{current.Name}'.");
                }
                else
                {
                    Assert.True(
                        previous.ProductCount > current.ProductCount,
                        $"El conteo debe ser descendente: {previous.Name}={previous.ProductCount} " +
                        $"no puede ir antes que {current.Name}={current.ProductCount}.");
                }
            }
        }

        // ── Utilidades ────────────────────────────────────────────────────────

        private sealed record CategoryResponse(string Id, string Name, int ProductCount);

        private async Task<List<CategoryResponse>> ReadCategoriesAsync()
        {
            using var client = _factory.Actors.ClientFor("Buyer");
            using var response = await client.GetAsync("/api/Catalog/categories");
            response.EnsureSuccessStatusCode();

            using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());

            return document.RootElement.EnumerateArray()
                .Select(row => new CategoryResponse(
                    row.GetProperty("id").GetString() ?? string.Empty,
                    row.GetProperty("name").GetString() ?? string.Empty,
                    row.GetProperty("productCount").GetInt32()))
                .ToList();
        }

        private async Task<Guid> CreateProductAsync(string name, string sku, string category)
        {
            using var client = _factory.Actors.ClientFor("Seller");

            using var created = await client.PostAsJsonAsync("/api/Catalog/products", new
            {
                name,
                description = "Producto para verificar las reglas de las categorias del catalogo",
                priceAmount = 10000m,
                priceCurrency = "COP",
                type = "Physical",
                category,
                variants = new[]
                {
                    new { sku, attributes = new[] { new { name = "Color", value = "Azul" } } },
                },
            });
            created.EnsureSuccessStatusCode();

            using var document = JsonDocument.Parse(await created.Content.ReadAsStringAsync());
            return document.RootElement.GetProperty("productId").GetGuid();
        }
    }
}
