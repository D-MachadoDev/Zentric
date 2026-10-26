# Zentric — Cambios obligatorios y Decisiones pendientes (Frontend)

## 1. Cambios obligatorios vs implementación actual
*Basado en auditoría de `frontend/apps/frontend/src` contra `zentric-domain-sdd.md` y `02-arquitectura/03-arquitectura-frontend-nextjs.md`.*

| Área | Hallazgo | Acción requerida | Prioridad | Referencia |
|------|----------|------------------|-----------|------------|
| **Tokens de color** | Uso de `red-500`, `green-600`, `amber-500`, `rose-500` hardcodeados en Badges/Alerts | Migrar a tokens semánticos: `destructive`, `success`, `warning`, `info` via `StatusBadge` y `Alert` variants | **CRÍTICA** | DS v2 sección 9, `theme.css` |
| **Badges de estado** | `Badge variant="outline" className="border-red-900/60 text-red-400"` | Usar `StatusBadge tone="danger"` (dot + label obligatorio) | **CRÍTICA** | `04-experiencia/02-criterios-accesibilidad.md` |
| **Alertas de error** | `Alert variant="destructive" className="border-red-900 bg-red-950/40 text-red-200"` | Usar `Alert variant="destructive"` sin className override (tokens resuelven en ambos modos) | **CRÍTICA** | DS v2 sección 9.4 |
| **Estados de carga** | Algunas páginas usan solo `isLoading` boolean | Implementar 13 estados UI obligatorios (skeleton, empty, error, conflict, stale, etc.) | **ALTA** | `04-experiencia/01-principios-ux.md` sección 4 |
| **Accesibilidad** | Falta `aria-live` en toasts, `aria-describedby` en errores de form, focus management en modals | Auditar y corregir según checklist WCAG 2.2 AA | **ALTA** | `04-experiencia/02-criterios-accesibilidad.md` |
| **Imágenes** | `next/image` sin `placeholder="blur"` en listados, `fallback` genérico hardcodeado | Configurar `placeholder="blur"`, `blurDataURL`, fallback por tipo desde `06-media-image-sdd.md` | **ALTA** | `06-media-image-sdd.md` |
| **Formularios** | Validación solo client-side en algunos casos | Dual validation: Zod schema (OpenAPI) en client + server. Errores inline + `aria-invalid` | **ALTA** | `07-routes-components-sdd.md` sección 2.3 |
| **Navegación** | Filtros/paginación en state local, no en URL | Mover a search params (TanStack Router) para deep linking | **MEDIA** | `07-routes-components-sdd.md` sección 1.2 |
| **Tipos API** | Tipos manuales en `src/domain/models/` | Generar desde OpenAPI (`orval`) → `src/domain/api/`. Eliminar duplicados | **MEDIA** | `00-frontend-master-sdd.md` sección 5 |
## 2. Decisiones pendientes (deben resolverse ANTES de implementar flujo afectado)

| ID | Decisión | Impacto | Opciones | Recomendación | Due |
|----|----------|---------|----------|---------------|-----|
| FE-01 | Estrategia de despliegue | CI/CD, routing, images | Vercel (recomendado Next.js) / Docker + K8s / Static Export | Vercel para DX + preview deployments | Sprint 1 |
| FE-02 | Autenticación: CSRF, logout, refresh UX | Seguridad, UX | Double-submit cookie / SameSite=Lax / Server Action logout | SameSite=Lax + Server Action logout + refresh transparente | INC-08 |
| FE-03 | Formato errores backend | Contrato UI | ProblemDetails RFC 7807 vs custom | ProblemDetails (estándar) | `05-backend/02-api-rest-y-contratos.md` |
| FE-04 | Media: upload directo vs proxy | Arquitectura, seguridad | Directo a storage (signed URL) / Proxy backend | Directo (performance) + validación backend | INC-07 |
| FE-05 | Cache/Invalidación imágenes | Performance, consistencia | CDN + `Cache-Control: immutable` + version en URL / SWR | CDN + version query param | Sprint 2 |
| FE-06 | Estados devolución/reembolso exactos | UI flujo returns | Definir en backend primero (INC-04) → UI consume | Esperar resolución INC-04 | INC-04 |
| FE-07 | Datos para reputación/reviews/promos | UI descubrimiento | Backend provee endpoints / UI simula vacío | No inventar: mostrar vacío + CTA "Próximamente" | INC-09 |
| FE-08 | Consentimiento cookies/analytics | Legal, métricas | Banner granulado (necesarias/analytics/marketing) / TCF 2.0 | Mínimo viable: necesarias + analytics opt-in | INC-08/09 |
| FE-09 | Accesibilidad: testing automatizado | CI gate | `axe-core` en Vitest + Playwright a11y | Gate: 0 violations serious/critical | Sprint 1 |
| FE-10 | Visual regression | Calidad UI | Chromatic (Storybook) / Playwright pixel diff | Playwright (gratis, integra CI) | Sprint 2 |

## 3. Checklist de migración (por fase)

### Fase 1 — Fundación (Semana 1-2)
- [ ] Eliminar todos los colores hardcodeados (`red-*`, `green-*`, `amber-*`, `rose-*`, `emerald-*`) → tokens semánticos.
- [ ] Reemplazar `Badge` custom por `StatusBadge` + `Badge` primitives de `@zentric/ui`.
- [ ] Unificar `Alert` usando solo `variant` (destructive/success/warning/info) sin className override.
- [ ] Configurar `theme.css` verificado en light/dark + `[data-role]` en 5 layouts.
- [ ] Generar tipos OpenAPI → `orval` → `src/domain/api/`. Borrar `src/domain/models/` manuales.

### Fase 2 — Componentes y Formularios (Semana 3-4)
- [ ] Migrar `Button`, `Input`, `Select`, `Checkbox`, `Radio`, `Dialog`, `Dropdown`, `Toast` a `@zentric/ui`.
- [ ] Implementar `FormField`, `FormSelect`, `FormFileUpload` compartidos.
- [ ] Dual validation Zod (OpenAPI) en todos los formularios. Errores inline + `aria-invalid`.
- [ ] `ImageUploader` + `ProductGallery` + `Avatar` + `Logo` desde `06-media-image-sdd.md`.

### Fase 3 — Navegación y Estado (Semana 5-6)
- [ ] Mover todos los filtros/paginación/orden a search params (TanStack Router).
- [ ] Eliminar Zustand stores de entidades (`products`, `orders`, `inventory`). Solo `session` + `uiPrefs`.
- [ ] Implementar 13 estados UI en todas las páginas async (Skeleton, Empty, Error, Conflict, Stale, etc.).

### Fase 4 — Accesibilidad y Calidad (Semana 7-8)
- [ ] `axe-core` en CI (Vitest + Playwright). Gate: 0 serious/critical.
- [ ] Focus management en todos los modals/drawers/dropdowns (`FocusScope`, `useFocusTrap`).
- [ ] `aria-live` en toasts, timeline updates, filter results.
- [ ] Visual regression (Playwright) para layouts: Dashboard, ProductDetail, Checkout, OrderDetail.

### Fase 5 — Despliegue y Observabilidad (Semana 9-10)
- [ ] Deploy Vercel + preview deployments en PR.
- [ ] Lighthouse CI (performance ≥ 90, accessibility = 100, best practices ≥ 90).
- [ ] Bundle analysis (`@next/bundle-analyzer`) en CI.
- [ ] Error tracking (Sentry) + Real User Monitoring (Vercel Analytics / Plausible).
| **Estado global** | `Zustand` store con `products`, `orders` cache | Migrar a TanStack Query. Solo `session` + UI prefs en Zustand | **MEDIA** | `07-routes-components-sdd.md` sección 3 |
| **Componentes base** | `Button`, `Input`, `Badge` custom en `src/components/ui/` | Migrar a `@zentric/ui` primitives (Radix + cva + tokens) | **MEDIA** | `02-arquitectura/03-arquitectura-frontend-nextjs.md` sección 8 |
| **Dark mode** | `class="dark"` en `html` pero tokens no resuelven en `[data-role]` | Verificar `theme.css` @theme inline + `data-role` en layouts por rol | **BAJA** | `theme.css` sección 9.2 |
