# Servicio de Dominio: OrderSplitterService

## 1. Propósito y Responsabilidad
El `OrderSplitterService` es el motor lógico encargado de fraccionar el pedido maestro (`CustomerOrder`) en múltiples órdenes de despacho individuales (`FulfillmentOrder`), una para cada vendedor, una vez que el pago ha sido aprobado.

## 2. Bounded Context
Orquesta el cruce (traducción) entre el **Ordering Context** y el **Fulfillment Context**.

## 3. Entradas y Salidas
- **Input:** Entidad `CustomerOrder` (estrictamente en estado `Paid`).
- **Output:** `Result<List<FulfillmentOrder>>`.

## 4. Flujo Lógico y Reglas
1. Validar pre-condición: El `CustomerOrder` debe estar en estado `Paid`.
2. Iterar sobre todas las `OrderLine` contenidas en el pedido maestro.
3. Agrupar las líneas de productos utilizando el `SellerId`.
4. Por cada `SellerId` diferente:
   - Instanciar un nuevo `FulfillmentOrder` asignado a ese vendedor.
   - **Lógica de Bodegas (Fragmentación):** Si los productos físicos provienen de múltiples bodegas del mismo vendedor (según el mapa de reserva de inventario), el servicio debe crear **múltiples `Shipment`** (guías de despacho separadas) dentro de ese único `FulfillmentOrder`.
   - **Productos Digitales:** Si la línea es de tipo `Digital`, no requiere `Shipment` físico y se procesa su entrega electrónica inmediatamente.
5. Persistir las nuevas órdenes de despacho.

## 5. Excepciones
- `InvalidOrderStatusException`: Si se intenta dividir un pedido que aún no está pagado.
- `FulfillmentConfigurationException`: Si un producto físico reservado no tiene una bodega de origen rastreable asignada.
