# Frontend-Design-System

> Sistema de diseño de la consola Zentric. Define tokens, componentes
> reutilizables, estados obligatorios y criterios de accesibilidad.
> No se usan marcas, logotipos ni material visual de terceros: la identidad
> gráfica es original y propia.

---

## 1. Dirección visual

| Atributo | Definición |
| --- | --- |
| Personalidad | **Confiable, operativa, sobria.** Es una herramienta de trabajo: densidad de información alta, jerarquía clara, sin decoración superflua. |
| Acento | Índigo profundo (confianza institucional) |
| Semánticos | Esmeralda = confirmado · Ámbar = pendiente · Rojo = error · Azul = informativo |
| Tipografía | Pila del sistema (`Inter`, `Segoe UI`, `system-ui`). Sin fuentes remotas: nada de bloqueo por red. |
| Densidad | Compacta pero respirada: filas de 40 px, separación por escala de 4 px. |
| Radios | 6 px (pequeño) · 10 px (medio) · 14 px (superficie) · 999 px (insignia) |

**Prohibido:** degradados decorativos fuera de la marca, sombras como adorno,
animaciones que bloqueen la lectura y color como único indicador de estado.

---

## 2. Tokens

Definidos como variables CSS en `src/styles/tokens.css`.

```css
:root {
  /* Marca */
  --brand-600: #4f46e5;   /* botón primario, foco */
  --brand-700: #4338ca;   /* hover, texto de marca */

  /* Semánticos */
  --success-600: #059669; --warning-600: #d97706;
  --danger-600:  #dc2626; --info-600:    #2563eb;

  /* Superficies */
  --bg-canvas: #f6f7fb;  --bg-surface: #ffffff;
  --bg-subtle: #f1f3f9;  --bg-raised:  #ffffff;

  /* Texto */
  --text-strong: #14162b;  /* 15.9:1 sobre --bg-surface */
  --text-body:   #3d4258;  /*  9.2:1 */
  --text-muted:  #626a85;  /*  5.6:1 */

  /* Espaciado: escala de 4 px */
  --space-1: .25rem; --space-2: .5rem; --space-3: .75rem;
  --space-4: 1rem;   --space-6: 1.5rem; --space-8: 2rem;

  --radius-sm: 6px; --radius-md: 10px; --radius-lg: 14px;
  --duration-fast: 120ms; --duration-base: 200ms;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
}
```

Modo oscuro por `prefers-color-scheme`: se invierten superficies y se mantienen
los acentos con contraste AA verificado (15.1:1, 10.4:1 y 6.1:1 respectivamente).

---

## 3. Componentes obligatorios

| Componente | Responsabilidad | Regla clave |
| --- | --- | --- |
| `Button` | Acción | Variantes `primary`, `secondary`, `ghost`, `success`, `danger`. Estado `busy` con `aria-busy`. |
| `Input` / `Select` / `Textarea` | Campo | `label` siempre visible; error enlazado con `aria-describedby`. |
| `Card` | Superficie | Título, cuerpo y pie opcionales. |
| `Table` / `DataTable` | Listado | Esqueleto durante carga; `caption` para lectores de pantalla. |
| `StatusBadge` | Estado | Texto **más** color; punto de color como refuerzo, nunca único indicador. |
| `MoneyAmount` | Importe | Formatea con la moneda del servidor. |
| `EntityCard` | Resumen de entidad | Identificador, estado y acción directa. |
| `Modal` | Diálogo | Foco atrapado, cierre con `Escape`, `role="dialog"`. |
| `Alert` | Aviso en línea | `role="alert"` en errores. |
| `Skeleton` | Carga | Sin salto de layout al llegar el contenido. |
| `StateView` | Vacío / error | Un componente único para ambos, con acción de reintento. |

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
| Foco | Anillo visible en todo elemento interactivo; nunca se suprime |
| Teclado | Todo el flujo es navegable; `Escape` cierra diálogos |
| Etiquetas | Cada campo tiene `label` visible; los iconos tienen `aria-label` |
| announced | Carga y errores usan `role="status"` y `role="alert"` |
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

- Español rioplatense neutro, sin coloquialismo excessive.
- Titles en infinitivo: **"Registrar usuario"**, no "Registro de usuario".
- Errores: dicen qué pasó y qué hacer. **"No se pudo conectar con el servidor.
  Verificá que la API esté en ejecución."** Nunca "Error 500".
- Estados vacíos: explican y ofrecen la acción siguiente.

---

## 9. Identidad gráfica

- Marca tipográfica **Zentric** con un monograma geométrico propio.
- **Prohibido:** logotipos, nombres o material visual de terceros; imágenes de
  stock con licencia indeterminada; fuentes remotas.
- Los recursos gráficos se generan en el repositorio o son SVG propios.
