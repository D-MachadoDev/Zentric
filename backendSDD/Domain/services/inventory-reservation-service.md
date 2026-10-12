# Servicio de Dominio: InventoryReservationService

## 1. Propósito y Responsabilidad
El `InventoryReservationService` es responsable de coordinar la reserva de stock físico cuando un comprador añade productos al carrito. Resuelve la complejidad del inventario distribuido, garantizando que no se sobre-venda y que las reglas de concurrencia se respeten.

## 2. Bounded Context
Pertenece al **Inventory Context**, pero es orquestado a solicitud del **Ordering Context** (Carrito).

## 3. Entradas y Salidas
- **Input:** un `CustomerOrder` — reserva todos sus `Items` **físicos** (el checkout es quien lo invoca). El servicio consulta el producto de cada línea y omite las `Digital` (CAT-02): no llevan almacén ni reserva.
- **Output:** `Task`. Falla con `InvalidOperationException` si el stock total no alcanza.

## 4. Flujo Lógico y Reglas (Invariantes)
1. Recibir la solicitud de reserva del carrito.
2. Por cada `VariantId` físico solicitado:
   - Consultar los `Inventory` (bodegas) donde el `VariantId` coincida y `AvailableQuantity > 0`. *(Clave de stock `(VariantId, WarehouseId)` — [ADR-0002](../../Adr/0002-clave-inventario-variantid.md).)*
   - **Regla de Prioridad (V-02):** ordenar de **mayor a menor `AvailableQuantity`** con desempate estable por `Id`, **sin preferencia por tipo de bodega** (`Inventory` no transporta `WarehouseType`; con `VendorId = User.Id` el dueño del stock es el dueño del producto, no el de la bodega).
   - **Regla de Bodega Única (regla base [INV-02](../06-business-rules.md)):** si una sola bodega cubre la cantidad solicitada, la reserva se hace **íntegramente** en esa bodega aunque existan otras con stock. El envío no se divide.
   - **Regla de Fragmentación de Contingencia (excepción [INV-02](../06-business-rules.md), [ADR-0001](../../Adr/0001-reserva-fragmentacion-contingencia.md)):** solo si **ninguna** bodega individual cubre la cantidad solicitada (ej. se piden 10 y la Bodega A tiene 6 y la Bodega B tiene 4), el servicio **fracciona** la reserva entre las bodegas necesarias, en orden de mayor a menor stock.
   - Invocar `IInventoryRepository.TryReserveStockAsync(id, n)` en cada bodega seleccionada — `UPDATE` condicional atómico (ADR-0025) que solo descuenta si la fila aun tiene `n` unidades; cero filas afectadas = rechazo de esa bodega, y se pasa a la siguiente candidata. Tras el éxito se aplica `Inventory.ReserveStock(n)` en la copia en memoria como defensa en profundidad (ADR-0025, decisión 3), no como garantía.
3. **Fallo y compensación:** si el total sumado de todas las bodegas es menor que la cantidad solicitada, o si la base rechaza todas las escrituras, el servicio libera con `ReleaseReservedStockAsync` (UPDATE inverso condicional) las reservas ya aplicadas en esta misma invocación —las de líneas anteriores incluidas— y **después** lanza `InvalidOperationException`. Antes esta atomicidad la daba el `SaveChanges` diferido del checkout; con la reserva ya escribiendo de inmediato (ADR-0025), la compensación explícita es lo que impide parciales confirmados (ADR-0001, fallo y compensación).

## 5. Eventos Emitidos
El servicio no emite eventos. Tras la reserva exitosa, `CustomerOrder.Checkout()` emite `OrderCreatedDomainEvent` y el pedido pasa a `PendingPayment`.
