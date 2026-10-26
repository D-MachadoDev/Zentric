# Backend — Puertos Hexagonales — Zentric

**Fuente:** `../frontendSDD/zentric-domain-sdd.md` sección 2.1 (Puertos listados por entidad)
**Estado:** Especificación vinculante para `Zentric.Domain` (interfaces) + `Zentric.Infrastructure` (adapters)

---

## 1. Repositorios (Output Ports)

| Puerto | Entidad/Agregado | Métodos clave | Implementación esperada |
|--------|------------------|---------------|-------------------------|
| `IUserRepository` | `User` | `GetById`, `GetByEmail`, `Add`, `Update`, `GetByRole`, `ExistsByEmail` | EF Core `UserRepository` |
| `IBuyerRepository` | `Buyer` | `GetById`, `GetByUserId`, `Add`, `Update` | EF Core `BuyerRepository` |
| `ISellerRepository` | `Seller` | `GetById`, `GetByUserId`, `Add`, `Update`, `GetAll`, `GetByStatus` | EF Core `SellerRepository` |
| `IWarehouseRepository` | `Warehouse` | `GetById`, `GetByVendorId`, `GetActiveMarketplace`, `Add`, `Update`, `GetAll` | EF Core `WarehouseRepository` |
| `IProductRepository` | `Product` (agregado) | `GetById`, `GetByVendorId`, `GetPublished`, `Add`, `Update`, `Search` (filtros) | EF Core `ProductRepository` |
| `ICustomerOrderRepository` | `CustomerOrder` | `GetById`, `GetByBuyerId`, `GetByVendorId`, `GetPendingPayment`, `Add`, `Update`, `GetByStatus` | EF Core `CustomerOrderRepository` |
| `IFulfillmentOrderRepository` | `FulfillmentOrder` | `GetById`, `GetByOrderId`, `GetByVendorId`, `GetAssignedTo`, `GetByStatus`, `Add`, `Update` | EF Core `FulfillmentOrderRepository` |
| `IInventoryRepository` | `Inventory` | `GetByVariantAndWarehouse`, `GetByVariantId`, `GetByWarehouseId`, `Add`, `Update`, `GetLowStock` | EF Core `InventoryRepository` |
| `IInvoiceRepository` | `Invoice` | `GetById`, `GetByOrderId`, `GetByVendorId`, `Add`, `Update`, `GetByType` | EF Core `InvoiceRepository` |
---

## 2. Servicios de Dominio (Puertos de Lógica)

| Puerto | Propósito | Métodos | Implementación |
|--------|-----------|---------|----------------|
| `IInventoryReservationService` | Reservas atómicas + liberación (ADR-0025) | `Reserve(Guid variantId, Guid warehouseId, int qty)`, `Release(Guid variantId, Guid warehouseId, int qty)`, `GetAvailable(Guid variantId, Guid warehouseId)` | `InventoryReservationService` (Domain Service) — usa `IInventoryRepository` + conditional update SQL |
| `IOrderFulfillmentProgressSynchronizer` | Sincroniza `CustomerOrder.Status` según `FulfillmentOrders` | `Recalculate(Guid orderId)` | `OrderFulfillmentProgressSynchronizer` (Domain Service) |
| `IReturnsApprovalService` | Lógica aprobación/rechazo devolución | `Approve(Guid returnId, Guid actorId)`, `Reject(Guid returnId, Guid actorId, string reason)` | `ReturnsApprovalService` (Domain Service) |
| `IRefundPolicyService` | Cálculo reembolso (precio congelado, parcial por línea) | `CalculateRefund(Guid returnRequestId)` | `RefundPolicyService` (Domain Service) |

---

## 3. Puertos de Infraestructura (Adapters)

| Puerto | Propósito | Métodos | Adapter (Infra) |
|--------|-----------|---------|-----------------|
| `IAuthTokenService` | JWT + Refresh tokens | `GenerateAccessToken(User)`, `GenerateRefreshToken()`, `ValidateAccessToken(string)`, `ValidateRefreshToken(string)`, `RevokeRefreshToken(string)` | `JwtTokenService` (System.IdentityModel.Tokens.Jwt) |
| `IPaymentGatewayService` | Puerto desacoplado pagos (V1 simulado) | `InitiatePayment(PaymentInitiationRequest) → PaymentInitiationResult`, `GetStatus(Guid attemptId) → PaymentStatus`, `Refund(Guid receiptId, Money amount) → RefundResult` | `SimulatedPaymentGateway` (V1) → `StripePaymentGateway` (futuro) |
| `IMediaStorageService` | Storage imágenes (signed URLs) | `GetUploadUrl(resourceType, resourceId, fileName, contentType, ttlMin) → SignedUploadUrl`, `GetDownloadUrl(...) → string`, `Delete(...) → bool`, `GenerateThumbnail(...) → ThumbnailDto` | `S3MediaStorage` / `AzureBlobStorage` / `LocalStorage` (dev) |
| `IEmailService` | Envío emails transaccionales | `Send(template, to, data)`, `SendRaw(to, subject, html)` | `SendGridEmailService` / `MailgunEmailService` / `SmtpEmailService` |
| `ISmsService` | SMS / WhatsApp | `Send(to, template, data)` | `TwilioSmsService` |
| `IClock` | Tiempo controlable (tests) | `UtcNow { get; }` | `SystemClock` (prod) / `FakeClock` (tests) |
| `IIdGenerator` | IDs determinísticos | `NewGuid()`, `NewSequentialGuid()`, `NewUlid()` | `GuidGenerator` |
| `ICorrelationIdProvider` | Correlation ID por request | `Get() → string`, `Set(string)` | `CorrelationIdMiddleware` + `AsyncLocal<string>` |

---

## 4. Convenciones de Implementación

### 4.1 Repositorios
```csharp
public interface IRepository<T> where T : class
{
    Task<T?> GetById(Guid id, CancellationToken ct = default);
    Task Add(T entity, CancellationToken ct = default);
    Task Update(T entity, CancellationToken ct = default);
    // NO: Delete (soft delete via entity.Delete()), IQueryable
}
```

### 4.2 Unit of Work
```csharp
public interface IUnitOfWork : IDisposable
{
    Task<int> SaveChangesAsync(CancellationToken ct = default);
}
```

### 4.3 Registro DI (Composition Root)
```csharp
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IInventoryReservationService, InventoryReservationService>();
builder.Services.AddScoped<IAuthTokenService, JwtTokenService>();
builder.Services.AddScoped<IPaymentGatewayService, SimulatedPaymentGateway>(); // V1
builder.Services.AddScoped<IMediaStorageService, S3MediaStorage>();
builder.Services.AddSingleton<IClock, SystemClock>();
builder.Services.AddSingleton<IIdGenerator, GuidGenerator>();
```

---

## 5. Testing de Puertos

| Puerto | Test Double | Verificación |
|--------|-------------|--------------|
| Repositorios | `FakeRepository<T>` (in-memory `List<T>`) | CRUD + soft delete filter |
| `IInventoryReservationService` | `FakeInventoryReservationService` | Reserva atómica, liberación, concurrencia |
| `IPaymentGatewayService` | `FakePaymentGateway` | 90% success, 10% fail, latency configurable |
| `IMediaStorageService` | `FakeMediaStorage` (Dictionary) | Signed URL generation, validation |
| `IAuthTokenService` | `FakeAuthTokenService` | Token generation, validation, expiration |
| `IClock` | `FakeClock` (settime) | Time travel en tests |
| `IIdGenerator` | `FakeIdGenerator` (secuencia) | IDs predecibles |

---

## 6. Decisiones de Diseño

| Decisión | Justificación |
|----------|---------------|
| **No `IQueryable` en puertos** | Evita leaky abstractions; filtros/paginación en especificación del método (`GetByVendorId`, `Search`) |
| **Domain Services como puertos** | `IInventoryReservationService` encapsula lógica de reserva atómica; separa de repositorio |
| **`IPaymentGatewayService` simulado V1** | Permite desarrollar checkout completo sin proveedor real; swap futuro sin tocar dominio |
| **`IClock` + `IIdGenerator`** | Tests determinísticos (time travel, IDs predecibles) |
| **Outbox en `IUnitOfWork`** | Eventos persisten en misma transacción que cambios de dominio |
| `IReturnRequestRepository` | `ReturnRequest` | `GetById`, `GetByOrderId`, `GetByVendorId`, `GetByStatus`, `Add`, `Update` | EF Core `ReturnRequestRepository` |
| `IRefundAuditRepository` | `RefundCredit` | `GetByReturnRequestId`, `Add`, `Update` | EF Core `RefundAuditRepository` |
| `IPaymentReceiptRepository` | `PaymentReceipt` | `GetById`, `GetByOrderId`, `GetByExternalRef`, `Add`, `Update` | EF Core `PaymentReceiptRepository` |

**Convención:** Todos los repositorios exponen `Task<T> GetById(Guid id, CancellationToken ct)` y `Task Add(T entity, CancellationToken ct)`. No exponen `IQueryable`.
