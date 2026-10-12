# 05. Puertos (Ports)

Siguiendo el principio de **Inversión de Dependencias** y la **Arquitectura Hexagonal**, este documento lista los **puertos de salida del Dominio**: las interfaces que el Dominio necesita para leer/persistir datos y para delegar en lo que no le pertenece. Las implementaciones reales residen en `Zentric.Infrastructure`.

Inventario verificado: **14 puertos de dominio** — 10 de repositorio y 4 de servicio/colaborador.

## 1. Puertos de repositorio

| Puerto | Agregado | Métodos | Tests de Integración |
|---|---|---|---|
| `IUserRepository` | `User` | `GetByIdAsync`, `GetByEmailAsync`, `GetAllAsync(role?)`, `IsEmailUniqueAsync`, `IsIdentityDocumentUniqueAsync`, `AddAsync`, `UpdateAsync` | `LoginCommandHandlerTests`, `CreateUserCommandHandlerTests`, `BlockActivateUserCommandHandlerTests` |
| `IBuyerRepository` | `Buyer` | `GetByIdAsync`, `AddAsync`, `UpdateAsync` | `GetBuyerByIdQueryTests` |
| `IProductRepository` | `Product` | `GetByIdAsync`, `GetByVariantIdAsync`, `GetAllAsync(vendorId?)`, `GetPagedAsync(vendorId, skip, take)`, `AddAsync`, `UpdateAsync` | `ProductTests`, `PublishProductCommandHandlerTests`, `CreateProductCommandHandlerTests` |
| `IWarehouseRepository` | `Warehouse` | `GetByIdAsync`, `GetAllAsync(vendorId?)`, `AddAsync`, `UpdateAsync` | `WarehouseTests`, `CreateWarehouseCommandHandlerTests` |
| `IInventoryRepository` | `Inventory` | `GetByIdAsync`, `GetByVariantAndWarehouseAsync`, `GetByVariantIdAsync`, `GetTotalAvailableStockAsync`, `GetListAsync(vendorId?)`, `AddAsync`, `UpdateAsync`, `LoadWithHistoryAsync`, `SaveAdjustmentAsync`, `TryReserveStockAsync(id, n)`, `ReleaseReservedStockAsync(id, n)` | `InventoryTests`, `InventoryReservationServiceTests`, `InventoryAtomicReserveE2ETests`, `AdjustInventoryCommandHandlerTests` |
| `ICustomerOrderRepository` | `CustomerOrder` | `GetByIdAsync`, `GetByIdForBuyerAsync`, `GetByIdForVendorAsync`, `GetListAsync(buyerId?, vendorId?, status?)`, `GetExpiredOrdersAsync(threshold)`, `AddAsync`, `UpdateAsync` | `CustomerOrderTests`, `CheckoutOrderCommandHandlerTests`, `PayOrderCommandHandlerTests`, `OwnershipQueryTests` |
| `IFulfillmentOrderRepository` | `FulfillmentOrder` | `GetByIdAsync`, `GetListAsync(vendorId?, buyerId?, status?)`, `AddAsync`, `UpdateAsync` | `FulfillmentOrderTests`, `DispatchFulfillmentCommandHandlerTests`, `CancelFulfillmentOrderDueToNoStockCommandHandlerTests` |
| `IReturnRequestRepository` | `ReturnRequest` | `GetByIdAsync`, `GetListAsync(buyerId?, vendorId?, status?)`, `AddAsync`, `UpdateAsync` | `ReturnRequestTests`, `ApproveReturnCommandHandlerTests`, `RefundReturnCommandHandlerTests` |
| `IInvoiceRepository` | `Invoice` | `GetByIdAsync`, `GetByOrderIdAsync`, `GetListAsync(...)`, `AddAsync`, `AddRangeAsync`, `UpdateAsync` | `InvoiceTests`, `GenerateInvoicesCommandHandlerTests`, `InvoiceVendorPersistenceTests` |
| `IPaymentReceiptRepository` | `PaymentReceipt` | `GetByIdAsync`, `GetByOrderIdAsync`, `AddAsync`, `UpdateAsync` | `PaymentReceiptTests`, `PayOrderCommandHandlerTests`, `RefundReturnCommandHandlerTests` |

Claves y filtros por rol:
- El inventario se consulta por la clave `(VariantId, WarehouseId)` ([ADR-0002](../Adr/0002-clave-inventario-variantid.md)).
- Los `GetListAsync` filtran **en la consulta** según el rol ([ADR-0013](../Adr/0013-propiedad-del-recurso-por-rol.md)); las lecturas de propiedad devuelven `null` — indistinguible de "no existe" — con `GetByIdForBuyerAsync` / `GetByIdForVendorAsync`.
- **La no-negatividad del stock la garantiza un `UPDATE` condicional atómico, no el puerto** ([ADR-0025](../Adr/0025-stock-negativo-update-condicional-atomico.md)): `TryReserveStockAsync(inventoryId, n)` afecta una fila solo si `disponible >= n` (cero filas = rechazo) y `ReleaseReservedStockAsync(inventoryId, n)` es su inverso condicional para liberar parciales (ADR-0001). No hay token de concurrencia ni bloqueo: el candado dura lo que dura la sentencia. **[IMPLEMENTADO - 2026-10-06]** (antes marcado como `NO IMPLEMENTADO`).

## 2. Puertos de servicio y colaboradores

- **`IClock`** (`Common/Ports`): `DateTimeOffset UtcNow`. Reloj inyectable (T-004 / ADR-0010): el timeout del carrito y el JWT se verifican moviendo el reloj, no esperando.
- **`IPaymentGatewayService`** (`Payments/Ports`): `ChargeAsync(orderId, amount) → PaymentResult`. El rechazo es un **resultado** (`Approved = false`), no una excepción. Pasarela simulada e intercambiable (invariante 9).
- **`IPasswordHasher`** (`Users/Ports`): `Hash(password)`, `Verify(password, storedHash)`. El algoritmo (PBKDF2, ADR-0009) vive en el adaptador, no en el Dominio.
- **`IAuthTokenService`** (`Users/Ports`): `Issue(userId, email, fullName, role) → AuthToken`. El formato del token (JWT HS256, ADR-0009) vive en el adaptador.

## 3. Puertos que NO viven en el Dominio

- **`IUnitOfWork`** (`Zentric.Application/Common/Ports`): `SaveChangesAsync()`. Vive en Application porque coordina la transacción y el despacho de eventos.
- **`IDomainEventDispatcher`** (`Zentric.Infrastructure/Persistence`): publica los eventos registrados por `Entity.AddDomainEvent` al persistir. Los agregados **no** dependen de esta interfaz.
- **Autenticación por token y políticas por rol**: son de la capa de API (`AuthorizationPolicies`), no un puerto de Dominio.
- **No existe `IInvoicingService`**: la facturación es el caso de uso `GenerateInvoicesCommand` sobre `IInvoiceRepository`, sin servicio de dominio propio.
