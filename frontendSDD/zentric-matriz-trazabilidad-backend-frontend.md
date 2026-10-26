# Zentric — Matriz de Trazabilidad Backend ↔ Frontend

**Propósito:** Vincular cada caso de uso del dominio (`zentric-domain-sdd.md` §4, `05-backend/01-casos-de-uso.md`) con su implementación frontend (página, componente, hook, endpoint API) y criterios de aceptación.

## Convenciones
- **CU**: Caso de uso (Command/Query) del backend.
- **FE**: Feature frontend (página/flujo).
- **API**: Endpoint REST (método + ruta).
- **Componentes**: Componentes UI clave involucrados.
- **Estados UI**: Estados de los 13 obligatorios que debe cubrir la feature.
- **AC**: Criterios de aceptación (mínimos).

---

## 1. Identity & Access

| CU Backend | FE Frontend | API Endpoint | Componentes clave | Estados UI | AC |
|------------|-------------|--------------|-------------------|------------|-----|
| RegistrarComprador | `/auth/register` | `POST /api/v1/auth/register` | `RegisterForm`, `FormField`, `Toast` | Carga, Validación, Éxito, Error | Registro → login automático + redirect a `/buyer/catalogo` |
| Login | `/auth/login` | `POST /api/v1/auth/login` | `LoginForm`, `FormField`, `Toast` | Carga, Validación, Éxito (redirect), Error | Cookies HttpOnly set, session hidratada |
| Logout | Header → Logout | `POST /api/v1/auth/logout` | `UserMenu`, `ServerAction` | Carga, Éxito (redirect) | Cookies borradas, store limpio |
| RefreshToken | Automático (interceptor) | `POST /api/v1/auth/refresh` | `ApiClient` (invisible) | — | Transparente, reintenta request original |
| CambiarContrasena | `/auth/password/change` | `POST /api/v1/auth/password/change` | `PasswordChangeForm`, `FormField` | Carga, Validación, Éxito, Error | Requiere password actual |
| SolicitarRecuperacion | `/auth/recovery/request` | `POST /api/v1/auth/password/recovery/request` | `RecoveryRequestForm` | Carga, Éxito (mensaje genérico), Error | Rate limited, no enumera emails |
| RecuperarContrasena | `/auth/recovery/confirm` | `POST /api/v1/auth/password/recovery/confirm` | `RecoveryConfirmForm` | Carga, Validación, Éxito, Error | Token válido + no expirado |
| ObtenerPerfil | Layouts (hidratación) | `GET /api/v1/auth/me` | `SessionProvider`, `UserMenu` | Carga (skeleton), Contenido | Sesión disponible en primer render |

---

## 2. Sellers & Warehouses (Admin)

| CU Backend | FE Frontend | API Endpoint | Componentes clave | Estados UI | AC |
|------------|-------------|--------------|-------------------|------------|-----|
| Crear Vendedor + Bodega | `/admin/vendedores/crear` | `POST /api/v1/sellers` | `SellerOnboardWizard` (steps), `WarehouseForm`, `Toast` | Carga, Validación paso a paso, Éxito (tx atómica), Error | Tx única: Seller + Warehouse o rollback total |
| Listar Vendedores | `/admin/vendedores` | `GET /api/v1/sellers` | `DataTable`, `StatCard`, `StatusBadge` | Carga (skeleton), Contenido, Vacío, Error | Filtros: estado, búsqueda, paginación cursor |
| Detalle Vendedor | `/admin/vendedores/$id` | `GET /api/v1/sellers/{id}` | `SellerDetailTabs` (Perfil, Bodegas, Productos, Pedidos) | Carga, Contenido, Error 404 | Tabs con loaders independientes |
| Editar Perfil Tienda | `/admin/vendedores/$id/editar` | `PATCH /api/v1/sellers/{id}` | `SellerProfileForm`, `ImageUploader` (logo) | Carga, Validación, Éxito, Error | Solo Admin + Seller(own) |
| Crear Bodega Marketplace | `/admin/bodegas/crear` | `POST /api/v1/warehouses` | `WarehouseForm` (type=Marketplace fijo) | Carga, Validación, Éxito, Error | `VendorId=null`, solo Admin |
| Crear Bodega Vendedor | `/admin/vendedores/$id/bodegas/crear` | `POST /api/v1/sellers/{id}/warehouses` | `WarehouseForm` (type=Vendor fijo) | Carga, Validación, Éxito, Error | `VendorId=Seller`, Admin/Seller(own) |

---
---

## 4. Inventory

| CU Backend | FE Frontend | API Endpoint | Componentes clave | Estados UI | AC |
|------------|-------------|--------------|-------------------|------------|-----|
| AddStock | `/seller/inventario` (modal) | `POST /api/v1/inventory/add-stock` | `AddStockModal`, `VariantAutocomplete`, `WarehouseSelect` | Carga, Validación, Éxito (toast + refresh), Error | Scope: propias + Marketplace activas |
| Consultar Inventario | `/seller/inventario` | `GET /api/v1/inventory` | `InventoryPivotTable` (Variante × Bodega), `StatusBadge` (stock) | Carga (skeleton grid), Contenido, Vacío, Error | Celdas: Available/Reserved/Used/Damaged. Colores semánticos. |
| Ajustar Stock | `/seller/inventario` (modal) | `POST /api/v1/inventory/adjust` | `AdjustStockModal`, `ReasonSelect` (enum) | Carga, Validación (motivo obligatorio), Éxito, Error | Auditado: actor, motivo, valor anterior/nuevo |
| Movimientos | `/seller/inventario/$variantId/movimientos` | `GET /api/v1/inventory/{variantId}/movements` | `DataTable` (tipo, delta, reason, actor, fecha) | Carga, Contenido, Vacío, Error | Filtros: tipo, rango fechas, exportar CSV |

---

## 5. Cart & Checkout (Buyer)

| CU Backend | FE Frontend | API Endpoint | Componentes clave | Estados UI | AC |
|------------|-------------|--------------|-------------------|------------|-----|
| Agregar al Carrito | `ProductDetail` → `AddToCartForm` | `POST /api/v1/cart/items` | `AddToCartForm`, `VariantSelector`, `Toast` (optimista) | Optimista → Confirmado / Error (rollback) | Valida stock + `CanBeSold`. Precio congelado. |
| Actualizar Cantidad | `CartPage` → input qty | `PATCH /api/v1/cart/items/{variantId}` | `CartItemQtyInput`, `Toast` | Optimista → Confirmado / Error | Revalida stock en backend |
| Quitar del Carrito | `CartPage` → botón delete | `DELETE /api/v1/cart/items/{variantId}` | `CartItem`, `ConfirmDialog` (opcional) | Optimista → Confirmado | — |
| Checkout | `/buyer/checkout` | `POST /api/v1/checkout` | `CheckoutWizard` (Dirección→Envío→Pago), `AddressAutocomplete`, `ShippingOptions`, `PaymentForm` | 3 pasos: Carga, Validación, Procesando, Éxito/Error | Reserva atómica 15 min. Idempotency-Key. |
| Confirmar Pago (Simulado) | `/buyer/checkout/success` | `POST /api/v1/payments/attempts` | `PaymentForm` (simulado), `Toast`, `Redirect` | Procesando → Éxito (OrderDetail) / Error (reintentar) | No declara éxito sin confirmación backend. |
| Expirar Checkout | Worker (backend) | — | `OrderDetail` muestra `Cancelled (Expired)` | Contenido (estado real) | Toast notificación si usuario en página |

---

## 6. Orders & Logistics

| CU Backend | FE Frontend | API Endpoint | Componentes clave | Estados UI | AC |
|------------|-------------|--------------|-------------------|------------|-----|
---

## 7. Billing (Invoices)

| CU Backend | FE Frontend | API Endpoint | Componentes clave | Estados UI | AC |
|------------|-------------|--------------|-------------------|------------|-----|
| Ver Factura (Buyer) | `/buyer/pedidos/$id/factura` | `GET /api/v1/invoices/{id}` | `InvoiceViewer` (PDF/HTML), `DownloadButton` | Carga, Contenido, Error 404 | Solo `Master` para Buyer. |
| Ver Factura Vendor (Seller) | `/seller/facturas` | `GET /api/v1/invoices?type=Vendor` | `DataTable`, `StatusBadge`, `MoneyAmount` | Carga, Contenido, Vacío, Error | Filtros: estado, fechas. Solo `Vendor`. |
| Listar Facturas (Admin/Supervisor) | `/admin/facturas` / `/supervisor/libro-mayor` | `GET /api/v1/invoices` | `DataTable`, `ExportButton` (CSV/Excel) | Carga, Contenido, Vacío, Error | Todos los tipos. Permisos export INC-09. |

---

## 8. Returns

| CU Backend | FE Frontend | API Endpoint | Componentes clave | Estados UI | AC |
|------------|-------------|--------------|-------------------|------------|-----|
| Solicitar Devolución | `/buyer/devoluciones/crear` | `POST /api/v1/returns` | `ReturnRequestWizard` (Pedido→Items→Motivo) | Carga, Validación (elegibilidad backend), Éxito, Error | Solo Physical, ≤30d post-Delivered. |
| Listar Devoluciones (Buyer) | `/buyer/devoluciones` | `GET /api/v1/returns` | `DataTable`, `StatusBadge` | Carga, Contenido, Vacío, Error | Scope: propias. |
| Listar Devoluciones (Seller) | `/seller/devoluciones` | `GET /api/v1/returns?scope=mine` | `DataTable`, `StatusBadge`, `ReturnDetailDrawer` | Carga, Contenido, Vacío, Error | Scope: líneas propias. |
| Inspeccionar (Logistics) | `/logistics/inspeccion-devoluciones/$id` | `POST /api/v1/returns/{id}/inspect` | `InspectionForm` (estado, fotos, notas), `ImageUploader` | Carga, Validación, Éxito, Error | Fotos múltiples. Notas. |
| Aprobar/Rechazar (Seller) | `/seller/devoluciones/$id` | `POST /api/v1/returns/{id}/approve|reject` | `ReturnDetailDrawer`, `ApproveButton`/`RejectButton` (modal motivo) | Carga, Validación, Éxito, Error | Solo tras inspección OK. Aprobar → reingreso `Used` + reembolso. |

---

## 9. Reports & Supervision

| CU Backend | FE Frontend | API Endpoint | Componentes clave | Estados UI | AC |
|------------|-------------|--------------|-------------------|------------|-----|
| Dashboard Ejecutivo | `/supervisor/dashboard` | `GET /api/v1/reports/sales|orders|inventory|logistics` | `StatCard` grid, `Chart` (Recharts), `DateRangePicker` | Carga (skeleton cards), Contenido, Error | Filtros globales: rango, zona horaria, moneda. |
| Auditoría 360° | `/supervisor/auditoria/pedidos/$id` | `GET /api/v1/audit/orders/{id}` | `Audit360Timeline` (CustomerOrder + Fulfillments + Invoices + Returns + AuditLogs) | Carga, Contenido, Error 404 | Exportar PDF/JSON (permiso INC-09). |
| Libro Mayor | `/supervisor/libro-mayor` | `GET /api/v1/audit/ledger` | `DataTable` (Master/ZentricDetail/Vendor), `ExportButton` | Carga, Contenido, Vacío, Error | Filtros: periodo fiscal, vendedor, tipo. Export CSV/Excel. |
| Cumplimiento Logístico | `/supervisor/logistica` | `GET /api/v1/reports/logistics` | `StatCard` (SLA), `Chart` (trends), `DataTable` (transportadoras) | Carga, Contenido, Error | Filtros: transportadora, bodega, rango. |

---

## 10. Cobertura de criterios transversales

| Criterio | Cobertura (FE features) |
|----------|------------------------|
| 13 estados UI obligatorios | ✅ Todas las páginas async listadas arriba |
| Responsive 5 breakpoints | ✅ `DataTable`→cards, `Sidebar`→drawer, `Toolbar`→bottom sheet |
| Teclado + Focus visible | ✅ Radix primitives + `FocusScope` en modals/drawers |
| Color + Texto (no solo color) | ✅ `StatusBadge` (dot+label), `Alert` (icon+title+desc) |
| Reduced motion | ✅ `@media (prefers-reduced-motion)` en `globals.css` |
| Imágenes: alt, fallback, dominio | ✅ `ProductGallery`, `Avatar`, `ImageUploader` + `next.config.js` |
| Formularios: validación dual, inline errors | ✅ `FormField` + Zod (OpenAPI) + `aria-invalid` |
| No reglas de negocio en cliente | ✅ Solo presentación. Backend = autoridad. |
| Contratos API verificados | ✅ Tipos generados (`orval`) + Pact tests en CI. |
| Tests: Unit, Component, E2E | ✅ Vitest (domain/rules), Testing Library (components), Playwright (E2E por rol). |
| Listar Pedidos (Buyer) | `/buyer/pedidos` | `GET /api/v1/orders` | `DataTable`, `StatusBadge`, `MoneyAmount` | Carga (skeleton), Contenido, Vacío, Error | Filtros: estado, fechas. Cursor pagination. |
| Detalle Pedido (Buyer) | `/buyer/pedidos/$id` | `GET /api/v1/orders/{id}` | `OrderDetailTabs` (Resumen, Timeline, Items, Facturas, Devoluciones) | Carga, Contenido, Error 404 | Timeline inmutable (`OrderTimeline`). Tracking si `Dispatched`. |
| Listar Pedidos (Seller) | `/seller/pedidos` | `GET /api/v1/orders?scope=mine` | `DataTable` (agrupado por Order), `StatusBadge` | Carga, Contenido, Vacío, Error | Solo líneas propias (`OrderItem.VendorId`). |
| Detalle Pedido (Seller) | `/seller/pedidos/$id` | `GET /api/v1/orders/{id}` | `OrderDetailTabs` + `FulfillmentCards` (acciones Pack/Dispatch) | Carga, Contenido, Error 404 | Acciones según estado + scope. |
| Pack Fulfillment | `/seller/cumplimientos/$id` | `POST /api/v1/fulfillments/{id}/pack` | `FulfillmentDetail`, `PackButton` (valida items) | Carga, Procesando, Éxito (Packed), Error | Requiere `PendingPacking`. |
| Dispatch Fulfillment | `/seller/cumplimientos/$id` | `POST /api/v1/fulfillments/{id}/dispatch` | `DispatchForm` (Carrier select + Tracking), `Toast` | Carga, Validación, Procesando, Éxito (Dispatched), Error | Carrier + Tracking obligatorios. |
| Deliver Fulfillment | `/seller/cumplimientos/$id` | `POST /api/v1/fulfillments/{id}/deliver` | `ConfirmDialog`, `Toast` | Carga, Procesando, Éxito (Delivered), Error | Requiere `Dispatched`. |
| Cancelar Despacho (StockBreak) | `/logistics/cumplimientos/$id` | `POST /api/v1/fulfillments/{id}/cancel` | `CancelFulfillmentModal` (motivo), `Toast` | Carga, Validación, Éxito (Cancelled), Error | Solo Logistics/Admin. Trigger devolución parcial. |

## 3. Catalog (Products & Variants)

| CU Backend | FE Frontend | API Endpoint | Componentes clave | Estados UI | AC |
|------------|-------------|--------------|-------------------|------------|-----|
| Crear Producto | `/seller/productos/crear` | `POST /api/v1/products` | `CreateProductWizard` (Básico→Variantes→Imágenes→Publicar) | Carga paso, Validación, Éxito (Draft), Error | Physical requiere ≥1 variante |
| Listar Productos (Seller) | `/seller/productos` | `GET /api/v1/products?scope=mine` | `DataTable`, `StatusBadge`, `MoneyAmount`, `Image` | Carga (skeleton rows), Contenido, Vacío, Error | Filtros: estado, categoría, búsqueda, cursor |
| Listar Productos (Público) | `/buyer/catalogo` | `GET /api/v1/products` | `ProductGrid`, `ProductCard`, `ProductGallery`, `FilterSidebar` | Carga (skeleton cards), Contenido, Vacío, Error | Solo `Published`. SEO meta tags. |
| Detalle Producto (Seller) | `/seller/productos/$id/editar` | `GET /api/v1/products/{id}` | `EditProductForm`, `VariantManager`, `ImageUploader` | Carga, Validación, Éxito, Error | Transiciones estado: botones Publish/Suspend/Discontinue |
| Detalle Producto (Buyer) | `/buyer/producto/$id` | `GET /api/v1/products/{id}` | `ProductGallery`, `VariantSelector`, `AddToCartForm`, `StatusBadge` | Carga (blur placeholder), Contenido, Error 404 | Precio/disponibilidad por variante. `AddToCart` optimista. |
| Publicar Producto | Botón "Publicar" | `POST /api/v1/products/{id}/publish` | `ConfirmDialog`, `Toast` | Carga, Éxito (badge Published), Error | Valida variantes + SKU + imagen |
| Gestionar Variantes | `/seller/productos/$id/variantes` | `POST/PATCH/DELETE /api/v1/products/{id}/variants` | `VariantManager` (tabla inline), `VariantForm` (modal) | Carga, Validación, Éxito, Error | SKU único, ≥1 atributo, PriceAmount > 0 |
