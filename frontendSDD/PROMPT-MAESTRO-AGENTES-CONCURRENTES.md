# Zentric — Prompt Maestro para Agentes Concurrentes (Olas)

**Basado en:** `PROMPT-MAESTRO-AGENTES-CONCURRENTES.md` de referencia (NexusMarket) adaptado a Zentric.

---

## 1. Objetivo
Orquestar la implementación de Zentric mediante **agentes especializados concurrentes** organizados en **olas**, con **puertas de calidad** obligatorias y **escalamiento de incertidumbres** a humano (Owner). Cada ola entrega un **incremento funcional verificable** (DoD cumplido).

---

## 2. Arquitectura de agentes

| Agente | Rol | Responsabilidad principal | Entregables |
|--------|-----|---------------------------|-------------|
| **Orchestrator** | Coordinador | Planifica olas, asigna tareas, valida puertas, escala incertidumbres | Plan de olas, Status report, Decisiones registradas |
| **Backend-Domain** | Especialista dominio | Entidades, VOs, eventos, invariantes, repositorios (puertos) | `Zentric.Domain` compilando, tests unitarios verdes |
| **Backend-Application** | Especialista casos de uso | Commands, Queries, Validators, Handlers, Dispatcher | `Zentric.Application` + tests unit/integration |
| **Backend-Infrastructure** | Especialista adapters | EF Core repos, PaymentGateway, MediaStorage, Auth, Clock, Migrations | `Zentric.Infrastructure` + Testcontainers integration tests |
| **Backend-API** | Especialista HTTP | Controllers, Middleware, OpenAPI, Auth Policies, ProblemDetails | `Zentric.Api` + contract tests (Pact) |
| **Frontend-Arch** | Especialista arquitectura FE | Next.js setup, Routing, TanStack Query/Router, Providers, Design System | `apps/frontend` scaffold + `@zentric/ui` primitives |
---

## 3. Definición de Olas

### Ola 0 — Fundación (Semana 1-2) — **Secuencial (bloqueante)**
| Tarea | Agente | Puerta de salida |
|-------|--------|------------------|
| Scaffold monorepo (pnpm/turbo) + Next.js 15 + .NET 10 | Frontend-Arch / Backend-API | `pnpm build` + `dotnet build` OK |
| Design System v2 tokens (`theme.css`) + `@zentric/ui` primitives | Frontend-Shared | `biome check` + `npm run test:ui` verdes |
| OpenAPI spec `v1` (mínimo: Auth, Sellers, Products, Inventory) | Backend-API | `dotnet openapi` generate + `orval` types OK |
| Auth: Register, Login, Me, Refresh, Logout (JWT + HttpOnly cookies) | Backend-API + Frontend-Buyer | E2E: Register→Login→Me→Logout |
| CI/CD base: lint, typecheck, unit tests, Docker build | QA-Automation | Pipeline verde en `main` |

**Go/No-Go Ola 1:** Todas las puertas verdes + Owner aprueba tokens DS v2 en light/dark.

---

### Ola 1 — Core Domain & Catalog (Semana 3-4) — **Paralelo**
| Tarea | Agente | Puerta de salida |
|-------|--------|------------------|
| Entidades: User, Buyer, Seller, Warehouse, Product, Variant, Inventory | Backend-Domain | Tests unitarios invariantes ≥ 90% coverage |
| Casos de uso: Seller onboarding (tx), Catalog CRUD, Variants | Backend-Application | Integration tests (Testcontainers) verdes |
| Repos EF Core + Migraciones + Seed reference data | Backend-Infrastructure | `dotnet ef database update` + seed OK |
| API: Sellers, Warehouses, Products, Variants (OpenAPI + Pact) | Backend-API | Contract tests Pact passing |
| FE: Seller Onboarding Wizard, Product Create/Edit/Publish, Variant Manager | Frontend-Seller | E2E: Crear producto Physical con variantes → Publicar |
| FE: Buyer Catálogo (Grid, Filtros, ProductDetail, Gallery) | Frontend-Buyer | E2E: Buscar → Filtrar → Detalle → AddToCart (optimista) |
| Media: Upload flow (signed URL) + `ImageUploader` + `ProductGallery` | Frontend-Shared | E2E: Subir imagen producto → Ver en detalle + CDN |

**Go/No-Go Ola 2:** Catálogo end-to-end funcional (Buyer ve publicado, Seller gestiona). Pact tests verdes.

---

### Ola 2 — Inventory, Cart & Checkout (Semana 5-6) — **Paralelo**
| Tarea | Agente | Puerta de salida |
|-------|--------|------------------|
| Inventory: AddStock, Consultar, Ajuste (auditoría), Movimientos | Backend-Application + FE-Seller | E2E: AddStock en propia + Marketplace → Ver en pivot table |
| Reserva atómica checkout (15 min) + Worker expiración | Backend-Application + Worker | Stress test: 100 checkout concurrentes → 0 lost updates, 0 stock negativo |
| Checkout Wizard (Dirección→Envío→Pago simulado) + Idempotency | Frontend-Buyer + Backend-API | E2E: Carrito → Checkout → Pago simulado → OrderDetail `Paid` |
| Pago simulado (90% success, 10% fail) + Webhook stub | Backend-API | E2E: Pago fail → `Cancelled (PaymentFailed)` + stock liberado |
| Expiración checkout (Worker) → `Cancelled (Expired)` | Backend-Infrastructure | E2E: Esperar 15 min → Pedido `Cancelled` + toast notificación |

**Go/No-Go Ola 3:** Compra completa funcional (Buyer → Order `Paid` → Seller ve línea en Pedidos).

---

### Ola 3 — Logistics, Orders & Returns (Semana 7-8) — **Paralelo**
| Tarea | Agente | Puerta de salida |
|-------|--------|------------------|
| FulfillmentOrders: Pack → Dispatch → Deliver (Seller/Logistics) | Backend-Application + FE-Seller/Logistics | E2E: Seller Pack → Logistics Dispatch → Deliver → `Delivered` |
| Cancelación StockBreak → Devolución parcial (ADR-0022) | Backend-Domain + FE-Logistics | E2E: Quiebre stock → Cancelar despacho → Devolución parcial líneas |
| Returns: Solicitar (Buyer) → Inspeccionar (Logistics) → Aprobar/Rechazar (Seller) → Reembolso | Backend-Application + FE-Buyer/Logistics/Seller | E2E: Buyer solicita → Logistics inspecciona → Seller aprueba → Stock `Used` + Refund |
| Facturación: Generar Master/ZentricDetail/Vendor en `Paid` | Backend-Application | E2E: 3 facturas generadas + split coherente |
| Auditoría 360° + Timeline inmutable | Backend-API + FE-Supervisor | E2E: Supervisor ve timeline completo + exporta PDF |

**Go/No-Go Ola 4:** Flujo logístico + devoluciones + facturación end-to-end. Supervisor auditoría 360° funcional.
---

## 4. Puertas de calidad (Quality Gates) — **Obligatorias por ola**

| Gate | Herramienta | Criterio | Bloqueante |
|------|-------------|----------|------------|
| **Build** | `dotnet build` / `pnpm build` | 0 errors, 0 warnings (strict) | ✅ Sí |
| **Lint/Format** | `biome check` / `dotnet format --verify-no-changes` | 0 issues | ✅ Sí |
| **Typecheck** | `tsc --noEmit` / `dotnet build` | 0 errors | ✅ Sí |
| **Unit Tests** | `vitest run` / `dotnet test` | Coverage: Domain 90%, App 85%, Infra 70% | ✅ Sí |
| **Integration Tests** | `dotnet test` (Testcontainers) | 100% CU críticos cubiertos | ✅ Sí |
| **Contract Tests** | `pact-verifier` | Provider + Consumer passing | ✅ Sí |
| **E2E Tests** | `playwright test` | Flujos críticos por rol passing | ✅ Sí |
| **Accessibility** | `axe-core` (Vitest + Playwright) | 0 violations serious/critical | ✅ Sí |
| **Visual Regression** | Playwright pixel diff | Diff ≤ 0.1% (layouts críticos) | ✅ Sí |
| **Lighthouse CI** | `lighthouse-ci` | Perf≥90, A11y=100, BP≥90, SEO≥90 | ✅ Sí |
| **Bundle Analysis** | `@next/bundle-analyzer` | No regresión > 5% vs baseline | ✅ Sí |
---

## 5. Gestión de Incertidumbres (Escalamiento)

| INC-ID | Descripción | Agente dueño | Pregunta a Owner | Deadline | Estado |
|--------|-------------|--------------|------------------|----------|--------|
| INC-01 | Matriz permisos exacta (rol × acción × scope) | Backend-API | ¿Matriz completa ahora o iterativa? | Ola 1 | 🔴 Abierta |
| INC-02 | Cancelación pedido post-pago (antes despacho) | Backend-Domain | ¿Permitir si sin `Packed`? | Ola 2 | 🔴 Abierta |
| INC-03 | Pago `UNKNOWN`/timeout antes proveedor real | Backend-API | ¿Estado `PENDING_RECONCILIATION` + polling? | Ola 2 | 🔴 Abierta |
| INC-04 | Flujo físico devoluciones + reingreso + reembolso | Backend-Application | ¿Reingreso tras inspección+aprobación? | Ola 3 | 🔴 Abierta |
| INC-05 | Selección bodega checkout + envío dividido | Backend-API + FE-Buyer | ¿Automático por proximidad + stock? | Ola 2 | 🔴 Abierta |
| INC-06 | Ajustes stock: quién, motivos, auditoría | Backend-Domain | ¿Seller(own)+Admin(all), motivo obligatorio? | Ola 1 | 🔴 Abierta |
| INC-07 | Media: formatos, TTL, retención, limpieza | Backend-Infrastructure | ¿WebP/AVIF, 10MB, 1h TTL, job nocturno? | Ola 1 | 🔴 Abierta |
| INC-08 | Auth: TTL tokens, refresh, CSRF, logout | Backend-API | ¿15min/7d rotativo, SameSite=Lax, Server Action logout? | Ola 0 | 🔴 Abierta |
| INC-09 | Métricas/reportes: fórmulas, TZ, granularidad, export | Backend-Application | ¿Definir por reporte en ADR dedicado? | Ola 4 | 🔴 Abierta |
| INC-10 | Paginación: cursor vs offset por endpoint | Backend-API | ¿Cursor default, offset solo admin? | Ola 1 | 🔴 Abierta |
| INC-11 | Estado `Draft` en Product/Order | Backend-Domain | ¿Agregar `Draft` + migración? | Ola 1 | 🔴 Abierta |
| FE-01 | Despliegue: Vercel vs Docker/K8s | Frontend-Arch | ¿Vercel para DX + previews? | Ola 0 | 🔴 Abierta |
| FE-02 | Auth: CSRF, logout UX, refresh transparente | Frontend-Arch | ¿SameSite=Lax + Server Action logout? | Ola 0 | 🔴 Abierta |
| FE-03 | Formato errores backend | Frontend-Buyer | ¿ProblemDetails RFC 7807? | Ola 1 | 🔴 Abierta |
| FE-04 | Media: upload directo vs proxy | Frontend-Shared | ¿Directo (signed URL) + validación backend? | Ola 1 | 🔴 Abierta |
| FE-05 | Cache/Invalidación imágenes | Frontend-Shared | ¿CDN + version query param? | Ola 2 | 🔴 Abierta |
| FE-06 | Estados devolución exactos | Frontend-Buyer | Esperar INC-04 | Ola 3 | 🔴 Abierta |
| FE-07 | Reputación/reviews/promos | Frontend-Buyer | No inventar: vacío + CTA "Próximamente" | Ola 2 | 🔴 Abierta |
| FE-08 | Consentimiento cookies/analytics | Frontend-Shared | Mínimo: necesarias + analytics opt-in | Ola 1 | 🔴 Abierta |
| FE-09 | a11y testing automatizado | QA-Automation | Gate: 0 serious/critical | Ola 0 | 🔴 Abierta |
| FE-10 | Visual regression | QA-Automation | Playwright (gratis, CI) | Ola 4 | 🔴 Abierta |

**Regla:** Ningún agente resuelve una incertidumbre `🔴 Abierta` silenciosamente. Debe escalar al Orchestrator → Owner. Decisión registrada en ADR.

---

---

## 7. Criterios de Done Global (Release)

- [ ] Todas las olas completadas con puertas verdes.
- [ ] Incertidumbres `🔴 Abierta` → 0 (todas resueltas en ADR).
- [ ] Cobertura tests: Domain 90%, App 85%, Infra 70%, FE components 80%, E2E flujos críticos 100%.
- [ ] Accessibility: 0 violations serious/critical en CI.
- [ ] Visual regression: Diff ≤ 0.1% en 4 layouts críticos.
- [ ] Lighthouse CI: Perf≥90, A11y=100, BP≥90, SEO≥90.
- [ ] Security: 0 secrets, 0 CVEs critical/high, CSP headers.
- [ ] Observabilidad: Correlation ID end-to-end, logs estructurados, métricas Prometheus, Sentry.
- [ ] Documentación: ADRs actualizados, README, CHANGELOG, OpenAPI `v1` publicado.
- [ ] Owner sign-off final.

---

## 8. Rollback y Contingencia

- **Branch protection:** `main` requiere PR + 2 approvals + CI verde.
- **Feature flags:** Funcionalidades nuevas detrás de flag (LaunchDarkly/Unleash) para rollback instantáneo.
- **Database:** Migraciones reversibles (`Down()` probado). Backup PITR antes de deploy.
- **Deploy staging automático en PR:** Smoke tests (health, auth, 3 endpoints) antes de merge.
- **Rollback procedimiento documentado:** `docs/rollback-procedure.md` (DB migrate down, feature flags off, DNS revert).

---

*Fin del Prompt Maestro. Este documento es vivo: se actualiza al cerrar cada ola con decisiones reales y estado de incertidumbres.*
## 6. Comunicación y Estado

- **Daily Sync (15 min):** Orchestrator + leads de cada agente. Estado: `Done / In Progress / Blocked (incertidumbre)`.
- **Handoff estructurado** entre olas: `STATUS / CHANGED / VERIFIED BY / CONTRACT DELTA / OPEN RISKS`.
- **Estado reanudable:** `orchestrator-state.json` con ola actual, tareas completadas, incertidumbres abiertas.
- **Commits:** Conventional Commits + `biome check --write` pre-commit. Rama por agente/ola → PR → Review → Merge.
| **Security** | `gitleaks` + `dependency-check` | 0 secrets, 0 CVEs critical/high | ✅ Sí |
| **Documentation** | README + ADR + CHANGELOG actualizados | Cambios documentados | ✅ Sí |

---

### Ola 4 — Supervision, Admin & Hardening (Semana 9-10) — **Paralelo**
| Tarea | Agente | Puerta de salida |
|-------|--------|------------------|
| Supervisor: Dashboard ejecutivo, Auditoría 360°, Libro mayor, Reportes, Export | Frontend-Supervisor + Backend-API | E2E: Supervisor ve KPIs, abre auditoría 360°, exporta CSV libro mayor |
| Admin: Usuarios, Vendedores, Bodegas, Categorías, Config, Transportadoras | Frontend-Admin + Backend-API | E2E: Admin crea vendedor+bodega (tx), configura comisiones, transportadora |
| Accesibilidad: axe-core CI gate (0 serious/critical) | QA-Automation + Frontend-Shared | `npm run test:a11y` verde en CI |
| Visual Regression (Playwright) para layouts críticos | QA-Automation | Diff ≤ 0.1% en Dashboard, ProductDetail, Checkout, OrderDetail |
| Performance: Lighthouse CI (Perf≥90, A11y=100, BP≥90) | QA-Automation | Lighthouse CI verde |
| Seguridad: gitleaks, dependency-check, rate limits, CSP | QA-Automation | Security scans verdes |
| Observabilidad: Correlation ID, Logs estructurados, Métricas Prometheus, Sentry | Backend-Infrastructure + QA | Correlation ID propagado end-to-end. Dashboards Grafana básicos. |

**Go/No-Go Release:** Todo verde + Owner sign-off.
| **Frontend-Buyer** | Especialista UX Comprador | Catálogo, ProductDetail, Carrito, Checkout, Pedidos, Perfil | `modules/buyer` + tests E2E |
| **Frontend-Seller** | Especialista UX Vendedor | Dashboard, Productos, Inventario, Pedidos, Cumplimientos, Devoluciones | `modules/seller` + tests E2E |
| **Frontend-Logistics** | Especialista UX Logística | Cola, Pack/Dispatch/Deliver, Inspección devoluciones | `modules/logistics` + tests E2E |
| **Frontend-Supervisor** | Especialista UX Supervisor | Dashboard, Auditoría 360°, Libro mayor, Reportes, Fiscalización | `modules/supervisor` + tests E2E |
| **Frontend-Admin** | Especialista UX Admin | Usuarios, Vendedores, Bodegas, Catálogo (moderación), Config | `modules/admin` + tests E2E |
| **Frontend-Shared** | Especialista transversal | `@zentric/ui` primitives, Media, Routes, Hooks, Utils, Accesibilidad | `packages/ui`, `shared/` + Storybook/Visual regression |
| **QA-Automation** | Especialista calidad | CI/CD, Pact, Playwright, axe-core, Lighthouse, Bundle analysis | Pipelines, Gates, Reports |
