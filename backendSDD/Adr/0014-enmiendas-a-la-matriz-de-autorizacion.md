# [ADR-0014](0014-enmiendas-a-la-matriz-de-autorizacion.md) — Tres enmiendas a la matriz de roles: quién cancela por quiebre, quién factura y qué es el Supervisor (Q-21c, Q-21d, Q-21e)

```yaml
id: 0014
title: Enmiendas a la matriz de roles (Q-21c, Q-21d, Q-21e)
status: accepted
date: 2026-09-29
decided_by: Owner (las tres confirmadas el 2026-09-29) · implementación y verificación por el agente técnico
relacionado: [ADR-0011](0011-matriz-autorizacion-por-rol.md), [ADR-0013](0013-propiedad-del-recurso-por-rol.md), [Q-21c/Q-21d/Q-21e](../SDD.md#91-preguntas-al-owner-abiertas), [Presentation/02-authorization.md](../Presentation/02-authorization.md)
```

## Contexto

[ADR-0011](0011-matriz-autorizacion-por-rol.md) mapeó las 30 acciones a la Matriz de
Responsabilidades de `ZENTRIC.md` §12. Al hacerlo quedaron tres puntos donde **el texto de la
Ley no alcanza** y la matriz hubo que decidir por fail-closed (el conjunto más pequeño que la
Ley sostiene). Cada uno se registra aquí con su alternativa descartada.

## Enmienda 1 — Q-21c: el Operador Logístico también cancela por quiebre

El ADDENDUM Dominio 8, estado 5 dice "cancelación unilateral **del Vendedor** por falta física de
stock". La política quedó en solo-Vendedor y el Operador recibía `403`.

**Decisión: Vendedor + Operador Logístico.** El ADDENDUM asigna la cancelación al Vendedor como
responsable comercial, pero el faltante lo detecta quien está en la bodega. Leer al Operador como
quien obra en nombre del vendedor allí es lo único que deja la regla operable: ya creaba
despachos, ingresaba stock, inspeccionaba devoluciones y despachaba, y sin esta apertura podía
preparar, recibir y enviar un paquete pero no reportar que la mercancía no está.

| Alternativa | Por qué se descartó |
|---|---|
| **(Vendedor + Operador)** ✅ | Deja ejecutable una regla que la propia Ley creó; consistente con el resto del agregado |
| Solo Vendedor (fail-closed) | El flujo documentado no podría dispararse nunca en la práctica: el Operador encuentra el faltante y no puede actuar |
| Solo Operador | Contradice el texto del ADDENDUM, que nombra al vendedor, y aparta al responsable comercial de una decisión con impacto en el crédito del comprador |

Coste asumido y por qué es aceptable: la cancelación no es silenciosa. El comando reconcilia el
stock fantasma y **crea la devolución obligatoria**, que queda en el historial del pedido y genera
el crédito al comprador. La aserción `CancelByQuiebre_DictatedQ21c_KeepsSellerAndLogisticsOperator`
impide que la apertura se deshaga sin que alguien lo decida.

## Enmienda 2 — Q-21d: solo el Administrador emite las facturas

`POST /api/billing/invoices/generate/{orderId}` emite **los tres documentos** del ADDENDUM
Dominio 9: Factura Maestra, Detalle Zentric (la comisión de la plataforma) y una Factura de
Vendedor por cada participante del split.

**Decisión: se mantiene solo Administrador.** El `ZentricDetail` es, por definición del
ADDENDUM, "control de plataforma": permitir que un vendedor lo emitiera le daría la capacidad de
documentar la comisión de Zentric.

| Alternativa | Por qué se descartó |
|---|---|
| **(Solo Administrador)** ✅ | La emisión de documentos financieros es un acto de plataforma y queda en un solo sitio auditable |
| Vendedor + Administrador | No es cambiar una política: exige **partir el caso de uso** en dos (el vendedor emitiría solo su Factura de Vendedor; la plataforma, la Maestra y el Detalle). Es una épica propia, no una enmienda de la matriz |
| Solo Vendedor | Rompe la Factura Maestra del comprador y el control de la comisión |

**Dos guardas que la spec del endpoint ya prometía y que no existían**, añadidas con este
dictamen: `GenerateInvoicesCommandHandler` no comprobaba que el pedido estuviera pagado ni que no
estuviera ya facturado, de modo que **un segundo clic o un reintento del frontend duplicaba las
tres facturas** y se podía facturar un carrito sin pagar. Cubierto por
`GenerateInvoicesCommandHandlerTests` (4 casos; el de "no pagado" es un `Theory` de tres estados).

**Corrección de la spec:** `Presentation/02-authorization.md` §6 atribuía el botón de facturación
al **módulo del Vendedor**. Es el **módulo del Comprador** (`Frontend-Role-Modules.md` línea 68,
tabla de `modules/buyer/`). El botón va en el módulo del Administrador.

## Enmienda 3 — Q-21e: el Supervisor es un rol de solo lectura y auditoría

`UserRole` tiene cinco valores y `ZENTRIC.md` §5 los define; `Frontend-Role-Modules.md` línea 6
declara "**cuatro** roles". El Supervisor tenía permisos de lectura en el backend y ninguna
pantalla donde usarlos.

**Decisión: el Supervisor se queda, es de solo lectura y no tiene módulo propio.** La Ley lo
define, así que el documento desactualizado es el del cliente, no el enum.

| Alternativa | Por qué se descartó |
|---|---|
| **Rol de solo lectura, sin módulo propio; documento a cinco roles** ✅ | Coherente con la Ley y con lo que el backend ya hace; el Supervisor usa las pantallas compartidas de solo lectura |
| Crearle un módulo de solo lectura | Es alcance de producto del frontend, y además exige endpoints de **listado** que la API no tiene: no existe `GET /api/Logistics/fulfillment` de listado (R-03) |
| Eliminar el rol del enum | Contradice `ZENTRIC.md` §5, que es la Ley intocable; sería un cambio de lenguaje ubicuo, no una corrección |

**Corrección de evidencia (obligatoria):** la etiqueta `[CONFIRMADO] §12 "Gestión de Pedidos" con
palomita en los cinco` puesta en `OrderRead`, `FulfillmentRead` y `ReturnRead`
**sobredeclara la Ley**: la Matriz §12 tiene cuatro columnas (Comprador, Vendedor, Op. Logístico,
Admin) y no incluye al Supervisor ni marca ✔ al Admin. La base real de esa lectura es el dictamen
de Q-21 ("Admin y Supervisor solo lectura"), no el texto de §12. Corregido en la tabla de
[Presentation/02-authorization.md §2](02-authorization.md); los comentarios de
`AuthorizationPolicies.cs` ya lo decían bien y se dejan como estaban.

## Consecuencias

- Q-21 queda **cerrada por completo**: sus cuatro sub-preguntas (b, c, d, e) tienen dictamen.
- El Operador puede reportar stock fantasma; el módulo de logística del cliente (§2.5) gana esa
  acción, que hoy está documentada pero recibiría `403`.
- La emisión de facturas queda en un único sitio auditable y no se puede duplicar.
- El Supervisor deja de ser un rol sin destino en el contrato del cliente.

## Verificación

- `dotnet build Zentric.slnx -warnaserror` → **0 warnings, 0 errores**.
- `dotnet test Zentric.slnx` → **395/395** (388 previos + 1 aserción de la matriz por el dictamen
  Q-21c + 6 de facturación por el dictamen Q-21d).
- Smoke: el caso `POST /api/logistics/fulfillment/cancel-ghost-stock` con token de Operador pasa de
  `403` a "abierto", y las 69 comprobaciones siguen en verde contra PostgreSQL real en Docker.
- **Trampa al repetir la verificación:** `docker compose up -d --force-recreate` **no** actualiza el
  código, porque reutiliza la imagen ya construida. Durante esta corrida el smoke dio un `403` falso
  (el Operador seguía rechazado) contra un contenedor con el binario viejo. La API corre desde
  `/app` —no de `/app/publish`, que es solo el directorio intermedio del `Dockerfile`—, así que para
  refrescar en local: `dotnet publish backend/Zentric.Api -c Release -o <dir>` y
  `docker cp <dir>/. zentric-api:/app` + `docker restart zentric-api`. Con
  `docker compose up -d --build api` también vale, si el build alcanza a terminar.

