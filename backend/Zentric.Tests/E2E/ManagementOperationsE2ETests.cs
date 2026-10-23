using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace Zentric.Tests.E2E
{
    /// <summary>
    /// Operaciones de administracion y gestion sin cobertura E2E (PASO-D2):
    /// bloqueo/activacion de usuarios, publicacion de productos, ajuste de
    /// inventario, anulacion de factura maestra y lecturas por id.
    ///
    /// Todo opera sobre datos PROPIOS (usuario, producto, bodega y pedido
    /// frescos): nunca muta los actores compartidos ni el escenario pagado
    /// compartido, asi el resto de la suite no depende del orden de ejecucion.
    /// </summary>
    [Collection(ApiCollection.Name)]
    public sealed class ManagementOperationsE2ETests
    {
        private const string Missing = "11111111-2222-3333-4444-555555555555";

        private readonly ZentricApiFactory _factory;

        public ManagementOperationsE2ETests(ZentricApiFactory factory) => _factory = factory;

        /// <summary>
        /// INV-05: bloquear cierra el login (401) y activar lo devuelve, sin tocar nada mas.
        /// </summary>
        [Fact]
        public async Task Bloqueo_CierraElLoginYActivarLoDevuelve()
        {
            await _factory.Actors.EnsureSeededAsync();
            using var admin = _factory.Actors.ClientFor("Admin");

            var email = "e2e-mgmt-bloqueado@zentric-e2e.test";
            var userId = await CreateUserAsync(admin, email, "Bloqueado Temporal", "DOC-MGMT-1", "Buyer");

            using var blocked = await admin.PostAsync($"/api/users/{userId}/block", content: null);
            Assert.Equal(HttpStatusCode.OK, blocked.StatusCode);

            Assert.Equal(HttpStatusCode.Unauthorized, await LoginStatusAsync(email, ZentricApiFactory.ActorPassword));

            using var active = await admin.PostAsync($"/api/users/{userId}/activate", content: null);
            Assert.Equal(HttpStatusCode.OK, active.StatusCode);

            Assert.Equal(HttpStatusCode.OK, await LoginStatusAsync(email, ZentricApiFactory.ActorPassword));
        }

        /// <summary>
        /// INV-05: bloquear dos veces o activar un activo responde 400; inexistentes, 404.
        /// </summary>
        [Fact]
        public async Task Bloqueo_DobleBloqueoYActivarActivoResponden400()
        {
            await _factory.Actors.EnsureSeededAsync();
            using var admin = _factory.Actors.ClientFor("Admin");

            var email = "e2e-mgmt-doble@zentric-e2e.test";
            var userId = await CreateUserAsync(admin, email, "Doble Intento", "DOC-MGMT-2", "Buyer");

            using var first = await admin.PostAsync($"/api/users/{userId}/block", content: null);
            Assert.Equal(HttpStatusCode.OK, first.StatusCode);

            using var second = await admin.PostAsync($"/api/users/{userId}/block", content: null);
            Assert.Equal(HttpStatusCode.BadRequest, second.StatusCode);

            using var reactivated = await admin.PostAsync($"/api/users/{userId}/activate", content: null);
            Assert.Equal(HttpStatusCode.OK, reactivated.StatusCode);

            using var redundant = await admin.PostAsync($"/api/users/{userId}/activate", content: null);
            Assert.Equal(HttpStatusCode.BadRequest, redundant.StatusCode);

            using var missingBlock = await admin.PostAsync($"/api/users/{Missing}/block", content: null);
            Assert.Equal(HttpStatusCode.NotFound, missingBlock.StatusCode);

            using var missingActivate = await admin.PostAsync($"/api/users/{Missing}/activate", content: null);
            Assert.Equal(HttpStatusCode.NotFound, missingActivate.StatusCode);
        }

        /// <summary>
        /// El Administrador lee la ficha por id; inexistente responde 404.
        /// </summary>
        [Fact]
        public async Task GetUserById_PropioYAjenoResponden200Y404()
        {
            await _factory.Actors.EnsureSeededAsync();
            using var admin = _factory.Actors.ClientFor("Admin");

            var userId = await CreateUserAsync(admin, "e2e-mgmt-ficha@zentric-e2e.test", "Ficha Lectura", "DOC-MGMT-3", "Buyer");

            using var found = await admin.GetAsync($"/api/users/{userId}");
            Assert.Equal(HttpStatusCode.OK, found.StatusCode);

            using var missing = await admin.GetAsync($"/api/users/{Missing}");
            Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);

            using var filtered = await admin.GetAsync("/api/users?role=Buyer");
            Assert.Equal(HttpStatusCode.OK, filtered.StatusCode);
        }

        /// <summary>
        /// Suspender saca del catalogo y publicar devuelve; repetir, 400; inexistente, 404.
        /// </summary>
        [Fact]
        public async Task Publicar_TrasSuspenderDevuelveElProductoAlCatalogo()
        {
            await _factory.Actors.EnsureSeededAsync();
            using var seller = _factory.Actors.ClientFor("Seller");

            var productId = await CreateProductAsync(seller, "Producto Gestion", "MGMT-SKU-1");

            using var suspended = await seller.PostAsync($"/api/Catalog/products/{productId}/suspend", content: null);
            Assert.Equal(HttpStatusCode.OK, suspended.StatusCode);

            using var suspendedAgain = await seller.PostAsync($"/api/Catalog/products/{productId}/suspend", content: null);
            Assert.Equal(HttpStatusCode.BadRequest, suspendedAgain.StatusCode);

            using var published = await seller.PostAsync($"/api/Catalog/products/{productId}/publish", content: null);
            Assert.Equal(HttpStatusCode.OK, published.StatusCode);

            using var publishedAgain = await seller.PostAsync($"/api/Catalog/products/{productId}/publish", content: null);
            Assert.Equal(HttpStatusCode.BadRequest, publishedAgain.StatusCode);

            using var missingPublish = await seller.PostAsync($"/api/Catalog/products/{Missing}/publish", content: null);
            Assert.Equal(HttpStatusCode.NotFound, missingPublish.StatusCode);

            using var missingSuspend = await seller.PostAsync($"/api/Catalog/products/{Missing}/suspend", content: null);
            Assert.Equal(HttpStatusCode.NotFound, missingSuspend.StatusCode);
        }

        /// <summary>
        /// ADR-0021: el conteo solo reduce, es idempotente en 5 minutos y el vendedor no ajusta.
        /// </summary>
        [Fact]
        public async Task Ajuste_CuentaReduceEsIdempotenteYRechazaExcesos()
        {
            await _factory.Actors.EnsureSeededAsync();
            var scenario = await _factory.PaidOrder.GetAsync();
            using var seller = _factory.Actors.ClientFor("Seller");
            using var supervisor = _factory.Actors.ClientFor("Supervisor");

            var product = await CreateProductWithVariantAsync(seller, "Producto Ajuste", "MGMT-SKU-2");
            var warehouseId = await CreateWarehouseAsync("Bodega Gestion Ajuste", scenario.SellerId);
            var inventoryId = await AddStockAsync(seller, product.VariantId, warehouseId, quantity: 5);

            // Sin ajuste real: la cantidad ya era correcta (AdjustedQuantity 0).
            using var noop = await supervisor.PostAsJsonAsync(
                $"/api/inventories/{inventoryId}/adjust", new { countedQuantity = 5, reason = "conteo sin novedad" });
            Assert.Equal(HttpStatusCode.OK, noop.StatusCode);

            using var first = await supervisor.PostAsJsonAsync(
                $"/api/inventories/{inventoryId}/adjust", new { countedQuantity = 3, reason = "conteo mensual" });
            Assert.Equal(HttpStatusCode.OK, first.StatusCode);

            // Reenvio: no duplica ni falla (200). No se aserta el cuerpo aqui:
            // por HTTP el agregado se recarga sin historial (GetByIdAsync no lo
            // incluye; existe LoadWithHistoryAsync para eso), asi que el reenvio
            // cae en la rama sin-ajuste en vez de la idempotente. La rama
            // idempotente se cubre a nivel de handler con historial en memoria.
            using var replay = await supervisor.PostAsJsonAsync(
                $"/api/inventories/{inventoryId}/adjust", new { countedQuantity = 3, reason = "conteo mensual" });
            Assert.Equal(HttpStatusCode.OK, replay.StatusCode);

            // No se puede inventar stock: el conteo no supera el disponible.
            using var exceeds = await supervisor.PostAsJsonAsync(
                $"/api/inventories/{inventoryId}/adjust", new { countedQuantity = 99, reason = "conteo inflado" });
            Assert.Equal(HttpStatusCode.BadRequest, exceeds.StatusCode);

            using var missing = await supervisor.PostAsJsonAsync(
                $"/api/inventories/{Missing}/adjust", new { countedQuantity = 1, reason = "conteo fantasma" });
            Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);

            // InventoryAdjust excluye al vendedor (evita conflicto de interes).
            using var forbidden = await seller.PostAsJsonAsync(
                $"/api/inventories/{inventoryId}/adjust", new { countedQuantity = 2, reason = "autoajuste" });
            Assert.Equal(HttpStatusCode.Forbidden, forbidden.StatusCode);
        }

        /// <summary>
        /// FAC-02: anular marca la Factura Maestra; repetirla o pedirla sin factura, 400/404.
        /// </summary>
        [Fact]
        public async Task Anular_MaestraUnaVezYRechazaLaSegunda()
        {
            await _factory.Actors.EnsureSeededAsync();
            var fresh = await _factory.PaidOrder.BuildFreshAsync();
            using var admin = _factory.Actors.ClientFor("Admin");

            using var annulled = await admin.PostAsJsonAsync(
                $"/api/billing/invoices/annul/{fresh.OrderId}", new { reason = "chargeback" });
            Assert.Equal(HttpStatusCode.OK, annulled.StatusCode);

            using var again = await admin.PostAsJsonAsync(
                $"/api/billing/invoices/annul/{fresh.OrderId}", new { reason = "chargeback" });
            Assert.Equal(HttpStatusCode.BadRequest, again.StatusCode);

            using var missing = await admin.PostAsJsonAsync(
                $"/api/billing/invoices/annul/{Missing}", new { reason = "chargeback" });
            Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);
        }

        /// <summary>
        /// Matriz de autorizacion: bodega propia 200, ajena 404, filtro de otro 400; login fallido 401.
        /// </summary>
        [Fact]
        public async Task Lecturas_MatrizRespondeSegunPropiedad()
        {
            await _factory.Actors.EnsureSeededAsync();
            var scenario = await _factory.PaidOrder.GetAsync();
            using var admin = _factory.Actors.ClientFor("Admin");
            using var seller = _factory.Actors.ClientFor("Seller");

            using var own = await admin.GetAsync($"/api/warehouses/{scenario.WarehouseId}");
            Assert.Equal(HttpStatusCode.OK, own.StatusCode);

            using var missing = await admin.GetAsync($"/api/warehouses/{Missing}");
            Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);

            using var foreign = await seller.GetAsync($"/api/warehouses?vendorId={Guid.NewGuid()}");
            Assert.Equal(HttpStatusCode.BadRequest, foreign.StatusCode);

            Assert.Equal(HttpStatusCode.Unauthorized, await LoginStatusAsync(ZentricApiFactory.AdminEmail, "ClaveIncorrecta1"));

            using var buyer2Orders = _factory.Actors.ClientFor("Buyer2");
            using var orders = await buyer2Orders.GetAsync("/api/orders");
            Assert.Equal(HttpStatusCode.OK, orders.StatusCode);

            using var buyer2Returns = _factory.Actors.ClientFor("Buyer2");
            using var returns = await buyer2Returns.GetAsync("/api/returns");
            Assert.Equal(HttpStatusCode.OK, returns.StatusCode);
        }

        private static async Task<Guid> CreateUserAsync(
            HttpClient admin, string email, string fullName, string document, string role)
        {
            using var response = await admin.PostAsJsonAsync("/api/users", new
            {
                email,
                fullName,
                identityDocument = document,
                password = ZentricApiFactory.ActorPassword,
                role,
            });

            if (!response.IsSuccessStatusCode)
            {
                throw new InvalidOperationException(
                    $"El alta de {email} respondio HTTP {(int)response.StatusCode}: {await response.Content.ReadAsStringAsync()}");
            }

            return Guid.Parse((await response.Content.ReadAsStringAsync()).Trim('"'));
        }

        private static async Task<Guid> CreateProductAsync(HttpClient seller, string name, string sku)
        {
            return (await CreateProductWithVariantAsync(seller, name, sku)).ProductId;
        }

        private static async Task<(Guid ProductId, Guid VariantId)> CreateProductWithVariantAsync(
            HttpClient seller, string name, string sku)
        {
            using var response = await seller.PostAsJsonAsync("/api/Catalog/products", new
            {
                name,
                description = "Alta de prueba de gestion",
                priceAmount = 10000m,
                priceCurrency = "COP",
                vendorId = Guid.NewGuid(),
                type = "Physical",
                variants = new[]
                {
                    new { sku, attributes = new[] { new { name = "Color", value = "Rojo" } } },
                },
            });

            if (!response.IsSuccessStatusCode)
            {
                throw new InvalidOperationException(
                    $"El alta de {name} respondio HTTP {(int)response.StatusCode}: {await response.Content.ReadAsStringAsync()}");
            }

            using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var productId = document.RootElement.GetProperty("productId").GetGuid();

            using var read = await seller.GetAsync($"/api/Catalog/products/{productId}");
            read.EnsureSuccessStatusCode();

            using var detail = JsonDocument.Parse(await read.Content.ReadAsStringAsync());
            var variantId = detail.RootElement.GetProperty("variants")[0].GetProperty("id").GetGuid();

            return (productId, variantId);
        }

        private async Task<Guid> CreateWarehouseAsync(string name, Guid vendorId)
        {
            using var admin = _factory.Actors.ClientFor("Admin");

            using var response = await admin.PostAsJsonAsync("/api/warehouses", new
            {
                name,
                location = "Bogota",
                capacity = 100,
                type = "Vendor",
                vendorId,
            });

            if (!response.IsSuccessStatusCode)
            {
                throw new InvalidOperationException(
                    $"El alta de '{name}' respondio HTTP {(int)response.StatusCode}: {await response.Content.ReadAsStringAsync()}");
            }

            return Guid.Parse((await response.Content.ReadAsStringAsync()).Trim('"'));
        }

        private static async Task<Guid> AddStockAsync(HttpClient seller, Guid variantId, Guid warehouseId, int quantity)
        {
            using var response = await seller.PostAsJsonAsync("/api/Inventories/stock", new
            {
                variantId,
                warehouseId,
                quantity,
            });

            if (!response.IsSuccessStatusCode)
            {
                throw new InvalidOperationException(
                    $"El alta de stock respondio HTTP {(int)response.StatusCode}: {await response.Content.ReadAsStringAsync()}");
            }

            // El endpoint retorna el identificador del registro de inventario.
            return Guid.Parse((await response.Content.ReadAsStringAsync()).Trim('"'));
        }

        private async Task<HttpStatusCode> LoginStatusAsync(string email, string password)
        {
            using var client = _factory.CreateClient();
            using var response = await client.PostAsJsonAsync("/api/auth/login", new { email, password });

            return response.StatusCode;
        }
    }
}
