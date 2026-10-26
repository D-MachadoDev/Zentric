# Matriz de autorización y alcance por rol — Zentric

**Fuente:** `zentric-domain-sdd.md`, ADR-0011, ADR-0013, ADR-0014, `Zentric.Api/Security/AuthorizationPolicies.cs`.

> **Principio:** La autorización efectiva es **server-side**. Esta matriz define la intención de diseño para UI y contratos; el backend es la autoridad final. Cada operación valida: `rol + estado + ownership + scope`.

## 1. Roles y entidades de negocio asociadas

| Rol | Entidad de negocio | Scope base |
|-----|-------------------|------------|
## 2. Matriz de capacidades (CRUD + acciones de dominio)

| Acción / Recurso | Buyer | Seller | Logistics | Admin | Supervisor |
|------------------|-------|--------|-----------|-------|------------|
| **Usuarios** |
| Ver propio perfil | ✅ | ✅ | ✅ | ✅ | ✅ |
| Editar propio perfil | ✅ | ✅ | ✅ | ✅ | ❌ |
| Listar usuarios | ❌ | ❌ | ❌ | ✅ | ✅ (read-only) |
| Crear usuario (cualquier rol) | ❌ | ❌ | ❌ | ✅ | ❌ |
| Activar/Inactivar usuario | ❌ | ❌ | ❌ | ✅ | ❌ |
| Reset password / MFA | Propio | Propio | Propio | Todos | ❌ |
| **Vendedores (Seller)** |
| Registrar vendedor + 1ª bodega | ❌ | ❌ | ❌ | ✅ (transacción única) | ❌ |
| Ver perfil tienda propio | ❌ | ✅ | ❌ | ✅ | ✅ |
| Editar perfil tienda | ❌ | ✅ | ❌ | ✅ | ❌ |
| Listar vendedores | ❌ | ❌ | ❌ | ✅ | ✅ |
| Activar/Inactivar vendedor | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Bodegas (Warehouse)** |
| Ver bodegas propias | ❌ | ✅ | ✅ (asignadas) | ✅ | ✅ |
| Crear bodega propia (Vendor) | ❌ | ✅ (vinculada a su VendorId) | ❌ | ✅ | ❌ |
| Crear bodega Marketplace | ❌ | ❌ | ❌ | ✅ | ❌ |
| Editar bodega (ubicación, tipo) | ❌ | Propias | ❌ | Todas | ❌ |
| Activar/Inactivar bodega | ❌ | Propias | ❌ | Todas | ❌ |
| Ver bodegas Marketplace (para AddStock) | ❌ | ✅ (todas activas) | ❌ | ✅ | ✅ |
| **Productos (Product)** |
| Ver catálogo público (Published) | ✅ | ✅ | ❌ | ✅ | ✅ |
| Ver propio catálogo (todos estados) | ❌ | ✅ | ❌ | ✅ | ✅ |
| Crear producto (Draft) | ❌ | ✅ | ❌ | ✅ | ❌ |
| Editar producto (nombre, desc, precio, img, cat, tipo) | ❌ | ✅ (Draft/Published) | ❌ | ✅ | ❌ |
| Publicar / Suspender / Descontinuar / Restaurar | ❌ | ✅ | ❌ | ✅ | ❌ |
| Gestionar variantes (add/edit/activate/deactivate/delete) | ❌ | ✅ | ❌ | ✅ | ❌ |
| Moderar producto (Admin) | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Inventario (Inventory)** |
| Consultar existencias (variant + warehouse) | ❌ | ✅ (propias + Marketplace) | ✅ (asignadas) | ✅ | ✅ |
| AddStock (entrada) | ❌ | ✅ (propias + Marketplace activas) | ❌ | ✅ | ❌ |
| Ajuste por conteo físico | ❌ | Propias (motivo + auditoría) | ❌ | Todas (motivo + auditoría) | ❌ |
| Traslado entre bodegas | ❌ | ABIERTO (INC-06) | ABIERTO | ABIERTO | ❌ |
| Ver movimientos/auditoría | ❌ | Propias | Asignadas | Todas | ✅ |
| **Carrito / Pedidos (CustomerOrder)** |
| Carrito propio (CRUD items) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Checkout propio | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ver pedidos propios | ✅ | ✅ (líneas propias) | ✅ (asignados) | ✅ | ✅ |
| Ver detalle pedido (scope) | Propio | Líneas propias | Asignado | Todo | Todo |
| Cancelar pedido (Cart/PendingPayment) | ✅ (propio) | ❌ | ❌ | ✅ | ❌ |
| Cancelar tras pago (Paid) | ABIERTO (INC-02) | ❌ | ❌ | ABIERTO | ❌ |
| **Cumplimiento / Logística (FulfillmentOrder)** |
| Ver cola asignada | ❌ | ✅ (propias) | ✅ (asignadas) | ✅ | ✅ |
| Pack (PendingPacking → Packed) | ❌ | ✅ (propias) | ✅ (asignadas) | ✅ | ❌ |
| Dispatch (Packed → Dispatched + tracking) | ❌ | ✅ (propias) | ✅ (asignadas) | ✅ | ❌ |
| Deliver (Dispatched → Delivered) | ❌ | ✅ (propias) | ✅ (asignadas) | ✅ | ❌ |
| Cancelar despacho (quiebre stock) | ❌ | Notificado | ✅ (ejecuta) | ✅ | ❌ |
| Gestionar transportadoras (Carrier) | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Facturación (Invoice)** |
| Ver factura Master (propia) | ✅ | ❌ | ❌ | ✅ | ✅ |
| Ver factura Vendor (propias) | ❌ | ✅ | ❌ | ✅ | ✅ |
| Ver Detalle Zentric | ❌ | ❌ | ❌ | ✅ | ✅ |
| Generar facturas (trigger automático) | Sistema | Sistema | Sistema | ✅ (revisar) | ❌ |
| **Devoluciones (ReturnRequest)** |
| Solicitar devolución (30 días, físico) | ✅ (elegibilidad backend) | ❌ | ❌ | ✅ | ❌ |
| Ver solicitudes (scope) | Propias | Propias (líneas) | Asignadas (inspección) | Todas | Todas |
| Inspeccionar (logistics) | ❌ | ❌ | ✅ (asignadas) | ✅ | ❌ |
| Aprobar / Rechazar (seller) | ❌ | ✅ (propias) | ❌ | ✅ | ❌ |
| Reingreso stock (Used) | Sistema | Notificado | Ejecuta | ✅ | ❌ |
| Reembolso (RefundCredit) | Recibe | Notificado | ❌ | ✅ (auditoría) | ✅ |
| **Reportes y Supervisión** |
| Dashboard métricas propias | ✅ (compras) | ✅ (ventas, stock) | ✅ (cola, SLA) | ✅ (global) | ✅ (global agregado) |
| Auditoría 360° pedido | ❌ | ❌ | ❌ | ✅ | ✅ |
| Libro mayor tributario | ❌ | ❌ | ❌ | ✅ | ✅ |
| Fiscalización / Compliance | ❌ | ❌ | ❌ | ✅ | ✅ |
## 3. Reglas de scope (ownership + alcance)

| Recurso | Regla de scope |
|---------|----------------|
| `Product` | `Product.VendorId == Seller.VendorId` |
| `ProductVariant` | `Variant.Product.VendorId == Seller.VendorId` |
| `Inventory` | `Inventory.Warehouse.VendorId == Seller.VendorId` OR `Warehouse.Type == Marketplace` |
| `CustomerOrder` | `Order.BuyerId == Buyer.Id` OR `OrderItem.VendorId == Seller.VendorId` |
| `FulfillmentOrder` | `FulfillmentOrder.VendorId == Seller.VendorId` OR `AssignedTo == Logistics.Id` |
| `ReturnRequest` | `ReturnRequest.VendorId == Seller.VendorId` OR `AssignedTo == Logistics.Id` |
| `Invoice` | `Invoice.CustomerOrder` scope rules + `Invoice.Type == Vendor` for Seller |

## 4. Estados y transiciones autorizadas por rol

| Entidad | Transición | Rol autorizado | Precondición |
|---------|------------|----------------|--------------|
| `Product` | Draft → Published | Seller, Admin | Variantes OK (si Physical), SKU, imágenes |
| `Product` | Published → Suspended | Seller, Admin | — |
| `Product` | Published/Suspended → Discontinued | Seller, Admin | Soft delete |
| `CustomerOrder` | Cart → PendingPayment | Buyer (via Checkout) | Stock reservado, pago iniciado |
| `CustomerOrder` | PendingPayment → Paid | Sistema (Payment gateway) | Pago confirmado |
| `CustomerOrder` | PendingPayment → Cancelled (Expired) | Sistema (Timeout worker) | 15 min sin pago |
| `CustomerOrder` | Paid → Cancelled (PaymentFailed) | Sistema | Rechazo confirmado proveedor |
| `CustomerOrder` | Paid → Cancelled (StockBreak) | Sistema (Logistics) | Quiebre stock → despacho cancelado |
| `CustomerOrder` | Delivered/Cancelled → (inmutable) | Nadie | Regla SSoT |
| `FulfillmentOrder` | PendingPacking → Packed | Seller, Logistics, Admin | Items válidos |
| `FulfillmentOrder` | Packed → Dispatched | Seller, Logistics, Admin | Carrier + tracking |
| `FulfillmentOrder` | Dispatched → Delivered | Seller, Logistics, Admin | Confirmación entrega |
| `FulfillmentOrder` | Any → Cancelled (StockBreak) | Logistics, Admin | Quiebre confirmado |
| `ReturnRequest` | Requested → Approved | Seller (dueño), Admin | Inspección OK |
| `ReturnRequest` | Requested → Rejected | Seller (dueño), Admin | Motivo válido |
| `ReturnRequest` | Approved → Refunded | Sistema (tras reingreso Used) | Stock reingresado |

## 5. Incertidumbres abiertas (ver `01-negocio/01-alcance-y-decisiones.md` INC-01)
- Matriz exacta de permisos por acción y scope para Seller, Logistics, Admin, Supervisor.
- Política de cancelación de pedido tras pago y antes de despacho (INC-02).
- Flujo físico de devoluciones, reingreso stock y reembolso (INC-04).
- Política de ajustes de stock y roles autorizados (INC-06).
- Definiciones de métricas y exportación de reportes (INC-09).

## 6. Implementación en backend (referencia)
- `Zentric.Api/Security/AuthorizationPolicies.cs` → Policies: `RequireSellerScope`, `RequireLogisticsScope`, `RequireAdmin`, `RequireSupervisor`, `RequireOwnership<T>`.
- Handlers: `AuthorizationHandler<RequireSellerScopeRequirement>` valida `VendorId` claim vs recurso.
- Middleware: `CorrelationIdMiddleware`, `ExceptionHandlerMiddleware` → ProblemDetails.
| Exportar reportes | ❌ | ABIERTO (INC-09) | ❌ | ✅ | ✅ (permisos export) |
| `Buyer` | `Buyer` (1:1 User) | Propios: pedidos, carrito, direcciones, devoluciones, facturas |
| `Seller` | `Seller` (1:1 User) | Propios: productos, variantes, inventario (bodegas propias + Marketplace), pedidos (líneas propias), cumplimientos, devoluciones, facturas Vendor |
| `Logistics Operator` | `User` (role Logistics) | Asignados: fulfillment orders (Pack/Dispatch/Deliver), inspección devoluciones, guias |
| `Administrator` | `User` (role Admin) | Global: usuarios, vendedores, bodegas (Marketplace), productos (moderación), categorías, configuración, reportes |
| `Supervisor` | `User` (role Supervisor) | Global read-only: métricas agregadas, auditoría 360°, libro mayor, fiscalización, reportes export |
