---
version: "1.1.0"
name: "Zentric Swiss Pulse Editorial — Design Spec (Web & Frame Layer)"
description: >
  Especificación de diseño canónica para el ecosistema Zentric Marketplace Multi-Vendedor,
  construida con la metodología hyperframes-creative (fusión de Swiss Pulse de Josef Müller-Brockmann,
  Code-Editorial y Dark-Premium). El lienzo opera sobre carbón azulado profundo (#0A0E1A, jamás negro
  puro #000000), superficies de medio paso (#111827 / #161F30), elevación por hairlines de 1px (#1F293D)
  con micro-bisel superior, retícula arquitectónica suiza de fondo y un único voltaje semántico primario
  en esmeralda (#00D4AA) acompañado de ámbar operativo (#FFB800) para reservas atómicas de 15 minutos.
unit: "Responsive Web Console (1440×900 primary desktop, 390×844 mobile) & 1920×1080 Frame"
principle: "atoms are sacred · grid is structural · numbers speak in Geist Mono tabular-nums"

colors:
  background: "#0A0E1A"
  surface: "#111827"
  surface-muted: "#161F30"
  surface-elevated: "#1A2438"
  border: "#1F293D"
  border-subtle: "#192231"
  foreground: "#F1F5F9"
  foreground-muted: "#94A3B8"
  foreground-subtle: "#728399"
  brand: "#00D4AA"
  brand-strong: "#00B896"
  warning: "#FFB800"
  success: "#10B981"
  danger: "#EF4444"
  info: "#3B82F6"

borders:
  hairline: "1px solid #1F293D"
  hairline-subtle: "1px solid #192231"
  brand-ring: "1px solid rgba(0, 212, 170, 0.35)"

shadows:
  card: "0 1px 2px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.04)"
  elevated: "0 12px 32px -8px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.05)"
  voltage: "0 4px 20px -2px rgba(0, 212, 170, 0.22)"

typography:
  display:
    fontFamily: "Geist Variable"
    fontSize: "2.5rem"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "-0.028em"
  headline:
    fontFamily: "Geist Variable"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.022em"
  section-title:
    fontFamily: "Geist Variable"
    fontSize: "1.05rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Geist Variable"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.55
  kicker:
    fontFamily: "Geist Mono Variable"
    fontSize: "0.72rem"
    fontWeight: 600
    letterSpacing: "0.14em"
    textTransform: "uppercase"
    mark: "✱ (U+2731) in #00D4AA"
  metric-hero:
    fontFamily: "Geist Mono Variable"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.0
    letterSpacing: "-0.03em"
    fontVariantNumeric: "tabular-nums"
  mono-data:
    fontFamily: "Geist Mono Variable"
    fontSize: "0.8125rem"
    fontWeight: 500
    fontVariantNumeric: "tabular-nums"

spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  radius-sm: "6px"
  radius-md: "8px"
  radius-lg: "12px"
  radius-xl: "16px"
  radius-pill: "9999px"

motion:
  energy: "measured"
  easing:
    entry: "cubic-bezier(0.16, 1, 0.3, 1)"
    exit: "cubic-bezier(0.22, 1, 0.36, 1)"
  duration:
    micro: 0.15
    entrance: 0.3
  atmosphere:
    - swiss-coordinate-grid
    - radial-emerald-bloom
    - hairline-rules

components:
  kicker-spike:
    typography: "{typography.kicker}"
    mark: "✱ (#00D4AA) prefix"
    description: "Eyebrow indexical de sección en Geist Mono uppercase precedido por el asterisco de ocho puntas ✱ en esmeralda."
  hairline-card:
    backgroundColor: "{colors.surface}"
    border: "{borders.hairline}"
    rounded: "{spacing.radius-xl}"
    shadow: "{shadows.card}"
    description: "Superficie operativa con borde estructural de 1px y micro-bisel superior translúcido."
  hero-kpi-strip:
    typography: "{typography.metric-hero} + {typography.kicker}"
    description: "Banda asimétrica de indicadores donde el KPI financiero o transaccional primario domina la lectura en Geist Mono tabular-nums."
  split-frame-dossier:
    layout: "Asymmetric 65% / 35% (Operational) or 55% / 45% (Authentication)"
    description: "Evita el centrado monótono; divide la atención entre la tabla/catálogo maestro y el expediente lateral de inspección."
---

# Zentric Swiss Pulse Editorial — Design System (`design.md`)

## 1. Overview & Creative Direction

**Zentric Swiss Pulse Editorial** sintetiza tres tradiciones de `hyperframes-creative` adaptadas al dominio de un **Marketplace Multi-Vendedor con Arquitectura Hexagonal**:

1. **Swiss Pulse (Josef Müller-Brockmann):** Retícula ortogonal estricta de 12 columnas, números dominantes con `tabular-nums`, etiquetas indexicales en monoespaciado y ausencia total de adornos superfluos.
2. **Code-Editorial:** Elevación mediante **hairlines de `1px`** (`#1F293D` / `#192231`), kickers técnicos precedidos por la marca `✱` (`U+2731`) en color de acento y diferenciación de superficies por medios pasos tonales (`#0A0E1A` → `#111827` → `#161F30`).
3. **Dark-Premium:** Neutros profundos tintados hacia el azul pizarra (nunca gris muerto ni negro puro `#000000`) con un único voltaje primario en **esmeralda/cian operativo (`#00D4AA`)** y un acento táctico secundario en **ámbar (`#FFB800`)** reservado para la ventana crítica de checkout atómico de 15 minutos y alertas de quiebre de stock.

---

## 2. Background Layer & Atmospheric Depth (`house-style.md`)

Siguiendo la regla de capa de fondo de `hyperframes-creative` (*"Every scene needs visual depth — persistent decorative elements that stay visible"*):
- **Retícula Arquitectónica Suiza (`bg-swiss-grid`):** Malla ortogonal sutil de `32px × 32px` a baja opacidad (`rgba(31, 41, 61, 0.35)`) enmascarada radialmente para otorgar profundidad técnica sin competir con la lectura de datos.
- **Resplandor Focal Controlado:** Iluminación cenital esmeralda (`radial-gradient(circle at 50% 0%, rgba(0, 212, 170, 0.10), transparent 68%)`) en cabeceras y portales de acceso.
- **Bisel Estructural (`surface-card`):** Las tarjetas y tablas combinan un borde de `1px solid #1F293D` con un bisel interno superior (`inset 0 1px 0 rgba(255, 255, 255, 0.04)`).

---

## 3. DosVoces Tipográficas (`Geist Variable` + `Geist Mono Variable`)

- **Voz Editorial y de Interfaz (`Geist Variable`):**
  - Encabezados (`h1`, `h2`, `h3`) en pesos `600` y `700` con tracking negativo (`-0.022em` a `-0.028em`).
  - Cuerpo de lectura en peso `400` y etiquetas de control en `500`.
- **Voz Indexical, Financiera y Técnica (`Geist Mono Variable`):**
  - Obligatoria con `font-variant-numeric: tabular-nums` en: precios, comisiones del 5% (`ZentricDetail`), liquidaciones del 95% (`VendorDetail`), conteos físicos de bodega (`ADR-0021`), SKUs, UUIDs de pedidos y cronómetros de reserva de 15 minutos.
  - Todo encabezado de módulo incluye un **Kicker Indexical** (`✱ MÓDULO · ROL`) en `Geist Mono` mayúsculas con tracking `0.14em`.

---

## 4. Do's and Don'ts (Doctrina Anti-IA Genérica)

### ✔️ Do's
- Usar composiciones **Split-Frame Asimétricas** (`55%/45%` en Auth, `65%/35%` o `70%/30%` en consolas operativas) para guiar el ojo.
- Diferenciar tarjetas hero de métricas secundarias (el KPI financiero o de stock crítico debe destacar en escala y peso).
- Mostrar siempre datos reales del dominio Zentric (bodegas físicas, variantes con SKU, facturas `Master` / `VendorDetail` / `ZentricDetail`, estados de custodia logística).

### ❌ Don'ts (Prohibiciones Estrictas)
- **Prohibido** el texto con degradado (`background-clip: text`).
- **Prohibido** el uso de barras laterales gruesas de colores chillones (`border-l-4` multicolor) en tarjetas.
- **Prohibido** el negro puro `#000000` o el blanco puro `#FFFFFF` en grandes superficies.
- **Prohibido** repetir grillas de 4 tarjetas idénticas sin jerarquía visual.
