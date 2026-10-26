# Backend — Observabilidad — Zentric

**Fuente:** `../frontendSDD/02-arquitectura/01-arquitectura-global.md` sección 6 + `PROMPT-MAESTRO-AGENTES-CONCURRENTES.md` sección 4 Gate 8
**Estado:** Especificación vinculante para `Zentric.Api` + `Zentric.Infrastructure` + Kubernetes

---

## 1. Correlation ID (Obligatorio)

### 1.1 Propagación
- **Header**: `X-Correlation-ID` (UUID v7)
- **Generación**: Middleware `CorrelationIdMiddleware` en request entrante (si no existe)
- **Inyección**: `AsyncLocal<string>` accesible vía `ICorrelationIdProvider.Get()`
- **Propagación**: HttpClient, gRPC, Message Broker, Background jobs

---

## 2. Logging Estructurado (Serilog)

### 2.1 Configuración Base
```csharp
Log.Logger = new LoggerConfiguration()
    .Enrich.FromLogContext()
    .Enrich.WithProperty("Application", "Zentric.Api")
    .Enrich.WithProperty("Environment", environment)
    .Enrich.With<CorrelationIdEnricher>()
    .WriteTo.Console(outputTemplate: 
        "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {CorrelationId} {Message:lj}{NewLine}{Exception}")
    .WriteTo.Seq(serverUrl: "http://seq:5341", apiKey: "...")
    .MinimumLevel.Information()
    .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
    .CreateLogger();
```

### 2.2 Niveles y Cuándo Usar
| Nivel | Uso | Ejemplo |
|-------|-----|---------|
| `Debug` | Detalle técnico verbose | SQL params, cache hits |
| `Information` | Eventos de negocio normales | `OrderPaid`, `StockReserved` |
| `Warning` | Situaciones anómalas recuperables | Reintento pago, stock bajo |
| `Error` | Fallos que requieren atención | Excepción no controlada, DB down |
| `Fatal` | Crítico, servicio inoperativo | Migración fallida, startup fail |

### 2.3 Campos Obligatorios en Cada Log
```json
{
  "Timestamp": "2026-10-25T14:32:15.123Z",
  "Level": "Information",
  "CorrelationId": "01HX...",
  "Message": "Checkout completed",
  "OrderId": "abc-123",
  "BuyerId": "user-456",
  "Amount": 150000,
---

## 3. Métricas (Prometheus + Grafana)

### 3.1 Métricas de Negocio (Business KPIs)
| Métrica | Tipo | Labels | Descripción |
|---------|------|--------|-------------|
| `zentric_orders_total` | Counter | `status`, `vendor_id` | Pedidos creados por estado |
| `zentric_order_value_sum` | Counter | `currency`, `vendor_id` | GMV total |
| `zentric_checkout_duration_seconds` | Histogram | `status` | Latencia checkout (p50, p95, p99) |
| `zentric_inventory_available` | Gauge | `variant_id`, `warehouse_id` | Stock disponible actual |
| `zentric_payment_attempts_total` | Counter | `status`, `gateway` | Intentos de pago |
| `zentric_returns_total` | Counter | `status`, `vendor_id` | Devoluciones por estado |

### 3.2 Métricas Técnicas (System)
| Métrica | Tipo | Descripción |
|---------|------|-------------|
| `http_requests_total` | Counter | Requests por endpoint, método, status |
| `http_request_duration_seconds` | Histogram | Latencia p50/p95/p99 por endpoint |
| `db_query_duration_seconds` | Histogram | Latencia queries EF Core |
| `cache_hit_ratio` | Gauge | Ratio hit/miss Redis |
| `background_job_duration_seconds` | Histogram | Workers (checkout timeout, outbox) |

### 3.3 Alertas Críticas (PrometheusRule)
```yaml
groups:
- name: zentric-critical
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.01
    for: 2m
    labels: { severity: "critical" }
    annotations:
      summary: "Error rate > 1% en {{ $labels.service }}"
      
  - alert: CheckoutLatencyP99
    expr: histogram_quantile(0.99, rate(zentric_checkout_duration_seconds_bucket[5m])) > 2
    for: 5m
    labels: { severity: "warning" }
    annotations:
      summary: "Checkout p99 > 2s"
      
  - alert: InventoryNegative
    expr: zentric_inventory_available < 0
    for: 0m
    labels: { severity: "critical" }
    annotations:
      summary: "Stock negativo detect: {{ $labels.variant_id }}"
      
  - alert: PaymentFailureRate
---

## 4. Distributed Tracing (OpenTelemetry)

### 4.1 Instrumentación
```csharp
builder.Services.AddOpenTelemetry()
    .WithTracing(tracing => tracing
        .AddSource("Zentric.*")
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddEntityFrameworkCoreInstrumentation()
        .AddOtlpExporter(opt => opt.Endpoint = new Uri("http://jaeger:4317")));
```

### 4.2 Spans Obligatorios
| Operación | Span Name | Atributos Clave |
|-----------|-----------|-----------------|
| HTTP Request | `HTTP {method} {route}` | `http.method`, `http.route`, `http.status_code` |
| DB Query | `DB {query}` | `db.statement`, `db.operation`, `db.duration_ms` |
| Payment Gateway | `Payment {action}` | `payment.gateway`, `payment.amount`, `payment.status` |
| Outbox Publish | `Outbox {eventType}` | `event.type`, `event.id` |
| Background Job | `Job {name}` | `job.name`, `job.duration_ms`, `job.status` |

---

## 5. Health Checks

### 5.1 Endpoints
| Endpoint | Descripción | Dependencias |
|----------|-------------|--------------|
| `GET /health` | Liveness (K8s probe) | Solo proceso vivo |
| `GET /ready` | Readiness (K8s probe) | DB, Redis, Storage, Payment Gateway |

### 5.2 Implementación
```csharp
builder.Services.AddHealthChecks()
    .AddDbContextCheck<AppDbContext>("database")
    .AddRedis(redisConnectionString, "redis")
    .AddUrlGroup(new Uri(paymentGatewayUrl), "payment-gateway")
    .AddUrlGroup(new Uri(storageUrl), "storage")
    .AddCheck<CustomBusinessCheck>("business-rules");
```

### 5.3 Respuesta Esperada
```json
{
  "status": "Healthy",
  "results": {
    "database": { "status": "Healthy", "duration": "12ms" },
    "redis": { "status": "Healthy", "duration": "3ms" },
    "payment-gateway": { "status": "Healthy", "duration": "45ms" },
    "storage": { "status": "Degraded", "duration": "120ms", "description": "High latency" },
    "business-rules": { "status": "Healthy" }
  }
}
```

---

## 6. Auditoría (Audit Log)

### 6.1 Tabla `AuditLogs`
```sql
CREATE TABLE audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id uuid NOT NULL,
    actor_role varchar(50),
    resource_type varchar(100) NOT NULL,
    resource_id uuid NOT NULL,
    action varchar(50) NOT NULL,
    timestamp timestamptz NOT NULL DEFAULT now(),
    result varchar(20) NOT NULL,
    reason text,
    correlation_id uuid,
    metadata jsonb
);
CREATE INDEX ix_audit_actor ON audit_logs(actor_id, timestamp DESC);
CREATE INDEX ix_audit_resource ON audit_logs(resource_type, resource_id, timestamp DESC);
CREATE INDEX ix_audit_correlation ON audit_logs(correlation_id);
```

### 6.2 Eventos Auditados (Obligatorios)
| Acción | Recurso | Cuándo |
|--------|---------|--------|
| `Create`, `Update`, `Delete`, `Publish`, `Suspend`, `Discontinue` | `Product` | Mutaciones catálogo |
| `AddStock`, `Adjust`, `Transfer` | `Inventory` | Cambios stock |
| `Checkout`, `Cancel`, `Pay`, `Refund` | `CustomerOrder` | Transiciones estado |
| `Pack`, `Dispatch`, `Deliver`, `Cancel` | `FulfillmentOrder` | Logística |
| `Approve`, `Reject`, `Refund` | `ReturnRequest` | Devoluciones |
| `Login`, `Logout`, `PasswordChange` | `User` | Auth |

---

## 7. Dashboards Grafana (Mínimos Requeridos)

| Dashboard | Paneles Clave | Refresh |
|-----------|---------------|---------|
| **Business Overview** | GMV, Órdenes, Conversión, Ticket promedio | 1 min |
| **Checkout Funnel** | Visitantes → Carrito → Checkout → Pagado | 1 min |
| **Inventory Health** | Stock total, Alertas < umbral, Stock 0, Valorizado | 5 min |
| **Logistics SLA** | Prep time, Dispatch time, Delivery time, Quiebres | 5 min |
| **System Health** | Error rate, Latencia p99, CPU, Mem, DB connections | 30 seg |
| **Payments** | Intentos, Exitosos, Fallidos, Reembolsos, Chargebacks | 1 min |

---

## 8. CI/CD Gates de Observabilidad

| Gate | Verificación | Comando |
|------|--------------|---------|
| **Health Checks** | `/ready` = Healthy en staging | `curl -f https://staging.zentric.com/ready` |
| **Métricas** | Prometheus scrape OK, 0 targets down | `curl -f http://prometheus:9090/-/healthy` |
| **Logs** | Seq/Elastic recibe logs, 0 errors en 5 min | Query: `level:Error AND timestamp:>now-5m` |
| **Tracing** | Jaeger recibe spans, 0 spans dropped | `curl -f http://jaeger:16686/api/traces` |
| **Alertas** | 0 alertas firing en staging | `curl -f http://alertmanager:9093/api/v1/alerts` |
    expr: rate(zentric_payment_attempts_total{status="failed"}[5m]) > 0.05
    for: 3m
    labels: { severity: "critical" }
```
  "Currency": "COP",
  "DurationMs": 245
}
```
### 1.2 Uso en Logs
```csharp
LogContext.PushProperty("CorrelationId", correlationIdProvider.Get());
Log.Information("Checkout initiated for order {OrderId}", orderId);
```
