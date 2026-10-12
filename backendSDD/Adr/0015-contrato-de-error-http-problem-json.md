# ADR-0015 · Contrato de error HTTP: `application/problem+json` obligatorio

- **Estado:** ACEPTADO
- **Fecha:** 2026-10-01
- **Dicta:** agente (decisión técnica). No es requisito de negocio: la Ley no fija cabeceras.
- **Resuelve:** el incumplimiento silencioso de AGENTS.md §3.4 que destaparon las pruebas E2E (T-032)

## Contexto

AGENTS.md, sección 3.4, exige que la capa de presentación mapee los fallos a respuestas
consistentes "usando RFC 7807 Problem Details". El **cuerpo** cumplía: `ProblemDetails` con
`status`, `title`, `detail`. La **cabecera** no: los errores salían como `application/json`.

El defecto llevaba tiempo oculto por dos razones. La primera es que las pruebas existentes
comprobaban la *forma* del objeto (`Assert.IsType<ProblemDetails>`), nunca la respuesta por HTTP.
La segunda es que en desarrollo se consume desde el navegador, donde el tipo de contenido no
importa para leer un `detail`.

## Decisión

Toda respuesta cuyo cuerpo sea `ProblemDetails` se serializa como `application/problem+json`,
**con o sin cabecera `Accept` en la petición**. Se aplica por igual a los tres caminos de error
que existen en el proyecto:

| Camino | Mecanismo |
|---|---|
| Fallo de negocio | `ResultMapping.ToProblem()` |
| Fallo de enlace del cuerpo | `InvalidModelStateResponseFactory` (`[ApiController]`) → `ValidationProblemDetails` |
| Token ausente o rol insuficiente | 401/403 sin cuerpo del middleware de autorización (no aplica) |

## Alternativas descartadas

1. **Fijar solo `ObjectResult.ContentTypes`.** Fue lo primero que se probó y **no funciona**:
   cuando el cliente no envía `Accept` —como hace `HttpClient`— la negociación de contenido
   descarta los tipos declarados y usa el primero que sepa el formateador. Se comprobó en la
   suite: el filtro se registraba y su mutación era correcta, y la respuesta seguía saliendo
   `application/json`.
2. **Filtro `IResultFilter` que reescribe `ContentTypes`.** Mismo defecto que (1), por el mismo
   motivo.
3. **Serializar el `ProblemDetails` a mano.** Funciona para la cabecera, pero **rompe el cuerpo**:
   al serializar fuera de MVC se pierden los nombres en minúscula de RFC 7807 y el cuerpo pasa a
   `Detail` / `Errors` en PascalCase, que es justo lo que el frontend ya consume. Descartado tras
   verlo fallar en la suite.
4. **Editar los 19 puntos que construyen `new ProblemDetails` a mano.** Hubría que repetirse en
   cada endpoint nuevo, que es como el defecto vuelve.
5. **Cambiar `AddJsonOptions` con `PropertyNamingPolicy`.** Afectaría a *todas* las respuestas,
   no solo a las de error.

## La solución: formateador propio, registrado el primero

`ProblemDetailsOutputFormatter` se inserta en `MvcOptions.OutputFormatters` **en la posición 0**.
Como el formateador solo acepta `ProblemDetails`, para cualquier otro tipo MVC sigue usando el
de JSON. Para un `ProblemDetails` es el primero que puede escribirlo, y por eso decide el tipo de
contenido: `application/problem+json; charset=utf-8`.

Delega la serialización en las **opciones de JSON ya configuradas en MVC**, de modo que el
contrato de enums (Q-22 / ADR-0012) sigue mandando y el cuerpo no cambia respecto a lo que el
frontend consume hoy.

## Consecuencias

- **El cuerpo no cambia**, solo la cabecera. Los clientes que leían `detail` siguen leyendo
  `detail`.
- **Docker**: los healthchecks y scripts que comprueben el tipo de contenido deben aceptar
  `application/problem+json`; el de `/health` no se ve afectado porque devuelve `200` con JSON
  normal.
- **Los 401/403 del middleware de autorización** siguen sin cuerpo, como manda el protocolo. No
  se les añade `ProblemDetails`.
- **Verificación**: `EnumContractE2ETests` cubre los dos caminos con cuerpo (`detail` en fallo de
  negocio, `errors` en fallo de enlace) y comprueba el tipo de contenido por HTTP real.

## Lo que sigue pendiente

Este ADR arregla la **cabecera**. No convierte las pruebas E2E en cobertura completa: la matriz de
autorización, el contrato de enums y Problem Details están cubiertos por HTTP real, pero el
**flujo de negocio completo** (carrito → checkout → pago → factura → devolución) sigue sin prueba
automatizada. Ver [ADR-0016](0016-pruebas-e2e-http-con-postgres-efimero.md).