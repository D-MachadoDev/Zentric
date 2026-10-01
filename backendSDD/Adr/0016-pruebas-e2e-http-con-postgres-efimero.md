# ADR-0016 · Pruebas E2E HTTP con PostgreSQL efímero (Testcontainers)

- **Estado:** ACEPTADO (primera entrega; flujo de negocio pendiente)
- **Fecha:** 2026-10-01
- **Dicta:** Owner (elección entre cuatro opciones, 2026-09-30) + agente (detalles técnicos)
- **Resuelve:** T-032, la deuda que el propio SDD declaraba en 6 sitios

## Contexto

Hasta ahora **ninguno de los 30 endpoints había recibido una petición HTTP real dentro de la
suite**. La matriz de autorización por rol —la puerta de seguridad que más caro salió— se
comprobaba con `backend/scripts/authorization-smoke.ps1`, un script de PowerShell que alguien
tenía que lanzar a mano contra el contenedor.

El daño era doble. La puerta de seguridad no la comprobaba nadie de forma automática, y el
contrato HTTP (Problem Details, contrato de enums, códigos de estado) tampoco.

## Decisión

El Owner eligió **Testcontainers.PostgreSql** entre cuatro alternativas, aceptando que **Docker
pase a ser requisito para `dotnet test`**.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Contenedor de servicio de Postgres en la CI | Fuera de CI las pruebas E2E se omitirían y el contrato HTTP quedaría sin cubrir en local |
| Dividir en dos fases (contrato HTTP sin base, luego Postgres real) | Más trabajo de andamiaje para el mismo resultado |
| Solo TestServer sobre el almacén en memoria | No ejecutaría **ni una sentencia SQL**: es justo el defecto que se viene a cerrar |

## Cómo funciona

- `ZentricApiFactory : WebApplicationFactory<Program>` levanta **el `Program` real**: mismos
  middleware, misma política de reserva, mismos filtros de dueño, mismos serializadores. Lo único
  que se sustituye es la base de datos.
- `Program` es `public partial` para que el runner pueda reutilizar el arranque. No cambia el
  comportamiento de la API.
- La imagen es **`postgres:16.15-alpine`, la misma que `docker-compose.yml`**. Verificar el esquema
  contra otra versión sería un falso verde: la prueba podría pasar donde el despliegue real falla.
- El entorno es `Development`, lo que además **verifica el camino de migraciones automáticas**
  contra una base limpia.
- Una única colección de xUnit comparte el contenedor. Sin ella, xUnit paralelizaría clases que
  comparten el mismo escenario sembrado.

## El hallazgo que hizo falta resolver: `ApplicationStarted`

El primer intento falló con `401` en el login del Administrador. Diagnóstico sobre la base real
(`USUARIOS (0)`, configuración presente, migraciones aplicadas) llevó a la conclusión de que el evento
`ApplicationStarted` **no se dispara bajo `WebApplicationFactory`**: el runner arranca el host con
`IHost.StartAsync()`, que no notifica el arranque. Por eso el bloque de bootstrap, en línea
dentro de `Program.cs`, nunca se ejecutaba.

La solución **no** fue duplicar la siembra en las pruebas, sino extraer el alta del Administrador a
`Zentric.Api/Bootstrap/AdministratorBootstrapper`, de modo que **el arranque real y las pruebas
comparten la misma implementación**. Una sola pieza, dos consumidores.

## Lo que cubre hoy

- **Matriz de autorización**: 31 casos por HTTP real (401 sin token, 403 por rol, "abierto" para
  el rol correcto) contra los códigos pactados en `Presentation/02-authorization.md`.
- **Auto-registro**: admite Comprador, rechaza Vendedor (la contra-prueba de la excepción a RG-01).
- **Contrato de enums (Q-22)**: `"role": 2` → `400`; `"supervisor"` en minúscula → `200`.
- **Problem Details**: los dos caminos con cuerpo (`detail` en fallo de negocio, `errors` en fallo
  de enlace) y su tipo de contenido. Ver [ADR-0015](0015-contrato-de-error-http-problem-json.md).
- **Token forjado** sin firma → `401`, y `/health` reporta la base operativa.

**437/437 pruebas.** El build con `-warnaserror` da 0 avisos y 0 errores.

## Lo que NO cubre todavía

El **flujo de negocio completo** (carrito → checkout → pago → facturación → devolución) y la
propiedad cruzada de recursos (Q-21b) contra HTTP real siguen sin prueba automatizada. La
propiedad se verifica en la capa Application y en Docker por smoke, pero no en la suite.

Es el siguiente incremento natural, y reutiliza todo este arnés: el escenario ya está sembrado con
un Comprador, un segundo Comprador, dos Vendedores, Operador y Supervisor.

## Consecuencia operativa

**Docker es ahora requisito para `dotnet test`.** Es el coste que el Owner aceptó al elegir esta
opción. Si Docker no está accesible, el arnés falla **en el constructor**, con un mensaje explícito,
y no dentro de una prueba concreta a medias: un fallo silencioso aquí volvería a ser el mismo
verde falso que ya se corrigió una vez en el smoke.
## Apendice: dos fallos de infraestructura encontrados al ejecutar esto

Ninguno de los dos es un defecto del producto; los dos hacen que la suite parezca verde cuando
no lo es, o que se quede colgada sin decir por que. Se dejan escritos porque vuelven.

### 1. Bloqueo de hilos al sembrar (corregido)

Sintoma: la suite E2E **sola** pasaba en 20 s, pero la suite **completa** se colgaba. Con 399
pruebas unitarias en paralelo, el pool de hilos se agota.

Causa: `PaidOrderScenario.Get()` y `ApiActors.Get()` hacian
`SeedAsync().GetAwaiter().GetResult()`, es decir **async sobre sincrono**: ocupaban un hilo del
pool mientras esperaban trabajo real de HTTP y PostgreSQL. Con suficiente carga, las peticiones
nunca llegaban a ejecutarse y la corrida se quedaba esperando.

Arreglo: `GetAsync()` y `EnsureSeededAsync()` son async de verdad, sin blocking. La siembra sigue
siendo perezosa y unica, pero ya no sujeta un hilo mientras trabaja.

### 2. Nodos de MSBuild reteniendo los DLL (corregido)

Sintoma: `dotnet build` se quedaba parado en `Zentric.Api` sin llegar a `Zentric.Tests`.

Causa: los servidores de MSBuild y Roslyn arrancan con `nodeReuse:true`, y **sobreviven al
proceso que los lanzo**. Cuatro workers llevaban horas vivos reteniendo los DLL de salida; la
compilacion siguiente esperaba un fichero que ya no podia escribir.

Arreglo: `dotnet build-server shutdown` deja el entorno limpio, y la CI deja de depender de el:
`dotnet build ... -nodeReuse:false` (en CI nunca se reutiliza un nodo), `timeout-minutes` y
`--blame-hang-timeout` en las pruebas, y un paso `if: always()` que apaga los servidores.

Leccion: un cuelgue de build no es un problema de codigo hasta que se mira quien lo bloquea.