# [ADR-0001](0001-reserva-fragmentacion-contingencia.md) — Reserva de inventario: bodega única con fraccionamiento de contingencia

```yaml
id: 0001
title: Reserva de inventario con bodega única y fraccionamiento de contingencia
status: accepted
date: 2026-09-17
decided_by: owner del proyecto
supersedes: []
related_contradiction: [C-01](../SDD.md) ([SDD.md :6 (Riesgos)](../SDD.md))
```

## Contexto

La especificación de dominio contenía dos reglas incompatibles para la reserva de
stock distribuido:

- [backendSDD/Domain/04-invariants-and-rules.md](../Domain/04-invariants-and-rules.md) ([invariante 3](../Domain/04-invariants-and-rules.md)): "No Fraccionamiento de
  Variante… toda la cantidad debe surtirse desde **una (1) sola bodega**… Los
  envíos de un mismo SKU no se dividen para evitar costos exorbitantes."
- [backendSDD/Domain/06-business-rules.md](../Domain/06-business-rules.md) ([INV-02](../Domain/06-business-rules.md)) y
  [backendSDD/Domain/services/inventory-reservation-service.md :4](../Domain/services/inventory-reservation-service.md#4-flujo-logico-y-reglas-invariantes): el servicio "tiene
  permitido **fraccionar** la reserva en ambas bodegas".

Esto bloqueaba cualquier implementación del `InventoryReservationService`, del
agregado de inventario y del `OrderSplitterService`, porque definen de forma
incompatible cuántas guías de despacho se generan y cómo se compensa un fallo.

## Decisión

Se adopta el modelo **híbrido (A3)**:

1. **Regla base:** si existe **una** bodega individual cuyo `AvailableQuantity`
   cubra la cantidad total solicitada, la reserva se realiza íntegramente en esa
   bodega. El envío **no** se divide.
2. **Umbral exacto de la excepción:** solo si **ninguna** bodega individual cubre
   la cantidad solicitada, se permite fraccionar la reserva entre varias bodegas,
   ordenadas de mayor a menor stock disponible.

   > **Corrección 2026-09-30 (V-02, dictamen del Owner: "el código está bien,
   > se cambia la especificación").** Este punto ordenaba además las bodegas
   > "respetando la prioridad de bodega `Marketplace` sobre `Vendor`". Esa
   > preferencia **se retira**: el agregado `Inventory` no transporta el tipo de
   > bodega, de modo que la regla era inaplicable y el servicio ha funcionado
   > desde siempre con el orden por mayor stock. Con `VendorId = User.Id`
   > (Q-21b, P1) el dueño del stock es el dueño del **producto**, de modo que el
   > tipo de bodega no identifica un origen de mercancía distinto, sino quién
   > opera el almacén; priorizar por él habría alterado el resultado sin alterar
   > la propiedad. Fuente de verdad vigente:
   > `Zentric.Domain/Inventories/Services/InventoryReservationService.cs`.
3. **Fallo y compensación:** si la suma de todas las bodegas es menor que la
   cantidad solicitada, la operación falla y se liberan las reservas parciales
   calculadas en esa misma transacción (rollback virtual).
4. **Efecto logístico:** cuando hubo fraccionamiento, se generan múltiples
   `Shipment` (una guía por bodega de origen) dentro del `FulfillmentOrder` del
   vendedor.

Ejemplos normativos (bodega A = 6, bodega B = 4):

| Cantidad solicitada | Resultado |
|---|---|
| 5 | Una sola bodega (A) — no se divide |
| 10 | Fraccionamiento 6 + 4 — dos `Shipment` |
| 12 | Falla: la suma (10) no alcanza; no se reserva nada |

## Alternativas consideradas

| Alternativa | Motivo de rechazo |
|---|---|
| **A1. Prohibir siempre el fraccionamiento** | Obligaría a rechazar o recortar compras válidas cuando el stock existe pero está distribuido, degradando la experiencia de compra y la venta |
| **A2. Permitir siempre el fraccionamiento** | Multiplica envíos y costos logísticos en casos evitables; contradice el objetivo declarado de "evitar costos exorbitantes" |
| **A3. Híbrido (elegido)** | Cubre ambos objetivos: minimiza envíos cuando es posible y no pierde ventas cuando el stock está fragmentado |

## Consecuencias

- **Positivas:** regla única y verificable; se evitan envíos innecesarios; no se
  pierden ventas por stock distribuido.
- **Negativas / costes:** el `InventoryReservationService` debe devolver el
  desglose de reservas por bodega (`ReservationDetails`), y `OrderSplitterService`
  debe crear N `Shipment` cuando hubo fraccionamiento. Aumenta la complejidad de
  la compensación (liberar N reservas parciales ante fallo).
- **Impacto en pruebas:** se requieren casos para "una bodega cubre", "ninguna
  cubre pero la suma alcanza" y "la suma no alcanza".
- **Impacto en datos:** ninguno inmediato; no hay persistencia implementada aún.

## Documentos actualizados en la misma decisión

- [backendSDD/Domain/04-invariants-and-rules.md](../Domain/04-invariants-and-rules.md) — [invariante 3](../Domain/04-invariants-and-rules.md) reescrita.
- [backendSDD/Domain/06-business-rules.md](../Domain/06-business-rules.md) — [INV-02](../Domain/06-business-rules.md) reescrita.
- [backendSDD/Domain/services/inventory-reservation-service.md](../Domain/services/inventory-reservation-service.md) — reglas de prioridad,
  bodega única y fraccionamiento de contingencia.
- [SDD.md :6 (Riesgos)](../SDD.md) — [C-01](../SDD.md) cerrada.
- [SDD.md :6 (Preguntas)](../SDD.md) — [Q-01](../SDD.md#q-01-c-01-se-permite-fraccionar-la-reserva-entre-bodegas-resuelta-2026-09-17) resuelta.
- [SDD.md :7 (Estado)](../SDD.md) — [T-004](../SDD.md)/[T-013](../SDD.md)/[T-014](../SDD.md) desbloqueadas
  respecto a [Q-01](../SDD.md#q-01-c-01-se-permite-fraccionar-la-reserva-entre-bodegas-resuelta-2026-09-17).

## Estado

`accepted` — vigente. Sustituye a la [invariante 3](../Domain/04-invariants-and-rules.md) original y a [INV-02](../Domain/06-business-rules.md) original.
