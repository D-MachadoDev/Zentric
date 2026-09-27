# 02. Agregados y Entidades (Aggregates & Entities)

El modelo respeta la directriz de mantener Agregados Pequeños, estableciendo límites transaccionales duros.

## 1. Identity Module

### Aggregate Root: `User`
- **Responsabilidad:** Identidad y perfil de cualquier actor (Buyer, Seller, Admin, etc.).
- **Propiedades Clave:** `UserId`, `DocumentId` (Único), `Email` (Único), `Role`, `Status` (Active, Blocked).
- **Comportamientos:** `Block()` -> Este método dispara un evento de dominio vital para la suspensión en cascada.

## 2. Catalog Module

### Aggregate Root: `Product`
- **Responsabilidad:** Controlar la información comercial de un ítem a la venta.
- **Propiedades Clave:** `ProductId`, `SellerId`, `BasePrice`, `ProductType` (Físico/Digital), `Status` (Published, Suspended).
- **Comportamientos:** `SuspendReactively()`, `UpdatePrice()`.
- **Entidades Hijas: `ProductVariant`**
  - Maneja las combinaciones (ej. Talla/Color). Tiene su propio `VariantId` (que sirve como SKU para el inventario).

## 3. Inventory Module

### Aggregate Root: `Warehouse`
- **Responsabilidad:** Representar una ubicación física inmutable.
- **Propiedades Clave:** `WarehouseId`, `WarehouseType` (Marketplace, Vendor), `OwnerSellerId` (Nulo si es del Marketplace).

### Aggregate Root: `InventoryItem`
- **Responsabilidad:** Controlar transaccionalmente las existencias de un SKU en una ubicación específica.
- **Propiedades Clave:** `InventoryItemId`, `VariantId`, `WarehouseId`, `AvailableQuantity`, `ReservedQuantity`.
- **Comportamientos:** 
  - `Reserve(qty)`
  - `Release(qty)`
  - `Deduct(qty)`
  - `ManualAdjust(qty, UserId, Role)`: Contiene la regla dura que impide al Seller ajustar stock que físicamente custodia el Marketplace.

## 4. Ordering Module

### Aggregate Root: `CustomerOrder`
- **Responsabilidad:** Representa el contrato comercial unificado con el Comprador y la base para la factura maestra de Zentric.
- **Propiedades Clave:** `CustomerOrderId`, `BuyerId`, `Status` (PendingPayment, Paid, PartiallyDelivered, etc.), `TotalAmount` (Suma ítems), `FlatShippingFee`.
- **Entidades Hijas: `OrderLine`** (Apunta a un `VariantId`).
- **Comportamientos:** 
  - `ConfirmPayment()` (Simulación exitosa).
  - `CancelEarly()` (Retracto temprano si todo sigue Pending).
  - `ApplyPartialRefund(amount, reason)`.

## 5. Fulfillment Module

### Aggregate Root: `FulfillmentOrder`
- **Responsabilidad:** Agrupa exclusivamente los productos que le corresponden a un (1) Vendedor, derivados de un Pedido Maestro.
- **Propiedades Clave:** `FulfillmentOrderId`, `CustomerOrderId`, `SellerId`, `Status`.
- **Comportamientos:** 
  - `CancelDueToGhostStock(VariantId)`: Acción unilateral que detona reembolsos.
  - `RequestReturn(VariantId)`: Inicia proceso de posventa. No permitido para productos digitales.
- **Entidades Hijas: `Shipment`**
  - Guía de envío individual. Si un vendedor saca ítems de 2 bodegas, habrá 2 `Shipments`.
