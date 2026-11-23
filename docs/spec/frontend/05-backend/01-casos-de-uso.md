# Backend — Casos de uso (Application Layer) — Zentric

## 1. Convenciones
- **Command** = mutación con side effects (returns `Result<Id>` o `Result`).
- **Query** = lectura sin side effects (returns `Result<T>`).
- **Validator** = FluentValidation por command/query.
- **Handler** = `IRequestHandler<TCommand, Result<...>>` / `IRequestHandler<TQuery, Result<...>>`.
- **Dispatcher** = `IDispatcher` (ADR-0007) — `Send<TCommand>()`, `Send<TQuery, TResult>()`, `Publish<TEvent>()`.
## 2. Bounded Context: Users (Identity & Access)

| Caso de uso | Tipo | Actor | Precondición | Postcondición | Eventos |
|-------------|------|-------|--------------|---------------|---------|
| RegistrarComprador | Command | Anónimo | Email único, password policy | `User` + `Buyer` creados, session cookies | `UserRegisteredDomainEvent` |
| Login | Command | Anónimo | Credenciales válidas, usuario Active | Access token (15m) + Refresh token (7d rotativo) en HttpOnly cookies | `UserLoggedInDomainEvent` |
| Logout | Command | Autenticado | Sesión válida | Cookies borradas, refresh token revocado | `UserLoggedOutDomainEvent` |
| RefreshToken | Command | Anónimo | Refresh token válido, no revocado | Nuevo access + refresh (rotación) | — |
| CambiarContrasena | Command | Autenticado | Password actual correcto + nueva policy | Hash actualizado, refresh tokens revocados (opcional) | `PasswordChangedDomainEvent` |
| SolicitarRecuperacion | Command | Anónimo | Email existe | Token recuperación generado, email enviado (rate limited) | `PasswordRecoveryRequestedDomainEvent` |
| RecuperarContrasena | Command | Anónimo | Token válido, no expirado | Password actualizado, token invalidado | `PasswordRecoveredDomainEvent` |
| ObtenerPerfil | Query | Autenticado | — | `UserProfileDto` (id, email, nombre, rol, entidadId, estado) | — |

## 3. Bounded Context: Catalog (Seller + Admin)

| Caso de uso | Tipo | Actor | Precondición | Postcondición | Eventos |
|-------------|------|-------|--------------|---------------|---------|
| CrearProducto | Command | Seller, Admin | Seller existe + VendorId válido | `Product` (Draft) + variantes opcionales creadas | `ProductCreatedDomainEvent` |
| EditarProducto | Command | Seller (own), Admin | Producto no Deleted | Campos actualizados, `UpdatedAt` | `ProductUpdatedDomainEvent` |
| PublicarProducto | Command | Seller (own), Admin | Status=Draft, variantes OK (Physical≥1), SKU, imágenes | Status=Published | `ProductPublishedDomainEvent` |
| SuspenderProducto | Command | Seller (own), Admin | Status=Published | Status=Suspended | `ProductSuspendedDomainEvent` |
| DescontinuarProducto | Command | Seller (own), Admin | Status≠Discontinued | Status=Discontinued, DeletedAt=now | `ProductDiscontinuedDomainEvent` |
| RestaurarProducto | Command | Seller (own), Admin | Status=Discontinued | Status=Published, DeletedAt=null | `ProductRestoredDomainEvent` |
| AgregarVariante | Command | Seller (own), Admin | Producto existe, SKU único, ≥1 atributo | `ProductVariant` añadida al agregado | `VariantAddedDomainEvent` |
| ActualizarVariante | Command | Seller (own), Admin | Variante no Deleted | SKU/precio/atributos actualizados | `VariantUpdatedDomainEvent` |
| ActivarVariante | Command | Seller (own), Admin | Variante Inactive | IsActive=true | `VariantActivatedDomainEvent` |
| DesactivarVariante | Command | Seller (own), Admin | Variante Active | IsActive=false | `VariantDeactivatedDomainEvent` |
## 4. Bounded Context: Inventories (Seller + Logistics + Admin)

| Caso de uso | Tipo | Actor | Precondición | Postcondición | Eventos |
|-------------|------|-------|--------------|---------------|---------|
| AddStock | Command | Seller (own + Marketplace), Admin | Variant existe, Warehouse activo (own o Marketplace), qty>0 | `Inventory` created/updated, `AvailableQuantity += qty` | `StockAddedDomainEvent` |
| ConsultarInventario | Query | Seller (own + Marketplace), Logistics (asignadas), Admin | — | `InventoryDto` por variant+warehouse | — |
| AjustarStock | Command | Seller (own), Admin | Usuario autorizado, motivo obligatorio | `AvailableQuantity = nuevoValor`, auditoría registrada | `StockAdjustedDomainEvent` |
| TransferirStock | Command | ABIERTO (INC-06) | Origen/destino válidos, qty ≤ disponible origen | Reserva origen, entrada destino (transacción) | `StockTransferredDomainEvent` |
| LiberarReserva | Command | Sistema (Timeout/Checkout) | Reserva existe | `ReservedQuantity -= qty`, `AvailableQuantity += qty` | `ReservationReleasedDomainEvent` |

## 5. Bounded Context: Orders (Buyer + Seller + Logistics + Admin)

| Caso de uso | Tipo | Actor | Precondición | Postcondición | Eventos |
|-------------|------|-------|--------------|---------------|---------|
| AgregarAlCarrito | Command | Buyer | Variant `CanBeSold`, stock disponible | `CustomerOrder` (Cart) item añadido/actualizado | — |
| ActualizarCantidadCarrito | Command | Buyer | Item existe, nueva qty ≤ disponible | Item actualizado | — |
| QuitarDelCarrito | Command | Buyer | Item existe | Item removido | — |
| Checkout | Command | Buyer | Carrito no vacío, dirección válida, stock reservable | `CustomerOrder` → `PendingPayment`, `CheckoutStartedAt=now`, reservas atómicas (15 min) | `OrderCreatedDomainEvent`, `StockReservedDomainEvent` |
| ConfirmarPago | Command | Sistema (Payment Gateway) | Order=`PendingPayment`, pago autorizado | Order=`Paid`, `PaymentReceipt` creado, reservas → salidas | `OrderPaidDomainEvent`, `PaymentReceivedDomainEvent` |
| FallarPago | Command | Sistema | Order=`PendingPayment`, rechazo confirmado | Order=`Cancelled` (cause=PaymentFailed), reservas liberadas | `OrderCancelledDomainEvent`, `PaymentFailedDomainEvent` |
| ExpirarCheckout | Command | Sistema (Worker) | Order=`PendingPayment`, `now > CheckoutStartedAt + 15min` | Order=`Cancelled` (cause=Expired), reservas liberadas | `CartExpiredDomainEvent` |
| ConsultarPedido | Query | Según scope (Buyer own, Seller lines, Logistics assigned, Admin) | — | `CustomerOrderDetailDto` | — |
## 6. Bounded Context: Logistics (Logistics + Seller + Admin)

| Caso de uso | Tipo | Actor | Precondición | Postcondición | Eventos |
|-------------|------|-------|--------------|---------------|---------|
| PackFulfillment | Command | Seller (own), Logistics (assigned), Admin | `FulfillmentOrder`=`PendingPacking`, items válidos | Status=`Packed`, `PackedAt=now` | `FulfillmentPackedDomainEvent` |
| DispatchFulfillment | Command | Seller (own), Logistics (assigned), Admin | Status=`Packed`, carrier+tracking válidos | Status=`Dispatched`, `DispatchedAt=now`, `TrackingNumber` | `PhysicalProductShippedDomainEvent` |
| DeliverFulfillment | Command | Seller (own), Logistics (assigned), Admin | Status=`Dispatched` | Status=`Delivered`, `DeliveredAt=now` | `FulfillmentDeliveredDomainEvent` |
| CancelarDespacho | Command | Logistics, Admin | Quiebre stock confirmado, status≠Delivered | Status=`Cancelled`, cause=StockBreak, líneas → devolución parcial | `PartialFulfillmentCancelledDomainEvent` |
| ListarColaLogistica | Query | Logistics (assigned), Seller (own), Admin | Filtros: estado, warehouse, fechas | Paginated `FulfillmentSummaryDto` | — |

## 7. Bounded Context: Billing (Sistema + Admin)

| Caso de uso | Tipo | Actor | Precondición | Postcondición | Eventos |
|-------------|------|-------|--------------|---------------|---------|
| GenerarFacturas | Command | Sistema (post-Paid) | Order=`Paid` | 3 facturas: Master, ZentricDetail, Vendor (split) | `InvoicesGeneratedDomainEvent` |
| ConsultarFactura | Query | Según scope (Buyer Master, Seller Vendor, Admin todas) | — | `InvoiceDto` con líneas | — |
| AnularFactura | Command | Admin | Status=`Issued` | Status=`Voided`, `VoidedAt=now` | `InvoiceVoidedDomainEvent` |

## 8. Bounded Context: Returns (Buyer + Logistics + Seller + Admin)

| Caso de uso | Tipo | Actor | Precondición | Postcondición | Eventos |
|-------------|------|-------|--------------|---------------|---------|
| SolicitarDevolucion | Command | Buyer | Order=`Delivered` ≤30d, línea Physical, elegibilidad backend | `ReturnRequest`=`Requested` | `ReturnRequestedDomainEvent` |
| InspeccionarDevolucion | Command | Logistics (assigned) | ReturnRequest=`Requested` | `InspectionResult` registrado | `ReturnInspectedDomainEvent` |
| AprobarDevolucion | Command | Seller (own line), Admin | Inspección OK | `ReturnRequest`=`Approved` | `ReturnApprovedEvent` |
| RechazarDevolucion | Command | Seller (own line), Admin | Motivo válido | `ReturnRequest`=`Rejected` | `ReturnRejectedDomainEvent` |
| ProcesarReembolso | Command | Sistema (post-Approved + reingreso Used) | `ReturnRequest`=`Approved`, stock reingresado | `RefundCredit` creado, `Refunded` | `RefundProcessedDomainEvent` |

## 9. Bounded Context: Warehouses (Admin + Seller)

| Caso de uso | Tipo | Actor | Precondición | Postcondición | Eventos |
|-------------|------|-------|--------------|---------------|---------|
| CrearBodegaMarketplace | Command | Admin | — | `Warehouse` Type=Marketplace, VendorId=null | `WarehouseCreatedDomainEvent` |
| CrearBodegaVendedor | Command | Seller (own), Admin | Seller existe | `Warehouse` Type=Vendor, VendorId=Seller | `WarehouseCreatedDomainEvent` |
| PrimeraBodegaConVendedor | Command | Admin | Transacción única | `Seller` + `Warehouse` (Vendor) atómicos | `SellerOnboardedDomainEvent` |
| ListarBodegas | Query | Según scope | — | Paginated `WarehouseDto` | — |
| ActivarInactivarBodega | Command | Owner (Seller own, Admin all) | — | `IsActive` toggle | `WarehouseStatusChangedDomainEvent` |

## 10. Reglas transversales de implementación
- **Validación**: FluentValidation en Command/Query. Validación de dominio en entidades (invariantes).
- **Autorización**: Policy per endpoint (`RequireSellerScope`, `RequireLogisticsScope`, `RequireAdmin`, `RequireSupervisor`, `RequireOwnership<T>`).
- **Errores**: `ProblemDetails` (RFC 7807) con `code`, `message`, `details[]`, `correlationId`.
- **Observabilidad**: `CorrelationId` header propagado. Logs estructurados (Serilog). Métricas Prometheus.
- **Auditoría**: `AuditLog` entry en commands sensibles (actor, recurso, acción, timestamp, resultado, motivo).
| ListarPedidos | Query | Según scope | Filtros: estado, fechas, vendor, buyer | Paginated `OrderSummaryDto` (cursor) | — |
| CancelarPedido (Buyer) | Command | Buyer (own), Admin | Order=`Cart` o `PendingPayment` | Order=`Cancelled` (cause=BuyerRequested), reservas liberadas si aplica | `OrderCancelledDomainEvent` |
| CancelarPedidoPostPago | Command | ABIERTO (INC-02) | Order=`Paid`, sin `Packed` fulfillments | Order=`Cancelled`, reembolso trigger | `OrderCancelledDomainEvent` |
| EliminarVariante | Command | Seller (own), Admin | Variante existe | Soft delete (DeletedAt, IsActive=false) | `VariantDeletedDomainEvent` |
| ConsultarProducto | Query | Público (Published), Seller/Admin (todos) | — | `ProductDto` con variantes | — |
| ListarProductos | Query | Según scope | Filtros: estado, categoría, vendor, búsqueda | Paginated `ProductSummaryDto` (cursor) | — |
- **Transacción** = 1 command = 1 transacción DB (salvo eventos publicados post-commit).
- **Idempotencia** = Header `Idempotency-Key` en commands sensibles. Tabla `IdempotencyKeys` (key, result, expiresAt).
