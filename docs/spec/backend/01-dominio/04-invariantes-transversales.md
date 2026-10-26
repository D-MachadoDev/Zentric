# Backend — Invariantes Transversales (Reglas de Negocio) — Zentric

**Fuente:** `../frontendSDD/zentric-domain-sdd.md` §3
**Estado:** Especificación vinculante — Implementadas en `Zentric.Domain` (entidades, domain services) + verificadas en tests

---

## 1. Catálogo de Invariantes (12 Reglas)

| ID | Invariante | Dónde se valida | Tests obligatorios |
|----|------------|-----------------|-------------------|
| **INV-01** | **Unicidad de rol**: Un `User` tiene exactamente un `UserRole` | `User` constructor + `UserRole` enum | `User_CannotHaveMultipleRoles` |
| **INV-02** | **Entidad de negocio distinta**: `Buyer` y `Seller` no son subtipos de `User`; agregados separados | `Buyer`/`Seller` constructors (requieren `UserId`) | `Buyer_NotSubtypeOfUser`, `Seller_NotSubtypeOfUser` |
| **INV-03** | **Propiedad y alcance**: Cada operación valida `rol + estado + ownership + scope` | Authorization Policies (`RequireSellerScope`, etc.) | `Seller_CannotAccessOtherSellerProducts`, `Logistics_CannotAccessUnassignedFulfillments` |
| **INV-04** | **Inventario no negativo**: `AvailableQuantity >= 0` bajo concurrencia extrema (ADR-0025) | `Inventory` entity + `IInventoryReservationService.Reserve` (conditional update) | `Inventory_CannotGoNegative`, `ConcurrentReservations_NoLostUpdates` |
| **INV-05** | **Reserva atómica en checkout**: 15 min, expiración automática vía `CheckoutTimeoutService` | `CustomerOrder.Checkout()` + `CheckoutTimeoutService` (worker) | `Checkout_ReservesStock`, `CheckoutTimeout_ReleasesReservation` |
| **INV-06** | **Precio congelado**: Al agregar al carrito, precio fijado por línea (ADR-0020) | `CustomerOrder.AddItem` captura `UnitPrice` | `OrderItem_PriceFrozenAtAddTime` |
| **INV-07** | **Split de pagos = documentos**: Factura Master, ZentricDetail, Vendor (ADR-0023) | `BillingService.GenerateInvoices` (post-Paid) | `PaidOrder_GeneratesThreeInvoices`, `InvoiceSplit_Consistent` |
| **INV-08** | **No borrado físico**: Soft delete en todas las entidades (`DeletedAt` + `IsDeleted`) | Entity base `Delete()` method + Global Query Filter EF Core | `SoftDelete_PreservesReferentialIntegrity`, `DeletedEntities_NotReturnedByDefault` |
---

## 2. Implementación por Entidad (Ejemplos)

### 2.1 Inventory — No Negatividad + Concurrencia
```csharp
// Domain/Inventories/Inventory.cs
public void AddStock(int quantity)
{
    if (quantity <= 0) throw new ArgumentException("Quantity must be positive");
    AvailableQuantity += quantity;
    UpdatedAt = DateTime.UtcNow;
}

// Domain/Inventories/Services/InventoryReservationService.cs
public async Task<Result> Reserve(Guid variantId, Guid warehouseId, int qty)
{
    // Conditional update atómico (ADR-0025)
    var rows = await _db.ExecuteAsync(@"
        UPDATE inventories 
        SET available_quantity = available_quantity - @qty,
            reserved_quantity = reserved_quantity + @qty,
            updated_at = now()
        WHERE variant_id = @variantId 
          AND warehouse_id = @warehouseId
          AND available_quantity >= @qty", 
        new { variantId, warehouseId, qty });
    
    return rows > 0 ? Result.Success() : Result.Failure("Insufficient stock");
}
```

### 2.2 CustomerOrder — Inmutabilidad + Estados
```csharp
// Domain/Orders/CustomerOrder.cs
public void AddItem(Guid variantId, Guid vendorId, int quantity, Money unitPrice, ...)
{
    EnsureNotDeliveredOrCancelled(); // INV-11
    if (quantity <= 0) throw new ArgumentException("Quantity must be positive");
    
    var existing = _items.FirstOrDefault(i => i.VariantId == variantId);
    if (existing != null) existing.IncreaseQuantity(quantity);
    else _items.Add(new OrderItem(variantId, vendorId, quantity, unitPrice, ...));
    
    UpdatedAt = DateTime.UtcNow;
}

private void EnsureNotDeliveredOrCancelled()
{
    if (Status == OrderStatus.Delivered || Status == OrderStatus.Cancelled)
        throw new InvalidOperationException("Order is immutable in current status"); // INV-11
}
```

### 2.3 Product — Variante Obligatoria (Physical)
```csharp
// Domain/Products/Product.cs
public void Publish()
{
    if (Type == ProductType.Physical && !HasVariant)
        throw new InvalidOperationException("Physical product requires at least one variant"); // INV-09
    
    if (Status == ProductStatus.Published) 
        throw new InvalidOperationException("Already published");
    
    Status = ProductStatus.Published;
    UpdatedAt = DateTime.UtcNow;
}
```

### 2.4 Authorization — Propiedad + Alcance
```csharp
// Api/Security/AuthorizationPolicies.cs
public class RequireSellerScopeRequirement : IAuthorizationRequirement { }

public class RequireSellerScopeHandler : AuthorizationHandler<RequireSellerScopeRequirement, Product>
{
    protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, 
---

## 3. Matriz de Tests por Invariante

| INV | Tests Unit (Domain) | Tests Integration (API) |
|-----|---------------------|-------------------------|
| INV-01 | `User_Role_AssignedOnce` | `POST /auth/register` → single role |
| INV-02 | `Buyer_Constructor_RequiresUserId` | `GET /buyer/profile` → owns data |
| INV-03 | `Seller_CannotModifyOtherSellerProduct` | `PATCH /products/{id}` → 403 if not owner |
| INV-04 | `Inventory_Reserve_Atomic`, `Concurrent_100_Reservations_NoLostUpdates` | `POST /inventory/add-stock` + concurrent checkout |
| INV-05 | `Checkout_Reserves_15min`, `Timeout_Worker_Releases` | `POST /checkout` → `Cancelled (Expired)` after 15min |
| INV-06 | `OrderItem_Price_Frozen_At_Add` | `POST /cart/items` → price matches `Product.Price` at that moment |
| INV-07 | `Paid_Order_Generates_3_Invoices` | `GET /invoices?orderId={id}` → 3 docs (Master, ZentricDetail, Vendor) |
| INV-08 | `Soft_Delete_Preserves_FK` | `DELETE /products/{id}` → `GET /products/{id}` → 404, but `OrderItem` intact |
| INV-09 | `Physical_Product_Requires_Variant` | `POST /products/{id}/publish` → 400 if no variants |
| INV-10 | `Digital_Product_Return_Rejected` | `POST /returns` with digital line → 400 |
| INV-11 | `Paid_Order_Cannot_Modify_Items` | `PATCH /orders/{id}/items` → 403 if status=Paid |
| INV-12 | `Seller_AddStock_To_Marketplace` | `POST /inventory/add-stock` with Marketplace warehouse → 200 |

---

## 4. Tests de Concurrencia (Críticos)

| Escenario | Herramienta | Criterio de paso |
|-----------|-------------|------------------|
| 100 checkouts concurrentes mismo producto/bodega | NBomber / k6 | 0 lost updates, 0 stock negativo, 100% reservas correctas |
| 50 AddStock concurrentes misma variante/bodega | xUnit Parallel | `AvailableQuantity` = suma correcta |
| 20 ajustes stock simultáneos | xUnit Parallel | Último gana, auditoría completa |
| Checkout + AddStock simultáneo misma variante | Custom test | Checkout reserva disponible; AddStock incrementa disponible |

---

## 5. Validación en CI

```yaml
# .github/workflows/backend-tests.yml
- name: Unit Tests (Domain)
  run: dotnet test Zentric.Tests.Domain --filter "FullyQualifiedName~Inventories|Orders|Products"
  
- name: Integration Tests (Concurrency)
  run: dotnet test Zentric.Tests.Integration --filter "Concurrency"
  
- name: Stress Test (NBomber)
  run: dotnet run --project Zentric.Tests.Performance -- --scenario CheckoutConcurrency
```
        RequireSellerScopeRequirement requirement, Product resource)
    {
        var sellerId = context.User.GetVendorId(); // Claim custom
        if (sellerId == resource.VendorId) // INV-03
            context.Succeed(requirement);
    }
}
```
| **INV-09** | **Producto físico = variante obligatoria** (ADR-0003) | `Product.CanBeSold` + `Product.Publish()` validation | `PhysicalProduct_RequiresVariant`, `DigitalProduct_NoVariantRequired` |
| **INV-10** | **Devolución digital prohibida** (Dominio 10) | `ReturnRequest` constructor + `ReturnsApprovalService` | `DigitalProduct_Return_Rejected` |
| **INV-11** | **Pedido inmutable tras pago**: Contenido no cambia; modificaciones vía cancelación/devolución/ajuste | `CustomerOrder` methods check `Status != Paid/Delivered/Cancelled` | `PaidOrder_CannotModifyItems`, `DeliveredOrder_Immutable` |
| **INV-12** | **Bodega Marketplace visible a todos los vendedores para `AddStock`** (Addendum 2026-10-17) | `AddStockCommand` validation: `warehouse.Type == Marketplace && warehouse.IsActive` | `Seller_CanAddStockToMarketplaceWarehouse`, `Seller_CannotAddStockToInactiveWarehouse` |
