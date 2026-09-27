# 07. Ciclo de Vida Crítico (Máquinas de Estado)

Este documento modela cómo transicionan los estados de los dos Agregados principales vinculados a las ventas: `CustomerOrder` (Pedido de cara al comprador) y `FulfillmentOrder` (Pedido de cara al vendedor).

## 1. Ciclo de Vida: Pedido Maestro (`CustomerOrder`)

El ciclo del Comprador unifica las lógicas de productos físicos y digitales.

1. **`Cart`** (Estado inicial)
   - *Evento Adverso:* Al cumplirse 15 minutos sin respuesta -> Transición a **`Cancelled`**.
   - *Evento Exitoso:* Se envía el pago -> Transición a **`PendingPayment`**.
   
2. **`PendingPayment`**
   - *Evento Adverso:* Transacción rechazada por el banco -> Transición a **`Cancelled`**.
   - *Evento Exitoso:* Transacción exitosa -> Transición a **`Paid`**.

3. **`Paid`**
   - *Comportamiento de Productos Digitales:* Se entregan inmediatamente al comprador (liberando accesos/licencias).
   - *Transición A:* Si **TODO** el carrito era digital -> Pasa directo a **`Completed`**.
   - *Transición B:* Si la compra contenía ítems Físicos + Digitales -> Pasa a **`PartiallyDelivered`** (El cliente ya tiene una parte del pedido y otra está en logística).
   - *Transición C:* Si la compra era 100% productos físicos -> Se mantiene en proceso o pasa a `PartiallyDelivered` conforme los paquetes se despachan.

4. **`PartiallyDelivered`** -> **`Completed`** (Ocurre automáticamente al entregarse el último producto en tránsito).

## 2. Ciclo de Vida: Órdenes de Despacho (`FulfillmentOrder`)

Estos estados aplican individualmente para cada vendedor.

1. **`Pending`**
   - Se crea tras el estado `Paid` del Pedido Maestro.
2. **`Packed`**
   - *Condición:* La bodega del vendedor finaliza el alistamiento de cajas.
   - *Excepción:* El vendedor nota que falta stock y cancela -> Transición a **`Cancelled`** (Detonando reembolso parcial).
3. **`Shipped`**
   - El operador logístico (trasportadora) asume control del paquete.
4. **`Delivered`**
   - El cliente recibe el bien físico (Marca el fin del ciclo logístico).
