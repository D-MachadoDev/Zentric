# Zentric — SDD de experiencia Supervisor

## 1. Objetivo
Consola de fiscalización y auditoría de solo lectura (principalmente): métricas agregadas, auditoría 360° de pedido, libro mayor tributario, reportes de cumplimiento logístico, exportación controlada.

## 2. Navegación principal
- Dashboard ejecutivo (KPIs globales)
- Auditoría 360° de pedido
- Libro mayor tributario y comisiones split
- Métricas de inventario y stock fantasma
- Cumplimiento logístico (SLA, quiebres, devoluciones)
- Fiscalización y compliance
- Reportes y exportación
- Configuración de alertas/umbrales

## 3. Dashboard ejecutivo
- **Ventas**: GMV, Órdenes, Ticket promedio, Conversión (últimos 7/30/90d, comparativo YoY).
- **Pedidos**: Por estado (funnel), Tiempo medio pago→preparación, Cancelaciones por causa.
- **Inventario**: Stock total, Valorizado, Rotación, Stock fantasma (alertas), Bodegas inactivas.
- **Logística**: SLA preparación/despacho/entrega, Quiebres de stock, Devoluciones rate.
- **Financiero**: Facturación emitida, Split pagado/pendiente, Comisiones por vendedor.
- **Filtros globales**: Rango fechas, Zona horaria (UTC/LOCAL), Moneda base.

## 4. Auditoría 360° de pedido
- **Búsqueda**: Por ID pedido, ID comprador, ID vendedor, Rango fechas, Estado.
- **Vista detalle**: Timeline completo e inmutable (CustomerOrder + todos los FulfillmentOrders + Shipments + Invoices + Returns + Refunds + AuditLogs).
- **Trazabilidad**: Cada transición con actor (userId, rol), timestamp, correlación, motivo si aplica.
- **Validación de integridad**: Checks automáticos (reserva liberada en cancelación, stock reingresado en devolución, split coherente).
- **Exportar**: PDF/JSON de auditoría completa (permiso INC-09).

## 5. Libro mayor tributario y comisiones split
- **Facturas**: Master (cliente), ZentricDetail (plataforma), Vendor (split) — todas vinculadas a CustomerOrder.
- **Comisiones**: % configurado por vendedor/categoría, base imponible, IVA, retenciones.
- **Conciliación**: Cruce automático PaymentReceipt ↔ Invoice ↔ RefundCredit.
- **Estados**: Draft → Issued → Voided. Solo Issued contabilizan.
- **Filtros**: Periodo fiscal, Vendedor, Tipo factura, Estado.
- **Exportar**: CSV/Excel para contabilidad (permiso INC-09).

## 6. Métricas de inventario y stock fantasma
- **Posiciones**: Total, Por bodega, Por vendedor, Por categoría.
- **Alertas**: Stock 0 (con ventas recientes), Solo reservado > 24h, Dañado sin ajuste > 7d, Bodegas inactivas con stock.
- **Stock fantasma**: Diferencia entre `AvailableQuantity` físico y `Available` calculado (reservas + dañados). Reporte automático diario.
- **Ajustes pendientes**: Listado de ajustes sin auditoría completa.

## 7. Cumplimiento logístico
- **SLA**: Preparación (mediana p50/p95), Despacho, Entrega. Por transportadora, bodega, región.
- **Quiebres de stock**: Frecuencia, Impacto (líneas/pedidos afectados), Tiempo resolución.
- **Devoluciones**: Rate, Tiempo inspección, Aprobación rate, Reingreso stock rate.
- **Transportadoras**: Ranking por SLA, Incidentes, Cobertura.

## 8. Fiscalización y compliance
- **Usuarios**: Último login, Roles, Estado, Intentos fallidos.
- **Vendedores**: Estado, Documentación KYC, Cumplimiento políticas.
- **Transacciones sospechosas**: Patrones (múltiples pedidos misma IP, pagos fallidos repetidos, devoluciones anómalas).
- **Logs de auditoría**: Búsqueda por actor, recurso, acción, rango fechas.

## 9. Reportes y exportación
- **Plantillas predefinidas**: Ventas mensuales, Inventario valorizado, Comisiones vendedores, SLA logística, Libro mayor.
- **Builder ad-hoc**: Seleccionar entidad, campos, filtros, agrupación, formato (CSV, Excel, PDF).
- **Programación**: Reportes recurrentes (diario/semanal/mensual) → email/bucket (permiso INC-09).
- **Permisos**: Solo Supervisor + Admin. Logs de exportación (actor, reporte, timestamp, filas).

## 10. Accesibilidad y responsive
- Tablas densas → scroll horizontal en móvil, tarjetas resumen en breakpoint `lg`.
- Gráficos accesibles (patrones + color, tooltips keyboard, data tables alternativas).
- Export buttons con `aria-label` descriptivo.

## 11. Criterios de aceptación
- Solo lectura (excepto configuración alertas/umbrales y exportación).
- Scope global verificado (no filtrado por vendorId).
- Datos consistentes con backend (no cálculos client-side como autoridad).
- 13 estados UI cubiertos.
- Contratos API verificados.
- Permisos de exportación auditados.