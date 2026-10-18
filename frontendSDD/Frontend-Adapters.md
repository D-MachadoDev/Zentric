# Adaptadores de Infraestructura, Red y Sesión en Memoria (Frontend Adapters)

> Especificación contractual de los adaptadores secundarios del cliente web de **Zentric Marketplace** (`frontend/apps/frontend/src/adapters/`).  
> Define el monopolio de red en `HttpClient.ts`, la matriz de contrato HTTP de los 45 endpoints verificada contra los controladores de `Zentric.Api`, las reglas de transformación de payloads y errores RFC 7807, el adaptador de sesión volátil en memoria RAM (`MemorySessionAdapter.ts`), el adaptador de confirmaciones (`AlertAdapter.ts`) y los adaptadores deterministas de prueba (`mocks/`).

---

## 1. Monopolio de Red y Políticas de Transporte (`HttpClient.ts`)

En cumplimiento de la Arquitectura Hexagonal, `apps/frontend/src/adapters/http/HttpClient.ts` detenta el **monopolio absoluto de red**: ningún componente visual, hook de React, esquema Zod ni servicio de dominio puede invocar `fetch()`, `XMLHttpRequest` o clientes HTTP externos directamente.

| Parámetro de Transporte | Especificación Contractual | Procedencia y Justificación |
|---|---|---|
| **Resolución de URL Base** | `window.__ZENTRIC_API_BASE_URL__ ?? import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:15433'` | Soporta inyección en tiempo de arranque en contenedor Nginx (`env-config.js`) y desarrollo local en Vite (`Program.cs:218-231`). |
| **Cabeceras Estándar** | `Accept: application/json, application/problem+json`<br>`Content-Type: application/json` (cuando existe cuerpo) | Cumplimiento estricto del contrato JSON y RFC 7807 ([ADR-0015](../backendSDD/Adr/0015-contrato-de-error-http-problem-json.md)). |
| **Inyección de Identidad** | `Authorization: Bearer <token>` leído síncronamente desde `SessionPort.getAccessToken()` | Satisface la política de reserva `FallbackPolicy` de [`Program.cs:126-128`](../backend/Zentric.Api/Program.cs#L126-L128) ([ADR-0009](../backendSDD/Adr/0009-autenticacion-jwt-rg01.md)). |
| **Erradicación de Cabeceras Forjables** | Prohibido adjuntar `X-Buyer-Id`, `X-User-Id` o `X-Role` | La identidad y el rol se extraen exclusivamente de los claims firmados `sub` y `role` en el servidor ([`ClaimsUserAccessor.cs`](../backend/Zentric.Api/Security/ClaimsUserAccessor.cs)). |
| **Tiempo Límite (*Timeout*)** | `15_000 ms` mediante `AbortSignal.timeout(15000)` | Evita bloqueos indefinidos de interfaz ante caídas de red. |
| **Política de Reintentos** | Máximo `1` reintento sólo en peticiones `GET` ante fallos de red o códigos `502`/`503`/`504`. **Cero reintentos (`0`)** en comandos `POST` o respuestas `4xx`. | Impide duplicar efectos financieros o reservas de inventario en checkout y pagos. |

---

## 2. Matriz Contractual de los 45 Endpoints en `HttpClient.ts`

Cada fila vincula el método de `ZentricApiPort` con la ruta HTTP real, la política de autorización en [`AuthorizationPolicies.cs:279-372`](../backend/Zentric.Api/Security/AuthorizationPolicies.cs#L279-L372), el formato exacto de entrada y el formato de respuesta en el controlador C#:

### 2.1 Módulo 0: Autenticación e Identidad (`/api/auth` — [`AuthController.cs`](../backend/Zentric.Api/Controllers/AuthController.cs))

| Método HTTP y Ruta | Método en `ZentricApiPort` | Política / Roles Autorizados | Cuerpo / Query de Entrada | Cuerpo de Respuesta (`200 OK`) |
|---|---|---|---|---|
| `POST /api/auth/login` | `login` | `[AllowAnonymous]` | Body: `{ email, password }` | `AuthTokenResponse` (`{ token, expiresAt, userId, email, fullName, role }`) |
| `GET /api/auth/me` | `getCurrentUser` | `AnyAuthenticatedUser` (Todos los roles autenticados) | Sin cuerpo (Cabecera `Bearer`) | `CurrentUserResponse` (`{ userId, email, fullName, role }`) |

### 2.2 Módulo 1: Usuarios y Gestión de Acceso (`/api/users` — [`UsersController.cs`](../backend/Zentric.Api/Controllers/UsersController.cs))

| Método HTTP y Ruta | Método en `ZentricApiPort` | Política / Roles Autorizados | Cuerpo / Query de Entrada | Cuerpo de Respuesta (`200 OK`) |
|---|---|---|---|---|
| `POST /api/users` | `createUser` | Anónimo si `role === "Buyer"`; exige `Administrator` para cualquier otro rol (`UsersController.cs:72`) | Body: `{ identityDocument, fullName, email, password, role }` | `Guid` JSON (`string`) |
| `GET /api/users` | `listUsers` | `UserAdministration` (**Exclusivo `Administrator`** — protege PII, `UsersController.cs:19-23`) | Query: `?role={UserRole}` (opcional) | `UserDto[]` |
| `GET /api/users/{id}` | `getUserById` | `UserAdministration` (**Exclusivo `Administrator`**) | Path: `id` (`Guid`) | `UserDto` |
| `POST /api/users/{id}/block` | `blockUser` | `UserAdministration` (**Exclusivo `Administrator`**) | Path: `id` (`Guid`), sin cuerpo | Vacío (`void`) |
| `POST /api/users/{id}/activate` | `activateUser` | `UserAdministration` (**Exclusivo `Administrator`**) | Path: `id` (`Guid`), sin cuerpo | Vacío (`void`) |

### 2.3 Módulo 2: Bodegas Físicas (`/api/warehouses` — [`WarehousesController.cs`](../backend/Zentric.Api/Controllers/WarehousesController.cs))

| Método HTTP y Ruta | Método en `ZentricApiPort` | Política / Roles Autorizados | Cuerpo / Query de Entrada | Cuerpo de Respuesta (`200 OK`) |
|---|---|---|---|---|
| `POST /api/warehouses` | `createWarehouse` | `WarehouseManagement` (**Exclusivo `Administrator`**) | Body: `{ name, location, capacity, type: 'Marketplace' \| 'Vendor', vendorId? }` | `Guid` JSON (`string`) |
| `GET /api/warehouses` | `listWarehouses` | `WarehouseRead` (`Administrator`, `Seller`, `LogisticsOperator`) | Query: `?vendorId={Guid}` (opcional; `Seller` restringido al propio) | `WarehouseDto[]` |
| `GET /api/warehouses/{id}` | `getWarehouseById` | `WarehouseRead` (`Administrator`, `Seller`, `LogisticsOperator`) | Path: `id` (`Guid`) | `WarehouseDto` |

### 2.4 Módulo 3: Inventarios y Control de Stock (`/api/inventories` — [`InventoriesController.cs`](../backend/Zentric.Api/Controllers/InventoriesController.cs))

| Método HTTP y Ruta | Método en `ZentricApiPort` | Política / Roles Autorizados | Cuerpo / Query de Entrada | Cuerpo de Respuesta (`200 OK`) |
|---|---|---|---|---|
| `POST /api/inventories/stock` | `addStock` | `InventoryManagement` (`Seller`, `LogisticsOperator`) | Body: `{ variantId, warehouseId, quantity }` (`AddStockCommand.cs:17-23`) | `Guid` JSON (`string`) |
| `GET /api/inventories` | `listInventories` | `InventoryRead` (`Seller`, `LogisticsOperator`) | Sin parámetros (`Seller` ve propios; `LogisticsOperator` ve toda la red) | `InventoryDto[]` |
| `GET /api/inventories/{variantId}` | `listInventoryByVariant` | `InventoryRead` (`Seller`, `LogisticsOperator`) | Path: `variantId` (`Guid`) | `InventoryDto[]` |
| `POST /api/inventories/{id}/adjust` | `adjustInventory` | `InventoryAdjust` (`Administrator`, `Supervisor` — [ADR-0021](../backendSDD/Adr/0021-ajuste-de-stock-sin-cuello-de-botella.md)) | Path: `id` (`Guid`), Body: `{ countedQuantity, reason }` | `AdjustInventoryResult` |

### 2.5 Módulo 4: Catálogo de Productos (`/api/catalog` — [`CatalogController.cs`](../backend/Zentric.Api/Controllers/CatalogController.cs))

| Método HTTP y Ruta | Método en `ZentricApiPort` | Política / Roles Autorizados | Cuerpo / Query de Entrada | Cuerpo de Respuesta (`200 OK`) |
|---|---|---|---|---|
| `POST /api/catalog/products` | `createProduct` | `ProductManagement` (**Exclusivo `Seller`**) | Body: `{ name, description, priceAmount, priceCurrency, type, variants?: [{ sku, attributes: [{ name, value }] }] }` | `CreatedProductDto` (`{ productId, variantIds }`) |
| `POST /api/catalog/products/{productId}/publish` | `publishProduct` | `ProductManagement` (**Exclusivo `Seller`**) | Path: `productId` (`Guid`), sin cuerpo | Vacío (`void`) |
| `POST /api/catalog/products/{productId}/suspend` | `suspendProduct` | `ProductManagement` (**Exclusivo `Seller`**) | Path: `productId` (`Guid`), sin cuerpo | Vacío (`void`) |
| `GET /api/catalog/products` | `listProducts` | `AnyAuthenticatedUser` (Todos los roles autenticados) | Query: `?vendorId={Guid}` (opcional) | `ProductDto[]` |
| `GET /api/catalog/products/paged` | `listProductsPaged` | `AnyAuthenticatedUser` (Todos los roles autenticados) | Query: `?vendorId={Guid}&page={0..n}&size={1..100}` | `PagedResult<ProductDto>` |
| `GET /api/catalog/products/{id}` | `getProductById` | `AnyAuthenticatedUser` (Todos los roles autenticados) | Path: `id` (`Guid`) | `ProductDto` |

### 2.6 Módulo 5: Carrito y Pedidos de Compra (`/api/orders` — [`OrdersController.cs`](../backend/Zentric.Api/Controllers/OrdersController.cs))

| Método HTTP y Ruta | Método en `ZentricApiPort` | Política / Roles Autorizados | Cuerpo / Query de Entrada | Cuerpo de Respuesta (`200 OK`) |
|---|---|---|---|---|
| `POST /api/orders/cart` | `createCart` | `Checkout` (**Exclusivo `Buyer`**) | Sin cuerpo (identidad desde claim `sub`) | `Guid` JSON (`string`) |
| `POST /api/orders/cart/items` | `addCartItem` | `Checkout` (**Exclusivo `Buyer`**) | Body: `{ orderId, variantId, quantity }` | Vacío (`void`) |
| `POST /api/orders/{orderId}/checkout` | `checkoutOrder` | `Checkout` (**Exclusivo `Buyer`**) | Path: `orderId` (`Guid`), sin cuerpo | Vacío (`void`) |
| `POST /api/orders/{orderId}/pay` | `payOrder` | `Checkout` (**Exclusivo `Buyer`**) | Path: `orderId` (`Guid`), sin cuerpo | Vacío (`void`) |
| `GET /api/orders` | `listOrders` | `OrderRead` (Todos los 5 roles, filtrado por propiedad en servidor) | Query: `?status={OrderStatus}` (opcional) | `OrderListItemDto[]` |
| `GET /api/orders/{id}` | `getOrderById` | `OrderRead` (Todos los 5 roles, filtrado por propiedad) | Path: `id` (`Guid`) | `OrderDto` o `SellerOrderViewDto` (si `role === 'Seller'`) |

### 2.7 Módulo 6: Logística y Despacho (`/api/logistics` — [`LogisticsController.cs`](../backend/Zentric.Api/Controllers/LogisticsController.cs))

| Método HTTP y Ruta | Método en `ZentricApiPort` | Política / Roles Autorizados | Cuerpo / Query de Entrada | Cuerpo de Respuesta (`200 OK`) |
|---|---|---|---|---|
| `POST /api/logistics/fulfillment` | `createFulfillment` | `FulfillmentOperate` (`Seller`, `LogisticsOperator`) | Body: `{ customerOrderId, vendorId }` | `Guid` JSON (`string`) |
| `POST /api/logistics/fulfillment/{id}/pack` | `packFulfillment` | `FulfillmentOperate` (`Seller`, `LogisticsOperator`) | Path: `id` (`Guid`), sin cuerpo | Vacío (`void`) |
| `POST /api/logistics/fulfillment/{id}/dispatch` | `dispatchFulfillment` | `FulfillmentOperate` (`Seller`, `LogisticsOperator`) | Path: `id` (`Guid`), sin cuerpo | Vacío (`void`) |
| `POST /api/logistics/fulfillment/{id}/deliver` | `deliverFulfillment` | `FulfillmentDeliver` (**Exclusivo `LogisticsOperator`**) | Path: `id` (`Guid`), sin cuerpo | Vacío (`void`) |
| `POST /api/logistics/fulfillment/cancel-ghost-stock` | `cancelGhostStock` | `FulfillmentCancelByQuiebre` (`Seller`, `LogisticsOperator`) | Body: `{ fulfillmentOrderId, variantId, warehouseId, quantityToCancel }` | `boolean` (`true`, [`CancelFulfillmentOrderDueToNoStockCommand.cs:101`](../backend/Zentric.Application/Logistics/Commands/CancelFulfillmentOrderDueToNoStockCommand.cs#L101)) |
| `GET /api/logistics/fulfillments` | `listFulfillments` | `FulfillmentRead` (Todos los 5 roles, filtrado por propiedad) | Query: `?status={FulfillmentStatus}` (opcional) | `FulfillmentOrderDto[]` |
| `GET /api/logistics/fulfillment/{id}` | `getFulfillmentById` | `FulfillmentRead` (Todos los 5 roles, filtrado por propiedad) | Path: `id` (`Guid`) | `FulfillmentOrderDto` |

### 2.8 Módulo 7: Devoluciones y Garantías (`/api/returns` — [`ReturnsController.cs`](../backend/Zentric.Api/Controllers/ReturnsController.cs))

| Método HTTP y Ruta | Método en `ZentricApiPort` | Política / Roles Autorizados | Cuerpo / Query de Entrada | Cuerpo de Respuesta (`200 OK`) |
|---|---|---|---|---|
| `POST /api/returns/request` | `requestReturn` | `ReturnRequest` (**Exclusivo `Buyer`**) | Body: `{ customerOrderId, variantId, warehouseId, quantity }` | `Guid` JSON (`string`) |
| `POST /api/returns/{id}/inspect` | `inspectReturn` | `ReturnInspect` (**Exclusivo `LogisticsOperator`**) | Path: `id` (`Guid`), Body: `{ isGoodCondition: boolean }` | Vacío (`void`) |
| `POST /api/returns/{id}/approve` | `approveReturn` | `ReturnApprove` (**Exclusivo `Seller`**) | Path: `id` (`Guid`), Body: `{ returnRequestId: id }` (`ReturnsController.cs:95-97`) | Vacío (`void`) |
| `POST /api/returns/{id}/reject` | `rejectReturn` | `ReturnApprove` (**Exclusivo `Seller`**) | Path: `id` (`Guid`), sin cuerpo | Vacío (`void`) |
| `POST /api/returns/{id}/refund` | `refundReturn` | `ReturnRefund` (**Exclusivo `Administrator`**) | Path: `id` (`Guid`), sin cuerpo | Vacío (`void`) |
| `GET /api/returns` | `listReturns` | `ReturnRead` (Todos los 5 roles, filtrado por propiedad) | Query: `?status={ReturnStatus}` (opcional) | `ReturnRequestDto[]` |
| `GET /api/returns/{id}` | `getReturnById` | `ReturnRead` (Todos los 5 roles, filtrado por propiedad) | Path: `id` (`Guid`) | `ReturnRequestDto` |

### 2.9 Módulo 8: Facturación Split (`/api/billing` — [`BillingController.cs`](../backend/Zentric.Api/Controllers/BillingController.cs))

| Método HTTP y Ruta | Método en `ZentricApiPort` | Política / Roles Autorizados | Cuerpo / Query de Entrada | Cuerpo de Respuesta (`200 OK`) |
|---|---|---|---|---|
| `POST /api/billing/invoices/generate/{orderId}` | `generateInvoices` | `BillingGenerate` (**Exclusivo `Administrator`**) | Path: `orderId` (`Guid`), sin cuerpo | `boolean` (`true`) |
| `POST /api/billing/invoices/annul/{orderId}` | `annulInvoices` | `BillingGenerate` (**Exclusivo `Administrator`**) | Path: `orderId` (`Guid`), Body: `{ reason: string }` | Vacío (`void`) |
| `GET /api/billing/invoices` | `listInvoices` | `BillingRead` (`Buyer`, `Seller`, `Administrator`, `Supervisor`) | Sin parámetros (aislamiento por rol en `GetInvoicesQuery.cs:98-100`) | `InvoiceDto[]` |
| `GET /api/billing/invoices/order/{orderId}` | `getInvoicesByOrder` | `BillingRead` (`Buyer`, `Seller`, `Administrator`, `Supervisor`) | Path: `orderId` (`Guid`) | `InvoiceDto[]` |

### 2.10 Módulo 9: Sonda de Disponibilidad (`/health` — [`Program.cs:276-296`](../backend/Zentric.Api/Program.cs#L276-L296))

| Método HTTP y Ruta | Método en `ZentricApiPort` | Política / Roles Autorizados | Cuerpo / Query de Entrada | Cuerpo de Respuesta (`200 OK` / `503`) |
|---|---|---|---|---|
| `GET /health` | `getHealth` | `[AllowAnonymous]` | Sin parámetros | `HealthStatus` (`{ status, database, timestamp, error? }`) |

---

## 3. Reglas de Serialización y Deserialización en el Adaptador HTTP

1. **Desenvolvimiento de Identificadores `Guid`:** Los comandos de creación (`createUser`, `createWarehouse`, `addStock`, `createCart`, `createFulfillment`, `requestReturn`) retornan una cadena JSON con el UUID generado. El adaptador recorta comillas envolventes y devuelve un `string` limpio.
2. **Excepción de Alta de Producto (`CreatedProductDto`):** `POST /api/catalog/products` retorna un objeto estructurado `{ productId: string, variantIds: string[] }` ([`CreateProductCommand.cs:32`](../backend/Zentric.Application/Catalog/Commands/CreateProductCommand.cs#L32)). Las operaciones subsecuentes de inventario (`addStock`) y carrito (`addCartItem`) deben consumir exclusivamente un `variantId` de `variantIds`, nunca el `productId` ([ADR-0002](../backendSDD/Adr/0002-clave-inventario-variantid.md)).
3. **Contrato de Enumeraciones por Nombre ([ADR-0012](../backendSDD/Adr/0012-contrato-json-de-los-enum-por-nombre.md)):** [`EnumJsonContract.cs`](../backend/Zentric.Api/Contracts/EnumJsonContract.cs) rechaza valores enteros en enums con `400 Bad Request`. El adaptador transmite exclusivamente las cadenas literales canónicas (`"Buyer"`, `"Marketplace"`, `"Vendor"`, `"Physical"`, etc.).
4. **Cuerpo Obligatorio en `approveReturn`:** A diferencia de `rejectReturn` y `refundReturn` (que sólo reciben `id` en la ruta), `POST /api/returns/{id}/approve` exige enviar `{ returnRequestId: id }` en el cuerpo JSON ([`ReturnsController.cs:95-97`](../backend/Zentric.Api/Controllers/ReturnsController.cs#L95-L97)). El adaptador construye automáticamente dicho cuerpo a partir del parámetro `id`.
5. **Traducción Estandarizada de Problem Details (RFC 7807):** Ante cualquier respuesta con `!response.ok`, el adaptador deserializa el cuerpo `application/problem+json` en un objeto `ApiProblemDetails`, extrayendo `detail`, `title`, `status` y el diccionario `errors` de `FluentValidation`.

---

## 4. Adaptadores de Sesión (`MemorySessionAdapter.ts`), Alertas (`AlertAdapter.ts`) y Mocks

| Adaptador | Archivo Físico | Puerto Implementado | Invariantes de Implementación |
|---|---|---|---|
| **`MemorySessionAdapter`** | `src/adapters/session/MemorySessionAdapter.ts` | `SessionPort` | **[ADDENDUM - DICTADO POR OWNER (2026-10-17)]:** Retiene el token JWT y `CurrentUser` en variables privadas de instancia sincronizadas con `window.localStorage` (`zentric.auth.token` y `zentric.auth.user`) para conservar la sesión ante recargas de página (`F5`), revalidando contra `GET /api/auth/me` ([ADR-0009](../backendSDD/Adr/0009-autenticacion-jwt-rg01.md)). Purga `localStorage` y memoria RAM y notifica suscriptores ante `clear()` o `401`. |
| **`AlertAdapter`** | `src/adapters/alert/AlertAdapter.ts` | `AlertPort` | Gestiona en TypeScript puro una cola de promesas para diálogos modales de confirmación (`confirm`) y notificaciones (`show`), consumida reactivamente por `AlertHost.tsx`. |
| **`MockZentricApiAdapter`** | `src/adapters/mocks/MockZentricApiAdapter.ts` | `ZentricApiPort` | Implementación determinista en memoria de los 45 métodos de `ZentricApiPort` utilizada por la suite de pruebas Vitest (`13-frontend-qa-guardian`) para verificar flujos completos sin depender de red externa. |

