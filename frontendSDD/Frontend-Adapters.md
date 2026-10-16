# Frontend-Adapters — Adaptadores de Infraestructura y Red

> Mapeo exhaustivo del adaptador HTTP del cliente contra la API REST oficial de Zentric (`Zentric.Api`).  
> **Fuente de verdad canónica del contrato:** [`../backendSDD/Presentation/01-endpoints.md`](../backendSDD/Presentation/01-endpoints.md), el manifiesto OpenAPI vivo (`GET /swagger/v1/swagger.json`) y los Registros de Decisiones de Arquitectura (ADR-0009, ADR-0012, ADR-0017, ADR-0021).  
> **Cobertura contractual:** La API publica actualmente **44 endpoints de negocio + 1 sonda técnica `/health` (45 endpoints en total)**.

---

## 1. Monopolio de Red y Configuración del Adaptador (`HttpClient.ts`)

En cumplimiento de la regla de separación de capas de la Arquitectura Hexagonal, el adaptador HTTP implementa un **monopolio absoluto de red**:

> [!IMPORTANT]
> **Regla de Monopolio de Red:** Queda estrictamente prohibido invocar `fetch()`, `axios` o cualquier cliente de red nativo desde componentes de UI, hooks de React, esquemas o servicios de dominio. Todas las peticiones HTTP del sistema se originan exclusivamente a través del singleton tipado `HttpClient.ts` ubicado en `apps/frontend/src/adapters/http/HttpClient.ts`.

### 1.1 Parámetros de Configuración del Cliente

| Aspecto | Definición Técnica | Origen / Justificación |
|---|---|---|
| **URL Base** | `import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5076'` | Configurable por variable de entorno para entornos Docker, CI y local. |
| **Cabeceras Fijas** | `Accept: application/json`<br>`Content-Type: application/json` | Contrato JSON estricto en ambos sentidos. |
| **Autenticación** | `Authorization: Bearer {token}` | Token JWT emitido por `POST /api/auth/login`. Inyectado dinámicamente desde `MemorySessionAdapter`. |
| **Prohibición de Cabeceras Forjables** | Prohibido enviar `X-Buyer-Id` | La identidad se extrae en el servidor del claim `sub` del JWT (Decisión de seguridad formalizada en [ADR-0009](../backendSDD/Adr/0009-autenticacion-jwt-rg01.md)). |
| **Tiempo Límite (*Timeout*)** | 15 segundos mediante señal `AbortSignal.timeout(15000)` | Previene bloqueos indefinidos en llamadas de red lentas o desconexiones. |
| **Política de Reintentos** | Máximo 1 reintento automático exclusivamente ante errores de red o códigos `5xx` en operaciones idempotentes (GET). Prohibido reintentar en códigos `4xx` o comandos de pago/checkout. | Evita duplicidad de transacciones financieras o estados inconsistentes. |

---

## 2. Inventario Canónico de Endpoints (45 Endpoints)

Leyenda de verificación: `VERIFIED` (auditado contra código C# de controladores y pruebas de integración) · Todos los métodos pertenecen a la interfaz unificada `ZentricApiPort` (`domain/ports/ZentricApiPort.ts`).

### 2.1 Módulo 0: Autenticación e Identidad (`/api/auth`)

| Método | Ruta | Método en `ZentricApiPort` | Estado | Descripción de Contrato |
|---|---|---|:---:|---|
| `POST` | `/api/auth/login` | `ZentricApiPort.login` | `VERIFIED` | Autentica credenciales (email y contraseña PBKDF2), emite JWT de 60 min. Acceso anónimo permitido. |
| `GET` | `/api/auth/me` | `ZentricApiPort.getCurrentUser` | `VERIFIED` | Resuelve la identidad, rol y reclamos (*claims*) del usuario autenticado a partir del token JWT activo. |

### 2.2 Módulo 1: Usuarios y Gestión de Acceso (`/api/users`)

| Método | Ruta | Método en `ZentricApiPort` | Estado | Descripción de Contrato |
|---|---|---|:---:|---|
| `POST` | `/api/users` | `ZentricApiPort.createUser` | `VERIFIED` | Registra usuario. Acceso anónimo permitido sólo para `role = "Buyer"`. Exige token de Administrador para otros roles. Retorna `Guid` en texto plano JSON. |
| `GET` | `/api/users` | `ZentricApiPort.listUsers` | `VERIFIED` | Lista usuarios registrados con filtro opcional por rol (`role?`). Exige rol Administrador o Supervisor. |
| `GET` | `/api/users/{id}` | `ZentricApiPort.getUserById` | `VERIFIED` | Consulta detalle técnico y estado de un usuario por su ID. |
| `POST` | `/api/users/{id}/block` | `ZentricApiPort.blockUser` | `VERIFIED` | Bloquea el acceso de un usuario. Exclusivo para Administrador. |
| `POST` | `/api/users/{id}/activate` | `ZentricApiPort.activateUser` | `VERIFIED` | Reactiva un usuario bloqueado. Exclusivo para Administrador. |

### 2.3 Módulo 2: Bodegas y Centros de Almacenamiento (`/api/warehouses`)

| Método | Ruta | Método en `ZentricApiPort` | Estado | Descripción de Contrato |
|---|---|---|:---:|---|
| `POST` | `/api/warehouses` | `ZentricApiPort.createWarehouse` | `VERIFIED` | Registra una nueva bodega física especificando nombre, ubicación, capacidad ($m^3$) y tipo (`Zentric` o `Vendor`). Retorna `Guid`. |
| `GET` | `/api/warehouses` | `ZentricApiPort.listWarehouses` | `VERIFIED` | Lista bodegas activas con filtro opcional por vendedor (`vendorId?`). |
| `GET` | `/api/warehouses/{id}` | `ZentricApiPort.getWarehouseById` | `VERIFIED` | Consulta ficha técnica y capacidad volumétrica de una bodega específica. |

### 2.4 Módulo 3: Inventarios y Control de Stock (`/api/inventories`)

| Método | Ruta | Método en `ZentricApiPort` | Estado | Descripción de Contrato |
|---|---|---|:---:|---|
| `POST` | `/api/inventories/stock` | `ZentricApiPort.addStock` | `VERIFIED` | Ingresa existencias clasificando unidades entre nuevas o reacondicionadas (`isUsed`). Retorna `Guid`. |
| `GET` | `/api/inventories` | `ZentricApiPort.listInventories` | `VERIFIED` | Lista existencias con aislamiento forzado por rol (vendedor ve solo su stock; admin/operador ven consolidado). |
| `GET` | `/api/inventories/{variantId}` | `ZentricApiPort.listInventoryByVariant` | `VERIFIED` | Consulta existencias distribuidas por bodega para una variante (disponible, reservado, usado, dañado). |
| `POST` | `/api/inventories/{id}/adjust` | `ZentricApiPort.adjustInventory` | `VERIFIED` | Registra ajuste por conteo físico en bodega. Solo disminuye unidades disponibles. Exclusivo Administrador y Supervisor. |

### 2.5 Módulo 4: Catálogo de Productos (`/api/catalog`)

| Método | Ruta | Método en `ZentricApiPort` | Estado | Descripción de Contrato |
|---|---|---|:---:|---|
| `POST` | `/api/catalog/products` | `ZentricApiPort.createProduct` | `VERIFIED` | Da de alta producto con precio y variantes. Retorna `CreatedProductDto` (`{ productId, variantIds }`). Exclusivo Vendedor. |
| `POST` | `/api/catalog/products/{productId}/publish` | `ZentricApiPort.publishProduct` | `VERIFIED` | Reactiva producto suspendido a estado publicado (`Published`). Retorna `200 OK` vacío. |
| `POST` | `/api/catalog/products/{productId}/suspend` | `ZentricApiPort.suspendProduct` | `VERIFIED` | Suspende producto, ocultándolo de búsquedas públicas y carritos. Retorna `200 OK` vacío. |
| `GET` | `/api/catalog/products` | `ZentricApiPort.listProducts` | `VERIFIED` | Catálogo de productos. Público ve `Published`; vendedor ve propios (incluidos suspendidos). |
| `GET` | `/api/catalog/products/paged` | `ZentricApiPort.listProductsPaged` | `VERIFIED` | Versión paginada con metadatos `PagedResult<ProductDto>` (`items`, `page`, `size`, `totalItems`, `totalPages`). |
| `GET` | `/api/catalog/products/{id}` | `ZentricApiPort.getProductById` | `VERIFIED` | Ficha técnica completa de producto por ID. |

### 2.6 Módulo 5: Carrito y Pedidos de Compra (`/api/orders`)

| Método | Ruta | Método en `ZentricApiPort` | Estado | Descripción de Contrato |
|---|---|---|:---:|---|
| `POST` | `/api/orders/cart` | `ZentricApiPort.createCart` | `VERIFIED` | Crea pedido en estado `Cart` vinculado al comprador autenticado. Retorna `Guid`. |
| `POST` | `/api/orders/cart/items` | `ZentricApiPort.addCartItem` | `VERIFIED` | Agrega variante al carrito y congela precio unitario. Retorna `200 OK` vacío. |
| `POST` | `/api/orders/{orderId}/checkout` | `ZentricApiPort.checkoutOrder` | `VERIFIED` | Cierra carrito, reserva stock en bodegas, inicia temporizador de 15 min. Retorna `200 OK` vacío. |
| `POST` | `/api/orders/{orderId}/pay` | `ZentricApiPort.payOrder` | `VERIFIED` | Procesa pago, consolida reserva y transiciona pedido a `Paid`. Retorna `200 OK` vacío. |
| `GET` | `/api/orders` | `ZentricApiPort.listOrders` | `VERIFIED` | Lista pedidos con aislamiento por rol (comprador ve compras; vendedor ve líneas propias; admin ve todo). |
| `GET` | `/api/orders/{id}` | `ZentricApiPort.getOrderById` | `VERIFIED` | Detalle de pedido. Vendedor recibe `SellerOrderViewDto`; comprador y admin reciben `OrderDto` consolidado. |

### 2.7 Módulo 6: Logística y Órdenes de Despacho (`/api/logistics`)

| Método | Ruta | Método en `ZentricApiPort` | Estado | Descripción de Contrato |
|---|---|---|:---:|---|
| `POST` | `/api/logistics/fulfillment` | `ZentricApiPort.createFulfillment` | `VERIFIED` | Crea orden manual de despacho para bodega y vendedor específicos. Retorna `Guid`. |
| `POST` | `/api/logistics/fulfillment/{id}/pack` | `ZentricApiPort.packFulfillment` | `VERIFIED` | Transiciona orden a `Packed`. Operador puede empacar cualquiera; vendedor solo propias. Retorna `200 OK` vacío. |
| `POST` | `/api/logistics/fulfillment/{id}/dispatch` | `ZentricApiPort.dispatchFulfillment` | `VERIFIED` | Marca como `Dispatched`, asigna transportadora y tracking, descuenta stock definitivamente. Retorna `200 OK` vacío. |
| `POST` | `/api/logistics/fulfillment/{id}/deliver` | `ZentricApiPort.deliverFulfillment` | `VERIFIED` | Certifica entrega física (`Delivered`). **Exclusivo Operador Logístico**; prohibido al vendedor. Retorna `200 OK` vacío. |
| `POST` | `/api/logistics/fulfillment/cancel-ghost-stock` | `ZentricApiPort.cancelGhostStock` | `VERIFIED` | Reporta faltante físico no detectado (*stock fantasma*). Cancela orden y genera reembolso automático. Retorna `Guid`. |
| `GET` | `/api/logistics/fulfillments` | `ZentricApiPort.listFulfillments` | `VERIFIED` | Lista despachos con filtro de rol y estado (`status?`). Nota: pluralizado formalmente en [ADR-0017](../backendSDD/Adr/0017-listados-de-recurso-propio.md). |
| `GET` | `/api/logistics/fulfillment/{id}` | `ZentricApiPort.getFulfillmentById` | `VERIFIED` | Ficha técnica de despacho, paquetes, transportadora y guía. |

### 2.8 Módulo 7: Devoluciones y Garantías (`/api/returns`)

| Método | Ruta | Método en `ZentricApiPort` | Estado | Descripción de Contrato |
|---|---|---|:---:|---|
| `POST` | `/api/returns/request` | `ZentricApiPort.requestReturn` | `VERIFIED` | Radica devolución de producto entregado dentro de plazo de garantía. Retorna `Guid`. |
| `POST` | `/api/returns/{id}/inspect` | `ZentricApiPort.inspectReturn` | `VERIFIED` | Registra dictamen técnico en bodega (buen estado o dañado). Operador u Vendedor según bodega. Retorna `200 OK` vacío. |
| `POST` | `/api/returns/{id}/approve` | `ZentricApiPort.approveReturn` | `VERIFIED` | Aprueba comercialmente devolución y reingresa stock como usado. **Exclusivo Vendedor dueño**. Retorna `200 OK` vacío. |
| `POST` | `/api/returns/{id}/reject` | `ZentricApiPort.rejectReturn` | `VERIFIED` | Rechaza solicitud de devolución. **Exclusivo Vendedor dueño**. Retorna `200 OK` vacío. |
| `POST` | `/api/returns/{id}/refund` | `ZentricApiPort.refundReturn` | `VERIFIED` | Liquida y acredita reembolso financiero de devolución aprobada. **Exclusivo Administrador**. Retorna `200 OK` vacío. |
| `GET` | `/api/returns` | `ZentricApiPort.listReturns` | `VERIFIED` | Lista devoluciones con filtro por estado y aislamiento estricto por rol. |
| `GET` | `/api/returns/{id}` | `ZentricApiPort.getReturnById` | `VERIFIED` | Expediente completo de devolución con dictámenes técnicos y resoluciones. |

### 2.9 Módulo 8: Facturación y Liquidación Tributaria (`/api/billing`)

| Método | Ruta | Método en `ZentricApiPort` | Estado | Descripción de Contrato |
|---|---|---|:---:|---|
| `POST` | `/api/billing/invoices/generate/{orderId}` | `ZentricApiPort.generateInvoices` | `VERIFIED` | Emite Factura Maestra consolidada para comprador, comisión para Zentric y facturas para vendedores. **Exclusivo Administrador**. Retorna `200 OK (bool)`. |
| `POST` | `/api/billing/invoices/annul/{orderId}` | `ZentricApiPort.annulInvoices` | `VERIFIED` | Anula formalmente la Factura Maestra ante reversión de pago post-recaudo. **Exclusivo Administrador**. Retorna `200 OK` vacío. |
| `GET` | `/api/billing/invoices` | `ZentricApiPort.listInvoices` | `VERIFIED` | Lista facturas con aislamiento por rol (vendedor ve solo `VendorDetail`; admin/supervisor ven todo; operador logístico denegado). |
| `GET` | `/api/billing/invoices/order/{orderId}` | `ZentricApiPort.getInvoicesByOrder` | `VERIFIED` | Consulta comprobantes fiscales vinculados a un pedido pagado. |

### 2.10 Módulo 9: Infraestructura y Disponibilidad (`/health`)

| Método | Ruta | Método en `ZentricApiPort` | Estado | Descripción de Contrato |
|---|---|---|:---:|---|
| `GET` | `/health` | `ZentricApiPort.getHealth` | `VERIFIED` | Sonda de salud técnica de la API y conectividad con PostgreSQL. Acceso anónimo permitido. |

---

## 3. Transformaciones Obligatorias de Datos en el Adaptador

### 3.1 Desenvolvimiento de Respuestas con Identificador `Guid`
Los comandos de creación en la API REST de Zentric devuelven el identificador generado como una cadena JSON cruda (ej. `"3de3d5d4-7292-491b-85d0-999d3000b080"`). El adaptador HTTP desenvuelve esta respuesta mediante la función utilitaria `readGuid`:

```ts
export async function readGuid(response: Response): Promise<string> {
  const rawText = await response.text();
  try {
    return JSON.parse(rawText) as string;
  } catch {
    return rawText.replace(/^"|"$/g, '');
  }
}
```

*Endpoints que usan `readGuid`:* `createUser`, `createWarehouse`, `addStock`, `createCart`, `createFulfillment`, `cancelGhostStock`, `requestReturn`.  
*Excepción documentada:* `createProduct` retorna un objeto estructurado `CreatedProductDto` (`{ productId: string, variantIds: string[] }`) en lugar de un Guid crudo, por lo que el adaptador parsea el JSON completo.

### 3.2 Contrato Estricto de Enumeraciones como Cadenas de Texto (ADR-0012)
El backend de Zentric **solo acepta los nombres canónicos de los enums en formato string** (ej. `"Seller"`, `"Physical"`, `"Vendor"`). El envío de enteros numéricos produce un fallo inmediato `400 Bad Request`.  
Las constantes del frontend se tipan estrictamente como literales de cadena:

```ts
export const UserRole = {
  Buyer: 'Buyer',
  Seller: 'Seller',
  Administrator: 'Administrator',
  Supervisor: 'Supervisor',
  LogisticsOperator: 'LogisticsOperator',
} as const;

export const OrderStatus = {
  Cart: 'Cart',
  PendingPayment: 'PendingPayment',
  Paid: 'Paid',
  Dispatched: 'Dispatched',
  Delivered: 'Delivered',
  Cancelled: 'Cancelled',
} as const;
```

### 3.3 Resolución Obligatoria de `variantId` frente a `productId`
En el modelo de datos de Zentric, un `Product` es una entidad contenedora del catálogo, mientras que las operaciones de inventario, adición al carrito de compras y despacho se ejecutan **exclusivamente a nivel de `variantId`**.  
El flujo del adaptador garantiza la resolución obligatoria:

```text
1. POST /api/catalog/products               -> Retorna CreatedProductDto con { productId, variantIds }
2. Para inventarios y carrito de compras     -> Utilizar siempre variantIds[0] (o la variante seleccionada)
3. Prohibido intentar agregar productId      -> Evita fallo de clave foránea en la API
```

### 3.4 Manejo y Normalización de Errores RFC 7807 y RFC 9457
La API emite errores de validación y de negocio bajo el estándar Problem Details. El adaptador traduce ambas variantes a un error estructurado de dominio:

```ts
export interface NormalizedHttpError {
  status: number;
  title: string;
  detail: string;
  traceId?: string;
  validationErrors?: Record<string, string[]>;
}

export async function parseProblemDetails(response: Response): Promise<NormalizedHttpError> {
  const contentType = response.headers.get('content-type') ?? '';
  let payload: any = {};
  
  if (contentType.includes('json')) {
    try {
      payload = await response.json();
    } catch {
      payload = {};
    }
  }

  const detail = payload.detail 
    ?? payload.title 
    ?? (payload.errors ? Object.values(payload.errors).flat().join('. ') : `Error HTTP ${response.status}`);

  return {
    status: response.status,
    title: payload.title ?? `Error ${response.status}`,
    detail,
    traceId: payload.traceId,
    validationErrors: payload.errors,
  };
}
```

### 3.5 Comandos con Respuesta `200 OK` Vacía
Los comandos de transición de estado (`checkout`, `pay`, `pack`, `dispatch`, `deliver`, `publish`, `suspend`, `inspect`, `approve`, `reject`, `refund`, `annul`) responden `200 OK` sin cuerpo (`void`). El adaptador no sintetiza valores booleanos ficticios; la UI revalida el estado actualizado mediante la consulta correspondiente (`getOrderById`, `getProductById`, `getReturnById`).

---

## 4. Gestión de Sesión Volátil en Memoria (`MemorySessionAdapter.ts`)

Conforme a la política de seguridad establecida en **[ADR-0009](../backendSDD/Adr/0009-autenticacion-jwt-rg01.md)** y ratificada por la dirección de arquitectura:

> [!WARNING]
> **Prohibición de Persistencia en Disco / Web Storage:** Queda terminantemente prohibido almacenar tokens Bearer JWT en `localStorage`, `sessionStorage` o cookies legibles por JavaScript. El token de sesión reside **exclusivamente en memoria RAM** en el singleton `MemorySessionAdapter.ts` (`apps/frontend/src/adapters/session/MemorySessionAdapter.ts`).

### 4.1 Ciclo de Vida y Políticas de Sesión

1. **Vigencia del Token:** 60 minutos calculados por el servidor.
2. **Ausencia de Token de Refresco (*No Refresh Token*):** En estricta alineación con el backend (donde `POST /api/auth/refresh` no existe), no se implementan interceptores de renovación automática.
3. **Comportamiento ante Recarga:** Al recargar el navegador (`F5`), el token en memoria se purga y el usuario debe reautenticarse.
4. **Respuesta ante `401 Unauthorized` (Fail-Closed):** Cualquier llamada de red rechazada con `401` ejecuta inmediatamente la purga de la sesión en memoria y desvía al usuario a `/login` con un aviso de expiración de sesión.
5. **Respuesta ante `403 Forbidden`:** Muestra una notificación de permisos insuficientes sin cerrar la sesión del usuario.
6. **Sincronización de Identidad (`GET /api/auth/me`):** Lee las declaraciones activas del token en memoria para inicializar el perfil de usuario sin mutar la base de datos.

---

## 5. Puerto y Adaptador de Alertas y Notificaciones (`AlertPort`)

El sistema desacopla la lógica de solicitud de notificaciones y diálogos de confirmación de su representación visual mediante dos piezas arquitectónicas:

| Componente | Capa / Ubicación | Responsabilidad |
|---|---|---|
| `AlertAdapter` | `adapters/alert/AlertAdapter.ts` | Mantiene la cola de solicitudes en memoria y resuelve promesas asíncronas (`confirm`, `show`). Código TypeScript puro sin JSX ni dependencias de React. |
| `AlertHost` | `components/alert/AlertHost.tsx` | Componente de UI montado en la raíz de la aplicación (`App.tsx` o `main.tsx`). Escucha los eventos de `AlertAdapter` y renderiza los componentes `AlertDialog` y `Toaster` del Design System. |

### 5.1 Reglas para Diálogos de Confirmación
Es obligatorio invocar `AlertPort.confirm()` antes de ejecutar las siguientes operaciones:
- Confirmación de pago de orden (`POST /api/orders/{id}/pay`).
- Cancelación por stock fantasma (`POST /api/logistics/fulfillment/cancel-ghost-stock`).
- Anulación fiscal de facturas (`POST /api/billing/invoices/annul/{orderId}`).
- Acreditación de reembolso (`POST /api/returns/{id}/refund`).
- Bloqueo o activación de usuarios (`POST /api/users/{id}/block`, `/activate`).

---

## 6. Historial de Decisiones Arquitectónicas del Adaptador

| Referencia de Decisión | Situación Contractual Previa | Resolución Formalizada |
|---|---|---|
| **[ADR-0009](../backendSDD/Adr/0009-autenticacion-jwt-rg01.md)** | Cabecera insegura `X-Buyer-Id` y ausencia de autenticación centralizada. | Implementación de `POST /api/auth/login` con emisión de JWT HS256 (60 min) y almacenamiento exclusivo en memoria RAM. Eliminación definitiva de `X-Buyer-Id`. |
| **[ADR-0012](../backendSDD/Adr/0012-contrato-json-de-los-enum-por-nombre.md)** | Inconsistencia de tipos numéricos vs texto en serializadores de enums. | Normalización estricta: los JSON de solicitud y respuesta solo aceptan nombres canónicos de enumeradores en formato string. |
| **[ADR-0017](../backendSDD/Adr/0017-listados-de-recurso-propio.md)** | Endpoints de consulta no disponibles para listados de pedidos y logística, ni retorno de variantes al crear productos. | Creación de `GET /api/orders` y `GET /api/logistics/fulfillments` (en plural) con filtrado por rol, y retorno de `CreatedProductDto` (`{ productId, variantIds }`) en `POST /api/catalog/products`. |
| **[ADR-0021](../backendSDD/Adr/0021-ajuste-de-stock-sin-cuello-de-botella.md)** | Ajuste de existencias físicas en almacén sin contención global. | `POST /api/inventories/{id}/adjust` registra el ajuste por conteo físico retornando `AdjustInventoryResult` con cantidades previas y nuevas. |
