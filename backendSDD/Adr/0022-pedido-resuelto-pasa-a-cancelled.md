# ADR-0022 — El pedido totalmente resuelto pasa a `Cancelled` (addendum de RG-11)

- **Estado:** Aceptado
- **Fecha:** 2026-10-04
- **Dictado por:** Owner (grill de la capa Domain, PED-05 + EXC-02)
- **Modifica:** la invariante 10 (`RG-11`) de [04-invariants-and-rules.md](../Domain/04-invariants-and-rules.md)
- **Precisa:** [ADR-0020](0020-precio-congelado-y-credito-parcial-por-linea.md) (crédito parcial por línea)

## Contexto

`PED-05` hace que el pedido maestro refleje el mínimo común de sus despachos, y un despacho cancelado por quiebre de stock (`EXC-01`) deja de bloquear ese mínimo. La implementación dejó un caso sin resolver: **cuando todos los despachos de un pedido se cancelan**, no hay nada entregado y el pedido se quedaba en `Paid`.

Eso es un incongruente: el comprador ve «pagado» mientras se le devuelve el dinero entero. `RG-11` solo autorizaba `Cancelled` por **vencimiento del pago**, así que la opción natural —usar `Cancelled` también para la resolución total— parecía una prohibición. No lo era: `RG-11` dice que el ciclo no **añade** estados, y no lo hace.

## Alternativas consideradas

| | Opción | Por qué se descartó |
|---|---|---|
| **A** | El pedido totalmente resuelto y acreditado pasa a `Cancelled`, con **segundo motivo** distinto del vencimiento | — **Elegida** |
| **B** | Se queda en `Paid` con crédito total | El comprador ve «pagado» con saldo cero; la pantalla no cuadra con su banco |
| **C** | Crear `DeliveredWithCancellations` | Choca de frente con `RG-11`: el ciclo no añade estados |

## Decisiones

1. **`Cancelled` admite un segundo motivo:** además del vencimiento del pago, la **resolución total del pedido** —todos sus despachos cancelados por `EXC-01` y el comprador con saldo a favor total.
2. **El motivo queda escrito en el pedido**, igual que hoy distingue el vencimiento. Un pedido liquidado y uno caducado no son el mismo hecho y no pueden leerse igual.
3. **No se confunde «cancelado» con «entregado».** Un pedido resuelto no está entregado: no llegó nada. Por eso el estado es `Cancelled` y no `Delivered`.
4. **El saldo del comprador se acredita primero.** El pedido solo pasa a `Cancelled` cuando el acumulado del comprobante iguala el total cobrado (invariante 14). Un pedido resuelto con dinero sin devolver no está liquidado.

## Consecuencias

- **Addendum a `RG-11`**, que se amplía: el ciclo sigue sin añadir estados, pero `Cancelled` deja de ser exclusivo del vencimiento del pago.
- El comprobante pasa a `Refunded` por la vía de `EXC-02`/`DEV-05`, con crédito acumulado y sin superar lo cobrado.
- Consecuencia de negocio: el vendedor ve su pedido cerrado y resuelto, no un pedido pagado que nunca termina. Es el estado que refleja lo que pasó.