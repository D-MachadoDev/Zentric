# Infraestructura — Mapa de Entidades y Persistencia Relacional

> Especificación canónica y matriz de auditoría anti-amnesia para el mapeo entre las entidades del Dominio, los modelos relacionales de EF Core y el esquema físico en PostgreSQL.

---

## 1. Principio y Mandato Anti-Amnesia

Tal como establece la directiva arquitectónica del proyecto (*AGENTS.md, Sección 2.4*), una de las fallas más críticas en sistemas empresariales basados en Domain-Driven Design y persistencia relacional es olvidar agregados o entidades preexistentes al introducir nuevas funcionalidades, causando desconexiones en las migraciones o en el rastreador de cambios del contexto de datos.

Este documento constituye la **Fuente Única de Verdad (SSoT)** para la totalidad de objetos de negocio persistentes. Cualquier modificación en `ZentricDbContext`, en las migraciones de EF Core o en los adaptadores de persistencia debe cotejarse contra este catálogo exhaustivo.

---

## 2. Resumen Ejecutivo del Mapeo Relacional

| Dimensión | Métrica Auditada | Detalle Arquitectónico |
|---|---|---|
| **Agregados Raíz de Negocio** | **10** | `User`, `Buyer`, `Product`, `Inventory`, `Warehouse`, `CustomerOrder`, `FulfillmentOrder`, `Invoice`, `ReturnRequest`, `PaymentReceipt` |
| **Entidades de Auditoría Transaccional** | **1** | `RefundAuditRecord` (control de reembolsos extraordinarios de administrador) |
| **Conjuntos de Entidades (`DbSet`)** | **14** | Los 10 agregados raíz + `RefundAuditRecords` + 3 tablas relacionales con DbSet propio: `RefundCredits`, `StockAdjustments`, `DigitalDeliveries` |
| **Entidades Hijas y Relaciones de Composición** | **6** | `OrderItemDbModel`, `ShipmentDbModel`, `ProductVariantDbModel`, `DigitalDeliveryRecordDbModel`, `RefundCreditDbModel`, `StockAdjustmentDbModel` |
| **Puertos de Repositorio** | **11** | 10 repositorios de agregados + `IRefundAuditRepository` |
| **Adaptadores de Salida (Repositorios Concretos)** | **11** | Implementados en `Zentric.Infrastructure.Persistence.Repositories` |
| **Mapeadores de Entidad ↔ DbModel** | **11** | Clases estáticas dedicadas en `Zentric.Infrastructure.Persistence.Mappers` con aislamiento total |
| **Migraciones de Esquema EF Core** | **15** | Historial canónico secuencial en `backend/Zentric.Infrastructure/Migrations/` |
| **Cobertura de Pruebas Unitarias** | **457 en verde** | 100% de pruebas unitarias pasando sin fallos ni advertencias |

---

## 3. Matriz Exhaustiva de Entidades y Persistencia

La siguiente tabla cataloga todos los objetos con persistencia en el sistema, vinculando cada concepto del Dominio con su contraparte en Infraestructura y en PostgreSQL:

| Identificador | Entidad de Dominio | Bounded Context | Tipo Arquitectónico | Modelo de Persistencia (`DbModel`) | Conjunto en `DbContext` | Tabla en PostgreSQL | Puerto de Salida | Adaptador Concreto | Mapeador Dedicado |
|---|---|---|---|---|---|---|---|---|---|
| **ENT-01** | `User` | Usuarios e Identidad | Agregado Raíz | `UserDbModel` | `Users` | `Users` | `IUserRepository` | `UserRepository` | `UserMapper` |
| **ENT-02** | `Buyer` | Compradores | Agregado Raíz | `BuyerDbModel` | `Buyers` | `Buyers` | `IBuyerRepository` | `BuyerRepository` | `BuyerMapper` |
| **ENT-03** | `Product` | Catálogo de Productos | Agregado Raíz | `ProductDbModel` | `Products` | `Products` | `IProductRepository` | `ProductRepository` | `ProductMapper` |
| **ENT-04** | `ProductVariant` | Catálogo de Productos | Entidad Hija | `ProductVariantDbModel` | *(Navegación en `Products`)* | `ProductVariants` | *(Vía `IProductRepository`)* | *(Vía `ProductRepository`)* | `ProductMapper` |
| **ENT-05** | `Inventory` | Inventarios | Agregado Raíz | `InventoryDbModel` | `Inventories` | `Inventories` | `IInventoryRepository` | `InventoryRepository` | `InventoryMapper` |
| **ENT-06** | `StockAdjustmentRecord` | Inventarios | Entidad Hija | `StockAdjustmentDbModel` | `StockAdjustments` | `StockAdjustments` | *(Vía `IInventoryRepository`)* | `InventoryRepository` | `InventoryMapper` |
| **ENT-07** | `Warehouse` | Bodegas y Almacenes | Agregado Raíz | `WarehouseDbModel` | `Warehouses` | `Warehouses` | `IWarehouseRepository` | `WarehouseRepository` | `WarehouseMapper` |
| **ENT-08** | `CustomerOrder` | Pedidos de Compra | Agregado Raíz | `CustomerOrderDbModel` | `CustomerOrders` | `CustomerOrders` | `ICustomerOrderRepository` | `CustomerOrderRepository` | `CustomerOrderMapper` |
| **ENT-09** | `OrderItem` | Pedidos de Compra | Entidad Hija | `OrderItemDbModel` | *(Navegación en `CustomerOrders`)* | `OrderItems` | *(Vía `ICustomerOrderRepository`)* | *(Vía `CustomerOrderRepository`)* | `CustomerOrderMapper` |
| **ENT-10** | `DigitalDeliveryRecord` | Pedidos de Compra | Entidad Hija | `DigitalDeliveryRecordDbModel` | `DigitalDeliveries` | `DigitalDeliveries` | *(Vía `ICustomerOrderRepository`)* | *(Vía `CustomerOrderRepository`)* | `CustomerOrderMapper` |
| **ENT-11** | `FulfillmentOrder` | Logística y Despacho | Agregado Raíz | `FulfillmentOrderDbModel` | `FulfillmentOrders` | `FulfillmentOrders` | `IFulfillmentOrderRepository` | `FulfillmentOrderRepository` | `FulfillmentOrderMapper` |
| **ENT-12** | `Shipment` | Logística y Despacho | Entidad Hija | `ShipmentDbModel` | *(Navegación en `FulfillmentOrders`)* | `Shipments` | *(Vía `IFulfillmentOrderRepository`)* | *(Vía `FulfillmentOrderRepository`)* | `FulfillmentOrderMapper` |
| **ENT-13** | `ReturnRequest` | Devoluciones | Agregado Raíz | `ReturnRequestDbModel` | `ReturnRequests` | `ReturnRequests` | `IReturnRequestRepository` | `ReturnRequestRepository` | `ReturnRequestMapper` |
| **ENT-14** | `Invoice` | Facturación | Agregado Raíz | `InvoiceDbModel` | `Invoices` | `Invoices` | `IInvoiceRepository` | `InvoiceRepository` | `InvoiceMapper` |
| **ENT-15** | `PaymentReceipt` | Pagos y Recaudo | Agregado Raíz | `PaymentReceiptDbModel` | `PaymentReceipts` | `PaymentReceipts` | `IPaymentReceiptRepository` | `PaymentReceiptRepository` | `PaymentReceiptMapper` |
| **ENT-16** | `RefundCredit` | Pagos y Recaudo | Entidad Hija | `RefundCreditDbModel` | `RefundCredits` | `RefundCredits` | *(Vía `IPaymentReceiptRepository`)* | *(Vía `PaymentReceiptRepository`)* | `PaymentReceiptMapper` |
| **ENT-17** | `RefundAuditRecord` | Devoluciones / Auditoría | Entidad / Registro Auditoría | `RefundAuditDbModel` | `RefundAudits` | `RefundAudits` | `IRefundAuditRepository` | `RefundAuditRepository` | `RefundAuditMapper` |

---

## 4. Estrategia de Mapeo para Objetos de Valor y Tipos de Apoyo

Los objetos del Dominio que no poseen identidad propia persistente (*Value Objects*) se aplanan en columnas relacionales de la tabla contenedora o se transforman mediante convertidores de valor en EF Core:

### 4.1 Moneda y Dinero (`Money`)
- Se mapea en pares de columnas escalares:
  - Importe numérico: Columna de tipo decimal (`Amount` o prefijada como `UnitPriceAmount`, `TotalAmount`, `RefundedAmount`).
  - Código de divisa: Columna de tipo texto ISO 4217 de 3 caracteres (`Currency` o `UnitPriceCurrency`).
- Invariante relacional: No se permiten importes nulos y las operaciones entre importes exigen coherencia en la divisa declarada.

### 4.2 Dirección Física (`Address`)
- Se descompone en 5 columnas relacionales escalares dentro de las entidades donde reside:
  - En `BuyerDbModel`: `MainAddressStreet`, `MainAddressCity`, `MainAddressState`, `MainAddressZipCode`, `MainAddressCountry`.
  - En `FulfillmentOrderDbModel`: Columnas del snapshot inmutable de entrega `DeliveryAddressStreet`, `DeliveryAddressCity`, etc.

### 4.3 Identificadores y Textos Validados
- `Email`: Persistido como cadena en minúsculas con índice de unicidad en la tabla `Users`.
- `FullName`: Persistido como columna de texto en `Users`.
- `VariantAttribute`: Persistido dentro de los modelos relacionales de variantes como atributos de nombre y valor.

### 4.4 Enumeraciones de Dominio (14 Enums)
- Todas las enumeraciones se persisten como **cadenas de texto legibles** (`HasConversion<string>()`), prohibiendo el almacenamiento como enteros numéricos anónimos:
  - `OrderStatus`, `FulfillmentStatus`, `ReturnStatus`, `ProductStatus`, `ProductType`, `WarehouseType`, `UserRole`, `UserStatus`, `PaymentStatus`, `InvoiceType`, `OrderCancellationCause`, etc.
  - Esto garantiza legibilidad directa en consultas SQL, auditorías en base de datos y consistencia ante reordenamientos de código en C#.

---

## 5. Control de Concurrencia Optimista

Para prevenir condiciones de carrera en operaciones de alta concurrencia (como reservas simultáneas de stock o actualización de estados en pedidos), los agregados críticos incorporan un sello de versión de concurrencia:
- **Columna de control:** `RowVersion` (tipo `xmin` o `byte[]` / `concurrency token`).
- **Comportamiento en EF Core:** Se configura con `.IsRowVersion()` o `.IsConcurrencyToken()`. Ante una colisión donde dos transacciones lean la misma versión e intenten persistir, la segunda transacción lanza `DbUpdateConcurrencyException`, la cual es capturada y traducida en un resultado de fallo de negocio por el pipeline de la aplicación.

---

## 6. Procedimiento Obligatorio de Verificación de Integridad

Antes de considerar terminada cualquier modificación que afecte la persistencia del sistema, el desarrollador o agente debe ejecutar los siguientes tres pasos de validación:

1. **Verificación de Cobertura de DbSets:** Comprobar que ninguna entidad creada en `Zentric.Domain` carezca de su correspondiente `DbModel` y `DbSet` en `ZentricDbContext`.
2. **Verificación de Registro de Dependencias:** Confirmar que todo repositorio concreto esté registrado en `Program.cs` bajo su puerto de interfaz correspondiente.
3. **Verificación de Migraciones y Pruebas:**
   ```bash
   dotnet build backend/Zentric.slnx -warnaserror
   dotnet test backend/Zentric.slnx --filter "FullyQualifiedName!~E2E" --no-build
   ```
   Ambos comandos deben reportar cero advertencias, cero errores y el 100% de las pruebas unitarias en verde.
