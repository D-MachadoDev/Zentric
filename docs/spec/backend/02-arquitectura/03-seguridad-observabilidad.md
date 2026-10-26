# Backend — Seguridad y Observabilidad — Zentric

**Fuente:** `../frontendSDD/02-arquitectura/01-arquitectura-global.md` sección 5-6 + `PROMPT-MAESTRO-AGENTES-CONCURRENTES.md` sección 4 Gate 8,12
**Estado:** Especificación vinculante para `Zentric.Api`, `Zentric.Infrastructure`, Kubernetes

---

## 1. Autenticación y Autorización

### 1.1 Esquema de Autenticación
- **JWT Access Token**: 15 min vida, `RS256`, claims: `sub` (UserId), `role` (UserRole), `vendor_id` (opcional), `buyer_id` (opcional), `session_id`.
- **Refresh Token**: 7 días, rotativo (nuevo refresh en cada uso), revocación en logout/cambio password, almacenado en HttpOnly secure cookie.
- **HttpOnly Secure Cookies**: `zentric_access` (access token), `zentric_refresh` (refresh token). `SameSite=Lax`, `Secure=true`, `Path=/`.
- **Password Hash**: Argon2id (recomendado) o BCrypt work factor ≥ 12.

### 1.2 Middleware de Autenticación
```csharp
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = configuration["Jwt:Issuer"],
        ValidAudience = configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(configuration["Jwt:Key"])),
        ClockSkew = TimeSpan.Zero
    };
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            if (context.Request.Cookies.TryGetValue("zentric_access", out var token))
                context.Token = token;
            return Task.CompletedTask;
        }
    };
});
```

### 1.3 Autorización (Policies)
```csharp
public static class AuthorizationPolicies
{
    public const string RequireSellerScope = "RequireSellerScope";
    public const string RequireLogisticsScope = "RequireLogisticsScope";
    public const string RequireAdmin = "RequireAdmin";
    public const string RequireSupervisor = "RequireSupervisor";

    public static void Configure(AuthorizationOptions options)
    {
        options.AddPolicy(RequireSellerScope, policy =>
            policy.Requirements.Add(new RequireSellerScopeRequirement()));
        options.AddPolicy(RequireLogisticsScope, policy =>
            policy.Requirements.Add(new RequireLogisticsScopeRequirement()));
        options.AddPolicy(RequireAdmin, policy =>
            policy.RequireRole(UserRole.Administrator.ToString()));
        options.AddPolicy(RequireSupervisor, policy =>
            policy.RequireRole(UserRole.Supervisor.ToString()));
    }
}

public class RequireSellerScopeHandler : AuthorizationHandler<RequireSellerScopeRequirement, Product>
{
    protected override Task HandleRequirementAsync(AuthorizationHandlerContext context,
        RequireSellerScopeRequirement requirement, Product resource)
    {
---

## 2. Rate Limiting y Protección Anti-Abuso

| Endpoint | Límite | Ventana | Acción |
|----------|--------|---------|--------|
| `POST /auth/login` | 5 req | 1 min | 429 + bloqueo 15 min |
| `POST /auth/register` | 3 req | 1 hora | 429 |
| `POST /auth/password/recovery/*` | 3 req | 1 hora | 429 |
| `POST /media/upload-url` | 10 req | 1 min | 429 |
| `POST /checkout` | 10 req | 1 min | 429 |
| Global API | 100 req | 1 min | 429 |

```csharp
builder.Services.AddRateLimiter(options =>
{
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
        RateLimitPartition.GetFixedWindowLimiter("global", _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 100,
            Window = TimeSpan.FromMinutes(1),
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            QueueLimit = 10
        }));
    
    options.AddPolicy("login", ctx =>
        RateLimitPartition.GetFixedWindowLimiter("login", _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 5,
            Window = TimeSpan.FromMinutes(1)
        }));
});
```

---

## 3. Seguridad de Datos

### 3.1 Encryption
- **En tránsito**: TLS 1.3 obligatorio (HSTS, certificate pinning en producción).
- **En reposo**: PostgreSQL `pgcrypto` para columnas sensibles (password hash, tokens, PII). Volumes encriptados (AWS EBS encryption / Azure Disk Encryption).

### 3.2 Secrets Management
- **NO** commitear secrets. Usar:
  - Desarrollo: `.env` local (gitignored) / `dotnet user-secrets`
  - Staging/Prod: Azure Key Vault / AWS Secrets Manager / HashiCorp Vault
  - Inyección en contenedores: CSI driver / env vars en runtime

### 3.3 Headers de Seguridad
```csharp
app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    context.Response.Headers["Permissions-Policy"] = "geolocation=(), microphone=()";
    context.Response.Headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'";
    await next();
});
```

---

## 4. Observabilidad (Resumen - ver `08-despliegue-ops/03-observabilidad.md`)

### 4.1 Correlation ID
- Header `X-Correlation-ID` (UUID v7) generado por middleware si no existe.
- Propagado a: HttpClient, gRPC, Message Broker, Background jobs, Logs, Métricas, Traces.

### 4.2 Logging (Serilog)
- Formato JSON estructurado. Campos obligatorios: `Timestamp`, `Level`, `CorrelationId`, `Message`, `Properties...`
- Sinks: Console (dev), Seq/Elastic (staging/prod), File (rotación diaria).

### 4.3 Métricas (Prometheus)
- Business: `zentric_orders_total`, `zentric_order_value_sum`, `zentric_checkout_duration_seconds`, `zentric_inventory_available`, `zentric_payment_attempts_total`, `zentric_returns_total`.
- System: `http_requests_total`, `http_request_duration_seconds`, `db_query_duration_seconds`, `cache_hit_ratio`.

### 4.3 Alertas Críticas
- Error rate > 1% (5xx) → PagerDuty/Slack
- Checkout p99 > 2s → Alert
- Stock negativo → Critical immediate
- Payment failure rate > 5% → Critical

### 4.4 Distributed Tracing (OpenTelemetry)
- Spans: HTTP request, DB query, Payment gateway, Outbox publish, Background job.
- Exportador: OTLP → Jaeger/Tempo.

### 4.5 Health Checks
- `/health` → Liveness (solo proceso)
- `/ready` → Readiness (DB, Redis, Storage, Payment Gateway, Business rules)

---

## 5. Auditoría (Audit Log)
- Tabla `audit_logs` con: actor, recurso, acción, timestamp, resultado, motivo, correlation_id.
- Eventos obligatorios: CRUD productos, cambios stock, transiciones pedido, logística, devoluciones, auth.

---

## 6. Compliance y Validación en CI

| Check | Herramienta | Gate |
|-------|-------------|------|
| Secrets scanning | `gitleaks` | Bloqueante |
| Dependency vulnerabilities | `dependency-check` (OWASP) | Bloqueante si CVE critical/high |
| SAST | `sonarqube` / `codeql` | Bloqueante si critical |
| Container scan | `trivy` / `grype` | Bloqueante si critical/high |
| License check | `dotnet-licenses` | Warning si GPL/AGPL |
        var vendorIdClaim = context.User.FindFirst("vendor_id");
        if (vendorIdClaim != null && Guid.TryParse(vendorIdClaim.Value, out var vendorId))
        {
            if (vendorId == resource.VendorId) context.Succeed(requirement);
        }
    }
}
```
