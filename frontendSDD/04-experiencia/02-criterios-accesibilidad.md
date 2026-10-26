# Criterios de accesibilidad — Zentric (WCAG 2.2 AA)

## 1. Alcance
Aplica a **todas** las interfaces de Zentric (Buyer, Seller, Logistics, Supervisor, Admin, Auth). No hay excepciones por rol ni por "pantalla interna".

## 2. Nivel de conformidad
**WCAG 2.2 Level AA** (incluye 2.1 AA + 2.2 nuevos criterios: 2.4.11 Focus Not Obscured, 2.5.7 Dragging Movements, 2.5.8 Target Size, 3.2.6 Consistent Help, 3.3.7 Redundant Entry, 3.3.8 Accessible Authentication).

## 3. Checklist obligatorio por criterio

### Perceptible
- [ ] **1.1.1 Non-text Content**: Todas las imágenes tienen `alt` significativo. Iconos decorativos `aria-hidden="true"`. Gráficos complejos → tabla de datos alternativa.
- [ ] **1.3.1 Info and Relationships**: HTML semántico (`<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`, `<header>`, `<footer>`). Headings jerárquicos (`h1`→`h2`→`h3`). Tablas con `<thead>`, `<th scope="col/row">`, `<caption>`.
- [ ] **1.4.3 Contrast (Minimum)**: Ratio ≥ 4.5:1 texto normal, ≥ 3:1 large text (18.5px bold / 24px). Verificado en **ambos modos** (light/dark) y **todos los roles** (brand tokens). Design System v2 garantiza esto centralmente.
- [ ] **1.4.4 Resize Text**: Zoom 200% sin pérdida de contenido/funcionalidad. Unidades relativas (`rem`, `%`), no `px` fijos en layout.
- [ ] **1.4.10 Reflow**: 320px ancho (mobile) sin scroll horizontal bidireccional. Flex/Grid responsive.
- [ ] **1.4.11 Non-text Contrast**: UI components (borders, focus rings, icons) ≥ 3:1 contra adyacente.
- [ ] **1.4.12 Text Spacing**: Sin pérdida al ajustar: line-height 1.5, paragraph 2x, letter-spacing 0.12em, word-spacing 0.16em.

### Operable
- [ ] **2.1.1 Keyboard**: Toda funcionalidad operable por teclado. Sin `onClick` solo en `div`/`span`.
- [ ] **2.1.2 No Keyboard Trap**: Foco entra y sale de todos los componentes (modals, drawers, dropdowns).
- [ ] **2.4.3 Focus Order**: Tab order lógico (visual = DOM order). `tabindex` solo 0/-1.
- [ ] **2.4.7 Focus Visible**: Focus ring visible siempre (`focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`). Nunca `outline: none` sin replacement.
- [ ] **2.4.11 Focus Not Obscured (2.2)**: Foco no ocultado por sticky headers, footers, chat widgets, cookies banner.
- [ ] **2.5.7 Dragging Movements (2.2)**: Alternativa pointer-only para drag-drop (botones mover arriba/abajo).
- [ ] **2.5.8 Target Size (2.2)**: Targets ≥ 24×24px CSS (excepción: inline en texto, user-agent, essential).
- [ ] **2.4.6 Headings and Labels**: Headings descriptivos. Labels asociados (`<label for>` o `aria-label`/`aria-labelledby`).
- [ ] **2.4.13 Page Break Navigation (2.2)**: Navegación por página en contenido paginado (reportes export).

### Comprensible
- [ ] **3.1.1 Language of Page**: `<html lang="es">` (o locale usuario).
- [ ] **3.2.1 On Focus**: Sin cambio de contexto al recibir foco (no auto-submit, no navigation).
- [ ] **3.2.2 On Input**: Sin cambio de contexto al cambiar input (no auto-navigate en select).
- [ ] **3.2.6 Consistent Help (2.2)**: Ayuda (chat, contacto, docs) en ubicación consistente.
- [ ] **3.3.1 Error Identification**: Errores detectados automáticamente → identificados + descritos en texto.
- [ ] **3.3.2 Labels or Instructions**: Inputs con label visible + instrucciones (`aria-describedby` para help text).
- [ ] **3.3.3 Error Suggestion**: Error de input → sugerencia de corrección (ej. "El email debe contener @").
- [ ] **3.3.7 Redundant Entry (2.2)**: No pedir misma info dos veces en mismo flujo (autocomplete, prefill).
- [ ] **3.3.8 Accessible Authentication (2.2)**: Login sin test cognitivo (no captcha puzzle, no memoria). WebAuthn / magic link / email code permitidos.

### Robusto
- [ ] **4.1.2 Name, Role, Value**: Componentes custom exponen name/role/value via ARIA. Radix/shadcn ya lo hacen.
- [ ] **4.1.3 Status Messages**: Cambios de estado (carga, éxito, error, filtrado) anunciados via `aria-live="polite"` / `role="status"` / `role="alert"`.

## 4. Patrones de implementación en Zentric

| Patrón | Implementación |
|--------|----------------|
| **Focus management** | `FocusScope` (Radix) en modals/drawers. `useFocusOnMount` / `useReturnFocus` hooks. |
| **Skip links** | `<a href="#main" class="sr-only focus:not-sr-only">Saltar al contenido</a>` en root layout. |
| **Live regions** | `Toast` (sonner) usa `aria-live="polite"`. Errores de form `aria-live="assertive"`. |
| **Reduced motion** | `@media (prefers-reduced-motion: reduce)` en `globals.css` → `transition-duration: 0.01ms !important`. |
| **Color + texto** | `StatusBadge` = dot (color) + label (texto). `Alert` = icon + title + description. |
| **Form errors** | `aria-invalid="true"` + `aria-describedby="error-id"` + `role="alert"` en error message. |
| **Data tables** | `<table>` con `<caption>`, `<thead><th scope="col">`, `aria-sort` en sortable headers. |
| **Pagination** | `nav aria-label="Paginación"` + `aria-current="page"` en activo. |
| **Breadcrumbs** | `nav aria-label="Breadcrumb"` + `ol` + `li` + `aria-current="page"`. |

## 5. Testing y CI
- **axe-core** en Vitest (`@axe-core/react`) + Playwright (`@axe-core/playwright`).
- **CI gate**: `npm run test:a11y` falla build si violations ≥ serious.
- **Manual**: NVDA (Windows) / VoiceOver (Mac) en smoke tests por release.
- **Documentación**: Cada componente en `@zentric/ui` tiene `a11y.md` con casos probados.

## 6. Excepciones documentadas
Si un criterio no se puede cumplir (ej. librería 3rd party), se registra en `docs/accessibility-exceptions.md` con:
- Criterio WCAG
- Justificación técnica
- Mitigación alternativa
- Fecha de revisión (máx 6 meses)
- Aprobación de Owner