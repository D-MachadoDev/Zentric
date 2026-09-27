# Servicio de Dominio: InventoryReservationService

## 1. Propósito y Responsabilidad
El `InventoryReservationService` es responsable de coordinar la reserva de stock físico cuando un comprador añade productos al carrito. Resuelve la complejidad del inventario distribuido, garantizando que no se sobre-venda y que las reglas de concurrencia se respeten.

## 2. Bounded Context
Pertenece al **Inventory Context**, pero es orquestado a solicitud del **Ordering Context** (Carrito).

## 3. Entradas y Salidas
- **Input:** `List<CartItem>` (VariantId, Quantity).
- **Output:** `Result<ReservationDetails>` o falla (Error) si no hay stock suficiente.

## 4. Flujo Lógico y Reglas (Invariantes)
1. Recibir la solicitud de reserva del carrito.
2. Por cada `VariantId` físico solicitado:
   - Consultar todos los agregados `InventoryItem` (bodegas) donde el `VariantId` coincida y `AvailableQuantity > 0`. *(Clave de stock `(VariantId, WarehouseId)` — [ADR-0002](../../Adr/0002-clave-inventario-variantid.md).)*
   - **Regla de Prioridad:** Ordenar las bodegas de mayor a menor stock para intentar cubrir la demanda sin fragmentar.
   - **Regla de Bodega Única (regla base [INV-02](../06-business-rules.md)):** si una sola bodega cubre la cantidad solicitada, la reserva se hace **íntegramente** en esa bodega aunque existan otras con stock. El envío no se divide.
   - **Regla de Fragmentación de Contingencia (excepción [INV-02](../06-business-rules.md), [ADR-0001](../../Adr/0001-reserva-fragmentacion-contingencia.md)):** solo si **ninguna** bodega individual cubre la cantidad solicitada (ej. se piden 10 y la Bodega A tiene 6 y la Bodega B tiene 4), el servicio **fracciona** la reserva entre las bodegas necesarias, en orden de mayor a menor stock.
   - Invocar el método `Reserve(qty)` en los `InventoryItem` seleccionados.
3. **Consistencia Transaccional:** Si el total sumado de todas las bodegas es menor a la cantidad solicitada por el usuario, **falla** la operación (Rollback virtual), liberando cualquier reserva parcial que se haya calculado en el proceso de esa misma transacción.

## 5. Eventos Emitidos
Este servicio opera sincrónicamente sobre los agregados. Los eventos se emiten a nivel del `CustomerOrder` (ej. `OrderCreatedDomainEvent`) una vez la reserva retorna un resultado exitoso.
