# [ADR-0003](0003-variante-obligatoria-productos-fisicos.md) — Variante obligatoria solo para productos físicos

```yaml
id: 0003
title: La variante es obligatoria solo en productos Physical
status: accepted
date: 2026-09-17
decided_by: owner del proyecto
supersedes: []
related_question: [Q-10](../SDD.md#9-cuarta-iteracion-adr-0003-variante-obligatoria-en-fisicos-q-10-c3) ([SDD.md :6 (Preguntas)](../SDD.md))
```

## Contexto

El [ADR-0002](0002-clave-inventario-variantid.md) decidió que el inventario se lleva por `VariantId` (SKU), pero dejó
explícitamente abierto si todo producto debe tener al menos una variante. Sin esa
decisión quedaba un estado inalcanzable (riesgo [R-10](../SDD.md)): un producto `Physical` sin
variantes no puede tener inventario ni reservarse, y el
`InventoryReservationService` no tenía comportamiento definido para ese caso.

El catálogo vigente ([ZENTRIC.md](../../ZENTRIC.md) Dominio 5, [CAT-02](../Domain/06-business-rules.md), [03-value-objects.md](../Domain/02-value-objects.md)) trata
los productos `Digital` como venta final sin logística ni inventario.

## Decisión

**C3 — la variante es obligatoria solo para `ProductType.Physical`.**

- Un producto `Physical` **exige al menos una variante**.
- Un producto `Digital` **puede** nacer sin variantes ([CAT-02](../Domain/06-business-rules.md): sin logística ni
  inventario), y también puede declararlas si el negocio lo requiere.

### Puntos de aplicación (enforcement)

| # | Punto | Regla |
|---|---|---|
| 1 | `Product(...)` con `Physical` y 0 variantes | `ArgumentException` (paramName `variants`) |
| 2 | `Product(...)` con semillas de variante | Se crean vía `AddVariant`, por lo que heredan la unicidad de SKU |
| 3 | `UpdateType(Physical)` | `InvalidOperationException` si el producto no tiene variante |
| 4 | `RemoveVariant(variantId)` | `InvalidOperationException` si dejaría un `Physical` sin variantes no eliminadas |
| 5 | `CanBeSold` | En `Physical` exige al menos una variante **vendible** (activa y no eliminada); en `Digital` no exige variante |

### Sub-decisiones ratificadas (Q-12, Owner 2026-09-27)

Van más allá del texto literal de [Q-10](../SDD.md#9-cuarta-iteracion-adr-0003-variante-obligatoria-en-fisicos-q-10-c3) y quedaron **ratificadas por el Owner el 2026-09-27**. Cada una coincide con lo que el código implementa:

1. `HasVariant` cuenta solo variantes **no eliminadas lógicamente**.
2. `CanBeSold` en `Physical` exige una variante **activa** (una variante
   desactivada no hace vendible al producto).
3. Los productos `Digital` **pueden** declarar variantes ([Q-10](../SDD.md#9-cuarta-iteracion-adr-0003-variante-obligatoria-en-fisicos-q-10-c3) solo dijo que
   *pueden no tener*).
4. La eliminación de la última variante de un `Physical` **lanza
   `InvalidOperationException`** y la variante **no se elimina**: el producto
   conserva su invariante y el error se reporta en el momento, en vez de dejar
   un producto fisico sin ninguna variante vendible.

> **Corrección 2026-09-27:** la sub-decisión 4 se redactó originalmente como
> "no lanza; deja el producto no vendible". El código lanza, y esa es la
> decision ratificada: es preferible un error explicito en el punto de la
> operacion que un producto fisico invalido persistido. Fuente de verdad:
> `Product.RemoveVariant`.

## Alternativas consideradas

| Alternativa | Decisión | Motivo |
|---|---|---|
| **C1. Variante opcional en todos** | Rechazada | Deja el estado inválido que bloqueaba la reserva; el servicio tendría que rechazar en tiempo de ejecución algo que el dominio puede impedir por construcción |
| **C2. Obligatoria en todos** | Rechazada | Contradice [CAT-02](../Domain/06-business-rules.md): obligaría a inventar una variante "unidad" para productos digitales que no tienen logística ni inventario |
| **C3. Obligatoria solo en `Physical`** | **Aceptada** | Es la más fiel al catálogo actual y elimina el estado inválido donde sí importa |

## Consecuencias

- **Positivas:** no existe un producto físico sin unidad de stock; el
  `InventoryReservationService` solo puede recibir productos con variante, así que
  [R-10](../SDD.md) queda cerrado. Los digitales conservan su flujo simple.
- **Negativas / costes:** la creación de un producto físico requiere declarar su
  (al menos una) variante; el alta de catálogo debe conocer el SKU. Se actualizaron
  las pruebas del agregado `Product`.
- **Cambio de API:** el constructor de `Product` incorpora un parámetro opcional
  `variants` con semillas `(Sku, Attributes)` — se usó una tupla de tipos ya
  existentes para no inventar un tipo nuevo en el dominio.
- **Impacto en datos:** ninguno; no hay persistencia todavía.
- **Riesgo residual:** si se confirma otra interpretación en [Q-12](../SDD.md#sub-decisiones-propuesto-ver-q-12), el ajuste se
  limita a `HasVariant`/`CanBeSold` y a las pruebas asociadas.

## Documentos actualizados en la misma decisión

- [backendSDD/Domain/01-models.md](../Domain/01-models.md) — [Product.cs[:2](../Domain/01-models.md#2-bounded-context-catalog-catalogo)](../../backend/Zentric.Domain/Products/Product.cs#L2) (`Product`: regla de variante obligatoria).
- [backendSDD/Domain/06-business-rules.md](../Domain/06-business-rules.md) — nueva **[CAT-03](../Domain/06-business-rules.md)**.
- [SDD.md :6 (Preguntas)](../SDD.md) — [Q-10](../SDD.md#9-cuarta-iteracion-adr-0003-variante-obligatoria-en-fisicos-q-10-c3) resuelta, [Q-12](../SDD.md#sub-decisiones-propuesto-ver-q-12) abierta.
- [SDD.md :6 (Riesgos)](../SDD.md) — [R-10](../SDD.md) cerrada.
- [SDD.md :7 (Estado)](../SDD.md) — [T-010c](../SDD.md) ejecutada.
- [SDD.md :5 (Verificación)](../SDD.md), [current-state.md](../SDD.md),
  [verification-baseline.md :9](../SDD.md#9-cuarta-iteracion-adr-0003-variante-obligatoria-en-fisicos-q-10-c3), [README.md](../../README.md) y overlay de la skill.
- Código: `Zentric.Domain/Products/Product.cs` y
  `Zentric.Tests/Products/ProductTests.cs`.

## Estado

`accepted` — vigente.
