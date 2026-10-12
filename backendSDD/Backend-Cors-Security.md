# CORS y seguridad del consumo desde el navegador

> Documento exigido por el prompt de orquestacion (Fase 0D). Especifica **que origen puede llamar a
> la API**, que cabeceras se permiten y como viaja la identidad.

## El problema que resuelve

Una aplicacion web servida desde `http://localhost:5173` **no puede** llamar a `http://localhost:5076`
sin que el navegador lo autorice: son origenes distintos. CORS es el permiso que se le concede de
forma explicita. Sin el, el navegador bloquea la peticion aunque el servidor responda bien.

## Politica aplicada

| Aspecto | Valor | Por que |
|---|---|---|
| Nombre de la politica | `Frontend` | Nombre logico; no obliga a un stack. |
| Origenes permitidos | Lista explicita, separada por comas | Nunca comodin. `AllowAnyOrigin` junto a credenciales es rechazado por el navegador. |
| Cabeceras | Todas | El cliente envia `Authorization`, y la lista se declara en un solo sitio. |
| Metodos | Todos | Se declara por defecto; restringirlos no aporta seguridad real aqui. |
| Credenciales | No | La identidad va en `Authorization: Bearer`, no en cookies. Sin cookies no hay `credentials`. |

El origen se lee de configuracion, no esta escrito en el codigo: la misma imagen sirve a desarrollo,
a pruebas y a produccion sin recompilar.

## Preflight

`OPTIONS` no lo contesta el controlador: lo responde el middleware, y por eso debe funcionar
aunque el endpoint no exista todavia. Si el preflight falla, el navegador ni siquiera envia la
peticion real, y el sintoma es "la API no responde" cuando en realidad la bloquea el navegador.

Un preflight verde significa que el origen permitido recibe las cabeceras y el ajeno no. Verificar
solo que el propio origen funciona no demuestra la regla: falta la mitad que la hace una politica.

## Identidad

La identidad viaja **exclusivamente** en `Authorization: Bearer <token>`.

No hay ninguna cabecera propia de identidad. La que existia (`X-Buyer-Id`) se elimino porque la
escribia cualquiera: permite a cualquiera hacerse pasar por otro. Ver
[ADR-0009](Adr/0009-autenticacion-jwt-rg01.md).

## Reglas para el cliente

1. Nunca guardar el token en una variable que el navegador adjunte solo.
2. Ante un `401`, limpiar la sesion y volver al login. Un `403` **no** limpia la sesion: significa
   que el usuario esta autenticado pero no puede hacer eso, y echarlo seria incorrecto.
3. No reintentar automaticamente un `401` en un bucle: genera peticiones infinitas.

## Verificacion

- Preflight desde origen permitido: responde con las cabeceras CORS esperadas.
- Preflight desde origen ajeno: **no** las recibe.
- Peticion real sin token: `401`.
- Peticion real con token de rol insuficiente: `403`.
- Cabecera de identidad antigua: no autentica a nadie.
