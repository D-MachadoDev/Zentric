# Servicio de Dominio: InventoryReservationService

> **Especificación Táctica de Servicio de Dominio.** Define el algoritmo de optimización y reserva atómica de existencias físicas distribuidas en múltiples bodegas durante el proceso de compra.

---

## 1. Propósito y Responsabilidad
Coordinar la reserva transaccional de existencias físicas cuando un comprador ejecuta el checkout de su carrito. Resuelve la complejidad del inventario distribuido, asegurando que no se sobrevenda mercancía y respetando las reglas de consistencia de la plataforma.

---

## 2. Bounded Context y Ubicación
- **Bounded Context:** `Inventory Context`, orquestado a petición del `Ordering Context`.
- **Ubicación en Código:** `Zentric.Domain/Inventories/Services/InventoryReservationService.cs`.
- **Agregados Coordinados:** `CustomerOrder` (como fuente de demanda) e `Inventory` (como custodio de existencias por bodega).

---

## 3. Entradas y Salidas
- **Input:**
  - `CustomerOrder order`: Pedido maestro en proceso de checkout.
- **Output:**
  - `Task`: Falla lanzando `InvalidOperationException` si el stock disponible en la red no satisface la totalidad de las líneas físicas.

---

## 4. Algoritmo de Selección de Bodegas e Invariantes

Por cada línea de compra (`OrderItem`) del pedido:

### 1. Filtrado de Productos Digitales (CAT-02)
El servicio consulta la tipología del producto. Si es `ProductType.Digital`, la línea se omite de la reserva (los productos digitales no ocupan espacio en bodega ni requieren inventario).

### 2. Búsqueda y Ordenamiento por Capacidad (Regla V-02)
Para cada variante física (`VariantId`), se consultan las posiciones de inventario con `AvailableQuantity > 0`:
- Se ordenan de **mayor a menor disponibilidad** (`AvailableQuantity` descendente).
- En caso de empate en cantidad disponible, el desempate es determinista por `WarehouseId`.
- No existe preferencia por tipo de bodega (`Marketplace` vs. `Vendor`): el dueño del stock comercial es el vendedor del producto.

### 3. Regla de Bodega Única (Regla Base INV-02)
Si la bodega con mayor stock cubre la totalidad de las unidades solicitadas, la reserva se ejecuta íntegramente en esa bodega. El despacho no se divide innecesariamente.

### 4. Fraccionamiento de Contingencia (Excepción INV-02)
Solo si **ninguna** bodega individual cubre la cantidad solicitada (ej. se solicitan 10 unidades, la Bodega A tiene 6 y la Bodega B tiene 4), el servicio fracciona la reserva entre las bodegas necesarias, asignando el máximo posible a la bodega mayor y el remanente a las subsiguientes.

### 5. Escritura Atómica y Compensación Defensiva
- Por cada bodega seleccionada, se invoca la reserva atómica condicional sobre la base de datos.
- Si en alguna línea física el stock total sumado no alcanza para cubrir la cantidad demandada, o si la persistencia rechaza la escritura por concurrencia, el servicio **revierte inmediatamente** todas las reservas parciales previas aplicadas en esa invocación.
- Tras la compensación, lanza `InvalidOperationException` impidiendo que el pedido quede parcialmente reservado.

---

## 5. Eventos de Dominio Asociados
El servicio de reserva no emite eventos directamente; la mutación sobre `Inventory` emite `StockAdjustedDomainEvent` cuando aplica, y la posterior transición del pedido a `PendingPayment` emite `OrderCreatedDomainEvent`.
