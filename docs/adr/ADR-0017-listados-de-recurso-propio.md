# ADR-0017 — Listados de recurso propio: el filtro lo decide el rol

- **Estado:** Aceptado
- **Fecha:** 2026-09-30
- **Dictado por:** Owner (completitud funcional para el frontend)

## Contexto

La auditoría de completitud del backend (2026-09-30) encontró que de 34 endpoints, **cinco
recursos no se podían enumerar**: pedidos, despachos, devoluciones, facturas e inventario. Todos
existían únicamente por `GET .../{id}`, de modo que solo se abrían si ya se conocía el GUID.

Para el frontend esto no era un inconveniente menor: las pantallas de «mis pedidos», la cola de
despacho del Operador, la bandeja de devoluciones, «mis facturas» y el panel de inventario eran
literalmente imposibles de construir. Un recurso que no se puede enumerar no está terminado,
porque no hay de dónde sacar la lista.

El riesgo evidente era el contrario: añadir listados que devolvieran todo y dejaran el filtrado
al frontend. Eso es una ilusión de seguridad — los datos ya salieron del servidor— y además rompe
una regla que el proyecto ya tenía decidida.

## Decisión

Se añaden cinco endpoints de listado. Todos comparten seis reglas:

1. **El filtro lo decide el rol, no un parámetro.** No existe forma de pedir los recursos de otro:
   el parámetro no existe. Esto es más fuerte que filtrar: no hay contrato que lo permita.
2. **El rol se resuelve en Application; el repositorio recibe identificadores ya resueltos.** Si el
   filtro viviera en el repositorio, bastaría un endpoint nuevo que lo olvidara para abrir una vía
   de fuga. Así es imposible por construcción.
3. **El filtro se aplica EN la consulta, nunca después de traerlo todo.** Traer todo y descartar en
   memoria da el mismo resultado *visible* y mueve por la base exactamente lo que la propiedad
   oculta. El resultado no sería incorrecto; la superficie de datos sí.
4. **Un estado desconocido responde `400`, no la lista completa.** Devolver todo mientras el
   usuario cree estar filtrando es el peor fallo posible de un endpoint de listado: el fallo es
   invisible y el usuario confía en un filtro que no existe.
5. **Los DTO son los mismos que los del detalle.** El mismo dato no puede tener dos formas según la
   pantalla desde la que se pida.
6. **El listado es nunca más restrictivo que el detalle.** Donde el detalle ya dejaba ver un recurso
   (Comprador en despachos), el listado lo deja también: si no, el usuario tendría que conocer un
   GUID para ver algo que su propia lista niega existir.

### Reparto por rol

| Recurso | Comprador | Vendedor | Operador / Admin / Supervisor |
|---|---|---|---|
| Pedidos | los suyos | los que tienen línea suya | todos |
| Despachos | los de sus pedidos | los suyos | todos |
| Devoluciones | los de sus pedidos | los de sus variantes | todos |
| Facturas | solo Factura Maestra propia | solo sus `VendorDetail` | todos (`BillingRead` **no** incluye al Operador) |
| Inventario | — | el de sus productos | todos |

## Consecuencias

**A favor**

- El frontend deja de tener cinco pantallas imposibles.
- La propiedad del recurso se mantiene en el servidor, que es donde puede garantizarse.
- Los listados no introducen una segunda puerta: el rol se decide en un solo sitio.

**En contra / coste asumido**

- Cinco métodos nuevos en puertos, cinco en repositorios y cinco handlers. Es deuda a cambio de
  que el recurso sea usable.
- Sin paginación: hoy se devuelve la lista completa. **Se acepta de forma consciente** y es el
  siguiente punto a resolver cuando haya volumen real que lo justifique. Paginando hoy se fijaría un
  contrato especulativo sin datos que lo respalden.

## Alternativas descartadas

| Alternativa | Por qué se descartó |
|---|---|
| Listado sin filtro, filtrar en el frontend | Los datos ya salieron del servidor. Es una ilusión de seguridad y viola la propiedad cruzada de recursos. |
| Parámetro `?sellerId=` / `?buyerId=` | Reabre la enumeración: cualquiera podría pedir los de otro. El filtro por rol es más estricto y más simple. |
| Paginación desde el primer día | Fijaría `pageSize` y forma de respuesta sin datos reales que lo justifiquen. Se difiere hasta haber volumen. |
| Un único endpoint `/api/listados?recurso=X` | Mezclaría cinco políticas de autorización en un solo lugar y haría imposible auditarlas. |

## Verificación

Cada listado tiene pruebas E2E por HTTP real que comprueban, por un lado, que cada rol **ve** lo
suyo, y por otro, que **no ve** lo ajeno. La contraprueba es la importante: un listado que
respondiera `200` sin filtrar es el fallo que estas pruebas existen para cazar.
---

## Regla vigente

**Este ADR no es la especificacion: guarda el PORQUE de la decision, no el QUÉ debe hacer el sistema.**
La regla tal como hay que implementarla vive en la especificación del proyecto, con su enunciado, sus
puntos de aplicacion y sus invariantes.

Si este documento y la spec discrepan, la spec manda y este ADR se actualiza. Si la spec contradice
a la Ley, manda la Ley y la spec se repara.
