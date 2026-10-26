# Zentric — Especificación del Dominio del Negocio (SDD)

**Versión:** 1.0
**Propósito:** establecer una descripción funcional detallada del negocio, sus entidades, objetos de valor, reglas e interacciones, como base para diseñar una arquitectura orientada al dominio (DDD).
**Fuente funcional:** *Especificación Funcional: Zentric* (ZENTRIC.md) suministrada para este proyecto, incluyendo ADR-0001 a ADR-0025 y Addendums dictados por Owner 2026-10-03 y 2026-10-17.

> **Criterio de lectura:** este documento desarrolla y organiza los requisitos presentes en la especificación fuente. Cuando un dato, regla o comportamiento no está definido allí, se marca como **Pendiente de definición de negocio**. Las propuestas de modelado DDD se presentan como recomendaciones de diseño y no como requisitos ya aprobados.

----------------------------------------------------------------------

## 1. Visión del negocio

Zentric es una plataforma digital centralizada que actúa como intermediario comercial entre compradores y vendedores. Coordina el ciclo de negocio desde la incorporación de vendedores y la publicación de productos hasta la compra, el inventario, la facturación, la logística y la posventa.

El marketplace comercializa productos de terceros. La operación está coordinada por la plataforma y participan compradores, vendedores, operadores logísticos, administradores y supervisores. Cada participante tiene un único rol y solo debe interactuar con la información correspondiente a sus responsabilidades.

### 1.1 Objetivos funcionales

| Código   | Objetivo                                                                 |
|----------|--------------------------------------------------------------------------|
| OBJ-01   | Administrar la información de todos los usuarios del marketplace.       |
| OBJ-02   | Gestionar el registro y administración de vendedores.                   |
| OBJ-03   | Administrar compradores registrados.                                     |
| OBJ-04   | Controlar la información de las bodegas.                                |
| OBJ-05   | Gestionar el catálogo de productos.                                     |
| OBJ-06   | Administrar el inventario distribuido.                                  |
| OBJ-07   | Gestionar el carrito de compras.                                        |
| OBJ-08   | Controlar el ciclo completo de los pedidos.                             |
| OBJ-09   | Administrar la facturación de las compras.                              |
| OBJ-10   | Gestionar los procesos logísticos.                                      |
| OBJ-11   | Administrar devoluciones y reembolsos.                                  |
| OBJ-12   | Consolidar información administrativa para consulta.                    |

### 1.2 Alcance funcional

Incluye registro y administración de usuarios, registro administrativo de vendedores, compradores, bodegas, catálogo, inventario, carrito, pedidos, facturación, envíos, devoluciones, reembolsos y reportes administrativos.

Quedan fuera del alcance explícito de la especificación: interfaces gráficas, aplicaciones móviles, portales web, mecanismos de autenticación técnica, tecnologías de implementación, arquitectura del software ni detalles relacionados con el almacenamiento de la información.

### 1.3 Participantes y roles

| Rol                 | Descripción                                                                 |
|---------------------|-----------------------------------------------------------------------------|
| **Buyer (Comprador)** | Usuario final que descubre, evalúa y compra productos.                     |
| **Seller (Vendedor)** | Responsable de comercializar productos; gestiona catálogo, inventario y pedidos propios. |
| **Logistics Operator** | Ejecuta preparación, despacho y confirmación de entrega de órdenes logísticas. |
| **Administrator**   | Gobierna la plataforma: usuarios, vendedores, bodegas centrales, configuración y políticas. |
| **Supervisor**      | Consulta métricas agregadas, auditoría 360°, libro mayor, fiscalización.  |

Cada usuario tiene un **único rol principal**. `Buyer` y `Seller` son **entidades de negocio distintas de `User`**, relacionadas con este, no subclases de `User`. El backend valida tanto el rol como la propiedad y el alcance del recurso en cada operación.
----------------------------------------------------------------------

## 2. Modelo de dominio (entidades, value objects, agregados)

### 2.1 Entidades principales
#### Product (Producto)
- **Campos**: `Id`, `VendorId`, `Name`, `Description`, `Price` (Money), `Type` (ProductType: `Physical` | `Digital`), `Status` (ProductStatus: `Draft` | `Published` | `Suspended` | `Discontinued`), `ImageUrl?`, `Category?`, `CreatedAt`, `UpdatedAt`, `DeletedAt`.
- **Reglas (ADR-0003, Addendum 2026-10-17)**:
  - Producto **Physical** → exige al menos una `ProductVariant` viva.
  - Producto **Digital** → puede nacer sin variantes (CAT-02: sin logística ni inventario).
  - `CanBeSold` = `Published` && !`IsDeleted` && (`Digital` || `HasSellableVariant`).
  - Estados: `Draft → Published → Suspended/Discontinued`. `Delete()` marca `Discontinued` + soft delete. `Restore()` → `Published`.
  - `Category` e `ImageUrl` opcionales (Addendum 2026-10-17: soporte visual de catálogo).

#### ProductVariant (Variante de producto)
- **Identidad**: `Id` = **VariantId** (clave de inventario / SKU).
- **Campos**: `Id`, `ProductId`, `Sku` (único, uppercase), `PriceAmount?` (override de precio), `IsActive`, `Attributes` (lista de `VariantAttribute`: Name+Value), `CreatedAt`, `UpdatedAt`, `DeletedAt`.
- **Reglas**:
  - Al menos un atributo obligatorio.
  - Nombres de atributo únicos por variante (case-insensitive).
  - `CanBeSold` = `IsActive` && !`IsDeleted`.
  - SKU es la clave natural de inventario (ADR-0002).

#### CustomerOrder (Pedido / Carrito)
- **Estados** (OrderStatus): `Cart` → `PendingPayment` → `Paid` → `Dispatched` → `Delivered` | `Cancelled`.
- **Campos**: `Id`, `BuyerId`, `Status`, `CreatedAt`, `UpdatedAt`, `CheckoutStartedAt?`, `CancellationCause?`, `CancellationReason?`, `Items` (OrderItem), `DigitalDeliveries`.
- **Reglas (Dominio 7, ADR-0004, ADR-0022)**:
  - `Cart`: estado inicial. `Checkout()` → `PendingPayment` + `CheckoutStartedAt = now` + reserva atómica de stock (15 min).
  - `PendingPayment`: ventana de 15 min. Expiración → `CheckoutTimeoutService` cancela (`Cancelled` + `CancellationCause = Expired`), libera reserva.
  - `Paid`: pago confirmado → inicia preparación. Contenido inmutable.
  - `Dispatched`: al menos un `FulfillmentOrder` despachado.
  - `Delivered`: todos los `FulfillmentOrder` entregados.
  - `Cancelled`: causes: `Expired`, `PaymentFailed`, `StockBreak`, `BuyerRequested`, `FullyResolved` (ADR-0022).
  - **Regla SSoT**: Pedido `Delivered` o `Cancelled` **no se modifica bajo ninguna circunstancia**.
  - **ADR-0004/0006/0022**: Cancelación por quiebre de stock fantasma → cancela **solo el despacho afectado** (porción de un vendedor), no el pedido completo. Desencadena devolución parcial de líneas afectadas; resto continúa. Pedido completo solo termina `Anulado` (Addendum 2026-10-03: estado 6 `Anulado` = expira reserva sin concretar pago).

#### FulfillmentOrder (Orden logística de despacho)
- **Estados** (FulfillmentStatus): `PendingPacking` → `Packed` → `Dispatched` → `Delivered` | `Cancelled`.
- **Campos**: `Id`, `CustomerOrderId`, `VendorId`, `WarehouseId`, `CarrierId?`, `TrackingNumber?`, `Status`, `Items` (FulfillmentItem), `CreatedAt`, `UpdatedAt`, `PackedAt?`, `DispatchedAt?`, `DeliveredAt?`, `CancelledAt?`, `CancellationCause?`.
- **Reglas (ADR-0004, Dominio 8)**:
  - Subdivisión de `CustomerOrder` por vendedor y bodega de origen.
  - `Pack()` → `Packed` (requerido antes de `Dispatch()`).
  - `Dispatch(carrier, tracking)` → `Dispatched`.
  - `Deliver()` → `Delivered`.
  - Cancelación parcial por quiebre de stock (ADR-0008, ADR-0022).

#### Shipment (Guía de envío)
- **Campos**: `Id`, `FulfillmentOrderId`, `CarrierId`, `TrackingNumber`, `LabelUrl?`, `Status`, `CreatedAt`, `UpdatedAt`.
- **Regla**: Una guía por bodega de origen (ADR-0008).

#### Inventory (Inventario / Existencias)
- **Clave compuesta**: `VariantId` + `WarehouseId` (ADR-0002).
- **Campos**: `Id`, `VariantId`, `WarehouseId`, `AvailableQuantity`, `ReservedQuantity`, `UsedQuantity`, `DamagedQuantity`.
- **Reglas (Dominio 6, ADR-0025)**:
  - Existencias por `ProductVariant + Warehouse`, no por variante sola.
  - Movimientos: entrada, reserva, salida por venta, ajuste, devolución, traslado, liberación de reserva.
  - **No negativo**: `AvailableQuantity >= 0` siempre. No reservar inexistentes/no vendibles/dañadas.
  - Disponible = `AvailableQuantity` (físico) - `ReservedQuantity` - `DamagedQuantity`. Definición única en dominio y persistencia.
#### Invoice (Facturación)
- **Tipos** (InvoiceType): `Master` (cliente), `ZentricDetail` (plataforma), `Vendor` (split vendedor).
- **Estados** (InvoiceStatus): `Draft`, `Issued`, `Voided`.
- **Campos**: `Id`, `CustomerOrderId`, `Type`, `Status`, `Amount` (Money), `TaxAmount`, `IssuedAt`, `VoidedAt?`, `Lines` (InvoiceLine).
- **Reglas (Dominio 9, ADR-0023)**: Split de pagos = documentos, no transferencias. Factura Maestra (total transacción), Detalle Zentric (control plataforma), Factura Vendedor (monto correspondiente al vendedor).

#### ReturnRequest (Devolución)
- **Estados** (ReturnStatus): `Requested` → `Approved` | `Rejected` → `Refunded`.
- **Campos**: `Id`, `CustomerOrderId`, `VendorId`, `VariantId`, `Quantity`, `Reason`, `Status`, `Resolution?`, `CreatedAt`, `ResolvedAt?`, `InspectionResult?`.
- **Reglas (Dominio 10, ADR-0018)**:
  - Prohibido devolver productos digitales.
  - Flujo físico: operador logístico inspecciona estado → requiere aprobación del Vendedor → si ambas OK, reingresa a stock con etiqueta `Used`.
  - Elegibilidad: 30 días desde entrega (decisión actual, sin restricciones adicionales aprobadas).

#### RefundCredit (Crédito de reembolso)
- **Campos**: `Id`, `ReturnRequestId`, `Amount`, `Status`, `ProcessedAt?`.
- **Regla (ADR-0020)**: Precio congelado + crédito parcial por línea.

#### PaymentReceipt (Recibo de pago)
- **Estados** (PaymentStatus): `Pending`, `Authorized`, `Failed`, `Refunded`.
- **Campos**: `Id`, `CustomerOrderId`, `Amount`, `Currency`, `Status`, `ExternalReference?`, `PaidAt?`, `RefundedAmount`.

### 2.2 Value Objects

| VO | Descripción |
|----|-------------|
| `Money` | `Amount` (decimal) + `Currency` (ISO 4217). Inmutable. Operaciones: `Add`, `Subtract`, `Multiply`, comparación. |
| `VariantAttribute` | `Name` + `Value` (string). Usado en `ProductVariant.Attributes`. |
| `Address` | `Street`, `Number`, `Complement?`, `Neighborhood`, `City`, `State`, `PostalCode`, `Country`, `ReceiverName`, `ReceiverPhone`. |
| `InvoiceLine` | `Description`, `Quantity`, `UnitPrice` (Money), `TaxRate`, `TaxAmount`. |

### 2.3 Eventos de dominio (publicados tras transacción exitosa)

| Evento | Trigger | Payload clave |
|--------|---------|---------------|
| `OrderCreatedDomainEvent` | `CustomerOrder` creado | `OrderId`, `BuyerId`, `Items` |
| `OrderPaidDomainEvent` | Transición `PendingPayment → Paid` | `OrderId`, `PaymentReceiptId` |
| `PhysicalProductShippedDomainEvent` | `FulfillmentOrder.Dispatch()` | `FulfillmentOrderId`, `TrackingNumber` |
| `PartialFulfillmentCancelledDomainEvent` | Cancelación por quiebre stock | `FulfillmentOrderId`, `CancelledItems` |
| `StockAdjustedDomainEvent` | Ajuste de inventario | `VariantId`, `WarehouseId`, `Delta`, `Reason` |
| `CartExpiredDomainEvent` | Timeout 15 min checkout | `OrderId`, `ReleasedReservations` |
| `ReturnApprovedEvent` | Devolución aprobada | `ReturnRequestId`, `ReentryToStock` |

----------------------------------------------------------------------

## 3. Reglas de negocio transversales (invariantes)

1. **Unicidad de rol**: Un `User` tiene exactamente un `UserRole`.
2. **Entidad de negocio distinta**: `Buyer` y `Seller` no son subtipos de `User`; son agregados separados con ciclo de vida propio.
----------------------------------------------------------------------

## 4. Casos de uso por dominio (resumen)

### 4.1 Identidad y Acceso
- Registrar comprador, Login/Logout, Perfil, Cambio contraseña, Recuperación.
- Access token vida corta + refresh token rotativo. Sesión incluye perfil, rol, estado, entidad de negocio asociada.

### 4.2 Administración de Vendedores (Administrator)
- Crear vendedor + primera bodega (transacción única).
- Listar/editar/activar/inactivar vendedores.
- Gestionar bodegas centrales (`Marketplace`).

### 4.3 Catálogo (Seller + Administrator)
- Crear producto (Physical/Digital) con variantes obligatorias si Physical.
- Publicar/Suspender/Descontinuar/Restaurar.
- Editar nombre, descripción, precio, imagen, categoría, tipo.
- Gestionar variantes: añadir, actualizar SKU/precio/atributos, activar/desactivar, eliminar (soft).

### 4.4 Inventario (Seller + Logistics + Administrator)
- `AddStock(variantId, warehouseId, quantity)` → entrada en bodega propia o Marketplace.
- Consultar existencias por variante/bodega.
- Ajuste por conteo físico (autorizado, motivado, auditado).
- Traslado entre bodegas (pendiente de decisión).

### 4.5 Carrito y Checkout (Buyer)
- Agregar/modificar/quitar items (valida `CanBeSell`, stock disponible).
- Checkout: revalida precio, estado, cantidad, stock, dirección → reserva atómica → `PendingPayment` (15 min).
- Pago simulado (puerto desacoplado). Respuesta síncrona normal. Rechazo confirmado → `Cancelled` + `PaymentFailed` + libera reserva. Timeout → `Cancelled` + `Expired` + libera reserva.
- Idempotencia en operaciones repetibles.

### 4.6 Pedidos y Logística
- Preparar (`Pack`) → `Packed`.
- Despachar (`Dispatch`) → `Dispatched` + `TrackingNumber`.
- Entregar (`Deliver`) → `Delivered`.
- Cancelar despacho por quiebre stock → devolución parcial líneas afectadas.
- Consulta de pedidos según alcance autorizado.

### 4.7 Facturación
- Generar `Master`, `ZentricDetail`, `Vendor` al confirmar pago.
- Consultar según rol/alcance.

### 4.8 Devoluciones y Reembolsos
- Solicitar (buyer, 30 días post-entrega, solo físico).
- Inspección (logistics) → Aprobación (seller) → Reingreso stock `Used`.
- Reembolso: crédito parcial por línea (precio congelado).

### 4.9 Administración y Supervisión
- Admin: usuarios, vendedores, productos, categorías, bodegas, configuración, políticas.
----------------------------------------------------------------------

## 6. Incertidumbres bloqueantes (requieren resolución antes de codificar flujo afectado)

| ID | Incertidumbre | Impacto | Agente dueño | Pregunta concreta | Opciones | Recomendación |
|----|---------------|---------|--------------|-------------------|----------|---------------|
| INC-01 | Matriz exacta de permisos por acción y scope (Seller, Logistics, Admin, Supervisor) | Autorización en todos los endpoints | Backend | ¿Qué acciones exactas puede hacer cada rol sobre cada recurso y scope? | Definir matriz completa vs. iterar por caso de uso | Definir matriz completa antes de Ola 2 |
| INC-02 | Política de cancelación de pedido tras pago y antes de despacho | Flujo `Paid → Cancelled` | Backend/Product | ¿Puede buyer cancelar tras pago? ¿Bajo qué condiciones? | Permitir siempre / Solo si no hay `Packed` / Nunca | Solo si ningún `FulfillmentOrder` está `Packed` |
| INC-03 | Resolución de pago `UNKNOWN`/timeout antes de proveedor real | Checkout, idempotencia | Backend | ¿Estado intermedio `PENDING_RECONCILIATION`? ¿Consulta de estado? | Estado explícito + polling / Webhook-only / Saga | Estado explícito `PENDING_RECONCILIATION` + idempotency key |
| INC-04 | Flujo físico de devoluciones, reingreso stock y reembolso | Returns end-to-end | Backend/Logistics | ¿Momento exacto de reingreso? ¿Método reembolso? ¿Fallos? | Reingreso tras inspección+aprobación / Reembolso automático / Manual | Reingreso tras inspección+aprobación; reembolso tras confirmación recepción |
| INC-05 | Selección de bodega en checkout, envío dividido, cálculo envío/impuestos | Checkout multi-bodega | Backend/Frontend | ¿Quién elige bodega? ¿Split automático? ¿Cálculo envío? | Automático por proximidad / Buyer elige / Seller define | Automático por proximidad + stock disponible |
| INC-06 | Política de ajustes de stock y roles autorizados | Inventory adjustments | Backend | ¿Quién puede ajustar? ¿Motivos obligatorios? ¿Auditoría? | Solo Admin / Seller+Admin / Con motivo obligatorio | Seller (propias) + Admin (todas); motivo obligatorio; auditoría completa |
| INC-07 | Límites/formatos/TTL/retención para medios (imágenes) | Media upload | Backend/Frontend | ¿Formatos? ¿Tamaño max? ¿TTL URL firmada? ¿Limpieza huérfanos? | WebP/AVIF, 10MB, 1h TTL, job nocturno | Definir en ADR dedicado |
| INC-08 | Duraciones y almacenamiento de tokens y recuperación contraseña | Auth | Backend | Access token TTL? Refresh TTL? Rotación? Storage? | 15min/7d rotativo / 30min/14d / HttpOnly cookie | 15min access + 7d refresh rotativo; HttpOnly secure cookie |
| INC-09 | Definiciones de métricas y exportación de reportes | Supervisor/Admin | Backend | Fórmulas, zonas horarias, estados, granularidad, frescura, permisos export | Definir por reporte / Adoptar estándar | Definir por reporte en ADR dedicado |
| INC-10 | Campos indexables/buscables y estrategia de paginación por endpoint | Search/API | Backend | ¿Qué campos? ¿Cursor vs offset? ¿Límites? | Cursor para listas grandes, offset para admin | Cursor pagination default; offset solo admin |
| INC-11 | Confirmación de estado `Draft` y vocabulario canónico de estados | Product/Order | Backend | ¿`Draft` existe en dominio vigente? ¿Nombres canónicos? | Sí, armonizar / No, solo Published/Suspended/Discontinued | Armonizar: agregar `Draft` al dominio y migración |

----------------------------------------------------------------------

## 7. Trazabilidad a ZENTRIC.md y ADRs

| Dominio ZENTRIC.md | Entidades/Agregados | ADRs relacionados | Addendums |
|--------------------|---------------------|-------------------|-----------|
| 1. Usuarios | `User`, `Buyer`, `Seller` | ADR-0009, ADR-0011, ADR-0013 | — |
| 2. Vendedores | `Seller`, `Warehouse` (first) | ADR-0013, ADR-0017 | Addendum 2026-10-17 §1-2 |
| 3. Bodegas | `Warehouse` (Marketplace/Vendor) | ADR-0008 | Addendum 2026-10-17 §1-3 |
| 4. Catálogo | `Product`, `ProductVariant` | ADR-0002, ADR-0003, ADR-0012 | Addendum 2026-10-17 §5 |
| 5. Inventario | `Inventory`, `InventoryReservationService` | ADR-0001, ADR-0002, ADR-0025 | — |
| 6. Carrito | `CustomerOrder` (Cart), `OrderItem` | ADR-0005, ADR-0020 | — |
| 7. Pedidos | `CustomerOrder`, `FulfillmentOrder`, `Shipment` | ADR-0004, ADR-0006, ADR-0008, ADR-0022 | Addendum 2026-10-03 §1-2 |
| 8. Facturación | `Invoice` (Master/ZentricDetail/Vendor) | ADR-0023 | — |
| 9. Logística | `FulfillmentOrder`, `Shipment` | ADR-0004, ADR-0008 | — |
| 10. Devoluciones | `ReturnRequest`, `RefundCredit` | ADR-0018, ADR-0020 | — |

----------------------------------------------------------------------

*Fin del documento de dominio base. Este documento es fuente de verdad para `01-negocio/01-alcance-y-decisiones.md`, `02-arquitectura/`, `03-roles/`, `04-experiencia/`, `05-backend/` y `frontend/`.*
- Supervisor: métricas agregadas ventas, pedidos, inventario, logística; auditoría 360°.

----------------------------------------------------------------------

## 5. Decisiones de arquitectura de dominio (DDD)

| Decisión | Justificación |
|----------|---------------|
| Agregados: `Product` (con `ProductVariant`), `CustomerOrder`, `FulfillmentOrder`, `Seller`, `Buyer`, `Warehouse`, `Inventory` (clave compuesta), `ReturnRequest` | Coherencia transaccional y límites de consistencia fuertes. |
| `Inventory` como entidad con clave compuesta `VariantId+WarehouseId` | ADR-0002: VariantId es clave de inventario (SKU). |
| Eventos de dominio para efectos colaterales (notificaciones, facturación, logística) | Desacopla dominios; evita transacciones distribuidas innecesarias. |
| Puertos (interfaces) para repositorios, reloj, pagos, medios, IDs | Hexagonal: dominio sin dependencias de infraestructura. |
| `OrderStatus.Cart` como estado inicial del agregado `CustomerOrder` | Unifica carrito y pedido; evita entidad separada `Cart`. |
3. **Propiedad y alcance**: Cada operación valida `rol + estado + ownership + scope`. Vendedor no gestiona productos/inventario/pedidos de otro vendedor.
4. **Inventario no negativo**: `AvailableQuantity >= 0` bajo concurrencia extrema (ADR-0025: actualización condicional atómica).
5. **Reserva atómica en checkout**: 15 min, expiración automática vía `CheckoutTimeoutService` (worker).
6. **Precio congelado**: Al agregar al carrito, el precio queda fijado por línea (ADR-0020).
7. **Split de pagos = documentos**: Factura Maestra, Detalle Zentric, Factura Vendedor (ADR-0023).
8. **No borrado físico**: Soft delete en `Product`, `ProductVariant`, `Warehouse`, `User`, `Seller`, `Buyer`, `CustomerOrder`, `FulfillmentOrder`, `ReturnRequest`.
9. **Producto físico = variante obligatoria** (ADR-0003).
10. **Devolución digital prohibida** (Dominio 10).
11. **Pedido inmutable tras pago**: Contenido no cambia; modificaciones vía cancelación, devolución o ajuste explícito.
12. **Bodega Marketplace visible a todos los vendedores** para `AddStock` (Addendum 2026-10-17).
  - Cambios concurrentes atómicos: transacción/locking verificado.
  - Ajustes requieren usuario autorizado, motivo y auditoría (ADR-0021).
#### OrderItem (Línea de pedido)
- **Campos**: `Id`, `VariantId`, `VendorId`, `Quantity`, `UnitPrice` (Money), `ProductType` (Physical/Digital), `ProductName`, `Sku`.
- **Reglas**: Precio congelado al momento de agregar al carrito (ADR-0020). Multi-moneda: cada operación conserva su moneda.

#### User (Identidad y acceso)
- **Campos**: `Id`, `Email`, `PasswordHash`, `FullName`, `IdentityDocument`, `Phone`, `Role` (UserRole), `Status` (UserStatus), `CreatedAt`, `UpdatedAt`, `DeletedAt`.
- **Reglas**: Email único. Soft delete. Un usuario tiene un único `Role`.
- **Relaciones**: 1:1 con `Buyer` o `Seller` según rol (no herencia).

#### Buyer (Comprador)
- **Campos**: `Id` (= User.Id), `UserId`, `DefaultShippingAddressId?`, `CreatedAt`.
- **Reglas**: Se crea automáticamente al registrar un usuario con rol `Buyer`. No se autorregistra vendedor.

#### Seller (Vendedor)
- **Campos**: `Id` (= User.Id), `UserId`, `StoreName`, `StoreDescription`, `StoreLogoUrl`, `ContactEmail`, `ContactPhone`, `Status` (Active/Inactive), `CreatedAt`, `FirstWarehouseId?`.
- **Reglas**: El `Administrator` crea al vendedor y su primera bodega en **una única transacción PostgreSQL** (ADR-0025, Addendum 2026-10-17). Seller puede gestionar varias bodegas propias adicionales (`WarehouseType.Vendor`). Perfil de tienda obligatorio.

#### Warehouse (Bodega)
- **Campos**: `Id`, `Location`, `Type` (WarehouseType: `Marketplace` | `Vendor`), `VendorId?`, `IsActive`, `CreatedAt`, `UpdatedAt`.
- **Reglas**:
  - `Marketplace` = bodega central de Zentric (`VendorId = null`), administrada por `Administrator`.
  - `Vendor` = bodega propia del vendedor (`VendorId` obligatorio, vinculada forzosa al vendedor).
  - No existe borrado físico (`DELETE`); solo control de estado operativo `IsActive` (Activa/Inactiva) por integridad contable e histórica.
  - El Vendedor puede ingresar existencias (`AddStock`) en sus bodegas propias y en cualquier bodega central activa (`Marketplace`).