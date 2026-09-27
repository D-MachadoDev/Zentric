# Capa de Infraestructura - Persistencia y Adaptadores

Este documento define la estrategia de acceso a datos para zentric.

## 1. ORM y Base de Datos
- **Proveedor:** PostgreSQL.
- **ORM:** Entity Framework Core 10 (`Npgsql.EntityFrameworkCore.PostgreSQL`).
- **Contexto Principal:** `ZentricDbContext` ubicado en `Zentric.Infrastructure.Persistence`.

## 2. Mapeo de Entidades (Entity Mapping Audit)
Para evitar amnesia de entidades (Regla 2.4 de AGENTS.md), el DbContext incluye obligatoriamente:
1. `Users` (Usuario general, ValueObjects: FullName, Email)
2. `Buyers` (Compradores)
3. `Products` (Agregado Raíz)
   - *OwnsMany:* `Variants` (SKUs)
     - *OwnsMany:* `Attributes` (Talla, Color)
4. `Inventories` (Manejo de stock: físico, reservado, dañado, usado)
5. `Warehouses` (Bodegas físicas)
6. `CustomerOrders` (Pedidos de compra)
   - *OwnsMany:* `Items`
7. `FulfillmentOrders` (Despachos logísticos)
   - *OwnsMany:* `Shipments`
8. `ReturnRequests` (Devoluciones, prohibido para digitales)
9. `Invoices` (Facturas maestras y de vendedor)

## 3. Repositorios Concretos (Adaptadores de Salida)
Implementan las interfaces definidas en la capa de Aplicación y Dominio:
- `UserRepository`: Administra la persistencia y consulta de usuarios.
- `BuyerRepository`: Administra la persistencia de compradores.
- `WarehouseRepository`: Administra la persistencia de bodegas centrales y de vendedor.
- `ProductRepository`: Administra la persistencia de productos y catálogo.
- `InventoryRepository`: Administra existencias y contadores de stock distribuido.
- `CustomerOrderRepository`: Administra la persistencia de pedidos y líneas de compra.
- `FulfillmentOrderRepository`: Administra la persistencia de despachos y guías de envío.
- `ReturnRequestRepository`: Administra la persistencia de solicitudes de devolución.
- `InvoiceRepository`: Administra facturas maestras y detalles de vendedores.

> `[CONFIRMADO]` **(2026-09-23)**: **Los 9 Repositorios están 100% implementados** con métodos de comando (escritura) y de consulta CQRS (`GetAllAsync`, `GetByIdAsync`, `GetByOrderIdAsync`, `GetByVariantIdAsync`), inyectados en el contenedor de dependencias (`Program.cs`).

## 4. Mapeo y Aislamiento de Dominio (Anti-Contaminación)
Para cumplir estrictamente con [AGENTS.md:2.1](../../AGENTS.md#21-regla-de-dependencia-estricta-y-aislamiento-de-capas), las entidades de dominio no contienen anotaciones de EF Core. Se utilizan modelos de persistencia dedicados (`*DbModel`) y mapeadores explícitos (`*Mapper`):
- `UserDbModel` ↔ `UserDbModelMapper` ↔ `User`
- `BuyerDbModel` ↔ `BuyerMapper` ↔ `Buyer`
- `WarehouseDbModel` ↔ `WarehouseMapper` ↔ `Warehouse`
- `ProductDbModel` ↔ `ProductMapper` ↔ `Product`
- `InventoryDbModel` ↔ `InventoryMapper` ↔ `Inventory`
- `CustomerOrderDbModel` ↔ `CustomerOrderMapper` ↔ `CustomerOrder`
- `FulfillmentOrderDbModel` ↔ `FulfillmentOrderMapper` ↔ `FulfillmentOrder`
- `ReturnRequestDbModel` ↔ `ReturnRequestMapper` ↔ `ReturnRequest`
- `InvoiceDbModel` ↔ `InvoiceMapper` ↔ `Invoice`

## 5. Patrón Unit of Work y Despacho de Eventos
- `UnitOfWork`: Implementa `IUnitOfWork` gestionando transacciones y persistencia atómica mediante `ZentricDbContext.SaveChangesAsync`.
- `DomainEventDispatcher`: Publica los eventos de dominio (`IDomainEvent`) a través del mediador tras guardar los cambios exitosamente en la base de datos.

## 6. Estrategia de Migraciones
Las migraciones se generan usando `Zentric.Api` como Composition Root (Startup Project). 
- **Migraciones registradas:**
  1. `20260918192602_InitialCreate`: Esquema base relacional.
  2. `20260918193539_CompleteSchema`: Tablas de todos los 9 agregados.
  3. `20260920003544_AddBackgroundServicesAndUpdates`: Ajustes de índices y compatibilidad.

## 7. Estado de Desviaciones Históricas

| ID | Desviación | Evidencia | Estado |
|---|---|---|---|
| [H-13](../SDD.md) | Mapeo de agregados de dominio sin aislamiento | Se crearon 10 `DbModels` y 9 `Mappers` dedicados | ✅ **Cerrado** (Aislamiento 100% alcanzado) |
| [H-07](../SDD.md) | Falta de implementación de `IUserRepository` | Implementado en `UserRepository.cs` | ✅ **Cerrado** |
| — | Ausencia de `IUnitOfWork` | Implementado en `UnitOfWork.cs` y registrado en DI | ✅ **Cerrado** |



