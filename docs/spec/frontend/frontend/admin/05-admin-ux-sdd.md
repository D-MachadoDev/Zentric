# Zentric — SDD de experiencia Administrator

## 1. Objetivo
Consola de gobierno de la plataforma: usuarios, vendedores, bodegas centrales, catálogo (moderación), categorías, configuración comercial, políticas operativas, reportes.

## 2. Navegación principal
- Usuarios (CRUD + roles + estado)
- Vendedores (onboarding + perfil + bodegas)
- Bodegas (Marketplace + Vendor oversight)
- Productos (moderación global)
- Categorías (jerarquía + atributos)
- Configuración (comercial, logística, pagos, medios)
- Transportadoras
- Reportes globales
- Auditoría / Logs

## 3. Usuarios
- **Listado**: Email, Nombre, Rol (badge), Estado (Active/Inactive/Suspended), Último login, Acciones.
- **Crear**: Formulario con rol selector (Buyer, Seller, Logistics, Admin, Supervisor). Si Seller → redirige a onboarding vendedor.
- **Editar**: Datos personales, Rol (cambio requiere confirmación), Estado, MFA reset.
- **Eliminar**: Soft delete (anonymize PII, mantiene integridad referencial).
- **Impersonación**: "Entrar como" para debugging (auditado, solo Admin).

## 4. Vendedores (Seller Management)
- **Onboarding**: Wizard "Registrar vendedor" → crea User (rol Seller) + Seller profile + 1ª Warehouse (Vendor) **en una única transacción** (ADR-0025).
- **Listado**: Nombre tienda, Contacto, Estado (Active/Inactive), Bodegas count, Productos count, Última venta.
- **Detalle/Editar**: Perfil tienda (nombre, desc, logo, contacto), Estado, Bodegas vinculadas.
- **Bodegas del vendedor**: Sub-tabla con CRUD (crear Vendor, editar, activar/inactivar). No puede crear Marketplace.
- **Activar/Inactivar vendedor**: Toggle → afecta visibilidad catálogo y capacidad de operar.

## 5. Bodegas (Warehouse Administration)
- **Marketplace (Centrales)**: CRUD completo (Admin only). Tipo fijo `Marketplace`, `VendorId = null`. Visibles para AddStock de todos los sellers.
- **Vendor (Propias)**: Read-only oversight. Creadas por Seller/Admin en onboarding o posterior. Vinculadas forzosa a `VendorId`.
- **Estados**: `IsActive` toggle (Activa/Inactiva). No borrado físico.
- **Capacidad/Alertas**: Umbrales de ocupación (opcional, INC-06).

## 6. Productos (Moderación global)
- **Listado global**: Todos los estados (Draft, Published, Suspended, Discontinued). Filtros: Vendedor, Categoría, Estado, Tipo.
- **Acciones Admin**: Publicar, Suspender, Descontinuar, Restaurar, Eliminar (soft), Editar cualquier campo.
- **Validación cruzada**: Physical sin variantes → no publicable. SKU duplicados → alerta.
- **Imágenes**: Moderación visual (aprobar/rechazar) si política lo requiere.

## 7. Categorías y Atributos
- **Jerarquía**: Árbol (padre/hijo) con drag-drop para reordenar.
- **Atributos por categoría**: Definir campos (nombre, tipo: text/select/number/boolean, requerido, filtrable, visible en detalle).
- **Herencia**: Hijo hereda atributos del padre + propios.
- **Uso**: Frontend renderiza filtros y ficha técnica según definición.

## 8. Configuración comercial
- **Comisiones**: % base por categoría, overrides por vendedor, escalones por volumen.
- **Impuestos**: IVA % por país/región, retenciones aplicables.
- **Envío**: Zonas, tarifas base, transportadoras por defecto, umbrales envío gratis.
- **Pagos**: Métodos habilitados, timeouts, umbrales revisión manual.
- **Devoluciones**: Días elegibilidad (default 30), categorías no retornables, flujo inspección obligatoria.
- **Stock**: Umbral "bajo stock", reserva checkout (15 min), umbral stock fantasma.

## 9. Transportadoras
- **CRUD**: Nombre, Código, API endpoint (para tracking), Contacto, Activa, SLA configurado.
- **Cobertura**: Zonas/regiones atendidas, restricciones (peso, dimensiones, valor declarado).
- **Integración**: Webhook tracking (futuro), label generation (futuro).

## 10. Reportes globales
- Acceso a todos los reportes de Supervisor + usuarios, vendedores, bodegas, configuración.
- Exportación sin restricciones de scope (auditado).

## 11. Auditoría y Logs
- **AuditLog viewer**: Búsqueda por actor, recurso, acción, rango fechas, resultado.
- **Correlación**: Correlation ID → traza completa request + DB + eventos + integraciones.
- **Alertas**: Configurar umbrales (error rate, latency, stock conflicts, pagos fallidos) → notificación email/Slack.

## 12. Accesibilidad y responsive
- Tablas complejas → responsive cards en móvil.
- Formularios largos → stepper/accordion.
- Permisos destructivos (delete, status change) → confirmation dialog con foco gestionado.

## 13. Criterios de aceptación
- Admin ve/gestiona todo (scope global verificado).
- Onboarding vendedor + bodega = transacción atómica (ADR-0025).
- No acciones imposibles (crear Marketplace desde Seller UI, etc.).
- 13 estados UI cubiertos.
- Contratos API verificados.
- Cambios de configuración auditados.