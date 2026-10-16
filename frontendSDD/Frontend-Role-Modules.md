# Frontend-Role-Modules — Módulos y Pantallas por Rol

> Especificación canónica de los módulos de la aplicación web de Zentric estructurados según los cinco roles de negocio definidos en [`../ZENTRIC.md`](../ZENTRIC.md#12-matriz-de-responsabilidades) y la matriz de 21 políticas de autorización de [`../backendSDD/Presentation/02-authorization.md`](../backendSDD/Presentation/02-authorization.md).
>
> **Los cinco roles canónicos del sistema son:**
> 1. **Comprador (`Buyer`):** Catálogo público, carrito, checkout atómico de 15 minutos, pago, seguimiento de pedidos y radicación de devoluciones.
> 2. **Vendedor (`Seller`):** Gestión de catálogo propio, publicación/suspensión, carga de inventario físico, empaque de órdenes propias y aprobación/rechazo comercial de devoluciones.
> 3. **Operador Logístico (`LogisticsOperator`):** Monitoreo de almacén, empaque general, despacho con guía de transporte, certificación exclusiva de entrega física, reporte de faltante físico (*stock fantasma*) e inspección técnica de devoluciones.
> 4. **Administrador (`Administrator`):** Alta y gestión de usuarios, registro de bodegas físicas, emisión y anulación de Facturas Maestras (facturación split), liquidación financiera de reembolsos y ajuste de stock por conteo físico.
> 5. **Supervisor de Auditoría (`Supervisor`):** Seguimiento operativo integral, trazabilidad de pedidos, despachos, devoluciones, facturación y auditoría de ajustes de inventario en modo de sólo lectura.

---

## 1. Matriz Canónica de Responsabilidades

| Proceso Operativo | Comprador | Vendedor | Op. Logístico | Administrador | Supervisor |
|---|:---:|:---:|:---:|:---:|:---:|
| **Registro de Usuarios Privilegiados** | — | — | — | ✔ (Exclusivo) | — |
| **Alta de Nuevos Compradores** | ✔ (Auto-registro) | — | — | ✔ | — |
| **Registro de Bodegas Físicas** | — | — | — | ✔ (Exclusivo) | — |
| **Gestión de Catálogo (Alta/Baja)** | — | ✔ (Exclusivo) | — | — | — |
| **Carga de Stock Físico** | — | ✔ | ✔ | — | — |
| **Ajuste de Stock por Conteo Físico** | — | — | — | ✔ | ✔ (Auditoría) |
| **Carrito y Checkout (15 min)** | ✔ (Exclusivo) | — | — | — | — |
| **Pago y Recaudo de Pedido** | ✔ (Exclusivo) | — | — | — | — |
| **Empaque de Despacho (`Packed`)** | — | ✔ (Órdenes propias) | ✔ (Cualquier orden) | — | — |
| **Despacho y Asignación de Guía** | — | — | ✔ | — | — |
| **Certificación de Entrega (`Delivered`)** | — | — | ✔ (Exclusivo) | — | — |
| **Reporte de Quiebre (*Stock Fantasma*)** | — | ✔ | ✔ | — | — |
| **Radicación de Devolución** | ✔ (Exclusivo) | — | — | — | — |
| **Inspección Técnica de Devolución** | — | — | ✔ (Exclusivo) | — | — |
| **Aprobación/Rechazo de Devolución** | — | ✔ (Exclusivo dueño) | — | — | — |
| **Acreditación de Reembolso Financiero** | — | — | — | ✔ (Exclusivo) | — |
| **Facturación Split (Emisión/Anulación)** | — | — | — | ✔ (Exclusivo) | — |
| **Consulta y Auditoría Integral** | Líneas propias | Líneas propias | Despachos/Bodega | Totalidad | Totalidad (Solo lectura) |

---

## 2. Definición Estructurada de Módulos

### 2.1 Módulo Público y de Identidad (`src/modules/public/`)

Puerta de entrada y acceso inicial al sistema sin exigir sesión previa activa:

| Ruta | Componente / Pantalla | Endpoints Consumidos | Descripción Operativa |
|---|---|---|---|
| `/entrar` | `LoginPage` | `POST /api/auth/login` | Formulario de autenticación con correo electrónico y contraseña. Al autenticar con éxito, almacena el token Bearer JWT en `MemorySessionAdapter` y redirige al panel según el rol. |
| `/registro` | `RegisterBuyerPage` | `POST /api/users` | Formulario de auto-registro público exclusivo para el rol Comprador (`role: "Buyer"`). Excepcionado de autenticación en backend. |
| `/salud` | `HealthStatusPage` | `GET /health` | Diagnóstico en tiempo real del estado de la API y conectividad con la base de datos PostgreSQL. |

### 2.2 Módulo del Administrador (`src/modules/admin/`)

Gestión centralizada de infraestructura, entidades privilegiadas y operaciones financieras:

| Ruta | Componente / Pantalla | Endpoints Consumidos | Descripción Operativa |
|---|---|---|---|
| `/admin` | `AdminDashboardPage` | `GET /health`<br>`GET /api/users`<br>`GET /api/warehouses`<br>`GET /api/catalog/products` | Panel ejecutivo con cuatro tarjetas de métricas cuantitativas: usuarios registrados, bodegas activas, productos publicados y estado de conectividad. |
| `/admin/usuarios` | `UserListPage` | `GET /api/users` | Tabla de usuarios con filtros por rol y búsqueda textual. Acciones de bloqueo y reactivación. |
| `/admin/usuarios/nuevo` | `CreateUserPage` | `POST /api/users` | Alta de usuarios privilegiados (Vendedor, Operador Logístico, Administrador, Supervisor). Requiere política `UserAdministration`. |
| `/admin/bodegas` | `WarehouseListPage` | `GET /api/warehouses` | Inventario de centros de acopio y bodegas con capacidad volumétrica ($m^3$) y tipo. |
| `/admin/bodegas/nueva` | `CreateWarehousePage` | `POST /api/warehouses` | Registro de bodega física vinculando nombre, ubicación y tipo (`Zentric` o `Vendor`). |
| `/admin/inventario/ajuste` | `InventoryAdjustPage` | `POST /api/inventories/{id}/adjust` | Formulario de ajuste por conteo físico. Exclusivo para Administrador y Supervisor (política `InventoryAdjust`). Solo disminuye unidades disponibles por seguridad. |
| `/admin/reembolsos` | `RefundListPage` | `GET /api/returns`<br>`POST /api/returns/{id}/refund` | Bandeja de devoluciones aprobadas comercialmente pendientes de acreditación económica. El botón de reembolso invoca `AlertPort.confirm()` antes de transferir fondos. |
| `/admin/facturas` | `InvoiceManagementPage` | `GET /api/billing/invoices`<br>`POST /api/billing/invoices/generate/{orderId}`<br>`POST /api/billing/invoices/annul/{orderId}` | Emisión de la Factura Maestra consolidada para pedidos pagados y anulación formal por revocación de recaudo. |

### 2.3 Módulo del Vendedor (`src/modules/seller/`)

Gestión comercial del catálogo propio, inventario de variantes y resolución de garantías:

| Ruta | Componente / Pantalla | Endpoints Consumidos | Descripción Operativa |
|---|---|---|---|
| `/seller` | `SellerDashboardPage` | `GET /api/catalog/products?vendorId={id}` | Panel del vendedor. Lista exclusivamente sus productos (incluidos los suspendidos) filtrando por el ID derivado del token JWT. |
| `/seller/productos/nuevo` | `CreateProductPage` | `POST /api/catalog/products` | Alta de producto. Si es de tipo `Physical`, exige registrar al menos una variante obligatoria (ADR-0003). Muestra el identificador de producto y los `variantIds` generados. |
| `/seller/productos/:id` | `ProductDetailPage` | `GET /api/catalog/products/{id}`<br>`POST /api/catalog/products/{id}/publish`<br>`POST /api/catalog/products/{id}/suspend` | Consulta de ficha técnica con botones de acción para publicar o suspender comercialmente el producto. |
| `/seller/inventario` | `SellerInventoryPage` | `GET /api/inventories`<br>`POST /api/inventories/stock` | Carga de unidades físicas clasificando entre existencias nuevas o reacondicionadas (`isUsed`) por variante y bodega. |
| `/seller/pedidos` | `SellerOrdersPage` | `GET /api/orders` | Lista de pedidos donde el vendedor posee líneas de venta. El backend filtra los datos ajenos y muestra únicamente sus líneas e importes correspondientes. |
| `/seller/despachos` | `SellerFulfillmentsPage` | `GET /api/logistics/fulfillments`<br>`POST /api/logistics/fulfillment/{id}/pack`<br>`POST /api/logistics/fulfillment/cancel-ghost-stock` | Empaque de paquetes en bodega propia. Botón de reporte de faltante físico (*stock fantasma*) ante discrepancias. |
| `/seller/devoluciones` | `SellerReturnsPage` | `GET /api/returns`<br>`POST /api/returns/{id}/approve`<br>`POST /api/returns/{id}/reject` | Bandeja de inspecciones técnicas finalizadas. El vendedor ejerce la potestad exclusiva de aprobar o rechazar comercialmente la devolución (ADR-0006). |

### 2.4 Módulo del Comprador (`src/modules/buyer/`)

Experiencia de compra, confirmación transaccional y radicación de solicitudes post-venta:

| Ruta | Componente / Pantalla | Endpoints Consumidos | Descripción Operativa |
|---|---|---|---|
| `/catalogo` | `CatalogPage` | `GET /api/catalog/products/paged` | Exploración de productos disponibles en estado publicado (`Published`). Búsqueda, filtrado por categorías y visualización de variantes físicas. |
| `/catalogo/:id` | `ProductDetailPage` | `GET /api/catalog/products/{id}` | Ficha de producto con selección de variantes y adición directa al carrito. |
| `/carrito` | `CartPage` | `POST /api/orders/cart`<br>`POST /api/orders/cart/items`<br>`POST /api/orders/{id}/checkout` | Visualización de ítems agregados con precio unitario congelado. Botón de Checkout que activa la reserva física y la ventana de espera de 15 minutos. |
| `/pedidos/:id` | `OrderDetailPage` | `GET /api/orders/{id}` | Consulta del estado del pedido, desglose de líneas, montos e información de envío. |
| `/pedidos/:id/pagar` | `OrderPaymentPage` | `POST /api/orders/{id}/pay` | Formulario de recaudo para pedidos en estado `PendingPayment`. Deshabilita el pago si expira la ventana de 15 minutos. |
| `/devoluciones/solicitar/:orderId` | `RequestReturnPage` | `POST /api/returns/request` | Formulario de solicitud de garantía para pedidos entregados. Valida que el producto sea físico y esté en plazo legal de reclamación. |

### 2.5 Módulo del Operador Logístico (`src/modules/logistics/`)

Operaciones físicas de bodega, empaque transversal, despacho y entrega:

| Ruta | Componente / Pantalla | Endpoints Consumidos | Descripción Operativa |
|---|---|---|---|
| `/logistics` | `LogisticsDashboardPage` | `GET /api/logistics/fulfillments` | Bandeja consolidada de órdenes logísticas distribuidas por bodega y estado (`PendingPack`, `Packed`, `Dispatched`, `Delivered`). |
| `/logistics/empaque/:id` | `PackFulfillmentPage` | `POST /api/logistics/fulfillment/{id}/pack` | Validación de ítems y transición a estado empaquetado (`Packed`). |
| `/logistics/despacho/:id` | `DispatchFulfillmentPage` | `POST /api/logistics/fulfillment/{id}/dispatch` | Asignación de empresa transportadora, número de guía (*tracking number*) y transición a despachado (`Dispatched`). |
| `/logistics/entrega/:id` | `DeliverFulfillmentPage` | `POST /api/logistics/fulfillment/{id}/deliver` | Certificación final de entrega física del paquete al comprador (`Delivered`). **Exclusivo Operador Logístico**. |
| `/logistics/quiebre/:id` | `GhostStockReportPage` | `POST /api/logistics/fulfillment/cancel-ghost-stock` | Reporte técnico de faltante físico en estantería (*stock fantasma*). Cancela la orden y dispara devolución y crédito automático. |
| `/logistics/inspeccion/:id` | `InspectReturnPage` | `POST /api/returns/{id}/inspect` | Registro obligatorio del dictamen técnico sobre mercancía recibida en bodega (estado físico, averías, sellos rotos). |

### 2.6 Módulo del Supervisor de Auditoría (`src/modules/supervisor/`)

Trazabilidad integral y auditoría operativa de sólo lectura:

| Ruta | Componente / Pantalla | Endpoints Consumidos | Descripción Operativa |
|---|---|---|---|
| `/supervisor` | `SupervisorDashboardPage` | `GET /health`<br>`GET /api/orders`<br>`GET /api/logistics/fulfillments`<br>`GET /api/returns`<br>`GET /api/billing/invoices` | Panel consolidado con trazabilidad en tiempo real de todos los pedidos, despachos, devoluciones y facturas emitidas. |
| `/supervisor/auditoria/inventario` | `InventoryAuditPage` | `GET /api/inventories`<br>`POST /api/inventories/{id}/adjust` | Inspección de discrepancias de existencias en almacenes con facultad de registrar ajustes de conteo físico (política `InventoryAdjust`). |
| `/supervisor/expediente/:orderId` | `OrderAuditFilePage` | `GET /api/orders/{id}`<br>`GET /api/logistics/fulfillments`<br>`GET /api/billing/invoices/order/{orderId}` | Vista 360° del ciclo de vida del pedido: compra, recaudo, orden logística, guía de transporte, factura maestra y facturas split. |

---

## 3. Guardas de Autorización con TanStack Router

El control de acceso en la interfaz de usuario se implementa en la capa de enrutamiento mediante funciones `beforeLoad` fuertemente tipadas en TanStack Router:

```ts
// src/app/routes/_console.tsx (Layout contenedor autenticado)
export const Route = createFileRoute('/_console')({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({
        to: '/entrar',
        search: { redirect: window.location.pathname },
      });
    }
  },
  component: ConsoleLayout,
});

// src/app/routes/_console/admin.tsx (Guarda de rol específico)
export const Route = createFileRoute('/_console/admin')({
  beforeLoad: ({ context }) => {
    if (context.auth.user?.role !== UserRole.Administrator) {
      throw redirect({ to: '/_console/acceso-denegado' });
    }
  },
  component: AdminLayout,
});
```

### 3.1 Manejo de Escenarios de Autorización en el Router

| Escenario Detectado | Comportamiento del Router | Estado de Sesión en Memoria |
|---|---|---|
| **Ruta protegida sin sesión** | Redirección inmediata a `/entrar` persistiendo el parámetro de retorno `?redirect=...`. | Sin sesión. |
| **Rol no autorizado para la ruta** | Renderiza la vista de acceso denegado (`403 Forbidden`) dentro del marco visual de la consola. | **La sesión se preserva intacta**. No se desautentica al usuario. |
| **Rol plenamente autorizado** | Resuelve el árbol de rutas y monta perezosamente (*lazy loading*) el módulo correspondiente. | Sesión activa. |
| **Token expirado en red (401)** | Interceptado por `HttpClient.ts`, purga la memoria de sesión y redirige a `/entrar`. | Sesión purgada (Fail-Closed). |

---

## 4. Matriz de Navegación Lateral por Rol

Para garantizar el cumplimiento de la regla de mínima exposición, la barra de navegación lateral filtra dinámicamente las opciones visibles según los reclamos del usuario autenticado:

| Opción de Menú | Comprador | Vendedor | Op. Logístico | Administrador | Supervisor |
|---|:---:|:---:|:---:|:---:|:---:|
| **Panel Principal** | ✔ | ✔ | ✔ | ✔ | ✔ |
| **Explorar Catálogo** | ✔ | ✔ (Solo lectura) | ✔ (Solo lectura) | ✔ (Solo lectura) | ✔ (Solo lectura) |
| **Mis Productos** | — | ✔ (Gestión completa) | — | — | — |
| **Existencias de Inventario** | — | ✔ (Stock propio) | ✔ (Stock bodega) | — | ✔ (Auditoría) |
| **Ajustes de Inventario** | — | — | — | ✔ | ✔ |
| **Bodegas de Almacén** | — | — | — | ✔ (Gestión) | — |
| **Directorio de Usuarios** | — | — | — | ✔ (Gestión) | — |
| **Carrito y Compras** | ✔ | — | — | — | — |
| **Despachos y Logística** | — | ✔ (Despachos propios) | ✔ (Cola general) | — | ✔ (Consulta) |
| **Devoluciones y Garantías** | ✔ (Radicación) | ✔ (Resolución) | ✔ (Inspección) | ✔ (Reembolsos) | ✔ (Auditoría) |
| **Facturación y Tributación** | — | — | — | ✔ (Emisión/Anulación) | ✔ (Consulta) |
