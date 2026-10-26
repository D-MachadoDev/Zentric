# Alcance y decisiones de negocio consolidadas

**Estado:** base de trabajo consolidada; los puntos expresamente abiertos requieren resolución antes de codificar el flujo afectado.

## 1. Producto y usuarios
Zentric es un marketplace con cinco roles: `Buyer`, `Seller`, `Logistics Operator`, `Administrator` y `Supervisor`. Cada usuario tiene un único rol principal. `Buyer` y `Seller` son entidades de negocio distintas de `User`, relacionadas con este, no subclases de `User`. El backend valida tanto el rol como la propiedad y el alcance del recurso en cada operación.

## 2. V1 de catálogo
- Se vende cada combinación comercial como un **Product independiente**. No existen variantes comerciales en V1; las variantes son atributos de inventario (SKU) gestionados dentro del agregado `Product` (ADR-0002, ADR-0003).
- El modelo `Product` es común, con tipo físico o digital y políticas/atributos específicos del tipo.
- Estados objetivo: `Draft → Published → Suspended` o `Discontinued`, con transiciones validadas. Confirmar que `Draft` esté en el dominio vigente y armonizar el documento de dominio antes de implementar.
- Para publicar se requiere SKU (al menos una variante para Physical) e imágenes válidas; no se exige variante para Digital.
- Las imágenes se relacionan con `Product`, no con variantes (Addendum 2026-10-17: `ImageUrl` opcional en Product).
- Búsqueda: texto, categoría, rango de precio, disponibilidad, ordenamiento y paginación; también atributos de producto y vendedor cuando el contrato de búsqueda los soporte.
- No incluir promociones en V1. No introducir agrupaciones visuales de productos sin aprobación explícita.

## 3. Seller y bodegas
- El `Administrator` crea al vendedor y su primera bodega.
- Seller + primera bodega se crean dentro de **una única transacción PostgreSQL**: ambos existen o ninguno existe (ADR-0025, Addendum 2026-10-17).
- Seller puede gestionar varias bodegas propias dentro de su alcance autorizado (`WarehouseType.Vendor`).
- Perfil de tienda: nombre, descripción, logo, datos de contacto y estado (Active/Inactive).
- Bodegas centrales (`WarehouseType.Marketplace`) son visibles para todos los vendedores autenticados para `AddStock` (Addendum 2026-10-17).

## 4. Inventario
## 5. Carrito, checkout, pedidos y pagos
- El carrito de usuarios autenticados persiste en backend (unificado como `CustomerOrder` en estado `Cart`).
- Checkout vuelve a validar precio, estado del producto, cantidad, stock y dirección; reserva inventario y crea el pedido con consistencia transaccional donde sea posible.
- El pago V1 se simula detrás de un puerto desacoplado (`IPaymentGatewayService`).
- Respuesta síncrona es el camino normal. Si el proveedor devuelve rechazo confirmado, el pago queda fallido, el pedido se cancela (`Cancelled` + `PaymentFailed`) y la reserva se libera.
- Un timeout o pérdida de respuesta no equivale a rechazo confirmado. Antes de integrar pagos reales se debe diseñar estado `PENDING_RECONCILIATION` o equivalente, consulta de estado e idempotencia para evitar cobros exitosos con pedidos cancelados (INC-03).
- Operaciones repetibles deben usar idempotencia cuando sea relevante.
- El contenido de un pedido pagado es inmutable; cambios mediante cancelación, devolución o ajuste explícito.
- Estados del pedido incluyen `Cart`, `PendingPayment`, `Paid`, `Dispatched`, `Delivered`, `Cancelled` con causes: `Expired`, `PaymentFailed`, `StockBreak`, `BuyerRequested`, `FullyResolved` (ADR-0022). Addendum 2026-10-03 añade estado `Anulado` (expira reserva sin concretar pago).
- Transiciones y nombres canónicos se fijan en el modelo de dominio y contrato.

## 6. Logística y devoluciones
- El Logistics Operator trabaja sobre tareas/pedidos asignados y registra preparación/despacho solo con transiciones autorizadas (`Pack → Packed → Dispatch → Dispatched → Deliver → Delivered`).
- La evidencia mínima de entrega es estado y timestamp.
- Elegibilidad para devolución: automática dentro de 30 días desde la entrega, solo productos físicos (prohibido digital), sin restricciones adicionales aprobadas en la decisión actual.
- El proceso físico de devolución, condición del artículo, momento de reingreso a stock, método/ejecución del reembolso y manejo de fallos siguen abiertos (INC-04). No inventar requisitos ni afirmar reembolso completado sin confirmación.
- Cancelación por quiebre de stock fantasma: cancela **solo el despacho afectado** (porción de un vendedor), no el pedido completo. Desencadena devolución parcial de líneas afectadas; resto del pedido y sus demás despachos continúan (ADR-0008, ADR-0022).

## 7. Facturación y split de pagos
- Tres documentos por transacción: Factura Maestra (cliente), Detalle Zentric (control plataforma), Factura Vendedor (split) (ADR-0023).
- Split de pagos = documentos, no transferencias.
- Estados: `Draft`, `Issued`, `Voided`.

## 8. Medios (imágenes)
- Recursos de imagen: productos, perfiles, logos de tienda, categorías y otros recursos administrativos autorizados.
- Frontend solicita autorización de carga y carga directamente al almacenamiento con URL temporal firmada.
- Backend valida MIME/tamaño, detecta contenido malicioso, genera miniaturas cuando se defina la política y registra metadatos.
- Activos públicos usan URL estable; activos privados usan URL firmada.
- Formatos, tamaño máximo, cantidad de imágenes, TTL de URL, proveedor, política de borrado/retención y limpieza de huérfanos: `ABIERTO` (INC-07).

## 9. Identidad y autorización
- Flujos: registro, login, logout, perfil, cambio de contraseña y recuperación.
## 10. Administración y supervisión
- Administrator gestiona usuarios, vendedores, productos, categorías, bodegas, configuración comercial y políticas operativas aprobadas.
- Supervisor es principalmente de solo lectura y consulta métricas agregadas de ventas, pedidos, inventario y logística; auditoría 360°.
- Reportes: ventas, pedidos, inventario y cumplimiento logístico. Fórmulas, zonas horarias, estados incluidos, granularidad, frescura y permisos de exportación son `ABIERTO` (INC-09).

## 11. Reglas de implementación
- C# / .NET 10 en backend; PostgreSQL; almacenamiento de imágenes desacoplado.
- Frontend Next.js App Router, React y TypeScript.
- REST/JSON; OpenAPI es fuente de verdad del contrato API.
- Transacciones locales para invariantes dentro de PostgreSQL; procesos explícitos, idempotentes y recuperables para integraciones distribuidas.
- Errores con código estable, mensaje, detalles de validación y correlation ID.
- Cursor pagination donde aporte; paginación por página donde corresponda. Debe especificarse endpoint por endpoint (INC-10).

## 12. Registro de incertidumbres bloqueantes

| ID | Incertidumbre | Impacto | Agente dueño | Pregunta concreta | Opciones | Recomendación |
|----|---------------|---------|--------------|-------------------|----------|---------------|
| INC-01 | Matriz exacta de permisos por acción y scope | Autorización en todos los endpoints | Backend | ¿Qué acciones exactas puede hacer cada rol sobre cada recurso y scope? | Definir matriz completa vs. iterar por caso de uso | Definir matriz completa antes de Ola 2 |
| INC-02 | Política de cancelación de pedido tras pago y antes de despacho | Flujo `Paid → Cancelled` | Backend/Product | ¿Puede buyer cancelar tras pago? ¿Bajo qué condiciones? | Permitir siempre / Solo si no hay `Packed` / Nunca | Solo si ningún `FulfillmentOrder` está `Packed` |
| INC-03 | Resolución de pago `UNKNOWN`/timeout antes de proveedor real | Checkout, idempotencia | Backend | ¿Estado intermedio `PENDING_RECONCILIATION`? ¿Consulta de estado? | Estado explícito + polling / Webhook-only / Saga | Estado explícito `PENDING_RECONCILIATION` + idempotency key |
| INC-04 | Flujo físico de devoluciones, reingreso stock y reembolso | Returns end-to-end | Backend/Logistics | ¿Momento exacto de reingreso? ¿Método reembolso? ¿Fallos? | Reingreso tras inspección+aprobación / Reembolso automático / Manual | Reingreso tras inspección+aprobación; reembolso tras confirmación recepción |
| INC-05 | Selección de bodega en checkout, envío dividido, cálculo envío/impuestos | Checkout multi-bodega | Backend/Frontend | ¿Quién elige bodega? ¿Split automático? ¿Cálculo envío? | Automático por proximidad / Buyer elige / Seller define | Automático por proximidad + stock disponible |
| INC-06 | Política de ajustes de stock y roles autorizados | Inventory adjustments | Backend | ¿Quién puede ajustar? ¿Motivos obligatorios? ¿Auditoría? | Solo Admin / Seller+Admin / Con motivo obligatorio | Seller (propias) + Admin (todas); motivo obligatorio; auditoría completa |
| INC-07 | Límites/formatos/TTL/retención para medios (imágenes) | Media upload | Backend/Frontend | ¿Formatos? ¿Tamaño max? ¿TTL URL firmada? ¿Limpieza huérfanos? | WebP/AVIF, 10MB, 1h TTL, job nocturno | Definir en ADR dedicado |
| INC-08 | Duraciones y almacenamiento de tokens y recuperación contraseña | Auth | Backend | Access token TTL? Refresh TTL? Rotación? Storage? | 15min/7d rotativo / 30min/14d / HttpOnly cookie | 15min access + 7d refresh rotativo; HttpOnly secure cookie |
| INC-09 | Definiciones de métricas y exportación de reportes | Supervisor/Admin | Backend | Fórmulas, zonas horarias, estados, granularidad, frescura, permisos export | Definir por reporte / Adoptar estándar | Definir por reporte en ADR dedicado |
| INC-10 | Campos indexables/buscables y estrategia de paginación por endpoint | Search/API | Backend | ¿Qué campos? ¿Cursor vs offset? ¿Límites? | Cursor para listas grandes, offset para admin | Cursor pagination default; offset solo admin |
| INC-11 | Confirmación de estado `Draft` y vocabulario canónico de estados | Product/Order | Backend | ¿`Draft` existe en dominio vigente? ¿Nombres canónicos? | Sí, armonizar / No, solo Published/Suspended/Discontinued | Armonizar: agregar `Draft` al dominio y migración |

Cada incertidumbre debe tener ID, descripción, impacto, agente dueño, pregunta concreta, opciones y recomendación razonada. Un agente no puede resolverla silenciosamente.
- Access token de vida corta y refresh token rotativo.
- Respuesta de sesión incluye perfil básico, rol, estado y entidad de negocio asociada cuando corresponda.
- Duraciones exactas, almacenamiento del token, expiración de recuperación y verificación de correo/teléfono son `ABIERTO` (INC-08).
- Nunca confiar en rol enviado por frontend; verificar rol, estado, propiedad y scope en backend.
- Existencias por `ProductVariant + Warehouse` (clave compuesta `VariantId+WarehouseId`), no por variante sola (ADR-0002).
- Movimientos: entrada, reserva, salida por venta, ajuste, devolución, traslado entre bodegas y liberación de reserva.
- No se permite inventario negativo ni reservar existencias inexistentes/no vendibles/dañadas (ADR-0025).
- El disponible se calcula según existencias físicas menos reservas y stock no vendible, con una definición única en dominio y persistencia.
- Ajustes requieren usuario autorizado, motivo y auditoría. La matriz exacta de roles/acciones/alcance sigue abierta (INC-06).
- Cambios concurrentes deben ser atómicos y protegidos por transacción/locking o mecanismo equivalente verificado.
