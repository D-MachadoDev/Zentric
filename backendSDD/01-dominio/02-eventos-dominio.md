# Backend — Eventos de Dominio — Zentric

**Fuente:** `../frontendSDD/zentric-domain-sdd.md` §2.3
**Estado:** Especificación vinculante para `Zentric.Domain` — publicados tras transacción exitosa (outbox pattern)

---

## 1. Catálogo de Eventos

| Evento | Trigger | Payload Clave | Consumidores típicos |
|--------|---------|---------------|----------------------|
| `OrderCreatedDomainEvent` | `CustomerOrder` creado (Checkout) | `OrderId`, `BuyerId`, `Items[]` (VariantId, Qty, VendorId) | Inventory (reserva), Notifications, Analytics |
| `OrderPaidDomainEvent` | Transición `PendingPayment → Paid` | `OrderId`, `PaymentReceiptId`, `Amount`, `Currency` | Fulfillment (crear FulfillmentOrders), Billing (generar facturas), Inventory (reserva→salida), Notifications |
| `PhysicalProductShippedDomainEvent` | `FulfillmentOrder.Dispatch()` | `FulfillmentOrderId`, `TrackingNumber`, `CarrierId`, `DispatchedAt` | Notifications (email/SMS), Supervisor (métricas), Buyer (tracking) |
| `PartialFulfillmentCancelledDomainEvent` | Cancelación por quiebre stock (ADR-0022) | `FulfillmentOrderId`, `CancelledItems[]` (VariantId, Qty), `Reason` | Returns (crear devolución parcial), Inventory (reingreso), Notifications |
| `StockAdjustedDomainEvent` | Ajuste por conteo físico (`AdjustStock`) | `VariantId`, `WarehouseId`, `Delta` (+/-), `PreviousAvailable`, `NewAvailable`, `Reason`, `ActorId` | Supervisor (auditoría), Alerts (stock bajo/cero), Analytics |
| `CartExpiredDomainEvent` | Timeout 15 min checkout (`CheckoutTimeoutService`) | `OrderId`, `ReleasedReservations[]` (VariantId, WarehouseId, Qty) | Inventory (liberar reserva), Notifications (buyer), Analytics |
| `ReturnApprovedEvent` | Devolución aprobada por Seller | `ReturnRequestId`, `VariantId`, `WarehouseId`, `Qty`, `ReentryCondition` (Used) | Inventory (reingreso stock `Used`), Refund (trigger), Notifications |

---

## 2. Estructura Base de Evento

```csharp
// Zentric.Domain/Common/Models/IDomainEvent.cs
public interface IDomainEvent
{
    Guid EventId { get; }           // UUID v7 (timestamp + random)
    DateTime OccurredAt { get; }    // UTC
    string EventType { get; }       // Nombre calificado: "Zentric.Orders.OrderPaid"
    int Version { get; }            // Schema version (empezar en 1)
}
```

```csharp
// Ejemplo implementación
public sealed record OrderPaidDomainEvent(
    Guid EventId,
    DateTime OccurredAt,
    string EventType,
    int Version,
    Guid OrderId,
    Guid PaymentReceiptId,
    Money Amount
) : IDomainEvent;
```

---

## 3. Publicación (Outbox Pattern)

```csharp
// Infrastructure/Outbox/OutboxMessage.cs
public sealed class OutboxMessage
{
    public Guid Id { get; init; }
    public string EventType { get; private set; }
    public string PayloadJson { get; private set; } // Serializado (System.Text.Json)
    public DateTime CreatedAt { get; private set; }
    public DateTime? ProcessedAt { get; private set; }
    public int RetryCount { get; private set; }
    public string? LastError { get; private set; }
}
```

**Flujo:**
1. Domain entity añade evento a `List<IDomainEvent> _domainEvents` (internal)
2. `IDispatcher` / `DbContext.SaveChangesAsync` → intercepta → persiste en `OutboxMessages` + limpia lista entidad
3. Background worker (`OutboxProcessor`) lee `OutboxMessages` no procesados → publica a:
   - **MediatR interno** (handlers en mismo proceso: Notifications, Analytics)
   - **Message Broker** (si configurado: RabbitMQ/Kafka) → otros servicios
4. Marca `ProcessedAt` = now. Reintentos con backoff exponencial (max 5).

---

## 4. Versionado y Evolución

- `Version` en evento: empezar en 1. Cambios breaking → nueva versión + nuevo `EventType` (ej. `OrderPaid.v2`).
- Consumidores deben manejar múltiples versiones o migrar.
- **Nunca** eliminar campos; solo añadir opcionales.

---

## 5. Testing de Eventos

| Escenario | Verificación |
|-----------|--------------|
| Entity method publica evento correcto | `entity.DomainEvents.Should().ContainSingle(e => e is OrderPaidDomainEvent)` |
| Payload JSON serializable | `JsonSerializer.Serialize(evt)` sin excepciones |
| Outbox persiste en misma transacción | `DbContext.SaveChangesAsync` → `OutboxMessages` count +1 |
| Worker procesa y marca completado | `OutboxProcessor` → `ProcessedAt` not null |
| Reintentos en fallo | Simular fallo handler → `RetryCount` incrementa, `LastError` set |

---

## 6. Eventos NO implementados (futuro)

| Evento | Motivo | Requiere |
|--------|--------|----------|
| `ProductPublishedDomainEvent` | Notificar a search index, recomendaciones | Search/Reco engine |
| `SellerOnboardedDomainEvent` | Provisioning automático (webhooks, dashboards) | Platform infra |
| `InventoryLowStockDomainEvent` | Alertas proactivas (stock < umbral) | Config umbrales por variante |
| `PaymentRefundedDomainEvent` | Conciliación contable automática | Accounting integration |