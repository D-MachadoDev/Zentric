# Validacion de entradas REST

> Documento exigido por el prompt de orquestacion. Especifica **que se valida antes de que una
> peticion llegue al dominio**, y por tanto que entrada es invalida y con que codigo se rechaza.

## Principio

La validacion de **forma** (que viene, si es valido, cuanto mide) ocurre en la capa de aplicacion,
antes de tocar el dominio. La validacion de **regla de negocio** (este pedido ya esta pagado, este
stock no alcanza) ocurre en el dominio, porque solo el conoce quien tiene el agregado.

Repartirlo al reves es el error clasico: pedir en la base "este usuario existe" o en el dominio
"el correo tiene formato".

## Flujo

1. El modelo se enlaza al comando.
2. El pipeline de validacion ejecuta los validadores de ese comando.
3. Si algo falla, la respuesta es `400` con `application/problem+json`. **El dominio no se toca.**
4. Si pasa, el caso de uso se ejecuta contra el dominio, que puede responder `400` por regla de
   negocio. Ese fallo tambien es `ProblemDetails`, con el mismo formato.

## Validadores existentes

| Validador | Que protege | Estado |
|---|---|---|
| `AddOrderItemCommandValidator` | Validacion de entrada del comando | `NOT_STARTED` |
| `AddStockCommandValidator` | Validacion de entrada del comando | `NOT_STARTED` |
| `ApproveReturnCommandValidator` | Validacion de entrada del comando | `NOT_STARTED` |
| `CheckoutOrderCommandValidator` | Validacion de entrada del comando | `NOT_STARTED` |
| `CreateCartCommandValidator` | Validacion de entrada del comando | `NOT_STARTED` |
| `CreateFulfillmentOrderCommandValidator` | Validacion de entrada del comando | `NOT_STARTED` |
| `CreateProductCommandValidator` | Validacion de entrada del comando | `NOT_STARTED` |
| `CreateUserCommandValidator` | Validacion de entrada del comando | `NOT_STARTED` |
| `CreateWarehouseCommandValidator` | Validacion de entrada del comando | `NOT_STARTED` |
| `DispatchFulfillmentCommandValidator` | Validacion de entrada del comando | `NOT_STARTED` |
| `LoginCommandValidator` | Validacion de entrada del comando | `NOT_STARTED` |
| `PayOrderCommandValidator` | Validacion de entrada del comando | `NOT_STARTED` |
| `PublishProductCommandValidator` | Validacion de entrada del comando | `NOT_STARTED` |
| `RequestReturnCommandValidator` | Validacion de entrada del comando | `NOT_STARTED` |

## Reglas transversales

1. **Ningun validador inventa una regla que la Ley no dicta.** Si el dominio no define el formato
   del documento de identidad, el validador no impone uno. Anadir formato es inventar requisitos.
2. **Un `400` de validacion y un `400` de negocio son el mismo codigo pero distinto origen**, y el
   mensaje dice cual. El cliente necesita saber si corregir el formulario o mostrar otro aviso.
3. **La identidad nunca se valida aqui.** El identificador de usuario sale del token ya validado;
   uno en el cuerpo se descarta. Que el cuerpo no pueda decidir quien eres es seguridad.
4. **Los enums se validan por nombre.** Un entero es `400`.

## Anadir un validador

Un comando nuevo sin validador es un comando que acepta basura. Al anadirlo hay que registrarlo en
la tabla de arriba y cubrir con pruebas los casos limite, no solo el caso feliz.
