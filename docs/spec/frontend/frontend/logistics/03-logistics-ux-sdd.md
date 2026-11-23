# Zentric — SDD de experiencia Logistics Operator

## 1. Objetivo
Consola operativa para operadores logísticos: cola de cumplimientos asignados, ejecución guiada (Pack → Dispatch → Deliver), inspección de devoluciones, gestión de transportadoras.

## 2. Navegación principal
- Cola de cumplimientos (filtros: estado, bodega, fechas, asignado a mí)
- Operaciones de cumplimiento (vista detalle + acciones)
- Inspección de devoluciones (cola asignada)
- Transportadoras (solo lectura/configuración básica)
- Mi perfil / Turnos

## 3. Cola de cumplimientos
- **Tabla**: ID, Pedido, Vendedor, Bodega, Items (resumen), Estado, Prioridad (SLA), Acciones.
- **Filtros**: Estado (PendingPacking, Packed, Dispatched), Bodega, Rango fechas, Solo míos.
- **Ordenamiento**: Por SLA (urgente primero), luego por fecha creación.
- **Acceso**: Solo fulfillment orders donde `AssignedTo == Logistics.Id` o `VendorId` en scope asignado.

## 4. Operaciones de cumplimiento (Detalle + Acciones)
- **Vista**: Header con ID, Pedido, Vendedor, Bodega, Estado actual, SLA restante.
- **Items**: Lista con SKU, Nombre, Cantidad, Ubicación en bodega (si existe).
- **Acciones por estado**:
  - **PendingPacking** → Botón "Empacar" (valida items disponibles) → `Packed` + `PackedAt`.
  - **Packed** → Formulario "Despachar": Carrier (select API) + TrackingNumber (requerido) → `Dispatched` + `DispatchedAt`.
  - **Dispatched** → Botón "Entregar" (confirmación) → `Delivered` + `DeliveredAt`.
  - **Cualquier estado ≠ Delivered** → "Cancelar por quiebre" (solo Logistics/Admin) → modal motivo → `Cancelled` + cause=StockBreak → trigger devolución parcial.
- **Evidencia**: Foto opcional de empaque/guía (upload flow signed URL).
- **Historial**: Timeline inmutable con actor, acción, timestamp.

## 5. Inspección de devoluciones
- **Cola**: `ReturnRequest` asignadas donde `AssignedTo == Logistics.Id` y `Status == Requested`.
- **Formulario inspección**: Estado físico (Good / Damaged / Missing), Fotos (múltiples, upload flow), Notas.
- **Submit** → `InspectionResult` guardado → `ReturnRequest` pasa a `Inspected` → notifica a Seller para aprobar/rechazar.

## 6. Transportadoras
- **Listado**: Nombre, Código, Activa, Contacto, SLA promedio (si métricas disponibles).
- **Crear/Editar**: Solo Admin. Logistics ve solo lectura.

## 7. Accesibilidad y responsive
- Móvil: Cola → cards apiladas con acciones prominentes (bottom sheet para formularios).
- Escáner código de barras (Web Barcode API) para validar items en Pack/Dispatch.
- Teclado completo: Enter para confirmar, Escape para cancelar modales.
- StatusBadge con dot + texto (no solo color).

## 8. Criterios de aceptación
- Logistics solo ve cumplimientos asignados (scope).
- No puede modificar pedidos, productos, inventario directamente.
- Acciones de estado siguen máquina de estados estricta (no saltos).
- Timeline inmutable visible en detalle.
- 13 estados UI cubiertos.
- Contratos API verificados.