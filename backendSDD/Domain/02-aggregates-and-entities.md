# 02. Agregados y Entidades (Aggregates & Entities)

El modelo respeta la directriz de mantener Agregados Pequeños, estableciendo límites transaccionales duros.

## 1. Identity Module

### Aggregate Root: `User`
- **Responsabilidad:** Identidad y perfil de cualquier actor (Buyer, Seller, Admin, etc.).
- **Propiedades Clave:** `Id`, `IdentityDocument` (Único), `Email` (VO, Único), `FullName`, `PasswordHash`, `Role`, `Status` (`Active`, `Blocked`, `Deleted`).
- **Comportamientos:** `Block()`, `Activate()`, `UpdateRole()`, `UpdateFullName()`, `UpdateEmail()`, `UpdatePasswordHash()`, `Delete()`, `Restore()`, `DeleteByAdmin()`. **La «suspensión en cascada» por `Block()` fue retirada por el Owner el 2026-10-04** (ver [INV-05](06-business-rules.md) y la [enmienda de ADR-0019](../Adr/0019-cierre-de-decisiones-capa-domain.md#enmiendas)): `User` **no** emite eventos de dominio a propósito, y el bloqueo es únicamente `Status = Blocked`. **INV-05 implementado 2026-10-07:** `Block()` y `Activate()` invocados desde `POST /api/users/{id}/block` y `POST /api/users/{id}/activate` (política `UserAdministration`, solo Administrador; dictamen Q-26).
- **Unicidad:** `IdentityDocument` y `Email` se declaran únicos **a nivel de aplicación**. **IMPLEMENTADO 2026-10-07:** migración `AddUniqueIndexesToUsers` añade índices únicos en BD sobre `Users.Email` y `Users.IdentityDocument`, garantizando la unicidad a nivel de base de datos y previniendo condiciones de carrera en altas concurrentes.

## 2. Catalog Module

### Aggregate Root: `Product`
- **Responsabilidad:** Controlar la información comercial de un ítem a la venta.
- **Propiedades Clave:** `Id`, `VendorId` (Q-05: `Vendor` es el término canónico), `Name`, `Description`, `Price`, `Type` (ProductType: Físico/Digital), `Status` (`Published`, `Suspended`, `Discontinued`).
- **Comportamientos:** `Update()`, `UpdatePrice()`, `UpdateType()`, `Publish()`, `Suspend()`, `AddVariant()`, `RemoveVariant()`, `Delete()`, `Restore()`.
  - Fuente de verdad: `Zentric.Domain/Products/Product.cs` (verificado 2026-09-27).
- **Entidades Hijas: `ProductVariant`**
  - Maneja las combinaciones (ej. Talla/Color). Tiene su propio `VariantId` (que sirve como SKU para el inventario).

## 3. Inventory Module

### Aggregate Root: `Warehouse`
- **Responsabilidad:** Representar una ubicación física con identidad propia (no es inmutable: tiene `Rename()` y `Relocate()`).
- **Propiedades Clave:** `Id`, `Name`, `Location`, `Capacity`, `Type` (WarehouseType: Marketplace/Vendor), `VendorId` (Guid? — nulo si es del Marketplace), `IsActive`.

### Aggregate Root: `Inventory`
- **Responsabilidad:** Controlar transaccionalmente las existencias de un SKU en una ubicación específica.
- **Propiedades Clave:** `Id`, `VariantId`, `WarehouseId`, `AvailableQuantity`, `ReservedQuantity`, `DamagedQuantity`, `UsedQuantity`.
- **Comportamientos:** 
  - `AddStock(qty)`, `ReserveStock(qty)`, `DispatchStock(qty)`, `MarkAsDamaged(qty)`, `ReturnToAvailable(qty)`, `ReturnToUsedStock(qty)`, `ReconcileGhostStock(qty)`, `ReceiveReturnedStock(qty)`, `MarkAsDeleted()`.
  - `ApplyPhysicalCount(countedQuantity, countedBy, reason)`: **Implementado - 2026-10-05.** Sustituye a `ManualAdjust()` (eliminado 2026-10-03 en la rework de ADR-0021). Aplica un conteo físico que registra `SystemQuantity`, `PhysicalQuantity`, `CountedBy`, `Reason`, `CountedAt` en `StockAdjustmentRecord`, emite `StockAdjustedDomainEvent` y guarda `AdjustmentHistory` (pre-carga del historial). *[IMPLEMENTADO - 2026-10-05].*

## 4. Ordering Module

### Aggregate Root: `CustomerOrder`
- **Responsabilidad:** Representa el contrato comercial unificado con el Comprador y la base para la factura maestra de Zentric.
- **Propiedades Clave:** `CustomerOrderId`, `BuyerId`, `Status` (`Cart`, `PendingPayment`, `Paid`, `Dispatched`, `Delivered`, `Cancelled`), `TotalAmount` (suma calculada de los ítems). `FlatShippingFee` — **decisión del Owner 2026-10-05:** la tarifa de envío es un **número plano hardcodeado**, no un porcentaje ni una fórmula; no depende del peso ni del destino. Cierra el aplazamiento de ADR-0008, que quedaba sin cifra. *(Pendiente de código.)*
- **Entidades Hijas: `OrderItem`** (Apunta a un `VariantId` + `VendorId` histórico — Q-18).
- **Comportamientos:** 
  - `MarkAsPaid()` (pago aceptado; emite `OrderPaidDomainEvent`).
  - `Checkout()`, `AddItem()`, `RemoveItem()`, `Dispatch()`, `Deliver()`, `CancelDueToTimeout()`.
  - El reembolso proporcional **no pertenece a este agregado**: vive en `PaymentReceipt.Refund(RefundCredit)` con el crédito por línea ([EXC-02](06-business-rules.md), invariante 14 de [04-invariants-and-rules.md](04-invariants-and-rules.md)). Tampoco hay retracto temprano: un pedido pagado es inmodificable (invariante 10).

## 5. Fulfillment Module

### Aggregate Root: `FulfillmentOrder`
- **Responsabilidad:** Agrupa exclusivamente los productos que le corresponden a un (1) Vendedor, derivados de un Pedido Maestro.
- **Propiedades Clave:** `Id`, `CustomerOrderId`, `VendorId` (Q-05: `Vendor` es canónico), `Status`, `CancellationReason`.
- **Comportamientos:** 
  - `CancelDueToNoStock()` (sin parámetros; motivo `Stock Fantasma`) → reconcilia stock y **crea la `ReturnRequest` obligatoria**.
  - `AddShipment()`, `Pack()`, `Dispatch()`, `Deliver()`. La devolución vive en el agregado `ReturnRequest` (caso de uso `RequestReturnCommand`).
- **Entidades Hijas: `Shipment`**
  - Guía de envío individual. Si un vendedor saca ítems de 2 bodegas, habrá 2 `Shipments`.
