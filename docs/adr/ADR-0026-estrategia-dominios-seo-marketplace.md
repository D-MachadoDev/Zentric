# ADR-0026 — Estrategia de Dominios y SEO para Marketplace Multi-Vendedor

- **Estado:** [APROBADO]
- **Fecha:** 2026-11-20
- **Autor:** Architecture & Engineering Team
- **Ámbito:** Frontend (`apps/frontend`), Backend (`Zentric.Api`) y Routing
- **Relacionado con:** [ADR-0002](ADR-0002-clave-inventario-variantid.md) (VariantId como SKU) y [ADR-0009](ADR-0009-autenticacion-jwt-rg01.md) (Autenticación JWT)

---

## Contexto

Zentric opera como una plataforma multi-vendedor donde la captación orgánica de compradores (Buyer Acquisition) y la visibilidad de los catálogos en motores de búsqueda (Google, Bing) y redes sociales representan un requisito crítico no funcional de crecimiento.

Actualmente, el frontend opera como una Single Page Application (SPA) en React 19 con TanStack Router. Esto plantea dos tensiones arquitectónicas:

1. **Topología de Dominios y Reputación SEO**: Determinar si las tiendas de vendedores deben vivir en subdominios independientes (`vendor.zentric.me`), en dominios personalizados de terceros (`vendor.com`), o bajo subdirectorios consolidados del dominio principal (`zentric.me/v/vendor-slug`). La dispersión en subdominios fragmenta el Domain Authority (PageRank) y complica la gestión de cookies de sesión JWT (`ADR-0009`) y certificados TLS wildcard.
2. **Indexabilidad y Metadatos en Arquitectura SPA**: Las fichas de producto (PDP) requieren indexación profunda, rastreo por bots que no ejecutan JavaScript complejo y tarjetas de previsualización social (OpenGraph y Twitter Cards para WhatsApp, X, Facebook).

---

## Alternativas Consideradas

| | Opción | Por qué se descartó / Ventaja |
|---|---|---|
| **A** | **Subdirectorios consolidados (`zentric.me/p/...` y `zentric.me/v/...`) con Edge Pre-rendering / OpenGraph injection** | — **Elegida.** Centraliza la autoridad de dominio en un único host, simplifica CORS/JWT y optimiza el rastreo. |
| **B** | Subdominios independientes por vendedor (`*.zentric.me`) | Fragmenta el PageRank en miles de dominios aislados con autoridad cero; encarece y complejiza la infraestructura DNS/TLS y rompe el aislamiento estándar de cookies JWT. |
| **C** | Single Page Application pura (CSR) sin intervención para SEO | Tiempos de indexación lentos, penalización severa en Core Web Vitals (LCP/CLS) y fallo absoluto en la generación de previews sociales al compartir enlaces. |

---

## Decisión

Se adopta la estrategia de **Subdirectorios Canónicos Unificados con Edge Pre-rendering y Metadatos Estructurados**:

1. **Estructura Canónica de Enrutamiento**:
   - Fichas de Producto (PDP): `https://zentric.me/p/{slug}-{shortId}`
   - Páginas de Tienda / Vendedor: `https://zentric.me/v/{vendorSlug}`
   - Catálogo y Categorías: `https://zentric.me/c/{categorySlug}`
   - Toda URL de producto contiene un slug human-readable y normalizado (kebab-case) derivado del nombre del producto, seguido de un identificador base62/GUID corto.

2. **Consolidación de Autoridad y Canonicidad (`rel="canonical"`)**:
   - La variante principal del producto porta la URL canónica. Las selecciones de variantes secundarias no cromáticas (tallas, medidas) gestionan parámetros de consulta (`?variant=SKU`) con etiqueta `<link rel="canonical" href="https://zentric.me/p/{slug}-{shortId}">` para evitar penalizaciones por contenido duplicado.

3. **Inyección de Metadatos y Schema.org (JSON-LD)**:
   - El backend expone endpoints públicos para alimentar el pre-renderizado:
     - `GET /api/catalog/products/{slug}/seo-metadata`: retorna OpenGraph tags (`og:title`, `og:image`, `og:description`, `og:price:amount`, `og:price:currency`) y payload Schema.org `Product` & `Offer`.
   - Nginx / Cloudflare Worker inyecta estos metadatos en la cabecera `<head>` del HTML antes de entregar la cáscara al bot o navegador.

4. **Sitemap Dinámico y Robots**:
   - La API genera dinámicamente `/sitemap-products.xml` y `/sitemap-vendors.xml` cacheados con TTL de 6 horas para orquestar el rastreo de Googlebot.

---

## Trade-offs Evaluados

- **Qué Ganamos:**
  - Máxima concentración de autoridad SEO en un solo dominio raíz (`zentric.me`).
  - Cero fricción de cookies cross-domain para la autenticación JWT (`ADR-0009`).
  - Previsualizaciones sociales instantáneas y ricas en WhatsApp, LinkedIn y buscadores.
- **Qué Sacrificamos:**
  - Requisito de mantener slugs únicos en la base de datos (añade columna e índice único `slug` en el modelo `Product`).
  - Necesidad de un middleware de pre-renderizado o Cloudflare Worker para servir las etiquetas sociales antes de la hidratación completa de React.

---

## Consecuencias

- **En Dominio y Backend:** Se añade la propiedad `Slug` en la entidad `Product`, generada automáticamente en `Product.Create()` y validada contra colisiones mediante sufijo numérico determinista.
- **En Frontend:** TanStack Router adopta las rutas `/p/$productSlug` y `/v/$vendorSlug`, sincronizando los tags `<title>` y `<meta>` en tiempo de renderizado con `@tanstack/react-router`.
- **En Infraestructura:** Se descartan certificados SSL multi-tenant dinámicos, manteniendo un único certificado TLS corporativo.
