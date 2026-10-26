# Zentric Backend SDD — Índice Rápido

> **Fuente de verdad:** Este directorio contiene la especificación completa del backend. El frontend SDD está en `../frontendSDD/`. El dominio compartido está en `../frontendSDD/zentric-domain-sdd.md`.

## 📁 Estructura

```
backendSDD/
├── README.md                           ← ESTE ARCHIVO
├── 01-dominio/
│   ├── 01-entidades-y-value-objects.md   ← Entidades, VOs, agregados (desde zentric-domain-sdd.md)
│   ├── 02-eventos-dominio.md             ← 7 eventos con trigger + payload
│   ├── 03-puertos-hexagonales.md         ← 13 interfaces (repos, servicios, clock, IDs)
│   ├── 04-invariantes-transversales.md   ← 12 reglas de negocio (no-negatividad, reserva, etc.)
│   └── 05-decisiones-arquitectura-ddd.md ← Agregados, consistencia, outbox, soft delete
├── 02-arquitectura/
│   ├── 01-arquitectura-global.md         ← Hexagonal, capas, dependencias, transacciones
│   ├── 02-arquitectura-csharp.md         ← Clean Architecture, EF Core, Dispatcher, Result pattern
│   └── 03-seguridad-observabilidad.md    ← AuthZ policies, Correlation ID, métricas, audit log
├── 03-casos-uso/
│   └── 01-casos-de-uso.md                ← 13 bounded contexts, Commands/Queries, eventos
├── 04-api-contratos/
│   └── 01-api-rest-y-contratos.md        ← OpenAPI v1, ProblemDetails, endpoints, paginación
├── 05-persistencia/
│   └── 01-persistencia-y-migraciones.md  ← DDL, índices, concurrencia, EF Core migrations
├── 06-integraciones/
│   └── 01-integraciones.md               ← Outbox, Saga, Payment, Media, Email, Clock, ID Gen
├── 07-testing-calidad/
│   └── 01-plan-de-pruebas.md             ← Pirámide, Gates, Pact, Testcontainers, k6, OWASP
├── 08-despliegue-ops/
│   ├── 01-ci-cd-pipeline.md              ← 13 Gates, feature flags, staging, smoke tests
│   ├── 02-rollback-contingencia.md       ← DB down, flags off, DNS revert, PITR
│   └── 03-observabilidad.md              ← Correlation ID, Serilog, Prometheus, Grafana, Sentry
```

## 🔗 Frontend SDD (directorio hermano)

```
../frontendSDD/
├── zentric-domain-sdd.md                 ← Dominio base (compartido)
├── 05-backend/                           ← Espejo de este directorio
└── frontend/                             ← 5 roles + shared + auditoría código real
```

## 🚀 Quickstart para Agentes Backend

1. **Leer en orden**: `README.md` → `../frontendSDD/zentric-domain-sdd.md` → `01-dominio/` → `02-arquitectura/` → `03-casos-uso/` → `04-api-contratos/`
2. **Incertidumbres bloqueantes**: Ver `../frontendSDD/01-negocio/01-alcance-y-decisiones.md` sección 12 (INC-01..11)
3. **No resolver INC silenciosamente** → Escalar a Orchestrator → Owner → Registrar en ADR
4. **Puertas de calidad (13 gates)**: Ver `../frontendSDD/PROMPT-MAESTRO-AGENTES-CONCURRENTES.md` sección 4
5. **Convenciones obligatorias**:
   - Commands/Queries + FluentValidation + Dispatcher propio (ADR-0007)
   - Result pattern (no exceptions para flujo negocio)
   - Idempotency-Key header en mutaciones sensibles
   - Soft delete global (`deleted_at` + `is_deleted`)
   - ProblemDetails RFC 7807 para errores
   - Correlation ID propagado en todo request

## 📋 Estado del Proyecto (Oct 2026)

| Área | Estado | Documento |
|------|--------|-----------|
| Dominio | ✅ Completo | `01-dominio/` (por crear desde zentric-domain-sdd.md) |
| Arquitectura | ✅ Completo | `02-arquitectura/` (parcial - falta 03-seguridad-observabilidad.md) |
| Casos de uso | ✅ Completo | `03-casos-uso/01-casos-de-uso.md` |
| API/Contratos | ✅ Completo | `04-api-contratos/01-api-rest-y-contratos.md` |
| Persistencia | ✅ Completo | `05-persistencia/01-persistencia-y-migraciones.md` |
| Integraciones | ✅ Completo | `06-integraciones/01-integraciones.md` |
| Testing/Calidad | ✅ Completo | `07-testing-calidad/01-plan-de-pruebas.md` |
| Despliegue/Ops | ⚠️ Pendiente | `08-despliegue-ops/` (3 docs por crear) |

## ⚠️ Incertidumbres Backend (INC-01..11)

| ID | Tema | Due | Estado |
|----|------|-----|--------|
| INC-01 | Matriz permisos exacta (rol × acción × scope) | Ola 1 | 🔴 Abierta |
| INC-02 | Cancelación pedido post-pago (antes despacho) | Ola 2 | 🔴 Abierta |
| INC-03 | Pago `UNKNOWN`/timeout → `PENDING_RECONCILIATION` | Ola 2 | 🔴 Abierta |
| INC-04 | Flujo físico devoluciones + reingreso + reembolso | Ola 3 | 🔴 Abierta |
| INC-05 | Selección bodega checkout + envío dividido | Ola 2 | 🔴 Abierta |
| INC-06 | Ajustes stock: quién, motivos, auditoría | Ola 1 | 🔴 Abierta |
| INC-07 | Media: formatos, TTL, retención, limpieza | Ola 1 | 🔴 Abierta |
| INC-08 | Auth: TTL tokens, refresh, CSRF, logout | Ola 0 | 🔴 Abierta |
| INC-09 | Métricas/reportes: fórmulas, TZ, granularidad, export | Ola 4 | 🔴 Abierta |
| INC-10 | Paginación: cursor vs offset por endpoint | Ola 1 | 🔴 Abierta |
| INC-11 | Estado `Draft` en Product/Order | Ola 1 | 🔴 Abierta |

## ⚠️ Reglas de Oro Backend

| Regla | Descripción |
|-------|-------------|
| **Domain First** | Reglas en `Zentric.Domain`, nunca en Handlers/Controllers. |
| **Dispatcher Propio** | `IDispatcher` (ADR-0007), no MediatR. `Send<TCommand>()`, `Send<TQuery,TResult>()`, `Publish<TEvent>()`. |
| **Result Pattern** | `Result<T>` / `Result` para errores esperados. Exceptions solo para bugs. |
| **Idempotencia** | Header `Idempotency-Key` (UUID) en mutaciones sensibles. Tabla `IdempotencyKeys`. |
| **Soft Delete Global** | `deleted_at` + `is_deleted` en TODAS las entidades. Global query filter EF Core. |
| **Concurrencia Inventory** | `UPDATE ... SET available = available + @qty WHERE variant=@v AND warehouse=@w AND available+@qty>=0` (ADR-0025). |
| **Errores** | `ProblemDetails` (RFC 7807) con `code`, `details[]`, `correlationId`. No stack traces. |
| **Observabilidad** | Correlation ID header → logs + métricas + audit log. Serilog + OpenTelemetry. |
| **Testing** | Pirámide: Unit (Domain 90%, App 85%) → Integration (Testcontainers) → Contract (Pact) → E2E (Playwright API). |