# 02. Value Objects y Enumeraciones

Este documento define los Value Objects (objetos inmutables sin identidad propia) y los Enumeradores que refuerzan las reglas de negocio y el Lenguaje Ubicuo en Zentric.

## 1. Value Objects (Objetos de Valor)

### `Money`
Encapsula valores financieros garantizando cálculos precisos.
- **Propiedades:** `Amount` (decimal), `Currency` (string, código ISO 4217 de 3 letras, ej. "COP").
- **Reglas:** el constructor rechaza importes negativos y redondea a 2 decimales (`MidpointRounding.AwayFromZero`). La moneda se normaliza (mayúsculas, sin espacios) y se valida contra una **lista blanca** (Q-16, dictamen del Owner 2026-09-27): hoy solo `COP` está habilitada (`SupportedCurrencies`), un código debe tener 3 letras exactas y uno no habilitado lanza excepción.
- **Comportamientos:** `Add(Money)`, `Subtract(Money)`, `Multiply(int)`; la igualdad es insensible a mayúsculas en la divisa. Mezclar divisas lanza `MixedCurrencyException` — excepción de negocio que la API traduce a `400`, no a `500`.
- **Moneda por defecto:** `CustomerOrder.DefaultCurrency = "COP"` (y `SupportedCurrencies.Default`). Se usa únicamente cuando el carrito está vacío y no hay moneda de referencia que inferir. El sistema es **multi-moneda**: con items, el total adopta la moneda del primero.

### `Address`
Dirección postal del **comprador** (`Buyer.MainAddress`, obligatoria — ZENTRIC.md Dominio 2). No guarda coordenadas ni calcula distancias: el sistema no modela ubicación geográfica (las bodegas usan un `Location` de texto).
- **Propiedades:** `Street`, `City`, `State`, `ZipCode`, `Country`.
- **Reglas:** inmutable; los cinco campos son obligatorios (se recortan espacios y no pueden ir vacíos). Si el comprador cambia de casa, se genera una nueva `Address`.

### `Email`
Garantiza que cualquier email en el sistema sea estructuralmente válido.
- **Propiedades:** `Value` (string, normalizado a minúsculas y sin espacios externos).
- **Reglas:** valida en su constructor: no vacío, longitud mínima de 5, exactamente un `@` y dominio con `.`. La igualdad es insensible a mayúsculas.

### Strongly-Typed IDs (IDs Fuertemente Tipados)
**[NO IMPLEMENTADO - 2026-10-03]** Las entidades, los puertos y los DTO usan `Guid` como identificador. **Sección conservada como diseño propuesto, no como contrato vigente.**
- Propuesta original: `record struct` para `UserId`, `ProductId`, `WarehouseId`, `OrderId`, `FulfillmentOrderId`.
- **Por qué no se ratificó**: el Owner decidió (grill Q-08, 2026-09-27) que el costo de migración (entidades, puertos, DTOs, BD, mappers, tests) superaba el beneficio marginal. `Guid` plano + validaciones en constructores + tests de dominio ya garantizan integridad sin tipos fuertes.
- **Estado**: diseño archivado. No hay plan de migración. Si el Owner lo ratifica en el futuro, se reabre como [Q-XX].

---

## 2. Enumeraciones y Catálogos (Enums)

> Inventario verificado: **10 enums** en `Zentric.Domain`.

### `UserRole`
Define el rol estricto del participante; estos literales son los que viajan en el JSON del token, los DTO y los query params — los `enum` se serializan **por nombre** ([ADR-0012](../Adr/0012-contrato-json-de-los-enum-por-nombre.md)).
- `Buyer`, `Seller`, `Administrator`, `Supervisor`, `LogisticsOperator`.

### `UserStatus`
Condición operativa del usuario: `Active`, `Blocked`, `Deleted`. El borrado es lógico: `Delete()`/`DeleteByAdmin()` marcan `DeletedAt` y pasan el estado a `Deleted`.

### `ProductType`
Crucial para determinar la ruta logística.
- `Physical`: Requiere inventario y despacho físico.
- `Digital`: Requiere entrega inmediata tras pago (ej. enlace de descarga o licencia).

### `ProductStatus`
- `Published`: Visible para la venta.
- `Suspended`: Oculto temporalmente.
- `Discontinued`: Retirado permanentemente del catálogo.

### `OrderStatus` (Ciclo de Vida del CustomerOrder)

> Valores reales del enum en código; las transiciones y quién las ejecuta están en [07-lifecycle.md](07-lifecycle.md).

- `Cart`: Productos añadidos, inventario reservado (Timeout 15 min, regla PED-01).
- `PendingPayment`: Transición hacia pasarela de pagos.
- `Paid`: Pago aprobado.
- `Dispatched`: El pedido salió a despacho.
- `Delivered`: El pedido fue entregado al comprador.
- `Cancelled`: Anulado (por timeout, fallo de pago o decisión administrativa).

### `FulfillmentStatus` (Ciclo de Vida del FulfillmentOrder)

> Valores reales del enum; transiciones en [07-lifecycle.md](07-lifecycle.md).

- `PendingPack`: Aprobado, esperando que la bodega inicie alistamiento.
- `Packed`: Empacado y listo para recolección.
- `Dispatched`: Entregado a la transportadora (en tránsito).
- `Delivered`: Recibido satisfactoriamente por el comprador.
- `Cancelled`: Anulado por quiebre de stock con `CancellationReason` ([ADR-0004](../Adr/0004-estado-cancelacion-despacho.md)); lo reporta quien está en la bodega, Vendedor u Operador Logístico ([ADR-0014](../Adr/0014-enmiendas-a-la-matriz-de-autorizacion.md)).

### `WarehouseType`
- `Marketplace`: Operada por el equipo logístico de Zentric.
- `Vendor`: Operada independientemente por el Vendedor.

### `PlatformFeePolicy` / `FeeSplit` (Billing)
- **Dónde vive:** `Zentric.Domain/Billing/Invoice.cs` (no hay archivo propio).
- **`PlatformFeePolicy`:** comisión de plataforma. `DefaultPercentage = 0.05m` es un **supuesto** (la Ley no fija porcentaje): solo estima. `IsCollectable` es `true` únicamente con reparto ratificado (`Split != null`). `ApplyTo(Money)` conserva la moneda y redondea a 2 decimales (`MidpointRounding.AwayFromZero`).
- **Reparto vigente:** 5 % plataforma / 95 % vendedor (dictamen Q-15, 2026-09-27). La regla de negocio está en [06-business-rules.md §6](06-business-rules.md).

### `PaymentStatus`
Estado de un cobro — el rechazo comercial es un estado, no una excepción: `Pending`, `Approved`, `Declined`, `Refunded`. `Refunded` materializa el crédito a favor (ADDENDUM 2026-09-27): el pedido no se revierte.

### `ReturnStatus`
Ciclo de la devolución (ADDENDUM Dominio 10): `Requested`, `Approved`, `Rejected`, `Refunded` — 1:1 con «Solicitada, Aprobada, Rechazada, Reembolsada» de la Ley. Quién ejecuta cada transición y la regla de inspección: [services/returns-approval-service.md](services/returns-approval-service.md) y [ADR-0018](../Adr/0018-devoluciones-confianza-recepcion-responsabilidad.md).

### `InvoiceType`
Documento emitido por pedido: `Master` (lo ve el Comprador), `ZentricDetail` (comisión de plataforma, control interno) y `VendorDetail` (lo ve su Vendedor). Reparto y emisión: FAC-01 en [06-business-rules.md §6](06-business-rules.md).