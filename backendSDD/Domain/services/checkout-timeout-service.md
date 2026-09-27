# Servicio de Dominio: CheckoutTimeoutService

## 1. Propósito y Responsabilidad
Prevenir bloqueos comerciales y "stock congelado" liberando el inventario que fue reservado en un carrito que ha sido abandonado o cuyo pago falló tras expirar el tiempo reglamentario.

## 2. Bounded Context
Opera principalmente en el **Ordering Context** para cancelar el pedido, e **Inventory Context** para liberar el stock.

## 3. Entradas y Salidas
- **Input:** Invocado por un Job recurrente (Cron) o un patrón de expiración en memoria.
- **Output:** `Result` (Total de carritos liberados).

## 4. Flujo Lógico y Reglas ([PED-01](../06-business-rules.md))
1. Consultar el repositorio por todos los agregados `CustomerOrder` que estén en estado `Cart` o `PendingPayment` y cuya propiedad `UpdatedAt` demuestre una antigüedad mayor al umbral del sistema (**15 minutos** estándar).
2. Iterar sobre los pedidos expirados encontrados:
   - Identificar las cantidades exactas y bodegas que fueron reservadas en el paso inicial de compra.
   - Invocar el método `InventoryItem.Release(qty)` para cada ítem. Esto resta la cantidad de `ReservedQuantity` y la suma de vuelta a `AvailableQuantity`.
   - Modificar el estado del `CustomerOrder` a `Cancelled`.
   - Asignar el motivo de cancelación como `TimeoutExpired`.

## 5. Eventos Emitidos
- `CartExpiredDomainEvent`: Anuncia a otros contextos (ej. Notificaciones) que el carrito del usuario fue cancelado por tiempo excedido.
