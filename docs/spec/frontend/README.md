# Zentric Frontend SDD — Índice Rápido

> **Fuente de verdad:** Este directorio contiene la especificación completa del frontend. El backend SDD está en `../backendSDD/`. El dominio compartido está en `zentric-domain-sdd.md`.

## 📁 Estructura

```
frontendSDD/
├── 00-LEEME-INDICE.md                    ← ESTE ARCHIVO
├── zentric-domain-sdd.md                 ← Dominio base (compartido FE/BE)
├── zentric-matriz-trazabilidad-backend-frontend.md
├── PROMPT-MAESTRO-AGENTES-CONCURRENTES.md
├── 01-negocio/
│   └── 01-alcance-y-decisiones.md        ← Decisiones consolidadas + INC-01..11
├── 02-arquitectura/
│   ├── 01-arquitectura-global.md
│   ├── 02-arquitectura-backend-csharp.md
│   └── 03-arquitectura-frontend-nextjs.md
├── 03-roles/
│   └── 01-matriz-de-autorizacion-y-alcance.md
├── 04-experiencia/
│   ├── 01-principios-ux.md
│   └── 02-criterios-accesibilidad.md     ← WCAG 2.2 AA checklist
├── 05-backend/                           ← Espejo de backendSDD/ (ver abajo)
│   ├── 01-casos-de-uso.md
│   ├── 02-api-rest-y-contratos.md
│   ├── 03-persistencia-y-migraciones.md
│   ├── 04-integraciones.md
│   └── 05-plan-de-pruebas.md
├── frontend/
│   ├── 00-frontend-master-sdd.md         ← Arquitectura FE compartida
│   ├── buyer/01-buyer-ux-sdd.md
│   ├── seller/02-seller-ux-sdd.md
│   ├── logistics/03-logistics-ux-sdd.md
│   ├── supervisor/04-supervisor-ux-sdd.md
│   ├── admin/05-admin-ux-sdd.md
│   └── shared/
│       ├── 06-media-image-sdd.md
│       ├── 07-routes-components-sdd.md
│       └── 08-cambios-obligatorios.md    ← Auditoría real vs código actual
```

## 🔗 Backend SDD (directorio hermano)

```
backendSDD/
├── 01-dominio/           ← Entidades, VOs, eventos, puertos (desde zentric-domain-sdd.md)
├── 02-arquitectura/      ← Hexagonal, capas, dependencias, transacciones
├── 03-casos-uso/         ← Commands/Queries por bounded context
├── 04-api-contratos/     ← OpenAPI, ProblemDetails, endpoints, paginación
├── 05-persistencia/      ← DDL, índices, concurrencia, migraciones EF Core
├── 06-integraciones/     ← Outbox, Saga, Payment, Media, Email, Clock
├── 07-testing-calidad/   ← Pirámide, Gates, Pact, Testcontainers, k6
└── 08-despliegue-ops/    ← CI/CD, Feature flags, Rollback, Observabilidad
```

## 🚀 Quickstart para Agentes

1. **Leer en orden**: `00-LEEME-INDICE.md` → `zentric-domain-sdd.md` → `01-negocio/01-alcance-y-decisiones.md` → `02-arquitectura/`
2. **Incertidumbres bloqueantes**: Ver `01-negocio/01-alcance-y-decisiones.md` sección 12 (INC-01..11) + `frontend/shared/08-cambios-obligatorios.md` (FE-01..10)
3. **No resolver INC/FE silenciosamente** → Escalar a Orchestrator → Owner → Registrar en ADR
4. **Puertas de calidad**: Ver `PROMPT-MAESTRO-AGENTES-CONCURRENTES.md` sección 4 (13 gates obligatorios)

## 📋 Estado del Proyecto (Oct 2026)

- **Dominio**: ✅ Completo (24 entidades, 13 invariantes, 7 eventos, 13 puertos)
- **Arquitectura**: ✅ Hexagonal C#/.NET 10 + Next.js 15 App Router
- **Backend specs**: ✅ 5 docs (casos uso, API, persistencia, integraciones, testing)
- **Frontend specs**: ✅ 5 roles + 3 shared + auditoría código real
- **Trazabilidad**: ✅ Matriz BE↔FE completa
- **Orquestación**: ✅ 5 olas, 13 agentes, 13 gates, 24 incertidumbres
- **Incertidumbres abiertas**: 24 (11 backend + 13 frontend) → Requieren Owner sign-off

## ⚠️ Reglas de Oro

| Regla | Descripción |
|-------|-------------|
| **Single Source of Truth** | Dominio = `zentric-domain-sdd.md` + ADRs. No duplicar en FE/BE. |
| **Incertidumbres** | INC-XX (backend) / FE-XX (frontend). No resolver sin Owner. |
| **Contratos** | OpenAPI `v1` genera tipos FE (`orval`). No tipos manuales. |
| **Accesibilidad** | WCAG 2.2 AA obligatorio. `axe-core` en CI (gate: 0 serious/critical). |
| **Tokens color** | Solo semánticos (`destructive`, `success`, `warning`, `info`). Nada de `red-500`, `green-600`, etc. |
| **Estados UI** | 13 estados obligatorios en toda pantalla async. |
| **Commits** | Conventional + `biome check --write` pre-commit. |