# Sistema de Diseño y Tokens Visuales (Frontend Design System)

> Sistema de diseño unificado para la consola de Zentric Marketplace. Define los tokens semánticos en CSS (`@theme`), componentes atómicos y compuestos, estados obligatorios de interfaz y criterios de accesibilidad WAI-ARIA.
>
> **Fundamentos de Identidad:**
> - **Dirección Visual:** Arquetipo *Dark Developer / Builder* (consola de alta densidad operativa y sobria).
> - **Paleta Semántica:** Carbón azulado tintado con acento primario esmeralda (`#00D4AA`) y advertencia ámbar (`#FFB800`).
> - **Tipografía Oficial:** Geist Sans (interfaz y lectura) + Geist Mono (datos tabulares, monedas, SKUs y códigos).
> - **Primitivas UI:** Componentes accesibles sobre Radix UI y Tailwind CSS v4.
> - **Identidad Gráfica:** Isotipo y logotipo original *"Zentric: Sistema Operativo para Comercio"* (Monograma Z + Órbita/Centro).

---

## 1. Dirección Visual y Doctrina Anti-IA Genérica

Para evitar que la plataforma aparente una plantilla genérica o prefabricada por IA, se aplican las siguientes reglas obligatorias de diseño visual:

| Atributo | Definición Técnica | Directriz Anti-IA Genérica |
|---|---|---|
| **Arquetipo** | **Dark Developer / Builder:** Herramienta de trabajo de alta densidad, jerarquía estructurada y retroalimentación técnica inmediata. | Prohibido el uso de espacios vacíos decorativos o tarjetas clonadas idénticas sin diferenciación de importancia. |
| **Neutros Tintados** | Fondo principal carbón azulado profundo (`#0B0F19` / `#0A0E1A`), superficies de tarjetas en carbón tintado (`#111827` / `#161F30`), y bordes sutiles en `#1F293D`. | **Prohibido el uso de negro puro `#000000`** sobre fondos planos o escalas de grises desaturados muertos (`#888888`). |
| **Acento Semántico Único** | Acción primaria y foco: **Esmeralda / Cian Suave (`#00D4AA`)**. Estados transitorios y atención: **Ámbar (`#FFB800`)**. | **Prohibido el uso de "arcoíris visuales"** con múltiples colores no relacionados o efectos cian-neón saturados sobre fondo negro absoluto. |
| **Tipografía y Contraste** | **Geist Sans** para interfaz y encabezados; **Geist Mono** para valores numéricos, importes y códigos. | Encabezados en pesos robustos (600 o 700) con alto contraste; cuerpo de texto en peso 400. **Prohibido el texto con degradados multicolores ("AI gradient text")**. |
| **Bordes y Superficies** | Bordes uniformes con contraste medido (`#1F293D`) y radios controlados (6px, 8px, 12px). | **Prohibido el uso de bordes izquierdos con barras de acento de colores chillones en tarjetas**. |
| **Iconografía** | Set único oficial: **Lucide React**. Tamaño estándar de 16px a 20px, con trazo consistente de 1.5px o 2px. | Prohibida la mezcla de múltiples librerías de iconos con estilos dispares. |

---

## 2. Tokens de Diseño (Tailwind CSS v4 `@theme`)

En Tailwind CSS v4, la configuración del tema visual reside **directamente en CSS** mediante la directriz `@theme` en `packages/ui/src/styles/theme.css`. No se utiliza archivo `tailwind.config.ts`:

```css
@import "tailwindcss";

@theme {
  /* Paleta de Neutros Tintados */
  --color-background: #0A0E1A;          /* Carbón azulado profundo — Fondo principal */
  --color-foreground: #F1F5F9;          /* Slate 100 — Texto principal */
  --color-surface: #111827;             /* Carbón tintado — Tarjetas y paneles */
  --color-surface-muted: #161F30;       /* Carbón elevado — Elementos secundarios */
  --color-border: #1F293D;              /* Contraste medido — Bordes de tarjetas y tablas */
  --color-border-subtle: #192231;       /* Separadores internos atenuados */

  /* Colores de Marca y Acento Semántico */
  --color-brand: #00D4AA;               /* Esmeralda / Cian suave — Acción primaria y foco */
  --color-brand-strong: #00B896;        /* Tono hover / presionado de marca */
  --color-warning: #FFB800;             /* Ámbar — Énfasis, atención, checkout 15 min */

  /* Estados Funcionales */
  --color-success: #10B981;             /* Verde esmeralda — Confirmado, entregado */
  --color-danger: #EF4444;              /* Rojo coral — Errores, rechazos, cancelaciones */
  --color-info: #3B82F6;                /* Azul — Información técnica y auditoría */

  /* Tipografía */
  --font-sans: "Geist Sans", system-ui, -apple-system, sans-serif;
  --font-mono: "Geist Mono", ui-monospace, SFMono-Regular, monospace;

  /* Escala de Radios */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;
}
```

> **Sincronización con TypeScript:** El archivo `packages/ui/src/tokens/colors.ts` expone los mismos valores hexadecimales en TypeScript exclusivamente para utilidades lógicas de cliente (formateadores `Intl`, contrastes en canvas). Ante cualquier discrepancia, la directriz CSS `@theme` actúa como autoridad visual.

---

### 2.1 Jerarquía Tipográfica y Legibilidad

| Rol Tipográfico | Familia | Pesos Disponibles | Aplicación Obligatoria |
|---|---|---|---|
| **`font-sans`** | **Geist Sans** | `400` (Regular), `500` (Medium), `600` (SemiBold), `700` (Bold) | Navegación, títulos de sección, textos de ayuda, botones interactivos y modales. |
| **`font-mono`** | **Geist Mono** | `400` (Regular), `500` (Medium), `600` (SemiBold) | Tablas de datos, importes monetarios (`Money`), códigos SKU, IDs de orden y fechas ISO. |

- **Escala de Tamaños:** `xs` (12px) $\rightarrow$ `sm` (14px) $\rightarrow$ `base` (16px) $\rightarrow$ `lg` (18px) $\rightarrow$ `xl` (20px) $\rightarrow$ `2xl` (24px) $\rightarrow$ `3xl` (30px).
- **Interletrado (Tracking):** `-0.02em` en títulos grandes (`2xl`, `3xl`) para compacidad visual.
- **Alojamiento Local:** Las fuentes se empaquetan en el bundle mediante `@fontsource/geist-sans` y `@fontsource/geist-mono`, garantizando cero bloqueos de red o dependencias externas de CDNs.

---

## 3. Catálogo de Componentes de UI (`packages/ui`)

### 3.1 Primitivas Atómicas Adaptadas (Radix UI)
Ubicadas en `packages/ui/src/primitives/`:
- **`Button`:** Variantes `default` (acento esmeralda `#00D4AA`), `destructive`, `outline`, `secondary`, `ghost`. Soporte nativo para estado `loading` con indicador `aria-busy`.
- **`Input` / `Textarea` / `Select` / `Checkbox`:** Campos controlados con `label` siempre visible, enlace semántico `aria-describedby` y borde atenuado que se ilumina con el anillo `--color-brand` al foco.
- **`Badge`:** Insignia compacta con variantes semánticas (`neutral`, `info`, `warning`, `success`, `danger`).
- **`Skeleton`:** Marcador de carga con animación sutil pulsante que respeta las proporciones de los datos esperados.

### 3.2 Componentes Compuestos de Negocio
Ubicados en `packages/ui/src/composite/`:
- **`DataTable`:** Tabla de alta densidad para inventarios y órdenes con ordenamiento, filtrado, paginación y renderizado en Geist Mono.
- **`ResponsiveDrawer`:** Panel lateral deslizante para inspección y edición rápida sin perder el contexto de la lista.
- **`ModalDialog`:** Diálogo accesible para confirmaciones críticas con captura de foco y cierre con `Escape`.
- **`StatCard`:** Tarjeta asimétrica de métricas clave con cifras grandes en Geist Mono y etiquetas en Geist Sans.
- **`StatusBadge`:** Componente de estado de dominio que renderiza **texto obligatorio acompañado de un punto de color de soporte**. El color nunca es el único portador de significado.
- **`MoneyAmount`:** Formateador de moneda que consume `amount` y `currency` emitidos por el servidor mediante `Intl.NumberFormat`. No recalcula importes en el cliente.
- **`StateView`:** Componente unificado para los estados vacío (`empty`) y error (`error`), con botón de reintento (`refetch`).

---

## 4. Rotulación Oficial de Enumeraciones del Dominio

Para evitar sinónimos y mantener estricta fidelidad con el lenguaje ubicuo de la Ley (`ZENTRIC.md`), la traducción visual de las enumeraciones se centraliza en `apps/frontend/src/components/domainLabels.ts` (manteniendo `packages/ui` 100% agnóstico del dominio):

| Enumeración | Origen en la Ley | Rótulos Oficiales en la Interfaz |
|---|---|---|
| **`UserRole`** | `ZENTRIC.md` Dominio 5 | Comprador · Vendedor · Operador Logístico · Administrador · Supervisor |
| **`OrderStatus`** | `ZENTRIC.md` Dominio 6 | Carrito · Pendiente de Pago · Pagado · Cancelado · Resuelto |
| **`FulfillmentStatus`** | `ZENTRIC.md` Dominio 8 | Pendiente de Empaque · Empacado · Despachado · Entregado · Cancelado por Quiebre |
| **`ReturnStatus`** | `ZENTRIC.md` Dominio 10 | Solicitada · Aprobada · Rechazada · Reembolsada |
| **`ProductStatus`** | `ZENTRIC.md` Dominio 5 | Publicado · Suspendido · Descontinuado |
| **`WarehouseType`** | `ZENTRIC.md` Dominio 7 | Marketplace · Vendedor |
| **`InvoiceType`** | `ZENTRIC.md` Dominio 9 | Factura Maestra · Detalle Zentric · Factura de Vendedor |

> **Garantía de Exhaustividad:** Los mapas se tipan como `Record<Enum, string>`. Si el backend añade un nuevo valor a una enumeración, el compilador de TypeScript emite un error inmediato hasta que se defina su rótulo en español, asegurando que ninguna pantalla quede desprovista de descripción textual.

---

## 5. Criterios de Accesibilidad (WAI-ARIA) y Usabilidad

El sistema de diseño cumple con los estándares WCAG 2.1 Nivel AA:
1. **Contraste de Color:** Razón de contraste mínima de 4.5:1 para texto estándar y 3:1 para textos grandes e interactivos sobre fondo carbón.
2. **Navegación por Teclado:** Toda la consola es operable sin ratón. El anillo de foco visual (`ring-brand`) es claramente perceptible en elementos activos y nunca se suprime con `outline: none`.
3. **Anuncios para Lectores de Pantalla:** Los estados de carga utilizan `role="status"` y las alertas de error usan `role="alert"`.
4. **Respeto a Preferencias de Movimiento:** La directriz `@media (prefers-reduced-motion: reduce)` desactiva transiciones y animaciones decorativas para usuarios con sensibilidad vestibular.

---

## 6. Identidad Gráfica y Monograma Oficial

- **Concepto Visual: "Z + Órbita/Centro":** El monograma presenta la letra `Z` geométrica rodeada de trayectorias orbitales estilizadas, simbolizando a Zentric como el núcleo operacional del marketplace donde convergen compradores, vendedores, bodegas y pedidos.
- **Componentes SVG:**
  - `LogoMark`: Isotipo autónomo para favicons y barra lateral colapsada.
  - `LogoWordmark`: Tipografía Zentric vectorial para cabeceras y pantallas públicas.
  - `Logo`: Combinación de símbolo, texto y subtítulo *"Sistema Operativo para Comercio"*.
- **Prohibición de Marcas Externas:** Queda estrictamente prohibido utilizar logotipos comerciales o dependencias visuales de terceros; todo el set de identidad gráfica reside como código SVG propio en el repositorio.
