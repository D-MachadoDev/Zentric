# Frontend-Adapters

> Mapeo del adaptador HTTP del cliente contra la API real de Zentric.
> Fuente de verdad del contrato:
> [`../backendSDD/Presentation/01-endpoints.md`](../backendSDD/Presentation/01-endpoints.md)
> y el documento vivo `GET /swagger/v1/swagger.json`.
>
> `[OBSERVADO]` Inventario originalmente consultado contra el OpenAPI en ejecución
> (26 endpoints). **Actualizado 2026-10-09:** el backend publica hoy **44 endpoints +
> `/health`**. La fuente de verdad es
> [`../backendSDD/Presentation/01-endpoints.md`](../backendSDD/Presentation/01-endpoints.md).

---

## 1. Configuración del adaptador

| Aspecto | Definición |
| --- | --- |
| URL base | `VITE_API_BASE_URL`, defecto `http://localhost:5076` |
| Cabeceras fijas | `Accept: application/json`, `Content-Type: application/json` |
| Autenticación | `Authorization: Bearer {token}` de `POST /api/auth/login`. **Obligatorio en todas las llamadas**, salvo `login` y `health`. `X-Buyer-Id` fue eliminada por `ADR-0009` y ya no autentica |
| Correlación | **No implementada.** Propagar un id de correlación es `[PROPUESTO]`: el backend actual no lo soporta (verificado en `Program.cs`). El `traceId` de ASP.NET es lo único disponible |
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
| GET | `/api/Warehouses` | `listWarehouses` | ✅ `VERIFIED` |
| POST | `/api/Warehouses` | `createWarehouse` | ✅ `VERIFIED` |
| GET | `/api/Catalog/products` | `listProducts` | ✅ `VERIFIED` |
| POST | `/api/Catalog/products` | `createProduct` | ✅ `VERIFIED` |
| GET | `/api/Catalog/products/{id}` | `getProduct` | ✅ `VERIFIED` |
| POST | `/api/Catalog/products/{productId}/publish` | `publishProduct` | ✅ `VERIFIED` |
| POST | `/api/Catalog/products/{productId}/suspend` | `suspendProduct` | ⬜ `MAPPED` |
| GET | `/api/Inventories/{variantId}` | `listInventoryByVariant` | ⬜ `MAPPED` |
| POST | `/api/Inventories/stock` | `addStock` | ✅ `VERIFIED` |
| POST | `/api/Orders/cart` | `createCart` | ✅ `VERIFIED` |
| POST | `/api/Orders/cart/items` | `addCartItem` | ✅ `VERIFIED` |
| GET | `/api/Orders/{id}` | `getOrder` | ✅ `VERIFIED` |
| POST | `/api/Orders/{id}/checkout` | `checkoutOrder` | ✅ `VERIFIED` |
| POST | `/api/Orders/{id}/pay` | `payOrder` | ✅ `VERIFIED` |
| POST | `/api/Billing/invoices/generate/{orderId}` | `generateInvoices` | ✅ `VERIFIED` |
| GET | `/api/Billing/invoices/order/{orderId}` | `getInvoicesByOrder` | ⬜ `MAPPED` |
| POST | `/api/Logistics/fulfillment` | `createFulfillment` | ✅ `VERIFIED` |
| POST | `/api/Logistics/fulfillment/{id}/pack` | `packFulfillment` | ✅ `VERIFIED` |
| POST | `/api/Logistics/fulfillment/{id}/dispatch` | `dispatchFulfillment` | ✅ `VERIFIED` |
| POST | `/api/Logistics/fulfillment/{id}/deliver` | `deliverFulfillment` | ✅ `VERIFIED` |
| POST | `/api/Logistics/fulfillment/cancel-ghost-stock` | `cancelGhostStock` | ✅ `VERIFIED` |
| POST | `/api/Returns/request` | `requestReturn` | ⬜ `MAPPED` |
| POST | `/api/Returns/{id}/inspect` | `inspectReturn` | ⬜ `MAPPED` |
| POST | `/api/Returns/{id}/approve` | `approveReturn` | ⬜ `MAPPED` |
| GET | `/api/Returns` | `listReturns` | ✅ `VERIFIED` |
| POST | `/api/Returns/{id}/refund` | `refundReturn` | ✅ `VERIFIED` |

> El listado de despachos es `GET /api/logistics/fulfillments` (en plural, R-03
> resuelto por `ADR-0017`) y `GET /api/Users/{id}` y `GET /api/Warehouses/{id}`
> son endpoints reales del backend que **el puerto del cliente no expone**: nadie
> los necesita hoy, así que no están en la tabla ni en `ZentricApiPort`.


---

## 3. Transformaciones requeridas

### 3.1 Respuestas `Guid` serializado

Los endpoints de creación devuelven el identificador como **cadena JSON**; la
respuesta cruda es `"3de3d5d4-…"`. El adaptador debe desenvolver el JSON:

```ts
const raw = await response.text();
const id = JSON.parse(raw) as string; // -> "3de3d5d4-…"
```

Aplicar `readGuid(response)` en `createUser`, `createWarehouse`, `addStock`,
`createCart`, `createFulfillment` y `requestReturn`. `createProduct` **no** va en
esta lista: devuelve `CreatedProductDto` (`{ productId, variantIds }`, CAT-01), no
un Guid crudo, así que el adaptador desenvuelve el objeto.

### 3.2 Enums como nombres (cerrado 2026-09-29, `ADR-0012`)

`[CONFIRMADO]` El cuerpo JSON **solo acepta el nombre** del enum (`"Seller"`, `"Physical"`). Enviar
un entero responde `400`. Las respuestas ya devolvían el nombre, así que entrada y salida hablan
igual. Las constantes del cliente son literales de texto, nunca índices numéricos:

```ts
export const UserRole = {
  Buyer: 'Buyer', Seller: 'Seller', Administrator: 'Administrator',
  Supervisor: 'Supervisor', LogisticsOperator: 'LogisticsOperator',
} as const;
export const OrderStatus = {
  Cart: 'Cart', PendingPayment: 'PendingPayment', Paid: 'Paid',
  Dispatched: 'Dispatched', Delivered: 'Delivered', Cancelled: 'Cancelled',
} as const;
```

> **Este bloque estaba mal antes de 2026-09-29.** Decía `Seller: 1, Buyer: 2, Admin: 3`, que no
> corresponde a ningún valor real del dominio (`Buyer=0, Seller=1, Administrator=2, Supervisor=3,
> LogisticsOperator=4`), omitía `Supervisor` en `UserRole` y `Cancelled` en `OrderStatus`. Si se
> hubiera coded con esos números, los altares habrían creado el rol equivocado en silencio.

Un nombre mal escrito no degrada a un valor por defecto: la petición cae en `400` con
`ProblemDetails` citando la ruta JSON (`$.role`). La lectura **no** distingue mayúsculas
(`"seller"` funciona, verificado), pero el cliente manda el nombre exacto para que log y contrato
coincidan.

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

### 3.5 Comandos que responden `200 OK` sin cuerpo

`checkout`, `pay`, `pack`, `dispatch`, `deliver`, `publish`, `inspect` y `approve`
devuelven `200 OK` **vacío** (el controlador hace `return Ok();`). El adaptador no
puede interpretarlos como `boolean` ni como el estado resultante: el caso de uso
responde `void` y, si la interfaz necesita el estado nuevo, lo relee con la
consulta correspondiente (`getOrder`, `getProduct`).

Excepción: `generateInvoices` sí devuelve cuerpo (`Ok(result.Value)`), y
`createProduct` devuelve `CreatedProduct` (CAT-01).

---

## 4. Sesión

`[CONFIRMADO]` El backend **emite JWT** desde `ADR-0009` (`POST /api/auth/login`,
HS256, **60 min**) y **no tiene token de refresco** (`01-endpoints.md:15` y
`ADR-0009:62` lo niegan explícitamente). Decisión del Owner **Q15-B: el backend
manda** — no se inventa un endpoint que no existe.

- **Access token: sólo en memoria** (variable del módulo / contexto React). Nunca
  `localStorage`, nunca `sessionStorage`, nunca cookie legible por JS.
- **No existe `POST /api/auth/refresh`.** El interceptor **no** reintenta nada:
  no hay segundo intento ni renovación.
- El interceptor adjunta `Authorization: Bearer {token}` a cada petición.
- Al recibir `401` (token caducado o sesión vacía): limpiar la sesión y llevar al
  router a la entrada con aviso de expiración.
- `GET /api/auth/me` restaura la identidad **sólo si aún hay token válido en
  memoria**; **no** prolonga la vida del token (lee los claims del token vigente).
- Rol e identificador salen de la respuesta de `login` (`role`, `userId`).
- `403` **no** cierra la sesión: muestra aviso de permiso insuficiente.

> **Consecuencia asumida (por seguir al backend):** al recargar la página el token
> en memoria se pierde y hay que volver a autenticarse. Es el precio de no tener
> refresh: lo documenta `ADR-0009:120` ("al cabo de 60 minutos el usuario debe
> volver a autenticarse"). Si algún día el backend añade refresh, sólo cambia esta
> sección y el `SessionPort`.

> **Por qué no `localStorage`:** el access token es un bearer; almacenarlo
> accesible por JS lo expone a cualquier XSS. Vive en memoria y muere al recargar.

---

## 5. Alertas

Un único `AlertPort`. La implementación usa los componentes de aviso del design
system (shadcn `AlertDialog`/`Toast` + `sonner`), no una librería externa aparte:
es una decisión de presentación, no de dominio. Obligatorio en:

- errores inesperados y de red;
- confirmación de acciones **financieras o destructivas**: pagar, cancelar,
  eliminar, anular;
- confirmación que nombre la entidad afectada: pedido, variante o bodega.

**Composición (F4b).** Se parte en dos para respetar §2, que prohíbe a
`adapters/` importar componentes de UI:

| Pieza | Vive | Importa |
| --- | --- | --- |
| `AlertAdapter` | `adapters/alert/` | Sólo `domain/`: mantiene la cola de peticiones y resuelve las promesas. Sin React ni JSX. |
| `AlertHost` | `components/alert/` | El adaptador de arriba más `AlertDialog` y `Toaster` de `@zentric/ui`. Se monta una vez en `main.tsx`. |

- `confirm()` devuelve la elección del usuario. Sólo hay **una** confirmación
  pendiente: si llega otra mientras el diálogo está abierto, la anterior se
  resuelve `false` (cancelada) en vez de quedar colgada para siempre.
- `show()` encola el aviso y resuelve de inmediato: un toast se cierra solo, así
  que esperar a que desaparezca no significa nada para quien lo invoca.

---

## 6. Hallazgos que requieren intervención del backend

> **Aviso de namespace.** Estos `R-` son los de la **auditoría de contrato con el frontend**. No
> coinciden con los riesgos del backend de `backendSDD/SDD.md` §10.2, donde `R-06` es "reloj
> directo" y `R-08` es "analizadores". Ver [`SDD.md` §19.2](../backendSDD/SDD.md#192-el-prefijo-r-está-duplicado--aviso-importante).

| ID | Hallazgo | Acción solicitada |
| --- | --- | --- |
| R-01 | ~~No hay autenticación ni emisión de JWT~~ **RESUELTO 2026-09-28** | `POST /api/auth/login` emite JWT HS256; `X-Buyer-Id` eliminada. Ver `ADR-0009` |
| R-02 | ~~No hay política CORS~~ **RESUELTO 2026-09-27** | Verificado: origen permitido recibe header, ajeno no, preflight 204 |
| R-03 | ~~`GET /api/Logistics/fulfillment` no admite `GET` (405)~~ **RESUELTO 2026-09-30** | El listado es `GET /api/logistics/fulfillments`, en plural. Ver `ADR-0017` |
| R-04 | ~~No existe listado de pedidos~~ **RESUELTO 2026-09-30** | `GET /api/Orders` existe y filtra por rol. Ver `ADR-0017` |
| R-05 | `ProblemDetails` usa la forma RFC 7807 | Migrar a RFC 9457 |
| R-06 | ~~El alta de producto no devuelve `variantId`~~ **RESUELTO 2026-09-30** | `POST /api/catalog/products` devuelve `{ productId, variantIds }` |
| R-07 | ~~Split no implementado~~ **RESUELTO 2026-09-27** | Una factura por `VendorId`; verificado contra la base real |

**Estado 2026-09-30:** de las siete acciones, **seis están resueltas y verificadas**. El frontend ya
puede autenticarse y consumir la API desde el navegador, y ya tiene listados para pedidos,
despachos, devoluciones, facturas e inventario. Quedan dos: **R-05** (migrar `ProblemDetails` a
RFC 9457) y **R-08** (reportes administrativos), que requiere dictamen del Owner.
