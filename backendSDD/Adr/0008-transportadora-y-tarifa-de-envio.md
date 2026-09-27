# [ADR-0008](0008-transportadora-y-tarifa-de-envio.md) — Envío: transportadora propia, tarifa a definir, sin implementación

```yaml
id: 0008
title: Política de envío decidida y aplazada; no se implementa código todavía
status: accepted (implementation deferred)
date: 2026-09-27
decided_by: owner del proyecto
relacionado: [INVARIANTE 7](../Domain/04-invariants-and-rules.md), [FlatShippingFee](../Domain/02-aggregates-and-entities.md)
```

## Contexto

El invariante 7 del SDD ya presupone una `FlatShippingFee` (Tarifa Plana de Envío) dentro
del total del `CustomerOrder`, y la entidad `Shipment` ya existe para una guía por bodega de
origen. Pero **falta decidir la política concreta**: quién transports, cuánto cobra el envío y
quién lo paga.

`ZENTRIC.md` **no menciona** envío, transportadora, guía ni costo. Este ADR no pretende
inventar esa Ley: registra una decisión de negocio tomada por el Owner.

## ADDENDUM - DICTADO POR OWNER (2026-09-27)

1. **Transportadora:** la propia Zentric. Una única transportadora, de nombre "Zentric".
2. **Número de guía:** obligatorio. Se genera **sí o sí** en cada despacho; no es opcional ni
   queda pendiente de un tercero.
3. **Quién paga el envío:** **lo paga el cliente**, no Zentric. El envío noAbsorbe margen de
   la plataforma.
4. **Tarifa:** **tarifa fija**. No se calcula por peso ni por tamaño, porque el sistema no
   modela ubicación geográfica y no puede calcular una tarifa realista por dimensión.
5. **Implementación:** **aplazada**. No habrá módulo de envío en el corto plazo; el Owner
   estima que la funcionalidad arrive **en algunos años**.

## Consecuencias

**Lo que este ADR NO hace:** no añade código, endpoints, columnas ni migraciones de envío.
El Owner decidió explícitamente aplazar la implementación, y escribir código ahora sería
construir algo que todavia no se sabe como se cobrara.

**Lo que sí fija, para que no se pierda:**

| Decisión | Efecto futuro |
|---|---|
| Transportadora única Zentric | No habrá integración con terceros; el modelo de guías es propio |
| Guía obligatoria | `Shipment` debe tener guía **no nula** cuando se implemente |
| Lo paga el cliente | El envío se agrega al total del pedido como línea aparte, no como comisión |
| Tarifa fija | No se necesita peso, volumen ni matriz de zonas, lo que simplifica el modelo |
| Sin implementación | `FlatShippingFee` sigue siendo una decisión de diseño documentada, no una funcionalidad |

**Deuda que este ADR deja explícita:** la tarifa fija **no tiene valor definido**. Cuando se
implemente, el Owner deberá dictar la cifra y si cambia por zona, por peso o por promotion.
Hasta ese momento, ningún código debe asumir un importe de envío.

## Nota de alcance

El lote 5 del plan de trabajo contemplaba implementar envío. Se cierra **sin código**, en
respeto de la decisión 5. Si el Owner cambia de opinión, este ADR es el punto de partida y
debe actualizarse antes de escribir la primera línea de implementación.
