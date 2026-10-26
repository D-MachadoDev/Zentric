# Backend — Plan de Pruebas y Calidad — Zentric

## 1. Estrategia de testing (Pirámide)

```
           /\
          /  \  E2E / Contract (Pact) — 5-10% — Flujos críticos cross-service
         /____\
        /      \  Integration (Testcontainers) — 20-30% — API, DB, Auth, Integraciones
       /________\
      /          \  Unit (Domain + Application) — 60-70% — Invariantes, casos de uso, VOs
     /____________\
```

## 2. Unit Tests (Domain + Application)

### 2.1 Domain (`Zentric.Tests.Domain`)
| Entidad / VO | Escenarios obligatorios |
|--------------|------------------------|
| `Product` | Crear Physical sin variantes → falla; Crear Digital sin variantes → OK; Publicar sin SKU → falla; Transiciones estado inválidas → falla; Soft delete → `Discontinued` + `DeletedAt`; Restore → `Published`. |
| `ProductVariant` | SKU único case-insensitive; ≥1 atributo; Nombres atributos únicos; PriceAmount > 0; Activar/Desactivar/Delete/Restore. |
| `CustomerOrder` | Cart → Checkout (reserva stock); PendingPayment → Paid (inmutable); PendingPayment → Expired (15 min); Paid → Cancelled (StockBreak); Delivered/Cancelled inmutables; Multi-moneda TotalAmount. |
| `FulfillmentOrder` | Pack → Packed; Dispatch → Dispatched + tracking; Deliver → Delivered; Cancel (StockBreak) → partial return. |
| `Inventory` | AddStock incrementa Available; Reserva atómica (concurrencia); No negativo; Liberación reserva; Ajuste con auditoría. |
| `ReturnRequest` | Digital → falla; Requested → Approved (inspección OK) → Refunded; Rejected con motivo. |
| `Money` | Add/Subtract/Multiply/Compare misma moneda; Distinta moneda → falla; Redondeo bancario. |
| `VariantAttribute` | Name+Value; Validación vacíos. |

## 3. Integration Tests (`Zentric.Tests.Integration`)

### 3.1 Infraestructura
- **Testcontainers**: PostgreSQL 16 (efímero por test class), Redis (cache/session), MinIO (S3), LocalStack (AWS mock).
- **Fixtures**: `DatabaseFixture` (shared instance, `Respawn` checkpoint entre tests), `ApiFixture` (`WebApplicationFactory<Program>` con auth override).
- **Auth**: `TestAuthHandler` inyecta claims (rol, vendorId, buyerId, sub) por test.

### 3.2 Cobertura por bounded context
| Contexto | Endpoints críticos a testear |
|----------|------------------------------|
| Auth | Register, Login, Refresh, Me, PasswordChange, Recovery |
| Sellers | Create+Warehouse (tx), List, Get, Update, Status |
| Warehouses | Create Marketplace, Create Vendor, List, Update, Status |
| Catalog | CRUD Product + Variants, Publish/Suspend/Discontinue/Restore, List (scope) |
| Inventory | AddStock (own+Marketplace), Get, Adjust (audit), Transfer (ABIERTO) |
| Cart/Checkout | Add/Update/Remove items, Checkout (reserva), ConfirmarPago, FallarPago, ExpirarCheckout |
| Orders | Get (scope), List (filtros/cursor), Cancel (pre/post-pago INC-02) |
| Logistics | Cola (filtros), Pack, Dispatch, Deliver, Cancel (StockBreak) |
| Billing | Get Invoice (scope), List, Generate (trigger) |
| Returns | Request, Inspect, Approve, Reject, Refund |
| Reports | Sales, Orders, Inventory, Logistics, Audit360, Ledger |

### 3.3 Patrones de test
## 4. Contract Tests (Pact)
- **Consumer**: Frontend (genera pact files en CI).
- **Provider**: Backend (valida pact files en CI).
- **Flujos**: Checkout, AddStock, Pack/Dispatch/Deliver, Return flow.
- **Versionado**: Pact broker o archivos en repo. `pact-verifier` en pipeline.

## 5. E2E Tests (Playwright — backend only via API)
- Flujos completos multi-actor: Buyer checkout → Seller pack → Logistics dispatch/deliver → Return → Refund.
- **Data setup**: API seeding + cleanup por test.
- **Paralelismo**: `test.describe.parallel` por flujo.

## 6. Performance & Stress (k6 / NBomber)
| Escenario | Target | Métricas |
|-----------|--------|----------|
| Checkout concurrente (100 VU) | 50 RPS | p95 < 500ms, 0% errors, stock conflicts < 1% |
| AddStock masivo (10k variants) | 200 RPS | p95 < 200ms, 0 lost updates |
| Listar pedidos (cursor pagination) | 100 RPS | p95 < 300ms |
| Webhook pago (1000/min) | 20 RPS | 99.9% processed < 1s |

## 7. Seguridad (OWASP ASVS Level 2)
- **AuthZ**: Test matrix completa (rol × acción × scope) — 1 test por celda ✅/❌.
- **Input validation**: Fuzzing (SQLi, XSS, path traversal, XXE) en todos los endpoints.
- **Rate limiting**: Login (5/min), Recovery (3/hora), Upload (10/min).
- **Secrets**: `gitleaks` en CI. No credenciales en código/config.
- **Dependencies**: `dotnet-outdated` + `nuget-audit` / `OWASP Dependency Check` en CI.

## 8. CI/CD Gates (obligatorios para merge)
1. `dotnet build` (Release, no warnings)
2. `dotnet test` (Unit + Integration) — **coverage ≥ 80%** (Domain 90%, Application 85%, Infrastructure 70%)
3. `dotnet openapi` generate → validar schema vs Pact
4. `biome check --write .` (si hay frontend en mono) / `dotnet format --verify-no-changes`
5. `gitleaks detect`
6. `dependency-check` (OWASP)
7. Docker build + scan (Trivy/Grype)
8. Deploy staging → smoke tests (health, auth, 3 endpoints críticos)

## 9. Definition of Done (Backend)
- [ ] Caso de uso implementado + validators + handlers + mappers
- [ ] Unit tests: Domain invariants + Application commands/queries (≥ 5 por command)
- [ ] Integration tests: Happy path + 3 error paths + authZ matrix
- [ ] Contract tests actualizados (Pact) si endpoint nuevo/modificado
- [ ] Migración EF Core + `Down()` probado + seeding si referencia
- [ ] OpenAPI actualizado + ejemplos + `x-scope` + `x-idempotency`
- [ ] Observabilidad: Correlation ID, logs estructurados, métricas Prometheus, audit log entry
- [ ] Docs: ADR si decisión nueva, README actualizado, CHANGELOG
- [ ] Code review aprobado (2 reviewers, 1 domain expert)
- [ ] CI verde en rama + staging deploy verificado
- **Given-When-Then** con `Arrange/Act/Assert` explícito.
- **Data builders** para entidades complejas (`OrderBuilder`, `ProductBuilder`).
- **Assertions**: Status code, ProblemDetails shape, respuesta shape, DB state (EF Core `FindAsync`), eventos publicados (capturados en test `IDispatcher`), logs (Serilog `TestSink`), métricas (Prometheus `MetricServer`).
### 2.2 Application (`Zentric.Tests.Application`)
- **Commands**: Happy path + cada validación FluentValidation + cada regla de dominio (excepción esperada).
- **Queries**: Filtros, paginación, scope authorization (mock `IAuthorizationService`).
- **Handlers**: Verificar `IDispatcher` publica eventos correctos post-commit.
- **Validators**: Casos borde (límites, enums, regex, conditional).

**Herramientas**: xUnit, FluentAssertions, NSubstitute/Moq, AutoFixture, Shouldly.
