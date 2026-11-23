# Especificación Sistémica de Diseño y Flujo Modular de Calificación de Producto

> **Documento Canónico**: `docs/spec/frontend/04-experiencia/SPEC-PRODUCT-REVIEW.md`  
> **Sistema**: Zentric Marketplace Frontend (`frontend/src/ui`)  
> **Área**: Diseño de Producto & UX Conductual  
> **Stack de Implementación**: React 19, Tailwind CSS v4, Radix UI Primitives, Lucide React, Vitest  
> **Fecha de Emisión**: 2026-11-19  
> **Estado**: Aprobado para Producción (Milestone M1)  

---

## 1. Contexto y Objetivos del Sistema

La confianza en un marketplace de bienes reacondicionados y tecnología premium (como Zentric) reposa sobre dos pilares innegociables:
1. **La exactitud del catálogo técnico**: Los compradores necesitan evaluar la integridad física, el rendimiento y la calidad del hardware que reciben.
2. **La transparencia operativa**: El servicio logístico (puntualidad, integridad del empaque exterior, amabilidad del transportista) debe auditarse continuamente sin contaminar ni destruir la reputación del fabricante ni del SKU.

El objetivo de este documento es fijar la especificación técnica y de interacción para el flujo de calificación y reseñas post-compra en Zentric, erradicando los vicios de maquetación heredados de plantillas visuales genéricas y estableciendo una arquitectura desacoplada de doble dominio.

---

## 2. Plantilla de Tarea Obligatoria de Interfaz

Toda superficie y modal de interacción en Zentric debe responder formalmente a la plantilla canónica de tarea antes de concebir cualquier distribución espacial o maquetación:

```markdown
«Esta persona llega aquí porque ha recibido su pedido (#ZT-88492), ha tenido la oportunidad de desembalar, configurar y probar su dispositivo (Apple iPhone 16 Pro Max — 256GB Titanio Natural), y acude desde su historial de compras o una notificación de entrega para emitir su veredicto de compra y cerrar el ciclo de su pedido;

necesita saber con total certeza qué ítem y variante específicos está evaluando, que su valoración técnica beneficiará directamente a otros compradores reales en el catálogo público, y que cualquier queja o felicitación sobre el transporte se canaliza por una vía independiente que no castiga injustamente al producto;

y debe poder calificar la calidad del producto con fricción mínima en menos de 30 segundos, desahogar o valorar la logística en un paso desacoplado, escribir opcionalmente una reseña detallada con preservación de borrador ante caídas de red, y adjuntar fotos sin que la interfaz le imponga contenedores redundantes ni fricciones innecesarias.»
```

---

## 3. Reglas de Sustracción Visual Estricta (*The Unslop Policy*)

En consonancia con las directrices de Verónica para interfaces de alto estándar editorial (*luxury-level restraint*), se imponen las siguientes cuatro prohibiciones absolutas:

### 3.1 Prohibición Estricta de "Tarjetas dentro de Tarjetas" (*Cardception*)
- **Defecto Detectado en la Referencia**: La captura original (`uploaded_media_1795116877342.jpg`) acumula hasta 5 capas de contenedores con bordes grises (`border border-slate-200`):
  1. Modal exterior (`surface-card`).
  2. Tarjeta contenedora de datos del producto (`bg-slate-50`).
  3. Caja independiente para el icono del teléfono móvil (`bg-slate-900`).
  4. Recuadro cerrado delimitador para las 5 estrellas (`bg-slate-50 border rounded-xl`).
  5. Dropzone rectangular dashed para fotos + tarjetas de miniaturas individuales con badges.
- **Regla Sistémica**:
  - El modal es la **única superficie delimitadora** (`surface` con borde suave `border-border/80` y sombra difusa).
  - La cabecera del producto se presenta como un grupo tipográfico plano y directo: thumbnail cuadrado nítido (48x48px, `rounded-lg`) + título con clamp tipográfico + variante + badge de compra verificada.
  - El selector de estrellas flota libre sobre el lienzo, delimitado exclusivamente por el espaciado rítmico vertical (`py-3`).
  - La carga de fotos no utiliza una caja dashed gigantesca cuando está vacía: se presenta como un trigger plano y compacto (`[+ Añadir fotos del producto]`), desplegando únicamente las miniaturas seleccionadas.

### 3.2 Prohibición de Emojis Decorativos sin Propósito
- **Defecto Detectado en la Referencia**: Presencia invasiva de emojis tipográficos: `5 / 5 ¡Excelente! 🤩`, `✨ Excelente Calidad`, `⚡ Envío Rápido`, `📦 Empaque Seguro`, `💎 Idéntico a la Foto`, `🛡️ Reseña Segura`, `Publicar Reseña ✈️`.
- **Impacto Negativo**: Los emojis generan renderizado inconsistente entre plataformas (Windows Segoe UI Emoji vs Apple AppleColorEmoji vs Google Noto Color), infantilizan la experiencia de un producto de más de $1,200 USD y alteran la altura métrica de línea (`line-height`).
- **Regla Sistémica**:
  - Queda **estrictamente prohibido** el uso de emojis decorativos en etiquetas, botones, chips y textos de estado.
  - La iconografía es provista exclusivamente por componentes vectoriales SVG de **Lucide React** (`Star`, `Check`, `Package`, `Truck`, `ShieldCheck`, `AlertCircle`, `X`, `Loader2`), con trazo uniforme (`strokeWidth={1.75}`) y tamaño estándar (16px a 20px).

### 3.3 Prohibición de Degradados Genéricos de Plantilla
- **Defecto Detectado**: Botones y fondos con degradados saturados de estilo CSS de librería comercial (ej. `bg-gradient-to-r from-blue-600 to-indigo-600`).
- **Regla Sistémica**:
  - Todas las superficies de interacción emplean fondos sólidos mates de alta legibilidad (`bg-surface`, `bg-surface-muted`, `bg-brand`).
  - El botón de acción principal utiliza el color sólido de marca con contraste WCAG AAA sobre texto blanco.

### 3.4 Jerarquía Matemática de Radios de Esquina (*Nested Radii Rule*)
- **Defecto Detectado**: Convivencia anárquica de `rounded-3xl` (modal), `rounded-xl` (cajas internas), `rounded-lg` (inputs) y `rounded-full` (chips) sin ninguna relación geométrica.
- **Regla Sistémica**:
  - La curvatura interior debe gobernar armónicamente según la distancia al perímetro:
    $$\text{Radio}_{\text{interior}} = \text{Radio}_{\text{exterior}} - \text{Padding}$$
  - Modal contenedor: `rounded-2xl` (20px - 24px).
  - Padding perimetral del modal: `p-6` (24px).
  - Controles internos (Inputs, Textareas, Botones principales): `rounded-lg` (12px).
  - Chips de atributos y controles pequeños: `rounded-md` (8px).

---

## 4. Las Tres Reglas Visuales Coherentes de Zentric

Para garantizar una experiencia visual serena, predecible y de alta gama en todo el catálogo de Zentric, se formalizan tres reglas de aplicación universal:

### Regla 1: Uso Reservado del Color de Acento para la Acción Principal
El color de acento primario de la marca (`--brand` / `brand.blue-600` / `#2563eb`) tiene un propósito unívoco: **conducir la acción afirmativa principal del usuario**.
- Solo el botón primario de avance o envío (`Publicar Reseña`) y los estados activamente seleccionados de los chips de atributos pueden reclamar este color.
- Ningún contenedor secundario, borde de decoración o fondo decorativo puede usurpar el color de acento. Si todo resalta, nada es prioritario.

### Regla 2: Agrupación con Espacio antes que con Contenedores
La jerarquía y separación entre secciones se resuelve mediante **ritmo vertical y espaciado negativo activo**, no mediante bordes y cajas:
- Secciones principales: separadas por `space-y-6` (24px) o separadores horizontales tenues (`border-t border-border/60`).
- Etiquetas de sección: tipografía sutil en mayúsculas micro (`text-xs font-semibold tracking-wider text-foreground-muted uppercase`).
- No se encierra la calificación ni el texto en recuadros secundarios que generen claustrofobia visual.

### Regla 3: Color de Estado Semántico y Significativo
El color solo comunica estado funcional y nunca se usa con fines meramente ornamentales:
- **Calificación por Estrellas**: `--accent-gold` (`#D4AF37` / `#F59E0B`), reservado exclusivamente para estrellas activas e indicadores de satisfacción.
- **Compra Verificada**: `--success` / `emerald-600` (`#059669`), acompañado del icono `ShieldCheck`.
- **Alertas y Fallos de Red**: `--destructive` / `rose-600` (`#E11D48`), confinado al banner de error con icono `AlertCircle`.
- **Advertencia de Caracteres**: `amber-600` al superar el 90% del límite de 500 caracteres.

---

## 5. Investigación de Estándares de la Industria (Benchmarks)

| Plataforma | Separación Producto vs. Logística | Mecanismo de Desacoplamiento | Impacto en el Catálogo | Destino del Feedback Logístico |
|---|---|---|---|---|
| **Amazon** | **Bifurcación Estricta** (Community Guidelines) | Customer Reviews evalúan únicamente el ítem. Problemas de envío o paquetería se canalizan a *Packaging & Delivery Feedback* o *Seller Feedback*. En pedidos con FBA, Amazon suprime o tacha comentarios de logística en la ficha del ítem. | **Protegido**. El SKU no pierde estrellas por incidencias de UPS o transportistas locales. | Métrica de SLA del transportista y reputación del vendedor externo. |
| **Mercado Libre** | **Doble Motor de Reputación** | *Opiniones sobre el Producto* (asociadas al catálogo universal del SKU) vs. *Opinión sobre el Vendedor y Envío* (en el historial del comprador). Micro-copy: *"Opina sobre el producto, no sobre el vendedor ni el envío"*. | **Protegido**. La puntuación del producto es compartida por todos los vendedores que publican el mismo ítem. | Semáforo de reputación del vendedor (retrasos de despacho impactan medalla MercadoLíder). |
| **Uber Eats** | **Calificación Bipolar Inmediata** | Pantalla doble post-pedido: 1) Calificación del Restaurante/Comida (1-5 estrellas); 2) Calificación del Repartidor (pulgar arriba/abajo + propina + puntualidad). | **Protegido**. Si el repartidor sufre una demora de 45 minutos por tráfico, la comida no recibe 1 estrella. | Alertas operativas en tiempo real sobre rutas y penalizaciones de despacho. |
| **Airbnb** | **Evaluación Multidimensional Desacoplada** | Evaluación pública del alojamiento desglosada (Limpieza, Veracidad, Llegada, Comunicación, Ubicación) + canal de **Feedback Privado** para el anfitrión. | **Ponderado**. La nota general no queda destruida si falló un detalle aislado de la llegada. | Mensajes privados y directos de mejora al anfitrión sin dañar la reserva pública. |
| **Apple Store** | **Encuesta Segmentada Post-Entrega** | Tras la entrega por DHL/FedEx, Apple envía evaluación dual: satisfacción del dispositivo (hardware, pantalla, batería) vs satisfacción del unboxing y entrega. | **Protegido**. El iPhone o Mac mantiene métricas puras de ingeniería de producto. | SLAs contractuales con transportadoras basados en datos de entrega. |

---

## 6. Análisis Comparativo Profundo: Propuesta 1 vs. Propuesta 2

### El Caso Incómodo Crítico:
> *«El comprador pagó $1,300 USD por un Apple iPhone 16 Pro Max 256GB Titanio Natural. La entrega prometida era de 48 horas, pero la transportadora demoró 8 días. Durante 6 días el tracking no se actualizó, provocando ansiedad y molestia al usuario. Al recibir el paquete, el comprador desembala el teléfono: el hardware está impecable, la pantalla OLED es perfecta y la batería funciona al 100%. Sin embargo, al solicitarle su reseña, su estado emocional reciente es de enojo por la tardanza.»*
> 
> **Impulso inicial del comprador**: Selecciona **2 estrellas** (`★★☆☆☆`).

### Matriz Comparativa de Consecuencias:

```
+-----------------------------------------------------------------------------------------------------------------+
| DIMENSIÓN                   | PROPUESTA 1 (Reseña Rápida Monolítica)       | PROPUESTA 2 (Desacoplada Modular Ganadora)   |
+-----------------------------------------------------------------------------------------------------------------+
| ¿Qué registra la base de    | ProductReview:                               | 1) ProductReview (Catálogo Público):        |
| datos?                      | - rating: 2 estrellas                        |    - rating: 5 estrellas (Hardware 10/10)   |
|                             | - text: "El teléfono vuela y la pantalla es  |    - text: "La pantalla y el acabado son    |
|                             |   increíble, pero se demoró 8 días en llegar.|      espectaculares. Teléfono impecable."   |
|                             |   Pésimo servicio de entrega."               |    - tags: ["pantalla", "materiales_premium"]|
|                             | FulfillmentReview:                           | 2) FulfillmentReview (Operaciones Internas): |
|                             | - NULL (No existe canal para logística)      |    - deliveryRating: 1 estrella              |
|                             |                                              |    - onTimeDelivery: false (delayDays: 6)    |
|                             |                                              |    - packageCondition: "intact"              |
|                             |                                              |    - logisticsTags: ["demora_transportadora"]|
+-----------------------------------------------------------------------------------------------------------------+
| ¿Qué ve el comprador        | En la ficha técnica del iPhone 16 Pro Max:   | En la ficha técnica del iPhone 16 Pro Max:   |
| posterior en la PDP?        | - Calificación promedio degradada (de 4.9 a  | - Calificación perfecta de 5.0 estrellas.    |
|                             |   4.4 estrellas).                            | - Testimonios centrados en batería y cámara. |
|                             | - Reseña destacada con badge "2.0 ⭐".       | En la sección de checkout/despacho:          |
|                             | - Sesgo de aversión a la pérdida: el nuevo   | - Indicador transparente: "Transportadora     |
|                             |   comprador duda: "¿Tendrá falla de pantalla |   Servientrega: 3.4/5 (Ruta con posibles     |
|                             |   o batería?". Fuga masiva de conversión.    |   demoras)". Información útil sin engaño.    |
+-----------------------------------------------------------------------------------------------------------------+
| Impacto en el Marketplace   | INJUSTO Y DESTRUCTIVO:                       | TRANSPARENTE Y FIDEDIGNO:                    |
| y Vendedor                  | El fabricante y el vendedor son castigados   | Se preserva la reputación del catálogo.      |
|                             | comercialmente por culpa del camión de       | El vendedor que empaquetó a tiempo no pierde |
|                             | reparto. Se corrompe el algoritmo de ranking.| su insignia de calidad.                      |
+-----------------------------------------------------------------------------------------------------------------+
| Capacidad de acción de      | CIEGO TOTAL:                                 | ACCIÓN OPERATIVA INMEDIATA:                  |
| Operaciones / Logística     | El equipo de logística de Zentric no recibe  | Se emite un evento estructurado automático.  |
|                             | ningún dato. El transportista sigue operando | Se penaliza el SLA del transportista en esa |
|                             | sin penalización de contrato.                | ruta y se audita el despacho con métricas.   |
+-----------------------------------------------------------------------------------------------------------------+
| Catarsis del usuario        | FRUSTRACIÓN O VANDALISMO:                    | CATARSIS GUIADA Y REPARADORA:                |
|                             | El usuario destruye el rating del producto   | La interfaz comprende al usuario: le permite |
|                             | porque es el único campo disponible para     | calificar 5 al teléfono y 1 al transporte.   |
|                             | expresar su rabia.                           | Siente que su queja fue escuchada y ubicada. |
+-----------------------------------------------------------------------------------------------------------------+
```

### Veredicto: Selección de la Propuesta 2 como Arquitectura Ganadora
La **Propuesta 2** resuelve la tensión psicológica del comprador: separa el juicio técnico sobre el bien adquirido del juicio de cumplimiento sobre el servicio de entrega. Es la única solución que protege el catálogo de Zentric, provee feedback procesable al operador de transporte y elimina la contaminación de datos en el marketplace.

---

## 7. Especificación de la Máquina de Estados de la Interfaz

La interfaz desacoplada opera bajo una máquina de estados finitos rigurosa, accesible y observable:

```
                      +-------------------+
                      |      initial      |  (0 estrellas, submit deshabilitado)
                      +-------------------+
                                |
                                | (Usuario pulsa estrella 1-5 / flechas teclado)
                                v
                      +-------------------+
         +----------> |    interacting    |  (Estrellas activas, tags de producto)
         |            +-------------------+
         |                      |
         | (Edición en línea)   | (Escritura en textarea > 0 chars)
         |                      v
         |            +-------------------+
         +----------- |  long-text form   |  (Límite 500 chars, sessionStorage draft)
                      +-------------------+
                                |
                                | (Click "Publicar Reseña")
                                v
                      +-------------------+
                      |      loading      |  (aria-busy=true, spinner, inputs bloqueados)
                      +-------------------+
                             /     \
                            /       \
              (HTTP 200)   /         \  (HTTP 500 / Network Error)
                          v           v
            +-------------------+   +--------------------+
            |      success      |   | simulated failure  | (Alerta roja, cero pérdida de datos)
            +-------------------+   +--------------------+
            (Checkmark esmeralda,              |
             cierre automático)                | (Click "Reintentar publicación")
                                               v
                                    +--------------------+
                                    |      recovery      | ---> Reingresa a [ loading ]
                                    +--------------------+
```

### Detalle de Comportamiento por Estado:

1. **`initial` (Estado Inicial)**:
   - Parámetros provistos: `orderId`, `productId`, `productTitle`, `variantName`, `thumbnailUrl`, `isVerifiedPurchase`.
   - Valoración de estrellas: `0 / 5` (estrellas neutras, contorno visible `text-foreground-muted/30`).
   - Botón de envío deshabilitado (`disabled`, opacidad al 50%).
   - Textarea accesible con placeholder empático.
   - Sin mensajes de error ni indicadores de carga.

2. **`interacting` (Interacción Activa)**:
   - Navegación completa por teclado en el componente `RatingStars`: `ArrowRight` / `ArrowUp` incrementa, `ArrowLeft` / `ArrowDown` decrementa, `Home` selecciona 1, `End` selecciona 5, `Enter` / `Space` confirma.
   - Rol accesible `role="slider"`, `aria-valuenow`, `aria-valuemin="1"`, `aria-valuemax="5"`, `aria-valuetext="N de 5 estrellas"`.
   - Al marcar **1 o 2 estrellas**: La interfaz activa proactivamente la **guía de catarsis**:
     > *"¿Tuviste algún problema con el producto o fue con los tiempos de entrega de la transportadora?"*
     Desplegando de forma limpia el carril de calificación de logística desacoplada.

3. **`long-text form` (Formulario con Texto Extenso)**:
   - Contador en tiempo real: `N / 500 caracteres`.
   - Al superar 450 caracteres, el contador pasa a advertencia (`text-amber-600`) y emite anuncio mediante `aria-live="polite"`.
   - Al llegar a 500 caracteres, el campo bloquea la inserción de nuevos caracteres sin recortar ni corromper el contenido existente.
   - **Persistencia en Almacenamiento Local**: Todo cambio se sincroniza en `sessionStorage` bajo la clave `zentric_review_draft_${orderId}_${productId}`.

4. **`loading` (Envío en Curso)**:
   - Se activa al hacer clic en "Publicar Reseña".
   - El botón primario muestra el spinner vectorial (`Loader2 className="animate-spin"`) y el texto *"Publicando..."*.
   - El diálogo adquiere `aria-busy="true"`.
   - Todos los controles (estrellas, textarea, chips, botón de cancelar) quedan protegidos contra doble envío (`disabled`).

5. **`simulated failure` (Fallo de Red Simulado)**:
   - Se simula una caída de conexión o error HTTP 500.
   - **Garantía Innegociable de Cero Pérdida de Datos**: Las estrellas marcadas, los chips seleccionados, los 500 caracteres del textarea y las fotos adjuntas permanecen intactos en el estado de React y en `sessionStorage`.
   - Se despliega un banner de error inline accesible (`role="alert"`, borde `border-destructive/30`, fondo `bg-destructive/10`, icono `AlertCircle`):
     > *"No pudimos enviar tu reseña debido a un error de red. Tu texto y calificación están a salvo. Por favor intenta de nuevo."*
   - El botón principal cambia automáticamente a **`Reintentar publicación`** (`variant="default"` con icono `RefreshCw`).

6. **`recovery` y `success` (Recuperación Exitosa)**:
   - Al pulsar "Reintentar publicación", el flujo reenvía exactamente el mismo payload sin requerir que el usuario reescriba una sola palabra.
   - Al recibir confirmación exitosa (HTTP 200/201):
     - El contenido del modal se reemplaza por el estado de éxito: Icono `Check` esmeralda (`text-success`), título *"¡Reseña publicada con éxito!"*, subtítulo *"Tu opinión ayuda a mantener la transparencia y calidad en la comunidad Zentric."*.
     - Se purga el borrador de `sessionStorage`.
     - Cierre accesible automático tras 1.5s o mediante botón de cierre manual.

---

## 8. Matriz de Casos Incómodos y Pruebas Extremas (*Uncomfortable Cases*)

| Caso Incómodo | Entrada Extrema | Comportamiento Frágil (A Evitar) | Comportamiento Robusto Implementado |
|---|---|---|---|
| **Nombre de Producto Ultra-Largo** | `"Apple iPhone 16 Pro Max 256GB Titanio Natural (Desbloqueado para cualquier operador nacional e internacional) - Edición Especial Importada con Garantía Extendida de 2 Años"` | El texto desborda el modal horizontalmente, desplaza los controles fuera de la pantalla o rompe la alineación del thumbnail. | Título contenido con `line-clamp-2` (`text-sm font-semibold text-foreground`), manteniendo siempre visible la variante debajo. Thumbnail cuadrado fijado en `size-12 shrink-0`. Tooltip nativo `title` con el nombre completo accesible en hover/focus. |
| **Calificación 2 Estrellas por Demora Logística** | *"El teléfono llegó impecable y funciona perfecto, pero la entrega demoró 8 días."* | El iPhone 16 Pro Max recibe 2 estrellas en el catálogo global de Zentric. | Se activa la bifurcación: el comprador califica el iPhone con 5 estrellas (`★★★★★`) y la entrega con 1 estrella (`★☆☆☆☆`). El producto conserva su nota real y logística recibe alerta de incumplimiento de transportadora. |
| **Cero Fotos Adjuntas** | El comprador califica solo con estrellas y texto, sin adjuntar imágenes. | Quedan huecos en blanco con recuadros rotos o el botón de publicar se bloquea exigiendo fotos obligatorias. | La sección de fotos es estrictamente opcional. Muestra un trigger plano y compacto de una sola línea: `[+ Añadir fotos del producto (opcional)]`. Cero desperdicio de espacio vertical. |
| **Fallo de Red y Caída de Conexión** | Error de red simulado (HTTP 500) al pulsar "Publicar" tras redactar 480 caracteres. | El formulario se resetea a ceros, borra el texto del usuario y cierra el modal, obligando a reescribir todo. | El formulario preserva el 100% de los datos en memoria y `sessionStorage`. Banner `role="alert"` y botón `Reintentar publicación` para recuperación inmediata sin pérdida. |
| **Texto de Reseña Máximo (500 Caracteres)** | El usuario introduce un bloque de texto que alcanza los 500 caracteres exactos. | El texto desborda el modal empujando el botón fuera del viewport o se corta sin aviso. | Textarea contenido con `max-h-36 resize-none overflow-y-auto`. Contador `500 / 500` en tono advertencia que bloquea caracteres excedentes. |
| **Navegación Exclusiva por Teclado** | Usuario navega utilizando únicamente `Tab`, `ArrowLeft`, `ArrowRight`, `Home`, `End`, `Space`, `Escape`. | El foco se pierde detrás del modal o no se pueden seleccionar las estrellas sin puntero del mouse. | Trampa de foco accesible de Radix UI (`role="dialog"`). Foco inicial en el slider de estrellas (`tabIndex={0}`). Cierre limpio con tecla `Escape`. |

---

## 9. Contratos de Datos e Interfaces de TypeScript

### 9.1 Contrato del Componente Molecular `RatingStars`
```typescript
export interface RatingStarsProps {
  value: number; // 0 a 5
  onChange?: (val: number) => void;
  max?: number; // Por defecto 5
  size?: 'sm' | 'md' | 'lg';
  readOnly?: boolean;
  disabled?: boolean;
  id?: string;
  name?: string;
  'aria-label'?: string;
  className?: string;
}
```

### 9.2 Contrato de la Propuesta 1 (Reseña Pura de Producto)
```typescript
export interface Proposal1ProductReview {
  orderId: string;
  productId: string;
  variantId?: string;
  rating: number; // 1 a 5
  title?: string;
  reviewText: string;
  productTags: string[];
  photoUrls: string[];
  createdAt: string;
}
```

### 9.3 Contrato de la Propuesta 2 (Desacoplada: Producto + Logística - Ganadora)
```typescript
export interface Proposal2DecoupledReview {
  orderId: string;
  productId: string;
  variantId?: string;
  
  // Dominio de Catálogo Público (Afecta el PDP y búsqueda)
  productReview: {
    rating: number; // 1 a 5
    title?: string;
    reviewText: string;
    productTags: string[];
    photoUrls: string[];
    isVerifiedPurchase: boolean;
    visibility: 'public_catalog';
  };
  
  // Dominio Operativo de Logística (Afecta SLA de transportista y vendedor)
  fulfillmentReview?: {
    deliveryRating: number; // 1 a 5
    onTimeDelivery: boolean;
    delayDays?: number;
    packageCondition: 'intact' | 'dented' | 'opened' | 'damaged';
    carrierNotes?: string;
    logisticsTags: string[];
    visibility: 'internal_ops_and_seller_score';
  };
  
  metadata: {
    submittedAt: string;
    clientDraftKey: string;
    appVersion: string;
  };
}
```

---

## 10. Criterios de Aceptación y Verificación

1. **Cumplimiento de Reglas de Verónica**:
   - Cero tarjetas dentro de tarjetas: no existen contenedores con bordes secundarios enjaulando estrellas ni metadatos.
   - Cero emojis decorativos en chips, botones, labels o textos de estado.
   - Cero degradados genéricos de fondo.
   - Jerarquía matemática de radios de curvatura ($R_{\text{int}} = R_{\text{ext}} - \text{padding}$).
2. **Desacoplamiento Probado**:
   - Ante el caso incómodo de entrega demorada con producto perfecto, el usuario puede calificar con 5 estrellas el hardware del iPhone 16 Pro Max y canalizar la calificación de 1 estrella al servicio logístico.
3. **Resiliencia Observable**:
   - La simulación de caída de red (HTTP 500) retiene íntegramente los 500 caracteres y todos los inputs seleccionados, permitiendo el reintento exitoso con un solo clic.
4. **Higiene del Repositorio**:
   - Todo el código reside en sus ubicaciones canónicas de `frontend/src/ui` y `frontend/src/features/buyer`, sin archivos temporales ni scripts huérfanos.
