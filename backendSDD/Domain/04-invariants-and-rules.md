# 04. Reglas de Negocio Estrictas (Invariantes)

El Dominio está obligado a proteger y hacer cumplir las siguientes reglas mediante validaciones duras en sus constructores y métodos (lanzando excepciones de dominio si se intentan violar).

## 1. Integridad del Inventario (Las reglas más duras)
1. **No-Negatividad Absoluta:** `AvailableQuantity` nunca puede ser `< 0`. Es matemáticamente imposible en el dominio.
2. **Orden de reserva por mayor stock, sin preferencia por tipo de bodega (V-02, dictamen del Owner 2026-09-30):** el algoritmo de reserva ordena las candidatas de **mayor a menor `AvailableQuantity`** y no distingue entre `WarehouseType.Marketplace` y `WarehouseType.Vendor`. El texto anterior de este invariante exigía buscar *primero* en `Marketplace` y usar el Vendedor solo como contingencia; se retira porque el modelo no puede honorarla —el agregado `Inventory` no transporta el tipo de bodega—, de modo que la regla era inaplicable y el código llevaba desde el inicio la regla contraria. **Por qué no se implementó:** con `VendorId = User.Id` (Q-21b) el dueño del stock es el dueño del *producto*, no el de la bodega, así que "bodega del Marketplace" no identifica un origen de mercancía distinto: solo indica quién opera el almacén. Priorizar por tipo habría cambiado el resultado sin cambiar el dueño del producto y habría exigido una columna nueva, una migración y un cambio en el puerto. Si algún día el hub del Marketplace implica mercancía propia con reglas distintas de las del vendedor, esta decisión se revisa junto con el modelo que lo soporte.
3. **Bodega única con fraccionamiento de contingencia ([INV-02](06-business-rules.md) revisada por [ADR-0001](../Adr/0001-reserva-fragmentacion-contingencia.md)):**
   - **Regla base:** toda la cantidad solicitada de una Variante específica en una `OrderLine` debe surtirse desde **una (1) sola bodega** cuando exista una bodega individual cuyo `AvailableQuantity` cubra la cantidad total. Los envíos de un mismo SKU no se dividen, para evitar costos exorbitantes.
   - **Umbral exacto de la excepción (fraccionamiento permitido):** solo si **ninguna** bodega individual cubre la cantidad solicitada, el `InventoryReservationService` puede fraccionar la reserva entre varias bodegas, ordenándolas de mayor a menor stock disponible, **sin preferencia por `WarehouseType`** ([invariante 2](04-invariants-and-rules.md), revisado por el dictamen V-02 del 2026-09-30).
   - **Fallo y compensación:** si la suma de todas las bodegas es menor que la cantidad solicitada, la operación **falla** y se liberan las reservas parciales calculadas en esa misma transacción (rollback virtual).
   - **Efecto en logística:** cuando hubo fraccionamiento, se generan **múltiples `Shipment`** (una guía por bodega) dentro del `FulfillmentOrder` del vendedor.
   - **Ejemplos normativos:** bodega A = 6, bodega B = 4.
     - Cantidad 5 → A cubre → **una sola bodega** (no se divide).
     - Cantidad 10 → ninguna cubre → se **fracciona** 6 + 4.
     - Cantidad 12 → la suma (10) no alcanza → **falla** y no se reserva nada.
4. **Privilegios de Ajuste de Stock:** Un `Seller` solo puede usar la función `ManualAdjust()` en bodegas tipo `Vendor` (suyas). El stock en bodegas `Marketplace` es sagrado y solo `LogisticsOperator` o `Admin` pueden ajustarlo.

## 2. Consistencia de Vendedores y Catálogo
5. **Autopublicación y Auditoría:** Los productos no requieren aprobación previa humana. Nacen en estado `Published`. El `Admin` usa `Suspend()` reactivamente.
6. **Suspensión en Cascada (Seguridad):** Si un Usuario Vendedor es marcado como `Blocked`, TODOS sus productos vigentes deben pasar a `Suspended` de forma eventual para proteger la plataforma de compras incumplibles.

## 3. Dinámicas Comerciales y Pagos
7. **Facturación Maestra (Merchant of Record):** Zentric asume legalmente el cobro al comprador. El `CustomerOrder` totaliza todo, incluyendo el `FlatShippingFee` (Tarifa Plana de Envío), y es la base de un único comprobante unificado (no se exponen múltiples recibos de pago al cliente).

    > **ADDENDUM - DICTADO POR OWNER (2026-09-27) — política de envío, sin implementación todavía.** Transportadora única propia ("Zentric"), **número de guía obligatorio** en cada despacho, **tarifa fija** (no por peso, tamaño ni zona, porque el sistema no modela ubicación geográfica) y **lo paga el cliente**, no Zentric. La funcionalidad se **aplaza**: el Owner estima que llegará en algunos años, así que este invariante documenta la decisión pero **no hay código de envío**. La cifra de la tarifa sigue sin definirse y ningún código debe asumir un importe. Ver [ADR-0008](../Adr/0008-transportadora-y-tarifa-de-envio.md).
    >
    > *Es un ADDENDUM del Owner; `ZENTRIC.md` no menciona envío, transportadora ni guía.*
8. **Timeout de Reservas:** Si un pedido pasa más de un tiempo estipulado (ej. 15 minutos) en estado `PendingPayment`, se anula automáticamente y devuelve las cantidades reservadas a `AvailableQuantity`.
9. **Simulación de Pasarela (YAGNI):** No se almacenan tarjetas de crédito ni billeteras. El Dominio avanza de estado con una simple entidad `PaymentReceipt` que valida la respuesta de éxito/fallo.

    > **Estado de implementación (verificado 2026-09-27):** `PaymentReceipt` existe como raíz de agregado en `Zentric.Domain/Payments/PaymentReceipt.cs` y **está persistido** (`PaymentReceipts`, con `Amount`, `RefundedAmount`, `TransactionId`, `RefundedAt`). `PayOrderCommandHandler` cobra **antes** de marcar el pedido como pagado y emite el comprobante **también cuando la pasarela rechaza**, de modo que todo intento de cobro queda registrado.
    >
    > **ADDENDUM - DICTADO POR OWNER (2026-09-27) — reembolso como crédito a favor:** la devolución de un producto físico genera un **crédito a favor del comprador dentro de la plataforma**, no una transferencia de dinero, porque el sistema no custodia fondos. El comprobante de pago pasa a `Refunded` con `RefundedAmount` y `RefundedAt`, y **el `CustomerOrder` NO se revierte**: ya fue entregado y facturado, y reabrirlo obligaría a deshacer logística y facturación cerradas. El estado `Reembolsada` del Dominio 10 de la Ley se materializa así.
    >
    > *Esta nota es un ADDENDUM del Owner; no forma parte de la Ley (`ZENTRIC.md`), que no menciona el mecanismo de reembolso.*

## 4. Posventa y Excepciones Logísticas
10. **Retracto Temprano:** Un comprador puede cancelar su propio `CustomerOrder` autónomamente solo si TODOS los `FulfillmentOrder` hijos siguen en estado `Pending`. Si uno solo avanzó a `Packed`, la cancelación inmediata se bloquea y el usuario debe esperar a tramitar devolución.
11. **Cancelación por Stock Fantasma:** El Vendedor o Bodega puede anular unilateralmente partes de su orden por pérdida física de stock. Esto genera un reembolso parcial inmediato, pero no mata el resto del `CustomerOrder`.
12. **Blindaje de Productos Digitales:** La devolución y el reembolso de cualquier ítem donde `ProductType == Digital` está terminantemente prohibido por código (Venta Final Irreversible).
13. **Doble Verificación de Devolución Física:** Ningún reembolso por devolución física se emite sin dos banderas verdes explícitas: 1) Conformidad Física (Logística) y 2) Conformidad Comercial (Vendedor).
