# Fragmentación del pedido en despachos por vendedor

> **Criterio:** `OrderSplitterService`, `InvalidOrderStatusException` y `FulfillmentConfigurationException` **no existen** — no documentarlos. Lo que sigue es el mecanismo real.

## 1. Dónde ocurre la fragmentación

En el **checkout** (`Zentric.Application/Orders/Commands/CheckoutOrderCommandHandler`): 
recorre las líneas del pedido y crea **un `FulfillmentOrder` por vendedor** (`new FulfillmentOrder(order.Id, vendorId)`).
Los despachos también pueden crearse explícitamente vía `CreateFulfillmentOrderCommand` (logística).

## 2. Reglas del mecanismo real

- Cada despacho nace en `PendingPack` y avanza con `Pack`/`Dispatch` (ver [07-lifecycle.md §2](../07-lifecycle.md)).
- Las guías (`Shipment`) se añaden al despacho **una por bodega de origen** cuando la reserva se
  fraccionó (regla [`INV-02`](../06-business-rules.md)), dentro del despacho del vendedor.
- Los productos `Digital` no requieren guía ni stock (CAT-02).
- La entrega la cierra solo el Operador Logístico (dictamen 2026-10-01, [ADR-0014](../../Adr/0014-enmiendas-a-la-matriz-de-autorizacion.md)).

## 3. Qué NO existe (para no volver a documentarlo)

- No hay clase `OrderSplitterService` ni un puerto `Result<List<FulfillmentOrder>>`.
- La división **no** ocurre «cuando el pago se aprueba» vía evento: ocurre en el checkout.
