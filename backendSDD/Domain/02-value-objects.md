# 02. Value Objects y Enumeraciones

Este documento define los Value Objects (objetos inmutables sin identidad propia) y los Enumeradores que refuerzan las reglas de negocio y el Lenguaje Ubicuo en Zentric.

## 1. Value Objects (Objetos de Valor)

### `Money`
Encapsula valores financieros garantizando cálculos precisos.
- **Propiedades:** `Amount` (decimal), `Currency` (string, ej. "USD").
- **Reglas:** `Amount` no puede ser menor a cero para precios.
- **Comportamientos:** `Add(Money)`, `Subtract(Money)`. Solo se pueden sumar/restar objetos con la misma moneda.

### `Address`
Ubicación geográfica estandarizada para bodegas y direcciones de despacho.
- **Propiedades:** `Street`, `City`, `State`, `ZipCode`, `Country`.
- **Reglas:** Inmutable. Si el comprador cambia de casa, se genera una nueva `Address`.

### `EmailAddress`
Garantiza que cualquier email en el sistema sea estructuralmente válido.
- **Propiedades:** `Value` (string).
- **Reglas:** Exige validación con Expresión Regular al momento de su creación.

### Strongly-Typed IDs (IDs Fuertemente Tipados)
Implementados como `record struct` en C# para evitar "Primitive Obsession" y cruce accidental de IDs.
- `UserId`, `ProductId`, `WarehouseId`, `OrderId`, `FulfillmentOrderId`.

---

## 2. Enumeraciones y Catálogos (Enums)

### `UserRole`
Define el rol estricto del participante.
- `Buyer`, `Seller`, `LogisticsOperator`, `Admin`, `Supervisor`.

### `ProductType`
Crucial para determinar la ruta logística.
- `Physical`: Requiere inventario y despacho físico.
- `Digital`: Requiere entrega inmediata tras pago (ej. enlace de descarga o licencia).

### `ProductStatus`
- `Published`: Visible para la venta.
- `Suspended`: Oculto temporalmente.
- `Discontinued`: Retirado permanentemente del catálogo.

### `OrderStatus` (Ciclo de Vida del CustomerOrder)
- `Cart`: Productos añadidos, inventario reservado (Timeout 15 min).
- `PendingPayment`: Transición hacia pasarela de pagos.
- `Paid`: Pago aprobado.
- `PartiallyDelivered`: Estado intermedio. Ej: Un pedido mixto donde el E-book (Digital) ya se entregó, pero el producto Físico sigue en tránsito.
- `Completed`: Todos los productos fueron entregados al comprador.
- `Cancelled`: Anulado (por timeout, fallo de pago o decisión administrativa).

### `FulfillmentStatus` (Ciclo de Vida del FulfillmentOrder)
- `Pending`: Aprobado, esperando que la bodega inicie alistamiento.
- `Packed`: Empacado y listo para recolección.
- `Shipped`: Entregado a la transportadora (En tránsito).
- `Delivered`: Recibido satisfactoriamente por el comprador.
- `Cancelled`: Anulado unilateralmente por el Vendedor (Quiebre de stock).

### `WarehouseType`
- `Marketplace`: Operada por el equipo logístico de Zentric.
- `Vendor`: Operada independientemente por el Vendedor.
