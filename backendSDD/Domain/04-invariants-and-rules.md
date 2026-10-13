# 04. Reglas de Negocio Estrictas (Invariantes)

> **Especificación Normativa de Invariantes del Dominio.** Define las 18 reglas inviolables que la capa de Dominio (`Zentric.Domain`) está obligada a proteger y hacer cumplir en todo momento mediante validaciones defensivas en constructores, entidades y servicios de dominio.

---

## 1. Integridad de Existencias e Inventario

### 1. No-Negatividad Absoluta de Existencias
- **Enunciado Normativo:** La cantidad disponible de cualquier posición de inventario (`AvailableQuantity`) nunca puede ser menor a cero (`< 0`). Es un límite matemático infranqueable en el dominio.
- **Mecanismo en Dominio:** Validado en el constructor y en cada mutación de `Inventory`. Cualquier intento de decrementar existencias por debajo de cero provoca una excepción de dominio inmediata, abortando la transacción.
- **Impacto de Negocio:** Impide la sobreventa de productos en el marketplace y garantiza que nunca se ofrezcan unidades inexistentes.

---

### 2. Orden de Reserva por Mayor Capacidad Disponible
- **Enunciado Normativo:** El algoritmo de asignación de existencias ordena las bodegas candidatas de **mayor a menor cantidad disponible** (`AvailableQuantity`), sin establecer prioridades ni discriminación entre bodegas del marketplace y bodegas de vendedores.
- **Mecanismo en Dominio:** Implementado en `InventoryReservationService`. Ordena la lista de bodegas candidatas estrictamente por existencias decrecientes. El agregado `Inventory` no transporta tipo de bodega, preservando la portabilidad del modelo.
- **Impacto de Negocio:** Optimiza la consolidación logística despachando desde los nodos con mayor capacidad, reduciendo el riesgo de dispersión de envíos.

---

### 3. Bodega Única con Fraccionamiento de Contingencia
- **Enunciado Normativo:** Toda la cantidad solicitada de una variante en una línea de pedido debe reservarse desde **una sola bodega** si alguna de las bodegas candidatas cubre el requerimiento completo.
  - **Excepción de Fraccionamiento:** Solo si **ninguna** bodega individual cuenta con existencias suficientes para cubrir la línea, el sistema fracciona la reserva entre múltiples bodegas, ordenadas de mayor a menor stock disponible.
  - **Fallo y Compensación:** Si la suma combinada de todas las bodegas candidatas es inferior a la cantidad solicitada, la operación falla por completo y se liberan las reservas provisionales en esa misma operación.
  - **Efecto Logístico:** En caso de fraccionamiento, se emiten múltiples órdenes de despacho (`Shipment`), una por cada bodega de origen involucrada.
- **Mecanismo en Dominio:** Orquestado por `InventoryReservationService` conforme a la especificación de [reserva y contingencia](../Adr/0001-reserva-fragmentacion-contingencia.md).
- **Impacto de Negocio:** Minimiza costos de flete consolidando envíos en una sola bodega y solo asume despachos divididos cuando es estrictamente indispensable para no perder la venta.

---

### 4. Ajuste de Existencias por Evidencia Física
- **Enunciado Normativo:** Los movimientos de ajuste de existencias corrigen discrepancias entre el registro digital y el inventario físico real:
  - **Ajustes al alza:** Constituyen ingresos normales declarados por el vendedor.
  - **Ajustes a la baja:** Requieren obligatoriamente **evidencia comprobable** (conteo físico ejecutado por un Operador Logístico, reporte de stock fantasma al empacar o retorno de devolución).
  - **Auditoría sin Bloqueo:** El sistema registra el ajuste de forma inmediata con actor, fecha y justificación escrita. El Administrador audita a posteriori en lugar de aprobar previamente.
- **Mecanismo en Dominio:** Ejecutado mediante `Inventory.ApplyPhysicalCount()`, generando un registro inmutable `StockAdjustmentRecord` y emitiendo `StockAdjustedDomainEvent` según la política de [ajuste sin cuello de botella](../Adr/0021-ajuste-de-stock-sin-cuello-de-botella.md).
- **Impacto de Negocio:** Elimina la burocracia administrativa en el almacén mientras mantiene una pista de auditoría rigurosa para identificar mermas y fraudes.

---

## 2. Catálogo y Consistencia de Vendedores

### 5. Autopublicación Directa del Vendedor
- **Enunciado Normativo:** Los vendedores poseen autonomía operativa sobre su catálogo:
  - Todo producto creado o modificado nace inmediatamente en estado publicado (`Published`), sin requerir aprobación humana previa.
  - El vendedor puede suspender (`Suspended`) y reactivar (`Published`) sus productos en cualquier momento.
- **Mecanismo en Dominio:** Máquina de estados controlada dentro del agregado `Product` a través de los métodos `Publish()` y `Suspend()`.
- **Impacto de Negocio:** Agilidad comercial inmediata en la incorporación de nuevos productos al marketplace.

---

### 6. Aislamiento de Acceso por Vendedor Inactivo o Bloqueado
- **Enunciado Normativo:** Bloquear o desactivar a un vendedor revoca de inmediato su acceso a la plataforma sin alterar en cascada los productos de su catálogo.
  - Los productos del vendedor bloqueado permanecen en su estado actual en el catálogo.
  - El proceso de compra valida el estado del vendedor y rechaza cualquier carrito que contenga productos pertenecientes a un vendedor bloqueado.
  - Los pedidos previamente pagados y en curso de entrega continúan su ciclo logístico normal hasta completarse.
- **Mecanismo en Dominio:** Validado en el agregado `User` (`CanAuthenticate`) y verificado como guarda precondicional antes de consolidar reservas de inventario.
- **Impacto de Negocio:** Permite suspender vendedores infractores en milisegundos sin disparar mutaciones pesadas de datos en masa y protegiendo las compras ya pagadas por los clientes.

---

### 7. Tasa de Incidencias de Stock Fantasma
- **Enunciado Normativo:** El sistema monitorea la confiabilidad de cada vendedor mediante su tasa de incidencias de inventario (`StockFantasmaRate`). Cada cancelación de despacho por falta física de producto incrementa esta métrica. Si la tasa alcanza o supera el umbral crítico del 30%, el sistema bloquea preventivamente las ventas de ese vendedor.
- **Mecanismo en Dominio:** Métodos de negocio en `User` (`IncrementStockFantasmaRate` y `ExceedsStockFantasmaThreshold`).
- **Impacto de Negocio:** Protege al comprador frente a vendedores recurrentemente informales que declaran existencias que no poseen físicamente.

---

## 3. Dinámicas Comerciales y Pasarela de Pagos

### 8. Facturación Maestra Centralizada (Merchant of Record)
- **Enunciado Normativo:** Zentric opera legalmente como *Merchant of Record* ante el comprador, asumiendo la consolidación comercial del pedido:
  - El comprador visualiza y paga un único pedido consolidado (`CustomerOrder`), recibiendo un comprobante unificado sin importar la cantidad de vendedores involucrados.
  - La política de flete establece el uso de transportadora propia ("Zentric") con número de guía obligatorio en cada paquete.
  - El cobro del flete se mantiene en reserva diferida según lo dictaminado en el [registro de transporte y envío](../Adr/0008-transportadora-y-tarifa-de-envio.md), sin asumir importes ficticios.
- **Mecanismo en Dominio:** Agregado `CustomerOrder` totaliza las líneas comerciales; segregación de facturación delegada a la emisión de comprobantes `Invoice`.
- **Impacto de Negocio:** Experiencia de compra unificada para el usuario final y cumplimiento de responsabilidades fiscales centralizadas.

---

### 9. Expiración de Reserva Preventiva (Ventana de 15 Minutos)
- **Enunciado Normativo:** Toda reserva de existencias generada al iniciar el checkout dispone de una validez máxima de **15 minutos** para confirmar el pago.
  - Si el pago no se confirma dentro del lapso establecido, el sistema revierte automáticamente las existencias reservadas al inventario disponible.
  - El pedido en trámite pasa a estado anulado por tiempo de espera (`CancelDueToTimeout`).
- **Mecanismo en Dominio:** El agregado `CustomerOrder` rechaza pagos posteriores a la expiración mediante validación de estado; la restitución de inventario se ejecuta mediante `Inventory.ReturnToAvailable()`.
- **Impacto de Negocio:** Evita el bloqueo indefinido de mercancía por carritos abandonados, garantizando la rotación del inventario.

---

### 10. Registro Inmutable de Comprobantes de Pago
- **Enunciado Normativo:** Zentric no custodia ni procesa directamente tarjetas de crédito ni datos financieros sensibles. Cada interacción con la pasarela de pagos genera un comprobante financiero inmutable (`PaymentReceipt`) que documenta tanto las transacciones aprobadas como los intentos rechazados.
- **Mecanismo en Dominio:** Agregado raíz `PaymentReceipt` con propiedades inmutables de auditoría (`TransactionId`, `Amount`, `RefundedAmount`, `RefundedAt`).
- **Impacto de Negocio:** Trazabilidad contable total de todos los intentos de cobro sin asumir riesgos de seguridad PCI-DSS.

---

## 4. Gestión de Despacho y Posventa

### 11. Inmodificabilidad del Pedido Pagado y Resolución Total
- **Enunciado Normativo:** Una vez que un pedido alcanza el estado pagado (`Paid`), ni el comprador ni el vendedor pueden modificar sus líneas ni anularlo arbitrariamente. El pedido pagado solo puede avanzar en su ciclo logístico hacia despacho (`Dispatched`) y entrega (`Delivered`).
  - **Excepción de Resolución Total:** El pedido maestro solo transiciona a estado anulado (`Cancelled`) si la totalidad de sus órdenes de despacho fueron canceladas por quiebre de stock fantasma y el saldo económico a favor del comprador ha sido acreditado en su totalidad ([resolución total de orden](../Adr/0022-pedido-resuelto-pasa-a-cancelled.md)).
- **Mecanismo en Dominio:** Invariante de estado en `CustomerOrder` que prohíbe transiciones regresivas o cancelaciones manuales una vez capturado el pago.
- **Impacto de Negocio:** Garantiza la seguridad jurídica de las transacciones comerciales ya cobradas.

---

### 12. Cancelación de Despacho por Stock Fantasma
- **Enunciado Normativo:** Si al momento de realizar el empaque físico en bodega se detecta que las unidades están dañadas o no existen, el Operador Logístico o el Vendedor cancelan unilateralmente esa orden de despacho específica (`FulfillmentOrder`) bajo causal de stock fantasma.
  - El pedido maestro (`CustomerOrder`) conserva su validez para los despachos restantes.
  - Se abre de forma automática el proceso de devolución de la línea afectada, emitiendo el reembolso proporcional al comprador.
- **Mecanismo en Dominio:** Método `FulfillmentOrder.CancelDueNoStock()`, que emite el evento `PartialFulfillmentCancelledDomainEvent`.
- **Impacto de Negocio:** Transparencia operativa ante quiebres de inventario sin paralizar las entregas de otros vendedores de la misma orden.

---

### 13. Blindaje de Productos Digitales (Venta Final)
- **Enunciado Normativo:** La devolución, retracto o reembolso de cualquier producto de naturaleza digital (`DigitalDeliveryRecord`) está estrictamente prohibida por el dominio. Las compras de bienes digitales son ventas finales e irreversibles.
- **Mecanismo en Dominio:** Guarda de negocio en `ReturnRequest` que valida `ProductType != Digital` al momento de instanciar o solicitar una devolución.
- **Impacto de Negocio:** Protección patrimonial de los vendedores frente a copias no autorizadas o fraudes de consumo digital.

---

### 14. Doble Verificación en Devoluciones de Productos Físicos
- **Enunciado Normativo:** El procesamiento de una devolución de mercancía física exige obligatoriamente dos conformidades independientes:
  1. **Inspección de Condición Física:** Realizada por el Operador Logístico en la bodega de recepción.
  2. **Aprobación Comercial:** Otorgada por el Vendedor responsable de la venta.
  - **Excepción de Bodega Propia:** Si la devolución física es recibida directamente en una bodega de propiedad exclusiva del vendedor, la verificación física se asume completada por el propio vendedor conforme a la regla de [aprobación de devoluciones](../Adr/0018-devoluciones-aprobacion-dual-logistica-vendedor.md).
- **Mecanismo en Dominio:** Estado bifactorial en el agregado `ReturnRequest` (`IsPhysicallyInspected` y `IsApprovedByVendor`), evaluado por `ReturnsApprovalService`.
- **Impacto de Negocio:** Evita fraudes en devoluciones garantizando que la mercancía retorne en condiciones óptimas antes de liberar créditos económicos.

---

## 5. Saldo a Favor, Snapshots y Datos de Identidad

### 15. Tope de Crédito Acumulado y Reembolso como Saldo
- **Enunciado Normativo:** Todo reembolso originado por una devolución o quiebre de stock se procesa como **saldo a favor del comprador dentro de la plataforma**, nunca como una reversión bancaria directa hacia la pasarela de pago.
  - La suma acumulada de todos los créditos asociados a un comprobante de pago nunca puede superar el monto originalmente cobrado (`Amount`).
  - El comprobante de pago solo alcanza el estado de reembolsado (`Refunded`) cuando el saldo acumulado iguala el 100% del importe total.
- **Mecanismo en Dominio:** Método de negocio `PaymentReceipt.Refund()` que acumula sobre `RefundedAmount` y rechaza importes que excedan el saldo residual conforme a la política de [crédito parcial por línea](../Adr/0020-precio-congelado-y-credito-parcial-por-linea.md).
- **Impacto de Negocio:** Retención de liquidez en la plataforma y blindaje financiero contra sobre-reembolsos.

---

### 16. Snapshot Inmutable de Precio Unitario
- **Enunciado Normativo:** El precio unitario de cada línea de pedido se captura de forma inmutable desde el catálogo (`Product.Price`) en el instante exacto en que la variante se añade al carrito.
  - Ni el comprador ni el vendedor pueden enviar o modificar el precio de la línea.
  - Las fluctuaciones posteriores de precio en el catálogo no alteran los pedidos en curso ni los carritos activos.
- **Mecanismo en Dominio:** Constructor de `OrderItem` que recibe el precio unitario congelado como Value Object `Money` y calcula el subtotal como producto de precio por cantidad.
- **Impacto de Negocio:** Certeza jurídica en el precio pactado con el comprador durante toda la transacción.

---

### 17. Identidad Única y Rol Exclusivo
- **Enunciado Normativo:** Cada usuario en el sistema posee un correo electrónico y un documento de identidad estrictamente únicos. Asimismo, cada cuenta de usuario tiene asignado exactamente **un único rol funcional** dentro del marketplace.
- **Mecanismo en Dominio:** Entidad raíz `User` que encapsula `Email`, documento de identidad y enum `UserRole`.
- **Impacto de Negocio:** Control de acceso riguroso y segregación clara de responsabilidades operativas.

---

### 18. Dirección Principal Obligatoria y Aislamiento del Comprador
- **Enunciado Normativo:** Todo comprador debe registrar obligatoriamente una dirección principal completa e inmutable (`Address`) al crearse en el sistema.
  - El comprador administra únicamente su propia información personal, sus carritos y sus pedidos.
  - Está estrictamente prohibido que un comprador tenga visibilidad o control sobre las órdenes de otros clientes o las posiciones globales de inventario.
- **Mecanismo en Dominio:** Agregado `Buyer` exige `MainAddress` no nula en su creación; aislamiento de pertenencia aplicado en los contratos de datos y casos de uso.
- **Impacto de Negocio:** Asegura la información indispensable para el despacho logístico y protege la privacidad y confidencialidad de los datos del cliente.
