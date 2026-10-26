# Backend — Decisiones de Arquitectura DDD — Zentric

**Fuente:** `../frontendSDD/zentric-domain-sdd.md` sección 5
**Estado:** Decisiones vinculantes para `Zentric.Domain`, `Zentric.Application`, `Zentric.Infrastructure`

---

## 1. Agregados y Límites de Consistencia

| Agregado | Raíz | Entidades hijas | Justificación |
|----------|------|-----------------|---------------|
| `Product` | `Product` | `ProductVariant`, `VariantAttribute` | Variante es detalle de producto; SKU único por producto. Consistencia: publicar requiere variantes válidas. |
| `CustomerOrder` | `CustomerOrder` | `OrderItem`, `DigitalDeliveryRecord` | Unifica Carrito + Pedido. Estados `Cart → Paid → Delivered`. Consistencia: items, total, transiciones. |
| `FulfillmentOrder` | `FulfillmentOrder` | `FulfillmentItem` | Subdivisión por `VendorId` + `WarehouseId`. Ciclo `Packed → Dispatched → Delivered` independiente. |
| `Seller` | `Seller` | — | Perfil tienda + bodegas. Onboarding atómico con primera `Warehouse` (ADR-0025). |
| `Warehouse` | `Warehouse` | — | Entidad independiente. `Marketplace` (VendorId=null) vs `Vendor` (VendorId=Seller). |
| `Inventory` | `Inventory` | — | **Clave compuesta** `VariantId + WarehouseId` (ADR-0002). No es hija de `ProductVariant`. |
| `ReturnRequest` | `ReturnRequest` | — | Ciclo `Requested → Approved/Rejected → Refunded`. Scope por `VendorId`. |

**Regla:** No referenciar agregados por navegación fuera del límite. Usar IDs (`Guid`) + repositorios.

---

## 2. Value Objects

| VO | Inmutabilidad | Operaciones | Uso |
|----|---------------|-------------|-----|
| `Money` | ✅ | `Add`, `Subtract`, `Multiply`, `Compare`, `Allocate` | `Product.Price`, `OrderItem.UnitPrice`, `Invoice.Amount` |
| `VariantAttribute` | ✅ | `Equals` (Name+Value) | `ProductVariant.Attributes` |
| `Address` | ✅ | — | `Buyer.DefaultShippingAddress`, `Warehouse.Location` (parcial) |
---

## 7. Anti-Patrones Prohibidos

| Anti-Patrón | Por qué | Alternativa |
|-------------|---------|-------------|
| Entidad expone `List<T>` mutable | Rompe invariantes | `IReadOnlyCollection<T>` + métodos `AddXxx` |
| Repositorio expone `IQueryable` | Leaky abstraction | Métodos específicos (`GetByVendorId`, `Search`) |
| Lógica de negocio en Controller/Handler | No testeable, acopla HTTP | Domain Services + Application Commands |
| `Entity` referencia otro Agregado por navegación | Rompe límites de consistencia | Solo `Guid` ID + Repositorio |
| Transacción distribuida por defecto | Complejidad, fallos silenciosos | Outbox + Saga coreografiada |
| `Delete` físico (`DELETE FROM`) | Pérdida integridad histórica | Soft delete (`DeletedAt` + `IsDeleted`) |
| Exceptions para flujo de negocio | Control flow costoso, oculto | `Result<T>` / `Result` pattern |

---

## 8. Testing de Arquitectura

| Test | Herramienta | Qué verifica |
|------|-------------|--------------|
| **ArchUnitNET** | `ArchUnitNET` | `Domain` no referencia `Application`, `Infrastructure`, `AspNetCore`, `EF Core` |
| **Bounded Context Boundaries** | Custom test | No `using Zentric.Infrastructure` en `Domain`/`Application` |
| **Agregado Boundaries** | Custom test | No navegación cruzada entre agregados (solo IDs) |
| **Soft Delete Global** | Integration test | `DELETE` → `IsDeleted=true`, `SELECT` no retorna |
| **Outbox Persistence** | Integration test | `SaveChanges` → `OutboxMessages` count +1, mismo `TransactionId` |
| **Concurrency Inventory** | Stress test | 100 concurrent reservations → 0 lost updates |
| `InvoiceLine` | ✅ | `CalculateTax()` | `Invoice.Lines` |

**Regla:** VOs sin identidad. Igualdad por valor estructural. Sin setters públicos.

---

## 3. Eventos de Dominio

- Publicados **tras** transacción exitosa (Outbox pattern).
- Payload mínimo: IDs + datos necesarios para consumidores.
- Versionados (`Version` en payload). Consumidores toleran campos extra.
- 7 eventos definidos (ver `02-eventos-dominio.md`).
