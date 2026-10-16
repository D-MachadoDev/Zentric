# Módulos, Pantallas por Rol y Composición Visual Split-Frame (Frontend Role Modules)

> Especificación funcional y visual de los módulos por rol de **Zentric Marketplace** (`frontend/apps/frontend/src/modules/` y `src/app/routes/`).  
> Alinea cada pantalla con la Matriz de Responsabilidades de [`ZENTRIC.md`](../ZENTRIC.md#12-matriz-de-responsabilidades), las **21 políticas de autorización** de [`AuthorizationPolicies.cs`](../backend/Zentric.Api/Security/AuthorizationPolicies.cs) y la doctrina de composición asimétrica (*Split-Frame* y *Hero KPI Strip*) del sistema de diseño.

---

## 1. Matriz Canónica de Responsabilidades y Políticas por Rol

Cada capacidad en la interfaz obedece estrictamente a la política declarada en [`AuthorizationPolicies.cs:279-372`](../backend/Zentric.Api/Security/AuthorizationPolicies.cs#L279-L372):

| Capacidad Operativa | Política en `Zentric.Api` | `Buyer` | `Seller` | `LogisticsOperator` | `Administrator` | `Supervisor` |
|---|---|:---:|:---:|:---:|:---:|:---:|
| **Auto-registro Público** | `[AllowAnonymous]` (`role="Buyer"`) | ✔ | — | — | ✔ | — |
| **Alta y Bloqueo de Usuarios** | `UserAdministration` | — | — | — | ✔ (Exclusivo) | — |
| **Lectura de Directorio Usuarios (PII)** | `UserAdministration` | — | — | — | ✔ (Exclusivo) | — |
| **Alta de Bodegas Físicas** | `WarehouseManagement` | — | — | — | ✔ (Exclusivo) | — |
| **Lectura de Bodegas Físicas** | `WarehouseRead` | — | ✔ (Propias) | ✔ (Todas) | ✔ (Todas) | — |
| **Alta, Publicación y Suspensión de Producto** | `ProductManagement` | — | ✔ (Exclusivo) | — | — | — |
| **Exploración de Catálogo** | `AnyAuthenticatedUser` | ✔ (`Published`) | ✔ (Propios: todos) | ✔ (`Published`) | ✔ (`Published`) | ✔ (`Published`) |
| **Ingreso y Consulta de Stock en Bodega** | `InventoryManagement` / `InventoryRead` | — | ✔ (Propios) | ✔ (Red completa) | — | — |
| **Ajuste por Conteo Físico** | `InventoryAdjust` | — | — | — | ✔ | ✔ |
| **Carrito, Checkout (15 min) y Pago** | `Checkout` | ✔ (Exclusivo) | — | — | — | — |
| **Lectura de Pedidos** | `OrderRead` | ✔ (Propios) | ✔ (`SellerOrderView`) | ✔ (Todos) | ✔ (Todos) | ✔ (Todos) |
| **Empaque y Despacho con Guía** | `FulfillmentOperate` | — | ✔ (Propios) | ✔ (Todos) | — | — |
| **Certificación de Entrega (`Delivered`)** | `FulfillmentDeliver` | — | — | ✔ (Exclusivo) | — | — |
| **Reporte de Quiebre (*Stock Fantasma*)** | `FulfillmentCancelByQuiebre` | — | ✔ (Propios) | ✔ (Todos) | — | — |
| **Lectura de Órdenes de Despacho** | `FulfillmentRead` | ✔ (Propios) | ✔ (Propios) | ✔ (Todos) | ✔ (Todos) | ✔ (Todos) |
| **Solicitud de Devolución Física** | `ReturnRequest` | ✔ (Exclusivo) | — | — | — | — |
| **Inspección Física en Bodega** | `ReturnInspect` | — | — | ✔ (Exclusivo) | — | — |
| **Aprobación o Rechazo Comercial** | `ReturnApprove` | — | ✔ (Exclusivo dueño) | — | — | — |
| **Reembolso Financiero al Comprador** | `ReturnRefund` | — | — | — | ✔ (Exclusivo) | — |
| **Lectura de Devoluciones** | `ReturnRead` | ✔ (Propias) | ✔ (Propias) | ✔ (Todas) | ✔ (Todas) | ✔ (Todas) |
| **Emisión y Anulación de Facturación Split** | `BillingGenerate` | — | — | — | ✔ (Exclusivo) | — |
| **Lectura de Facturas** | `BillingRead` | ✔ (`Master` propia) | ✔ (`VendorDetail` propia) | — | ✔ (Todas) | ✔ (Todas) |

---

## 2. Especificación de Pantallas y Composición Visual por Módulo

Todas las rutas técnicas y nombres de componentes se escriben en inglés, mientras que todos los títulos, etiquetas, columnas y botones visibles se presentan en español. Cada pantalla aplica composición asimétrica (*Split-Frame* o *Hero KPI Strip*), prohibiendo las cuadrículas de tarjetas clonadas idénticas.

### 2.1 Módulo de Autenticación y Salud (`src/modules/auth/`)

| Ruta | Componente | Endpoints Consumidos | Composición Visual (*Hyperframes Creative*) y Reglas Operativas |
|---|---|---|---|
| `/login` | `LoginPage` | `POST /api/auth/login`<br>`GET /api/auth/me` | **Split-Frame Asimétrico (`55% / 45%`):** Zona izquierda con identidad editorial (`Logo`, manifiesto operativo y estado de red en vivo en `Geist Mono`); zona derecha con tarjeta de autenticación en `#111827`, resplandor focal radial (`12%` `#00D4AA`) y formulario validado con `LoginSchema`. Redirige según `role` a `/buyer`, `/seller`, `/admin`, `/logistics` o `/supervisor`. |
| `/register` | `RegisterBuyerPage` | `POST /api/users` | Formulario público de alta con `role: "Buyer"` fijo (`UsersController.cs:71-78`). Tras recibir el `Guid` creado, redirige a `/login` con notificación de éxito. |
| `/health` | `HealthStatusPage` | `GET /health` | Panel de telemetría técnica en `Geist Mono` (`tabular-nums`) que muestra el estado del proceso web (`healthy` / `degraded` / `unhealthy`), latencia y estado de PostgreSQL (`up` / `down`). |

---

### 2.2 Módulo del Administrador (`src/modules/admin/`)

| Ruta | Componente | Endpoints Consumidos | Composición Visual (*Split-Frame / Hero KPI*) y Reglas Operativas |
|---|---|---|---|
| `/admin` | `AdminDashboardPage` | `GET /health`<br>`GET /api/users`<br>`GET /api/warehouses`<br>`GET /api/orders`<br>`GET /api/billing/invoices` | **Hero KPI Strip + Split-Frame (`65% / 35%`):** Métrica principal dominante de volumen transaccional facturado en `Geist Mono` `600` (`tabular-nums`) + contadores compactos de usuarios activos, bodegas y pedidos; debajo, tabla de actividad reciente (65%) y panel de salud/alertas operativas (35%). |
| `/admin/users` | `UserListPage` | `GET /api/users`<br>`GET /api/users/{id}`<br>`POST /api/users/{id}/block`<br>`POST /api/users/{id}/activate` | **Split-Frame (`70% / 30%`):** `DataTable` con filtro por `UserRole` (`Buyer`, `Seller`, `Administrator`, `Supervisor`, `LogisticsOperator`) y estado `isActive` (`Active` / `Blocked`); al seleccionar una fila, el `ResponsiveDrawer` lateral (30%) muestra el documento de identidad (`Geist Mono`) y ejecuta bloqueo/reactivación previa confirmación en `AlertPort.confirm()`. |
| `/admin/users/new` | `CreateUserPage` | `POST /api/users` | Formulario controlado con `CreateUserSchema` para incorporar Vendedores, Operadores Logísticos, Supervisores o Administradores (`ZENTRIC.md` Dominio 3). No altera la sesión activa del Administrador. |
| `/admin/warehouses` | `WarehouseListPage` | `GET /api/warehouses`<br>`GET /api/warehouses/{id}`<br>`POST /api/warehouses` | **Split-Frame (`65% / 35%`):** `DataTable` de bodegas con capacidad volumétrica en `m³` (`Geist Mono`, `all-small-caps`) y tipo canónico (`Marketplace` $\rightarrow$ *Bodega Central Zentric* o `Vendor` $\rightarrow$ *Bodega de Vendedor*); panel lateral (35%) con formulario `CreateWarehouseSchema` que exige `vendorId` sólo cuando `type === 'Vendor'`. |
| `/admin/inventory-adjustments` | `InventoryAdjustPage` | `POST /api/inventories/{id}/adjust` | Consola de auditoría de conteo físico ([ADR-0021](../backendSDD/Adr/0021-ajuste-de-stock-sin-cuello-de-botella.md)). Recibe el identificador de inventario (`inventoryId`), la cantidad física contada (`countedQuantity` $\le$ disponible) y el motivo obligatorio (`reason`). Presenta el resultado idempotente `AdjustInventoryResult` (`previousAvailableQuantity`, `newAvailableQuantity`, `adjustedQuantity`) en `Geist Mono`. |
| `/admin/returns` | `RefundListPage` | `GET /api/returns`<br>`GET /api/returns/{id}`<br>`POST /api/returns/{id}/refund` | **Split-Frame (`65% / 35%`):** Bandeja filtrada por estado `Approved` (devoluciones ya aprobadas comercialmente por el vendedor pendientes de desembolso). El panel lateral muestra el expediente y el botón destructivo *"Acreditar Reembolso"* con doble confirmación (`AlertPort.confirm()`). |
| `/admin/invoices` | `InvoiceManagementPage` | `GET /api/billing/invoices`<br>`GET /api/billing/invoices/order/{orderId}`<br>`POST /api/billing/invoices/generate/{orderId}`<br>`POST /api/billing/invoices/annul/{orderId}` | **Split-Frame (`65% / 35%`):** Tabla de comprobantes tributarios (`Master`, `ZentricDetail`, `VendorDetail`) con importes en `MoneyAmount` (`tabular-nums`). El panel derecho permite emitir la facturación split para un `orderId` pagado o anular la Factura Maestra con motivo obligatorio (`AnnulInvoiceSchema`). |

---

### 2.3 Módulo del Vendedor (`src/modules/seller/`)

| Ruta | Componente | Endpoints Consumidos | Composición Visual (*Split-Frame / Hero KPI*) y Reglas Operativas |
|---|---|---|---|
| `/seller` | `SellerDashboardPage` | `GET /api/catalog/products?vendorId={id}`<br>`GET /api/orders`<br>`GET /api/billing/invoices` | **Hero KPI Strip + Split-Frame (`65% / 35%`):** Métrica dominante con subtotal neto liquidado en facturas `VendorDetail` (`MoneyAmount`), acompañada de contadores de productos `Published` vs `Suspended` y despachos pendientes de empaque (`PendingPack`). |
| `/seller/products` | `SellerProductsPage` | `GET /api/catalog/products?vendorId={id}`<br>`POST /api/catalog/products/{productId}/publish`<br>`POST /api/catalog/products/{productId}/suspend` | `DataTable` del catálogo propio que incluye tanto productos `Published` como `Suspended` ([`CatalogController.cs:118-121`](../backend/Zentric.Api/Controllers/CatalogController.cs#L118-L121)). Incluye acciones rápidas para suspender o reactivar productos y acceso al alta de producto. |
| `/seller/products/new` | `CreateProductPage` | `POST /api/catalog/products` | **Split-Frame (`60% / 40%`):** Formulario `CreateProductSchema` a la izquierda con constructor dinámico de variantes (`sku` y lista de `attributes: [{ name, value }]`, obligatorio al menos 1 variante si `type === 'Physical'`, [ADR-0003](../backendSDD/Adr/0003-variante-obligatoria-productos-fisicos.md)). Al crear, el panel derecho destaca el `productId` y los `variantIds` generados en `Geist Mono` con enlace directo a cargar stock. |
| `/seller/products/$productId` | `SellerProductDetailPage` | `GET /api/catalog/products/{id}`<br>`POST /api/catalog/products/{productId}/publish`<br>`POST /api/catalog/products/{productId}/suspend` | Ficha técnica del producto con tabla de variantes (`id`, `sku`, `canBeSold`) e interruptor de estado comercial (`Published` $\leftrightarrow$ `Suspended`). |
| `/seller/inventory` | `SellerInventoryPage` | `GET /api/inventories`<br>`GET /api/inventories/{variantId}`<br>`GET /api/warehouses`<br>`POST /api/inventories/stock` | **Split-Frame (`65% / 35%`):** `DataTable` de posiciones de stock propio desglosando `availableQuantity`, `reservedQuantity`, `usedQuantity` y `damagedQuantity` en `Geist Mono` (`tabular-nums`). El panel derecho contiene el formulario `AddStockSchema` (`variantId`, `warehouseId` propia, `quantity > 0`). |
| `/seller/orders` | `SellerOrdersPage` | `GET /api/orders`<br>`GET /api/orders/{id}` | **Split-Frame (`65% / 35%`):** Listado de pedidos que contienen líneas del vendedor; al abrir el detalle, consume `SellerOrderViewDto` mostrando exclusivamente sus líneas vendidas y su `vendorSubtotal` sin revelar datos de otros vendedores ni del comprador ([ADR-0013](../backendSDD/Adr/0013-propiedad-del-recurso-por-rol.md)). |
| `/seller/fulfillments` | `SellerFulfillmentsPage` | `GET /api/logistics/fulfillments`<br>`POST /api/logistics/fulfillment/{id}/pack`<br>`POST /api/logistics/fulfillment/{id}/dispatch`<br>`POST /api/logistics/fulfillment/cancel-ghost-stock` | Cola operativa de órdenes de despacho propias (`PendingPack`, `Packed`, `Dispatched`, `Delivered`, `Cancelled`). Permite empacar (`pack`), despachar (`dispatch`) o reportar quiebre por stock fantasma (`cancel-ghost-stock`), pero **oculta y prohíbe** la acción de entrega (`deliver`), exclusiva del Operador Logístico. |
| `/seller/returns` | `SellerReturnsPage` | `GET /api/returns`<br>`GET /api/returns/{id}`<br>`POST /api/returns/{id}/approve`<br>`POST /api/returns/{id}/reject` | **Split-Frame (`65% / 35%`):** Bandeja de solicitudes de devolución sobre variantes propias. El panel lateral exhibe el veredicto de inspección física (`isGoodCondition` booleano en `ReturnRequestDto`) y habilita los botones exclusivos del vendedor: *"Aprobar Devolución"* (envía `{ returnRequestId: id }` y reingresa a `usedQuantity`) o *"Rechazar Devolución"* ([ADR-0006](../backendSDD/Adr/0006-resolucion-contradiccion-ley-addendum.md)). |

---

### 2.4 Módulo del Comprador (`src/modules/buyer/`)

| Ruta | Componente | Endpoints Consumidos | Composición Visual (*Split-Frame*) y Reglas Operativas |
|---|---|---|---|
| `/buyer` / `/buyer/catalog` | `BuyerCatalogPage` | `GET /api/catalog/products/paged` | Explorador paginado (`page`, `size`) de productos en estado `Published`. Tarjetas con jerarquía tipográfica clara: título en `Geist Sans` `600`, tipo (`Físico` / `Digital`) en `StatusBadge` y precio en `MoneyAmount` (`Geist Mono` `600`, `tabular-nums`). |
| `/buyer/catalog/$productId` | `BuyerProductDetailPage` | `GET /api/catalog/products/{id}`<br>`POST /api/orders/cart`<br>`POST /api/orders/cart/items` | **Split-Frame (`60% / 40%`):** Especificación del producto y selector de variantes (`sku` y disponibilidad `canBeSold` incluida en `ProductVariantDto`). **Nota de Seguridad:** No invoca `GET /api/inventories/{variantId}` (restringido a `Seller` y `LogisticsOperator`); la validación de existencias se ejecuta atómicamente al agregar al carrito (`POST /api/orders/cart/items`). |
| `/buyer/cart` | `BuyerCartPage` | `GET /api/orders?status=Cart`<br>`POST /api/orders/cart`<br>`POST /api/orders/cart/items`<br>`POST /api/orders/{orderId}/checkout` | **Split-Frame (`65% / 35%`):** Tabla de líneas del carrito con `unitPrice` congelado ([ADR-0020](../backendSDD/Adr/0020-precio-congelado-y-credito-parcial-por-linea.md)) en la zona izquierda; panel de resumen financiero y botón primario *"Confirmar Checkout (Reserva 15 min)"* en la zona derecha. |
| `/buyer/orders` | `BuyerOrdersPage` | `GET /api/orders`<br>`GET /api/billing/invoices` | Historial de pedidos propios con filtro por `OrderStatus` (`Cart`, `PendingPayment`, `Paid`, `Dispatched`, `Delivered`, `Cancelled`) y consulta de sus Facturas Maestras (`Master`). |
| `/buyer/orders/$orderId` | `BuyerOrderDetailPage` | `GET /api/orders/{id}`<br>`GET /api/logistics/fulfillments`<br>`GET /api/billing/invoices/order/{orderId}` | **Split-Frame (`65% / 35%`):** Desglose de líneas, guías de despacho (`TrackingNumber` en `Geist Mono`) y Factura Maestra a la izquierda; línea de tiempo `OrderTimeline` y acceso a solicitud de devolución (sólo si `status === 'Delivered'` y el producto es `Physical`) a la derecha. |
| `/buyer/orders/$orderId/pay` | `BuyerOrderPaymentPage` | `GET /api/orders/{id}`<br>`POST /api/orders/{orderId}/pay` | Consola de pago para pedidos en `PendingPayment`. Destaca el **reloj regresivo de 15:00 minutos** en `Geist Mono` `2xl` con `font-variant-numeric: tabular-nums` y acento ámbar `#FFB800`. Si el contador llega a `00:00`, deshabilita el botón de pago y refresca el estado a `Cancelled`. |
| `/buyer/returns/new` | `RequestReturnPage` | `GET /api/orders/{id}`<br>`GET /api/ returns`<br>`POST /api/returns/request` | Formulario `RequestReturnSchema` (`customerOrderId`, `variantId`, `warehouseId`, `quantity`). Bloquea por regla de dominio (`isReturnAllowed`) cualquier intento de devolución sobre productos digitales (`ZENTRIC.md` Dominio 10). |

---

### 2.5 Módulo del Operador Logístico (`src/modules/logistics/`)

| Ruta | Componente | Endpoints Consumidos | Composición Visual (*Split-Frame*) y Reglas Operativas |
|---|---|---|---|
| `/logistics` / `/logistics/fulfillments` | `LogisticsFulfillmentsPage` | `GET /api/logistics/fulfillments`<br>`POST /api/logistics/fulfillment`<br>`GET /api/warehouses`<br>`GET /api/inventories` | **Split-Frame (`70% / 30%`):** Cola general de órdenes de despacho filtrable por los 5 estados canónicos de `FulfillmentStatus` (`PendingPack`, `Packed`, `Dispatched`, `Delivered`, `Cancelled`). El panel derecho muestra existencias de bodega y alta manual de orden de despacho. |
| `/logistics/fulfillments/$id` | `FulfillmentOperationsPage` | `GET /api/logistics/fulfillment/{id}`<br>`POST /api/logistics/fulfillment/{id}/pack`<br>`POST /api/logistics/fulfillment/{id}/dispatch`<br>`POST /api/logistics/fulfillment/{id}/deliver` | **Split-Frame (`60% / 40%`):** Expediente de paquetes y números de guía (`shipments`) a la izquierda; estación de transición secuencial a la derecha: `PendingPack` $\rightarrow$ *"Registrar Empaque"* (`Packed`) $\rightarrow$ *"Despachar Paquete"* (`Dispatched`) $\rightarrow$ *"Certificar Entrega al Comprador"* (`Delivered`, potestad exclusiva del Operador Logístico, [`AuthorizationPolicies.cs:138-151`](../backend/Zentric.Api/Security/AuthorizationPolicies.cs#L138-L151)). |
| `/logistics/fulfillments/$id/ghost-stock` | `GhostStockReportPage` | `GET /api/logistics/fulfillment/{id}`<br>`POST /api/logistics/fulfillment/cancel-ghost-stock` | Formulario de excepción operativa `CancelGhostStockSchema` (`fulfillmentOrderId`, `variantId`, `warehouseId`, `quantityToCancel`). Exige confirmación modal destructiva (`AlertPort.confirm()`) advirtiendo que cancelará el despacho, reconciliará el stock fantasma y emitirá devolución automática al comprador ([ADR-0014](../backendSDD/Adr/0014-enmiendas-a-la-matriz-de-autorizacion.md) y [ADR-0022](../backendSDD/Adr/0022-pedido-resuelto-pasa-a-cancelled.md)). |
| `/logistics/returns` | `LogisticsReturnsInspectPage` | `GET /api/returns`<br>`GET /api/returns/{id}`<br>`POST /api/returns/{id}/inspect` | **Split-Frame (`65% / 35%`):** Bandeja de devoluciones recibidas en bodega (`status === 'Requested'`). El panel derecho permite registrar el dictamen técnico físico (`InspectReturnSchema`: `isGoodCondition: true | false`) previo a la decisión comercial del vendedor ([ADR-0018](../backendSDD/Adr/0018-devoluciones-confianza-recepcion-responsabilidad.md)). |

---

### 2.6 Módulo del Supervisor de Auditoría (`src/modules/supervisor/`)

El Supervisor es un perfil de fiscalización y seguimiento operativo (`ZENTRIC.md` Dominio 1 y Sección 5). Sus vistas carecen de botones de mutación comercial, con la **única excepción** del ajuste de inventario por conteo físico (`InventoryAdjust`, dictado en [ADR-0021](../backendSDD/Adr/0021-ajuste-de-stock-sin-cuello-de-botella.md)):

| Ruta | Componente | Endpoints Consumidos | Composición Visual (*Split-Frame / Hero KPI*) y Reglas Operativas |
|---|---|---|---|
| `/supervisor` | `SupervisorDashboardPage` | `GET /health`<br>`GET /api/orders`<br>`GET /api/logistics/fulfillments`<br>`GET /api/returns`<br>`GET /api/billing/invoices` | **Hero KPI Strip + Split-Frame (`65% / 35%`):** Consola de fiscalización transversal en tiempo real (en modo lectura). **Nota de Privacidad:** No invoca `/api/users` dado que la política `UserAdministration` reserva los datos personales (PII) exclusivamente al Administrador (`UsersController.cs:19-23`). |
| `/supervisor/orders` | `SupervisorOrdersPage` | `GET /api/orders` | `DataTable` global de pedidos con filtro por `OrderStatus` en modo de sólo lectura. |
| `/supervisor/orders/$orderId` | `SupervisorOrderAuditPage` | `GET /api/orders/{id}`<br>`GET /api/logistics/fulfillments`<br>`GET /api/billing/invoices/order/{orderId}` | **Split-Frame (`65% / 35%`):** Expediente 360° de auditoría que cruza las líneas del pedido, los despachos por bodega y las tres facturas del split tributario (`Master`, `ZentricDetail`, `VendorDetail`). |
| `/supervisor/fulfillments` | `SupervisorFulfillmentsPage` | `GET /api/logistics/fulfillments` | Monitoreo de despachos y cancelaciones por quiebre de stock en toda la red logística (sólo lectura). |
| `/supervisor/returns` | `SupervisorReturnsPage` | `GET /api/returns`<br>`GET /api/returns/{id}` | Fiscalización de solicitudes de devolución, veredictos de inspección (`isGoodCondition`) y resoluciones (`Approved`, `Rejected`, `Refunded`). |
| `/supervisor/invoices` | `SupervisorInvoicesPage` | `GET /api/billing/invoices` | Libro mayor tributario de sólo lectura con desglose de Facturas Maestras, comisiones de plataforma y liquidaciones a vendedores. |
| `/supervisor/inventory-audit` | `SupervisorInventoryAuditPage` | `POST /api/inventories/{id}/adjust` | Estación de auditoría física de existencias (`InventoryAdjust`, [ADR-0021](../backendSDD/Adr/0021-ajuste-de-stock-sin-cuello-de-botella.md)) para registrar disminuciones verificadas por conteo físico con motivo obligatorio e idempotencia de 5 minutos. |

---

## 3. Contrato de Guardas de Navegación en TanStack Router (`beforeLoad`)

| Escenario de Acceso | Condición Evaluada en `beforeLoad` | Comportamiento Determinista del Router |
|---|---|---|
| **Ruta pública (`/login`, `/register`, `/health`)** | Usuario no autenticado o autenticado | Si accede a `/login` o `/register` teniendo sesión válida en `SessionPort`, redirige automáticamente al panel de su rol. |
| **Ruta protegida sin token en RAM** | `!sessionPort.getAccessToken()` | Redirige síncronamente a `/login?redirect={pathname}` antes de montar cualquier componente o disparar consultas de TanStack Query. |
| **Ruta protegida con rol distinto al requerido** | `user.role !== requiredRole` | Redirige a la vista interna `/_console/forbidden` (`403 Acceso Restringido`) **preservando intacta la sesión en memoria RAM**. |
| **Expiración sobrevenida en llamada HTTP (`401`)** | `HttpClient` recibe `401 Unauthorized` | Purga `SessionPort`, limpia `QueryClient` y navega a `/login` con notificación de sesión expirada ([ADR-0009](../backendSDD/Adr/0009-autenticacion-jwt-rg01.md)). |
