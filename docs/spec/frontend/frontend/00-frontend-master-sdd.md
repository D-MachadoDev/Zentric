# Zentric — Frontend Master SDD (Next.js 15 App Router + DDD)

**Estado:** propuesta técnica basada en `zentric-domain-sdd.md` y `02-arquitectura/03-arquitectura-frontend-nextjs.md`
**Tecnología objetivo:** Next.js 15 App Router, React 19, TypeScript 5.6+, TanStack Router v1, TanStack Query v5
**Ámbito:** arquitectura frontend compartida, navegación por rol, contratos, seguridad de interfaz, diseño visual, imágenes, calidad y despliegue.

## 1. Propósito
Definir cómo construir el frontend de Zentric con una experiencia de comercio electrónico inspirada en patrones observables en Mercado Libre, Amazon y Temu, sin copiar su identidad visual ni introducir funciones que no estén aprobadas para Zentric.

La experiencia debe servir dos objetivos complementarios:
1. **Conversión del comprador:** descubrir productos relevantes, entender precio y disponibilidad, confiar en el vendedor y completar la compra con fricción mínima.
2. **Productividad operativa:** ayudar a vendedores, operadores logísticos, administradores y supervisores a completar sus tareas con pocos pasos, información accionable y trazabilidad.

Las referencias de mercado son inspiración de UX, no fuentes de reglas de negocio. Las políticas, estados, permisos y operaciones válidas provienen de los documentos de dominio y de los contratos del backend.

## 2. Fuentes de verdad y decisiones de dominio preservadas
Antes de implementar, el equipo debe leer la versión vigente de `zentric-domain-sdd.md` y los contratos API reales. Este SDD no reemplaza esos documentos.

Decisiones que el frontend debe respetar:
- Los roles son **Buyer, Seller, Logistics Operator, Administrator y Supervisor**.
- Cada usuario tiene un único rol.
- Buyer y Seller son entidades de dominio distintas de `User`; no son subtipos de usuario.
## 3. Objetivos de experiencia por rol

### 3.1 Comprador (Buyer)
- Encontrar productos por búsqueda, categorías, filtros y descubrimiento visual.
- Comparar opciones mostrando precio, variantes, disponibilidad y reputación cuando esos datos existan.
- Entender el costo total y las condiciones antes de confirmar.
- Recibir feedback inequívoco ante errores, pagos pendientes y cambios de disponibilidad.
- Consultar pedidos y su estado real; nunca simular estados de entrega.

### 3.2 Vendedor (Seller)
- Publicar y mantener productos con un flujo guiado y validación contextual.
- Ver ventas, tareas pendientes, productos con bajo inventario y problemas operativos.
- Gestionar pedidos y existencias dentro de su alcance autorizado.
- Identificar oportunidades de mejora sin presentar recomendaciones analíticas si no hay datos que las sustenten.

### 3.3 Operador logístico (Logistics Operator)
- Trabajar desde colas operativas claras y priorizadas por el backend.
- Verificar pedido, artículos, empaque y despacho con pasos guiados y validación de estado.
- Confirmar entrega con evidencia mínima (estado + timestamp).
- Inspeccionar devoluciones y registrar resultado para aprobación del vendedor.

### 3.4 Administrador (Administrator)
- Gestionar usuarios, vendedores, bodegas centrales, productos (moderación), categorías, configuración.
- Acceso global de lectura/escritura según matriz de autorización.
- Configurar transportadoras, políticas comerciales, umbrales de alerta.

### 3.5 Supervisor (Supervisor)
- Consultar métricas agregadas de ventas, pedidos, inventario, logística.
- Auditoría 360° de pedido, libro mayor tributario, fiscalización.
- Exportar reportes (permisos según INC-09).

## 4. Arquitectura compartida (resumen de `02-arquitectura/03-arquitectura-frontend-nextjs.md`)
- **Route groups** por rol: `(buyer)`, `(seller)`, `(logistics)`, `(supervisor)`, `(admin)`, `(auth)`.
- **Middleware** valida sesión y rol → redirige a dashboard correspondiente o login.
- **Layouts anidados**: cada rol tiene su `layout.tsx` con sidebar/header propios y `data-role` attribute para theming.
- **Server Components** por defecto para datos de lectura. **TanStack Query** para mutaciones y client-side fetching.
- **Server Actions** para mutaciones simples con revalidación automática.
- **OpenAPI → TypeScript** generación automática de tipos y cliente API (`orval`).
- **Zod schemas** derivados de OpenAPI para validación de formularios.
- **HttpOnly secure cookies** para tokens (no localStorage).
- **Design System v2** tokens centralizados en `theme.css` (`:root` = light, `.dark` = dark, `[data-role]` = role accent).
- **Componentes**: primitives (`@zentric/ui`) + composite. `class-variance-authority` para variantes.
- **Accesibilidad WCAG 2.2 AA** por defecto (ver `04-experiencia/02-criterios-accesibilidad.md`).
- **Imágenes**: `next/image` con dominios permitidos, placeholder blur, lazy loading, fallback.

## 5. Contratos y tipado
- **Single source of truth**: OpenAPI `v1` del backend.
- **Generación**: `orval` → `src/domain/api/` (tipos, hooks TanStack Query, Zod schemas).
- **No duplicar tipos** manualmente. Regenerar en CI tras cambios de contrato.
- **Versionado**: Frontend consume `v1`. Breaking changes → backend `v2` + frontend migración coordinada.

## 6. Estados de UI obligatorios (ver `04-experiencia/01-principios-ux.md` sección 4)
Cada pantalla asíncrona debe contemplar: carga inicial, carga incremental, contenido, vacío con siguiente paso, error recuperable, sesión expirada, acceso denegado, recurso inexistente, conflicto por estado cambiado, datos desactualizados, operación en curso, operación confirmada, operación fallida.

## 7. Navegación y URL state
- Filtros, paginación, orden en **search params** (compartibles, recargables, back/forward).
- TanStack Router: type-safe params, loaders, `preload` on hover.
- Breadcrumbs automáticos desde ruta.

## 8. Formularios y validación
- **React Hook Form + Zod** (schemas de `orval`).
- Validación en blur + submit. Errores inline bajo campo.
- Submit disabled mientras pending. `useFormStatus` para UX.
- Server Actions para mutaciones simples; API client para complejas.

## 9. Imágenes y medios
- **Upload flow**: Frontend → solicita signed URL a backend → upload directo a storage → confirma a backend.
- **Dominios permitidos** en `next.config.js` (`images.remotePatterns`).
- **Fallbacks**: placeholder genérico por tipo (producto, avatar, logo, categoría, banner).
- **Optimización**: WebP/AVIF automático, tamaños responsive, `priority` above-fold.

## 10. Calidad y Definition of Done
- **Lint/Format**: Biome. `biome check --write .` en pre-commit.
- **Typecheck**: `tsc --noEmit` en CI.
- **Tests**: Unit (Vitest), Component (Testing Library), E2E (Playwright por rol).
- **Visual regression**: Chromatic/Playwright para layouts principales.
- **Bundle analysis**: `@next/bundle-analyzer` en CI.
- **DoD**: Requisitos vinculados a SDD, contratos verificados, 13 estados de UI, responsive, teclado, foco visible, imágenes optimizadas, tests pasan, sin consola errors, sin reglas de negocio duplicadas, docs actualizadas.

## 11. Decisiones pendientes de aprobación
- Versión exacta Next.js/React y estrategia de despliegue (Vercel, Docker, K8s, Static Export).
- Contrato de autenticación, renovación, CSRF, logout (INC-08).
- OpenAPI/contratos backend y formato común de errores (ProblemDetails RFC 7807).
- Servicio de medios, hosts permitidos, subida directa vs proxy, límites, formatos, política URLs (INC-07).
- Política de caché, CDN e invalidación de imágenes.
- Estados y permisos exactos de devolución, reembolso, factura, logística (INC-02, INC-04).
- Datos disponibles para reputación, reviews, promociones, analítica, ETA, recomendaciones (INC-09).
- Política de accesibilidad, privacidad, cookies, analítica (INC-08, INC-09).
- El administrador registra vendedores y su primera bodega; los vendedores no se autorregistran.
- Los productos pueden ser físicos o digitales, pueden tener variantes y usan los estados `Draft`, `Published`, `Suspended` y `Discontinued`.
- El inventario se administra por variante y bodega; no puede ser negativo ni reservar unidades inexistentes o dañadas.
- Un pago validado inicia la preparación. La entrega confirmada permite finalizar el pedido. Un pedido finalizado no se modifica.
- Los detalles de facturación, logística, devoluciones, reembolsos, políticas de publicación y algunos estados/transiciones están incompletos. No deben inventarse en UI como reglas definitivas.
- Los permisos deben considerar rol **y alcance del recurso**. Un vendedor no puede gestionar productos, inventario ni pedidos de otro vendedor.
- No asumir permisos de aprobación de reembolsos, modificación de pedidos ni cambios sensibles para Supervisor; deben venir del contrato de autorización aprobado.
