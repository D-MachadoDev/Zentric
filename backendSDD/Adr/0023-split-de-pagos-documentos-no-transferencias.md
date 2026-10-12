# ADR-0023 — El split de pagos se cumple con documentos, no con transferencias de dinero

- **Estado:** Aceptado
- **Fecha:** 2026-10-05
- **Dictado por:** Owner (grill de la capa Domain, Q1 → Q4)
- **Modifica:** la regla `R-20` de [06-business-rules.md](../Domain/06-business-rules.md) y su marca en [orchestrator-state.md](../orchestrator-state.md)
- **Precisa:** [ADR-0018](0018-devoluciones-confianza-recepcion-responsabilidad.md) (responsabilidad económica)

## Contexto

El `Dominio 9` de la Ley (línea 246) describe el split así:

> Cada transacción genera tres documentos: la **Factura de Vendedor**, la **Factura Maestra** y el **Detalle Zentric**.

La spec marcaba `R-20` como **[NO IMPLEMENTADO]** porque «no hay pagos ni cobros entre Zentric y los vendedores». Ese marcador confundía dos cosas distintas: lo que la Ley **pide** y un mecanismo que la Ley **no pide**. Nadie paga nada a nadie — pero la Ley tampoco pide que nadie pague.

## Alternativas consideradas

| | Opción | Por qué se descartó |
|---|---|---|
| **A** | Cumplir la Ley con los tres documentos y **no** construir transferencias | — **Elegida** |
| **B** | Construir ledger de saldos y pagos a vendedores | Mecanismo que la Ley no describe. Criterio **R-20**: no se inventan mecanismos que la Ley no pide |
| **C** | Dejar el marcador abierto | Una marca que parece deuda cuando en realidad es una decisión ya tomada |

## Decisiones

1. **La Ley pide documentos, y los tres existen:** `InvoiceType.VendorDetail` (Factura de Vendedor), `InvoiceType.Master` (Factura Maestra) y `InvoiceType.ZentricDetail` (Detalle Zentric). La regla queda **cumplida**.
2. **No se construyen transferencias de dinero ni liquidación a vendedor.** Es un subsistema que la Ley no describe.
3. **La responsabilidad económica del vendedor es contable, no de pagos.** `ADR-0018` la define como «quién absorbe el costo»; no implica que exista un canal de pago hacia él.
4. **El marcador de `R-20` pasa de deuda a decisión.** Deja de leerse como algo pendiente de implementar.

## Consecuencias

- `R-20` queda cerrado sin tocar código: ya se emitían los tres documentos (`GenerateInvoicesCommand`).
- Si la Ley añade en el futuro un reparto efectivo de dinero, este ADR se reabre con la cita correspondiente.
- **No se modifica la Ley**: el ADR solo registra que la exigencia ya está satisfecha y que construir más sería inventar.
