# Zentric — SDD de experiencia Seller (Vendedor)

## 1. Objetivo
Panel operativo del vendedor para gestionar catálogo, inventario, pedidos propios y cumplimientos con eficiencia y trazabilidad.

## 2. Navegación principal
- Dashboard (métricas propias: ventas, stock bajo, pedidos pendientes, alertas)
- Productos (listar, crear, editar, publicar, suspender, variantes)
- Inventario (existencias por variante/bodega, AddStock, ajustes)
- Pedidos (líneas propias, timeline, acciones según estado)
- Cumplimientos (cola asignada: Pack, Dispatch, Deliver)
- Devoluciones (solicitudes propias: inspección, aprobar/rechazar)
- Facturas Vendor (split propio)
- Perfil tienda (nombre, descripción, logo, contacto, estado)

## 3. Dashboard
- **KPIs**: Ventas (últimos 30d), Pedidos pendientes, Productos con stock < umbral, Alertas (stock 0, pedidos sin despachar > 48h).
- **Accesos rápidos**: "Añadir producto", "Abastecer stock", "Ver pedidos urgentes".
- **Estados vacíos**: "No hay productos publicados" + CTA crear primero.

## 4. Productos (Catálogo)
- **Listado**: Tabla con columnas: Imagen, Nombre, SKU principal, Tipo (Físico/Digital), Estado (badge), Stock total, Precio, Acciones.
- **Filtros**: Estado, Categoría, Tipo, Búsqueda por nombre/SKU.
- **Crear/Editar**: Formulario guiado (pasos: Básico → Variantes → Imágenes → Publicar).
  - Validación: Physical requiere ≥1 variante con SKU + atributos. Digital puede no tener variantes.
  - Precio base + override por variante.
  - Imagen principal (obligatoria para publicar).
  - Categoría (selector desde API).
- **Acciones en lote**: Publicar, Suspender, Descontinuar (solo own).
- **Estados**: Draft → Published → Suspended/Discontinued. Transiciones válidas por botones, no dropdown libre.

## 5. Inventario
- **Vista**: Tabla pivot Variante × Bodega (propias + Marketplace activas). Celdas: Available / Reserved / Used / Damaged.
- **AddStock**: Modal con selector variante (autocomplete), selector bodega (propias + Marketplace), cantidad (>0). Valida scope.
- **Ajuste por conteo**: Requiere motivo (enum), nuevo valor, auditoría automática.
- **Alertas visuales**: Stock 0 (rojo), Stock bajo (ámbar), Solo reservado (info).
- **Exportar**: CSV de posiciones actuales (permiso INC-09).

## 6. Pedidos (Líneas propias)
- **Listado**: Solo líneas donde `OrderItem.VendorId == Seller.VendorId`. Agrupado por CustomerOrder.
- **Estados visibles**: PendingPayment, Paid, Dispatched, Delivered, Cancelled (con cause).
- **Acciones según estado**:
  - Paid → Ver cumplimientos asignados.
  - Dispatched → Ver tracking.
  - Cancelled (StockBreak) → Notificación + devolución parcial automática.
- **Detalle**: Timeline confirmado por backend, datos de comprador (nombre, dirección), items, totales.

## 7. Cumplimientos (Logística propia)
- **Cola**: Filtros por estado (PendingPacking, Packed, Dispatched), bodega, fechas.
- **Pack**: Validar items → botón "Empacar" → `Packed` + timestamp.
- **Dispatch**: Requiere Carrier (selector desde API) + TrackingNumber → `Dispatched`.
- **Deliver**: Confirmar entrega → `Delivered` + timestamp.
- **Cancelar (StockBreak)**: Solo Logistics/Admin ejecutan; Seller notificado.

## 8. Devoluciones
- **Listado**: Solicitudes donde `ReturnRequest.VendorId == Seller.VendorId`.
- **Inspección**: Logistics registra resultado (Good/Damaged/Missing) + fotos.
- **Aprobar/Rechazar**: Botones tras inspección OK. Aprobar → reingreso stock `Used` + trigger reembolso.
- **Timeline**: Requested → Inspected → Approved/Rejected → Refunded.

## 9. Accesibilidad y responsive
- Tablas → cards en móvil. Sidebar → drawer. Toolbar → bottom sheet.
- Focus visible, keyboard navigation, ARIA labels en tablas complejas.
- Color + texto en badges de estado (StatusBadge).

## 10. Criterios de aceptación
- Seller solo ve/gestiona sus recursos (scope validado en UI + backend).
- No acciones no autorizadas (no moderar productos ajenos, no ver pedidos ajenos).
- Flujos cubren 13 estados UI obligatorios.
- Imágenes: alt, fallback, dominios permitidos.
- Contratos API verificados (OpenAPI types).