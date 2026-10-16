# Servicios de Aplicación, Hooks de TanStack Query y Esquemas Zod (Frontend Domain Services)

> Casos de uso y gestión de estado remoto del cliente Zentric (`apps/frontend/src/application/`).  
> Orquestan el puerto unificado `ZentricApiPort`, administran la caché reactiva con **TanStack Query** y validan formularios con **Zod**, manteniendo el código 100% en inglés con comentarios en español ([`AGENTS.md`](../AGENTS.md) §1 y §5).

---

## 1. Principio Rector: Intenciones de Negocio y Estado Remoto

Cada hook y servicio de aplicación modela una operación del contrato CQRS del backend ([`backendSDD/Application/01-use-cases-and-ports.md`](../backendSDD/Application/01-use-cases-and-ports.md)) respetando las siguientes reglas:

1. **Código en Inglés, Comentarios en Español:** Todos los identificadores de código (hooks, esquemas, funciones, tipos e interfaces) se escriben en inglés siguiendo el lenguaje ubicuo (`Buyer`, `Seller`, `Order`, `FulfillmentOrder`, `ReturnRequest`, `Invoice`).
2. **Validación Preventiva en Cliente:** Los esquemas Zod replican con exactitud las reglas de FluentValidation del backend para ofrecer retroalimentación inmediata en formularios sin emitir peticiones HTTP inválidas.
3. **Autoridad Suprema en el Servidor:** El cliente no calcula impuestos, comisiones ni saldos financieros; despacha la petición a través de `ZentricApiPort` e invalida las claves de caché afectadas tras cada mutación exitosa.
4. **Inmutabilidad de la Sesión del Llamante:** Operaciones administrativas (como `useCreateUserMutation`) devuelven el identificador de la entidad creada y jamás alteran el token ni el rol del administrador autenticado.

---

## 2. Fábrica Centralizada de Claves de Caché (`queryKeys.ts`)

Para evitar colisiones de caché y garantizar invalidaciones deterministas en TanStack Query, todas las claves se centralizan en `src/application/services/queryKeys.ts`:

```typescript
// application/services/queryKeys.ts
// Fábrica tipada de claves de consulta para TanStack Query
export const queryKeys = {
  health: ['health'] as const,
  auth: {
    me: ['auth', 'me'] as const,
  },
  users: {
    all: ['users'] as const,
    list: (role?: string) => ['users', 'list', { role }] as const,
    detail: (id: string) => ['users', 'detail', id] as const,
  },
  warehouses: {
    all: ['warehouses'] as const,
    list: (vendorId?: string) => ['warehouses', 'list', { vendorId }] as const,
    detail: (id: string) => ['warehouses', 'detail', id] as const,
  },
  inventories: {
    all: ['inventories'] as const,
    list: () => ['inventories', 'list'] as const,
    byVariant: (variantId: string) => ['inventories', 'variant', variantId] as const,
  },
  products: {
    all: ['products'] as const,
    list: (vendorId?: string) => ['products', 'list', { vendorId }] as const,
    paged: (page: number, size: number, vendorId?: string) =>
      ['products', 'paged', { page, size, vendorId }] as const,
    detail: (id: string) => ['products', 'detail', id] as const,
  },
  orders: {
    all: ['orders'] as const,
    list: (status?: string) => ['orders', 'list', { status }] as const,
    detail: (id: string) => ['orders', 'detail', id] as const,
  },
  fulfillments: {
    all: ['fulfillments'] as const,
    list: (status?: string) => ['fulfillments', 'list', { status }] as const,
    detail: (id: string) => ['fulfillments', 'detail', id] as const,
  },
  returns: {
    all: ['returns'] as const,
    list: (status?: string) => ['returns', 'list', { status }] as const,
    detail: (id: string) => ['returns', 'detail', id] as const,
  },
  invoices: {
    all: ['invoices'] as const,
    list: () => ['invoices', 'list'] as const,
    byOrder: (orderId: string) => ['invoices', 'order', orderId] as const,
  },
} as const;
```

---

## 3. Catálogo de Hooks y Servicios por Módulo Funcional (45 Endpoints)

### 3.1 Identidad y Gestión de Usuarios (`identity.ts`)

| Hook / Servicio | Método del Puerto | Invalidación / Efecto | Responsabilidad Técnica |
|---|---|---|---|
| **`useLoginMutation`** | `ZentricApiPort.login` | Guarda token en `SessionPort` | Autentica con correo y contraseña (`POST /api/auth/login`), almacena el JWT exclusivamente en memoria RAM ([ADR-0009](../backendSDD/Adr/0009-autenticacion-jwt-rg01.md)). |
| **`useCurrentUserQuery`** | `ZentricApiPort.getCurrentUser` | Lee `queryKeys.auth.me` | Resuelve la identidad del token vigente en memoria (`GET /api/auth/me`). Sin refresh token. |
| **`useLogoutMutation`** | `SessionPort.clear` | `queryClient.clear()` | Purga la sesión de la memoria RAM y limpia toda la caché de TanStack Query. |
| **`useUsersQuery`** | `ZentricApiPort.listUsers` | `queryKeys.users.list(role)` | Lista usuarios registrados con filtro opcional por rol (`GET /api/users`). |
| **`useUserQuery`** | `ZentricApiPort.getUserById` | `queryKeys.users.detail(id)` | Consulta la ficha técnica de un usuario (`GET /api/users/{id}`). |
| **`useCreateUserMutation`** | `ZentricApiPort.createUser` | Invalida `queryKeys.users.all` | Registra un nuevo usuario o comprador (`POST /api/users`) sin alterar la sesión actual. |
| **`useBlockUserMutation`** | `ZentricApiPort.blockUser` | Invalida `queryKeys.users.all` | Bloquea el acceso de un usuario (`POST /api/users/{id}/block`). Exclusivo Administrador. |
| **`useActivateUserMutation`**| `ZentricApiPort.activateUser` | Invalida `queryKeys.users.all` | Reactiva un usuario bloqueado (`POST /api/users/{id}/activate`). Exclusivo Administrador. |

---

### 3.2 Catálogo de Productos (`catalog.ts`)
Gestiona el ciclo de vida de productos y variantes físicas obligatorias ([ADR-0003](../backendSDD/Adr/0003-variante-obligatoria-productos-fisicos.md)):

| Hook / Servicio | Método del Puerto | Invalidación / Efecto | Responsabilidad Técnica |
|---|---|---|---|
| **`useProductsQuery`** | `ZentricApiPort.listProducts` | `queryKeys.products.list(vendorId)` | Lista productos publicados o, si el vendedor filtra por su propio `vendorId`, incluye los suspendidos. |
| **`useProductsPagedQuery`** | `ZentricApiPort.listProductsPaged` | `queryKeys.products.paged(...)` | Consulta paginada (`GET /api/catalog/products/paged`) con metadatos `PagedResult<Product>`. |
| **`useProductQuery`** | `ZentricApiPort.getProductById` | `queryKeys.products.detail(id)` | Obtiene la ficha técnica completa y variantes (`VariantId`, `Sku`) de un producto. |
| **`useCreateProductMutation`**| `ZentricApiPort.createProduct` | Invalida `queryKeys.products.all` | Crea un producto que nace `Published` y retorna `{ productId, variantIds }` ([ADR-0017](../backendSDD/Adr/0017-listados-de-recurso-propio.md)). |
| **`usePublishProductMutation`**| `ZentricApiPort.publishProduct` | Invalida `queryKeys.products.all` | Reactiva un producto suspendido (`Suspended` $\rightarrow$ `Published`). |
| **`useSuspendProductMutation`**| `ZentricApiPort.suspendProduct` | Invalida `queryKeys.products.all` | Suspende un producto (`Published` $\rightarrow$ `Suspended`), impidiendo su compra. |

---

### 3.3 Inventario y Bodegas Físicas (`inventory.ts`, `warehouses.ts`)
Supervisa las bodegas y el control atómico de existencias ([ADR-0021](../backendSDD/Adr/0021-ajuste-de-stock-sin-cuello-de-botella.md) y [ADR-0025](../backendSDD/Adr/0025-stock-negativo-update-condicional-atomico.md)):

| Hook / Servicio | Método del Puerto | Invalidación / Efecto | Responsabilidad Técnica |
|---|---|---|---|
| **`useWarehousesQuery`** | `ZentricApiPort.listWarehouses` | `queryKeys.warehouses.list(vendorId)`| Lista bodegas activas con aislamiento por rol. |
| **`useWarehouseQuery`** | `ZentricApiPort.getWarehouseById` | `queryKeys.warehouses.detail(id)` | Consulta capacidad volumétrica ($m^3$) y ubicación de una bodega. |
| **`useCreateWarehouseMutation`**| `ZentricApiPort.createWarehouse` | Invalida `queryKeys.warehouses.all` | Registra una nueva bodega física (`Marketplace` o `Vendor`). |
| **`useInventoriesQuery`** | `ZentricApiPort.listInventories` | `queryKeys.inventories.list()` | Lista el inventario visible para el rol autenticado (`GET /api/inventories`). |
| **`useInventoryByVariantQuery`**| `ZentricApiPort.listInventoryByVariant` | `queryKeys.inventories.byVariant` | Desglosa existencias por variante (`Available`, `Reserved`, `Used`, `Damaged`). |
| **`useAddStockMutation`** | `ZentricApiPort.addStock` | Invalida `queryKeys.inventories.all`| Ingresa stock nuevo o usado (`POST /api/inventories/stock`). |
| **`useAdjustInventoryMutation`**| `ZentricApiPort.adjustInventory` | Invalida `queryKeys.inventories.all`| Ajuste por conteo físico en bodega (`POST /api/inventories/{id}/adjust`). Exclusivo Administrador y Supervisor. |

---

### 3.4 Carrito de Compras y Checkout Atómico de 15 Minutos (`orders.ts`)
Orquesta la compra con precio congelado y reserva temporal ([ADR-0001](../backendSDD/Adr/0001-reserva-fragmentacion-contingencia.md), [ADR-0005](../backendSDD/Adr/0005-modelado-carrito-compras.md), [ADR-0020](../backendSDD/Adr/0020-precio-congelado-y-credito-parcial-por-linea.md)):

| Hook / Servicio | Método del Puerto | Invalidación / Efecto | Responsabilidad Técnica |
|---|---|---|---|
| **`useOrdersQuery`** | `ZentricApiPort.listOrders` | `queryKeys.orders.list(status)` | Lista pedidos filtrados por rol y estado (`GET /api/orders`). |
| **`useOrderQuery`** | `ZentricApiPort.getOrderById` | `queryKeys.orders.detail(id)` | Retorna `Order` completo (Comprador/Admin/Supervisor) o `SellerOrderView` restringido (Vendedor). |
| **`useCreateCartMutation`** | `ZentricApiPort.createCart` | Invalida `queryKeys.orders.all` | Inicializa un carrito vinculado a la identidad del token JWT (`POST /api/orders/cart`). |
| **`useAddCartItemMutation`** | `ZentricApiPort.addCartItem` | Invalida `queryKeys.orders.detail` | Añade variante al carrito congelando el precio unitario vigente. |
| **`useCheckoutOrderMutation`**| `ZentricApiPort.checkoutOrder` | Invalida `orders` e `inventories` | Cierra el carrito, reserva stock en bodegas e inicia la ventana de **15 minutos** (`PendingPayment`). |
| **`usePayOrderMutation`** | `ZentricApiPort.payOrder` | Invalida `orders` y `fulfillments` | Procesa el pago (`Paid`), consolida reservas y genera el comprobante `PaymentReceipt`. |

---

### 3.5 Logística, Despacho y Contingencia por Stock Fantasma (`logistics.ts`)
Controla el ciclo de vida logístico particionado por bodega ([ADR-0004](../backendSDD/Adr/0004-estado-cancelacion-despacho.md), [ADR-0014](../backendSDD/Adr/0014-enmiendas-a-la-matriz-de-autorizacion.md), [ADR-0022](../backendSDD/Adr/0022-pedido-resuelto-pasa-a-cancelled.md)):

| Hook / Servicio | Método del Puerto | Invalidación / Efecto | Responsabilidad Técnica |
|---|---|---|---|
| **`useFulfillmentsQuery`** | `ZentricApiPort.listFulfillments` | `queryKeys.fulfillments.list` | Lista órdenes de despacho (`GET /api/logistics/fulfillments`). |
| **`useFulfillmentQuery`** | `ZentricApiPort.getFulfillmentById` | `queryKeys.fulfillments.detail` | Consulta detalle técnico de despacho y número de guía (`GET /api/logistics/fulfillment/{id}`). |
| **`useCreateFulfillmentMutation`**| `ZentricApiPort.createFulfillment` | Invalida `queryKeys.fulfillments.all`| Crea manualmente una orden logística en estado `PendingPack`. |
| **`usePackFulfillmentMutation`**| `ZentricApiPort.packFulfillment` | Invalida `queryKeys.fulfillments.all`| Registra el empaque físico (`PendingPack` $\rightarrow$ `Packed`). |
| **`useDispatchFulfillmentMutation`**| `ZentricApiPort.dispatchFulfillment` | Invalida `fulfillments` e `inventories`| Asigna transportadora/guía y marca salida (`Packed` $\rightarrow$ `Dispatched`). |
| **`useDeliverFulfillmentMutation`**| `ZentricApiPort.deliverFulfillment` | Invalida `fulfillments` y `orders` | Certifica la entrega física (`Dispatched` $\rightarrow$ `Delivered`). **Exclusivo Operador Logístico**. |
| **`useCancelGhostStockMutation`**| `ZentricApiPort.cancelGhostStock` | Invalida `fulfillments`, `orders`, `returns`| Cancela despacho por faltante físico (*stock fantasma*), libera reservas y genera reembolso automático. |

---

### 3.6 Devoluciones, Garantías y Reembolsos (`returns.ts`)
Implementa la segregación de funciones en postventa ([ADR-0006](../backendSDD/Adr/0006-resolucion-contradiccion-ley-addendum.md) y [ADR-0018](../backendSDD/Adr/0018-devoluciones-confianza-recepcion-responsabilidad.md)):

| Hook / Servicio | Método del Puerto | Invalidación / Efecto | Responsabilidad Técnica |
|---|---|---|---|
| **`useReturnsQuery`** | `ZentricApiPort.listReturns` | `queryKeys.returns.list(status)` | Lista solicitudes de devolución filtradas por rol (`GET /api/returns`). |
| **`useReturnQuery`** | `ZentricApiPort.getReturnById` | `queryKeys.returns.detail(id)` | Obtiene el expediente completo de una devolución (`GET /api/returns/{id}`). |
| **`useRequestReturnMutation`**| `ZentricApiPort.requestReturn` | Invalida `queryKeys.returns.all` | Radica solicitud de devolución sobre producto físico entregado (`POST /api/returns/request`). |
| **`useInspectReturnMutation`**| `ZentricApiPort.inspectReturn` | Invalida `queryKeys.returns.all` | Registra el dictamen físico en bodega (`POST /api/returns/{id}/inspect`). Exclusivo Operador Logístico. |
| **`useApproveReturnMutation`**| `ZentricApiPort.approveReturn` | Invalida `returns` e `inventories` | Aprueba comercialmente la devolución y reingresa stock como `Used`. **Exclusivo Vendedor dueño**. |
| **`useRejectReturnMutation`** | `ZentricApiPort.rejectReturn` | Invalida `queryKeys.returns.all` | Rechaza comercialmente la devolución (`POST /api/returns/{id}/reject`). **Exclusivo Vendedor dueño**. |
| **`useRefundReturnMutation`** | `ZentricApiPort.refundReturn` | Invalida `queryKeys.returns.all` | Ejecuta el reembolso monetario al comprador (`POST /api/returns/{id}/refund`). **Exclusivo Administrador**. |

---

### 3.7 Facturación Split y Salud (`billing.ts`, `transversal.ts`)
Emisión y anulación de los tres documentos contables ([ADR-0023](../backendSDD/Adr/0023-split-de-pagos-documentos-no-transferencias.md)):

| Hook / Servicio | Método del Puerto | Invalidación / Efecto | Responsabilidad Técnica |
|---|---|---|---|
| **`useInvoicesQuery`** | `ZentricApiPort.listInvoices` | `queryKeys.invoices.list()` | Lista comprobantes emitidos según el rol (`GET /api/billing/invoices`). |
| **`useInvoicesByOrderQuery`** | `ZentricApiPort.getInvoicesByOrder` | `queryKeys.invoices.byOrder(orderId)`| Consulta las facturas vinculadas a un pedido pagado (`GET /api/billing/invoices/order/{orderId}`). |
| **`useGenerateInvoicesMutation`**| `ZentricApiPort.generateInvoices` | Invalida `queryKeys.invoices.all` | Emite Factura Maestra, Detalle Zentric y Facturas de Vendedor (`POST /api/billing/invoices/generate/{orderId}`). Exclusivo Administrador. |
| **`useAnnulInvoicesMutation`**| `ZentricApiPort.annulInvoices` | Invalida `queryKeys.invoices.all` | Anula formalmente la Factura Maestra con motivo obligatorio (`POST /api/billing/invoices/annul/{orderId}`). Exclusivo Administrador. |
| **`useHealthQuery`** | `ZentricApiPort.getHealth` | `queryKeys.health` | Consulta el estado operativo del servidor y PostgreSQL (`GET /health`). |

---

## 4. Reglas Puras de Presentación (`domain/rules/presentation.ts`)

Funciones deterministas puras en TypeScript que determinan qué acciones ofrece la interfaz sin suplantar la autoridad del backend:

```typescript
// domain/rules/presentation.ts
import { OrderStatus, ProductType } from '../enums';

// ZENTRIC.md Dominio 6 y backendSDD/Domain/07-lifecycle.md:
// Un pedido en estado Paid, Dispatched, Delivered o Cancelled es inmutable.
export function isOrderModifiable(status: OrderStatus): boolean {
  return status === OrderStatus.Cart || status === OrderStatus.PendingPayment;
}

// ZENTRIC.md Dominio 10 (ADDENDUM):
// Queda estrictamente prohibido solicitar devoluciones sobre productos digitales.
export function isReturnAllowed(productType: ProductType): boolean {
  return productType === ProductType.Physical;
}
```

---

## 5. Catálogo de Esquemas Zod (`application/schemas/`)

Cada formulario valida su entrada con un esquema Zod tipado en inglés que replica los validadores FluentValidation del servidor y serializa enumeraciones por nombre ([ADR-0012](../backendSDD/Adr/0012-contrato-json-de-los-enum-por-nombre.md)):

```typescript
// application/schemas/index.ts
import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().trim().email('Debe ingresar un correo electrónico válido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

export const CreateProductSchema = z
  .object({
    name: z.string().trim().min(3, 'El nombre requiere al menos 3 caracteres').max(200),
    description: z.string().trim().min(1, 'La descripción es obligatoria').max(2000),
    priceAmount: z.number().positive('El precio debe ser mayor que cero'),
    priceCurrency: z.string().trim().length(3, 'La moneda debe ser un código ISO de 3 letras'),
    type: z.enum(['Physical', 'Digital']),
    weightInKg: z.number().nonnegative(),
    lengthInCm: z.number().nonnegative(),
    widthInCm: z.number().nonnegative(),
    heightInCm: z.number().nonnegative(),
    variants: z.array(
      z.object({
        sku: z.string().trim().min(1, 'El código SKU es obligatorio'),
        attributes: z.string().trim().min(1, 'Los atributos de la variante son obligatorios'),
      }),
    ),
  })
  .refine((data) => data.type !== 'Physical' || data.variants.length > 0, {
    message: 'Un producto físico exige registrar al menos una variante con SKU (ADR-0003)',
    path: ['variants'],
  });
```
