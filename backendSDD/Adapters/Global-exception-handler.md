# Manejador global de errores

> Especifica **como se convierte cualquier fallo
> en una respuesta HTTP**: un unico formato, un unico punto de decision, sin excepciones filtradas.

## Principio

El codigo HTTP lo decide el **tipo del fallo**, nunca el texto del mensaje ni el criterio de quien
llama. Si cada controlador elige su propio codigo, un "no encontrado" reaparece como `400` en la
siguiente ruta y nadie se da cuenta hasta que un cliente recibe la respuesta equivocada.

Por eso existe **un unico punto de traduccion**: `ResultMapping.ToProblem()`. Y una prueba que
recorre los controladores y falla si alguien vuelve a elegir el codigo a mano.

## Tabla de traduccion

| Tipo de fallo | Codigo HTTP | Cuando |
|---|---|---|
| `ErrorKind.NotFound` | `404` | El recurso no existe **o no pertenece al llamante**. Ambos comparten mensaje. |
| `ErrorKind.Validation` | `400` | Regla de negocio violada o dato de entrada invalido. |
| Excepcion no controlada | `500` | Fallo tecnico o catastrofico. Nunca `400`. |
| Sin token | `401` | Sin cuerpo. Lo emite el middleware de autorizacion. |
| Token valido sin permiso | `403` | Sin cuerpo. Lo emite el middleware de autorizacion. |

## Los tres caminos de error

1. **Fallo de negocio o validacion** -> `ResultMapping.ToProblem()`.
2. **Fallo de enlace del cuerpo** -> la fabrica de respuestas de modelo invalido del controlador,
   que produce `ValidationProblemDetails`.
3. **Sin identidad o sin permiso** -> `401`/`403` **sin cuerpo**, dictados por el middleware de
   autorizacion antes de entrar al controlador.

Los tres terminan en `application/problem+json` cuando llevan cuerpo. Que el tercero no lo lleve es
deliberado: el protocolo manda asi y no se filtra informacion de si el rol existe.

## Formato del cuerpo

```json
{
  "type": "https://tools.ietf.org/html/rfc7807",
  "title": "Bad Request",
  "status": 400,
  "detail": "Descripcion de la invariante violada o del error de validacion."
}
```

**El cuerpo es la forma de RFC 7807** (la que produce el framework de .NET), servida como
`application/problem+json`. RFC 9457 es el estandar vigente que la sustituye, y la migracion esta
**pendiente** (brecha `R-05` del
[`frontendSDD/Frontend-Adapters.md`](../../frontendSDD/Frontend-Adapters.md)). No se anuncie 9457
en el contrato: un cliente que lo asuma esperara campos que el servidor no envia. Ver
[ADR-0015](../Adr/0015-contrato-de-error-http-problem-json.md).

## Reglas innegociables

1. **Un error desconocido responde `500`, nunca `400`.** Tratar lo desconocido como peticion
   invalida esconde fallos reales y hace que un cliente no pueda distinguished.
2. **Nunca se filtra detalle interno.** Ni cadenas de conexion, ni trazas SQL, ni nombres de tablas.
   El `500` dice que fallo, no por que fallo internamente.
3. **El detalle va siempre en `detail`.** El cliente lee ahi el mensaje; no invente codigos propios.
4. **"No existe" y "no es tuyo" son el mismo `404` con el mismo mensaje.** Distinguirlos permitiria
   enumerar recursos ajenos probando GUIDs.
5. **Cuando la cabecera ya se envio**, el manejador no puede reescribir el cuerpo: se registra y no
   se intenta una segunda respuesta.
