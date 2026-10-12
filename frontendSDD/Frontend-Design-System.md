# Frontend-Design-System

> Sistema de diseño de la consola Zentric. Define tokens, componentes
> reutilizables, estados obligatorios y criterios de accesibilidad.
> No se usan marcas, logotipos ni material visual de terceros: la identidad
> gráfica es original y propia.
>
> **Decisiones de origen (grill, 2026-10-09):** dirección visual **Q3-A**,
> paleta **Q7-C**, tipografía **Q8-B**, componentes **Q5-B** + **Q14**, logo
> **Q6-D**. Detalle en [`Frontend-SDD.md` §1.2](Frontend-SDD.md#12-decisiones-de-diseño-confirmadas-en-el-grill-q1q20).

---

## 1. Dirección visual

| Atributo | Definición |
| --- | --- |
| Arquetipo | **Dark Developer/Builder (Q3-A):** una herramienta de trabajo, no un folleto. Densidad alta, jerarquía clara, feedback técnico. |
| Personalidad | **Confiable, operativa, sobria.** Información densa, sin decoración superflua. |
| Marca | `#00D4AA` **Cian** — acciones primarias, foco, éxito de marca. |
| Semánticos | Esmeralda = confirmado · Ámbar `#FFB800` = pendiente/énfasis · Rojo = error · Azul = informativo |
| Tipografía | **Geist Sans** (UI) + **Geist Mono** (datos: cifras, IDs, tablas). Ver §2.2. |
| Iconos | **Lucide React** (Q8). Un set, sin mezclar librerías. |
| Densidad | Compacta pero respirada: filas de 40 px, separación por escala de 4 px. |
| Radios | `sm 6` px · `md 8` px · `lg 12` px · `xl 16` px · `full 9999` px (ver §2.3) |

**Prohibido:** degradados decorativos fuera de la marca, sombras como adorno,
animaciones que bloqueen la lectura y color como único indicador de estado.

---

## 2. Tokens

**Tailwind v4 (Q18-A)**: la configuración del tema vive **en CSS**, con la
directriz `@theme`, no en `tailwind.config.ts` (que queda vacío/inexistente para
shadcn). Fuente de verdad: `packages/ui/src/styles/theme.css`.

```css
@import "tailwindcss";

@theme {
  /* Marca (Q7-C) */
  --color-background: #0A0E1A;    /* Carbón — fondo */
  --color-foreground: #F1F5F9;    /* texto principal */
  --color-brand: #00D4AA;         /* Cian — acción primaria */
  --color-brand-strong: #00B896;
  --color-warning: #FFB800;       /* Ámbar — énfasis */
  --color-surface: #111827;
  --color-surface-muted: #1F2937;
  --color-border: #374151;

  /* Semánticos */
  --color-success: #10B981;
  --color-danger: #EF4444;
  --color-info: #3B82F6;

  /* Tipografía (Q8-B) */
  --font-sans: "Geist Sans", system-ui, sans-serif;
  --font-mono: "Geist Mono", ui-monospace, monospace;
}
```

`packages/ui/src/tokens/*.ts` mantiene los **mismos valores en TS**, pero sólo
para lo que se necesita en JavaScript (formateadores de moneda/fecha, validación
de contraste). Si ambos divergen, **manda el CSS**: es lo que pinta la UI.

> **shadcn (Q14):** `npx shadcn@latest init` con `style: new-york-v4` y
> `tailwind.config: ""` (vacío, porque v4 no usa archivo de config). Los
> componentes ya vienen sin `forwardRef` y listos para React 19.

El tema es **oscuro por defecto** (Q3). Si se añade tema claro, se invierten
superficies y se conserva el cian como marca; contraste AA verificado.

### 2.2 Tipografía (Q8-B)

| Rol | Fuente | Uso |
| --- | --- | --- |
| `font-sans` | **Geist Sans**, `system-ui` | UI, títulos, botones, texto corrido |
| `font-mono` | **Geist Mono**, `ui-monospace` | Cifras, IDs/GUID, tablas, código, métricas |

Escala `xs → 4xl` con line-height decreciente (1.5 → 1.2). Pesos 400/500/600/700.
`letter-spacing: -0.02em` en títulos grandes.

> Fuentes alojadas localmente (bundle o `fontsource`), **sin bloqueo por red**:
> se mantiene la regla de no depender de CDNs remotos en tiempo de carga.

### 2.3 Espaciado y forma

- Escala de **4 px**: `0, 1(4), 2(8), 3(12), 4(16), 6(24), 8(32), 12(48), 16(64), 24(96)`.
- Radios: `sm 6` · `md 8` · `lg 12` · `xl 16` · `full 9999` px.
- Sombras: sobrias, sólo para elevación real (menús, diálogos); nunca como adorno.

---

## 3. Componentes obligatorios

Base: **shadcn/ui completo instalado y adaptado (Q14)** en `packages/ui/src/components/ui/`,
más los componentes propios de dominio. cva + tailwind-merge para variantes.

| Componente | Responsabilidad | Regla clave |
| --- | --- | --- |
| `Button` | Acción | Variantes shadcn (`default` = cian, `destructive`, `outline`, `secondary`, `ghost`, `link`) + `loading` con `aria-busy`. |
| `Input` / `Select` / `Textarea` / `Checkbox` | Campo | `label` siempre visible; error enlazado con `aria-describedby`. |
| `Card` | Superficie | Título, cuerpo y pie opcionales. |
| `Table` / `DataTable` | Listado | Esqueleto durante carga; `caption` para lectores de pantalla. |
| `StatusBadge` | Estado | Texto **más** color; punto de color como refuerzo, nunca único indicador. |
| `MoneyAmount` | Importe | `font-mono`, formatea con la moneda del servidor. |
| `EntityCard` | Resumen de entidad | Identificador, estado y acción directa. |
| `Dialog` / `AlertDialog` | Diálogo | Foco atrapado, cierre con `Escape`, `role="dialog"`. |
| `Alert` | Aviso en línea | `role="alert"` en errores. |
| `Skeleton` | Carga | Sin salto de layout al llegar el contenido. |
| `StateView` | Vacío / error | Un componente único para ambos, con acción de reintento. |
| `Logo` / `LogoMark` / `LogoWordmark` | Identidad | Ver §9. |

**Estados semánticos.** `Badge` y `Alert` exponen además `warning`, `success` e
`info`, mapeados a los tokens de Q7/Q8 (`--color-warning: #ffb800`,
`--color-success: #10b981`, `--color-info: #3b82f6`). El tema ya los declaraba
pero la base shadcn no los expresaba, y F4 los necesita para pintar estados de
pedido, despacho, devolución y publicación de producto sin reducir todo a
`secondary`. Sigue vigente la regla de `StatusBadge`: **el color nunca es el
único indicador**, siempre acompaña al texto.

**Componentes de dominio (F4b).** Los tres últimos de la tabla ya están
implementados en `packages/ui`:

| Componente | Contrato |
| --- | --- |
| `StatusBadge` | `tone` (`neutral` · `info` · `warning` · `success` · `danger`) + texto obligatorio. El punto de color es refuerzo, jamás el único portador de significado (§5). |
| `MoneyAmount` | Recibe `amount` y `currency` **del servidor** y sólo formatea con `Intl.NumberFormat`. Nunca recalcula el importe: la moneda y el total los decide el backend. |
| `StateView` | Un único componente para vacío y error (§4). `tone="empty"` usa `role="status"`, `tone="error"` usa `role="alert"`; ambos admiten una acción, que en error es el reintento. |

**Rotulación de los enums del dominio.** Los módulos **no** importan
`domain/` (Frontend-Architecture §2), así que el vocabulario del backend se
traduce a español en `src/components/` —la capa puente, igual que
`errorMessage.ts`—, en `components/domainLabels.ts`. No se inventa ningún
sinónimo: cada rótulo es el término exacto de la Ley.

| Enum | Origen del rótulo | Rótulos |
| --- | --- | --- |
| `UserRole` | `ZENTRIC.md` §5 | Comprador · Vendedor · Operador Logístico · Administrador · Supervisor |
| `ReturnStatus` | Dominio 10 ("Solicitada, Aprobada, Rechazada, Reembolsada") | Solicitada · Aprobada · Rechazada · Reembolsada |
| `WarehouseType` | Dominio 7 ("bodegas del Marketplace y bodegas de Vendedores") | Marketplace · Vendedor |
| `InvoiceType` | Dominio 9 / ADR-0023 | Factura Maestra · Detalle Zentric · Factura de Vendedor |
| `ProductStatus` | Dominio 5 ("Publicado, Suspendido o Descontinuado") | Publicado · Suspendido · Descontinuado |
| `ProductType` | Dominio 5 ("Físico o Digital") | Físico · Digital |

Los mapas se declaran `Record<Enum, string>`: si el backend añade un estado, el
compilador obliga a rotularlo (§4: **ninguna vista queda muda**). Las opciones de
un `Select` se derivan del propio `Record` para que no existan dos fuentes del
mismo vocabulario.

**Tono del `StatusBadge` por estado de devolución.** El tono no es decoración:
señala **quién debe actuar**. La bandeja del Administrador (§2.2) sólo permite
reembolsar una devolución `Aprobada`, así que ése es el único estado en
`warning`; el texto siempre acompaña al color (§5).

| Estado | Tono |
| --- | --- |
| `Requested` (Solicitada) | `info` |
| `Approved` (Aprobada) | `warning` |
| `Rejected` (Rechazada) | `danger` |
| `Refunded` (Reembolsada) | `success` |

**Tono del `StatusBadge` por estado de producto (F4c).** En la vista de gestión
del Vendedor (§2.3) lo que exige acción es el producto **fuera** del catálogo: el
`Suspendido`, que sólo se reactiva publicándolo.

| Estado | Tono |
| --- | --- |
| `Published` (Publicado) | `success` |
| `Suspended` (Suspendido) | `warning` |
| `Discontinued` (Descontinuado) | `neutral` |

---

## 4. Estados obligatorios (requisito RNF-02)

**Ninguna vista queda muda.** Cada módulo declara los cuatro estados:

| Estado | Componente | Contenido |
| --- | --- | --- |
| Carga | `Skeleton` / `TableSkeleton` | Estructura visible, sin salto de layout |
| Vacío | `StateView` | Explicación y **siguiente acción útil** |
| Error | `StateView` tono error | Mensaje del servidor + reintento |
| Éxito | Contenido | Datos + acción siguiente |

Ejemplo de estado vacío correcto:

> **Todavía no hay bodegas registradas.**
> Registrá la primera bodega para poder asignarle inventario.
> `[ Registrar bodega ]`

Incorrecto: un panel blanco sin explicación.

---

## 5. Accesibilidad (requisito RNF-01)

| Criterio | Regla |
| --- | --- |
| Contraste | Mínimo AA (4.5:1 texto normal, 3:1 texto grande y componentes) |
| Foco | Anillo visible (`--ring: #00D4AA`) en todo elemento interactivo; nunca se suprime |
| Teclado | Todo el flujo es navegable; `Escape` cierra diálogos |
| Etiquetas | Cada campo tiene `label` visible; los iconos tienen `aria-label` |
| Anuncios | Carga y errores usan `role="status"` y `role="alert"` |
| Movimiento | `prefers-reduced-motion` desactiva transiciones y animaciones |
| Estructura | Un solo `h1` por vista; jerarquía de encabezados sin saltos |
| Color | Nunca el único portador de significado |

---

## 6. Responsive (requisito RNF-03)

| Punto de corte | Comportamiento |
| --- | --- |
| `> 900 px` | Barra lateral fija + contenido con ancho máximo de 1440 px |
| `≤ 900 px` | La barra lateral pasa a navegación horizontal desplazable |
| `≤ 560 px` | Encabezados apilados, botones a ancho completo, columnas secundarias ocultas |

Las tablas conservan desplazamiento horizontal controlado; nunca se comprimen
hasta ilegibles.

---

## 7. Movimiento

| Uso | Duración | Curva |
| --- | --- | --- |
| Hover de botón o enlace | 120 ms | `ease-out` |
| Aparición de diálogo | 200 ms | `ease-out` |
| Esqueleto pulsante | 1.4 s en bucle | `linear` |
| Indicador de carga | 700 ms por vuelta | `linear` |

Las animaciones nunca bloquean la entrada del usuario y se desactivan con
`prefers-reduced-motion: reduce`.

---

## 8. Voz y copy

- Español rioplatense neutro, sin coloquialismo excesivo.
- Títulos en infinitivo: **"Registrar usuario"**, no "Registro de usuario".
- Errores: dicen qué pasó y qué hacer. **"No se pudo conectar con el servidor.
  Verificá que la API esté en ejecución."** Nunca "Error 500".
- Estados vacíos: explican y ofrecen la acción siguiente.

---

## 9. Identidad gráfica (Q6-D)

- **Concepto: "Z + Órbita/Centro".** La `Z` es el centro de gravedad del
  sistema; a su alrededor, órbitas que representan las entidades del dominio
  (productos, bodegas, pedidos) girando bajo su control. Leé como
  "el centro del comercio".
- **Marca tipográfica "Zentric"** con el monograma como `LogoMark`.
- Componentes: `LogoMark` (sólo símbolo), `LogoWordmark` (sólo texto),
  `Logo` (completo, con variante `showTagline` — *"Sistema Operativo para
  Comercio"*, Q1).
- **Prohibido:** logotipos, nombres o material visual de terceros; imágenes de
  stock con licencia indeterminada; fuentes remotas bloqueantes.
- Los recursos gráficos son SVG propios generados en el repositorio.
