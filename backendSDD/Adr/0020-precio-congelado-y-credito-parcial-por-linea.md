# ADR-0020 — Precio congelado y crédito parcial por línea

- **Estado:** Aceptado
- **Fecha:** 2026-10-04
- **Dictado por:** Owner (grill de la pieza «reembolso parcial», EXC-02)
- **Precisa:** [ADR-0019](0019-cierre-de-decisiones-capa-domain.md) §2 (PED-04)

## Contexto

El precio de una línea del carrito lo enviaba el cliente y el checkout no lo corregía. Sobre esa
línea se calculaba el total del pedido, el comprobante de pago y la factura. El reembolso, además,
**acreditaba el comprobante entero** ante la devolución de una sola línea: el comprador recuperaba
todo el dinero y además conservaba el producto que sí le había llegado.

El grill tocó además un riesgo que el documento no recogía: con precio del cliente, un reembolso
parcial no sería solo incorrecto, sería **explotable** (comprar con precio inflado, devolver y
acreditar la diferencia).

## Decisiones

1. **Entrega parcial con crédito parcial:** si una parte del pedido no puede entregarse, el
   comprador **conserva lo que sí llegó** y el dinero que vuelve cubre solo lo que falta.
2. **Acumulación en el comprobante:** cada devolución suma al `RefundedAmount`; el comprobante pasa
   a `Refunded` solo cuando el acumulado iguala el total, y la suma nunca lo supera (invariante 14).
3. **Orden de trabajo: precio primero.** Sin precio congelado no hay crédito confiable.
4. **El contrato no admite precio.** `AddOrderItemCommand` deja de recibir precio y vendedor; el
   servidor los deduce del producto (`Product.Price`, `Product.VendorId`).
5. **El precio se congela al añadir la línea al carrito**, no al confirmar el checkout: lo que el
   comprador ve es lo que paga dentro de la ventana de 15 minutos (PED-01).
6. **Snapshot mínimo:** la línea guarda el precio unitario; el total de línea es `precio × cantidad`.
   Sin campo de descuento: no hay cupones ni promociones que lo produzcan.
7. **Política de crédito, no cuello de botella:** `RefundPolicyService` (Dominio) acredita
   automáticamente las devoluciones elegibles y escala a revisión del Administrador el resto; el
   Vendedor nunca libera dinero. Las reglas viven en código, con trazabilidad completa de cada
   crédito. **Qué significa «elegible» queda fijado en el addendum de abajo.**

## Alternativas descartadas

- **Devolver el pedido entero** tras el pago: el comprador perdería también lo que sí se entregó.
- **Motor de políticas configurable** en base de datos: es un subsistema que la Ley no describe
  (criterio R-20); las reglas en código crecen sin cambiar el flujo.
- **Reembolso manual para todo** (situación actual): el Administrador como cuello de botella.
- **Recalcular el precio en el checkout**: el comprador pagaría un precio distinto del que aceptó.
- **Guardar el descuento y el total de línea**: campos que siempre valdrían lo mismo o duplicarían
  un cálculo ya determinista.

## Consecuencias de código (pendientes de implementar)

`AddOrderItemCommand` sin `UnitPrice`/`Currency`/`VendorId` y precio tomado de `Product.Price` ·
`OrderItem` con precio inmutable · `PaymentReceipt.Refund` acumulativo con tope en `Amount` ·
importe del crédito = precio congelado × cantidad devuelta · `RefundPolicyService` con reglas en
código · registro de trazabilidad del crédito (devolución, pedido, línea, importe, regla, fecha,
actor, comprobante) · actualización de Swagger, pruebas unitarias, E2E y smoke.

## Reglas de elegibilidad (ADDENDUM — DICTADO POR EL OWNER, 2026-10-05)

Este ADR decía que el servicio acredita «las devoluciones **elegibles**» sin decir nunca cuáles lo son. Queda fijado aquí, dictado por el Owner en el grill de la capa Domain:

**Elegible = la devolución que ya superó lo que la Ley exige.** Es decir:

1. **Las dos conformidades dadas:** Conformidad Física (Logística) y Conformidad Comercial (Vendedor) — [DEV-01](../Domain/06-business-rules.md).
2. **No es digital:** un ítem con `ProductType == Digital` nunca es elegible (Venta Final Irreversible, invariante 12).
3. **Toca una línea concreta del pedido:** el crédito se calcula sobre el precio congelado de esa línea por las unidades devueltas ([PED-04](../Domain/06-business-rules.md)).

Si se cumplen las tres → **crédito automático**. Si falta cualquiera → **escala a revisión del Administrador**.

**Alternativa descartada:** un umbral de importe por encima del cual revisa el Administrador. Se descarta porque **la Ley no da ninguna cifra** y fijarla sería inventarla (criterio R-20).

**Consecuencia:** la doble verificación que ya monta `ADR-0018` **es** la política. No se añade una segunda barrera: el servicio la formaliza en código en lugar de dejarla implícita en el flujo manual.

## Trazabilidad

[PED-04](../Domain/06-business-rules.md) · [EXC-02](../Domain/06-business-rules.md) ·
[DEV-05](../Domain/06-business-rules.md) · [04-invariants-and-rules.md](../Domain/04-invariants-and-rules.md)
(invariantes 14 y 15) · [03-entity-map.md](../Infrastructure/03-entity-map.md)