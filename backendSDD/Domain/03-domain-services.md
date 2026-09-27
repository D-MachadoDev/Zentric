# 03. Domain Services (Servicios de Dominio)

Los Servicios de Dominio se utilizan cuando una operación de negocio requiere orquestar o aplicar reglas que involucran a múltiples *Aggregate Roots*, y cuya lógica no pertenece de forma natural a ninguno de los agregados individuales.

## 1. `InventoryReservationService`

- **Propósito:** Orquestar la reserva de unidades físicas cuando el comprador agrega productos al carrito, resolviendo el desafío del inventario distribuido.
- **Flujo de Ejecución:**
  1. Recibe una orden de reserva para un `ProductId` y una `Quantity`.
  2. Consulta todos los `InventoryItem` asociados a ese producto que posean `AvailableQuantity > 0`.
  3. Ejecuta el algoritmo de distribución:
     - Prioriza la bodega con más stock para evitar fragmentación.
     - Si una sola bodega no cubre la cantidad solicitada, **divide la reserva** entre múltiples bodegas.
  4. Invoca el método `Reserve(qty)` en los `InventoryItem` correspondientes.
  5. Retorna un objeto con el detalle de las reservas (qué bodega reservó qué cantidad) para adjuntarlo al Carrito.

## 2. `OrderSplitterService`

- **Propósito:** Responsable de fragmentar el pedido maestro unificado (`CustomerOrder`) en múltiples órdenes de despacho (`FulfillmentOrder`) una vez que el pago es exitoso.
- **Flujo de Ejecución:**
  1. Analiza las `OrderLine` del `CustomerOrder`.
  2. Identifica el `SellerId` de cada producto.
  3. Agrupa las líneas por `SellerId` y crea un `FulfillmentOrder` independiente para cada vendedor.
  4. Para los productos físicos, verifica desde qué bodegas se hizo la reserva de inventario.
  5. Si un vendedor despachará desde dos bodegas distintas, el servicio divide el `FulfillmentOrder` creando dos entidades `Shipment` (una guía por cada bodega).

## 3. `ReturnsApprovalOrchestrator`

- **Propósito:** Gestionar la regla de negocio que exige **aprobación dual** (Logística + Vendedor) para hacer efectivo un reembolso por devolución.
- **Flujo de Ejecución:**
  1. Escucha la recepción física del producto. El `LogisticsOperator` marca su fase como aprobada.
  2. Notifica al `Seller` que el inventario está en zona de revisión.
  3. Cuando el `Seller` emite su aprobación de inventario, el servicio orquesta dos acciones:
     - Restaura el inventario invocando `Adjust()` en el `InventoryItem`.
     - Levanta un evento para que el Bounded Context de Pagos procese el reembolso financiero.

## 4. `CheckoutTimeoutService`

- **Propósito:** Liberar el inventario retenido (evitando bloqueos de stock) si un proceso de compra es abandonado.
- **Flujo de Ejecución:**
  1. Ejecutado como un proceso en segundo plano (Background Job).
  2. Identifica carritos y pedidos en estado `PendingPayment` que han superado los **15 minutos** de antigüedad.
  3. Ejecuta la compensación: Busca los `InventoryItem` bloqueados y llama al método `Release(qty)` para devolver las cantidades al `AvailableQuantity`.
  4. Marca el `CustomerOrder` como `Cancelled`.
