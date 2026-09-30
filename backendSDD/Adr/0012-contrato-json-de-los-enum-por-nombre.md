# [ADR-0012](0012-contrato-json-de-los-enum-por-nombre.md) — Los `enum` del contrato REST viajan solo por nombre

```yaml
id: 0012
title: Contrato JSON de los enum por nombre, sin forma numérica (Q-22)
status: accepted
date: 2026-09-29
decided_by: Owner (forma estricta de Q-22, 2026-09-29: solo nombres; un entero en un campo de enum debe responder 400) · implementación y verificación por el agente técnico
relacionado: [Q-22](../SDD.md#91-preguntas-al-owner-abiertas), [ADR-0011](0011-matriz-autorizacion-por-rol.md), [Presentation/01-endpoints.md](../Presentation/01-endpoints.md), [frontendSDD/Frontend-Adapters.md](../../frontendSDD/Frontend-Adapters.md)
```

## Contexto

`Q-22` se abrió al comprobar contra la API en Docker que el mismo enum se pedía en dos formas
distintas según por dónde entrara. Medido el 2026-09-29 contra `POST /api/users`:

| Petición | Respuesta antes de este ADR |
|---|---|
| `"role": "Buyer"` | `400` — `The JSON value could not be converted to CreateUserCommand` |
| `"role": 0` | `200` con el `Guid` del usuario |
| `GET /api/users?role=Seller` | `200` (el binding de query sí acepta nombres) |
| `GET /api/users?role=1` | `200` |

Causa: `System.Text.Json` sin `JsonStringEnumConverter` en la tubería de MVC.

### Corrección de la premisa con la que se abrió Q-22

Al abrirla se escribió que unificarlo "altera el contrato de **todos** los enum de entrada y
salida". **Re-verificado el 2026-09-29, y es falso para la salida.** Los DTOs de respuesta
exponen `string` y mapean con `.ToString()`: `UserDto(…, string Role, …)`,
`WarehouseDto(…, string Type, …)`, `GetOrderByIdQuery(…, string Status, …)`,
`CurrentUserResponse(…, string Role)`, `GetProductsQuery`, `GetReturnByIdQuery`,
`GetFulfillmentByIdQuery`, `GetInvoicesByOrderQuery`. La API **ya respondía** `"Pending"`, `"Seller"`.

El radio real del cambio son **cuatro campos de entrada**: `CreateUserCommand.Role`,
`CreateProductCommand.Type`, `CreateWarehouseCommand.Type`, `RequestReturnCommand.ProductType`.

Y el riesgo de "romper a quien ya envíe enteros" era **cero en la práctica**: `frontend/` no tiene
`src/` (0 archivos `.ts`, ningún envío de `role`), así que no existía cliente que enviara números.

El desalineamiento además no era cosmético: con contrato numérico, un `{"role": 2}` mal escrito es
un **Administrador válido**, y un `{"role": 99}` se cuela como entero sin nombre.

## Opciones que estuvieron sobre la mesa

| Opción | Qué hacía | Por qué se descartó / eligió |
|---|---|---|
| (a) dejar el contrato numérico | Documentar que el cuerpo exige entero | Descartada: deja la asimetría permanente (responde `"Pending"`, exige `2`) y obliga al frontend a mantener un mapa entero↔nombre para 4 campos |
| (b) `JsonStringEnumConverter` por defecto | Acepta nombre **y** entero (`allowIntegerValues: true`) | Descartada: mantiene viva la puerta trasera numérica, que es justo lo que permite el `{"role": 2}` silencioso |
| **(b-estricta) con `allowIntegerValues: false`** | **Solo nombres; el entero responde 400** | **ELEGIDA por el Owner.** Contrato sin ambigüedad, OpenAPI deja de mostrar los enums como `int`, y como no había clientes el coste de romper era nulo |
| (c) converter propio insensible a mayúsculas | Aceptar `"buyer"`, `"BUYER"` | Descartada por innecesaria: verificado que el converter de .NET **ya** lee sin distinguir mayúsculas (`"seller"` y `"supervisor"` respondieron `200`). ~40 líneas propias para algo que la librería ya hace |

## Decisión

`JsonStringEnumConverter` registrado con `allowIntegerValues: false`, en **un único sitio**:
`Zentric.Api/Contracts/EnumJsonContract.cs`, enganchado con
`builder.Services.AddControllers().AddZentricEnumContract()`.

No se puso el registro a pelo en `Program.cs` a propósito: metido en una clase, el contrato se
puede ejercitar desde un test sin levantar el host ni necesitar PostgreSQL.

`namingPolicy` va en `null`, o sea el nombre exacto del enum en PascalCase, que es **exactamente**
lo que ya producen las salidas al hacer `.ToString()`. Entrada y salida quedan diciendo lo mismo.

## Verificación

Dos capas, la misma disciplina de `ADR-0011`:

- **Unitarias** — `Zentric.Tests/Presentation/EnumJsonContractTests.cs`, 5 casos sobre la tubería
  real de MVC (`AddControllers().AddZentricEnumContract()` resuelto desde el contenedor de
  servicios, no unas opciones fabricadas aparte): nombre válido se deserializa · entero lanza ·
  nombre inexistente (`"Admin"`) lanza y no degrada a valor por defecto · minúsculas se aceptan ·
  la escritura emite el nombre exacto.
- **Prueba de mutación** — cambiar `allowIntegerValues` a `true` → `Failed: 1`, exactamente el test
  del entero. Revertido y confirmado en fuente y con reconstrucción `--no-incremental`.
- **HTTP real en Docker** — `backend/scripts/authorization-smoke.ps1`, **36 comprobaciones, 0
  fallos, exit code 0** en proceso limpio. Las tres nuevas: `"role": 2` → `400` con
  `$.role: The JSON value could not be converted…` · `"role":"Administrator"` con token de
  Administrador → `200` · `"role":"supervisor"` en minúsculas → `200`.

Suite completa tras el cambio: **353/353** (348 + 5 nuevos), build `-warnaserror` 0/0.

## Consecuencias

- **El frontend tiene que enviar nombres.** `frontendSDD/Frontend-Adapters.md` §3.2 mandaba
  convertir con constantes numéricas; quedó reescrito. De paso se corrigió ese bloque, que además
  tenía los valores mal (`Seller: 1, Buyer: 2, Admin: 3` cuando el dominio es
  `Buyer=0, Seller=1, Administrator=2, Supervisor=3, LogisticsOperator=4`) y no incluía `Supervisor`.
- Un nombre mal escrito pasa a fallar **en la lectura** (`400` con `ProblemDetails`), no en el
  validador. El mensaje cita la ruta JSON (`$.role`), más útil para quien llama.
- Los enums del esquema OpenAPI se publican como `string` en lugar de `int`.
- Lo que **no** cubre el test unitario: que `Program.cs` llame al extension (el test construye su
  propia tubería). Eso lo muerde el smoke por HTTP — si el registro se desconecta, las tres
  comprobaciones nuevas fallan.
- Detalle de CI descubierto de paso: el smoke solo llamaba a `exit` cuando había fallos, así que
  una corrida limpia dejaba el `exit code` heredado de otro comando (se vio un `1` con 0 fallos).
  Ahora sale siempre con `exit $fallos`.

## Alternativas descartadas

Ver la tabla de opciones. La que merece quedar recordada es la **(c)**: se descartó por **sonda
directa** sobre `System.Text.Json` en .NET 10, no por suposición — `"monday"` se deserializa igual
que `"Monday"`, y `1` lanza cuando `allowIntegerValues` es `false`.

