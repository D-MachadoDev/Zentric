# Arquitectura Frontend — Zentric (Next.js 15 App Router + React 19 + TypeScript)

## 1. Stack y versiones objetivo
- **Next.js 15** (App Router, Server Components por defecto, Streaming, Actions).
- **React 19** (Compiler, useOptimistic, useFormStatus, Server Actions).
- **TypeScript 5.6+** (strict mode, exactOptionalPropertyTypes).
- **TanStack Router** (type-safe routing, loader/data, search params).
- **TanStack Query v5** (server state, cache, invalidation, mutations).
- **React Hook Form + Zod** (form validation, type-safe).
- **Radix UI / shadcn-ui** (primitives accesibles, no opinados).
- **Tailwind CSS v4** (design tokens, @theme inline, dark mode via class).
- **Zustand / Jotai** (client state mínimo: UI, filtros, carrito optimista).
- **Vitest + Playwright** (unit, component, E2E).

## 2. Estructura de carpetas (apps/frontend/src)

```
src/
├── app/                    # App Router: layouts, pages, route groups
│   ├── (auth)/             # login, register, recovery
│   ├── (buyer)/            # catálogo, carrito, checkout, pedidos, perfil
│   ├── (seller)/           # dashboard, productos, inventario, pedidos, cumplimientos
│   ├── (logistics)/        # cola despachos, operaciones, inspección devoluciones
│   ├── (supervisor)/       # auditoría 360°, métricas, fiscalización
│   ├── (admin)/            # usuarios, vendedores, bodegas, config, reportes
│   ├── api/                # Server Actions / Route Handlers (proxy, upload auth)
│   └── layout.tsx          # Root layout: providers, fonts, global styles
├── components/
│   ├── ui/                 # Primitives (Button, Input, Badge, Alert, etc.)
│   ├── composite/          # Composite (StatusBadge, StatCard, OrderTimeline, etc.)
│   ├── layout/             # Sidebar, Header, Footer, Breadcrumbs
│   ├── forms/              # FormField, FormSelect, FormDatePicker, etc.
│   └── feedback/           # Toast, Modal, Skeleton, EmptyState, ErrorBoundary
├── domain/                 # Domain models, enums, ports, rules
├── application/
│   ├── services/           # React Query hooks, mutations, API client
│   └── schemas/            # Zod schemas for forms (shared validation)
├── modules/                # Feature modules por rol (pages + components específicos)
│   ├── buyer/
│   ├── seller/
│   ├── logistics/
│   ├── supervisor/
│   ├── admin/
│   └── auth/
├── lib/                    # Utilities: cn, formatters, date, constants
├── styles/                 # theme.css (tokens), globals.css, shadcn-tailwind.css
├── hooks/                  # Custom hooks (useDebounce, useMediaQuery, etc.)
└── middleware.ts           # Auth guard, locale, role-based redirects
```

## 3. Navegación y routing por rol
- **Route groups** por rol: `(buyer)`, `(seller)`, `(logistics)`, `(supervisor)`, `(admin)`, `(auth)`.
- **Middleware** valida sesión y rol → redirige a dashboard correspondiente o login.
- **Layouts anidados**: cada rol tiene su `layout.tsx` con sidebar/header propios y `data-role` attribute para theming.
- **Deep linking**: URLs compartibles con estado en search params (filtros, paginación, orden).

## 4. Estado y data fetching
- **Server Components** por defecto para datos de lectura (listados, detalles, dashboards).
- **TanStack Query** para client-side fetching en componentes interactivos (mutaciones, polling, infinite scroll).
- **Server Actions** para mutaciones simples (formularios, acciones de UI) con revalidación automática.
- **Optimistic updates** en carrito, filtros, acciones de inventario con rollback en error.
- **No estado global de negocio** (no Redux/Context para entidades). Solo UI state local.

## 5. Contratos y tipos
- **OpenAPI → TypeScript**: generación automática de tipos y cliente API (`openapi-typescript`, `orval`).
- **Zod schemas** derivados de OpenAPI para validación de formularios (single source of truth).
- **No duplicar tipos** entre frontend y backend: consumir desde contrato.

## 6. Autenticación y sesión
- **HttpOnly secure cookies** para access/refresh tokens (no localStorage).
- **SessionPort** abstrae acceso a sesión (user, rol, entidad de negocio).
- **Server-side session validation** en middleware y Server Components.
- **Refresh automático** transparente vía interceptor en cliente API.

## 7. Autorización en UI (no autoritativa)
- **Role-based rendering**: componentes/rutas condicionales por `session.user.role`.
- **Scope checks**: hooks `useCan(action, resource)` consumen permisos de sesión/backends.
- **Nunca confiar en UI**: backend valida todo. UI solo oculta/muestra para UX.

## 9. Accesibilidad (WCAG 2.2 AA)
- Semántica HTML correcta, landmarks, headings hierarchy.
- Focus visible, skip links, keyboard navigation completa.
- ARIA labels/descriptions donde falte semántica nativa.
- Color no único portador de significado (StatusBadge: dot + texto).
- Reduced motion respectado (`prefers-reduced-motion`).
- Tests: `axe-core` en CI, Playwright a11y audits.

## 10. Imágenes y medios
- **Upload flow**: Frontend → solicita signed URL a backend → upload directo a storage → confirma a backend.
- **Dominios permitidos** en `next.config.js` (`images.remotePatterns`).
- **Fallbacks**: placeholder genérico por tipo (producto, avatar, logo, categoría).
- **Optimización**: WebP/AVIF automático, tamaños responsive, `priority` above-fold.

## 11. Calidad y Definition of Done
- **Lint/Format**: Biome (fast, unified). `biome check --write .` en pre-commit.
- **Typecheck**: `tsc --noEmit` en CI.
- **Tests**: Unit (Vitest), Component (Testing Library), E2E (Playwright por rol).
- **Visual regression**: Chromatic/Playwright para layouts principales.
- **Bundle analysis**: `@next/bundle-analyzer` en CI.
- **DoD**: Requisitos vinculados a SDD, contratos verificados, estados carga/error/vacío/éxito, responsive, teclado, foco visible, imágenes optimizadas, tests pasan, sin consola errors, sin reglas de negocio duplicadas, docs actualizadas.

## 12. Decisiones pendientes de aprobación
- Versión exacta Next.js/React y estrategia de despliegue (Vercel, Docker, K8s, Static Export).
- Contrato de autenticación, renovación, CSRF, logout (ver INC-08).
- OpenAPI/contratos backend y formato común de errores (ProblemDetails RFC 7807).
- Servicio de medios, hosts permitidos, subida directa vs proxy, límites, formatos, política URLs (INC-07).
- Política de caché, CDN e invalidación de imágenes.
- Estados y permisos exactos de devolución, reembolso, factura, logística (INC-02, INC-04).
- Datos disponibles para reputación, reviews, promociones, analítica, ETA, recomendaciones (INC-09).
- Política de accesibilidad, privacidad, cookies, analítica (INC-08, INC-09).
## 8. Diseño visual y theming
- **Tokens centralizados** en `theme.css` (`:root` = light, `.dark` = dark, `[data-role]` = role accent).
- **Design System v2 "Porcelana y Grafito"** (ADDENDUM §9): contraste WCAG 2.1 AA verificado en ambos modos.
- **Componentes**: primitives (`@zentric/ui`) + composite. `class-variance-authority` para variantes.
- **Fuentes**: Geist Variable (sans), Geist Mono Variable (mono) — local, sin CDN.
- **Imágenes**: `next/image` con dominios permitidos, placeholder blur, lazy loading, fallback.
│   ├── models/             # Product, Order, Inventory, User, Warehouse, etc.
│   ├── enums/              # OrderStatus, ProductStatus, UserRole, etc.
│   ├── ports/              # ZentricApiPort, SessionPort, AlertPort
│   └── rules/              # Presentation rules (formatting, availability labels)
