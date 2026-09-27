# Frontend-Adapters

> Mapeo del adaptador HTTP del cliente contra la API real de Zentric.
> Fuente de verdad del contrato:
> [`../backendSDD/Presentation/01-endpoints.md`](../backendSDD/Presentation/01-endpoints.md)
> y el documento vivo `GET /swagger/v1/swagger.json`.
>
> `[OBSERVADO]` Este inventario se obtuvo consultando el OpenAPI de la API en
> ejecución (`.NET 10`, 26 endpoints + `/health`). No se inventó ninguna ruta.

---

## 1. Configuración del adaptador

| Aspecto | Definición |
| --- | --- |
| URL base | `VITE_API_BASE_URL`, defecto `http://localhost:5076` |
| Cabeceras fijas | `Accept: application/json`, `Content-Type: application/json` |
| Autenticación | `Authorization: Bearer <token>` **sólo si** existe token |
| Correlación | `X-Request-Id` por petición, visible en errores |
| Tiempo máximo | 15 s, con cancelación por `AbortController` |
| Reintentos | 1 reintento sólo en `5xx` y error de red; nunca en `4xx` |

---

## 2. Inventario de endpoints

Leyenda: `✅ VERIFIED` verificado en ejecución · `⬜ MAPPED` mapeado, no revalidado.

| Método | Ruta | Puerto | Estado |
| --- | --- | --- | --- |
| GET | `/health` | `getHealth` | ✅ `VERIFIED` |
| GET | `/api/Users` | `listUsers` | ✅ `VERIFIED` |
| POST | `/api/Users` | `createUser` | ✅ `VERIFIED` |
| GET | `/api/Users/{id}` | `getUser` | ✅ `VERIFIED` |
| GET | `/api/Warehouses` | `listWarehouses` | ✅ `VERIFIED` |
| POST | `/api/Warehouses` | `createWarehouse` | ✅ `VERIFIED` |
| GET | `/api/Warehouses/{id}` | `getWarehouse` | ✅ `VERIFIED` |
| GET | `/api/Catalog/products` | `listProducts` | ✅ `VERIFIED` |
| POST | `/api/Catalog/products` | `createProduct` | ✅ `VERIFIED` |
| GET | `/api/Catalog/products/{id}` | `getProduct` | ✅ `VERIFIED` |
| POST | `/api/Catalog/products/{productId}/publish` | `publishProduct` | ✅ `VERIFIED` |
| GET | `/api/Inventories/{variantId}` | `listInventoryByVariant` | ⬜ `MAPPED` |
| POST | `/api/Inventories/stock` | `addStock` | ✅ `VERIFIED` |
| POST | `/api/Orders/cart` | `createCart` | ✅ `VERIFIED` |
| POST | `/api/Orders/cart/items` | `addCartItem` | ✅ `VERIFIED` |
| GET | `/api/Orders/{id}` | `getOrder` | ✅ `VERIFIED` |
| POST | `/api/Orders/{id}/checkout` | `checkoutOrder` | ✅ `VERIFIED` |
| POST | `/api/Orders/{id}/pay` | `payOrder` | ✅ `VERIFIED` |
| POST | `/api/Billing/invoices/generate/{orderId}` | `generateInvoices` | ✅ `VERIFIED` |
| GET | `/api/Billing/invoices/order/{orderId}` | `getInvoicesByOrder` | ⬜ `MAPPED` |
| POST | `/api/Logistics/fulfillment` | `createFulfillment` | ⬜ `MAPPED` |
| GET | `/api/Logistics/fulfillment` | `listFulfillments` | ⬜ `MAPPED` (**no admite GET** → R-03) |
| POST | `/api/Logistics/fulfillment/{id}/dispatch` | `dispatchFulfillment` | ⬜ `MAPPED` |
| POST | `/api/Logistics/fulfillment/cancel-ghost-stock` | `cancelGhostStock` | ⬜ `MAPPED` |
| POST | `/api/Returns/request` | `requestReturn` | ⬜ `MAPPED` |
| POST | `/api/Returns/{id}/inspect` | `inspectReturn` | ⬜ `MAPPED` |
| POST | `/api/Returns/{id}/approve` | `approveReturn` | ⬜ `MAPPED` |


---

## 3. Transformaciones requeridas

### 3.1 Respuestas `Guid` serializado

Los endpoints de creación devuelven el identificador como **cadena JSON**; la
respuesta cruda es `"3de3d5d4-…"`. El adaptador debe desenvolver el JSON:

```ts
const raw = await response.text();
const id = JSON.parse(raw) as string; // -> "3de3d5d4-…"
```

Aplicar `readGuid(response)` en `createUser`, `createWarehouse`, `createProduct`,
`addStock`, `createCart`, `createFulfillment` y `requestReturn`.

### 3.2 Enums como números

Los enums viajan como enteros. El cliente los convierte con **constantes
explícitas**, nunca con índices literales, para sobrevivir a cambios de orden:

```ts
export const UserRole = { Seller: 1, Buyer: 2, Admin: 3, LogisticsOperator: 4 } as const;
export const OrderStatus = { Cart: 0, PendingPayment: 1, Paid: 2, Dispatched: 3, Delivered: 4 } as const;
```

### 3.3 `variantId` versus `productId` (riesgo FR-03)

`[OBSERVADO]` El alta de producto devuelve el **`id` del producto**, pero el carrito y
el inventario exigen el **`id` de la variante**. Secuencia obligatoria:

```text
1. POST /api/Catalog/products        -> "productId"
2. GET  /api/Catalog/products/{productId}
3. leer variants[0].id               -> "variantId"
4. usar "variantId" en carrito e inventario
```

La UI debe **explicar** este paso: mostrar el SKU y el identificador de la variante,
nunca el del producto como si fuera utilizable.

### 3.4 Formato de error

El backend responde con dos envoltorios. El adaptador cubre ambos:

```jsonc
// middleware de validación de ASP.NET
{ "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": { "role": ["The JSON value could not be converted…"] },
  "traceId": "00-979ade00…" }

// ProblemDetails del controlador
{ "status": 400, "detail": "Order with ID … not found." }
```

Orden de extracción: `detail` → `title` → aplanado de `errors` → mensaje genérico
con el código de estado. Se conserva el `traceId` para soporte.

> **Nota técnica (R-05):** `Program.cs` usa `ProblemDetails` de ASP.NET Core, que
> implementa la forma obsoleta **RFC 7807**. El estándar vigente es **RFC 9457**,
> que la sustituye. El cliente debe tolerar ambos envoltorios.

---

## 4. Sesión

`[OBSERVADO]` El backend **no emite JWT**. Por tanto:

- El `SessionPort` cumple el contrato, pero el token llega siempre vacío.
- Rol e identificador de usuario se guardan para controlar la navegación.
- Almacenamiento: `sessionStorage` (se descarta al cerrar la pestaña). Nunca
  `localStorage`, nunca cookies, nunca en el código.
- Al recibir `401`, el adaptador limpia la sesión y el router lleva a la entrada.

---

## 5. Alertas

Un único `AlertPort`. La implementación puede usar diálogo nativo o SweetAlert2:
es una decisión de presentación, no de dominio. Obligatorio en:

- errores inesperados y de red;
- confirmación de acciones **financieras o destructivas**: pagar, cancelar,
  eliminar, anular;
- confirmación que nombre la entidad afectada: pedido, variante o bodega.

---

## 6. Hallazgos que requieren intervención del backend

| ID | Hallazgo | Acción solicitada |
| --- | --- | --- |
| R-01 | No hay autenticación ni emisión de JWT | Definir esquema de identidad y claims |
| R-02 | No hay política CORS | Habilitar el origen del frontend en desarrollo |
| R-03 | `GET /api/Logistics/fulfillment` no admite `GET` (405) | Añadir listado o documentar el método real |
| R-04 | No existe listado de pedidos | Añadir `GET /api/Orders` si el panel debe listar |
| R-05 | `ProblemDetails` usa la forma RFC 7807 | Migrar a RFC 9457 |
| R-06 | El alta de producto no devuelve `variantId` | Devolverlo junto al `productId` |
| R-07 | Facturas de vendedor (split) no implementadas | Completar o documentar el alcance |

Mientras R-01 y R-02 sigan abiertos, el frontend **no puede autenticarse ni
consumir la API desde el navegador**. Se registra como bloqueo de entrega.
