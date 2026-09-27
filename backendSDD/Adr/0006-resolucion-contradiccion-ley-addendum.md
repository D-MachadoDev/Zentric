# [ADR-0006](0006-resolucion-contradiccion-ley-addendum.md) — Precedencia del ADDENDUM sobre la Ley original

```yaml
id: 0006
title: Las reglas del ADDENDUM tienen precedencia sobre los bloques originales de la Ley
status: accepted
date: 2026-09-19
decided_by: owner del proyecto
supersedes: []
related_contradiction: [C-08](../SDD.md)
```

## Contexto

El documento canónico `ZENTRIC.md` (La Ley) contenía una duplicación y contradicción interna para los dominios 8, 9 y 10:
- El cuerpo principal especificaba unas reglas.
- El bloque final etiquetado implícita/explícitamente como "ADDENDUM" especificaba reglas y estados distintos para Logística, Devoluciones y Facturación.

Esto causó una discrepancia bloqueante (C-08, Q-13) al momento de implementar la arquitectura y la persistencia de estos agregados.

## Decisión

El Owner ha dictaminado que **el ADDENDUM tiene la última palabra**. Toda regla o estado definido en el bloque final prevalece sobre el contenido original de la Ley en caso de colisión.

Las reglas específicas adoptadas son:
1. **FulfillmentOrder (Dominio 8):** Estados `Packed` (Empacado) y `Dispatched` (Despachado). Cancelación obligatoria por "stock fantasma".
2. **Devoluciones (Dominio 9):** Prohibido devolver digitales. La devolución aprobada devuelve el producto al inventario con etiqueta "Usado".
3. **Facturación (Dominio 10):** Existen 3 tipos de factura: Maestra, Detalle Zentric y Factura de Vendedor (Split).

## Consecuencias

- Modificación de enumeraciones y máquinas de estado en los agregados de `Logistics`, `Returns` y `Billing`.
- Exige implementar comunicación entre contextos (ej. Devoluciones a Inventario) mediante Eventos de Dominio.

## Documentos actualizados en la misma decisión

- `backendSDD/SDD.md` — C-08 y Q-13 cerradas.
- Múltiples actualizaciones de código en los agregados afectados.
