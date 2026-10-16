# Alineación de Contratos Backend ↔ Frontend (Contract Alignment SDD)

> **Propósito:** Certificar con trazabilidad línea por línea (`archivo:línea`) la alineación 100% entre el backend real en C# (`Zentric.Domain`, `Zentric.Application`, `Zentric.Api`) y las especificaciones del frontend (`frontendSDD/`), garantizando cero desviaciones en rutas HTTP, payloads JSON, códigos de estado, enums de dominio y políticas de autorización RBAC.

---

## 1. Matriz de Controladores, Rutas Base y Políticas RBAC (`Zentric.Api`)

Cada módulo del frontend consume exactamente los controladores expuestos por `Zentric.Api`. Se certifica la correspondencia exacta de políticas definidas en `backend/Zentric.Api/Authentication/AuthorizationPolicies.cs`:

| Controlador Backend (`archivo:línea`) | Prefijo de Ruta HTTP | Endpoints Totales | Políticas de Autorización (`AuthorizationPolicies.cs`) | Roles con Acceso Permitido |
|---|---|:---:|---|---|
| `Program.cs:233` | `/health` | 1 | `[AllowAnonymous]` | Público (sin token) |
| `AuthController.cs:20-21` | `/api/auth` | 2 | `[AllowAnonymous]` | Público (`login`, `register` solo `Buyer`/`Seller`) |
| `CatalogController.cs:20-21` | `/api/catalog` | 4 | `CatalogRead` (`:160`), `CatalogWrite` (`:169`) | Lectura: Todos los autenticados · Escritura: `Seller`, `Administrator` |
| `OrdersController.cs:20-21` | `/api/orders` | 7 | `OrderRead` (`:178`), `OrderPlace` (`:187`), `OrderPay` (`:196`), `OrderCancel` (`:205`), `OrderModifyAddress` (`:214`) | Lectura: `Buyer`, `Administrator`, `Supervisor` · Mutación: `Buyer`, `Administrator` |
| `InventoriesController.cs:21-22` | `/api/inventories` | 7 | `InventoryRead` (`:223`), `InventoryAdjust` (`:232`), `InventoryCancelGhost` (`:241`) | Lectura: `Seller`, `LogisticsOperator`, `Administrator`, `Supervisor` · Ajuste físico: `Administrator`, `Supervisor` · Stock fantasma: `Administrator`, `LogisticsOperator` |
| `LogisticsController.cs:22-23` | `/api/logistics` | 9 | `WarehouseRead` (`:142`), `WarehouseManage` (`:151`), `FulfillmentRead` (`:250`), `FulfillmentOperate` (`:259`) | Bodegas lectura: `Seller`, `LogisticsOperator`, `Administrator`, `Supervisor` · Bodegas gestión: `Administrator` · Paquetes lectura: `Buyer`, `LogisticsOperator`, `Administrator`, `Supervisor` · Operación: `LogisticsOperator`, `Administrator` |
| `ReturnsController.cs:20-21` | `/api/returns` | 5 | `ReturnRead` (`:268`), `ReturnRequest` (`:277`), `ReturnInspect` (`:286`), `ReturnResolve` (`:295`) | Lectura: Todos los autenticados · Solicitud: `Buyer`, `Administrator` · Inspección: `LogisticsOperator`, `Administrator` · Aprobación: `Seller`, `LogisticsOperator`, `Administrator` |
| `BillingController.cs:20-21` | `/api/billing` | 4 | `BillingRead` (`:304`), `CommissionConfigure` (`:313`) | Lectura: `Seller`, `Administrator`, `Supervisor` · Configuración: `Administrator` |
| `BuyersController.cs:20-21` | `/api/buyers` | 4 | `BuyerSelfOrAdmin` (`:124`), `BuyerAddressManage` (`:133`) | Lectura: `Buyer`, `Administrator`, `Supervisor` · Escritura/Direcciones: `Buyer`, `Administrator` |
| `UsersController.cs:19-20` | `/api/users` | 2 | `UserAdministration` (`:115`) | **Exclusivo `Administrator`** (protección de PII: `IdentityDocument`, `Email`; el `Supervisor` **no** tiene acceso a `/api/users`) |

> **Total Certificado:** **45 endpoints REST** (`1` health check + `44` endpoints bajo `/api/*`) y **21 políticas de autorización** (`AuthorizationPolicies.cs:19-39`).

---

## 2. Alineación de Enums de Dominio (Serialización JSON `JsonStringEnumConverter`)

En `backend/Zentric.Api/Program.cs:26-30`, el servidor registra `JsonStringEnumConverter` globalmente. Todos los enums viajan por la red como `string` literal en inglés (`PascalCase`) y se traducen al español en la UI mediante `packages/ui/src/components/domainLabels.ts`:

| Enum en C# (`archivo:línea`) | Valores Exactos Serializados en JSON | Estado de Alineación en `frontendSDD/` |
|---|---|---|
| `UserRole` (`Users/UserRole.cs:3-10`) | `'Buyer' \| 'Seller' \| 'Administrator' \| 'Supervisor' \| 'LogisticsOperator'` | Sincronizado (`E-FE-001`) |
| `UserStatus` (`Users/UserStatus.cs:3-8`) | `'Active' \| 'Suspended' \| 'Inactive'` | Sincronizado (`E-FE-005`) |
| `ProductStatus` (`Catalog/ProductStatus.cs:3-9`) | `'Active' \| 'Paused' \| 'Archived' \| 'OutOfStock'` | Sincronizado (`E-FE-007`) |
| `OrderStatus` (`Orders/OrderStatus.cs:3-13`) | `'PendingCheckout' \| 'Paid' \| 'Shipped' \| 'PartiallyDelivered' \| 'Delivered' \| 'Cancelled' \| 'Expired'` | Sincronizado (`E-FE-009`) |
| `FulfillmentStatus` (`Logistics/FulfillmentStatus.cs:3-10`) | `'PendingPack' \| 'Packed' \| 'Dispatched' \| 'Delivered' \| 'Cancelled'` | Sincronizado (`E-FE-014`) |
| `WarehouseType` (`Logistics/WarehouseType.cs:3-7`) | `'Marketplace' \| 'Vendor'` | Sincronizado (`E-FE-013` — corregido de `'Zentric'` a `'Marketplace'`) |
| `WarehouseStatus` (`Logistics/WarehouseStatus.cs:3-7`) | `'Active' \| 'Inactive'` | Sincronizado (`E-FE-013`) |
| `ReturnStatus` (`Returns/ReturnStatus.cs:3-9`) | `'Requested' \| 'Approved' \| 'Rejected' \| 'Completed'` | Sincronizado (`E-FE-015` — la inspección actualiza `isGoodCondition: boolean` manteniendo `Requested`) |
| `InvoiceStatus` (`Billing/InvoiceStatus.cs:3-8`) | `'Issued' \| 'Paid' \| 'Cancelled'` | Sincronizado (`E-FE-017`) |
| `CommissionScopeType` (`Billing/CommissionScopeType.cs:3-8`) | `'GlobalDefault' \| 'CategorySpecific' \| 'VendorSpecific'` | Sincronizado (`E-FE-018`) |
| `AccountVerificationStatus` (`Users/AccountVerificationStatus.cs:3-8`) | `'Pending' \| 'Verified' \| 'Rejected'` | Sincronizado (`domainLabels.ts`) |

---

## 3. Verificación de Correcciones Críticas de Contrato (Auditoría C# vs. Frontend)

Durante la auditoría SDD se identificaron y corrigieron las siguientes 6 discrepancias históricas para garantizar cero fallos en tiempo de ejecución:

1. **Protección de PII en `/api/users` (`UsersController.cs:19-23`):**
   - **Realidad C#:** `UsersController` exige `[Authorize(Policy = AuthorizationPolicies.UserAdministration)]` a nivel de clase, la cual solo autoriza al rol `Administrator`.
   - **Alineación Frontend:** El rol `Supervisor` no incluye ruta `/supervisor/users` ni invoca `/api/users`; su auditoría opera sobre pedidos, inventario, logística, devoluciones y finanzas.
2. **Disponibilidad de Stock en Vista de Comprador (`CatalogController.cs:36` vs. `InventoriesController.cs:38`):**
   - **Realidad C#:** `GET /api/inventories/{variantId}` requiere la política `InventoryRead`, que excluye al rol `Buyer` (`403 Forbidden`).
   - **Alineación Frontend:** La vista `/buyer/products/$productId` evalúa disponibilidad exclusivamente mediante `ProductVariantDto.canBeSold` (`GetProductByIdQuery.cs:19-26`) y delega la reserva atómica a `POST /api/orders/cart/items`.
3. **Abastecimiento de Stock Nuevo vs. Reingreso de Stock Usado (`AddStockCommand.cs:17-23` vs. `ReturnsController.cs:84`):**
   - **Realidad C#:** `POST /api/inventories/stock` recibe únicamente `{ variantId, warehouseId, quantity }` para ingresar stock nuevo (`availableQuantity`).
   - **Alineación Frontend:** El stock usado (`usedQuantity`, `isUsed = true`) no se envía como parámetro manual en `/seller/inventory`; se incrementa automáticamente en el backend al aprobar una devolución (`POST /api/returns/{id}/approve`).
4. **Inspección y Aprobación de Devoluciones (`ReturnsController.cs:69-97`):**
   - **Realidad C#:** `POST /api/returns/{id}/inspect` recibe `{ isGoodCondition: boolean }` y actualiza `ReturnRequestDto.isGoodCondition` sin cambiar `ReturnStatus` a un estado inexistente `"Inspected"`. Posteriormente, `POST /api/returns/{id}/approve` requiere `{ returnRequestId: id }` en el cuerpo JSON.
   - **Alineación Frontend:** La UI de logística y vendedor evalúa `returnRequest.status === 'Requested' && returnRequest.isGoodCondition === true` para habilitar la aprobación y envía `{ returnRequestId: id }` en el body.
5. **Tipo de Bodega Propia de la Plataforma (`WarehouseType.cs:3-7`):**
   - **Realidad C#:** El enum `WarehouseType` define exactamente `Marketplace` y `Vendor`.
   - **Alineación Frontend:** Todos los esquemas Zod (`CreateWarehouseSchema`), tipos TypeScript (`WarehouseDto`) y etiquetas (`domainLabels.ts`) usan `'Marketplace' | 'Vendor'`.
6. **Retorno de Cancelación de Stock Fantasma (`InventoriesController.cs:96-112`):**
   - **Realidad C#:** `CancelOrderByGhostStockCommandHandler` devuelve `Result<bool>` y el controlador responde `200 OK` con un booleano JSON (`true` / `false`).
   - **Alineación Frontend:** `ZentricApiPort.cancelGhostStock` está tipado como `Promise<boolean>`.

---

## 4. Contrato Estándar de Errores HTTP (RFC 7807 Problem Details)

Todas las respuestas de error del backend (`400`, `401`, `403`, `404`, `409`, `422`, `500`) siguen la estructura generada por `ResultExtensions.cs` y `GlobalExceptionHandler.cs` en `Zentric.Api`:

| Propiedad JSON | Tipo | Origen en `Zentric.Api` | Uso en el Frontend (`httpClient.ts` y Componentes) |
|---|---|---|---|
| `type` | `string` | `ResultExtensions.cs` | URI semántica del tipo de fallo RFC 7807 |
| `title` | `string` | `ResultExtensions.cs` | Título corto mostrado en la cabecera del banner o toast de error |
| `status` | `number` | `HttpContext.Response.StatusCode` | Código HTTP (`400`, `401`, `403`, `404`, `409`, `422`, `500`) |
| `detail` | `string` | `Error.Description` (en español) | Mensaje de negocio legible por el usuario final |
| `code` | `string?` | `Error.Code` (`extensions["code"]`) | Código de dominio en `Geist Mono` (ej. `Inventory.InsufficientStock`, `Order.CheckoutExpired`) |
| `errors` | `Record<string, string[]>?` | `ValidationError` | Mapa de errores por campo vinculado a los inputs del formulario |
