# [ADR-0005](0005-modelado-carrito-compras.md) — Modelado del Carrito de Compras

```yaml
id: 0005
title: El Carrito es el estado inicial del Agregado CustomerOrder
status: accepted
date: 2026-09-19
decided_by: owner del proyecto
supersedes: []
related_contradiction: [C-04](../SDD.md)
```

## Contexto

Los documentos de especificación discrepaban sobre la naturaleza del Carrito de Compras (`Cart`):
- Algunos documentos lo listaban como un estado de `CustomerOrder` (`OrderStatus.Cart`).
- Otros no lo incluían en el ciclo de vida del pedido, sugiriendo implícitamente un agregado separado.

Además, la regla PED-01 establece que debe haber un "timeout de 15 min" para las reservas preventivas de un pedido.

## Decisión

1. **`Cart` como Estado:** `Cart` es el estado inicial del agregado `CustomerOrder`. No se creará un agregado `Cart` independiente. 
2. **Ciclo de vida:** Un `CustomerOrder` nace en estado `Cart`. Luego avanza a `PendingPayment` cuando el cliente inicia el proceso de checkout.
3. **Expiración (Timeout):** Para dar soporte al timeout de 15 minutos (PED-01), el `CustomerOrder` registrará su fecha de creación (`CreatedAt` o `ExpiresAt`). El sistema rechazará transiciones al checkout si han pasado más de 15 minutos desde su creación.

## Alternativas consideradas

- **Agregado Independiente (`Cart`):** Rechazado. Separar el carrito del pedido requería mapear los ítems del carrito a un nuevo pedido al hacer el checkout, lo que duplica modelos y esfuerzo, siendo innecesario en este dominio.

## Consecuencias

- **Positivas:** Modelo simplificado. `CustomerOrder` traza todo el historial desde la intención de compra.
- **Negativas:** Puede haber muchos registros de `CustomerOrder` abandonados en estado `Cart` en la base de datos (requerirá un job de limpieza o soft-delete en el futuro).

## Documentos actualizados en la misma decisión

- `backendSDD/SDD.md` — C-04 y Q-04 cerradas.
- Actualización de código en `OrderStatus.cs` y `CustomerOrder.cs`.
