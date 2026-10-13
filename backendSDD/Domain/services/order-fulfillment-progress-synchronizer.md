# Servicio de Dominio: OrderFulfillmentProgressSynchronizer

> **Especificación Táctica de Servicio de Dominio.** Define la regla de negocio y algoritmo de sincronización que proyecta el avance de los despachos individuales sobre el pedido maestro del comprador.

---

## 1. Propósito y Responsabilidad
Garantizar la regla **PED-05**: el estado global de una orden comercial ([`CustomerOrder`](file:///C:/Users/da-V7/Desktop/Proyectos/Zentric/backend/Zentric.Domain/Orders/CustomerOrder.cs)) refleja el mínimo común denominador del progreso de sus despachos fragmentados ([`FulfillmentOrder`](file:///C:/Users/da-V7/Desktop/Proyectos/Zentric/backend/Zentric.Domain/Logistics/FulfillmentOrder.cs)).

El servicio no altera el estado de los despachos; evalúa el conjunto de estados y decide cuándo y cómo avanzar el pedido maestro.

---

## 2. Bounded Context y Ubicación
- **Bounded Context:** `Ordering Context`.
- **Ubicación en Código:** `Zentric.Domain/Orders/Services/OrderFulfillmentProgressSynchronizer.cs`.
- **Agregados Coordinados:** `CustomerOrder` (como sujeto mutado) y `FulfillmentOrder` (a través de sus estados).

---

## 3. Entradas y Salidas
- **Input:**
  - `CustomerOrder order`: Instancia de la orden maestra a sincronizar.
  - `IEnumerable<FulfillmentStatus> fulfillmentStatuses`: Colección con los estados actuales de todos los despachos vinculados al pedido.
- **Output:** `void` (mutación interna sobre `CustomerOrder`).

---

## 4. Flujo Lógico y Reglas de Negocio (Invariantes)

### Regla 1: Aislamiento de Cancelaciones por Quiebre (EXC-01)
Un despacho cancelado por falta física de existencias (`FulfillmentStatus.Cancelled` por "Stock Fantasma") **no bloquea** el avance del pedido maestro:
- Los despachos cancelados se excluyen de la lista de despachos activos.
- Si no se excluyeran, un solo paquete cancelado dejaría al pedido maestro congelado en `Paid` de por vida, aunque todos los demás vendedores hayan entregado sus productos.
- La línea cancelada se salda económicamente a través de un reembolso parcial proporcional ([`EXC-02`](../06-business-rules.md)).

### Regla 2: Sin Entregas Activas
Si todos los despachos del pedido fueron cancelados por quiebre de stock (`active.Count == 0`), el pedido maestro no avanza:
- Marcar el pedido como `Delivered` sería falso, pues nada fue entregado.
- El pedido permanece en su estado actual y se resuelve mediante reembolso total.

### Regla 3: Transición a Despachado (`Dispatched`)
Si el pedido maestro está en `Paid` y **todos** los despachos activos han alcanzado o superado el estado `FulfillmentStatus.Dispatched`:
- Se invoca `order.Dispatch()`.
- El pedido maestro pasa formalmente al estado `Dispatched`.

### Regla 4: Transición a Entregado (`Delivered`)
Si el pedido maestro está en `Dispatched` y **todos** los despachos activos están en `FulfillmentStatus.Delivered`:
- Se invoca `order.Deliver()`.
- El pedido maestro se sella definitivamente como completado.
- *Nota:* Una sola ejecución puede desencadenar ambas transiciones si todos los despachos ya están entregados.

---

## 5. Eventos de Dominio Emitidos
Este servicio delega las mutaciones en `CustomerOrder`, la cual emite:
- `OrderDispatchedDomainEvent` (al transicionar a `Dispatched`).
- `OrderDeliveredDomainEvent` (al transicionar a `Delivered`).
