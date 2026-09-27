# [ADR-0002](0002-clave-inventario-variantid.md) — Clave del inventario: VariantId (SKU)

```yaml
id: 0002
title: La clave del inventario es VariantId (SKU)
status: accepted
date: 2026-09-17
decided_by: owner del proyecto
supersedes: []
related_contradiction: [C-02](../SDD.md) ([SDD.md :6 (Riesgos)](../SDD.md))
```

## Contexto

La especificación de dominio definía la clave del inventario de dos formas
incompatibles:

- [backendSDD/Domain/02-aggregates-and-entities.md :3](../Domain/02-aggregates-and-entities.md#3-inventory-module) y [backendSDD/Domain/03-value-objects.md](../Domain/02-value-objects.md):
  el inventario se lleva por `VariantId` ("Tiene su propio `VariantId` (que sirve
  como SKU para el inventario)"), y [Product.cs[:2](../../backend/Zentric.Domain/Products/Product.cs#L2) define `ProductVariant` como entidad hija
  que "maneja las combinaciones (ej. Talla/Color)".
- [backendSDD/Domain/01-models.md :3](../Domain/01-models.md#3-bounded-context-inventory-inventario-y-bodegas) y [ZENTRIC.md](../../ZENTRIC.md) Dominio 6: el inventario está
  "vinculado a un producto y una bodega". El código existente usaba
  `Inventory.ProductId`.

Esto bloqueaba el agregado de inventario, el `InventoryReservationService`, el
`OrderSplitterService` y los puertos de persistencia.

## Decisión

**El inventario se lleva por variante.** Se adopta el modelo de marketplace real:

1. Se crea la entidad hija `ProductVariant` dentro del agregado `Product`
   (el agregado controla su ciclo de vida).
2. `ProductVariant.Id` **es** el `VariantId` y actúa como **SKU** del inventario.
3. `Inventory.VariantId` sustituye a `Inventory.ProductId`. La clave de stock es
   la pareja `(VariantId, WarehouseId)`.
4. La variante se compone de **atributos** (`VariantAttribute`: nombre + valor,
   ej. `Talla=M`, `Color=Rojo`), que representan las combinaciones de la spec.
5. El SKU es único **dentro del producto** (invariante del agregado). La unicidad
   global del SKU queda para la capa de persistencia (fase `Infrastructure`).

**No se decide** aquí si todo producto debe tener al menos una variante: esa era
la opción B3, no elegida. Se registra como pregunta abierta **[Q-10](../SDD.md#9-cuarta-iteracion-adr-0003-variante-obligatoria-en-fisicos-q-10-c3)**.

## Alternativas consideradas

| Alternativa | Decisión | Motivo |
|---|---|---|
| **B1. Inventario por `ProductId`** (sin `ProductVariant`) | **Rechazada** | Impide controlar stock por talla/color, que la spec de catálogo exige; obligaría a rehacer la clave al introducir variantes |
| **B2. Inventario por `VariantId`** (elegida) | **Aceptada** | Modelo de marketplace real; alinea catálogo, inventario y logística bajo el mismo identificador |
| **B3. `ProductVariant` obligatoria** (toda producto tiene ≥1 variante) | **Aplazada** | Coherente a largo plazo, pero decide sobre la obligatoriedad del catálogo, fuera del alcance de esta decisión. Ver [Q-10](../SDD.md#9-cuarta-iteracion-adr-0003-variante-obligatoria-en-fisicos-q-10-c3) |

## Consecuencias

- **Positivas:** un único identificador (SKU) conecta catálogo, inventario,
  pedidos y logística; el stock se controla por combinación real de venta.
- **Negativas / costes:** el inventario exige que la variante exista antes de
  registrar stock; el catálogo y la reserva deben crearse con la variante como
  unidad. Las pruebas del agregado de inventario se migraron de `ProductId` a
  `VariantId`.
- **Deuda declarada:** `VariantId` y `ProductVariant.Id` son `Guid` planos, no un
  `record struct VariantId`. La conversión a IDs fuertemente tipados corresponde a
  G-07 / [T-004](../SDD.md) y se ejecuta de forma consistente para todo el dominio, no solo
  para este caso. Ver [spec-conformance-matrix.md](../SDD.md).
- **Impacto en datos:** ninguno; no hay persistencia ni datos productivos.
- **Riesgo abierto:** un producto físico sin variantes no puede tener inventario.
  Ver [Q-10](../SDD.md#9-cuarta-iteracion-adr-0003-variante-obligatoria-en-fisicos-q-10-c3) antes de implementar `InventoryReservationService`.

## Documentos actualizados en la misma decisión

- [backendSDD/Domain/01-models.md](../Domain/01-models.md) — [:2](../Domain/01-models.md#2-bounded-context-catalog-catalogo) (variantes) y [:3](../Domain/01-models.md#3-bounded-context-inventory-inventario-y-bodegas) (`VariantId`).
- [backendSDD/Domain/02-aggregates-and-entities.md](../Domain/02-aggregates-and-entities.md) — [:3](../Domain/02-aggregates-and-entities.md#3-inventory-module) (`VariantId`).
- [backendSDD/Domain/06-business-rules.md](../Domain/06-business-rules.md) — nueva [INV-03](../Domain/06-business-rules.md) (unidad de stock).
- [backendSDD/Domain/services/inventory-reservation-service.md](../Domain/services/inventory-reservation-service.md) — entrada por variante.
- `SDD.md (consolidado)` — [C-02](../SDD.md) cerrada, [Q-02](../SDD.md#q-02-c-02-la-clave-del-inventario-es-el-producto-o-la-variante-sku-resuelta-2026-09-17) resuelta, G-08 cerrada, roadmap,
  matriz de conformidad, estado actual y evidencia de verificación.
- Código: `Zentric.Domain/Products/ProductVariant.cs`,
  `Zentric.Domain/Products/ValueObjects/VariantAttribute.cs`,
  `Zentric.Domain/Products/Product.cs`, `Zentric.Domain/Inventories/Inventory.cs`
  y las pruebas correspondientes en `Zentric.Tests`.

## Estado

`accepted` — vigente. Sustituye a la clave `ProductId` del inventario.
