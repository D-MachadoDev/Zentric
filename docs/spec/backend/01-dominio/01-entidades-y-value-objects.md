# Backend — Entidades, Value Objects y Agregados — Zentric

**Fuente:** `../frontendSDD/zentric-domain-sdd.md` sección 2
**Estado:** Especificación vinculante para `Zentric.Domain`

---

## 1. Agregados y Entidades Principales

### 1.1 User (Identidad y Acceso)
```csharp
public sealed class User
{
    public Guid Id { get; init; }
    public string Email { get; private set; }
    public string PasswordHash { get; private set; }
    public string FullName { get; private set; }
    public string IdentityDocument { get; private set; }
    public string Phone { get; private set; }
    public UserRole Role { get; private set; }
    public UserStatus Status { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }
    public DateTime? DeletedAt { get; private set; }
    public bool IsDeleted => DeletedAt.HasValue;
}
```
- **Reglas**: Email único. Soft delete. Un `Role` por usuario.
- **Relaciones**: 1:1 con `Buyer` o `Seller` (no herencia).

### 1.2 Buyer (Comprador)
```csharp
public sealed class Buyer
{
    public Guid Id { get; init; } // = User.Id
    public Guid UserId { get; private set; }
    public Guid? DefaultShippingAddressId { get; private set; }
    public DateTime CreatedAt { get; private set; }
}
```
- Se crea automáticamente al registrar usuario con rol `Buyer`.

### 1.3 Seller (Vendedor)
```csharp
public sealed class Seller
{
    public Guid Id { get; init; } // = User.Id
    public Guid UserId { get; private set; }
    public string StoreName { get; private set; }
    public string StoreDescription { get; private set; }
    public string StoreLogoUrl { get; private set; }
    public string ContactEmail { get; private set; }
    public string ContactPhone { get; private set; }
### 1.7 CustomerOrder (Pedido / Carrito unificado)
```csharp
public sealed class CustomerOrder : Entity
{
    public const string DefaultCurrency = "COP";

    public Guid Id { get; init; }
    public Guid BuyerId { get; private set; }
    public OrderStatus Status { get; private set; } // Cart | PendingPayment | Paid | Dispatched | Delivered | Cancelled
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }
    public DateTime? CheckoutStartedAt { get; private set; }
    public OrderCancellationCause? CancellationCause { get; private set; } // Expired, PaymentFailed, StockBreak, BuyerRequested, FullyResolved
    public string? CancellationReason { get; private set; }

    private readonly List<OrderItem> _items = new();
    public IReadOnlyCollection<OrderItem> Items => _items.AsReadOnly();
    private readonly List<DigitalDeliveryRecord> _digitalDeliveries = new();
    public IReadOnlyCollection<DigitalDeliveryRecord> DigitalDeliveries => _digitalDeliveries.AsReadOnly();

    public Money TotalAmount { get; } // Multi-moneda: usa moneda del primer item
}
```
- **Estados**: `Cart → PendingPayment → Paid → Dispatched → Delivered | Cancelled`.
- **Regla SSoT**: `Delivered` o `Cancelled` **nunca se modifican**.
- **Addendum 2026-10-03**: Estado `Anulado` = expira reserva sin concretar pago.

### 1.8 OrderItem (Línea de pedido)
```csharp
public sealed class OrderItem
{
    public Guid Id { get; init; }
    public Guid VariantId { get; private set; }
    public Guid VendorId { get; private set; }
    public int Quantity { get; private set; }
    public Money UnitPrice { get; private set; } // Precio congelado (ADR-0020)
    public ProductType ProductType { get; private set; }
    public string ProductName { get; private set; }
    public string Sku { get; private set; }
}
```

### 1.9 FulfillmentOrder (Orden logística)
```csharp
public sealed class FulfillmentOrder
{
    public Guid Id { get; init; }
    public Guid CustomerOrderId { get; private set; }
    public Guid VendorId { get; private set; }
    public Guid WarehouseId { get; private set; }
    public Guid? CarrierId { get; private set; }
    public string? TrackingNumber { get; private set; }
    public FulfillmentStatus Status { get; private set; } // PendingPacking | Packed | Dispatched | Delivered | Cancelled
    public DateTime? PackedAt { get; private set; }
    public DateTime? DispatchedAt { get; private set; }
    public DateTime? DeliveredAt { get; private set; }
    public DateTime? CancelledAt { get; private set; }
### 1.10 Inventory (Inventario)
```csharp
public sealed class Inventory
{
    public Guid Id { get; init; }
    public Guid VariantId { get; private set; }
    public Guid WarehouseId { get; private set; }
    public int AvailableQuantity { get; private set; }
    public int ReservedQuantity { get; private set; }
    public int UsedQuantity { get; private set; }
    public int DamagedQuantity { get; private set; }
}
```
- **Clave compuesta**: `VariantId + WarehouseId` (ADR-0002). Única.
- **Disponible** = `AvailableQuantity - ReservedQuantity - DamagedQuantity` (definición única).

### 1.11 Invoice (Facturación - Split 3 docs)
```csharp
public sealed class Invoice
{
    public Guid Id { get; init; }
    public Guid CustomerOrderId { get; private set; }
    public InvoiceType Type { get; private set; } // Master | ZentricDetail | Vendor
    public InvoiceStatus Status { get; private set; } // Draft | Issued | Voided
    public Money Amount { get; private set; }
    public Money TaxAmount { get; private set; }
    public DateTime? IssuedAt { get; private set; }
    public DateTime? VoidedAt { get; private set; }
}
```
- **ADR-0023**: Split = documentos, no transferencias.

### 1.12 ReturnRequest / RefundCredit
```csharp
public sealed class ReturnRequest
{
    public Guid Id { get; init; }
    public Guid CustomerOrderId { get; private set; }
    public Guid VendorId { get; private set; }
    public Guid VariantId { get; private set; }
    public int Quantity { get; private set; }
    public ReturnStatus Status { get; private set; } // Requested | Approved | Rejected | Refunded
    public string Reason { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? ResolvedAt { get; private set; }
}
```
- **Regla**: Prohibido devolver productos digitales (Dominio 10).
- Elegibilidad: 30 días post-`Delivered`.

---

## 2. Value Objects

| VO | Ubicación | Descripción |
|----|-----------|-------------|
| `Money` | `Products/ValueObjects/Money.cs` | `Amount` (decimal) + `Currency` (ISO 4217). Inmutable. `Add`, `Subtract`, `Multiply`, comparación. |
| `VariantAttribute` | `Products/ValueObjects/VariantAttribute.cs` | `Name` + `Value` (string). Usado en `ProductVariant.Attributes`. |
| `Address` | `Buyers/ValueObjects/Address.cs` | Street, Number, Complement, Neighborhood, City, State, PostalCode, Country, ReceiverName, ReceiverPhone. |
| `InvoiceLine` | `Billing/InvoiceLine.cs` | Description, Quantity, UnitPrice (Money), TaxRate, TaxAmount. |

---

## 3. Enums de Dominio

| Enum | Valores | Ubicación |
|------|---------|-----------|
| `UserRole` | `Buyer`, `Seller`, `Logistics`, `Administrator`, `Supervisor` | `Users/Enums/UserRole.cs` |
| `UserStatus` | `Active`, `Inactive`, `Suspended` | `Users/Enums/UserStatus.cs` |
| `WarehouseType` | `Marketplace`, `Vendor` | `Warehouses/Enums/WarehouseType.cs` |
| `ProductType` | `Physical`, `Digital` | `Products/Enums/ProductType.cs` |
| `ProductStatus` | `Draft`, `Published`, `Suspended`, `Discontinued` | `Products/Enums/ProductStatus.cs` |
| `OrderStatus` | `Cart`, `PendingPayment`, `Paid`, `Dispatched`, `Delivered`, `Cancelled` | `Orders/Enums/OrderStatus.cs` |
| `OrderCancellationCause` | `Expired`, `PaymentFailed`, `StockBreak`, `BuyerRequested`, `FullyResolved` | `Orders/Enums/OrderCancellationCause.cs` |
| `FulfillmentStatus` | `PendingPacking`, `Packed`, `Dispatched`, `Delivered`, `Cancelled` | `Logistics/Enums/FulfillmentStatus.cs` |
| `InvoiceType` | `Master`, `ZentricDetail`, `Vendor` | `Billing/Enums/InvoiceType.cs` |
| `InvoiceStatus` | `Draft`, `Issued`, `Voided` | `Billing/Enums/InvoiceStatus.cs` |
| `ReturnStatus` | `Requested`, `Approved`, `Rejected`, `Refunded` | `Returns/Enums/ReturnStatus.cs` |
| `PaymentStatus` | `Pending`, `Authorized`, `Failed`, `Refunded` | `Payments/Enums/PaymentStatus.cs` |
| `SellerStatus` | `Active`, `Inactive` | `Sellers/Enums/SellerStatus.cs` |
    public string? CancellationCause { get; private set; }
}
```
- **Estados**: `PendingPacking → Packed → Dispatched → Delivered | Cancelled`.
- Subdivisión de `CustomerOrder` por `VendorId` + `WarehouseId` (ADR-0008).
    public SellerStatus Status { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public Guid? FirstWarehouseId { get; private set; }
}
```
- **Regla crítica**: `Administrator` crea `Seller` + primera `Warehouse` en **una única transacción PostgreSQL** (ADR-0025).
