# Principios de experiencia de usuario — Zentric

## 1. Propósito
Definir los principios de UX que guían el diseño de todas las interfaces de Zentric, asegurando coherencia, accesibilidad y alineación con las reglas de negocio del dominio.

## 2. Principios rectores

### 2.1 Claridad sobre densidad
- La información crítica (precio, disponibilidad, estado) nunca se oculta detrás de interacciones.
- Un solo significado por elemento visual; el color refuerza, no sustituye al texto.

### 2.2 Confianza mediante transparencia
- Estados reales, nunca simulados. Si el backend no confirma, la UI dice "pendiente" o "cargando".
- Errores explican qué pasó y qué hacer, sin jerga técnica ni stack traces.

### 2.3 Eficiencia operativa
- Flujos de vendedor, logística, admin y supervisor optimizados para tareas repetitivas: atajos, bulk actions, columnas configurables.
- Comprador: descubrimiento → decisión → compra en mínimo pasos, sin fricción innecesaria.

### 2.4 Consistencia cross-rol
- Mismos patrones de navegación, formularios, tablas, estados de carga/error/vacío en todos los roles.
- Design System único (`@zentric/ui`) con tokens centralizados.

### 2.5 Accesibilidad por defecto (WCAG 2.2 AA)
- Semántica HTML, focus visible, keyboard-first, color + texto, reduced motion.
- Tests automatizados (axe-core) en CI.

### 2.6 Responsive real
- Mobile-first. Breakpoints: `sm` (640), `md` (768), `lg` (1024), `xl` (1280), `2xl` (1536).
- Tablas → cards en móvil; sidebars → drawer; toolbars → bottom sheet.

### 2.7 Internacionalización preparada
- Textos en español (fuente), estructura i18n-ready (next-intl / lingui).
- Fechas, números, monedas según locale del usuario.

## 3. Patrones de interacción estándar

| Patrón | Descripción | Aplicación |
|--------|-------------|------------|
| **Server-first reading** | Server Components para datos iniciales | Listados, dashboards, detalle |
| **Optimistic mutations** | UI actualiza al instante, rollback si falla | Carrito, filtros, AddStock, Pack/Dispatch |
| **Skeleton + streaming** | Placeholders mientras carga data real | Todas las páginas async |
| **Empty state con CTA** | "No hay X. [Crear primero / Ajustar filtros]" | Listados, búsquedas sin resultados |
| **Error recoverable** | Toast + botón "Reintentar" + link a ayuda | Fallos red, validación, 4xx/5xx |
| **Confirmation dialog** | Destructive actions: modal con foco gestionado | Delete, Cancelar pedido, Rechazar devolución |

## 4. Estados de UI obligatorios (por pantalla async)
1. **Carga inicial** — Skeleton estructural
2. **Carga incremental** — Spinner en sección
3. **Contenido** — Data renderizada
4. **Vacío con siguiente paso** — Ilustración + CTA
5. **Error recuperable** — Mensaje + Reintentar
6. **Sesión expirada** — Redirect a login con `returnUrl`
7. **Acceso denegado** — 403 con explicación + link a soporte
8. **Recurso inexistente** — 404 con búsqueda/nav alternativa
9. **Conflicto por estado cambiado** — "Este recurso cambió. [Recargar]"
10. **Datos desactualizados** — Banner "Hay datos nuevos. [Actualizar]"
11. **Operación en curso** — Disabled + spinner + "Procesando..."
12. **Operación confirmada** — Toast success + navegación si aplica
13. **Operación fallida** — Toast error + detalle + Reintentar

## 5. Tipografía y jerarquía visual
- **Headings**: `h1` (page title), `h2` (section), `h3` (subsection). `font-heading` (Geist Variable), tracking tight.
- **Body**: `text-base` / `text-sm`, `font-sans`, line-height 1.6.
- **Mono**: `font-mono` (Geist Mono) para SKUs, IDs, precios, cantidades, códigos.
- **Labels**: `text-xs` `font-semibold` `text-foreground-muted` uppercase tracking-wider.

## 6. Color y significado (Design System v2)
- **Semantic tokens only**: `--success`, `--warning`, `--danger`, `--info`, `--brand` (por rol via `[data-role]`).
- **Nunca** colores hardcodeados (`red-500`, `green-600`, etc.).
- **StatusBadge**: dot (6px) + texto obligatorio. Color no es único portador.

## 7. Imágenes y media
- `next/image` con `sizes`, `priority` above-fold, `placeholder="blur"`, `loading="lazy"`.
- Fallback por tipo: producto, avatar, logo tienda, categoría, banner.
- Dominios permitidos en `next.config.js`. No URLs arbitrarias.

## 8. Formularios
- **React Hook Form + Zod** (schemas derivados de OpenAPI).
- Validación en blur + submit. Errores inline bajo campo.
- Submit disabled mientras pending. `useFormStatus` para UX.
- Server Actions para mutaciones simples; API client para complejas.

## 9. Navegación y URL state
- Filtros, paginación, orden en **search params** (compartibles, recargables, back/forward).
- TanStack Router: type-safe params, loaders, `preload` on hover.
- Breadcrumbs automáticos desde ruta.

## 10. Métricas UX (instrumentación con consentimiento)
- Búsqueda enviada / sin resultados / filtro aplicado
- Vista producto / selección variante / add to cart
- Inicio checkout / error validación / pago confirmado / abandono
- Publicar producto / editar / error validación
- Acción inventario / pack / dispatch / deliver
- Error autorización / conflicto estado / error red

## 11. Criterios de aceptación transversales
- [ ] Pantalla cubre los 13 estados de UI obligatorios
- [ ] Responsive en 5 breakpoints
- [ ] Teclado completo + focus visible + skip links
- [ ] Color + texto (sin solo color)
- [ ] Reduced motion respetado
- [ ] Imágenes: alt, dimensiones, fallback, dominio permitido
- [ ] Formularios: validación UX + server, error inline, submit disabled pending
- [ ] No reglas de negocio en cliente (solo presentación)
- [ ] Contratos API verificados (OpenAPI types)
- [ ] Tests: unit, component, E2E (rol específico)
- [ ] Documentación actualizada (SDD + ADR si decisión nueva)