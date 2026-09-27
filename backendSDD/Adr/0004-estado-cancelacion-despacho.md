# [ADR-0004](0004-estado-cancelacion-despacho.md) — Estado de cancelación de despacho

```yaml
id: 0004
title: Estado general de cancelación con motivo (CancellationReason) en FulfillmentOrder
status: accepted
date: 2026-09-19
decided_by: owner del proyecto
supersedes: []
related_contradiction: [C-03](../SDD.md)
```

## Contexto

Existía una discrepancia entre documentos respecto a cómo representar la cancelación de un despacho logístico (FulfillmentOrder):
- [02-value-objects.md](../Domain/02-value-objects.md) especificaba un estado `Cancelled`.
- [03-value-objects.md](../Domain/02-value-objects.md) especificaba un estado específico `CancelledByStockBreak`.

Tener estados específicos para cada motivo de cancelación (ej. `CancelledByUser`, `CancelledByStockBreak`) no escala bien si se agregan más motivos a futuro.

## Decisión

Se adopta el uso de un estado único y general `Cancelled` combinado con una propiedad adicional `CancellationReason`.

1. **Estado:** Se elimina `CancelledByStockBreak` de `FulfillmentStatus` y se utiliza únicamente `Cancelled`.
2. **Propiedad:** Se agrega `CancellationReason` (string o enum) a `FulfillmentOrder` para detallar el motivo exacto de la cancelación (ej. "Stock Fantasma").

## Alternativas consideradas

- **Estados múltiples (`CancelledByX`, `CancelledByY`):** Rechazado porque infla la máquina de estados y mezcla la transición lógica con el dato del motivo.

## Consecuencias

- **Positivas:** La máquina de estados de `FulfillmentOrder` es más limpia y extensible a nuevos motivos de cancelación sin alterar el enum.
- **Negativas:** Obliga a tener una propiedad adicional (`CancellationReason`) que solo tiene sentido cuando el estado es `Cancelled`.

## Documentos actualizados en la misma decisión

- `backendSDD/SDD.md` — C-03 y Q-03 cerradas.
- Actualización de código en `FulfillmentStatus` y `FulfillmentOrder`.
