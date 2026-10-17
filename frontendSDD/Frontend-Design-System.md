# Sistema de Diseño, Tokens Semánticos y Composición Visual (Frontend Design System)

> Especificación normativa del sistema de diseño para la consola web de **Zentric Marketplace** (`frontend/packages/ui` y `frontend/apps/frontend`).  
> Define la arquitectura de profundidad en tres capas, la paleta de neutros tintados en Tailwind CSS v4 (`@theme`), la tipografía de tres voces con disciplina OpenType, el catálogo de componentes (`primitives/` y `composite/`), el mapeo exhaustivo de enumeraciones del dominio con procedencia exacta del backend C# y la compuerta de adherencia visual post-autoría.

---

## 1. Especificación Normativa de Identidad Visual (Design Spec Baseline)

| Dimensión de Diseño | Definición Normativa Vinculante | Procedencia / Regla de Gobernanza |
|---|---|---|
| **Arquetipo Estético** | **Dark Developer / Swiss Operational Console:** Consola operativa de alta densidad informativa, cuadrículas estructurales de `1px`, contraste medido y composición asimétrica por zonas (*Split-Frame*). | [`AGENTS.md`](../AGENTS.md) §4.14 y doctrina visual *Hyperframes Creative* (`house-style`, `visual-styles`). |
| **Lienzo y Superficies** | Neutros de carbón azulado profundo (`#0A0E1A`, `#111827`, `#161F30`) con bordes estructurales sutiles (`#1F293D`, `#192231`). | Prohibido el negro absoluto `#000000` en fondos planos y los grises neutros sin saturación (`#808080`, `#888888`). |
| **Acento Semántico Único** | Acción primaria e indicadores de foco en **Esmeralda / Cian Suave (`#00D4AA`)**; estados de atención temporal (ventana de checkout de 15 minutos) en **Ámbar (`#FFB800`)**. | Prohibidos los esquemas multicolores arbitrarios ("arcoíris visual") o acentos cian/púrpura neón sobre negro puro. |
| **Sistema Tipográfico de 3 Voces** | **Geist Sans** (Autoridad estructural en `600`/`700` y prosa operativa en `400`/`500`) + **Geist Mono** (Telemetría, importes monetarios, SKUs, GUIDs y temporizadores con `tabular-nums`). | Empaquetado local mediante `@fontsource/geist-sans` y `@fontsource/geist-mono` (cero dependencias de CDNs externos). |
| **Coreografía de Movimiento** | Transiciones funcionales de `150ms` a `200ms` con curva de desaceleración exponencial `cubic-bezier(0.16, 1, 0.3, 1)` (`expo.out`). | Cero animaciones decorativas de rebote (*spring bounce*). Respeto absoluto a `@media (prefers-reduced-motion: reduce)`. |
| **Identidad Gráfica Propia** | Monograma vectorial **Zentric Core** (*"Z + Órbita/Centro"*) con leyenda *"Sistema Operativo para Comercio"*. | SVG nativo en `packages/ui/src/logo/`. Prohibido incorporar marcas o logotipos de terceros. |

---

## 2. Arquitectura de Profundidad en Tres Capas y Composición de Marcos (Split-Frame)

Para erradicar la apariencia de plantilla genérica de IA (tarjetas clonadas de igual peso flotando en el vacío), toda pantalla de la consola se construye sobre tres planos de profundidad y composición asimétrica:

### 2.1 Las Tres Capas de Profundidad Espacial
1. **Capa 1 — Lienzo Base (`Background Layer`):**
   - Fondo continuo en carbón azulado profundo (`--color-background: #0A0E1A`).
   - Líneas divisorias estructurales continuas de `1px solid #192231` (`--color-border-subtle`) que anclan la barra lateral, la barra superior de contexto y las zonas de trabajo.
   - **Iluminación Focal Controlada:** Se permite exclusivamente un resplandor radial localizado (`radial-gradient(circle at 50% 0%, rgba(0, 212, 170, 0.12), transparent 65%)`) en la cabecera de autenticación (`/login`, `/register`) y en el encabezado del panel principal. Quedan **estrictamente prohibidos** los degradados lineales de pantalla completa para evitar el bandeado de color (*8-bit color banding*).
2. **Capa 2 — Superficies Operativas y Zonas Asimétricas (`Midground Layer`):**
   - Contenedores de datos y paneles en carbón tintado (`--color-surface: #111827`) y superficies secundarias o cabeceras de tabla en carbón elevado (`--color-surface-muted: #161F30`) delimitados por bordes de `1px solid #1F293D` (`--color-border`).
   - **Composición por Zonas (*Split-Frame Layout*):** Las vistas operativas dividen el espacio de trabajo en proporciones asimétricas (`65% / 35%` o `70% / 30%` en escritorio):
     - *Zona Primaria (65%–70%):* Tabla de alta densidad (`DataTable`) o cuadrícula principal de catálogo.
     - *Zona Secundaria (30%–35%):* Panel contextual de inspección rápida (`ResponsiveDrawer`), resumen de carrito con precio congelado o desglose tributario de facturación split.
   - **Banda Asimétrica de Indicadores (KPI Strip):** Los paneles ejecutivos (`/admin`, `/seller`, `/supervisor`) destacan **una métrica principal dominante** acompañada de contadores secundarios compactos en línea, prohibiendo las cuadrículas de 4 tarjetas clonadas idénticas.
3. **Capa 3 — Telemetría, Insignias y Foco Activo (`Foreground Layer`):**
   - Texto primario en blanco hueso tintado (`--color-foreground: #F1F5F9`), texto secundario en gris pizarra claro (`--color-foreground-muted: #94A3B8`) y metadatos técnicos en gris pizarra medio (`--color-foreground-subtle: #728399`).
   - Indicadores semánticos (`StatusBadge`), importes tabulares (`MoneyAmount`), píldoras de código SKU/GUID y anillos de foco accesibles (`2px solid #00D4AA` con `offset` de `2px`).

### 2.2 Patrones Visuales Estrictamente Prohibidos (Anti-IA Genérica)
- ❌ **Prohibido el texto con degradados multicolores** en títulos o encabezados (*"AI gradient text"*).
- ❌ **Prohibidos los bordes izquierdos gruesos de colores chillones** (`border-l-4`) en tarjetas o alertas.
- ❌ **Prohibidas las sombras difusas pesadas o neón** (`box-shadow` con resplandores cian o violeta sobre fondo negro `#000000`).
- ❌ **Prohibidas las tarjetas clonadas de igual jerarquía** sin diferenciación de densidad entre el dato primario (en `Geist Mono` `600`) y el metadato secundario.

---

## 3. Tokens Semánticos de Diseño (Tailwind CSS v4 `@theme`)

En Tailwind CSS v4, la fuente de verdad estilística reside en `packages/ui/src/styles/theme.css` mediante la directiva `@theme` (sin archivo `tailwind.config.ts`). El archivo `packages/ui/src/tokens/colors.ts` espeja estos valores exclusivamente para cálculos programáticos en TypeScript:

| Token CSS (`@theme`) | Valor Canónico | Rol Semántico y Restricciones de Uso |
|---|---|---|
| `--color-background` | `#0A0E1A` | Lienzo principal de la consola (carbón azulado profundo). |
| `--color-surface` | `#111827` | Superficie primaria de tarjetas, tablas, paneles laterales y modales. |
| `--color-surface-muted` | `#161F30` | Superficie secundaria para cabeceras de tabla, filas en *hover* y bloques de código. |
| `--color-foreground` | `#F1F5F9` | Texto primario de alto contraste (razón de contraste $> 14:1$ sobre `#0A0E1A`). |
| `--color-foreground-muted` | `#94A3B8` | Texto secundario para descripciones, subtítulos y etiquetas de soporte (contraste $\ge 6.2:1$). |
| `--color-foreground-subtle` | `#728399` | Texto terciario para marcas de agua, *placeholders* y metadatos no críticos (contraste $\ge 4.5:1$). |
| `--color-border` | `#1F293D` | Borde estructural estándar (`1px solid`) de tarjetas, entradas de formulario y celdas. |
| `--color-border-subtle` | `#192231` | Líneas divisorias internas (*hairlines*) entre filas de tabla y secciones de panel. |
| `--color-brand` | `#00D4AA` | Acento primario único (esmeralda/cian suave) para botones de acción principal y anillos de foco. |
| `--color-brand-strong` | `#00B896` | Estado *hover* / activo del acento primario. |
| `--color-warning` | `#FFB800` | Acento ámbar para estados transitorios (`PendingPayment`, `PendingPack`) y el reloj de checkout de 15 minutos. |
| `--color-success` | `#10B981` | Estado confirmado (`Paid`, `Delivered`, `Approved`, `Published`, `Active`). |
| `--color-danger` | `#EF4444` | Acciones destructivas, errores de validación RFC 7807 y estados terminales (`Cancelled`, `Rejected`, `Blocked`, `Anulled`). |
| `--color-info` | `#3B82F6` | Estados informativos de tránsito o auditoría (`Dispatched`, `Packed`, `Requested`, `Refunded`). |
| `--font-sans` | `"Geist Sans", system-ui, sans-serif` | Tipografía de estructura, navegación, formularios y lectura. |
| `--font-mono` | `"Geist Mono", ui-monospace, monospace` | Tipografía obligatoria para datos tabulares, monedas, SKUs, GUIDs, fechas ISO y temporizadores. |
| `--radius-sm` / `md` / `lg` / `xl` | `6px` / `8px` / `12px` / `16px` | Escala de radios de borde (`6px` en insignias e inputs; `8px` en botones y tarjetas; `12px` en modales). |
| `--ease-out-expo` | `cubic-bezier(0.16, 1, 0.3, 1)` | Curva de transición estándar para apertura de paneles laterales (`ResponsiveDrawer`) y diálogos. |

---

## 4. Sistema Tipográfico de Tres Voces y Disciplina OpenType

Siguiendo las reglas de composición tipográfica profesional sobre fondos oscuros (*Hyperframes Creative — Typography Reference*):

### 4.1 Las Tres Voces Tipográficas

| Voz Tipográfica | Familia y Pesos | Escala y Tracking | Compensación Óptica y Reglas de Aplicación |
|---|---|---|---|
| **Voz 1: Autoridad Estructural** | `Geist Sans` (`600` SemiBold, `700` Bold) | `2xl` (`24px`) a `3xl` (`30px`) · Tracking `-0.02em` a `-0.03em` · Interlineado `1.2` | Títulos de módulo, cabeceras de diálogo modal y encabezados de sección. Prohibido usar `font-weight < 600` en títulos principales. |
| **Voz 2: Prosa Operativa y Controles** | `Geist Sans` (`400` Regular, `500` Medium) | `xs` (`12px`), `sm` (`14px`), `base` (`16px`) · Tracking `0em` · Interlineado `1.6` | Etiquetas de formulario (`500`), navegación lateral (`500`), descripciones y alertas RFC 7807 (`400`). Aplica `-webkit-font-smoothing: antialiased` e interlineado ampliado (`1.6`) para evitar halación lumínica sobre fondo oscuro. |
| **Voz 3: Telemetría, Libro Mayor y Tiempo** | `Geist Mono` (`400` Regular, `500` Medium, `600` SemiBold) | `xs` (`12px`) a `2xl` (`24px`) · Alineación derecha en tablas | Importes monetarios (`MoneyAmount`), cantidades de stock (`Available`, `Reserved`, `Used`, `Damaged`), códigos SKU, identificadores GUID, números de guía (`TrackingNumber`), fechas ISO y el temporizador regresivo de 15 minutos. |

### 4.2 Reglas OpenType Obligatorias en CSS
1. **Cifras Tabulares (`font-variant-numeric: tabular-nums`):** Obligatorio en todos los precios, subtotales, contadores de inventario, métricas de `StatCard` y en el reloj regresivo de 15 minutos del checkout. Garantiza que cada dígito ocupe idéntico ancho horizontal, impidiendo que la interfaz tiemble durante la cuenta regresiva o al ordenar columnas.
2. **Versalitas en Unidades y Divisas (`font-variant-caps: all-small-caps`):** Aplicado a los códigos ISO de tres letras de moneda (`COP`, `USD`) y unidades de capacidad volumétrica (`m³`) acompañando a la cifra principal.
3. **Desactivación de Ligaduras en Códigos (`font-variant-ligatures: none`):** Aplicado a códigos SKU, identificadores `Guid` y números de guía logística para preservar la lectura literal carácter por carácter.

---

## 5. Catálogo y Separación Física de Componentes (`packages/ui`)

El paquete `packages/ui` es **100% agnóstico del dominio de negocio y de la red**: tiene prohibido importar modelos de `apps/frontend`, conocer endpoints REST o leer tokens JWT. Se divide físicamente en cuatro subdirectorios bajo `packages/ui/src/`:

### 5.1 Tokens (`packages/ui/src/tokens/`) — *Propietario: Agente `07-frontend-tokens-primitives`*
- `colors.ts`, `typography.ts`, `spacing.ts` y `styles/theme.css`: Exportan las constantes semánticas sincronizadas con `@theme`.

### 5.2 Primitivas Atómicas (`packages/ui/src/primitives/`) — *Propietario: Agente `07-frontend-tokens-primitives`*
Controles sin estado de negocio construidos sobre primitivas accesibles de Radix UI:
- **`Button`:** Variantes `default` (`#00D4AA` con texto `#0A0E1A` en peso `600`), `destructive` (`#EF4444`), `outline`, `secondary`, `ghost`. Soporta propiedad `isLoading` que inyecta `aria-busy="true"`, deshabilita el control e impide el doble envío.
- **`Input`, `Textarea`, `Select`, `Checkbox`, `Label`:** Controles de formulario vinculados mediante `useId()`, `aria-invalid` y `aria-describedby` hacia el mensaje de error de validación.
- **`Badge`:** Etiqueta atómica con variantes semánticas (`neutral`, `info`, `warning`, `success`, `danger`).
- **`Skeleton`:** Bloque de carga con animación de opacidad suave que respeta las dimensiones exactas de la fila o tarjeta final.
- **`Card`, `Alert`, `Dialog`, `AlertDialog`, `Table`, `Toast`:** Contenedores estructurales con bordes de `1px solid var(--color-border)`.

### 5.3 Componentes Compuestos (`packages/ui/src/composite/`) — *Propietario: Agente `08-frontend-composite-ui`*
Organismos de alta densidad que ensamblan primitivas atómicas:
- **`DataTable`:** Tabla de datos con soporte de ordenamiento, filtrado, paginación basada en cero (`page`, `size`, `totalItems`, `totalPages`), cabeceras fijas en `--color-surface-muted`, celdas numéricas alineadas a la derecha en `Geist Mono` (`tabular-nums`) y proyección integrada de estados `Skeleton` y `StateView`.
- **`ResponsiveDrawer`:** Panel lateral deslizante (`35%` del ancho en escritorio, pantalla completa en móvil) con curva `--ease-out-expo`, trampa de foco y cierre con `Escape`.
- **`ModalDialog`:** Diálogo modal de confirmación crítica consumido por `AlertHost` para operaciones financieras o irreversibles (reembolsos, anulación de factura maestra, reporte de stock fantasma, bloqueo de usuario).
- **`StatCard`:** Componente de métrica con variante `hero` (métrica primaria destacada) y variante `compact` (contador secundario en línea), cifra en `Geist Mono` `600` con `tabular-nums` y etiqueta en `Geist Sans` `500`.
- **`OrderTimeline`:** Línea de tiempo secuencial vertical/horizontal que representa las transiciones auditadas de pedidos, despachos y devoluciones.
- **`StatusBadge`:** Indicador semántico que exige obligatoriamente **punto cromático (`6px`) + rótulo textual en español**. El color jamás actúa como único portador de significado.
- **`MoneyAmount`:** Componente de presentación monetaria que formatea `{ amount, currency }` mediante `Intl.NumberFormat` en `Geist Mono` (`tabular-nums`), sin ejecutar cálculos ni redondeos financieros en el cliente.
- **`StateView`:** Vista unificada para estados vacíos (`empty`) y estados de fallo (`error` RFC 7807), con título, explicación operativa y acción primaria de recuperación (`refetch` o navegación guiada).

### 5.4 Identidad Gráfica (`packages/ui/src/logo/`) — *Propietario: Agente `07-frontend-tokens-primitives`*
- `LogoMark.tsx` (isotipo orbital autónomo), `LogoWordmark.tsx` (logotipo tipográfico) y `Logo.tsx` (ensamble completo con subtítulo *"Sistema Operativo para Comercio"*).

---

## 6. Matriz Canónica de Rotulación de Enumeraciones (`domainLabels.ts`)

Para cumplir con el principio de **Lenguaje Ubicuo Estricto (Cero Sinónimos, `AGENTS.md` §0.4)** y el contrato JSON de enumeraciones por nombre (**[ADR-0012](../backendSDD/Adr/0012-contrato-json-de-los-enum-por-nombre.md)**), el archivo `apps/frontend/src/components/domainLabels.ts` traduce exhaustivamente (`Record<EnumType, { label: string; variant: BadgeVariant }>`) las **11 enumeraciones expuestas por el dominio C#**:

| Enumeración en TypeScript | Fuente de Verdad en Backend C# (`archivo:línea`) | Valores Canónicos JSON (Inglés) $\rightarrow$ Rótulo Oficial en UI (Español) y Variante Semántica |
|---|---|---|
| **`UserRole`** | [`backend/Zentric.Domain/Users/Enums/UserRole.cs:3-10`](../backend/Zentric.Domain/Users/Enums/UserRole.cs#L3-L10) | • `Buyer` $\rightarrow$ **Comprador** (`info`)<br>• `Seller` $\rightarrow$ **Vendedor** (`neutral`)<br>• `Administrator` $\rightarrow$ **Administrador** (`warning`)<br>• `Supervisor` $\rightarrow$ **Supervisor de Auditoría** (`info`)<br>• `LogisticsOperator` $\rightarrow$ **Operador Logístico** (`success`) |
| **`UserStatus`** | [`backend/Zentric.Domain/Users/Enums/UserStatus.cs:3-8`](../backend/Zentric.Domain/Users/Enums/UserStatus.cs#L3-L8) | • `Active` $\rightarrow$ **Activo** (`success`)<br>• `Blocked` $\rightarrow$ **Bloqueado** (`danger`)<br>• `Deleted` $\rightarrow$ **Eliminado** (`neutral`) |
| **`OrderStatus`** | [`backend/Zentric.Domain/Orders/Enums/OrderStatus.cs:3-11`](../backend/Zentric.Domain/Orders/Enums/OrderStatus.cs#L3-L11) | • `Cart` $\rightarrow$ **Carrito** (`neutral`)<br>• `PendingPayment` $\rightarrow$ **Pendiente de Pago** (`warning`)<br>• `Paid` $\rightarrow$ **Pagado** (`info`)<br>• `Dispatched` $\rightarrow$ **Despachado** (`info`)<br>• `Delivered` $\rightarrow$ **Entregado** (`success`)<br>• `Cancelled` $\rightarrow$ **Cancelado** (`danger`) |
| **`OrderCancellationCause`** | [`backend/Zentric.Domain/Orders/Enums/OrderCancellationCause.cs:13-22`](../backend/Zentric.Domain/Orders/Enums/OrderCancellationCause.cs#L13-L22) ([ADR-0022](../backendSDD/Adr/0022-pedido-resuelto-pasa-a-cancelled.md)) | • `PaymentTimeout` $\rightarrow$ **Expiración de Pago (15 min)** (`warning`)<br>• `FullyResolved` $\rightarrow$ **Resuelto por Quiebre de Stock** (`danger`) |
| **`FulfillmentStatus`** | [`backend/Zentric.Domain/Logistics/Enums/FulfillmentStatus.cs:3-10`](../backend/Zentric.Domain/Logistics/Enums/FulfillmentStatus.cs#L3-L10) | • `PendingPack` $\rightarrow$ **Pendiente de Empaque** (`warning`)<br>• `Packed` $\rightarrow$ **Empacado** (`info`)<br>• `Dispatched` $\rightarrow$ **Despachado** (`info`)<br>• `Delivered` $\rightarrow$ **Entregado** (`success`)<br>• `Cancelled` $\rightarrow$ **Cancelado por Quiebre** (`danger`) |
| **`ReturnStatus`** | [`backend/Zentric.Domain/Returns/Enums/ReturnStatus.cs:3-9`](../backend/Zentric.Domain/Returns/Enums/ReturnStatus.cs#L3-L9) | • `Requested` $\rightarrow$ **Solicitada** (`warning`)<br>• `Approved` $\rightarrow$ **Aprobada** (`info`)<br>• `Rejected` $\rightarrow$ **Rechazada** (`danger`)<br>• `Refunded` $\rightarrow$ **Reembolsada** (`success`) |
| **`ProductStatus`** | [`backend/Zentric.Domain/Products/Enums/ProductStatus.cs:3-8`](../backend/Zentric.Domain/Products/Enums/ProductStatus.cs#L3-L8) | • `Published` $\rightarrow$ **Publicado** (`success`)<br>• `Suspended` $\rightarrow$ **Suspendido** (`warning`)<br>• `Discontinued` $\rightarrow$ **Descontinuado** (`danger`) |
| **`ProductType`** | [`backend/Zentric.Domain/Products/Enums/ProductType.cs:3-7`](../backend/Zentric.Domain/Products/Enums/ProductType.cs#L3-L7) | • `Physical` $\rightarrow$ **Físico** (`neutral`)<br>• `Digital` $\rightarrow$ **Digital** (`info`) |
| **`WarehouseType`** | [`backend/Zentric.Domain/Warehouses/Enum/WarehouseType.cs:3-7`](../backend/Zentric.Domain/Warehouses/Enum/WarehouseType.cs#L3-L7) | • `Marketplace` $\rightarrow$ **Bodega Central Zentric** (`info`)<br>• `Vendor` $\rightarrow$ **Bodega de Vendedor** (`neutral`) |
| **`InvoiceType`** | [`backend/Zentric.Domain/Billing/Enums/InvoiceType.cs:3-8`](../backend/Zentric.Domain/Billing/Enums/InvoiceType.cs#L3-L8) | • `Master` $\rightarrow$ **Factura Maestra** (`success`)<br>• `ZentricDetail` $\rightarrow$ **Detalle Comisión Zentric** (`info`)<br>• `VendorDetail` $\rightarrow$ **Factura de Vendedor** (`neutral`) |
| **`InvoiceStatus`** | [`backend/Zentric.Domain/Billing/Enums/InvoiceStatus.cs:8-15`](../backend/Zentric.Domain/Billing/Enums/InvoiceStatus.cs#L8-L15) | • `Issued` $\rightarrow$ **Emitida** (`success`)<br>• `Anulled` $\rightarrow$ **Anulada** (`danger`) |

> [!IMPORTANT]
> **Invariante de Inspección en Devoluciones (`ReturnRequestDto`):** El dictamen de inspección física en bodega no es un estado dentro de `ReturnStatus`; se modela mediante el campo booleano `isGoodCondition` del registro `ReturnRequestDto` ([`GetReturnByIdQuery.cs:1105-1114`](../backend/Zentric.Application/Returns/Queries/GetReturnByIdQuery.cs#L1105-L1114)) mientras la solicitud permanece en `Requested` antes de la decisión comercial del vendedor (`Approved` o `Rejected`).

---

## 7. Compuerta de Adherencia Visual y Accesibilidad (Post-Authoring Checklist)

Antes de aprobar las salidas de los agentes `07-frontend-tokens-primitives`, `08-frontend-composite-ui` y `11-frontend-role-modules`, el agente auditor `13-frontend-qa-guardian` debe verificar el cumplimiento del 100% de esta lista de control:

| Categoría | Criterio de Verificación Innegociable | Método de Comprobación |
|---|---|---|
| **1. Fidelidad de Paleta** | Uso exclusivo de variables CSS de `@theme` (`#0A0E1A`, `#111827`, `#161F30`, `#1F293D`, `#00D4AA`, `#FFB800`). Cero instancias de `#000000` en fondos o grises desaturados. | Inspección de `theme.css` y búsqueda estática de colores arbitrarios en clases de Tailwind. |
| **2. Disciplina de 3 Voces y OpenType** | `Geist Mono` con `font-variant-numeric: tabular-nums` aplicado en `MoneyAmount`, `StatCard`, columnas numéricas de `DataTable` y el reloj regresivo de 15 minutos. | Test unitario de estilos computados y clases utilitarias `tabular-nums` + `font-mono`. |
| **3. Composición Split-Frame y Densidad** | Las vistas operativas implementan división asimétrica (`65%/35%` o `70%/30%`) y bandas de KPI con métrica primaria dominante; cero cuadrículas de tarjetas clonadas idénticas. | Revisión estructural de layouts en `src/modules/**` y pruebas de renderizado RTL. |
| **4. Reglas Anti-IA Genérica** | Cero clases `bg-clip-text text-transparent bg-gradient-*`, cero barras laterales de colores chillones (`border-l-4`) en tarjetas y cero sombras de neón. | Búsqueda estática automatizada (`rg "bg-clip-text|border-l-4"`) con resultado igual a `0`. |
| **5. Accesibilidad WAI-ARIA (WCAG 2.1 AA)** | Contraste $\ge 4.5:1$, navegación completa por teclado (`Tab`, `Enter`, `Escape`), `aria-busy="true"` en mutaciones activas, `role="status"` en esqueletos y `role="alert"` en errores RFC 7807. | Suite de pruebas Vitest + React Testing Library (`getByRole`, `toHaveAttribute`). |

---

## 8. [ADDENDUM - DICTADO POR OWNER EN /GRILL-ME]: Modern High-End Commerce & Dual Theme

> [!WARNING]
> **SUPERSEDO PARCIAL:** Las decisiones A1 (índigo eléctrico `#4F46E5`/`#6366F1`) y A2 (arquitectura dual con overrides dispersos entre `theme.css` y `global.css`) quedan **sustituidas** por el [ADDENDUM §9](#9-addendum---dictado-por-owner-en-grill-me-diseño-v2-porcelana-y-grafito) tras el dictado del Owner: *"el multi-tema actual está mal diseñado; requiere rediseño completo del sistema de temas"*. Las decisiones A3 (portal comercial del comprador) y A4 (tarjeta comercial enriquecida) **permanecen vigentes** y se absorben en §9.6.

> **Fecha:** 2026-10-17  
> **Origen:** Sesión `/grill-me` con el Owner del Producto.  
> **Objetivo:** Erradicar la apariencia de plantilla genérica de IA (monolito oscuro con acentos cian neón) y transformar Zentric en un marketplace SaaS de grado empresarial (referencias: Stripe, Linear Commerce, Shopify, Mercado Libre).

### 8.1 Decisiones Normativas Dictadas por el Owner
1. **Paleta y Personalidad (Decisión A1):**
   - Transición hacia *Modern High-End Commerce*: Acento de acción primaria en **Índigo Eléctrico (`#4F46E5` en modo claro / `#6366F1` en modo oscuro)**, complementado con neutros de carbón tintado en lugar de cajas oscuras planas.
2. **Arquitectura Dual Theme con Selector (Decisión A2):**
   - **Modo Claro (Por defecto):** Fondo base Slate 50 (`#F8FAFC`), superficies elevadas en blanco nítido (`#FFFFFF`), bordes estructurales sutiles Slate 200 (`#E2E8F0`), texto principal Slate 900 (`#0F172A`) y texto secundario Slate 500 (`#64748B`).
   - **Modo Oscuro (Consola Suiza):** Fondo base carbón profundo (`#0A0F1D`), superficies operativas (`#11192C`), bordes estructurales (`#1E2C4A`) y texto primario hueso (`#F8FAFC`).
   - **Componente `ThemeToggle`:** Botón accesible en `LayoutHeader` con persistencia en `localStorage.getItem('zentric.theme')` y sincronización con clase `.dark` en `document.documentElement`.
3. **Portal del Comprador — Marketplace Integral (Decisión A3):**
   - **Hero Banner Comercial:** Franja de alta jerarquía con propuestas de valor destacadas:
     - ⚡ **Reserva Atómica 15 Minutos:** Garantía de bloqueo en bodega física sin riesgo de sobreventa.
     - 🚚 **Red Logística Multi-Bodega:** Despacho particionado y trazabilidad en tiempo real.
     - 🛡️ **Inspección Técnica de Calidad:** Conciliación automática y split de facturación 5%/95%.
   - **Segmentación por Categorías:** Píldoras de filtrado contextual rápido (*Hardware*, *Monitores*, *Ergonomía*, *Cloud*) integradas con la barra de búsqueda y el filtro de tipo de producto (*Físicos* vs *Digitales*).
4. **Tarjeta Comercial Enriquecida (Decisión A4):**
   - Relación de aspecto fotográfica `16:10` con efecto *hover zoom* controlado.
   - Píldoras flotantes de stock en tiempo real (`✓ X disp.` en esmeralda o `Agotado` en rojo).
   - Identificación de SKU en `Geist Mono` y precio destacado en moneda local.
   - Botón de acción comercial con micro-interacción de flecha (`Ver Detalle` / `Agregar al Carrito`).

---

## 9. [ADDENDUM - DICTADO POR OWNER EN /GRILL-ME]: Diseño v2 "Porcelana y Grafito" — Dual Theme Robusto e Identidad por Rol

> **Fecha:** 2026-10-17  
> **Origen:** Sesión `/grill-me` con el Owner. Decisiones: *"El multi-tema actual está mal diseñado → rediseño completo del sistema de temas"* · *"Diferenciación por rol: acento de color distinto + layout diferenciado"* · *"Premium minimalista, no genérico de IA"* · *"Mismos principios de diseño entre paneles, identidad visual distinta por rol"*.  
> **Alcance de supersesión:** §1 (lienzo/acento), §3 (tabla de tokens), §7.1 (fidelidad de paleta), §8-A1/A2. **Vigencia plena de:** §2 (composición asimétrica y split-frame), §4 (tipografía de tres voces), §8-A3/A4 (portal y tarjeta comercial), doctrina anti-IA genérica (§2.2 y `AGENTS.md` §4.14, en su principio de neutros tintados).

### 9.1 Paleta Dual Normativa

Dos modos, **una sola fuente de verdad** (`packages/ui/src/styles/theme.css`), contraste AA verificado programáticamente en ambos modos (§9.4):

| Token runtime (`:root` / `.dark`) | Modo Claro "Estudio Porcelana" | Modo Oscuro "Bóveda Grafito" | Rol semántico |
|---|---|---|---|
| `--background` | `#F5F6F8` porcelana de tinte frío | `#0C0F16` grafito-tinta | Lienzo base |
| `--surface` | `#FFFFFF` papel nítido *(exención §9.3)* | `#131824` | Tarjetas, tablas, modales |
| `--surface-muted` | `#EEF0F4` | `#1A2030` | Cabeceras, hover, zonas editoriales |
| `--border` | `#E1E5EB` | `#252D40` | Borde estructural `1px solid` |
| `--border-subtle` | `#EBEEF2` | `#1D2334` | Hairline divisorio interno |
| `--foreground` | `#0E1420` tinta azulada (17.04:1) | `#EDF1F7` hueso frío (16.91:1) | Texto primario |
| `--foreground-muted` | `#454F63` (7.61:1) | `#98A2B8` (7.48:1) | Texto secundario |
| `--foreground-subtle` | `#5F6B82` (4.96:1) | `#7D88A3` (5.41:1) | Metadatos, placeholders |
| `--success` | `#15803D` | `#4ADE80` | Confirmado / activo |
| `--warning` | `#B45309` | `#FBBF24` | Pendiente / reloj de 15 minutos |
| `--danger` | `#B91C1C` | `#F87171` | Error / destructivo |
| `--info` | `#1D4ED8` | `#60A5FA` | Informativo / tránsito |

**Prohibiciones vigentes:** negro puro `#000000`; grises desaturados (`R=G=B`); el cian neón `#00D4AA` sobre carbón saturado `#0A0E1A` (look v1 rechazado); el "índigo eléctrico" `#4F46E5`/`#6366F1` como acento de marca (§8-A1, rechazado). En claro, los estados de dominio usan pasos **700** (AA como texto); en oscuro, pasos **400** luminosos.

### 9.2 Matriz de Identidad por Rol (Acento + Layout)

Cada layout de rol ancla su raíz con `data-role="…"`; el scope CSS remapea **solo el eje de acento** (`--brand`, `--brand-strong`). `--primary`, `--ring` y todos los chips/botones/foco derivan de `--brand` por `var()`, así que la identidad cromática cambia **sin tocar componentes**. Sin scope (páginas públicas) rige el jade Comprador, identidad de marca por defecto.

| Rol | Acento claro | Hover claro | Acento oscuro | Hover oscuro | Contraste texto/lienzo (claro) |
|---|---|---|---|---|---|
| **Buyer** (jade de marca) | `#0F766E` | `#0B5D56` | `#2DD4BF` | `#5EEAD4` | 5.06:1 |
| **Seller** (violeta estudio) | `#6D28D9` | `#5B21B6` | `#A78BFA` | `#C4B5FD` | 6.57:1 |
| **Admin** (índigo de mando) | `#4338CA` | `#3730A3` | `#818CF8` | `#A5B4FC` | 7.31:1 |
| **Logistics** (cian operativo) | `#0E7490` | `#0A5C74` | `#22D3EE` | `#67E8F9` | 4.95:1 |
| **Supervisor** (fucsia forense) | `#A21CAF` | `#86198F` | `#E879F9` | `#F0ABFC` | 5.85:1 |

- Texto sobre relleno de acento: `#FFFFFF` en claro (≥5.36:1 en los cinco acentos) / `#0C0F16` en oscuro (≥6.43:1). Gobierna `--primary-foreground`.
- Los cinco acentos están espaciados al máximo en el círculo cromático y **ninguno coincide** con un color de estado (`success/warning/danger/info`); la separación contextual (botón/foco vs punto+rótulo de `StatusBadge`) elimina la ambigüedad restante.

### 9.3 Doctrina Anti-IA v2 (Elevación y Exenciones)

1. **Exención documentada del blanco:** `--surface: #FFFFFF` en claro es **papel nítido, no un gris desaturado**; la regla de tinte frío (`B > R`) se aplica al resto de neutros y a la tinta en ambos modos, y el test de tokens exige exactamente `#FFFFFF` allí.
2. **Elevación:** en claro, hairline + sombra susurrada (`0 1px 2px` al 4-5% de la tinta); en oscuro, hairline + brillo superior interior (`inset 0 1px 0 rgba(255,255,255,0.04)`). Prohibidas las sombras difusas pesadas y los resplandores neón.
3. **El resplandor focal es derivado, no literal:** `bg-swiss-grid` y los glows usan `color-mix(in srgb, var(--brand) N%, transparent)`, de modo que la atmósfera sigue al acento de rol y al modo sin rgba fijos.
4. Los patrones prohibidos de §2.2 siguen vigentes: sin texto degradado multicolor, sin barras `border-l-4` chillonas, sin tarjetas clonadas de jerarquía idéntica.

### 9.4 Compuerta WCAG 2.1 AA (Resultados Verificados)

La suite `packages/ui/src/tokens/tokens.test.ts` exige programáticamente, para **ambos modos**:

| Categoría | Umbral normativo | Resultado |
|---|---|---|
| Tinta primaria sobre lienzo/superficie | > 14:1 / > 13:1 | 17.04 / 18.43 (claro) · 16.91 / 15.65 (oscuro) |
| Tinta secundaria (muted) | ≥ 6.2:1 | 7.61 (claro) · 7.48 (oscuro) |
| Tinta terciaria (subtle) | ≥ 4.5:1 | 4.96 (claro) · 5.41 (oscuro) |
| Acento de rol como texto | ≥ 4.5:1 sobre lienzo y superficie | Mínimo 4.95:1 (logistics claro) |
| Acento de rol como relleno (`--primary-foreground`) | ≥ 4.5:1 | Mínimo 5.36:1 (claro) / 6.43:1 (oscuro) |
| Estados de dominio como texto | ≥ 4.5:1 sobre lienzo y superficie | Mínimo 4.64:1 |

### 9.5 Arquitectura Técnica del Tema (Fuente Única)

1. **Tokens runtime con nombre final** (`:root` claro, `.dark` oscuro): los componentes y el CSS plano referencian `var(--background)`, `var(--brand)`… directamente en cualquier modo. La clase `.dark` la gobierna `ThemeProvider` (persistencia en `localStorage['zentric.theme']`, esquema nativo `color-scheme` sincronizado, claro por defecto).
2. **Puente `@theme inline`:** cada token runtime se mapea a su utilidad Tailwind v4 (`bg-brand` → `var(--brand)`); al ser *inline*, las utilidades resuelven el valor **en uso**, por lo que `.dark` y `[data-role]` conmutan sin recompilar ni duplicar valores.
3. **Tokens estáticos en `@theme` normal:** radios (6/8/12/16/9999), fuentes (`Geist Variable` + `Geist Mono Variable`, empaquetado local `@fontsource-variable`) y curvas de movimiento (`expo.out`, `quint.out`) se emiten a `:root` para el CSS plano.
4. **`global.css` declarativo:** cero overrides de color; solo utilidades de composición (`bg-swiss-grid`, `surface-hairline`, `kicker-spike`, `nav-group-label`) construidas sobre tokens runtime.
5. **Migración hex → token completada:** 2.271 literales de color del v1/§8 en `apps/frontend/src/modules/**` migrados a tokens (verificado `rg "\[#[0-9A-Fa-f]{6}\]"` = 0). Reglas aplicadas: `text-[#0B0F19]` → `text-primary-foreground` (siempre sobre relleno de acento, verificado caso a caso); `text-white` contextual → `text-primary-foreground` sobre rellenos de acento sólidos y `text-foreground` sobre superficies heredadas (cero gradientes de acento con `text-white` en el corpus).

### 9.6 Shells por Rol (Estructuras Diferenciadas, Misma Base de Diseño)

Base común: `LayoutHeader` (chip de rol tintado con el acento, identidad Geist Sans + Mono, toggle de tema, logout), hairlines de `1px`, radios 6/8/12/16 y tipografía de tres voces. Cada rol recibe una **estructura propia**:

| Rol | Arquetipo | Estructura del shell | Firma visual |
|---|---|---|---|
| **Buyer** | Portal Comercial | Cabecera horizontal de marketplace + lienzo ancho `max-w-7xl` aireado (`py-10`) + pie comercial + pestañas inferiores en móvil. Sin sidebar. | Acento jade; nav activa en píldora tintada |
| **Seller** | Estudio del Vendedor | Sidebar persistente `w-64` con ancla de panel + grupos mono-caps (`Catálogo`, `Ventas`); lienzo completo para rejillas de catálogo. | Acento violeta; secciones mono-caps |
| **Admin** | Centro de Mando | **Sin sidebar en escritorio:** pestañas horizontales de gobernanza con subrayado de acento; drawer móvil que se desmonta cerrado (sin duplicar navegación). | Acento índigo; subrayado `border-b-2` |
| **Logistics** | Tablero de Colas | Cabecera compacta `h-14` + franja de colas en `Geist Mono` mayúsculas con tracking ancho; densidad `p-4` para máximo de filas visibles. Sin sidebar. | Acento cian; ADN de terminal |
| **Supervisor** | Sala de Libros | Índice forense estrecho `w-56` con grupos mono-caps (`Fiscalización`, `Libro Mayor`, `Inventario`) + contenido enmarcado como hoja continua de libro mayor (`max-w-[1440px]`, hairline único), para lectura de expedientes. | Acento fucsia; documento en vez de tarjetas |

**Invariante de accesibilidad del drawer:** en los shells con navegación de escritorio propia (Admin, Logistics), el drawer móvil **se desmonta al cerrarse** (`variant="drawer"`), garantizando una única copia de cada etiqueta de navegación en el árbol de accesibilidad (`aria-current="page"` en la sección activa).

### 9.7 Registro de Trazabilidad de la Implementación

- [x] `packages/ui/src/styles/theme.css` — reescrito: runtime `:root`/`.dark` + scopes `[data-role]` + puente `@theme inline` (§9.5).
- [x] `apps/frontend/src/styles/global.css` — sin overrides de color; utilidades var-based (§9.5-4).
- [x] `packages/ui/src/tokens/colors.ts` — espejo claro + `darkColors` + `roleAccents` (§9.1/§9.2).
- [x] `packages/ui/src/tokens/tokens.test.ts` — compuerta v2: paridad dual, hexes canónicos, WCAG AA en ambos modos, anti-regresión v1/§8-A1, tinte frío con exención del blanco (§9.3/§9.4).
- [x] `apps/frontend/src/app/layouts/LayoutSidebar.tsx` — variantes `persistent`/`drawer`, ancho `narrow`, grupos mono-caps (§9.6).
- [x] `apps/frontend/src/app/layouts/LayoutHeader.tsx` — variante `dense`, chip de rol tintado con acento (§9.6).
- [x] Los cinco shells de rol + `PublicLayout` — estructuras §9.6; raíces con `data-role`.
- [x] `apps/frontend/src/modules/**` — 2.271 literales migrados a tokens (§9.5-5).
- [x] Compuertas: `@zentric/ui` 143/143 en verde · `@zentric/frontend` 394/394 en verde · `typecheck` limpio en ambos paquetes.

