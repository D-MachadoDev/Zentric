# 06. Reglas de Negocio por Subsistema (Business Rules Catalog)

> **Catálogo Exhaustivo de Políticas de Negocio por Contexto.** Mientras que [04-invariants-and-rules.md](04-invariants-and-rules.md) formaliza las 18 invariantes transaccionales duras del Dominio, este documento consolida y especifica las políticas de negocio detalladas, organizadas por *Bounded Context* (subsistema). Todo caso de uso en la capa de Aplicación y toda entidad en el Dominio deben gobernar su ejecución bajo estas directrices.

---

## 1. Subsistema de Inventarios y Bodegas (`Inventories` & `Warehouses`)

### 1.1. Regla de No-Negatividad Absoluta y Reserva Condicional Atómica
* **Contexto de Negocio:** Prevención absoluta de sobreventa multicanal.
* **Política Normativa:** La cantidad disponible de existencias (`AvailableQuantity`) nunca puede ser negativa (`< 0`). Para blindar esta regla frente a concurrencia alta, la reserva se ejecuta mediante una actualización condicional atómica a nivel de fila (`WHERE AvailableQuantity >= cantidad`). Si la condición no se satisface, la base de datos afecta cero filas, rechazando la reserva sin recurrir a bloqueos pesados de tabla ([ADR-0025](../Adr/0025-stock-negativo-update-condicional-atomico.md)).
* **Compensación:** Si una reserva combinada fracasa a mitad de camino, se ejecuta la liberación atómica inversa (`ReleaseReservedStockAsync`), garantizando que no queden reservas parciales huérfanas.

---

### 1.2. Regla de Asignación de Bodegas por Mayor Capacidad Disponible
* **Contexto de Negocio:** Optimización logística de despacho.
* **Política Normativa:** Al evaluar bodegas candidatas para surtir un pedido, el sistema ordena las existencias disponibles de **mayor a menor cantidad** (`AvailableQuantity`). No se establece distinción ni prioridad entre bodegas del marketplace y bodegas de vendedores.
* **Justificación:** El agregado `Inventory` no transporta tipo de bodega porque el dueño legal del stock es el vendedor propietario del producto, no la entidad que administra las cuatro paredes del almacén.

---

### 1.3. Regla de Bodega Única y Fraccionamiento de Contingencia
* **Contexto de Negocio:** Eficiencia de costos de transporte y empaque.
* **Política Normativa:**
  1. **Regla Base (Bodega Única):** La cantidad requerida de una variante específica en una línea de pedido debe surtirse desde **una sola bodega** siempre que exista al menos una bodega individual que cubra el total. Está prohibido fragmentar envíos de un mismo SKU por conveniencia.
  2. **Excepción de Contingencia (Fraccionamiento):** Solo si **ninguna** bodega individual cubre la cantidad solicitada, el sistema fracciona la reserva entre múltiples bodegas, consumiendo de mayor a menor stock disponible ([ADR-0001](../Adr/0001-reserva-fragmentacion-contingencia.md)).
  3. **Impacto Logístico:** El fraccionamiento genera múltiples guías de despacho (`Shipment`) dentro de la orden logística del vendedor.
  4. **Fallo Integral:** Si la suma combinada de todas las bodegas no alcanza la cantidad total solicitada, la operación falla por completo y se compensan las reservas calculadas.

---

### 1.4. Regla de Clave Natural de Existencias por Variante (SKU)
* **Contexto de Negocio:** Granularidad de control físico en almacén.
* **Política Normativa:** El inventario se controla exclusivamente por la combinación inmutable de **Variante (`VariantId`) y Bodega (`WarehouseId`)**, nunca a nivel de producto padre ([ADR-0002](../Adr/0002-clave-inventario-variantid.md)). Cada variante física (SKU) posee su propio registro independiente de existencias disponibles, reservadas y usadas.

---

### 1.5. Regla de Ajuste de Existencias por Evidencia Física
* **Contexto de Negocio:** Reconciliación entre inventario digital e inventario físico en bodega.
* **Política Normativa:**
  1. **Ajustes al Alza:** Se tratan como ingresos ordinarios de mercancía declarados por el vendedor.
  2. **Ajustes a la Baja:** Requieren obligatoriamente **evidencia comprobable**: conteo físico presencial realizado por un Operador Logístico, reporte de stock fantasma durante el empaque o recepción de devoluciones ([ADR-0021](../Adr/0021-ajuste-de-stock-sin-cuello-de-botella.md)).
  3. **Registro Inmutable:** Todo ajuste registra actor responsable, motivo escrito y fecha. El sistema aplica el cambio en caliente y el Administrador audita a posteriori, eliminando aprobaciones manuales previas que entorpecen la operación logística.

---

### 1.6. Regla de Aislamiento de Vendedores Inactivos o Bloqueados
* **Contexto de Negocio:** Seguridad comercial y sanción a vendedores infractores.
* **Política Normativa:** El bloqueo de un vendedor revoca sus permisos de autenticación y operación. Sin embargo, no modifica en cascada el catálogo: los productos permanecen en su estado publicado, pero la política de checkout rechaza cualquier carrito que intente comprar artículos de un vendedor inactivo. Las órdenes pagadas y despachos en tránsito continúan hasta su entrega.

---

### 1.7. Regla de Tasa de Incidencias de Stock Fantasma y Umbral Crítico
* **Contexto de Negocio:** Protección de la reputación de la plataforma ante vendedores informales.
* **Política Normativa:** Cada anulación de despacho provocada por falta física de producto en bodega incrementa la tasa de incidencias del vendedor (`StockFantasmaRate`). Si esta tasa alcanza o supera el **umbral crítico del 30%**, el checkout inhabilita automáticamente la compra de cualquier producto de dicho vendedor hasta que sea auditado por el Administrador.

---

## 2. Subsistema de Pedidos y Ventas (`Orders` & `Payments`)

### 2.1. Regla de Reserva Preventiva y Expiración por Inactividad (15 Minutos)
* **Contexto de Negocio:** Prevención de retención maliciosa o accidental de stock.
* **Política Normativa:** Durante el estado de carrito (`Cart`), no se retiene inventario. La reserva preventiva se dispara en el momento del checkout, moviendo el pedido a `PendingPayment`. Si transcurren **15 minutos** sin confirmación de pago, un proceso en segundo plano libera el stock reservado devolviéndolo a existencias disponibles y transiciona el pedido a cancelado por tiempo límite (`CancelDueToTimeout`).

---

### 2.2. Regla de Consolidación Comercial Unificada
* **Contexto de Negocio:** Experiencia de compra unificada para el comprador.
* **Política Normativa:** Sin importar que un carrito incluya productos de múltiples vendedores o despachos desde bodegas distintas, el comprador siempre interactúa con **una única orden comercial consolidada** (`CustomerOrder`) y realiza un único pago centralizado ante la plataforma.

---

### 2.3. Regla de Snapshot de Precio Unitario Congelado
* **Contexto de Negocio:** Certeza jurídica y transparencia tarifaria.
* **Política Normativa:** El precio unitario de cada línea de pedido es fijado directamente por el servidor a partir del catálogo vigente (`Product.Price`) en el instante exacto en que el ítem se añade al carrito ([ADR-0020](../Adr/0020-precio-congelado-y-credito-parcial-por-linea.md)).
  * El contrato de agregar ítem no recibe precio ni vendedor desde el cliente web.
  * El precio unitario queda congelado en la línea y no sufre alteraciones por fluctuaciones posteriores del catálogo ni durante la ventana de pago de 15 minutos.
  * El total de línea se calcula estrictamente como `Precio Congelado × Cantidad`.

---

### 2.4. Regla de Sincronización del Mínimo Común de Despachos
* **Contexto de Negocio:** Coherencia de estado de la orden maestra.
* **Política Normativa:** El estado del pedido maestro (`CustomerOrder`) refleja el **mínimo común de avance de sus órdenes de despacho individuales (`FulfillmentOrder`)**:
  * Pasa a `Dispatched` únicamente cuando **todos** sus despachos no cancelados han salido físicamente de bodega (`Dispatched`).
  * Pasa a `Delivered` únicamente cuando **todos** sus despachos no cancelados han sido entregados (`Delivered`).
  * **Tratamiento de Despachos Cancelados:** Los despachos cancelados por quiebre de stock no bloquean el avance de la orden maestra. Sin embargo, si la totalidad de los despachos resulta cancelada, el pedido no puede marcarse como entregado y transiciona a cancelado con reembolso total ([ADR-0022](../Adr/0022-pedido-resuelto-pasa-a-cancelled.md)).

---

### 2.5. Regla de Inmodificabilidad del Pedido Pagado
* **Contexto de Negocio:** Estabilidad jurídica y contractual de transacciones cerradas.
* **Política Normativa:** Una vez que un pedido alcanza el estado pagado (`Paid`), queda formalmente sellado. Ni el comprador ni el vendedor pueden anularlo ni alterar sus líneas. El comprador que desee desistir debe tramitar una devolución formal tras la entrega, y el vendedor que no pueda cumplir debe cancelar unilateralmente su despacho individual por quiebre de stock.

---

## 3. Subsistema de Catálogo y Productos (`Products`)

### 3.1. Regla de Autopublicación Directa y Ciclo de Suspensión
* **Contexto de Negocio:** Autonomía operativa del vendedor.
* **Política Normativa:** Los productos creados en la plataforma nacen directamente en estado publicado (`Published`), sin someterse a revisiones burocráticas previas. El vendedor puede suspender temporalmente la venta de un artículo (`Suspended`) y reactivarlo en cualquier momento (`Published`).

---

### 3.2. Regla de Entrega Instantánea y Blindaje de Productos Digitales
* **Contexto de Negocio:** Tratamiento diferenciado de bienes intangibles.
* **Política Normativa:**
  * Los productos de naturaleza digital (`Digital`) no ocupan inventario físico ni generan órdenes de despacho logístico.
  * Al confirmarse el pago de la orden, el sistema genera de forma automática un registro de entrega digital (`DigitalDeliveryRecord`) y sella la línea como entregada (`DeliveredAt`).
  * **Venta Final:** Queda terminantemente prohibida la solicitud de devolución o reembolso sobre cualquier producto digital una vez entregado.

---

### 3.3. Regla de Variante Obligatoria en Productos Físicos
* **Contexto de Negocio:** Integridad del modelo de inventarios.
* **Política Normativa:** Todo producto físico (`Physical`) exige registrar al menos una variante (SKU), dado que la variante es la unidad indivisible de existencia y almacenamiento ([ADR-0003](../Adr/0003-variante-obligatoria-productos-fisicos.md)). Los productos digitales pueden prescindir de variantes.

---

## 4. Subsistema de Logística y Excepciones (`Logistics`)

### 4.1. Regla de Cancelación de Despacho por Quiebre de Stock Fantasma
* **Contexto de Negocio:** Contingencia operativa en bodega.
* **Política Normativa:** Si durante el empaque de un paquete el Operador Logístico o el Vendedor constata daño físico irreparable o ausencia física del producto, puede cancelar unilateralmente su orden de despacho (`FulfillmentOrder`) bajo causal de stock fantasma. La anulación ajusta las existencias digitales a cero para evitar nuevos pedidos erróneos.

---

### 4.2. Regla de Reembolso Parcial por Línea Afectada
* **Contexto de Negocio:** Equidad comercial para el comprador.
* **Política Normativa:** Cuando un despacho individual es cancelado por stock fantasma, el resto de la orden continúa su curso normal. El comprador conserva los productos que sí le fueron despachados y recibe un reembolso **calculado exclusivamente sobre el precio congelado de la línea afectada multiplicado por las unidades no entregadas**. En ningún caso se calcula sobre el precio actual del catálogo ni sobre el total global de la orden.

---

### 4.3. Regla de Retracto Temprano del Vendedor
* **Contexto de Negocio:** Cancelación previa a la salida física.
* **Política Normativa:** Un vendedor puede cancelar su despacho individual por imposibilidad de cumplimiento siempre que el pedido se encuentre pagado pero el paquete no haya sido entregado a la transportadora. Esta acción dispara el reembolso proporcional al comprador y no altera los despachos de otros vendedores.

---

## 5. Subsistema de Posventa y Devoluciones (`Returns`)

### 5.1. Regla de Doble Conformidad Física y Comercial
* **Contexto de Negocio:** Mitigación de fraude en devoluciones.
* **Política Normativa:** El procesamiento de una devolución física requiere dos aprobaciones explícitas:
  1. **Inspección Física:** El Operador Logístico valida en bodega que el producto devuelto se encuentra en condiciones aceptables (`IsPhysicallyInspected = true`).
  2. **Aprobación Comercial:** El Vendedor autoriza la procedencia de la devolución (`IsApprovedByVendor = true`).

---

### 5.2. Regla de Exención de Inspección en Bodega Propia del Vendedor
* **Contexto de Negocio:** Optimización operativa en devoluciones directas.
* **Política Normativa:** Si la devolución física es recibida en una bodega operada directamente por el propio vendedor, el servidor deduce automáticamente la exención de inspección logística (`isSameWarehouseAndVendor`), unificando la conformidad en la sola aprobación comercial del vendedor ([ADR-0018](../Adr/0018-devoluciones-aprobacion-dual-logistica-vendedor.md)).

---

### 5.3. Regla de Reingreso Exclusivo como Mercancía Usada
* **Contexto de Negocio:** Protección al consumidor y honestidad de catálogo.
* **Política Normativa:** Al completarse la aprobación de una devolución física, las unidades recibidas reingresan al inventario de la bodega asignada sumándose estrictamente al contador de existencias usadas (`UsedQuantity`). Queda prohibido devolver mercancía retornada al contador de producto nuevo.

---

### 5.4. Regla de Resolución Objetiva por Política de Reembolsos
* **Contexto de Negocio:** Automatización y auditoría financiera.
* **Política Normativa:**
  * Las devoluciones imputables a fallas del vendedor (quiebres de stock fantasma) se resuelven de manera **automática** mediante `RefundPolicyService`, emitiendo saldo a favor inmediato al comprador.
  * Los casos excepcionales o devoluciones discrecionales se escalan a revisión obligatoria del Administrador.
  * Toda acreditación de saldo registra una pista de auditoría inmutable (`RefundAudit`) que documenta motivo, importe, fecha y actor responsable.

---

## 6. Subsistema de Facturación y Liquidación (`Billing`)

### 6.1. Regla de Emisión de Split de Facturas por Vendedor ($N + 2$)
* **Contexto de Negocio:** Desagregación contable y fiscal en marketplace multi-vendedor.
* **Política Normativa:** Por cada orden comercial pagada que involucra a **$N$ vendedores distintos**, el sistema emite exactamente **$N + 2$ documentos de facturación**:
  * **$N$ Facturas Detalle de Vendedor (`VendorDetail`):** Una por cada vendedor participante, conteniendo únicamente sus líneas vendidas y deduciendo la comisión pactada.
  * **1 Factura Maestra (`Master`):** Totaliza el cobro comercial integral emitido al comprador.
  * **1 Detalle Zentric (`ZentricDetail`):** Consolida la comisión de intermediación capturada por la plataforma.

---

### 6.2. Regla de Reparto Ratificado de Comisión de Plataforma (5% / 95%)
* **Contexto de Negocio:** Modelo de monetización de Zentric.
* **Política Normativa:** El reparto ratificado por la dirección del marketplace establece:
  * **5% para Zentric** como comisión de servicio de plataforma.
  * **95% para el Vendedor** como ingreso neto por la venta de sus productos.
  * La comisión se calcula y redondea a dos decimales sobre el subtotal vendido por cada vendedor individualmente, nunca promediando entre vendedores distintos.

---

### 6.3. Regla de Anulación de Factura Maestra por Caída de Pago
* **Contexto de Negocio:** Integridad fiscal.
* **Política Normativa:** Una Factura Maestra solo puede transicionar a estado anulado (`Anulled`) si el comprobante financiero de pago asociado es marcado formalmente como rechazado o expirado. Queda terminantemente prohibida la anulación de facturas por discrecionalidad o conveniencia sin respaldo del comprobante de pago.

---

### 6.4. Regla de Aislamiento de Visibilidad de Facturación
* **Contexto de Negocio:** Confidencialidad comercial entre competidores.
* **Política Normativa:** Cada vendedor tiene visibilidad exclusiva sobre sus propias Facturas Detalle. Ningún vendedor puede visualizar subtotales, comisiones ni líneas pertenecientes a otros vendedores del marketplace. La plataforma y el Administrador conservan la visibilidad integral de todos los documentos para fines de auditoría.
