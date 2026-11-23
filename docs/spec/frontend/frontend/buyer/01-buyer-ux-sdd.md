# Zentric — SDD de experiencia Buyer (Comprador)

## 1. Objetivo y límites
Diseñar el storefront público y el espacio de cuenta del comprador para descubrir, evaluar y comprar productos con confianza. La experiencia toma patrones de búsqueda y detalle informativo de Amazon, contexto local y señales de confianza de Mercado Libre, y descubrimiento visual de Temu, manteniendo identidad visual propia.

El SDD define comportamiento de frontend. La disponibilidad real, precio final, reglas de pago, reserva, pedido y devolución las determina el backend. En V1 cada combinación comercial es un Product independiente: no existe selección ni galería por variante. Los flujos pendientes en el dominio deben mantenerse explícitamente pendientes.

## 2. Navegación principal
- Inicio
- Categorías
- Buscar
- Detalle de producto
- Carrito
- Checkout
- Mis pedidos
- Perfil y direcciones (solo si están soportados por dominio/API)
- Ayuda/devoluciones (según políticas aprobadas)

Header persistente en desktop; en móvil, búsqueda visible y acceso rápido al carrito. No ocultar información esencial de precio o disponibilidad detrás de interacciones innecesarias.

## 3. Inicio y descubrimiento

### Requisitos
- Campo de búsqueda prominente con sugerencias solo cuando el backend ofrezca el servicio.
- Categorías y colecciones basadas en datos reales.
- Secciones de productos nuevos, populares, recomendados u ofertas únicamente si existe criterio backend verificable.
## 4. Búsqueda y catálogo
- Búsqueda por texto y categorías; autocomplete, tolerancia a errores, ranking y sinónimos dependen de la API.
- Filtros solo para atributos disponibles: categoría, rango de precio, tipo de producto, variantes, vendedor u otros aprobados.
- Ordenamiento solo por opciones que el backend soporte.
- Mantener filtros en URL para compartir, recargar y volver atrás.
- Paginación o scroll incremental con carga accesible y control de posición.
- Estado sin resultados: texto consultado, filtros activos y acciones para limpiar/editar.
- Tarjetas clicables con foco visible y área táctil suficiente.

## 5. Detalle del producto

### Contenido
- Galería con imagen principal, miniaturas y selector accesible.
- Nombre, descripción, precio, moneda, variantes y tipo físico/digital según contrato.
- Estado comercial: solo productos publicados deben mostrarse en catálogo público si ese es el contrato del backend.
- Disponibilidad/stock con semántica proveniente del backend; no mostrar cantidad exacta si no está autorizada o no se entrega.
- Identidad del vendedor con nombre/logo público y reputación solo si existe una fuente fiable.
- Condiciones de entrega, garantía, devoluciones, factura y reseñas solo si están definidas y soportadas.
- CTA "Agregar al carrito" y/o "Comprar" según los casos de uso aprobados.
- Al cambiar variante, actualizar precio, disponibilidad e imágenes de esa variante si el backend relaciona esos datos.

### Imágenes
- Usar `ProductGallery` y `next/image`; mantener relación de aspecto consistente.
- Placeholder blur, lazy loading, fallback genérico de producto.
- Zoom en hover/tap accesible (teclado + touch).

## 6. Carrito
- Persistente en backend (CustomerOrder status=Cart).
- Items: imagen miniatura, nombre, variante, precio unitario (congelado), cantidad editable, subtotal.
- Validación de stock en cada cambio de cantidad (backend revalida).
- Resumen: subtotal, envío (si calculable), impuestos, total.
- CTA "Ir al checkout" / "Seguir comprando".
- Empty state: "Tu carrito está vacío" + link a catálogo.

## 7. Checkout
- **Paso 1: Dirección** — formulario con autocomplete (Google Places / backend), validación UX + server. Dirección por defecto del perfil.
- **Paso 2: Envío** — opciones que devuelva backend (costo, ETA, transportadora). Selección obligatoria.
- **Paso 3: Pago** — métodos que devuelva backend (simulado V1). No presentar envío gratuito, ETA, impuestos, descuentos o métodos no devueltos por contrato.
- Mostrar errores de campo cerca del campo y errores globales en contexto.
- Al enviar, bloquear duplicados en UI y usar la idempotencia que soporte backend.
- El frontend no declara un pago exitoso por una redirección o por haber enviado un formulario: debe esperar la confirmación fiable del backend.
- El dominio establece que el pago validado inicia preparación. La política de fallo/pendiente de pago está por definir y no debe inventarse.
- Tras la respuesta, mostrar confirmación con identificador y estado real del pedido; si queda pendiente, decirlo expresamente.

## 8. Pedidos y posventa
- Lista de pedidos con fecha, identificador, resumen, total y estado real.
- Detalle con timeline solo de transiciones que el backend haya confirmado.
- Mostrar información de seguimiento solo si el servicio logístico la entrega.
- No permitir edición de pedido finalizado; tampoco simular edición de pedidos en otros estados si no hay caso de uso.
- Devoluciones/reembolsos se muestran según política aprobada y elegibilidad informada por backend. No calcular elegibilidad en cliente como autoridad.
- Facturas/recibos solo cuando el backend provea el documento.
- Recompra solo si el caso de uso está aprobado y valida disponibilidad actual.

## 9. Perfil del comprador
- Separar datos personales, direcciones y preferencias si esas capacidades existen.
- No inventar gestión de direcciones si no está en el dominio/API.
- Formularios con edición explícita, validación UX y confirmación del servidor.
- La foto de perfil es opcional; usar avatar con iniciales si no existe.
- No mostrar documentos de identidad completos en listados o áreas públicas.

## 10. Imágenes del comprador y productos
- El perfil personal usa avatar, no la imagen del producto.
- Avatar de perfil: 1:1, `object-fit: cover`, fallback de iniciales y texto alternativo apropiado.
- Producto: imagen asociada al producto/variante; fallback genérico de producto.
- No mostrar el avatar del vendedor como si fuera imagen del artículo.
- Al subir avatar, validar archivo, previsualizar, subir por flujo autorizado y mostrar éxito solo después de confirmación.
- No incluir datos personales en URL, `alt` ni analítica.

## 11. Accesibilidad y responsive
- Búsqueda operable con teclado; sugerencias anunciadas por lector de pantalla.
- Galería con botones accesibles y foco visible.
- Errores enlazados a campos; diálogo de confirmación con foco gestionado.
- En móvil, CTA de compra visible sin tapar contenido ni información legal/precio.
- No usar solo color para comunicar stock, error o estado.

## 12. Métricas
Medir, con política de privacidad aprobada:
- búsquedas sin resultados;
- apertura de producto desde resultados;
- selección de variante;
- añadir/quitar carrito;
- inicio y abandono de checkout;
- errores de validación/pago;
- recompra y repetición de visita cuando pueda medirse legítimamente.

No usar clics como sinónimo de ventas. Los resultados financieros provienen del backend.

## 13. Criterios de aceptación
- El comprador puede buscar, filtrar, abrir detalle y distinguir variantes.
- El catálogo no muestra estados comerciales no autorizados.
- Precio y disponibilidad se revalidan en el momento definido por el contrato.
- El flujo representa carga, vacío, error, conflicto y confirmación.
- No se simula un pago ni un pedido exitoso.
- Las imágenes tienen `alt`, dimensiones, fallback y configuración de dominio permitida.
- Las rutas privadas no permiten ver pedidos de otro usuario.
### Precio y disponibilidad
- Precio final con moneda, impuestos incluidos si aplica (según contrato).
- Disponibilidad: "En stock", "Pocas unidades", "Agotado", "Próximamente" — solo valores que devuelva backend.
- No mostrar "Envío gratis" ni ETA si no vienen del contrato.
- Grilla adaptable; tarjetas con imagen, nombre, precio actual y precio anterior solo si el descuento es real, disponibilidad resumida y disponibilidad solo cuando esté disponible.
- No inventar contadores de ventas, urgencia, temporizadores ni "últimas unidades".
- Mensajes de error y estados vacíos con alternativas reales: ajustar filtros, limpiar búsqueda o navegar categorías.

### Referencia de UX
- Amazon: claridad de búsqueda y organización.
- Mercado Libre: confianza y contexto de compra.
- Temu: descubrimiento visual denso y scroll, sin manipulación de urgencia.
