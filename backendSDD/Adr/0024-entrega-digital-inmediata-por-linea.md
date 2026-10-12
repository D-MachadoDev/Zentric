# ADR-0024 — La entrega digital es inmediata al pago y se registra por línea

- **Estado:** Aceptado
- **Fecha:** 2026-10-05
- **Dictado por:** Owner (grill de la capa Domain, Q3 → Q5 y Q6)
- **Modifica:** las marcas de entrega digital de [06-business-rules.md](../Domain/06-business-rules.md) y la salida de `FulfillmentOrder` en [07-lifecycle.md](../Domain/07-lifecycle.md)
- **Precisa:** [ADR-0018](0018-devoluciones-confianza-recepcion-responsabilidad.md) (inspección y recepción)

## Contexto

La Ley (línea 163) es literal:

> Para los productos digitales, el cliente **recibe su producto al instante una vez pago, inmediata entrega tras pago, paralela a la entrega física**.

Eso no encaja en el ciclo logístico. `FulfillmentOrder` espera el despacho, la guía, el transporte y la recepción — que es exactamente lo contrario de *inmediato*. Meter el digital ahí sería hacerle esperar un trámite que la Ley prohíbe esperar.

Quedaba además sin decidir **la granularidad**: un registro para todo el pedido, uno por vendedor, o uno por línea.

## Alternativas consideradas

| | Opción | Por qué se descartó |
|---|---|---|
| **A** | **Un registro por línea digital**, marcado al aprobar el pago | — **Elegida** |
| **B** | Un único registro para todo el pedido | Si un PDF falla, no se puede responder **cuál**: se pierde el vínculo con la variante |
| **C** | Un registro por vendedor | **En este sistema una línea pertenece a un solo vendedor** (`VendorId` vive en la línea, Q-18). El vendedor no compra digitales: agrupar por él mezcla a quien vende con quien recibe |

## Decisiones

1. **Un registro de entrega por línea digital**, con pedido, línea, variante, fecha, actor y comprobante.
2. **Se marca al aprobar el pago**, no al despachar. Es la traducción literal de «inmediata entrega tras pago».
3. **No pasa por `FulfillmentOrder`** ni por el ciclo logístico: ese ciclo es para lo físico.
4. **En paralelo con lo físico.** Un pedido mixto entrega el digital en el acto y hace esperar al físico; ninguno bloquea al otro.
5. **La unidad es la variante**, que es la unidad de stock y de devolución ([INV-03](../Domain/06-business-rules.md)).

## Consecuencias

- **Si en un pedido hay dos digitales de dos vendedores, hay dos registros** — y el comprador los ve juntos en su vista. Cada reclamación «ese PDF no llegó» apunta a una línea concreta.
- La **prohibición de devolución digital** (invariante 12, Venta Final Irreversible) gana un registro sobre el que apoyarse.
- El ciclo de vida de `FulfillmentOrder` queda intacto: solo lo físico lo recorre.
