using System.Net.Http.Json;
using System.Text.Json;

namespace Zentric.Tests.E2E
{
    /// <summary>
    /// Escenario de negocio completo y compartido: producto con stock, carrito, checkout, pago y
    /// las tres facturas.
    ///
    /// Existe separado de las pruebas porque es caro (varias peticiones) y porque la mayoria de
    /// las comprobaciones necesitan el MISMO pedido pagado: las facturas, la vista del vendedor y
    /// la devolucion se radican todas sobre el. Sembrarlo por prueba daria resultados que dependen
    /// del orden de ejecucion, que es justo lo que se quiere evitar.
    ///
    /// Sigue el mismo recorrido que `authorization-smoke.ps1`, aqui ya como pruebas del runner.
    /// </summary>
    public sealed class PaidOrderScenario
    {
        private readonly ApiActors _actors;
        private readonly SemaphoreSlim _gate = new(1, 1);
        private Scenario? _cached;

        public PaidOrderScenario(ApiActors actors) => _actors = actors;

        public Guid SellerId { get; private set; }
        public Guid ProductId { get; private set; }
        public Guid VariantId { get; private set; }
        public Guid WarehouseId { get; private set; }
        public Guid ForeignWarehouseId { get; private set; }
        public Guid OrderId { get; private set; }
        public int InvoiceCount { get; private set; }
        public Guid ReturnRequestId { get; private set; }

        /// <summary>
        /// Devuelve el escenario ya sembrado, construyendolo la primera vez que se pide.
        ///
        /// Se awaita siempre. La variante sincrona que existia antes bloqueaba un hilo del pool
        /// con <c>GetAwaiter().GetResult()</c> mientras la base de datos y HTTP trabajaban; con el
        /// resto de la suite en paralelo eso agotaba el pool y la corrida entera se colgaba. Es
        /// async de verdad por eso, no por estilo.
        /// </summary>
        public async Task<Scenario> GetAsync()
        {
            if (_cached is not null)
            {
                return _cached;
            }

            await _gate.WaitAsync().ConfigureAwait(false);

            try
            {
                _cached ??= await BuildAsync().ConfigureAwait(false);
                return _cached;
            }
            finally
            {
                _gate.Release();
            }
        }
/// <summary>
        /// Construye un escenario NUEVO, ignorando la cache compartida.
        ///
        /// El escenario de la coleccion tiene un solo comprobante de pago y una sola solicitud de
        /// devolucion. Quien reembolsa consume saldo, asi que la primera prueba que lo hace deja a
        /// las siguientes sin nada que acreditar. Antes eso no se notaba porque
        /// <c>PaymentReceipt.Refund()</c> terminaba en <c>if (Status == Refunded) return;</c>: no
        /// duplicaba el dinero, pero tampoco lo movia y el resto de la suite continuaba en verde.
        /// Por eso las pruebas que mueven dinero piden aqui su propio pedido.
        /// </summary>
        public async Task<Scenario> BuildFreshAsync()
        {
            var fresh = new PaidOrderScenario(_actors);

            await fresh._gate.WaitAsync().ConfigureAwait(false);

            try
            {
                return await fresh.BuildAsync().ConfigureAwait(false);
            }
            finally
            {
                fresh._gate.Release();
            }
        }

        private async Task<Scenario> BuildAsync()
        {
            // El alta de producto ignora el VendorId del cuerpo a proposito (Q-21b): se manda uno
            // falso y luego se comprueba que el dueno real es el del token. Es la contraprueba de
            // que la identidad NO viaja en el cuerpo.
            var wrongVendor = Guid.NewGuid();

            ProductId = await CreateProductAsync(wrongVendor);
            (SellerId, VariantId) = await ReadProductAsync(ProductId);

            WarehouseId = await CreateWarehouseAsync("Bodega propia del vendedor", SellerId);
            ForeignWarehouseId = await CreateWarehouseAsync("Bodega de otro vendedor", Guid.NewGuid());

            await AddStockAsync(VariantId, WarehouseId, quantity: 5);

            OrderId = await CreateCartAsync();
            await AddItemAsync(OrderId, VariantId, quantity: 2);
            await CheckoutAsync(OrderId);
            await PayAsync(OrderId);

            await GenerateInvoicesAsync(OrderId);
            InvoiceCount = await CountInvoicesAsync(OrderId);

            ReturnRequestId = await RequestReturnAsync(OrderId, VariantId, WarehouseId, quantity: 1);

            return new Scenario(this);
        }

        private async Task<Guid> CreateProductAsync(Guid wrongVendor)
        {
            using var client = _actors.ClientFor("Seller");

            using var response = await client.PostAsJsonAsync("/api/Catalog/products", new
            {
                name = "Producto E2E",
                description = "Alta de prueba end to end",
                priceAmount = 10000m,
                priceCurrency = "COP",
                vendorId = wrongVendor,
                type = "Physical",
                variants = new[]
                {
                    new { sku = "E2E-SKU", attributes = new[] { new { name = "Color", value = "Azul" } } },
                },
            });

            return await ReadGuidPropertyAsync(response, "alta de producto", "productId");
        }

        private async Task<(Guid VendorId, Guid VariantId)> ReadProductAsync(Guid productId)
        {
            using var client = _actors.ClientFor("Seller");

            using var response = await client.GetAsync($"/api/Catalog/products/{productId}");
            await EnsureOkAsync(response, "lectura de producto");

            using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var root = document.RootElement;

            return (root.GetProperty("vendorId").GetGuid(), root.GetProperty("variants")[0].GetProperty("id").GetGuid());
        }

        private async Task<Guid> CreateWarehouseAsync(string name, Guid vendorId)
        {
            using var client = _actors.ClientFor("Admin");

            using var response = await client.PostAsJsonAsync("/api/warehouses", new
            {
                name,
                location = "Bogota",
                capacity = 100,
                type = "Vendor",
                vendorId,
            });

            return await ReadGuidAsync(response, $"alta de bodega '{name}'");
        }

        private async Task AddStockAsync(Guid variantId, Guid warehouseId, int quantity)
        {
            using var client = _actors.ClientFor("Seller");

            using var response = await client.PostAsJsonAsync("/api/Inventories/stock", new
            {
                variantId,
                warehouseId,
                quantity,
            });

            await EnsureOkAsync(response, "alta de stock");
        }

        private async Task<Guid> CreateCartAsync()
        {
            using var client = _actors.ClientFor("Buyer");

            using var response = await client.PostAsync("/api/orders/cart", content: null);

            return await ReadGuidAsync(response, "alta de carrito");
        }

        private async Task AddItemAsync(Guid orderId, Guid variantId, int quantity)
        {
            using var client = _actors.ClientFor("Buyer");

            // Solo lo que admite el contrato: ni precio ni vendedor (PED-04 / ADR-0020).
            // Mandarlos aqui pasaria desapercibido porque el binder ignora lo que no
            // conoce, y el E2E dejaria de comprobar que el precio sale del catalogo.
            using var response = await client.PostAsJsonAsync("/api/orders/cart/items", new
            {
                orderId,
                variantId,
                quantity,
            });

            await EnsureOkAsync(response, "alta de item");
        }
    private async Task CheckoutAsync(Guid orderId)
        {
            using var client = _actors.ClientFor("Buyer");
            using var response = await client.PostAsync($"/api/orders/{orderId}/checkout", content: null);
            await EnsureOkAsync(response, "checkout");
        }

        private async Task PayAsync(Guid orderId)
        {
            using var client = _actors.ClientFor("Buyer");
            using var response = await client.PostAsync($"/api/orders/{orderId}/pay", content: null);
            await EnsureOkAsync(response, "pago");
        }

        private async Task GenerateInvoicesAsync(Guid orderId)
        {
            using var client = _actors.ClientFor("Admin");
            using var response = await client.PostAsync($"/api/billing/invoices/generate/{orderId}", content: null);
            await EnsureOkAsync(response, "emision de facturas");
        }

        private async Task<int> CountInvoicesAsync(Guid orderId)
        {
            using var client = _actors.ClientFor("Admin");
            using var response = await client.GetAsync($"/api/billing/invoices/order/{orderId}");
            await EnsureOkAsync(response, "lectura de facturas");

            using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            return document.RootElement.GetArrayLength();
        }

        private async Task<Guid> RequestReturnAsync(Guid orderId, Guid variantId, Guid warehouseId, int quantity)
        {
            using var client = _actors.ClientFor("Buyer");

            using var response = await client.PostAsJsonAsync("/api/returns/request", new
            {
                customerOrderId = orderId,
                variantId,
                warehouseId,
                quantity,
            });

            return await ReadGuidAsync(response, "radicacion de devolucion");
        }

        private static async Task EnsureOkAsync(HttpResponseMessage response, string step)
        {
            if (!response.IsSuccessStatusCode)
            {
                throw new InvalidOperationException(
                    $"El paso '{step}' respondio HTTP {(int)response.StatusCode}: {await response.Content.ReadAsStringAsync()}");
            }
        }

        /// <summary>
        /// Lee un GUID que el endpoint devuelve como texto plano, que es como lo devuelven los
        /// endpoints que crean un recurso simple (bodega, pedido...).
        /// </summary>
        private static async Task<Guid> ReadGuidAsync(HttpResponseMessage response, string step)
        {
            await EnsureOkAsync(response, step);
            return Guid.Parse((await response.Content.ReadAsStringAsync()).Trim('"'));
        }

        /// <summary>
        /// Lee un GUID de una propiedad concreta de un cuerpo JSON.
        ///
        /// Es un metodo aparte y no un parametro opcional de <see cref="ReadGuidAsync"/> a
        /// proposito: los dos leen cuerpos de forma distinta y mezclarlos en uno solo cambio el
        /// comportamiento de los llamadores que si necesitaban el texto plano, rompiéndolos todos
        /// de golpe. Queda separado para que cada quien llame a lo que corresponde.
        /// </summary>
        private static async Task<Guid> ReadGuidPropertyAsync(
            HttpResponseMessage response, string step, string property)
        {
            await EnsureOkAsync(response, step);

            using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            return document.RootElement.GetProperty(property).GetGuid();
        }
    }

    /// <summary>
    /// Marcador del escenario ya sembrado. Existe para que el codigo de las pruebas se lea como
    /// "el pedido pagado" y no como una cadena de llamadas de siembra.
    /// </summary>
    public sealed class Scenario
    {
        public Scenario(PaidOrderScenario source)
        {
            SellerId = source.SellerId;
            ProductId = source.ProductId;
            VariantId = source.VariantId;
            WarehouseId = source.WarehouseId;
            ForeignWarehouseId = source.ForeignWarehouseId;
            OrderId = source.OrderId;
            InvoiceCount = source.InvoiceCount;
            ReturnRequestId = source.ReturnRequestId;
        }

        public Guid SellerId { get; }
        public Guid ProductId { get; }
        public Guid VariantId { get; }
        public Guid WarehouseId { get; }
        public Guid ForeignWarehouseId { get; }
        public Guid OrderId { get; }
        public int InvoiceCount { get; }
        public Guid ReturnRequestId { get; }
    }
}