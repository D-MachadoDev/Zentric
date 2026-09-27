# 01. Modelos de Dominio (Aggregate Roots y Entidades)

Este documento define los **Aggregate Roots (AR)** y las **Entidades** principales del sistema Zentric, agrupados por *Bounded Contexts*, garantizando la pureza del modelo sin dependencias de infraestructura.

## 1. Bounded Context: Identity & Access (Usuarios)

### Aggregate Root: `User`
Representa a cualquier individuo con acceso a la plataforma (Comprador, Vendedor, Op. Logístico, Admin, Supervisor).
- **Propiedades:** `Id` (UserId), `FullName` (string), `Email` (EmailAddress), `Role` (UserRole), `Status` (UserStatus), `IdentityDocument` (string).
- **Reglas de Negocio:** 
  - El correo y documento de identidad deben ser únicos en todo el sistema.
  - Un usuario solo puede tener un único rol asignado.
- **Comportamientos (Métodos):** `Block()`, `Activate()`, `UpdateRole()`, `UpdateFullName()`, `UpdateEmail()`, `UpdatePasswordHash()`, `Delete()`, `Restore()`, `DeleteByAdmin()`.
  - `Block()` dispara un evento de dominio que suspende en cascada los artefactos del usuario.
  - Fuente de verdad: `Zentric.Domain/Users/User.cs` (verificado 2026-09-27). Las versiones anteriores de este documento listaban `Lock()`/`Unlock()`/`ChangeRole()`, nombres que **no existen en el código**.

## 2. Bounded Context: Catalog (Catálogo)

### Aggregate Root: `Product`
Representa un bien ofrecido por un Vendedor.
- **Propiedades:** `Id` (ProductId), `VendorId` (UserId), `Title` (string), `Description` (string), `Price` (Money), `Type` (ProductType - Físico o Digital), `Status` (ProductStatus).
- **Entidades Hijas: `ProductVariant`** — combinación vendible del producto (ej. Talla/Color). Su `Id` **es** el `VariantId` y actúa como SKU para el inventario ([ADR-0002](../Adr/0002-clave-inventario-variantid.md)). Se compone de atributos: `VariantAttribute` (nombre + valor). El SKU es único dentro del producto.
- **Reglas de Negocio:**
  - Al crearse, su estado es `Published` automáticamente (sin flujo de aprobación).
  - **Variante obligatoria solo para físicos ([CAT-03](06-business-rules.md)):** un producto `Physical`
    exige al menos una variante (ver [backendSDD/Domain/06-business-rules.md](06-business-rules.md) [CAT-03](06-business-rules.md) y
    [backendSDD/Adr/0003-variante-obligatoria-productos-fisicos.md](../Adr/0003-variante-obligatoria-productos-fisicos.md)). Un producto
    `Digital` ([CAT-02](06-business-rules.md): sin logística ni inventario) puede nacer sin variantes.
- **Comportamientos:** `UpdatePrice()`, `Suspend()`, `Discontinue()`, `AddVariant()`, `RemoveVariant()`.

## 3. Bounded Context: Inventory (Inventario y Bodegas)

### Aggregate Root: `Warehouse`
Espacio físico donde se almacenan los productos.
- **Propiedades:** `Id` (WarehouseId), `OwnerId` (UserId - null si es bodega de Zentric), `Location` (Address), `Type` (WarehouseType).
- **Reglas de Negocio:** Distingue entre bodegas propias del marketplace y de los vendedores.

### Aggregate Root: `InventoryItem`
El control transaccional del stock de una variante específica (SKU) en una bodega específica.
- **Propiedades:** `Id` (InventoryItemId), `VariantId` (VariantId), `WarehouseId` (WarehouseId), `AvailableQuantity` (int), `ReservedQuantity` (int).
- **Clave de stock:** la pareja `(VariantId, WarehouseId)`, según [ADR-0002](../Adr/0002-clave-inventario-variantid.md).
- **Reglas de Negocio:** `AvailableQuantity` nunca puede ser negativo bajo ninguna circunstancia (invariante crítica).
- **Comportamientos:** `Reserve(quantity)`, `Release(quantity)`, `Deduct(quantity)`, `Adjust(quantity)`, `ManualAdjust(quantity, userId, role)`.

## 4. Bounded Context: Ordering (Pedidos - Interfaz del Comprador)

### Aggregate Root: `CustomerOrder` (Order)
Representa el compromiso comercial formal y el ciclo de negocio central del sistema.
- **Propiedades:** `Id` (OrderId), `BuyerId` (UserId), `Lines` (List<OrderItem>), `TotalAmount` (Money), `Status` (OrderStatus).
- **Entidades Hijas:**
  - `OrderItem`: Contiene `VariantId` (SKU), `Quantity`, `UnitPrice` (Money).
- **Ciclo de Estados del Pedido (OrderStatus):** 
  - `Cart` (Carrito): Selección provisional.
  - `PendingPayment` (Pendiente de Pago): Espera de confirmación financiera.
  - `Paid` (Pagado): Inicio de alistamiento.
  - `Dispatched` (Despachado): Salida física de la bodega.
  - `Delivered` (Entregado / Finalizado): Conclusión de la entrega.
- **Reglas de Negocio:** 
  - Un pedido en estado `Delivered` no podrá ser modificado bajo ninguna circunstancia.
- **Comportamientos:** `AddItem()`, `RemoveItem()`, `Checkout()`, `MarkAsPaid()`, `Dispatch()`, `Deliver()`.

## 5. Bounded Context: Fulfillment & Logistics (Despachos - Interfaz del Vendedor)

### Aggregate Root: `FulfillmentOrder`
Orden de trabajo derivada de un `CustomerOrder`, pero específica para **un solo Vendor**.
- **Propiedades:** `Id` (FulfillmentOrderId), `CustomerOrderId` (OrderId), `VendorId` (UserId), `Status` (FulfillmentStatus), `Shipments` (List<Shipment>).
- **Entidades Hijas:**
  - `Shipment`: Guía de despacho individual. Agrupa productos que salen de *una misma bodega*.
- **Reglas de Negocio:** 
  - Un `FulfillmentOrder` puede tener múltiples `Shipments` si el inventario del vendedor estaba fragmentado en varias bodegas.
  - El Vendor puede cancelarlo unilateralmente si detecta quiebre de stock (Stock Fantasma).
- **Comportamientos:** `Pack()`, `Dispatch()`, `Deliver()`, `CancelByStockBreak()`.


## 6. Bounded Context: Returns (Devoluciones)

### Aggregate Root: ReturnRequest
- **Responsabilidad:** Gestionar la devolucin de productos.
- **Reglas de Negocio Duras:** 
  - **PROHIBIDO** devolver productos digitales.
  - El producto fsico requiere inspeccin del Operador Logstico (buen estado) y aprobacin del Vendedor.
  - Si cumple ambas condiciones, el producto regresa al inventario etiquetado como Usado (UsedQuantity).

## 7. Bounded Context: Billing (Facturacin)

### Aggregate Root: Invoice
- **Responsabilidad:** Registro financiero de la transaccin.
- **Reglas de Negocio:**
  - Existe una Factura Maestra para el Comprador.
  - Zentric mantiene los detalles internos del split.
  - Existe una Factura especfica separada para el Vendedor (Vendor).
