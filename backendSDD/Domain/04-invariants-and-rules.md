# 04. Reglas de Negocio Estrictas (Invariantes)

El Dominio está obligado a proteger y hacer cumplir las siguientes reglas mediante validaciones duras en sus constructores y métodos (lanzando excepciones de dominio si se intentan violar).

## 1. Integridad del Inventario (Las reglas más duras)
1. **No-Negatividad Absoluta:** `AvailableQuantity` nunca puede ser `< 0`. Es matemáticamente imposible en el dominio.
2. **Prioridad Marketplace:** El algoritmo de reserva debe buscar existencias *primero* en una `WarehouseType.Marketplace` y solo buscar en bodegas del Vendedor como contingencia.
3. **Bodega única con fraccionamiento de contingencia ([INV-02](06-business-rules.md) revisada por [ADR-0001](../Adr/0001-reserva-fragmentacion-contingencia.md)):**
   - **Regla base:** toda la cantidad solicitada de una Variante específica en una `OrderLine` debe surtirse desde **una (1) sola bodega** cuando exista una bodega individual cuyo `AvailableQuantity` cubra la cantidad total. Los envíos de un mismo SKU no se dividen, para evitar costos exorbitantes.
   - **Umbral exacto de la excepción (fraccionamiento permitido):** solo si **ninguna** bodega individual cubre la cantidad solicitada, el `InventoryReservationService` puede fraccionar la reserva entre varias bodegas, ordenándolas de mayor a menor stock disponible y respetando la prioridad de bodega `Marketplace` ([invariante 2](04-invariants-and-rules.md)).
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
8. **Timeout de Reservas:** Si un pedido pasa más de un tiempo estipulado (ej. 15 minutos) en estado `PendingPayment`, se anula automáticamente y devuelve las cantidades reservadas a `AvailableQuantity`.
9. **Simulación de Pasarela (YAGNI):** No se almacenan tarjetas de crédito ni billeteras. El Dominio avanza de estado con una simple entidad `PaymentReceipt` que valida la respuesta de éxito/fallo.

## 4. Posventa y Excepciones Logísticas
10. **Retracto Temprano:** Un comprador puede cancelar su propio `CustomerOrder` autónomamente solo si TODOS los `FulfillmentOrder` hijos siguen en estado `Pending`. Si uno solo avanzó a `Packed`, la cancelación inmediata se bloquea y el usuario debe esperar a tramitar devolución.
11. **Cancelación por Stock Fantasma:** El Vendedor o Bodega puede anular unilateralmente partes de su orden por pérdida física de stock. Esto genera un reembolso parcial inmediato, pero no mata el resto del `CustomerOrder`.
12. **Blindaje de Productos Digitales:** La devolución y el reembolso de cualquier ítem donde `ProductType == Digital` está terminantemente prohibido por código (Venta Final Irreversible).
13. **Doble Verificación de Devolución Física:** Ningún reembolso por devolución física se emite sin dos banderas verdes explícitas: 1) Conformidad Física (Logística) y 2) Conformidad Comercial (Vendedor).
