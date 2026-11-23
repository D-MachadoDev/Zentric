# ADR-0027 — Split Sticky y Selección de Variantes No Cromáticas en Ficha de Producto

- **Estado:** [APROBADO]
- **Fecha:** 2026-11-20
- **Autor:** Product Design & Architecture Team
- **Ámbito:** Frontend (`@zentric/ui`, vistas de Comprador / PDP)
- **Relacionado con:** [ADR-0002](ADR-0002-clave-inventario-variantid.md) (Clave por VariantId) y [ADR-0020](ADR-0020-precio-congelado-y-credito-parcial-por-linea.md) (Precio Congelado)

---

## Contexto

En el catálogo de Zentric, un producto físico o digital puede presentar combinaciones multidimensionales de variantes:
1. **Variantes cromáticas** (color, material exterior, acabado visual) que alteran la galería de fotos del producto.
2. **Variantes no cromáticas** (tallas de calzado/ropa, capacidad de almacenamiento en GB/TB, volumen o tipo de licenciamiento digital) que no alteran la imagen principal pero modifican el precio unitario, las dimensiones de empaque logístico y el stock físico disponible en bodega (`ADR-0002`).

### Problema de Conversión y Ergonomía Visual (Fogg Behavior Model)
Al desplazarse hacia abajo en la Ficha Técnica de Producto (PDP) para leer especificaciones, dimensiones o reseñas, el panel de compra (selector de talla/capacidad, precio dinámico y botón "Comprar / Agregar al Carrito") desaparece del campo visual. Esto genera una fricción cognitiva severa: el comprador debe interrumpir su lectura y volver a scrollear hacia arriba para seleccionar su talla o completar la compra.

---

## Alternativas Consideradas

| | Opción | Por qué se descartó / Ventaja |
|---|---|---|
| **A** | **Split View Asimétrico con Columna Derecha Sticky (Desktop) y Bottom Floating Buy Bar (Mobile)** | — **Elegida.** Mantiene el CTA y la selección de atributos siempre visibles sin obstruir la galería ni la descripción técnica. |
| **B** | Formulario de compra inline tradicional (desaparece con el scroll) | Genera fatiga de scroll; penaliza la conversión en escritorios y pantallas panorámicas. |
| **C** | Modal o Drawer flotante obligatorio que interrumpe la pantalla al pulsar "Comprar" | Rompe el flujo natural de decisión; añade un paso modal intermedio invasivo no apto para compradores recurrentes. |

---

## Decisión

Se adopta el patrón de diseño **Split Sticky View con Matriz Dimensional Desacoplada**:

1. **Layout Asimétrico en Escritorio (Desktop >= 1024px)**:
   - **Columna Izquierda (60% ancho)**: Galería de medios navegable en scroll libre, carrusel de miniaturas, descripción técnica completa, tabla de dimensiones de bodega e histórico de reseñas.
   - **Columna Derecha (40% ancho — Sticky Top)**: Contenedor anclado con clase Tailwind `sticky top-24 self-start` que acompaña al usuario durante todo el recorrido de la página. Aloja:
     - Título del producto y badge de estado.
     - Selector de Color (variante cromática) con preview circular.
     - Selector de Variantes No Cromáticas (tallas, capacidad, licencias) mediante componentes accesibles `Pill / Chip` con estados claros (`Selected`, `Available`, `Disabled/Agotado`).
     - Display de precio unitario dinámico (`MoneyDisplay`).
     - Contador atómico de stock restante por bodega física.
     - Botón de acción principal (`AddToCartButton` y `InstantCheckoutButton`).

2. **Barra Flotante Inferior en Dispositivos Móviles (Mobile < 1024px)**:
   - Cuando el panel de compra primario sale del viewport superior por scroll, emerge suavemente un componente **Bottom Floating Action Bar** (`fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur border-t pb-safe`):
     - Miniatura de la variante seleccionada + precio actual visible.
     - Botón de compra directa con un solo tap, anclado a la variante activa.

3. **Desacoplamiento de la Matriz de Variantes**:
   - La selección de una opción no cromática (ej. Talla "L") filtra la matriz en memoria del cliente para resolver el `VariantId` definitivo.
   - Si una variante no cromática tiene existencias cero en bodega (`AvailableQuantity == 0`), el chip se muestra visualmente atenuado con la etiqueta *"Agotado"*, previniendo errores de checkout antes de invocar la reserva en backend (`ADR-0001`, `ADR-0025`).

---

## Trade-offs Evaluados

- **Qué Ganamos:**
  - Reducción drástica de pasos para la conversión: el botón de compra está siempre a un clic de distancia.
  - Accesibilidad WCAG 2.2 AA total: navegación por teclado en los selectores de atributos sin saltos bruscos de scroll.
  - Coherencia total con `ADR-0002`: el usuario es consciente en todo momento del SKU y variante exacta que está ingresando a su carrito.
- **Qué Sacrificamos:**
  - Requiere cálculo de altura y gestión estricta de `z-index` en el frontend para evitar que el contenedor sticky colisione con modales o tooltips de navegación.

---

## Consecuencias

- **En `@zentric/ui`:** Se construye el componente `ProductVariantMatrix` y el layout `StickyProductSidebar.tsx`.
- **En Experiencia de Usuario:** Experiencia de compra de nivel editorial y comercial alineada con los estándares de comercio electrónico moderno (Emox / Shopcart).
