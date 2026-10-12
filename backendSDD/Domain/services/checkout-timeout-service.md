# Servicio de Fondo: CheckoutTimeoutService (Infrastructure)

## 1. Propósito y Responsabilidad
Prevenir bloqueos comerciales y "stock congelado" liberando el inventario que fue reservado en un carrito que ha sido abandonado o cuyo pago falló tras expirar el tiempo reglamentario.

## 2. Bounded Context
Opera principalmente en el **Ordering Context** para cancelar el pedido, e **Inventory Context** para liberar el stock.

## 3. Entradas y Salidas
- **Input:** bucle propio del `BackgroundService` (sondeo periódico; no hay Cron externo).
- **Output:** ninguno (proceso de fondo; traza por `ILogger`).

## 4. Flujo Lógico y Reglas ([PED-01](../06-business-rules.md))
1. El umbral se calcula desde el reloj inyectado (`IClock`, T-004): `ahora - 15 minutos`.
   Nunca desde `DateTime.UtcNow` leído en secreto; así el barrido es determinista en pruebas.
2. Consultar el repositorio por todos los agregados `CustomerOrder` que estén en estado `Cart` o `PendingPayment` y cuya propiedad `UpdatedAt` demuestre una antigüedad mayor al umbral del sistema (**15 minutos** estándar).
3. Iterar sobre los pedidos expirados encontrados:
   - Identificar las cantidades exactas y bodegas que fueron reservadas en el paso inicial de compra.
   - Invocar `Inventory.ReturnToAvailable(cantidad)` por ítem (resta `ReservedQuantity`, suma a `AvailableQuantity`).
   - Llamar `CustomerOrder.CancelDueToTimeout()` (el pedido no guarda motivo de cancelación).

## 5. Eventos Emitidos
- `CartExpiredDomainEvent`: lo publica el propio vencimiento del pedido, con el `OrderId` y la fecha de expiración, para que el módulo de notificaciones (aún inexistente) lo escuche; el servicio sigue cancelando y liberando stock directamente (`ReturnToAvailable` + `CancelDueToTimeout`). Decisión del Owner 2026-10-03. **IMPLEMENTADO 2026-10-07:** `CheckoutTimeoutService` emite `CartExpiredDomainEvent` al expirar cada pedido (loggeado y disponible para dispatcher futuro). Ver [04-domain-events.md](../04-domain-events.md).

## 6. Cómo se verifica sin esperar 15 minutos (T-004; H-06/R-06)
La suite congela el tiempo con `ManualClock` (`Zentric.Tests/Security`) y reproduce el
criterio exacto del worker —estados `Cart`/`PendingPayment` más `UpdatedAt < umbral`—
en `Zentric.Tests/Orders/CartExpirationTests`: carrito fresco no expira, carrito de 16
minutos expira, carrito en el borde exacto de 15 minutos no expira, y un pedido pagado
nunca expira aunque pasen horas.
