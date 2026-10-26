# Arquitectura Backend — Zentric (C# / .NET 10)

## 1. Estructura del proyecto (Clean Architecture)

```
Zentric.sln
├── Zentric.Domain           # Entidades, VOs, eventos, puertos, invariantes (sin deps externas)
├── Zentric.Application      # Casos de uso, comandos/queries, validators, puertos, services de dominio
├── Zentric.Infrastructure   # Adapters: EF Core repos, Storage, PaymentGateway, Auth, Clock, ID Generator
├── Zentric.Api              # Controllers, Middleware, Program.cs, OpenAPI, Security Policies
└── Zentric.Tests            # Unit (Domain/Application), Integration (API/DB), Contract tests
```

## 2. Capa de Dominio (Zentric.Domain)
- **Entidades**: `User`, `Buyer`, `Seller`, `Warehouse`, `Product`, `ProductVariant`, `CustomerOrder`, `OrderItem`, `FulfillmentOrder`, `Shipment`, `Inventory`, `Invoice`, `ReturnRequest`, `RefundCredit`, `PaymentReceipt`.
- **Value Objects**: `Money`, `VariantAttribute`, `Address`, `InvoiceLine`.
- **Enums**: `UserRole`, `UserStatus`, `WarehouseType`, `ProductType`, `ProductStatus`, `OrderStatus`, `FulfillmentStatus`, `InvoiceType`, `InvoiceStatus`, `ReturnStatus`, `PaymentStatus`, `OrderCancellationCause`.
- **Eventos de dominio**: `OrderCreatedDomainEvent`, `OrderPaidDomainEvent`, `PhysicalProductShippedDomainEvent`, `PartialFulfillmentCancelledDomainEvent`, `StockAdjustedDomainEvent`, `CartExpiredDomainEvent`, `ReturnApprovedEvent`.
- **Puertos (interfaces)**: `IUserRepository`, `IBuyerRepository`, `ISellerRepository`, `IWarehouseRepository`, `IProductRepository`, `ICustomerOrderRepository`, `IFulfillmentOrderRepository`, `IInventoryRepository`, `IInvoiceRepository`, `IReturnRequestRepository`, `IRefundAuditRepository`, `IPaymentReceiptRepository`, `IAuthTokenService`, `IPaymentGatewayService`, `IClock`, `IIdGenerator`, `IMediaStorageService`.
- **Servicios de dominio**: `InventoryReservationService`, `OrderFulfillmentProgressSynchronizer`, `ReturnsApprovalService`, `RefundPolicyService`.

## 3. Capa de Aplicación (Zentric.Application)
Organizada por bounded context:
- **Users**: Registrar comprador, Login, Perfil, Cambio contraseña, Recuperación.
- **Catalog**: Crear/editar/publicar/suspender producto, gestionar variantes, categorías.
- **Inventories**: AddStock, Consultar existencias, Ajuste por conteo físico, Traslado.
- **Orders**: Checkout, Pago (simulado), Consulta pedidos, Cancelación.
- **Logistics**: Pack, Dispatch, Deliver, Cancelar despacho, Gestión transportadoras.
- **Billing**: Generar facturas (Master/ZentricDetail/Vendor), Consultar.
- **Returns**: Solicitar, Inspeccionar, Aprobar/Rechazar, Reembolso.
- **Warehouses**: CRUD bodegas (Admin), primera bodega en transacción con Seller.
- **Common**: Behaviors (Validation, Logging, Transaction), MediatR-like dispatcher propio (ADR-0007), Ports.

## 4. Capa de Infraestructura (Zentric.Infrastructure)
- **Persistencia**: EF Core 10 + PostgreSQL. Repositorios implementan puertos del dominio. Migraciones versionadas. Transacciones locales para invariantes.
- **Auth**: JWT (access token 15min + refresh 7d rotativo), HttpOnly secure cookies, BCrypt/Argon2 para password hash.
- **Media Storage**: Adapter para S3-compatible / Azure Blob / Local. URL firmadas para privados, CDN para públicos.
- **Payment Gateway**: Adapter simulado (`SimulatedPaymentGateway`) implementando `IPaymentGatewayService`. Puerto desacoplado para proveedor real futuro.
- **Observabilidad**: Serilog + OpenTelemetry. Correlation ID middleware. Health checks.

## 5. Capa API (Zentric.Api)
- **Controllers**: REST endpoints por bounded context. DTOs de entrada/salida separados del dominio.
- **Middleware**: Exception handling → ProblemDetails (RFC 7807), Correlation ID, Auth, Rate limiting.
- **OpenAPI**: Swashbuckle/Scalar. Contrato versionado (`v1`). Documentación de errores, scopes, idempotency keys.
- **Authorization Policies**: `AuthorizationPolicies.cs` con requirements por rol + scope (ADR-0011, ADR-0014).

## 6. Patrones y convenciones
- **Dispatcher propio** (ADR-0007): `IDispatcher` con `Send<TCommand>`, `Send<TQuery, TResult>`, `Publish<TEvent>`. No MediatR.
- **Result Pattern**: `Result<T>` / `Result` para errores esperados (no exceptions para flujo de negocio).
- **Validación**: FluentValidation en Application layer (commands/queries). Validación de dominio en entidades.
- **Transacciones**: `IUnitOfWork` / `DbContext` transaccional. Una transacción por command.
- **Idempotencia**: Header `Idempotency-Key` en mutaciones sensibles. Almacenamiento en tabla `IdempotencyKeys`.
- **Soft Delete**: `IsDeleted` / `DeletedAt` en todas las entidades. Global query filter en EF Core.
- **Auditoría**: Tabla `AuditLogs` con actor, recurso, acción, timestamp, resultado, motivo.

## 7. Testing
- **Unit**: Domain entities (invariantes, transiciones), Application services (casos de uso), Value Objects.
- **Integration**: API endpoints con Testcontainers (PostgreSQL efímero), Auth policies, OpenAPI contract tests.
- **Contract**: Consumer-driven contract tests (Pact) para frontend-backend.

## 8. Decisiones que requieren aprobación
- Proveedor object storage (S3/Azure/GCS/Local).
- Librería JWT concreta (System.IdentityModel.Tokens.Jwt vs. Jose).
- Estrategia de migraciones (EF Core migrations vs. DbUp vs. SQL scripts).
- Broker de mensajes si se requiere (RabbitMQ, Kafka, Azure Service Bus).
- Proveedor real de pagos (Stripe, MercadoPago, Wompi, etc.).
- Plataforma de despliegue (K8s, Container Apps, VMs, Serverless).