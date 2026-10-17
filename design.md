# Design Specification — Zentric Sovereign Commerce & Operations Engine (`design.md`)

> **Dirección Creativa (`hyperframes-creative` + `[ADDENDUM - DICTADO POR OWNER 2026-10-17]`):**
> Arquitectura visual **Híbrida de Nueva Generación (Sovereign Commerce + Precision SaaS)**. Diseñada para superar a los marketplaces tradicionales con una identidad propia, táctil, hiper-legible y libre de plantillas genéricas de IA:
> 1. **Storefront Comercial de Alta Conversión (`/buyer`, `/catalog`, `/product/$id`):** Superficies luminosas editoriales (`#F8FAFC` / `#FFFFFF`), fotografía de producto protagonista en relación 4:3 con zoom sutil, tipografía de precios con jerarquía financiera clara, insignias logísticas reales (**`⚡ Zentric Full · Envío Directo`** vs **`📦 Despacho por Vendedor`**) y barra de búsqueda e inventario en vivo.
> 2. **Consolas Operativas SaaS de Precisión (`/seller`, `/admin`, `/logistics`, `/supervisor`):** Estética de comando tipo *Stripe / Shopify Plus / Linear* con cabeceras de contexto claras, tablas de alta densidad con tipografía tabular `Geist Mono`, gestión híbrida de bodegas (*Bodegas Propias* + *Red Zentric Full*) y telemetría operativa en tiempo real.
> 3. **Acceso Rápido QA Discreto (`/login`):** Experiencia de acceso limpia para clientes reales, con el selector de autocompletado de los 5 roles oculto tras un conmutador discreto **`Modo Demo / QA`** desplegable.

---

## 1. Sistema Cromático Dual (Storefront Editorial + SaaS Operativo)

### 1.1 Storefront Comercial (`/buyer`)
- **Canvas Principal:** Marfil Frío Editorial (`#F8FAFC`) con tarjetas en Blanco Puro (`#FFFFFF`) y bordes de precisión (`#E2E8F0`).
- **Texto Primario:** Carbón Profundo (`#0F172A`) para lectura inmediata de títulos y precios.
- **Insignia Zentric Full:** Esmeralda Soberano (`#00A884` sobre `#ECFDF5`) con indicador relámpago de despacho desde centro logístico Zentric.

### 1.2 Consolas Operativas (`/seller`, `/admin`, `/logistics`, `/supervisor`)
- **Canvas Principal:** Carbón Azulado Profundo (`#0B0F19`) con superficies elevadas (`#111827`) y bordes (`#1F293D`).
- **Acento Primario de Acción:** Esmeralda Zentric (`#00D4AA`).
- **Acento de Alerta y Reserva:** Ámbar Táctico (`#FFB800`).

---

## 2. Tipografía y Jerarquía Numérica

- **Interfaz y Narrativa Comercial (`--font-sans`):** `'Geist Sans', 'Inter', system-ui, sans-serif`.
- **Precios, SKUs, Guías, UUIDs y Contadores (`--font-mono`):** `'Geist Mono', monospace` con `font-variant-numeric: tabular-nums`.

---

## 3. Reglas Anti-IA Genérica (Inviolables)

- ❌ Prohibido texto con degradados multicolores.
- ❌ Prohibido bordes izquierdos neón en tarjetas.
- ❌ Prohibido tarjetas sin fotografía en el catálogo del comprador.
- ❌ Prohibido mostrar controles de desarrollo/QA invadiendo la vista principal de clientes sin un toggle explícito.
