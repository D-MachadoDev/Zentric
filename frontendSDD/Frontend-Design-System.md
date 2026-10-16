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
