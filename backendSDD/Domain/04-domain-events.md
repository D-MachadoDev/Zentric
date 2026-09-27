# 04. Domain Events (Eventos de Dominio)

Los eventos de dominio comunican cambios de estado críticos entre diferentes Bounded Contexts y disparan procesos asíncronos (Sagas), garantizando el bajo acoplamiento arquitectónico.

## 1. Eventos de Pedidos (Ordering)

### `OrderCreatedDomainEvent`
- **Cuándo se dispara:** Al finalizar la conversión del carrito en un pedido formal (`CustomerOrder`).
- **Payload:** `OrderId`, `TotalAmount`, `Lines`.
- **Propósito:** Inicia el temporizador de 15 minutos para asegurar el pago antes de liberar reservas.

### `OrderPaidDomainEvent`
- **Cuándo se dispara:** Cuando la pasarela de pagos confirma la transacción.
- **Payload:** `OrderId`.
- **Propósito:** Activa el `OrderSplitterService` para fragmentar el pedido a los vendedores y notifica al `BillingContext` para emitir la factura central.

## 2. Eventos de Logística (Fulfillment)

### `PhysicalProductShippedDomainEvent`
- **Cuándo se dispara:** Cuando un `Shipment` sale de la bodega.
- **Propósito:** Permite al `OrderingContext` evaluar si partes del pedido ya se enviaron para actualizar el maestro a `PartiallyDelivered`.

### `PartialFulfillmentCancelledDomainEvent`
- **Cuándo se dispara:** Cuando el Vendedor anula un sub-pedido por quiebre de stock (Stock Fantasma).
- **Payload:** `FulfillmentOrderId`, `CanceledAmount`, `Reason`.
- **Propósito:** Activa en el `BillingContext` el reembolso automático parcial para el usuario, manteniendo intacto el resto del pedido.

## 3. Eventos de Inventario y Devoluciones

### `CartExpiredDomainEvent`
- **Cuándo se dispara:** Tras 15 minutos sin procesar el pago de un carrito.
- **Propósito:** El `InventoryContext` libera las unidades reservadas temporalmente para evitar bloqueo comercial.

### `ReturnApprovedDomainEvent`
- **Cuándo se dispara:** Tras la verificación dual exitosa (Operador Logístico + Vendedor).
- **Propósito:** Ordena el reingreso oficial al stock disponible y el reembolso final al cliente.
