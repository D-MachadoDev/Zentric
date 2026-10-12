# Mapa de entidades
# Que objetos debe persistir el sistema

> Este mapa es **especificacion**, no estado: describe QUE entidades existen, como se relacionan
> y donde vive cada una. Por eso va en `Infrastructure/` y no en `orchestrator-state.md`.

> **Regla anti-amnesia:** al construir o revisar la capa de persistencia hay que recorrer
> **las 36 filas completas del mapa (E-001…E-036)**, nunca solo las que exige la tarea del momento.
> Una entidad olvidada no falla al compilar: falla meses despues, cuando nadie recuerda que existia.
> **Esta regla ya falló una vez y es el motivo del renumerado:** `RefundCredit` y `StockAdjustmentRecord`
> nacieron con `DbSet` propio en `ZentricDbContext` y **no entraron en el mapa**, y la fila de `Payment`
> apuntaba a `Zentric.Domain/Payments/Payment.cs`, un archivo que no existe (la clase real es
> `PaymentReceipt`). Corregido el 2026-10-06.

---

## 5. Mapa de entidades (anti-amnesia)

> **Procedimiento (anti-amnesia, [AGENTS.md, secciones 2.4](../../AGENTS.md#24-auditoria-de-mapeo-completo-anti-amnesia-de-entidades) y [4.1](../../AGENTS.md#41-domain-architect-agent)):** antes de cualquier cambio estructural se re-enumera el árbol completo de `Zentric.Domain` (y su reflejo en Application/Infrastructure/Api) contra esta tabla. Ninguna entidad puede quedar fuera de la persistencia sin registrarse aquí. Estado de verificación: `[CONFIRMADO]` por enumeración directa del árbol, `.csproj`, `Program.cs`, `ZentricDbContext` y las suites de `Zentric.Tests` (re-verificado 2026-10-06).

### 5.1 Resumen ejecutivo

| Métrica | Valor |
|---|---|
| Filas mapeadas | **36** (E-001…E-036) |
| Cobertura | **36/36 (100 %)** — 0 huérfanos, 0 fantasmas |
| Agregados raíz | 10 (`User`, `Buyer`, `Product`, `Inventory`, `Warehouse`, `CustomerOrder`, `FulfillmentOrder`, `Invoice`, `ReturnRequest`, `PaymentReceipt`) |
| Tablas en `ZentricDbContext` | **12** `DbSet<*DbModel>` — las 10 de los agregados raíz más `RefundCredits` (E-035) y `StockAdjustments` (E-036), tablas hijas con fila propia |
| Puertos de dominio | 10 repositorios + 4 puertos de servicio (`IPaymentGatewayService`, `IAuthTokenService`, `IPasswordHasher`, `IClock`); + `IUnitOfWork` en Application |
| Eventos de dominio | **7 definidos, 6 emitidos.** `OrderCreated`, `OrderPaid`, `PhysicalProductShipped`, `PartialFulfillmentCancelled`, `ReturnApproved` y `StockAdjusted` se emiten y se despachan (ADR-0007); **solo `ReturnApproved` tiene consumidor** (`ReturnApprovedEventHandler` → `ReturnToUsedStock`), los otros cinco se despachan sin handler. `CartExpired` está definido pero **aún no se emite**: el record existe, falta publicarlo desde el vencimiento del carrito (decidido 2026-10-03). Ver [04-domain-events.md](../Domain/04-domain-events.md). |
| Pruebas asociadas | **551 casos en verde** (61 archivos `*Tests.cs`) |

### 5.2 Tabla de entidades (parte 1: E-001…E-008)

| ID | Entidad | Tipo | Código | Estado verificado (2026-09-26) | Pruebas |
|---|---|---|---|---|---|
| **E-001** | `User` | Agregado raíz | `Zentric.Domain/Users/User.cs` | ✅ Implementado — `IdentityDocument` con guarda y unicidad verificada en `CreateUserCommandHandler` (H-05 cerrado; falta re-verificar constraint en BD). Eventos de usuario aún `// TODO` | `Zentric.Tests/Users/UserTests.cs` |
| **E-002** | `Buyer` | Agregado raíz | `Zentric.Domain/Buyers/Buyer.cs` | ✅ **VO `Address` implementado** (inmutable: `Street`, `City`, `State`, `ZipCode`, `Country`) y persistido en columnas `MainAddress*`, verificado en PostgreSQL. `MainAddress` obligatoria y `AdditionalAddresses` opcional, segun Dominio 2 | `Buyers/AddressTests.cs` |
| **E-003** | `Product` | Agregado raíz | `Zentric.Domain/Products/Product.cs` | ✅ Implementado — variantes obligatorias en `Physical` (CAT-03/ADR-0003); usa `VendorId` y `ProductStatus`; `CanBeSold` con variante vendible | `Products/ProductTests.cs` |
| **E-004** | `ProductVariant` | Entidad hija | `Zentric.Domain/Products/ProductVariant.cs` | ✅ Implementado — SKU = `VariantId`, único dentro del producto (ADR-0002) | `Products/ProductVariantTests.cs` |
| **E-005** | `VariantAttribute` | Value Object | `Zentric.Domain/Products/ValueObjects/VariantAttribute.cs` | ✅ Implementado — Q-11 ratificada 2026-09-27: texto libre, obligatorio, máx. 50 caracteres | `Products/VariantAttributeTests.cs` |
| **E-006** | `Money` | Value Object | `Zentric.Domain/Products/ValueObjects/Money.cs` | ✅ Implementado — aritmética homogénea de moneda | `Products/MoneyTests.cs` |
| **E-007** | `Inventory` | Agregado raíz | `Zentric.Domain/Inventories/Inventory.cs` | ⚠️ Parcial — H-01 y H-02 **corregidos**; Q-09 cerrado (`ReceiveReturnedStock`, antes `ReciveReturnedStock`); queda H-06 (reloj directo) | `Inventories/InventoryTests.cs` |
| **E-008** | `Warehouse` | Agregado raíz | `Zentric.Domain/Warehouses/Warehouse.cs` | ✅ Implementado — `WarehouseType` usa `Vendor`; Q-05/Q-09 cerrados (mensajes ya en `vendor`) | `Warehouses/WarehouseTests.cs` |

### 5.3 Tabla de entidades (parte 2: E-009…E-027)

| ID | Entidad | Tipo | Código | Estado verificado (2026-09-26) | Pruebas |
|---|---|---|---|---|---|
| **E-009** | `CustomerOrder` | Agregado raíz | `Zentric.Domain/Orders/CustomerOrder.cs` | ✅ Implementado — estados `Cart → PendingPayment → Paid → Dispatched → Delivered / Cancelled` (ADR-0005); checkout, pago y cancelación por timeout operativos | `Orders/CustomerOrderTests.cs` |
| **E-010** | `OrderItem` | Entidad hija | `Zentric.Domain/Orders/Entities/OrderItem.cs` | ✅ Implementado — usa `Money`; pertenece a E-009. El precio unitario es un snapshot inmutable tomado de `Product.Price` al añadir la línea ([PED-04](../Domain/06-business-rules.md), [ADR-0020](../Adr/0020-precio-congelado-y-credito-parcial-por-linea.md)) | `Orders/CustomerOrderTests.cs`, `Application/Orders/AddOrderItemCommandHandlerTests.cs` |
| **E-011** | `FulfillmentOrder` | Agregado raíz | `Zentric.Domain/Logistics/FulfillmentOrder.cs` | ✅ Implementado — nace en `PendingPack`; `Pack`/`Dispatch`/`Deliver`/`CancelDueToNoStock` (Stock Fantasma). Ver verificación V-01 ([sección 9.2](#92-verificaciones-de-consistencia-pendientes)) | `Logistics/FulfillmentOrderTests.cs` |
| **E-012** | `Shipment` | Entidad hija | `Zentric.Domain/Logistics/Entities/Shipment.cs` | ✅ Implementado — guía por bodega; dispara `PhysicalProductShippedDomainEvent` al despachar | `Logistics/FulfillmentOrderTests.cs` |
| **E-013** | `Invoice` | Agregado raíz | `Zentric.Domain/Billing/Invoice.cs` | ✅ Implementado — tipos `Master`, `ZentricDetail`, `VendorDetail` (ADD-003 cumplido) | `Billing/InvoiceTests.cs` |
| **E-014** | `ReturnRequest` | Agregado raíz | `Zentric.Domain/Returns/ReturnRequest.cs` | ✅ Implementado — doble aprobación; `ReturnApprovedEvent` → handler → `ReturnToUsedStock` (H-14 cerrado; ADD-002 cumplido) | `Returns/ReturnRequestTests.cs` |
| **E-015** | 10 puertos de repositorio | Puertos de salida | `Zentric.Domain/**/Ports/` (`IUserRepository`, `IBuyerRepository`, `IProductRepository`, `IInventoryRepository`, `IWarehouseRepository`, `ICustomerOrderRepository`, `IFulfillmentOrderRepository`, `IInvoiceRepository`, `IReturnRequestRepository`, `IPaymentReceiptRepository`) | ✅ Implementados por E-022 e inyectados | Cubiertos por suites de handlers |
| **E-016** | `IUnitOfWork` | Puerto de salida | `Zentric.Application/Common/Ports/IUnitOfWork.cs` | ✅ Implementado por E-022; persiste y **despacha eventos de dominio** | Cubierto por suites DI |
| **E-017** | `IDomainEventDispatcher` + `DomainEventNotification<T>` | Puerto + adaptador de eventos | `Zentric.Infrastructure/Persistence/IDomainEventDispatcher.cs` · `Zentric.Application/Common/Models/DomainEventNotification.cs` | ✅ Implementado — los eventos se publican vía dispatcher propio (ADR-0007); único handler registrado: `ReturnApprovedEventHandler` | Cubierto por suites DI |
| **E-018** | `Result` / `Result<T>` | Tipo de aplicación | `Zentric.Application/Common/Models/Result.cs` | ✅ Implementado — sin excepciones de flujo | Suites de validadores/pipeline |
| **E-019** | 25 Commands CQRS | Casos de uso | `Zentric.Application/<Contexto>/Commands/` (Users, Warehouses, Catalog, Inventories, Orders, Logistics, Returns, Billing) | ✅ Implementados con `Result<T>`, validadores y handler | 25 archivos + sus suites de handler |
| **E-020** | 14 archivos de Queries CQRS (los `GET` de los 41 endpoints) | Casos de uso | `Zentric.Application/<Contexto>/Queries/` | ✅ Implementados (Users, Warehouses, Catalog, Inventories, Orders, Logistics, Returns, Billing) | `Application/Queries/QueryHandlersTests.cs` |
| **E-021** | `ZentricDbContext` + `*DbModel` + Mappers + `UnitOfWork` | Datos (adaptador) | `Zentric.Infrastructure/Persistence/` | ✅ Implementado — **12 `DbSet<*DbModel>`**; aislamiento EF respecto a Domain (H-13 cerrado); mappers 1:1 | — |
| **E-022** | 10 repositorios EF | Adaptadores de salida | `Zentric.Infrastructure/Persistence/Repositories/` | ✅ Implementados (uno por agregado/puerto) | — |
| **E-023** | **10 migraciones EF** (`InitialCreate`, `CompleteSchema`, `AddBackgroundServicesAndUpdates`, `AddVendorIdToOrderItem`, `AddVendorIdToInvoice`, `AddPaymentReceipts`, `SplitBuyerAddressIntoColumns`, `AddRefundCredits`, + el `Designer` de cada una) | Datos | `Zentric.Infrastructure/Migrations/` | ✅ Generadas **y aplicadas**: `dotnet ef database update` en compose local y `Database.Migrate()` bajo Testcontainers ([sección 11.2](#112-validaciones-no-ejecutadas-honestidad-de-evidencia)) | — |
| **E-024** | `Program.cs` + 9 controladores (41 endpoints) | Puntos de entrada | `Zentric.Api/` | ✅ Implementado — Problem Details + Swagger (Bearer), XML docs | — |
| **E-025** | Suite `Zentric.Tests` (62 archivos, 562 casos) | Pruebas | `Zentric.Tests/` | ✅ En verde al 2026-10-07 (562/562); cubre dominio, aplicación, seguridad (auth) y contenedor DI | — |
| **E-026** | `Zentric.slnx` | Configuración | raíz | ✅ Ensambla los 5 proyectos | — |
| **E-027** | Skill `generic-sdd-agent` v7.0.1 + `sync-skill.ps1` | Operación | `.agents/skills/generic-sdd-agent/` | ✅ Repo y copia instalada alineadas (C-09 corregida); re-verificable con `Get-FileHash` ([sección 11.3](#113-cómo-re-verificar-comandos-de-referencia)) | — |

### 5.4 Tabla de entidades (parte 3: E-028…E-036)

| ID | Entidad | Tipo | Código | Estado verificado (2026-09-26) | Notas |
|---|---|---|---|---|---|
| **E-028** | Documentos `backendSDD/` | Documentos (SSoT) | `backendSDD/**` | ✅ Índice completo en la [sección 6](#6-índice-de-especificaciones-ssot) | Indexados por este orquestador |
| **E-029** | `ZENTRIC.md` | Biblia (Ley) | raíz | ✅ Intacta + ADDENDA (ADD-001…003) | Ver C-10 en la [sección 10.3](#103-contradicciones-de-especificación--cierre) |
| **E-030** | `ADR-0001`…`ADR-0006` | Decisiones | `backendSDD/Adr/` | ✅ Aprobadas por el Owner | Detalle en la [sección 8](#8-decisiones-adrs-y-addenda) |
| **E-031** | `backend/Dockerfile` + `frontend/Dockerfile` | Infraestructura / Despliegue | **no** está en la raíz: cada proyecto tiene el suyo | ✅ Multi-stage .NET 10 SDK → ASP.NET 10 (EXPOSE 8080) | [Infrastructure/02-containerization-and-deployment.md](02-containerization-and-deployment.md) |
| **E-032** | `docker-compose.yml` | Infraestructura / Orquestación | raíz | ✅ PostgreSQL 16 + API | [Infrastructure/02-containerization-and-deployment.md](02-containerization-and-deployment.md) |
| **E-033** | `CheckoutTimeoutService` | BackgroundService | `Zentric.Infrastructure/BackgroundServices/CheckoutTimeoutService.cs` | ✅ Implementado — expira pedidos a los 15 min y libera stock; registra log de cada barrido | [Infrastructure/03-background-services.md](03-background-services.md) |
| **E-034** | `PaymentReceipt` | Agregado raíz | `Zentric.Domain/Payments/PaymentReceipt.cs` | ✅ Implementado y **persistido** — invariante 9 con `Approve`/`Decline` idempotentes y `Refund` (crédito a favor). `DbSet<PaymentReceiptDbModel>` + `PaymentReceiptMapper` + `IPaymentReceiptRepository`, verificado en PostgreSQL. `PayOrderCommandHandler` lo emite siempre, incluso en rechazo. **Antes figuraba erróneamente como `Payment` sobre `Payments/Payment.cs`, archivo inexistente** (corregido 2026-10-06) | `Payments/PaymentReceiptTests.cs`, `Application/Orders/PayOrderCommandHandlerTests.cs` |
| **E-035** | `RefundCredit` | Entidad de `PaymentReceipt`, tabla propia | `Zentric.Domain/Payments/RefundCredit.cs` | ✅ Implementado y **persistido** — `DbSet<RefundCreditDbModel>` (`RefundCredits`) + fila en `PaymentReceiptDbModel.Credits`, mapeado por `PaymentReceiptMapper`. **Añadida al mapa el 2026-10-06: existía en el `DbContext` sin estar registrada (fallo de la regla anti-amnesia)** | `Payments/PaymentReceiptTests.cs` |
| **E-036** | `StockAdjustmentRecord` | Entidad hija de `Inventory`, tabla propia | `Zentric.Domain/Inventories/Inventory.cs` | ✅ Implementado y **persistido** — `DbSet<StockAdjustmentDbModel>` (`StockAdjustments`) + `InventoryMapper.WithAdjustments` + escritura en `InventoryRepository`. Origen del `StockAdjustedDomainEvent`. **Añadida al mapa el 2026-10-06: existía en el `DbContext` sin estar registrada (fallo de la regla anti-amnesia)** | `Inventories/InventoryRepositoryTests.cs` |

### 5.5 Cierre del mapa

- **Ajenos / generados (clasificados, no mapeados):** `bin/`, `obj/`, `.git/`, `.agents/`, `.github/`, `LICENSE`, `.gitignore`, `.vscode/`, `appsettings.Development.json`.
- **Huérfanos:** ninguno. `Software-arquitecture.md` (0 bytes) y el duplicado `03-value-objects.md` fueron eliminados el 2026-09-18.
- **Fantasmas resueltos (100 %):** eventos de dominio + dispatcher, 14 puertos de dominio (10 repositorios + `IPaymentGatewayService`, `IAuthTokenService`, `IPasswordHasher`, `IClock`), `InventoryReservationService`, `ReturnsApprovalService`, `OrderFulfillmentProgressSynchronizer`, `CheckoutTimeoutService`, los 25 commands con validadores y controladores, y Swagger UI en `/swagger`.
- **Clasificados, no mapeados a propósito:** enumeraciones de dominio (`OrderStatus`, `FulfillmentStatus`, `ReturnStatus`, `ProductStatus`, `ProductType`, `WarehouseType`, `UserRole`, `UserStatus`, `PaymentStatus`, `InvoiceType`, `OrderCancellationCause`) porque se persisten como columna escalar; value objects que viven en columnas (`Email`, `FullName`, `Money`, `Address`, `VariantAttribute`); tipos de apoyo (`Result`, `Entity<T>`, `IDomainEvent`, `DomainEventNotification<T>`, `PaymentResult`, `AuthToken`, `FeeSplit`, `PlatformFeePolicy`, `MixedCurrencyException`); y los 7 registros de evento de dominio, que se serializan en la cola de notificaciones y no en tablas. **Ninguno de ellos necesita fila porque no tiene tabla propia: los que sí la tienen (E-035, E-036) ya están arriba.**
- **Regla de deriva:** cualquier entidad nueva debe (1) sumarse al dominio respetando el lenguaje ubicuo, (2) mapearse en `ZentricDbContext` + `DbModel` + `Mapper` + repositorio, (3) sumar su fila aquí con evidencia de pruebas y (4) actualizar las specs de `backendSDD/` en el mismo cambio.
- `[RIESGO]` Las herramientas de búsqueda pueden no indexar rutas no versionadas (falso negativo comprobado en etapas previas). Ante cualquier carpeta nueva sin commitear, usar escaneo directo por archivo.

