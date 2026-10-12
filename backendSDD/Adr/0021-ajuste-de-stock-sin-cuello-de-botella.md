# ADR-0021 — Ajuste de stock sin cuello de botella (INV-04)

- **Estado:** Aceptado
- **Fecha:** 2026-10-04
- **Dictado por:** Owner (grill de la capa Domain, INV-04)
- **Precisa:** [ADR-0019](0019-cierre-de-decisiones-capa-domain.md) §5
- **Ley:** Dominio 6, «Movimientos: Ingreso, Reserva, Salida por venta, **Ajuste** y Devolución»

## Contexto

La Ley lista `Ajuste` como uno de los cinco movimientos de inventario, pero el dominio no tiene ningún método que lo aplique. La regla que sí estaba escrita («solo el Administrador ajusta, siempre con motivo escrito») se tambalea en cuanto se pregunta **en qué se basa**: el Administrador no tiene más información que el Vendedor. Si nadie observa físicamente la bodega del vendedor, aprobar su declaración no es control, es trámite con demora —y crea un punto de presión sin ninguna garantía.

El riesgo real va en la dirección contraria a la que se suele temer: **un Vendedor podría declarar stock que no tiene y Zentric vendería stock fantasma.** Y al revés: si nadie puede reducir el stock declarado, la merma física es invisible para siempre.

## Alternativas consideradas

| | Opción | Por qué se descartó |
|---|---|---|
| **A** | **Evidencia según tipo de bodega.** Bodega Marketplace: conteo del Operador Logístico y Zentric ajusta solo. Bodega Vendedor: la reducción exige evidencia (conteo o evento conocido) y se registra sin autorización previa. El Administrador audita reincidentes, no aprueba ajustes | — **Elegida** |
| **B** | Ajuste libre con motivo, cualquiera lo declara | Sin evidencia cualquiera puede **inflar** stock y provocar venta fantasma: el gemelo olvidado de `EXC-01` |
| **C** | Mantener la autorización del Administrador | El Admin no puede verificar más que el Vendedor; añade demora y falsa confianza sin seguridad real |
| **D** | Eliminar el movimiento `Ajuste` de la Ley | La Ley lo lista explícitamente en el Dominio 6; eliminarlo exige addendum y deja la merma sin registrar |

## Decisiones

1. **El ajuste al baja solo existe con evidencia.** Tres fuentes válidas: un **conteo físico** registrado por el Operador Logístico, o un evento que Zentric ya conoce (`EXC-01` stock fantasma, una devolución). No hay una cuarta vía.
2. **Nadie autoriza el ajuste.** El sistema lo registra. Se acaba el cuello de botella: el Vendedor deja de esperar una respuesta que no le quita de encima la responsabilidad de lo que declaró.
3. **La asimetría es deliberada:** *al alza* es el `Ingreso` normal, una declaración del Vendedor (ya funciona). *A la baja* exige evidencia, porque una declaración sin comprobar destruye el inventario.
4. **El Operador Logístico es el observador, no el Vendedor.** Es quien está físicamente en la bodega y no gana nada declarando el conteo, a diferencia del Vendedor.
5. **Todo ajuste queda auditado:** actor, motivo escrito, fecha e historial, siempre.
6. **En bodega de Vendedor no hay verificación previa, y eso es una decisión, no una carencia.** La protección es *detección* (`EXC-01` al empacar, con crédito parcial al comprador), *coste* y *auditoría posterior*.
7. **`StockFantasmaRate` por Vendedor** como indicador, para que el bloqueo por `INV-05` se apoye en reincidencia medida y no en una amenaza abstracta.

## Consecuencias

- Se introduce el **conteo físico** como concepto. No es un movimiento nuevo —`Ajuste` ya existe en el Dominio 6—, sino la **evidencia** que lo justifica.
- El Administrador deja de aprobar ajustes uno a uno. Su rol pasa a ser **auditar** conteos y sancionar reincidentes, que es un trabajo distinto y de bajo volumen.
- `StockFantasmaRate` queda **documentado y no implementado**: medarlo exige que el bloqueo y las incidencias sean contables, lo que toca a `User`.