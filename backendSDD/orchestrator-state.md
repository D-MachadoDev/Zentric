# Estado persistente del orquestador de Zentric

> Artefacto versionable exigido por el prompt de orquestacion (apartado 2.2). Registra que se ha
> hecho, con evidencia, y cual es la siguiente fase. **No es la especificacion:** lo que el sistema
> debe hacer vive en `Domain/`, `Application/`, `Infrastructure/` y `Presentation/`, y las
> decisiones en `Adr/`. Este fichero solo recuerda donde quedamos y que falta.

## Orden de lectura para replicar este backend con otro stack

La especificacion describe QUE, no COMO. Si nada de lo siguiente impone una tecnologia, este
mismo sistema puede implementarse con otro stack: el codigo es un resultado, no la fuente.

1. `ZENTRIC.md` (raiz del repo) - la Ley. Intocable.
2. `backendSDD/Domain/` - modelo y reglas de negocio (QUE).
3. `backendSDD/Presentation/01-endpoints.md` y `02-authorization.md` - contrato HTTP y permisos.
4. `backendSDD/Adapters/` - endpoints, validacion y manejador global de errores.
5. `backendSDD/Infrastructure/` - persistencia, despliegue y mapa de entidades.
6. `backendSDD/Adr/` - cada decision y el porque (COMO y POR QUE).
7. Este fichero - estado y bitacora.

---

## 1. Identificación y configuración del agente orquestador

### 1.1 Rol, objetivo y alcance

- **Rol:** Agente Orquestador Principal / Lead Software Architect del backend Zentric.
- **Objetivo:** determinar el estado real del repositorio y ejecutar únicamente el siguiente trabajo necesario. Reanudar lo implementado sin regenerarlo, reparar fallos antes de avanzar y paralelizar sub-agentes solo cuando sus dependencias y archivos no se solapen.
- **Propósito del sistema** `[OBSERVADO]`: API central y núcleo de dominio de **Zentric**, plataforma que intermedia entre **Comprador** y **Vendedor** administrando usuarios, catálogo, inventario distribuido, pedidos, facturación, logística y posventa.
- **Owner:** no registrado en el repositorio `[PENDIENTE]`; las decisiones se dictan por chat y quedan registradas como ADDENDUM en la Ley o como ADR en `backendSDD/Adr/`.
- **Biblia (intocable, [AGENTS.md, sección 0.7](../AGENTS.md#07-inmutabilidad-de-los-documentos-biblia-y-registro-de-cambios)):** [ZENTRIC.md](../ZENTRIC.md). Integridad verificada el 2026-09-18 (`git diff --numstat` = 38 adiciones / 1 borrado, y el borrado fue una línea separadora). Las adiciones están dictadas por el Owner: ADD-001…ADD-003 ([sección 8.2](#82-adiciones-a-la-biblia-addendum---dictado-por-owner-en-zentricmd)).
- **Alcance incluido:** dominio de marketplace completo (identidad, catálogo, bodegas, inventario, pedidos, logística, devoluciones, facturación), API REST y persistencia PostgreSQL.
- **Fuera de alcance:** UI, apps móviles, portales, autenticación técnica real y almacenamiento según el alcance incluido y excluido de [01-system-overview.md](01-system-overview.md). Swagger ya prepara el esquema `Bearer` para cuando se formalice Auth.

### 1.2 Entorno local, stack y comandos oficiales

| Recurso | Valor |
|---|---|
| Lenguaje / runtime | C# · .NET 10 (`net10.0`) |
| Arquitectura | Hexagonal (puertos y adaptadores) + DDD táctico + CQRS + Result Pattern |
| Mediación / validación | Dispatcher propio (`ADR-0007`, en sustitución de MediatR por licencia RPL 1.5) · FluentValidation 12.1.1 |
| Persistencia | EF Core + Npgsql 10.0.3 sobre **PostgreSQL 16** (contenedor `zentric-postgres`, puerto `5432`, base `ZentricDb`) |
| API | ASP.NET Core + OpenAPI/Swagger (XML docs, tags, RFC 9457) · **JWT HS256 + PBKDF2 (`ADR-0009`)** |
| Pruebas | xUnit 2.9.3 (61 archivos `*Tests.cs`, 551 casos) |
| Contenedores | `Dockerfile` multi-stage (EXPOSE 8080) + `docker-compose.yml` (API en `5076:8080`, base en `5432:5432`) |
| CI | `.github/workflows/ci.yml` (restore + build + test; dispara solo en push/PR a `main`) |

Comandos oficiales ([AGENTS.md, [sección 7](#7-estado-de-implementación-por-capa)](../AGENTS.md#7-comandos-de-verificación-y-compilación)):

```powershell
cd backend; dotnet restore Zentric.slnx
cd backend; dotnet build Zentric.slnx
cd backend; dotnet test Zentric.slnx
```

Infraestructura local (resumen real de `docker-compose.yml`):

```yaml
services:
  db:                       # imagen postgres:16-alpine · contenedor zentric-postgres
    environment: { POSTGRES_USER: postgres, POSTGRES_PASSWORD: postgres, POSTGRES_DB: ZentricDb }
    ports: ["5432:5432"]    # volumen persistente zentric_pgdata
  api:                      # imagen zentric:latest · contenedor zentric-api
    environment: { ConnectionStrings__DefaultConnection: "Host=db;Port=5432;Database=ZentricDb;..." }
    ports: ["5076:8080"]
```

Regla: dentro de Docker la API usa el nombre de servicio `db`, nunca `localhost`. `[RIESGO]` Las credenciales de desarrollo están en claro (`appsettings.json` y compose); mover a variables de entorno antes de producción (observación OBS-04, [sección 10](#10-riesgos-hallazgos-y-observaciones)).

### 1.3 Registro de agentes y formato de delegación

Los nombres `domain-architect`, `infrastructure-adapter`, etc. son **roles lógicos** (definidos en [AGENTS.md, [sección 4](#4-fases-detalladas-fase-0a--fase-6)](../AGENTS.md#4-roles-de-agentes-especializados)), no agentes obligatoriamente instalados. Antes de delegar, el orquestador asigna cada rol a un agente disponible por capacidad; si no existe un agente especializado, usa un agente general de ejecución conservando el mismo alcance, archivos y gate.

| Rol lógico ([AGENTS.md, [sección 4](#4-fases-detalladas-fase-0a--fase-6)](../AGENTS.md#4-roles-de-agentes-especializados)) | Alcance |
|---|---|
| Domain-Architect-Agent | Entidades, agregados, value objects, invariantes, eventos, puertos y specs de `backendSDD/Domain/` |
| Infrastructure-Adapter-Agent | `DbModel` + mappers + repositorios + migraciones + background services |
| Application-API-Agent | Commands/Queries, DTOs, validadores, controladores, Problem Details |
| QA-Testing-Agent | Pruebas BDD de dominio y aplicación (xUnit) y arneses de DI |

Toda delegación debe incluir siempre: (1) rol lógico, (2) stack detectado, (3) documentos SDD de entrada, (4) archivos permitidos, (5) archivos prohibidos, (6) dependencias, (7) criterio de salida, (8) comando de validación y (9) formato de reporte. No se inventan nombres de agentes ni se asume que un agente puede editar fuera de su alcance.

## 2. Mapa de fases, paralelización y dependencias

### 2.1 Diagrama de fases

El flujo es un ciclo de diagnóstico, diseño, implementación, containerización, reparación y validación, con fases `0A` a `6`. Las tareas paralelas solo se ejecutan cuando el diagnóstico confirma dependencias satisfechas y archivos sin solape.

```mermaid
graph TD
  F0[Fase 0: Diagnóstico de estado] --> F0A[0A: Detección de stack .NET]
  F0A --> F0B[0B: Infraestructura local PostgreSQL + configuración]
  F0B --> F0C[0C: Compose y entorno Docker]
  F0C --> F0D[0D: SDD de frontend — NO APLICA en este repositorio]
  F0D --> F1[1: Dominio core]
  F1 --> F2A[2A: Persistencia EF/PostgreSQL]
  F1 --> F2B[2B: Eventos de dominio + UnitOfWork]
  F1 --> F2C[2C: Puertos de entrada CQRS]
  F2A --> F3A[3A: Servicios de dominio y handlers]
  F2B --> F3A
  F2C --> F3B[3B: REST, DTOs, validadores]
  F3A --> F4[4: Integración, Bearer/OpenAPI, ProblemDetails]
  F3B --> F4
  F4 --> F5A[5A: Pruebas de dominio y servicios]
  F4 --> F5B[5B: Pruebas de adaptadores y REST]
  F5A --> F6[6: Reparación, Docker e integración real]
  F5B --> F6
```

### 2.2 Tablero de fases (estado real al 2026-10-06)

| Fase | Entregables | Estado | Evidencia | Gate pendiente |
|---|---|---|---|---|
| 0A | Detección de stack | ✅ `VERIFIED` | 5 `.csproj` net10.0 + `Zentric.slnx` | — |
| 0B | PostgreSQL + configuración | ✅ `VERIFIED` | `postgres:16.15-alpine`; **10 migraciones** aplicadas automáticamente al arrancar (`Program.cs:229 MigrateAsync()` en entorno `Development`) y verificadas en cada corrida de la suite E2E | `docker compose up` manual sobre volumen limpio |
| 0C | Compose y entorno Docker | ✅ `VERIFIED` | `docker compose build` exit 0; `up` con healthcheck; `/health` → 200 `{"status":"healthy","database":"up"}` | — |
| 0D | SDD de frontend | ✅ `VERIFIED` | `frontendSDD/` con 8 documentos (orquestador, arquitectura, servicios, adaptadores, módulos por rol, design system, flujos y auditoría de contrato) | — |
| 1 | Dominio core (10 agregados, VOs, puertos, eventos) | ✅ `VERIFIED` | 580/580 (2026-10-09) | Marcadores `[NO IMPLEMENTADO]` de `backendSDD/Domain/` |
| 2A | Persistencia EF + mappers + repositorios | ✅ `IMPLEMENTED` | **12** `DbSet`, 10 mappers, 10 repositorios · OBS-03 cerrado el 2026-10-06: el esquema se crea y se usa contra PostgreSQL real en la suite E2E | `docker compose up` manual sobre volumen limpio |
| 2B | Eventos + `UnitOfWork` | ⚠️ `IMPLEMENTED` | `DomainEventDispatcher`; flujo Devoluciones→Inventario | 7 eventos: `ReturnApproved` y `CartExpired` tienen consumidor; `PartialFulfillmentCancelled` tiene consumidor (auto-refund) | — |
| 2C | CQRS de entrada (25 commands, 14 queries) | ✅ `VERIFIED` | 24 ficheros de pruebas de aplicación + validadores | — |
| 3A | Servicios de dominio y casos de uso | ✅ `VERIFIED` | `InventoryReservationService`, `ReturnsApprovalService`, `OrderFulfillmentProgressSynchronizer`, checkout | — |
| 3B | REST, DTOs, validadores | ✅ `VERIFIED` | 44 endpoints, Problem Details `application/problem+json` (forma RFC 7807), Swagger; matriz de autorización ejecutada por HTTP | — |
| 4 | Integración local y seguridad | ⚠️ `PARTIAL` | Auth real cerrada (`ADR-0009`) **y autorización por rol cerrada (`ADR-0011`)**: **20** políticas sobre **44** endpoints, `FallbackPolicy` fail-closed; verificado por HTTP real contra PostgreSQL efímero con los cinco roles | Smoke 400/404/500 |
| 5A | Pruebas de dominio y servicios | ✅ `VERIFIED` | 580/580 (2026-10-09) | — |
| 5B | Pruebas de adaptadores y REST | ⚠️ `PARTIAL` | 12 suites E2E (**71 declaraciones**) sobre `postgres:16.15` real + suites DI y queries | Smoke 400/404/500 |
| 6 | Reparación e integración | ✅ `VERIFIED` (código) | SPEC-008 aplicado: 12 warnings `SYSLIB0050` → **0**; 6 handlers sin `SaveChangesAsync` corregidos; `IdentityMap` y `NullReferenceException` reparados; flujo E2E completo verificado en PostgreSQL | Smoke de errores; E2E de navegador **no aplica** hasta que exista código de frontend |

> **Prioridad:** las tareas pendientes de una fase anterior tienen prioridad sobre generar contenido de una fase posterior; no se marca `VERIFIED` una fase con entregables `PARTIAL` o `FAILING`.

### 2.3 Regla de reanudación (cómo elegir el siguiente paso)

El flujo no asume repositorio vacío. En cada ejecución el orquestador debe:

1. Leer este documento y los contratos SDD relevantes antes de modificar código.
2. Inspeccionar el árbol de archivos, dependencias, configuración, pruebas y artefactos de ejecución.
3. Ejecutar el diagnóstico mínimo disponible: compilación y pruebas ([sección 3.5](#35-comandos-de-validación-y-gates-por-fase)).
4. Clasificar cada entregable del tablero 2.2 como `NOT_STARTED`, `PARTIAL`, `IMPLEMENTED`, `FAILING` o `VERIFIED` con evidencia.
5. Seleccionar una única fase siguiente con la matriz de decisión de la sección 3.1.
6. No regenerar archivos clasificados `IMPLEMENTED` o `VERIFIED`; solo corregirlos cuando exista evidencia de fallo o incumplimiento del SDD.
7. Actualizar el tablero 2.2 y el registro de la [sección 12](#12-registro-de-acciones-y-control-del-documento) al terminar cada tarea.

Si faltan herramientas, dependencias o infraestructura, se registra el bloqueo exacto y se resuelve o se detiene con una instrucción reproducible. No se declara completitud basándose únicamente en que existan archivos o rutas.

### 2.4 Estado persistente de la orquestación

El estado persistente es **este documento** (tablero 2.2 + mapa de la [sección 5](#5-mapa-de-entidades-anti-amnesia) + registro de la [sección 12](#12-registro-de-acciones-y-control-del-documento)), anclado a `commit + fecha`. No se crea un archivo de estado paralelo: duplicaría la SSoT (regla de [AGENTS.md, sección 0.2](../AGENTS.md#02-regla-de-sincronización-bidireccional-spec-anchored-code)). Cada entrada del registro incluye:

```text
fecha, fase, tarea, estado, archivos, evidencia, comando, resultado, bloqueos, siguienteAccion
```

Los cambios de código y el estado deben poder asociarse al `commit` correspondiente. Si el registro y el repositorio discrepan, gana el repositorio: se re-ejecuta el diagnóstico antes de continuar.

## 3. Instrucciones ejecutivas del orquestador

### 3.1 Diagnóstico obligatorio y selección de tarea

Antes de ejecutar cualquier fase de implementación, producir una tabla con esta forma (ejemplo real del 2026-09-26):

| Área | Evidencia revisada | Estado | Acción siguiente | Validación requerida |
|---|---|---|---|---|
| Stack y dependencias | 5 `.csproj`, `Zentric.slnx` | ✅ `VERIFIED` | — | `dotnet build` |
| Dominio | modelos, VOs, puertos, eventos, servicios | ✅ `VERIFIED` | — | 580/580 |
| Persistencia SQL | `DbModel`, mappers, repositorios, migraciones | ✅ `VERIFIED` | — | esquema creado con `MigrateAsync()` y usado contra PostgreSQL real en la suite E2E |
| Eventos | `Entity.AddDomainEvent`, dispatcher, `UnitOfWork` | ✅ `VERIFIED` | `CartExpired` se emite en `CheckoutTimeoutService`; consumidores: `ReturnApproved`, `CartExpired`, `PartialFulfillmentCancelled` (auto-refund) | flujo devolución → stock "Usado" (✅) |
| Casos de uso | 25 commands, 14 queries, validadores | ✅ `VERIFIED` | — | suites de handlers |
| REST | DTOs, controladores, rutas | ✅ `VERIFIED` | 12 suites E2E (71 declaraciones) con PostgreSQL efímero (T-032) y suite completa | Flujo completo cubierto por E2E; contrato en [Presentation/01-endpoints.md](Presentation/01-endpoints.md) |
| Excepciones REST | `AddProblemDetails()` + `UseExceptionHandler()` | ⚠️ `PARTIAL` | Smoke de códigos 400/404/500 | pruebas HTTP |
| Seguridad | Auth real JWT HS256 + PBKDF2 (`ADR-0009`) y 20 políticas de autorización (`ADR-0011`) | ✅ `VERIFIED` | Smoke 400/404/500 | `AuthorizationMatrixE2ETests` + `OwnershipE2ETests` (los cinco roles) |
| Containerización | `Dockerfile`, `docker-compose.yml`, CI | ⚠️ `PARTIAL` | `docker compose up` manual sobre volumen limpio + smoke | gate Docker ([sección 11.4](#114-gates-y-criterios-de-finalización-del-proyecto)) |
| Pruebas | 63 archivos, 561 casos | ✅ `VERIFIED` | E2E HTTP y PostgreSQL real | `dotnet test` |

Procedimiento obligatorio:

1. Enumerar los entregables definidos en las fases ([sección 4](#4-fases-detalladas-fase-0a--fase-6)) y en los SDD referenciados.
2. Localizar cada entregable en el repositorio; no inferirlo por la existencia de una carpeta.
3. Comparar firma, comportamiento y configuración contra el contrato correspondiente.
4. Ejecutar el gate mínimo de ese entregable, aunque la fase parezca completa.
5. Marcarlo con el estado correspondiente y evidencia.
6. Generar la lista ordenada de pendientes por dependencia.
7. Ejecutar la primera tarea desbloqueada; luego actualizar el estado persistente y repetir el diagnóstico.

**Matriz de decisión (en orden):**

1. Si el build falla → `REPAIR_BUILD`; no se avanza de fase.
2. Si hay pruebas fallidas → `REPAIR_TESTS`; corregir la causa y repetir exactamente la prueba fallida.
3. Si compila y las pruebas pasan pero falta un entregable de cualquier etapa → ejecutar la tarea pendiente de menor dependencia.
4. Si los entregables existen pero contradicen el backendSDD/contrato → `REPAIR_CONTRACT`.
5. Si las fases de implementación están completas → `INTEGRATION_VALIDATION`.
6. Solo marcar `COMPLETE` cuando todos los gates de la [sección 11.4](#114-gates-y-criterios-de-finalización-del-proyecto) estén verificados con evidencia reciente.

**Alignment gate:** contra [AGENTS.md](../AGENTS.md), las specs de `/SDD` y [Presentation/01-endpoints.md](Presentation/01-endpoints.md); detectar firmas incompatibles, nombres duplicados, discrepancias de códigos HTTP (400/404/422), endpoints sin matriz de errores y diferencias de puertos host vs contenedor. Cualquier hallazgo selecciona `REPAIR_CONTRACT` antes de continuar.

### 3.2 Estados, transiciones y límites

Estados válidos: `NOT_STARTED → IN_PROGRESS → IMPLEMENTED → VERIFIED`. Desde `IMPLEMENTED` o `VERIFIED` se puede degradar a `FAILING` si una validación posterior lo demuestra; `FAILING` solo vuelve a `VERIFIED` ejecutando la prueba que lo detectó y la validación completa de la fase.

Reglas obligatorias:

- `IMPLEMENTED` significa que el código existe; **no** que funcione.
- Un endpoint registrado no cuenta como implementado si no ejecuta el caso de uso, respeta el código HTTP y cumple el contrato de respuesta.
- Un repositorio no cuenta como verificado hasta probar mapeo, persistencia y errores de infraestructura.
- Tras cada edición sustantiva se ejecuta primero el check más estrecho que pueda falsar la hipótesis del cambio.
- Después de una reparación, no se continúa con otra fase hasta que la validación vuelva a pasar.
- Los agentes devuelven archivos modificados, evidencia, comandos ejecutados, resultado y bloqueos; no declaran éxito sin ejecutar su gate.

### 3.3 Política de trabajo existente e idempotencia

- Preservar cambios del usuario y trabajar sobre ellos; no hacer reset, checkout destructivo ni sobrescritura masiva.
- Leer el archivo antes de editarlo y aplicar cambios mínimos.
- Buscar implementaciones equivalentes antes de crear archivos nuevos.
- Si una tarea ya está resuelta, marcarla `VERIFIED` mediante pruebas en lugar de reimplementarla.
- Si el comportamiento actual y el SDD discrepan → `REPAIR_CONTRACT`: documentar la decisión y modificar el origen del comportamiento, no parchear otra capa.
- No ejecutar agentes en paralelo si comparten archivos, símbolos, migraciones, tablas, contratos o configuración.
- **Freno de mano ([AGENTS.md, sección 0.3](../AGENTS.md#03-el-freno-de-mano-cero-asunciones)):** una funcionalidad sin especificación o con especificación ambigua detiene la implementación y escala al Owner.

### 3.4 Ciclo operativo por tarea

```text
diagnosticar -> elegir tarea mínima -> editar -> validar localmente
    ^                                      |
    |                                      v
  reparar <-------- falla <------------ registrar evidencia
```

Una tarea termina solo cuando su criterio de salida es verificable. Si falla tres veces en la misma superficie, se detiene, se conserva la evidencia y se escala la decisión en lugar de seguir generando código dependiente.

### 3.5 Comandos de validación y gates por fase

| Momento | Comando | Resultado esperado |
|---|---|---|
| Compilación | `cd backend; dotnet build Zentric.slnx -warnaserror` | `Build succeeded` — `0 Warning(s) 0 Error(s)` (OBS-06 cerrado) |
| Suite completa | `cd backend; dotnet test Zentric.slnx --nologo` | 580/580 |
| Filtro puntual | `dotnet test --filter FullyQualifiedName~<Suite>` | 0 fallos en la suite filtrada |
| Diagnóstico git | `git status --short` · `git log --oneline -5` | árbol acorde a lo declarado |
| Persistencia (Fase 6) | `docker compose up -d db` + aplicar migraciones EF | PostgreSQL saludable |
| Docker (Fase 6) | `docker compose config` → `build --no-cache` → `up -d` → `ps` → smoke → `down` | gate completo ([sección 11.4](#114-gates-y-criterios-de-finalización-del-proyecto)) |

Reglas: no ejecutar literalmente un comando que no exista en el proyecto (registrar el comando real y su código de salida); un warning no debe ocultar un código de salida fallido.

### 3.6 Formato del reporte de tarea y del informe de cierre

Cada tarea reporta: archivos modificados, evidencia, comandos ejecutados con resultado, pruebas, bloqueos y siguiente acción.

Informe de cierre de sesión o entrega:

```text
Estado: COMPLETE | BLOCKED | IN_PROGRESS
Stack validado: ...
Fase seleccionada y motivo: ...
Cambios realizados: ...
Comandos ejecutados y códigos de salida: ...
Pruebas: unitarias .../...; integración .../...; E2E .../...
Docker: build ...; servicios saludables ...; smoke tests ...; apagado ...
Gates aprobados: ...
Faltantes o bloqueos: ...
Siguiente acción exacta: ...
```

Regla: si existe una prueba fallida, un endpoint simulado, una dependencia no validada o un gate no ejecutado, el estado máximo permitido es `IN_PROGRESS` o `BLOCKED`, nunca `COMPLETE`.

## 4. Fases detalladas (Fase 0A → Fase 6)

> Cada tarjeta resume objetivo, entregables, estado real al 2026-09-26 y gate. El detalle por capa está en la sección 7.

### FASE 0A — Detección de stack

- **Objetivo:** confirmar lenguaje, framework y estructura antes de generar cualquier archivo.
- **Entregables:** stack detectado y justificado.
- **Realidad:** C#/.NET 10 con 5 proyectos y solución `Zentric.slnx` `[CONFIRMADO]`. ✅ `VERIFIED`.
- **Gate:** cumplido (5 `.csproj` leídos).

### FASE 0B — Infraestructura local y configuración

- **Objetivo:** PostgreSQL local + configuración de la API.
- **Entregables:** `docker-compose.yml` (PostgreSQL 16 en 5432), cadena de conexión, esquema vía migraciones EF.
- **Realidad:** ✅ `VERIFIED` el 2026-09-27: migraciones aplicadas contra PostgreSQL real (`__EFMigrationsHistory` con `InitialCreate`, `CompleteSchema`, `AddBackgroundServicesAndUpdates`, `AddVendorIdToOrderItem`, `AddVendorIdToInvoice`) y tablas verificadas por lectura directa.
- **Gate pendiente:** `docker compose up -d db` + aplicar migraciones contra PostgreSQL real y verificar tablas.

### FASE 0C — Compose y entorno Docker

- **Objetivo:** dejar el entorno listo sin exigir el build final (pertenece a la Fase 6).
- **Entregables:** `Dockerfile` multi-stage, `.dockerignore`, compose con red/volúmenes/healthchecks.
- **Realidad:** ✅ `VERIFIED` el 2026-09-27: `docker compose up --build` ejecutado, healthcheck de PostgreSQL en estado *healthy* y `GET /health` respondiendo `{"status":"healthy","database":"up"}`.
- **Gate pendiente:** sección 11.4.

### FASE 0D — SDD de frontend

- ➖ **NO APLICA:** este repositorio es exclusivamente backend. No se generan documentos ni código de frontend. Si el Owner incorpora un frontend, se definirá su propia fase con contrato aparte.

### FASE 1 — Dominio core

- **Objetivo:** capa de dominio pura, sin frameworks ni dependencias externas.
- **Entregables:** 10 agregados raíz, entidades hijas, 5 value objects, 11 enums, 7 eventos de dominio, 3 servicios de dominio y 10 puertos de repositorio.
- **Realidad:** ✅ `VERIFIED` (551/551; `Zentric.Domain` sin `PackageReference`; única excepción admitida: `IClock` como puerto propio, sin paquetes externos).
- **Gate:** cumplido.

### FASE 2A — Persistencia relacional (EF Core/PostgreSQL)

- **Objetivo:** repositorios EF aislados del dominio.
- **Entregables:** 13 `*DbModel` (12 con `DbSet` + `MoneyDbModel`) + 10 mappers + 10 repositorios + `ZentricDbContext` (12 `DbSet`).
- **Realidad:** ✅ `IMPLEMENTED` (aislamiento EF verificado: el DbContext no referencia entidades de dominio).
- **Gate:** ✅ **cumplido 2026-10-06** — OBS-03 cerrado (esquema creado con `MigrateAsync()` y usado contra PostgreSQL real en la suite E2E) y OBS-06 cerrado (0 warnings). **Sigue pendiente** el `docker compose up` manual sobre volumen limpio.

### FASE 2B — Eventos de dominio y UnitOfWork

- **Objetivo:** publicar y despachar eventos dentro de la transacción de persistencia.
- **Entregables:** `IDomainEventDispatcher` + `DomainEventDispatcher` + `UnitOfWork` con despacho + `DomainEventNotification<T>`.
- **Realidad:** ✅ `IMPLEMENTED` (flujo Devoluciones → `ReturnToUsedStock` operativo vía evento).
- **Gate pendiente:** prueba directa del dispatcher y de la transaccionalidad.

### FASE 2C — Puertos de entrada CQRS

- **Objetivo:** exponer los casos de uso como commands y queries.
- **Entregables:** 25 commands + 14 archivos de queries con handlers y `Result<T>`.
- **Realidad:** ✅ `VERIFIED` (21 ficheros de pruebas de aplicación + suite de queries).

### FASE 3A — Servicios de dominio y casos de uso

- **Objetivo:** implementar la lógica de negocio orquestada.
- **Entregables:** `InventoryReservationService` (reserva multi-bodega con fallo si no alcanza), `ReturnsApprovalService`, flujo `Cart → Checkout → Pay → Dispatch`.
- **Realidad:** ✅ `VERIFIED` por pruebas. **OBS-01 cerrado 2026-09-27 (V-02):** la reserva ordena por `AvailableQuantity` descendente con desempate estable por `Id`, cubierta por `InventoryReservationServiceTests`.

### FASE 3B — REST, DTOs y validadores

- **Objetivo:** exponer los casos de uso por HTTP con validación de entrada.
- **Entregables:** 8 controladores de negocio + `ApiControllerBase` (41 endpoints), 13 validadores FluentValidation, Problem Details, Swagger (Bearer, XML docs)
- **Realidad:** ✅ con pruebas E2E HTTP contra PostgreSQL efimero (T-032, ADR-0016). El smoke de PowerShell se mantiene como script de una mano.

### FASE 4 — Integración local y seguridad

- **Objetivo (adaptado):** handler global de excepciones + conectividad local + esquema de seguridad documentado.
- **Entregables:** `AddProblemDetails()` + `UseExceptionHandler()`; esquema `Bearer` en Swagger; Auth real declarado **fuera de alcance** por la Ley ([sección 3.2](#32-estados-transiciones-y-límites) de [ZENTRIC.md](../ZENTRIC.md)).
- **Realidad:** ⚠️ `PARTIAL` hasta ejecutar el smoke (400/404/500 con Problem Details).

### FASE 5A / 5B — Pruebas

- **5A (dominio y servicios):** ✅ `VERIFIED` — 62 archivos de suite, 562 casos en verde, incluida la suite de integración DI y las pruebas deterministas de tiempo (`Orders/CartExpirationTests` con `ManualClock`).
- **5B (adaptadores y REST):** ⚠️ `PARTIAL` — cubiertos validadores, pipeline, queries y **12 suites E2E HTTP contra PostgreSQL real** (matriz de autorización, propiedad, flujo de negocio, contrato de `enum`, ciclo de vida de devoluciones y despachos, los cinco listados y reserva atómica). **Falta el smoke de errores 400/404/500.**
- **Regla:** una prueba unitaria con mocks **no** sustituye una prueba de integración con base de datos real.

### FASE 6 — Reparación, Docker e integración real (siguiente fase activa)

Orden obligatorio:

1. Build/tests ya reparados: build ✅ (0 warnings, OBS-06 cerrado) y tests **562/562** ✅ (2026-10-09).
2. Ejecutar el alignment gate ([sección 3.1](#31-diagnóstico-obligatorio-y-selección-de-tarea)).
3. Validar configuración y puertos reales de PostgreSQL vía compose.
4. `docker compose build --no-cache` (o el comando equivalente documentado).
5. `docker compose up -d` y comprobar `docker compose ps` con servicios `healthy` (requiere añadir healthchecks).
6. Verificar conectividad con nombre de servicio `db` dentro de la red Docker (nunca `localhost`).
7. Smoke: `/swagger`, endpoints de lectura y flujo mínimo carrito → checkout → pago.
8. `docker compose down` y repetir arranque en limpio; no declarar éxito si depende de artefactos previos.

Estado actual: 🟡 `NOT_STARTED`. Cada paso deja evidencia en el registro ([sección 12](#12-registro-de-acciones-y-control-del-documento)).


## 7. Estado de implementación por capa

> Verificado el 2026-09-26 por enumeración de archivos + `dotnet test` (334/334). Leyenda: ✅ hecho · ⚠️ parcial · 🟡 pendiente.

### 7.1 Zentric.Domain (el centro)

✅ **Hecho**
- **10 agregados raíz:** `User`, `Buyer`, `Product`, `Inventory`, `Warehouse`, `CustomerOrder`, `FulfillmentOrder`, `Invoice`, `ReturnRequest`, `PaymentReceipt`; entidades hijas `ProductVariant`, `OrderItem`, `Shipment`, `RefundCredit`, `StockAdjustmentRecord`.
- Value Objects: `Email`, `FullName` (Users), `Address` (Buyers), `Money`, `VariantAttribute` (Products). Enums (11): `UserRole`, `UserStatus`, `ProductType`, `ProductStatus`, `OrderStatus`, `OrderCancellationCause`, `FulfillmentStatus`, `ReturnStatus`, `InvoiceType`, `PaymentStatus`, `WarehouseType`.
- **7 eventos de dominio: todos emitidos.** Se emiten `OrderCreatedDomainEvent`, `OrderPaidDomainEvent`, `PhysicalProductShippedDomainEvent`, `PartialFulfillmentCancelledDomainEvent`, `ReturnApprovedEvent`, `StockAdjustedDomainEvent` y `CartExpiredDomainEvent` (emitido en `CheckoutTimeoutService`). Consumidores: `ReturnApprovedEventHandler`, `CartExpiredDomainEvent` (log), `PartialFulfillmentCancelledConsumer` (auto-refund por quiebre).
- 3 servicios de dominio: `InventoryReservationService` (reserva multi-bodega con fallo si no alcanza), `ReturnsApprovalService`, `OrderFulfillmentProgressSynchronizer`.
- 9 puertos de repositorio, uno por agregado.
- Reglas duras implementadas y probadas: INV-01 (no negatividad), CAT-03 (variante obligatoria en físicos), estados de pedido/despacho/devolución, "Stock Fantasma" (`CancelDueToNoStock` + `ReconcileGhostStock`), devolución aprobada → stock "Usado" (ADD-002).

⚠️ **Deuda registrada**
- Sin abstracción de tiempo (`DateTime.UtcNow` directo en entidades — H-06): las reglas temporales (timeout) no son deterministas en pruebas.
- Naming residual (`ReciveReturnedStock`; `Avalible` ya corregido a `Available`): Q-09 abierta.
- IDs `Guid` planos y ausencia de VO `Address` (G-07, T-004).

### 7.2 Zentric.Application (orquestación)

✅ **Hecho**
- **16 Commands** con handler y `Result<T>`: `CreateUserCommand`; `CreateWarehouseCommand`; `CreateProductCommand`, `PublishProductCommand`; `AddStockCommand`; `CreateCartCommand`, `AddOrderItemCommand`, `CheckoutOrderCommand`, `PayOrderCommand`; `CreateFulfillmentOrderCommand`, `DispatchFulfillmentCommand`, `CancelFulfillmentOrderDueToNoStockCommand`; `RequestReturnCommand`, `InspectReturnCommand`, `ApproveReturnCommand`; `GenerateInvoicesCommand`.
- **8 archivos de Queries** (11 endpoints GET): Users, Warehouses, Catalog, Inventories, Orders, Logistics, Returns, Billing.
- **13 validadores FluentValidation** + `ValidationBehavior<,>` (fallo de negocio sin excepción; registrados con `AddOpenBehavior`).
- `ReturnApprovedEventHandler` (comunicación Devoluciones → Inventario por evento).
- `Result`/`Result<T>`, `DomainEventNotification<T>`, `IUnitOfWork`.
- Flujo de checkout completo: `Cart → Checkout (reserva + creación de FulfillmentOrder por vendedor) → Pay → Dispatch`, con cancelación por timeout vía background service.

⚠️ **Deuda registrada**
- Los handlers traducen guardas conocidas del dominio con `catch` filtrado (`ArgumentException`/`InvalidOperationException`) → `Result.Failure` (11 archivos). Es consistente entre sí, pero **requiere ratificación del Owner** por su relación con AGENTS.md, sección 3.2 (observación OBS-02, [sección 10.2](#102-riesgos-y-observaciones-vigentes)).
- `InventoryReservationService` reserva recorriendo bodegas sin criterio explícito de prioridad (bodega única primero / mayor stock / `Marketplace`), que es lo que dicta ADR-0001 (observación OBS-01; verificación V-02, [sección 9.2](#92-verificaciones-de-consistencia-pendientes)).
- Sin cobertura de tests E2E HTTP (T-032).

### 7.3 Zentric.Infrastructure (tecnología)

✅ **Hecho**
- `ZentricDbContext` con **12** `DbSet<*DbModel>` (aislamiento estricto EF ↔ Domain: H-13 cerrado), 10 mappers (`*Mapper`), 13 modelos (`*DbModel`; `MoneyDbModel` no tiene `DbSet`, es un VO embebido).
- 10 repositorios EF + `UnitOfWork` que guarda y **despacha los eventos de dominio** (`DomainEventDispatcher`).
- `CheckoutTimeoutService` (BackgroundService): barre cada minuto, cancela pedidos expirados (15 min), devuelve stock reservado y registra log. **El umbral se calcula con `IClock` inyectado**, no con `DateTime.UtcNow` (H-06, [ADR-0010](Adr/0010-relojo-como-puerto-iclock.md)).
- Adaptadores de seguridad y tiempo: `Pbkdf2PasswordHasher`, `JwtAuthTokenService` (exp desde `IClock`) y `SystemClock` (singleton sin estado).
- **10 migraciones generadas y aplicadas al arrancar** en entorno `Development` (`Program.cs:229`): `InitialCreate`, `CompleteSchema`, `AddBackgroundServicesAndUpdates`, `AddVendorIdToOrderItem`, `AddVendorIdToInvoice`, `AddPaymentReceipts`, `SplitBuyerAddressIntoColumns`, `AddRefundCredits`.
- `Dockerfile` multi-stage (runtime con `curl` solo para el sondeo) y `docker-compose.yml` (PostgreSQL 16 + API). El healthcheck de la API es `curl -f http://localhost:8080/health`: la orden anterior (`dotnet … --health`) arrancaba una segunda copia de la API en el mismo puerto, fallaba con "address already in use" y dejaba el contenedor **`unhealthy` de forma permanente**.

⚠️ **Deuda registrada**
- OBS-03 **cerrado 2026-10-06 en el camino de pruebas**: las migraciones se aplican y el esquema se usa contra PostgreSQL real en cada corrida de la suite E2E. **Queda** la verificación manual con `docker compose up` sobre volumen limpio.
- Credenciales de PostgreSQL en claro en `Zentric.Api/appsettings.json` (R-16; OBS-04).
- Sin índice único verificado en BD para `Email`/`IdentityDocument` (la unicidad hoy es de aplicación) — **marcador vivo de `backendSDD/Domain/`**.

### 7.4 Zentric.Api (presentación)

✅ **Hecho**
- `Program.cs` (Composition Root) + `ApiControllerBase` + **9 controladores** (8 de negocio + `Auth`) = **39 endpoints HTTP**.
- **RG-03 (Q-21) cerrado 2026-09-29:** `Security/AuthorizationPolicies.cs` con las **20** políticas y su
  diccionario `política → roles`; registro dinámico en `Program.cs`; `FallbackPolicy` que exige token
  en toda ruta sin decorar; las 39 acciones decoradas con `[Authorize(Policy = …)]` y anonimato
  explícito solo en `POST /api/auth/login`, `POST /api/users` (`role = Buyer`) y `GET /health`.
  **2026-10-06:** la matriz tenía 18 porque Q-23 (`FulfillmentDeliver`) y Q-24 (`ReturnRefund`),
  dictados el 2026-10-01, quedaron solo en el código; hoy la spec y el código coinciden en las 20.
  Spec: [Presentation/02-authorization.md](Presentation/02-authorization.md) · [ADR-0011](Adr/0011-matriz-autorizacion-por-rol.md).
- RFC 9457 (`AddProblemDetails()` + `UseExceptionHandler()`), validadores y comportamiento de pipeline registrados.
- Swagger UI (`/swagger`) y OpenAPI v1 (`/swagger/v1/swagger.json`): esquema `Bearer` (JWT) preparado, XML docs activadas, 8 tags por bounded context. Rutas abiertas en desarrollo hasta que exista el módulo técnico de Auth (fuera de alcance).

- Pruebas de extremo a extremo automatizadas por HTTP/TestServer (T-032): la API **sí** se ha
  levantado contra peticiones reales y el smoke de autorización está versionado
  (`backend/scripts/authorization-smoke.ps1`, 36 comprobaciones, exit code explícito para CI), pero **no corre
  en el runner de xUnit**: exige un contenedor levantado y hay que invocarlo a mano. Hueco dejado el
  2026-09-29 al limpiar basura del repo: el smoke **no** cubre los cuatro escenarios de RG-01 que se
  verificaron a mano y cuyo script auxiliar (`obj/e2e-check.ps1`, no versionado) se eliminó — ataque
  por cabecera `X-Buyer-Id`, token forjado sin firma, contraseña corta y `GET /health` anónimo.
  Devolverlos al smoke o al runner es parte de esta tarea.

### 7.5 Zentric.Tests (QA)

✅ **Hecho** — 40 archivos (39 suites con casos + `ManualClock`), **348 casos en verde** (2026-09-29): reglas de dominio por agregado (Inventory, Warehouse, User, Product/Variantes, Money, CustomerOrder, FulfillmentOrder, Invoice, ReturnRequest), validadores FluentValidation, comportamiento del pipeline, autenticación (`Security/`: hasher PBKDF2, emisor JWT con `IClock`, `LoginCommandHandler`, acceso por claims), la **matriz de autorización por reflexión** (`Presentation/EndpointAuthorizationMatrixTests`: ninguna acción sin política, coincidencia con la spec, ninguna política muerta, reglas de la Ley) y una suite de integración DI real (dispatcher + FluentValidation + handlers con repositorios falsos). Las reglas dependientes de tiempo se prueban moviendo un reloj falso (`ManualClock`), nunca durmiendo el proceso.

🟡 **Pendiente** — `Buyer` y VOs `Email`/`FullName` sin pruebas propias (T-002b); con pruebas E2E HTTP automatizadas contra PostgreSQL efimero; sin pruebas de la real.

### 7.6 Build, higiene y operación

| Artefacto | Estado |
|---|---|
| `.editorconfig` | ✅ Presente |
| CI `.github/workflows/ci.yml` | ✅ restore + build + test (.NET 10) — `[OBSERVADO]` solo dispara en push/PR a `main`, no a `develop` (OBS-05, [sección 10.2](#102-riesgos-y-observaciones-vigentes)) |
| `Dockerfile` + `docker-compose.yml` | ✅ Presentes; el healthcheck usa `curl -f /health` |
| `.dockerignore` | ✅ Presente (verificado 2026-10-06); **ojo, los `Dockerfile` viven en `backend/Dockerfile` y `frontend/Dockerfile`, no en la raíz** (gate Docker, [sección 11.4](#114-gates-y-criterios-de-finalización-del-proyecto)) |
| `README.md` | ✅ Publicado (matriz técnica, diagramas, guía de arranque) |
| Analizadores / `TreatWarningsAsErrors` | ✅ **Resuelto 2026-09-30** (R-08): `backend/Directory.Build.props` activa `EnableNETAnalyzers` y `TreatWarningsAsErrors` en los 5 proyectos; **0 warnings** hoy (OBS-06 cerrado 2026-09-27) |

## 8. Decisiones, ADRs y ADDENDA

### 8.1 Decisiones del Owner aplicadas (fuente: ADRs)

| Pregunta resuelta | Decisión | Registro |
|---|---|---|
| Q-01 — ¿fraccionar la reserva entre bodegas? | **A3 híbrido:** bodega única si cubre; fraccionamiento solo como contingencia si ninguna cubre; fallo + liberación si la suma no alcanza. N guías cuando hubo fraccionamiento | [ADR-0001](Adr/0001-reserva-fragmentacion-contingencia.md) |
| Q-02 — ¿clave del inventario: producto o variante? | **B2:** inventario por `VariantId` (SKU); `ProductVariant` como entidad hija; clave `(VariantId, WarehouseId)` | [ADR-0002](Adr/0002-clave-inventario-variantid.md) |
| Q-10 — ¿variante obligatoria? | **C3:** obligatoria solo en `Physical`; `Digital` puede nacer sin variantes (CAT-03) | [ADR-0003](Adr/0003-variante-obligatoria-productos-fisicos.md) |
| Q-03 — cancelación de despacho | Estado único `Cancelled` + `CancellationReason` (Stock Fantasma) | [ADR-0004](Adr/0004-estado-cancelacion-despacho.md) |
| Q-04 — ¿`Cart` es estado de `CustomerOrder`? | Sí: `Cart` es estado inicial con timeout de 15 min | [ADR-0005](Adr/0005-modelado-carrito-compras.md) |
| Q-13 / C-08 — Ley duplicada (`DOMINIO 8/9/10`) | **El ADDENDUM tiene la última palabra** sobre el bloque base; se adoptan sus estados/reglas para Logística, Devoluciones y Facturación | [ADR-0006](Adr/0006-resolucion-contradiccion-ley-addendum.md) |
| Q-21 — ¿qué rol puede llamar a qué endpoint? (RG-03) | **Opción A (2026-09-29):** escrituras exactas como las fija la Ley; **Administrador y Supervisor solo lectura** de pedidos, despachos, devoluciones y facturas. El Admin **no** aprueba devoluciones | [ADR-0011](Adr/0011-matriz-autorizacion-por-rol.md) |
| Q-22 — ¿cómo viajan los `enum` en el contrato REST? | **Forma estricta (2026-09-29):** el cuerpo JSON **solo acepta el nombre** (`"Seller"`); un entero responde `400`. No existe forma numérica del contrato | [ADR-0012](Adr/0012-contrato-json-de-los-enum-por-nombre.md) |

### 8.2 Adiciones a la Biblia (`[ADDENDUM - DICTADO POR OWNER]` en ZENTRIC.md)

| ID | Dominio afectado | Regla dictada (resumen) | Cumplimiento en código |
|---|---|---|---|
| ADD-001 | Dom. 8 — Logística | Ciclo de cinco estados: `PendingPack → Packed → Dispatched → Delivered`, más `Cancelled`; **Stock Fantasma** → cancelación con devolución obligatoria. El resumen anterior decía solo "Empacado/Despachado", lo que contradecía el ADDENDUM y quedó corregido al cerrar V-01 | ✅ `FulfillmentStatus` (5 estados, nace en `PendingPack`) + `CancelDueToNoStock` + `ReconcileGhostStock` (verificación V-01, [sección 9.2](#92-verificaciones-de-consistencia-pendientes)) |
| ADD-002 | Dom. 10 — Devoluciones | Prohibida la devolución de digitales; flujo físico inspección → aprobación del Vendedor → vuelta al stock con etiqueta "Usado" | ✅ `ReturnRequest` + `ReturnApprovedEvent` → `ReturnToUsedStock` (H-14 cerrado) |
| ADD-003 | Dom. 9 — Facturación | Factura Maestra, Detalle Zentric y Factura de Vendedor (Split) | ✅ `InvoiceType` = `Master`, `ZentricDetail`, `VendorDetail` |
| ADD-004 | Dom. 7 — Pedidos | Bloque ADDENDUM 2026-10-03: estado **Anulado** — expiración del plazo de reserva sin pago (incluidos cobros rechazados); al anularse libera stock y queda inmodificable | ✅ `OrderStatus.Cancelled` + `CheckoutTimeoutService` → `CancelDueToTimeout()` (solo `Cart`/`PendingPayment`; único punto de asignación, verificado 2026-10-03) |
| ADD-005 | Dom. 8 — Logística | Bloque ADDENDUM 2026-10-03: en quiebre de stock fantasma se cancela el **despacho** (porción de un vendedor) con devolución parcial; el pedido no se anula | ✅ `CancelDueToNoStock` + reembolso parcial (EXC-01/EXC-02); el pedido completo no se toca |

✅ **RESUELTO — el rótulo ya está en la Biblia.** C-10 pedía autorización para rotular el bloque base de `DOMINIO 8/9/10` y esa autorización es innecesaria: el Owner **añadió el rótulo él mismo** en el commit `c347924` (2026-09-19, autor `D-MachadoDev`, mensaje *"agregar addendum unificado de dominios 8, 9 y 10 dictado por el owner"*), donde la línea `# [ADDENDUM - DICTADO POR OWNER]` aparece como adición (`+`) del propio commit. Se cumple lo que exige [AGENTS.md, sección 0.7](../AGENTS.md#07-inmutabilidad-de-los-documentos-biblia-y-registro-de-cambios) y, además, la precedencia del ADDENDUM está resuelta en [ADR-0006](Adr/0006-resolucion-contradiccion-ley-addendum.md). Este párrafo estaba obsoleto: afirmaba que el rótulo no existía.

### 8.3 Trazabilidad de preguntas ya cerradas

| Pregunta | Estado | Evidencia |
|---|---|---|
| Q-01, Q-02, Q-10 | ✅ Resueltas 2026-09-17 | ADR-0001/0002/0003 |
| Q-03, Q-04 | ✅ Resueltas | ADR-0004/0005; código y pruebas alineados |
| Q-13 (bloqueante) | ✅ Resuelta 2026-09-19 | ADR-0006; `FulfillmentStatus`, `InvoiceType` y flujo de devolución corregidos |
| Q-14 | ✅ **Resuelta 2026-09-27** — verificado el `.nuspec` de MediatR 14.2.0 (RPL 1.5 / comercial). MediatR **eliminado** y sustituido por dispatcher propio; ver [ADR-0007](Adr/0007-dispatcher-propio-sustituye-mediatr.md) | Cerrada (R-19 mitigado) |

> **Regla:** ninguna decisión se "resuelve" solo en código. Si un cambio toca una regla de negocio, primero se dicta/documenta (ADR o ADDENDUM) y después se implementa ([AGENTS.md, secciones 0.3](../AGENTS.md#03-el-freno-de-mano-cero-asunciones) y [0.7](../AGENTS.md#07-inmutabilidad-de-los-documentos-biblia-y-registro-de-cambios)).

## 9. Preguntas abiertas y bloqueos

> **Freno de mano ([AGENTS.md, sección 0.3](../AGENTS.md#03-el-freno-de-mano-cero-asunciones)):** cuando una pregunta esté abierta y el trabajo dependa de ella, el agente **se detiene**, la reporta y propone redactar la especificación antes de escribir código. Solo el Owner dicta las reglas.

### 9.1 Preguntas al Owner (abiertas)

| ID | Pregunta | Impacto | Bloquea |
|---|---|---|---|
| **Q-05** | ✅ **DICTADA 2026-09-27.** El Owner ratifico `Vendor` como término canónico. `Seller` sobrevive solo en `UserRole.Seller` (rol de negocio, término distinto) y en los mensajes de excepción de `Product`/`Warehouse`, ya corregidos a `vendor` | Lenguaje ubicuo / contratos | — |
| **Q-06** | ✅ **RESUELTA 2026-09-27.** Documentos numerados solapados de `backendSDD/Domain/` consolidados: `01-domain-overview.md` queda como índice de navegación y el contenido se fusionó en `01-models.md`; se corrigieron nombres de método inexistentes (`Lock()`/`Unlock()`/`ChangeRole()`) contra el código real (`Block()`/`Activate()`/`UpdateRole()`) | — | — |
| **Q-07** | ✅ **DICTADA 2026-09-27.** El Owner decidió: `IdentityDocument` es **texto libre, obligatorio y no vacío, sin formato ni longitud impuesta**. Implementado: `User` solo recorta el espacio exterior (`.Trim()`), sin patrón ni longitud. No se inventa validación porque la Ley no define un formato y el país de emisión varía por vendedor | Validez de datos de identidad | — |
| **Q-08** | ✅ **DICTADA 2026-09-27.** El Owner decidió: **interfaz de pago simulada y escalable, sin pasarela real**. Implementado y **persistido**: puerto `IPaymentGatewayService` en el Dominio, adaptador `SimulatedPaymentGateway` registrado en el Composition Root, y el cobro se emite como **`PaymentReceipt`** (nombre del invariante 9) con `PaymentReceiptDbModel` + `PaymentReceiptMapper` + `IPaymentReceiptRepository`, verificado en PostgreSQL (`PaymentReceipts`). `PayOrderCommandHandler` cobra **antes** de marcar el pedido y emite el comprobante incluso cuando la pasarela rechaza, para que quede constancia del intento. Sustituir la simulación por una pasarela real no exige tocar Dominio ni casos de uso | Invariante 9 / pagos | — |
| **Q-09** | ✅ **CERRADA 2026-09-27.** Naming canónico aplicado: `ReciveReturnedStock` → **`ReceiveReturnedStock`** (dominio + 4 pruebas), `Available` ya estaba corregido, mensajes de `Product`/`Warehouse` migrados de `seller` a `vendor`. `UserRole.Seller` se conserva por ser un rol de negocio | Coste de renombrado creciente | — |
| **Q-11** | ✅ **RATIFICADA 2026-09-27.** `VariantAttribute`: nombre y valor son **texto libre, obligatorios, máximo 50 caracteres**; sin catálogo cerrado porque la Ley no lo define. Implementado en `VariantAttribute` y documentado con pruebas | Refinamiento de catálogo | — |
| **Q-12** | ✅ **RATIFICADA 2026-09-27.** Las 4 sub-decisiones de ADR-0003 quedaron cerradas y **documentadas tal como las implementa el código**. Corrección relevante: la sub-decisión 4 se redactó como "no lanza" pero el código **sí lanza** `InvalidOperationException` al eliminar la última variante de un `Physical`; se documentó el comportamiento real | Cierre definitivo de ADR-0003 | — |
| **Q-14** | ✅ **CERRADA 2026-09-27.** Verificada la licencia real de MediatR 14.2.0 en el `.nuspec` instalado: es **RPL 1.5 (copyleft) o licencia comercial**, con `requireLicenseAcceptance=true`. **Eliminado MediatR** y sustituido por un dispatcher propio sin dependencias (`ADR-0007`): 40 archivos migrados, `PackageReference` eliminado, 268/268 pruebas en verde | Cumplimiento / sostenibilidad | — |
| **Q-15** | ✅ **RATIFICADA 2026-09-27.** El Owner fijó el reparto en **5 % plataforma / 95 % vendedor** y habilitó el cobro. Implementado: `PlatformFeePolicy.RatifiedSplit = new(0.05m, 0.95m)`, `IsCollectable` pasa a `true`, y `GenerateInvoicesCommandHandler` emite ya el Detalle Zentric cobrable. Pruebas de los dos estados (ratificado y sin repartir) en `InvoiceTests` | **Financiero** | — |
| **Q-16** | ✅ **DICTADA 2026-09-27.** El Owner decidió: multi-moneda **con lista blanca explícita** y rechazo claro al mezclar divisas. Implementado: `SupportedCurrencies` valida contra la lista; `MixedCurrencyException` traduce el cambio de divisa a error de negocio (400) en lugar de 500. Divisa habilitada: COP | Financiero | — |
| **Q-17** | ✅ **RESUELTA por Q-16.** Al adoptar la lista blanca, la validación quedó implementada: `"USD"` y `"ABC"` se rechazan aunque tengan 3 letras | Calidad de datos | — |
| **Q-18** | ✅ **COMPLETADA 2026-09-27.** El Owner decidió: `VendorId` es **instantánea histórica** en la línea del pedido, y **una factura por cada `VendorId`**. Implementado: `OrderItem.VendorId` + migración `AddVendorIdToOrderItem` (verificada en PostgreSQL: `uuid NOT NULL`), validación de que el vendedor sea el dueño real de la variante, y `GenerateInvoicesCommandHandler` agrupando por `VendorId` para emitir una factura de vendedor por grupo (neto = bruto de sus líneas × 0,95) **sin doble conteo** respecto a la factura maestra. **Defecto detectado y corregido en la verificación contra la base real:** la factura se emitía correcta, pero `InvoiceDbModel`/`InvoiceMapper` no transportaban `VendorId`, por lo que se persistía **sin dueño** y las facturas de vendedor quedaban indistinguibles. Corregido con la columna `Invoices.VendorId` (`uuid` nullable, verificada en PostgreSQL) y la migración `AddVendorIdToInvoice`, cubierto con pruebas de ida y vuelta en `InvoiceVendorPersistenceTests` | Financiero | — |
| **Q-19** | **Nombre de la carpeta raíz.** El Owner pidió renombrar `zentric-backend` a `Zentric`. El remoto ya es `github.com/D-MachadoDev/Zentric`, pero **la carpeta local sigue con el nombre viejo**: Windows devuelve `Cannot rename the item because it is in use` mientras un proceso (con alta probabilidad el editor) mantiene la carpeta abierta. Requiere cerrar el editor y renombrar a mano | Organización | Nada del roadmap |
| **Q-20** | **Autenticación (RG-01).** ✅ **DICTADA Y CERRADA 2026-09-28.** La Ley se contradecía: RG-01 exige usuario autenticado, pero el alcance 3.2 excluye los "mecanismos de autenticación técnica". El Owner dictó la **opción (a): autenticación real con login y token**. Implementado en `ADR-0009`: hash PBKDF2-HMAC-SHA256 (600 000 iteraciones) calculado en el servidor —antes `CreateUserCommand` recibía el `PasswordHash` **desde el cliente**, lo que equivalía a no tener credencial—, token JWT HS256 de 60 minutos con claims `sub`/`email`/`name`/`role`, y **política de reserva** que exige token en todo endpoint. `HeaderBuyerAccessor` eliminado y sustituido por `ClaimsBuyerAccessor`, que solo lee el claim `sub`. Verificado contra PostgreSQL real: 13/13 escenarios, incluido el ataque por cabecera `X-Buyer-Id` → `401` | Seguridad · Ley | ✅ Resuelta |
| **Q-21** | **Autorización por rol (RG-03).** ✅ **DICTADA Y CERRADA 2026-09-29 (opción A del Owner)** e implementada en [ADR-0011](Adr/0011-matriz-autorizacion-por-rol.md): **18** políticas en `AuthorizationPolicies` cubriendo las **30** acciones de aquel día, `FallbackPolicy` fail-closed, verificación por reflexión (7 casos) y 33 comprobaciones HTTP reales con los cinco roles (0 fallos). **Hoy son 20 políticas sobre 39 acciones** — se añadieron `FulfillmentDeliver` (Q-23) y `ReturnRefund` (Q-24) el 2026-10-01, y las cinco listas de `ADR-0017` más `pack`/`reject` completaron el catálogo. Spec: [Presentation/02-authorization.md](Presentation/02-authorization.md). **Texto de la pregunta original:** `RG-03` ("ningún participante podrá administrar información fuera de su rol") **no estaba implementado**: se autentica que hay un usuario, pero no se comprueba qué rol puede hacer qué en cada endpoint. Mapear los 30 endpoints a la Matriz de Responsabilidades era una decisión de negocio que la Ley no explicitaba endpoint por endpoint, así que el Freno de Mano prohibía inventarla. Parcialmente derivada de Q-20: `UserRole` ya viaja en el token y `UsersController` ya exige `Administrator` para crear roles distintos de `Buyer` | Seguridad · Ley | ✅ **Resuelta**; abre Q-21b…Q-21e |
| **Q-21b** | ✅ **DICTADA Y CERRADA 2026-09-29** en [ADR-0013](Adr/0013-propiedad-del-recurso-por-rol.md). **La pregunta original:** la matriz autoriza **por rol**, no por dueño, así que `OrderRead`, `ReturnRead` y `BillingRead` dejaban a cualquier Comprador leer pedidos, devoluciones o facturas ajenas si acertaba el GUID. El Freno de Mano prohibía decidirlo porque cambiar el alcance de lo que un rol ve es decisión de negocio. **Dictamen (opción A, estricta y completa, en dos rondas):** la propiedad se comprueba **en la consulta**, no después; el Vendedor ve una **vista filtrada** (sus líneas, su subtotal, sin datos de la competencia); las facturas se reparten por rol; las escrituras toman el `vendorId` del token. **Al cerrarse dejaba pendiente lo que desbloqueaba:** los **listados**. Eso se implementó el 2026-09-30 (ver §3.9 de `Presentation/01-endpoints.md` y [ADR-0017](Adr/0017-listados-de-recurso-propio.md)): cinco endpoints donde el filtro lo decide el rol y no es un parámetro. | Seguridad · RG-03 en profundidad | ✅ **Resuelta** |
| **Q-21c** | ✅ **DICTADA Y CERRADA 2026-09-29.** **¿Quién cancela por quiebre de stock?** El Operador Logístico **tambien** puede ejecutar `POST /api/logistics/fulfillment/cancel-ghost-stock`: el ADDENDUM Dominio 8 estado 5 asigna la cancelación al Vendedor, pero el faltante lo detecta quien está en la bodega, y sin esta apertura el Operador podía preparar, recibir y despachar un paquete pero no reportar que la mercancía no está. Cubierto por `CancelByQuiebre_DictatedQ21c_KeepsSellerAndLogisticsOperator` y por el smoke (Operador: `403` → abierto). Ver [ADR-0014](Adr/0014-enmiendas-a-la-matriz-de-autorizacion.md) | Flujo logístico | Cerrado: el módulo de logística ya tenía la acción documentada |
| **Q-21d** | ✅ **DICTADA Y CERRADA 2026-09-29.** **¿Quién emite las facturas?** Se confirma **solo Administrador**: el comando emite los tres documentos del ADDENDUM Dominio 9, incluido el `ZentricDetail`, que es "control de plataforma"; abrirlo al Vendedor no sería cambiar una política sino **partir el caso de uso** en dos, que es una épica aparte. **El dictamen además cerró dos defectos que la spec del endpoint ya prometía y el código no cumplía:** no se comprobaba que el pedido estuviera pagado ni que no estuviera ya facturado, así que un segundo clic **duplicaba las tres facturas**. Ahora ambos rechazos son `400`, cubiertos por `GenerateInvoicesCommandHandlerTests`. **Corrección de spec:** `02-authorization.md` §6 atribuía el botón al módulo del Vendedor; es del **Comprador** (`Frontend-Role-Modules.md` línea 68). El botón va en el módulo del **Administrador** y el documento del cliente quedó corregido con addendum. Ver [ADR-0014](Adr/0014-enmiendas-a-la-matriz-de-autorizacion.md) | Facturación | Cerrado: el frontend ya sabe dónde va el botón |
| **Q-21e** | ✅ **DICTADA Y CERRADA 2026-09-29.** **¿Qué es `Supervisor`?** Se queda, es de **solo lectura y auditoría** (§5: "consulta y seguimiento operativo") y **no tiene módulo propio**: usa las pantallas compartidas de solo lectura. No se elimina del enum porque `ZENTRIC.md` §5 lo define y la Ley es intocable; el documento desactualizado era `Frontend-Role-Modules.md` línea 6, que declaraba cuatro roles, y quedó corregido a cinco con addendum. Crearle módulo propio habría exigido endpoints de **listado** que la API no tiene (R-03). **Corrección de evidencia:** la etiqueta `[CONFIRMADO] §12 "Gestión de Pedidos" con palomita en los cinco` sobredeclaraba la Ley — §12 tiene cuatro columnas y no incluye al Supervisor; la base real es el dictamen de Q-21. Ver [ADR-0014](Adr/0014-enmiendas-a-la-matriz-de-autorizacion.md) | Lenguaje ubicuo · producto | Cerrado: sin cambios de política en el backend |
| **Q-22** | **Forma del contrato de los `enum` en el cuerpo JSON.** ✅ **DICTADA Y CERRADA 2026-09-29 (forma estricta)** e implementada en [ADR-0012](Adr/0012-contrato-json-de-los-enum-por-nombre.md): el cuerpo **solo acepta el nombre** — `"Seller"` → `200`, `2` → `400`, `"supervisor"` en minúsculas → `200` — registrado en `Zentric.Api/Contracts/EnumJsonContract.cs` con `allowIntegerValues: false`. **Corrección a la premisa con la que se abrió:** no afectaba a «todos los enum de entrada y salida»: las salidas ya devolvían nombres (`order.Status.ToString()`), la query ya los aceptaba, el radio real eran **4 campos de entrada** y `frontend/` no tenía código que enviara enteros. **Texto de la pregunta original:** los enum viajaban como número en el cuerpo y como nombre en la query, y cambiarlo es forma del contrato público, no regla de negocio | Contrato REST · frontend | ✅ **Resuelta**; el frontend pasa a mandar nombres (`Frontend-Adapters.md` §3.2 reescrito) |
| **Q-23** | **¿Quién marca un despacho como `Delivered`?** ✅ **DICTADA Y CERRADA 2026-10-01.** El ADDENDUM Dominio 8 estado 4 ("Entregado: Recibido por el comprador") fija el estado pero **no nombra al actor**, así que es pregunta y no traducción — el Freno de Mano prohíbe deducirlo. **Dictamen: solo el Operador Logístico**, porque cerrar la entrega es trabajo físico de bodega (es quien ve salir la transportadora), igual que el despacho. El Comprador queda en solo lectura —es el rol más restringido y el único con auto-registro anónimo— y el Vendedor queda **excluido a propósito**: cerrar la entrega de su propio paquete lo dejaría certificando su propio servicio. Implementado como `FulfillmentDeliver` en `AuthorizationPolicies.cs` (`POST /api/logistics/fulfillment/{id}/deliver`), deliberadamente **más estrecha** que `FulfillmentOperate`: el Vendedor empaca y despacha, pero no confirma recibido | Logística · Ley (ADDENDUM 8) | ✅ **Cerrada**; quedó registrada solo en el código hasta el 2026-10-06 |
| **Q-24** | **¿Quién ejecuta el reembolso de una devolución aprobada?** ✅ **DICTADA Y CERRADA 2026-10-01.** El ADDENDUM Dominio 10 lista "Reembolsada" como estado pero **no dice quién lo ejecuta**. **Dictamen: solo el Administrador**, por separación de poderes — el Vendedor aprueba que el producto vuelve al stock y si además liberara el dinero concentraría las dos decisiones sobre la misma operación; además es dinero que sale de la plataforma, que es el criterio con el que [ADR-0014](Adr/0014-enmiendas-a-la-matriz-de-autorizacion.md) dejó la emisión de facturas. Implementado como `ReturnRefund` en `AuthorizationPolicies.cs` (`POST /api/returns/{id}/refund`), **distinta de `ReturnApprove`**, que sigue siendo solo-Vendedor | Devoluciones · dinero | ✅ **Cerrada**; quedó registrada solo en el código hasta el 2026-10-06 |
| **Q-25** | **¿Quién lleva un producto a `Suspended` y cuándo?** ✅ **DICTADA Y CERRADA 2026-10-09.** La Ley lista `Published | Suspended | Discontinued` y `publish` reactiva desde `Suspended`, pero no habia camino de entrada. **Dictamen: `POST /api/catalog/products/{id}/suspend` con política `ProductManagement` (solo Vendedor, coherente con que es su catálogo).** Implementado handler, controlador y pruebas BDD. El estado `Suspended` ya no es inalcanzable. | Catálogo · Ley Dominio 5 | ✅ **Cerrada** |
| **Q-26** | **Alcance del bloqueo de usuario (INV-05).** ✅ **DICTADA Y CERRADA 2026-10-06.** La Ley dice que el estado del usuario puede ser "Bloqueado" pero no dice quién lo bloquea ni si es reversible. El marcador INV-05 solo pedía "comando de bloqueo". **Dictamen: bloqueo + reactivación** → `POST /api/users/{id}/block` y `POST /api/users/{id}/activate`, ambos con política `UserAdministration` (solo Administrador). `Activate()` ya existía en el agregado y estaba documentado en `01-models.md` y `02-aggregates-and-entities.md` como comportamiento de `User`; sin reactivación un error del Administrador sería irreversible. Implementados handler, controlador y pruebas BDD. | Seguridad · INV-05 | ✅ **Cerrada** |
| **Q-27** | **El catálogo no filtra por estado y el carrito no comprueba `CanBeSold`.** ✅ **CERRADA 2026-10-09.** Dictámenes del Owner: **Q21 = "arreglarlo ahora"** y **Q22 = B (exención por propiedad)**. Hallada al verificar el SEO del frontend (Q19 del grill de frontend): **la spec promete un comportamiento que el código no cumple** en dos puntos, y la propia spec lo afirma. **Qué promete la spec:** `Presentation/01-endpoints.md:238` — al suspender, *"el producto deja de ser visible en busquedas y no se puede agregar a carritos"*; el XML doc de `CatalogController.cs:90` repite la misma promesa. **Qué hace el código (verificado con comando):** (1) **`GetProductsQuery.cs:35`** llama a `GetAllAsync(vendorId)` sin filtrar `Status`, y `GetProductsPagedQuery` hace lo propio con `GetPagedAsync`; (2) **`ProductRepository.cs:44-84`** no tiene `HasQueryFilter` ni ninguna cláusula `Where(p => p.Status == ...)`, y el único filtrado por `Status` de Infrastructure está en `FulfillmentOrderRepository`/`CustomerOrderRepository`/`ReturnRequestRepository`, no en `ProductRepository`; (3) **`AddOrderItemCommand.cs:71-85`** sólo valida que exista el producto y que haya stock — nunca consulta `CanBeSold`; (4) **`Product.CanBeSold` (`Product.cs:27-30`)** es la guarda exacta que haría falta y **sólo se invoca desde tests** (`ProductTests.cs`, `ProductVariantTests.cs`); ningún handler la usa. **Consecuencia:** un producto `Suspended` o `Discontinued` sigue apareciendo en `GET /api/catalog/products` y sus variantes siguen entrando al carrito. **Por qué es pregunta y no corrección:** corregirlo cambia el comportamiento observable de dos endpoints públicos (un listado que hoy devuelve todo pasaría a devolver sólo `Published`), así que afecta al contrato y a las pruebas existentes, y el Freno de Mano prohíbe que el agente decida el alcance por su cuenta. **Además bloquea Q-28** (catálogo anónimo): abrir el catálogo al público sin este filtro expondría productos que el propio vendedor suspendió. **Resolución (2026-10-09).** El Owner dictó **Q21 = "arreglarlo ahora"** y, al aparecer el alcance del listado, **Q22 = B (exención por propiedad)**. Se implementó en dos pasos. **(1) Carrito:** `product.CanBeSold` en `AddOrderItemCommand.cs`, antes del chequeo de stock, devuelve `400`. Se eligió la guarda del **producto** y no la de la variante porque `Suspend()` (`Product.cs:245`) sólo cambia el estado y deja las variantes activas: una variante sigue "vendible" con su producto suspendido. **(2) Listado:** `CatalogVisibility.VisibleStatus` (`GetProductsQuery.cs`) devuelve `Published` salvo cuando el llamante pide su **propio** `VendorId`, que es su vista de gestión — sin esa excepción `publish` (Q-25) quedaría inalcanzable. El filtro baja al repositorio (`ProductRepository`) porque en el paginado el `CountAsync` corre antes del `Skip/Take`. Sigue el patrón de `CallerId`/`CallerRole` ya usado en ADR-0017 (`GetWarehousesQuery`). **Verificación:** build `0 Warning(s) 0 Error(s)` y **580/580**, incluidas **4 E2E contra PostgreSQL** que prueban el `CountAsync` real — la prueba unitaria por sí sola no bastaría, porque un repositorio que filtrara en memoria devolvería la página bien y el total inflado. Specs sincronizadas: `01-endpoints.md` §3.4 y §3.5 y `02-authorization.md`. | Catálogo · visibilidad | ✅ **Cerrada** 2026-10-09 |
| **Q-28** | **Excepción a RG-01 para el catálogo público (SEO del Buyer).** 🟡 **ABIERTA 2026-10-09, APLAZADA POR EL OWNER.** El Owner fijó el objetivo: *"debemos tener directorio por algo, es un ecommerce… le pide iniciar sesión si no está logueado cuando le doy comprar, ahí es donde va a estar el SEO, que es para el buyer"* → **catálogo navegable sin sesión, login sólo al pulsar *Comprar***. **Por qué no se puede ejecutar:** contradice **RG-01** (`01-system-overview.md:90`: *"Toda operación debe ejecutarse por un usuario autenticado"*), que está en `ZENTRIC.md` — intocable salvo dictamen (`AGENTS.md` 0.7). La política de reserva lo hace efectivo en código (`Program.cs:112`, `FallbackPolicy = RequireAuthenticatedUser()`), y hoy sólo hay tres excepciones: `POST /api/auth/login`, `POST /api/users` (registro de Comprador) y `GET /health`. `GET /api/catalog/products`, `/paged` y `/{id}` exigen `AnyAuthenticatedUser` (`CatalogController.cs:123`, `:141`, `:158`). Abrirlos es una **excepción nueva a RG-01** y exige **`[ADDENDUM - DICTADO POR OWNER]`** en `ZENTRIC.md`. **Previo obligatorio: Q-27** — sin el filtro por estado, el catálogo público expondría productos suspendidos. **Segundo previo (frontend):** el SEO con Vite exige prerender/SSG de esas rutas; el mecanismo se decide al retomar. **Impacto hoy:** ninguna fase del frontend queda bloqueada — las rutas de catálogo se diseñan públicas en `frontendSDD/Frontend-Role-Modules.md` y el guard se pone en el botón *Comprar*, no en la ruta. | Seguridad · RG-01 · SEO | 🟡 **Abierta (aplazada)**; Owner retoma cuando quiera |

### 9.2 Verificaciones de consistencia pendientes

| ID | Verificación | Evidencia del hallazgo |
|---|---|---|
| **V-01** | **RESUELTA.** Dictamen del Owner (2026-09-27): **manda la Ley, no el ADR**; ADR-0006 adopta los cinco estados del ADDENDUM Dominio 8: `PendingPack → Packed → Dispatched → Delivered`, más `Cancelled` por quiebre; el despacho nace en `PendingPack`, cada transición exige la anterior y `CancelDueToNoStock()` se rechaza tras `Dispatched`/`Delivered`. | `ZENTRIC.md` Dominio 8 = `FulfillmentStatus.cs` = [ADR-0006](Adr/0006-resolucion-contradiccion-ley-addendum.md) |
| **V-02** | **RESUELTA por dictamen del Owner (2026-09-30): "el código está bien, se cambia la especificación".** La reserva ordena por **mayor stock, sin preferencia por tipo de bodega** en las tres fuentes: [04-invariants-and-rules.md](Domain/04-invariants-and-rules.md) invariante 2, [ADR-0001](Adr/0001-reserva-fragmentacion-contingencia.md) punto 2 y `InventoryReservationService.cs`. **Por qué no hay preferencia por `Marketplace`:** `Inventory` no transporta `WarehouseType` y con `VendorId = User.Id` (Q-21b) el dueño del stock es el dueño del producto, no el de la bodega: el tipo solo dice quién opera el almacén. | Las tres fuentes coinciden |
| **V-03** | **RESUELTA.** El rótulo `# [ADDENDUM - DICTADO POR OWNER]` está en `ZENTRIC.md` (justo antes de `DOMINIO 8`); lo añadió el propio Owner en el commit `c347924` (2026-09-19). ADD-001 declara los cinco estados del ciclo. | `git show c347924 -- ZENTRIC.md` → `+# [ADDENDUM - DICTADO POR OWNER]`; autor `D-MachadoDev` |

### 9.3 Estado de las preguntas y bloqueos

**Cerradas con evidencia en esta sesión (2026-09-27):**

| ID | Cómo se cerró | Evidencia |
|---|---|---|
| **Q-06** | Documentación de `Domain/` consolidadas; se corrigieron contra el código los nombres de método que no existían (`Lock()`→`Block()`) | `backendSDD/Domain/01-domain-overview.md` ahora es índice |
| **Q-17** | Resuelta como efecto de Q-16: la lista blanca rechaza `"USD"` y `"ABC"` aunque tengan 3 letras | `SupportedCurrencies.Normalize` + pruebas en `MoneyTests` |
| **Q-19** | Renombrar la carpeta local a `Zentric` | ❌ **NO RESUELTA.** La carpeta sigue llamándose `zentric-backend` (verificado el 2026-10-04 con `Get-ChildItem`). El Owner lo intentó el 2026-10-03 y Windows devolvió «Cannot rename the item because it is in use»: el editor tenía la carpeta abierta. Para completarla hay que cerrar VS Code y renombrar a mano. El remoto `github.com/D-MachadoDev/Zentric` ya es correcto |

**Dictadas por el Owner, implementadas y con parte pendiente (2026-09-27):**

| ID | Dictamen | Implementado | **Pendiente** |
|---|---|---|---|
| **Q-15** | ✅ **RATIFICADA 2026-09-27 (ver §9.1):** reparto 5 % plataforma / 95 % vendedor, cobro habilitado | `PlatformFeePolicy.RatifiedSplit=(0.05m, 0.95m)`, `IsCollectable=true` | Sin parte pendiente |
| **Q-16** | Multi-moneda con lista blanca, rechazo claro al mezclar | `SupportedCurrencies` + `MixedCurrencyException` (400, no 500) | Ninguno |
| **Q-18** | `VendorId` como instantánea histórica en la línea | Campo en dominio y persistencia, migración aplicada, validación de propiedad en el handler, agrupación por `VendorId` al emitir, columna `Invoices.VendorId` | Ninguno. La regla quedó escrita como [FAC-03](Domain/06-business-rules.md) el 2026-10-04: N + 2 documentos por pedido y 5 % sobre el subtotal de cada vendedor |

**Abiertas al 2026-09-29: 6.** Ninguna bloquea el build ni las pruebas
(`dotnet build -warnaserror` → 0 warnings · `dotnet test` → 399/399). En esta jornada se cerraron
**Q-21** (autorización por rol), **Q-22** (forma de los `enum`) y **Q-21b** (propiedad del
recurso); quedan las tres que abrió Q-21 (Q-21c…Q-21e) más las tres preexistentes.

| ID | Naturaleza | Por qué no se cierra leyendo el repo |
|---|---|---|
| **Q-21b** | Propiedad del recurso en lecturas, listados y escrituras | ✅ **CERRADA 2026-09-29** — `ADR-0013`, 399/399 pruebas y smoke 69/69 en Docker |
| **Q-21c** | ¿El Operador Logístico puede cancelar por quiebre de stock? | ✅ **CERRADA 2026-09-29** — `ADR-0014`: puede, porque el ADDENDUM no nombra actor y el faltante lo detecta quien está en bodega |
| **Q-21d** | ¿Quién emite las facturas? | ✅ **CERRADA 2026-09-29** — `ADR-0014`: solo Administrador, porque el `ZentricDetail` es control de plataforma |
| **Q-21e** | `Supervisor` sin módulo en el frontend | ✅ **CERRADA 2026-09-29** — `ADR-0014`: rol de solo lectura y auditoría, sin módulo propio |
| **Q-19** | Renombrar la carpeta local a `Zentric` | **✅ RESUELTA 2026-10-03** — el Owner renombró la carpeta; workspace y remoto correctos |
| **Q-27** | El catálogo no filtra por `Status`; el carrito no comprueba `CanBeSold` | ✅ **CERRADA 2026-10-09** — **carrito**: `product.CanBeSold` en `AddOrderItemCommand.cs`; **listado**: `CatalogVisibility.VisibleStatus` en `GetProductsQuery.cs`, sólo `Published` salvo el `vendorId` propio del llamante (**Q22 = B**). Build 0/0 y **580/580**, incluidas 4 E2E contra PostgreSQL |
| **Q-28** | Excepción a RG-01 para catálogo público (SEO del Buyer) | 🟡 **ABIERTA Y APLAZADA 2026-10-09** — objetivo fijado por el Owner, ejecución aplazada; exige ADDENDUM en `ZENTRIC.md`. Previo: Q-27 |
| **V-01** | `FulfillmentStatus` del código vs ADR-0006 | ✅ **RESUELTA** — el ADR-0006 ya adoptó los cinco estados del ADDENDUM (dictamen "que diga la Ley, no el ADR", 2026-09-27); Ley, ADR y código coinciden |
| **V-02** | Orden de reserva de `InventoryReservationService` vs ADR-0001 | ✅ **RESUELTA 2026-09-30** por dictamen del Owner: se retira la preferencia por bodega `Marketplace` y las tres fuentes quedan en "mayor stock, sin preferencia por tipo". Cero cambios de código |

> **Estado real de este bloque tras la ronda del 2026-10-09:** **queda UNA pregunta abierta,
> [Q-28](#91-preguntas-al-owner-abiertas).** [Q-27](#91-preguntas-al-owner-abiertas) se **cerró**
> ese mismo día.
>
> - **Q-27 (verde) — CERRADA.** El Owner dictó **Q21 = "arreglarlo ahora"** y, al aparecer el
>   alcance del listado, **Q22 = B (exención por propiedad)**. Carrito: `product.CanBeSold` antes
>   del chequeo de stock → `400`. Listado: sólo `Published`, salvo cuando el llamante pide su
>   **propio** `vendorId` —esa es su vista de gestión, y sin ella `publish` (Q-25) quedaría
>   inalcanzable—. **Verificación: build 0/0 y 580/580**, incluidas 4 E2E contra PostgreSQL que
>   prueban el `CountAsync` real: un repositorio que filtrara en memoria devolvería la página bien
>   y el total inflado, cosa que ninguna prueba unitaria habría detectado.
> - **Q-28 (ámbar) — excepción a RG-01 para el catálogo público (SEO del Buyer).** Fijada por
>   el Owner como objetivo (**catálogo sin sesión, login al *Comprar***) pero **aplazada por él
>   mismo**; exige `[ADDENDUM - DICTADO POR OWNER]` en `ZENTRIC.md`. **Su único previo, Q-27,
>   ya está resuelto**, así que sólo falta el dictamen del Owner. **No bloquea ninguna fase
>   del frontend**: las rutas de catálogo se diseñan públicas y el guard va en el botón *Comprar*.
>
> **Q-25** (quién lleva un producto a `Suspended`) se **cerró el 2026-10-09** con
> `POST /api/catalog/products/{id}/suspend` (política `ProductManagement`), y **Q-26**
> (alcance del bloqueo de usuario) se cerró el 2026-10-06.
>
> **Q-19** (renombrar la carpeta local a `Zentric`) sigue **aparcada por el Owner para el final del
> proyecto**: es una acción manual suya, no una decisión técnica, y nunca bloqueó el desarrollo.
> Todo lo demás está cerrado: Q-20 (autenticación), Q-21 y sus cuatro sub-preguntas (Q-21b…Q-21e),
> Q-22, **Q-23 (quién entrega) y Q-24 (quién reembolsa), ambas dictadas el 2026-10-01 y transcritas
> a este documento el 2026-10-06**, V-01, V-02 y V-03. **Nada de lo demás bloquea el desarrollo.**
>
> El smoke de autorización versionado (`backend/scripts/authorization-smoke.ps1`) tiene hoy
> El smoke de 69 comprobaciones se mantiene como script de una mano y **ya no es la unica via**: su\n> parte de autorizacion esta convertida en pruebas del runner de xUnit (T-032).

## 10. Riesgos, hallazgos y observaciones

### 10.1 Hallazgos de código H-01…H-14 — estado verificado (2026-09-26)

| ID | Hallazgo | Estado |
|---|---|---|
| H-01 | `DispatchStock` validaba el contador equivocado (reservado negativo) | ✅ **Corregido** — valida `ReservedQuantity` antes de decrementar (`Inventory.cs:91-105`) |
| H-02 | `UpdateQuantities` sobrescribía los tres contadores saltándose las operaciones de negocio | ✅ **Corregido** — el método ya no existe; solo hay mutación por métodos de negocio |
| H-03 | `Buyer.PaymentTokens` contra la invariante 9 | ✅ **Corregido** — `PaymentTokens` eliminado; queda el residual Q-08 (PaymentReceipt/pasarela) |
| H-04 | `MarkAsDeleted()` duplicaba `Delete()` en `Inventory`/`Warehouse` | ⚠️ **Parcial** — ya no hay alias duplicado; revisar el nombre con Q-09 |
| H-05 | `User` sin `IdentityDocument` (obligatorio y único) | ✅ **Corregido** — campo en `User` + guarda + unicidad en `CreateUserCommandHandler` |
| H-06 | `DateTime.UtcNow` directo en entidades (79 usos detectados) | ✅ **Corregido (capa de decisión) 2026-09-29** — el reloj es un puerto (`Common/Ports/IClock`) con adaptador de sistema (`Infrastructure/Common/SystemClock`, singleton) y reloj falso en la suite (`Tests/Security/ManualClock`). Las decisiones de tiempo (umbral de `CheckoutTimeoutService`, caducidad de tokens) consumen `IClock` y se prueban moviendo el reloj (`Orders/CartExpirationTests`: 7 casos, fresco/expirado/borde 15 min/pagado). **Límite documentado:** las marcas `CreatedAt/UpdatedAt/DeletedAt` de los 10 agregados siguen usando `DateTime.UtcNow` directo. Moverlas a `IClock` exige pasar el reloj a cada constructor y fábrica, y choca con la reconstrucción por reflexión de los mappers; ese cambio queda propuesto, no aplicado |
| H-07 | Unicidad de correo "marcada pero no aplicada" | ⚠️ **Parcial** — aplicada en la capa de aplicación (`IsEmailUniqueAsync`); sin constraint verificado en BD |
| H-08 | `ReturnToAvalible` sin guarda de cantidad positiva | ✅ **Corregido** (2026-09-17) — `ReturnToAvailable` valida `quantity > 0` |
| H-09 | `catch (Exception)` genérico en Application | ✅ **Corregido** en SPEC-007 |
| H-10 | La spec de Application prometía validación de stock inexistente | ✅ **Superado** — la reserva real existe (`InventoryReservationService` en checkout); revisar redacción de [Application/01-use-cases-and-ports.md](Application/01-use-cases-and-ports.md) |
| H-11 | Middleware sin `AddProblemDetails()`; FluentValidation sin validadores/pipeline | ✅ **Corregido** en SPEC-007 |
| H-12 | `Class1.cs` vacíos en Application/Infrastructure | ✅ **Corregido** en SPEC-007 |
| H-13 | EF mapeaba agregados de dominio directamente | ✅ **Corregido** — `*DbModel` + mappers convierten en la frontera |
| H-14 | `ReturnToUsedStock` nunca se invocaba (ADD-002 incumplido) | ✅ **Corregido** — `ReturnApprovedEvent` → `ReturnApprovedEventHandler` → stock "Usado" |
| H-15 | Lectura + actualización de la misma fila en un request fallaba en 5 endpoints (`another instance with the same key value is already being tracked`) | ✅ **Corregido 2026-09-29 (encontrado por el smoke de Q-21b, no por las pruebas unitarias: los fakes en memoria no pasan por EF).** `GetByIdAsync` sin `AsNoTracking` dejaba la fila rastreada y `UpdateAsync` adjuntaba un `DbModel` nuevo con la misma clave. Afectaba a **aprobar** y **inspeccionar** devolución, **despachar** y **cancelar por quiebre**, y **publicar** producto. `AsNoTracking()` en las lecturas de los 6 repositorios con el patrón (`ReturnRequest`, `FulfillmentOrder`, `Product`, `Warehouse`, `Buyer`, `Invoice`), siguiendo el precedente ya documentado en `CustomerOrderRepository`. Verificado en Docker: aprobar una devolución real pasó de `400` a `200` |

> **H-16 (resuelto 2026-10-03):** corregido en `InventoryReservationService` (omite las líneas `Digital`, CAT-02) y en `CheckoutOrderCommandHandler` (no abre `FulfillmentOrder` para digitales). Pruebas: `CheckoutOrderCommandHandlerTests` (carrito digital puro y mixto) e `InventoryReservationServiceTests` (línea digital). 517/517.

### 10.2 Riesgos y observaciones vigentes

| ID | Tipo | Descripción | Evidencia | Mitigación propuesta |
|---|---|---|---|---|
| R-06 | Testabilidad | Reloj directo (`DateTime.UtcNow`) en marcas de creación/actualización de los agregados | `User.cs`, `Inventory.cs`, `CustomerOrder.cs`… (las **decisiones** de tiempo ya consumen `IClock`; H-06) | Completar la migración de auditoría a `IClock` o declararla deuda aceptada |
| R-08 | Higiene | Analizadores y `TreatWarningsAsErrors` activos en `backend/Directory.Build.props` | raíz del repo | ✅ **Resuelto 2026-09-30.** `backend/Directory.Build.props` activa `EnableNETAnalyzers` y `TreatWarningsAsErrors` para los cinco proyectos. Antes la política vivía solo en la línea de comandos (`-warnaserror`), así que un `dotnet build` normal en local **no** fallaba con avisos mientras la CI sí. Verificado que un aviso real (CS0169) ahora rompe el build. Se dejó en el nivel por defecto de .NET 10.0 y **no** en `latest-recommended`: medido ese día, `latest-recommended` produce 940 avisos, de los cuales 850 son CA1707 (identificadores con guion bajo), que contradice la convención de nombres del propio proyecto. Subir el nivel es un trabajo aparte |
| R-09 | Lenguaje ubicuo | Naming canónico | ✅ **Resuelto 2026-09-27** (Q-09): `ReceiveReturnedStock`, el agregado es `Inventory` y `Vendor` es el término del vendedor | [sección 9.1](orchestrator-state.md) |
| R-16 / OBS-04 | Seguridad | Credenciales PostgreSQL en claro en `appsettings.json` y en compose | `Zentric.Api/appsettings.json`, `docker-compose.yml` | Mover a user-secrets / variables de entorno antes de producción |
| R-19 | Licencias | MediatR 14 ejecutaba comprobación de licencia en runtime (13+ cambió el modelo a RPL 1.5 / comercial) | stack trace `MediatRServiceCollectionExtensions.CheckLicense` | ✅ **Mitigada 2026-09-27**: MediatR eliminado; dispatcher propio sin dependencias ([ADR-0007](Adr/0007-dispatcher-propio-sustituye-mediatr.md)) |
| R-20 | Dinero | El cargo/liquidación al vendedor no existe: el Vendedor es responsable económico por defecto del reembolso, pero nadie le cobra nada a Zentric ni se le paga a él | [ADR-0018](Adr/0018-devoluciones-confianza-recepcion-responsabilidad.md), `RefundReturnCommand` | **Decisión del Owner 2026-10-05 — [ADR-0023](Adr/0023-split-de-pagos-documentos-no-transferencias.md):** la Ley (Dominio 9) pide por split la Factura de Vendedor, la Factura Maestra y el Detalle Zentric; los tres se emiten ya, con lo que la regla queda **cumplida**. No se construyen transferencias de dinero ni liquidación a vendedor: es un mecanismo que la Ley no describe (criterio R-20). |
| OBS-01 | Consistencia con ADR-0001 | `InventoryReservationService` | `InventoryReservationService.cs` | ✅ **Resuelta 2026-09-27** (V-02): la reserva ordena por `AvailableQuantity` descendente con desempate estable por `Id`; cubierta por `InventoryReservationServiceTests` |
| OBS-02 | Consistencia con AGENTS.md, sección 3.2 | 11 handlers usan `catch` filtrado de guardas conocidas → `Result.Failure` (no hay `catch` genérico pelado) | búsqueda `catch (` en `Zentric.Application` | Ratificación del Owner; documentar el patrón si se aprueba |
| OBS-03 | Persistencia | ✅ **Cerrado 2026-10-06 (en el camino de pruebas).** `ZentricApiFactory` levanta `postgres:16.15-alpine` con Testcontainers y `Program.cs:229` ejecuta `Database.MigrateAsync()` en entorno `Development`, así que las 10 migraciones se aplican y el esquema se usa contra PostgreSQL real en cada corrida de las 12 suites E2E | `Zentric.Tests/E2E/ZentricApiFactory.cs` + `dotnet test` | **Queda** la ejecución manual de `docker compose up` sobre volumen limpio |
| OBS-05 | CI | El workflow solo dispara en `main`; `develop` no se valida en cada push | `.github/workflows/ci.yml` | Ampliar `branches` a `develop` (decisión menor del Owner) |
| OBS-06 | Calidad de build | ⚠️ **Cerrado 2026-09-27** — `dotnet build --no-incremental` reporta 0 warnings; los mappers EF (`WarehouseMapper`, `BuyerMapper`, `InventoryMapper`, `CustomerOrderMapper` ×2, `InvoiceMapper`, `FulfillmentOrderMapper` ×2, `ReturnRequestMapper`, `ProductMapper` ×3) usan `RuntimeHelpers.GetUninitializedObject` (sucesor oficial de `FormatterServices`) | `dotnet build --no-incremental` (2026-09-26) | Migrar la materialización a una fábrica interna por agregado |

### 10.3 Contradicciones de especificación — cierre

- **Cerradas:** C-01/C-02 (ADR-0001/0002), C-03/C-04 (ADR-0004/0005), C-06 (documentos creados), C-08 (ADR-0006), C-09 (skill sincronizada el 2026-09-18).
- **Vigentes:** C-05 residual (Q-05), C-07 (Q-06), C-10 (V-03). Ninguna bloquea build/pruebas; todas requieren dictamen o autorización del Owner.

## 11. Verificación, gates y criterios de finalización

### 11.1 Línea base ejecutada (2026-09-26)

> **Esta tabla es un corte histórico congelado y se conserva sin reescribir** por la misma regla
> *append-only* que el [registro de acciones](#121-registro-de-acciones-append-only). **Sus cifras ya
> no son el estado actual.** Verificación vigente (**2026-10-06**): `dotnet build Zentric.slnx
> -warnaserror` → `0 Warning(s) 0 Error(s)`; `dotnet test Zentric.slnx` → **551/551**; **39** endpoints
> en 9 controladores; **12** `DbSet`; **10** migraciones aplicadas al arrancar; **20** políticas de
> autorización. Los gates actualizados están en la [sección 11.4](#114-gates-y-criterios-de-finalización-del-proyecto).

| Comando / verificación | Resultado | Evidencia |
|---|---|---|
| `cd backend; dotnet test Zentric.slnx --nologo` | ✅ `total: 248, failed: 0, succeeded: 238, skipped: 0` (7.9 s de suite; compilación de los 5 proyectos en la misma corrida) | salida de consola |
| `cd backend; dotnet build Zentric.slnx --no-restore` | ✅ `Build succeeded` — `[OBSERVADO]` **12 warnings `SYSLIB0050`** en mappers de `Zentric.Infrastructure` (OBS-06) | salida de consola |
| `git --no-pager log --oneline -6` | ✅ HEAD `1d85a48` en `develop`; últimos hitos: timeout de checkout con 238 tests, queries CQRS, docs SDD, README y corrección mermaid | salida de consola |
| `git status --short` | ✅ Sin cambios pendientes al inicio de la sesión (los cambios de esta sesión están declarados en la [sección 12](#12-registro-de-acciones-y-control-del-documento)) | salida de consola |
| `(Select-String 'Zentric.Api\Controllers\*.cs' '\[Http').Count` | ✅ **27** endpoints | salida de consola |
| Enumeración de `Zentric.Domain` / `Application` / `Infrastructure` / `Api` / `Tests` | ✅ 9 agregados, 16 commands, 8 archivos de queries, 13 validadores, 9 repositorios, 9 controladores, 29 archivos de suite | listados por archivo |
| `DbSet<` en `ZentricDbContext` | ✅ **9** (todos sobre `*DbModel`) | lectura directa |

### 11.2 Validaciones NO ejecutadas (honestidad de evidencia)

> **Actualizado el 2026-10-06.** Los tres primeros puntos de esta sección estaban describiendo el
> estado del 2026-09-26 y ya **no son ciertos**: hoy están cerrados por la suite E2E. Se conserva la
> lista porque sigue siendo la lista de lo que **no** se ha verificado.

- **PostgreSQL real:** ✅ **cerrado.** `Zentric.Tests/E2E/ZentricApiFactory.cs` levanta `postgres:16.15-alpine` con Testcontainers y `Program.cs:229` ejecuta `Database.MigrateAsync()` en entorno `Development` (el factory fija `UseEnvironment(Environments.Development)`), así que **las 10 migraciones se aplican y el esquema se crea en cada corrida**. **Sí queda sin ejecutar a mano** un `docker compose up` sobre volumen limpio en esta rama: es el mismo camino de código, pero no hay ejecución manual registrada.
- **Comportamiento HTTP:** ✅ **cerrado.** **12 suites E2E con 71 declaraciones de prueba** (`AuthorizationMatrix`, `Ownership`, `BusinessFlow`, `EnumContract`, `FulfillmentLifecycle`, `ReturnLifecycle`, los cinco listados de `ADR-0017` y `InventoryAtomicReserve`) contra la API real montada con `Mvc.Testing`. **Falta** el smoke de errores conocidos/desconocidos (400/404/500) que exige el [gate 11](#114-gates-y-criterios-de-finalización-del-proyecto).
- **Mapeo EF en runtime:** ✅ **cerrado** por esas mismas E2E: `OwnsOne`/`OwnsMany` y las conversiones de Value Objects se ejecutan contra PostgreSQL real en cada corrida de la suite.
- **Lint/análisis estático:** ✅ **cerrado.** `backend/Directory.Build.props` activa `EnableNETAnalyzers` y `TreatWarningsAsErrors` para los cinco proyectos desde el 2026-09-30 (R-08), a nivel por defecto de .NET 10 — **no** `latest-recommended`, que medido produce 940 avisos (850 `CA1707`, que chocaría con la convención de nombres del propio proyecto). 0 warnings hoy (OBS-06 cerrado 2026-09-27; re-verificado 2026-10-06 con `-warnaserror`).
- **Licenciamiento (Q-14):** cerrado. MediatR fue eliminado; FluentValidation 12.1.1 es Apache-2.0 y se mantiene.

### 11.3 Cómo re-verificar (comandos de referencia)

```powershell
# 1) Suite completa (compila + prueba)
cd backend; dotnet test Zentric.slnx --nologo

# 2) Estado del repositorio
git --no-pager log --oneline -5; git status --short

# 3) Conteo de endpoints y de DbSets
(Select-String -Path 'Zentric.Api\Controllers\*.cs' -Pattern '\[Http').Count
(Select-String -Path 'Zentric.Infrastructure\Persistence\ZentricDbContext.cs' -Pattern 'DbSet<').Count

# 4) Integridad de la Ley (debe seguir siendo adiciones sin reescritura del texto original)
git diff --numstat -- ZENTRIC.md

# 5) Sincronía de la skill instalada (hash repo = hash copia)
Get-FileHash '.agents/skills/generic-sdd-agent/SKILL.md' | Select-Object Hash
Get-FileHash "$env:USERPROFILE\.agents\skills\generic-sdd-agent\SKILL.md" | Select-Object Hash
```

### 11.4 Gates y criterios de finalización del proyecto

1. **Compilación y pruebas limpias:** build sin errores y sin warnings y **580/580** pruebas en verde, registrando comando y código de salida. ✅ **Cumplido 2026-10-09** (`dotnet build Zentric.slnx -warnaserror` → `0 Warning(s) 0 Error(s)`; OBS-06 cerrado desde 2026-09-27).
2. **Cumplimiento estricto de las specs de dominio:** cada regla de `backendSDD/Domain/` implementada sin omisiones y con prueba asociada. ⚠️ **Pendiente (2 trabajos de código, 2 marcas):** `CartExpiredDomainEvent` sin consumidor · índice único `Email`/`IdentityDocument`. **Fuera de este gate:** identificador distinto de `Guid` (diseño propuesto, no contrato).
3. **Esquema real:** contra PostgreSQL, las migraciones crean el esquema y la API opera con él. ✅ **Cumplido en el camino de tests** (Testcontainers + `MigrateAsync()` en entorno `Development`); ⚠️ **falta** la verificación manual con `docker compose up` sobre volumen limpio.
4. **Desacoplamiento estricto:** `Zentric.Domain` sin referencias a EF, ASP.NET, HTTP ni MediatR (✅ verificado).
5. **Trazabilidad completa:** `RequestDTO → dominio → caso de uso → servicio → puerto → mapper/repositorio`.
6. **Contrato REST verificado:** los **44** endpoints existen y la **matriz de autorización por rol** (20 políticas) se ejecuta por HTTP real desde la suite (`AuthorizationMatrixE2ETests`, `OwnershipE2ETests`); el flujo E2E de negocio está verificado (`BusinessFlowE2ETests`). ⚠️ **Falta** el smoke de errores 400/404/500.
7. **Validación de integración:** pruebas contra PostgreSQL real (bootstrap, persistencia, lectura y auditoría de eventos). ✅ **Cumplido** — 12 suites E2E sobre `postgres:16.15-alpine` con Testcontainers.
8. **Cierre reproducible:** un agente nuevo repite el diagnóstico y obtiene la misma fase siguiente sin conocimiento conversacional.
9. **Trazabilidad requisito → código → prueba:** matriz 11.5; un requisito sin prueba o evidencia queda `PARTIAL`, nunca `VERIFIED`.
10. **Entrega Docker reproducible:** `Dockerfile`, `.dockerignore`, compose, healthchecks, build sin caché, arranque limpio, smoke y apagado (Fase 6).
11. **Handler global de excepciones:** existe y cumple RFC 9457; falta el smoke de errores conocidos/desconocidos.
12. **Diagnóstico completo por etapas:** cada fase y entregable con estado y evidencia en el tablero 2.2.
13. **Alineación cruzada:** nombres, firmas, códigos HTTP, validaciones y puertos coinciden entre código y SDD (alignment gate, [sección 3.1](#31-diagnóstico-obligatorio-y-selección-de-tarea)).

Regla final: cualquier prueba fallida, endpoint simulado, dependencia no validada o gate no ejecutado deja el estado máximo en `IN_PROGRESS` o `BLOCKED`, nunca `COMPLETE`.

### 11.5 Matriz mínima de trazabilidad (ejemplo vigente)

| Requisito / contrato SDD | Archivo o símbolo | Prueba / comando | Estado | Evidencia |
|---|---|---|---|---|
| INV-01 (no negatividad) | `Inventory.cs` + `IInventoryRepository.TryReserveStockAsync/ReleaseReservedStockAsync` | `InventoryTests` + `InventoryReservationServiceTests` (compensación) + `InventoryAtomicReserveE2ETests` (2 y 10 hilos contra Postgres, nunca negativo) | ✅ `VERIFIED` | 580/580 (2026-10-09) |
| CAT-03 (variante en físicos) | `Product.cs` | `ProductTests` | ✅ `VERIFIED` | 580/580 (2026-10-09) |
| PED-01 (ventana de 15 min) | `CheckoutTimeoutService.cs` | `CartExpirationTests` (con `ManualClock`) | ✅ `VERIFIED` | 7 casos: fresco / 16 min / borde 15 min / pagado |
| ADD-002 (stock "Usado") | `ReturnApprovedEventHandler` | `ReturnRequestTests` + flujo de evento | ✅ `VERIFIED` (diseño + pruebas) | H-14 cerrado |
| Contrato REST (44 endpoints) | [Presentation/01-endpoints.md](Presentation/01-endpoints.md) · [Presentation/02-authorization.md](Presentation/02-authorization.md) | 12 suites E2E (`AuthorizationMatrix`, `Ownership`, `BusinessFlow`, `EnumContract`, los 5 listados) | ⚠️ `PARTIAL` | matriz de 20 políticas, enums, Problem Details, flujo completo (carrito→pago→facturas→devolución) y propiedad cruzada Q-21b verificados por HTTP real · **falta smoke 400/404/500** |
| Migraciones aplicadas | `Migrations/` (10) | `ZentricApiFactory` (Testcontainers `postgres:16.15`) + `Program.cs:229 MigrateAsync()` | ✅ `VERIFIED` en tests · ⚠️ manual pendiente | OBS-03 cerrado en el camino de pruebas el 2026-10-06; **falta** `docker compose up` sobre volumen limpio |
| OBS-06 (warnings de build) | `Mappers/*.cs` | `dotnet build Zentric.slnx -warnaserror` | ✅ `VERIFIED` | 0 warnings (cerrado 2026-09-27, re-verificado 2026-10-06) |
| Reglas de `backendSDD/Domain/` sin implementar | ver [sección 11.4 gate 2](#114-gates-y-criterios-de-finalización-del-proyecto) | `rg "NO IMPLEMENTADO" backendSDD/Domain` | ❌ `FAILING` | **2 marcas**: 1 trabajo de código (`CartExpiredDomainEvent` sin consumidor) + 1 de diseño propuesto (`Guid`). Corte del **2026-10-09**: **FAC-02 implementado** (estado `Anulled` en factura maestra, dictamen FAC-02); **CAT-02 implementado** (registro entrega digital, dictamen CAT-02); **Q-25 cerrada** (`suspend` endpoint, opción A dictada); **INV-05 implementado** (bloqueo + reactivación + guard checkout, dictamen Q-26); **INV-05b implementado** (tasa StockFantasmaRate, incremento en quiebre, guard checkout INV-05b); **ADR-0020 completo** (auditoría reembolso + `RefundPolicyService` + consumidor quiebre + consumidor `PartialFulfillmentCancelled`); **ManualAdjust implementado** como `AdjustInventoryCommand` (`POST /api/inventories/{id}/adjust`, política `InventoryAdjust`); se reclasificaron `FlatShippingFee` (→ APLAZADO por ADR-0008) y la cascada de bloqueo (→ retirada por el Owner) |

### 11.6 Informe de cierre

El formato obligatorio del informe de cierre está definido en la [sección 3.6](#36-formato-del-reporte-de-tarea-y-del-informe-de-cierre); toda sesión lo adjunta al terminar y registra su entrada en la sección 12.

## 12. Registro de acciones y control del documento

### 12.1 Registro de acciones (append-only)

> Formato: `[fecha] acción · objeto · resultado/evidencia`. Las entradas del ciclo anterior a la versión 3.0.0 fueron retiradas por decisión del Owner (2026-09-26): el historial completo permanece en git hasta el commit `1d85a48` y en los ADR.

```text
[2026-09-26] Reestructuración completa de backendSDD/SDD.md → Orquestador agéntico v3.0.0: secciones 0–12, tablero de fases 0A–6, estados NOT_STARTED/PARTIAL/IMPLEMENTED/FAILING/VERIFIED, gates y formato de informe · decisión del Owner · objeto: E-028
[2026-09-26] Eliminación del símbolo de sección (signo tipográfico de párrafo) en todo el repositorio: 28 ocurrencias en 20 archivos de código (Program.cs, controladores, validadores, behavior, dominio y pruebas) + 6 en README/specs + 45 en este documento, reemplazadas por "sección/secciones" · objeto: E-024, E-025, E-028
[2026-09-26] Verificación de completitud contra la metodología v6.0.0: auditoría de las secciones obligatorias (13.2), matriz 360° (12), informe de mapeo (14.8), research log (7.8), gates/fases (10/11) y checklist (21) · se añadieron las secciones 13 a 18 · objeto: E-028
[2026-09-26] Investigación web de estándares vigentes con fuente primaria: OWASP API Top 10 2023, RFC 9457 (obsoleta 7807), .NET 10 LTS hasta 2028-11, PostgreSQL 16.15 hasta 2028-11-09, OpenAPI 3.2.1 (2026-09-10), licencia comercial de MediatR desde 13.0.0 (FluentValidation sin licencia), xUnit v3, Ley 25.326 · hallazgo: se corrige la hipótesis previa de licencia de FluentValidation y se precise el alcance de la licencia de MediatR (solo producción) · objeto: E-019, E-024
[2026-09-26] Conversion de referencias numeradas sueltas a enlaces con ancla (regla 23 de la metodologia): 74 referencias convertidas y validadas, 0 anclas invalidas, 0 ocurrencias del simbolo de seccion · objeto: E-028
[2026-09-26] Re-verificacion ejecutada · cd backend; dotnet test Zentric.slnx --nologo → 256/256 PASS (334 ms) · objeto: E-025
[2026-09-27] Reestructuración a monorepo: `SDD/` → `backendSDD/`, proyectos C# movidos a `backend/`, `frontend/` y `frontendSDD/` creados. 151 referencias migradas en 27 archivos; 360 enlaces Markdown verificados con 0 rotos (se corrigieron 32, incluidos enlaces anidados mal formados en `AGENTS.md` y rutas de código en README/ADRs) · objeto: E-028
[2026-09-27] SPEC-008 aplicado y verificado contra ejecución: (1) 12 warnings `SYSLIB0050` sustituidos por `RuntimeHelpers.GetUninitializedObject` → build con 0 warnings; (2) `Entity._domainEvents` corregido con resolución perezosa, eliminando una `NullReferenceException` en `Checkout`; (3) 6 handlers sin `SaveChangesAsync` (CreateCart, AddOrderItem, CreateFulfillmentOrder, InspectReturn, GenerateInvoices, CancelFulfillmentOrderDueToNoStock) detectados por búsqueda anti-amnesia y corregidos; (4) colisiones de `IdentityMap` en `CustomerOrderRepository` e `InventoryRepository` resueltas con lecturas `AsNoTracking` y actualización explícita · objeto: OBS-06, SPEC-008
[2026-09-27] Entorno real levantado: `postgres:16.15-alpine` healthy, 3 migraciones aplicadas, 13 tablas creadas, `dotnet ef database update` ejecutado, imagen de API construida (exit 0) y `/health` respondiendo `200 {"status":"healthy","database":"up"}` · objeto: OBS-04, OBS-05
[2026-09-27] Flujo E2E verificado contra PostgreSQL real: usuario → bodega → producto con variante → stock → carrito → ítem → checkout → pago → facturación. Confirmado en base de datos: pedido en `PendingPayment` (1) y luego `Paid` (2), stock 50→48 disponibles con 2 reservados, orden de despacho generada y 2 facturas (36.000 ARS maestra + 1.800 ARS detalle Zentric, 5%) · objeto: T-032

[2026-09-27] Auditoría de supuestos propios y corrección de los verificables. La v6.1.0 de la skill exige que el estado sea comprobable, así que se revisó qué se había asumido sin respaldo: (1) **comisión del 5%**, que era un literal mágico en `GenerateInvoicesCommand.cs` sin respaldo en la Ley, extraída a `PlatformFeePolicy` (value object) marcada como supuesto y cubierta con 6 pruebas; (2) **datos de prueba inventados** (6 usuarios, 2 facturas) eliminados con `docker compose down -v`; (3) **`X-Request-Id`**, que el backend no soporta, marcado como `[PROPUESTO]` en `frontendSDD`; (4) **versión de PostgreSQL** fijada por reproducibilidad y documentada como decisión técnica, no requisito de negocio. Resultado: 256/256 PASS · objeto: Q-15, Q-16, Q-17, Q-19
[2026-09-27] Tablero 2.2 corregido: la Fase 0D figuraba como `NO APLICA` ("repositorio backend-only") cuando `frontendSDD/` ya existe con 8 documentos. Conteo de pruebas normalizado de 238 a 248 en 21 referencias del documento. Se registran Q-15 a Q-19 como preguntas abiertas con su impacto · objeto: E-028, Q-19
[2026-09-27] `/health` implementado en `Program.cs` con verificación de conectividad a la base de datos, más `Dockerfile` multi-etapa con usuario no root, `.dockerignore`, `.env.example`, healthchecks en compose y CI con jobs separados de backend y frontend · objeto: OBS-07, SPEC-008
[2026-09-27] Especificación del frontend creada en `frontendSDD/` (8 documentos) tras eliminar el código React previamente generado; se conserva sólo la configuración base. Se detectó y documentó que el prompt de orquestación recibido corresponde a un dominio bancario ajeno a Zentric (roles `teller`/`natural-customer`, préstamos, transferencias, JWT) y se conservó sólo su estructura metodológica · objeto: E-033
[2026-09-28] **Reconciliación documental contra ejecución** (la deriva impedía leer el estado real): 36 líneas de este documento corregidas con conteos verificados por enumeración — 256→309 pruebas, 27→28 endpoints, 9→10 `DbSet`, 9→10 mappers, 9→10 repositorios, 29→34 archivos de suite, 3→7 migraciones. Las líneas de la [sección 11.1](#111-línea-base-ejecutada-2026-09-26) y del registro de acciones se preservaron sin tocar por ser historial fechado · objeto: E-025, E-028
[2026-09-28] **Corregida la corrupción de texto en `AGENTS.md` (líneas 11-17)**, causada por la sustitución de símbolos del 2026-09-26: un regex defectuoso consumió los caracteres vecinos al símbolo de sección y dejó rutas ilegibles (la skill aparecía con el nombre pegado al de la sección, y el ancla de la sección 8 quedaba truncada) y una versión de skill equivocada (v6.0.0 → real **v7.0.1**). Restituidas las rutas y los enlaces con ancla reales · objeto: E-028
[2026-09-28] **Eliminadas las 4 ocurrencias restantes del símbolo de sección** en `frontend/README.md` (2), `frontendSDD/Frontend-Role-Modules.md` (1) y `frontendSDD/Frontend-SDD.md` (1), sustituyéndolas por enlaces con ancla. Una de ellas apuntaba a la sección equivocada: `frontend/README.md` citaba la sección 4 (Paginación) cuando el texto hablaba de CORS, que es la sección 5 · objeto: E-024, E-028
[2026-09-28] **Abierta Q-20 (autenticación, RG-01)**: la API no autentica; la identidad viaja en la cabecera `X-Buyer-Id` y `User` no tiene credencial. La Ley se contradice (RG-01 lo exige, el alcance 3.2 excluye los mecanismos de autenticación técnica), por lo que el modelo de identidad queda **a dictamen del Owner** antes de escribir código · objeto: Q-20, R-16
[2026-09-28] **Cerrada Q-20 con ADR-0009 (RG-01)**: login con correo y contraseña, hash PBKDF2-HMAC-SHA256 (600 000 iteraciones) calculado en el servidor, JWT HS256 de 60 minutos y política de reserva que exige token en todo endpoint; `X-Buyer-Id` eliminada y sustituida por `ClaimsBuyerAccessor` (claim `sub`); bootstrap del primer Administrador por variable de entorno porque el auto-registro sigue limitado a Compradores (Dominio 3). Verificado **contra PostgreSQL real en Docker: 13/13 escenarios**, incluido el ataque de suplantación por cabecera (401) y token forjado sin firma (401). Corrección de un defecto hallado al diseñar: `CreateUserCommand` recibía `PasswordHash` desde el cliente · objeto: Q-20, RG-01, R-16
[2026-09-29] **Cerrado H-06 en la capa de decisión con ADR-0010 (`IClock`)**: puerto de dominio `Common/Ports/IClock` (una sola propiedad, `DateTimeOffset UtcNow`), adaptador `SystemClock` (singleton sin estado) registrado en el Composition Root y reloj falso `ManualClock` en la suite. `CheckoutTimeoutService` calcula el umbral PED-01 con el reloj inyectado y `JwtAuthTokenService` marca `exp` con el mismo puerto. `CartExpirationTests` fija el borde de la ventana (fresco / 16 min / **15 exactos no expira** / pagado nunca): 7 casos deterministas que antes dependían de la hora del ejecutor. Queda **R-06** con las 79 marcas `CreatedAt/UpdatedAt/DeletedAt`, cuya migración choca con la materialización por reflexión de los mappers y necesita dictamen del Owner · objeto: H-06, R-06, PED-01, T-004
[2026-09-29] **Reparado el healthcheck del contenedor de la API**: el `test` de compose invocaba `dotnet /app/Zentric.Api.dll --no-build --health`, que arrancaba una segunda copia de la API sobre el puerto 8080 y fallaba con "address already in use"; el servicio quedaba **`unhealthy` de forma permanente** aunque respondiera bien a `/health`. Sondeo sustituido por `curl -f http://localhost:8080/health`, con `curl` instalado en la etapa final del `Dockerfile` (usuario no root conservado) · objeto: OBS-07, SPEC-008, gate Docker (11.4)
[2026-09-29] Conteos actualizados por enumeración: **341/341 pruebas** y **39 archivos de suite** (37→39 por `Orders/CartExpirationTests.cs` y `Security/ManualClock.cs`); puerto de dominio pasa de 10 repositorios a 10 repositorios + 4 puertos de servicio; índice 6.4 completado con los ADR 0007, 0008, 0009 y 0010 · objeto: E-025, E-028
[2026-09-29] **Re-verificado en Docker con la imagen reconstruida**: contenedor `zentric-api` en estado **`healthy`** (antes del arreglo de healthcheck era `unhealthy` permanente), `/health` → `200 {"status":"healthy","database":"up"}`, y smoke de autenticación contra la API desplegada: registro anónimo de Buyer `200` · registro de Seller sin token `403` · login `200` con token y rol · `/auth/me` con token `200`, sin token `401`, token forjado `401` · contraseña incorrecta `401` · `GET /api/users` sin token `401` · login del Administrador creado por bootstrap `200` · `?role=Seller` y `?role=1` `200`. Datos de la prueba eliminados de la base (`DELETE 2`, queda solo el Administrador) · objeto: ADR-0009, gate Docker (11.4)
[2026-09-29] **Defecto encontrado por el smoke y corregido: `GET /api/auth/me` devolvía `fullName` vacío.** El token se emitía con la claim `unique_name` y el controlador leía `ClaimTypes.Name`; el validador de .NET 10 (`JsonWebTokenHandler`) no reescribe los tipos de claim entrantes, así que la claim nunca aparecía. El token se emite ahora con `name` y el controlador busca el literal primero, con respaldo en `ClaimTypes`. La autenticación y la autorización nunca estuvieron rotas: solo la proyección de identidad. Cubierto con una aserción nueva en `JwtAuthTokenServiceTests` (341/341) y reverificado en Docker (`fullName` = "Juan Perez") · objeto: ADR-0009
[2026-09-29] **Abierta Q-22 (forma del contrato de los `enum`)**: verificado que `POST /api/users` con `"role": "Buyer"` responde `400` y con `"role": 0` responde `200`, mientras `GET /api/users?role=Seller` y `?role=1` responden ambos `200` — `System.Text.Json` sin `JsonStringEnumConverter` y binding de query que sí acepta nombres. Unificarlo cambia el contrato de entrada y salida de todos los enum del sistema, así que se reporta y no se decide por cuenta del agente. Documentada la asimetría en [Presentation/01-endpoints.md](Presentation/01-endpoints.md) (secciones 3.2 a 3.4 y catálogo `0. Autenticacion`), que estaba desactualizada: decía "JWT bloqueado" y "el frontend debe enviar `X-Buyer-Id`" · objeto: Q-22, RG-01
[2026-09-29] **CERRADA Q-21 — RG-03 (autorización por rol) con [ADR-0011](Adr/0011-matriz-autorizacion-por-rol.md).** El Owner dictó la opción A (escrituras exactas a la Ley; Administrador y Supervisor solo lectura). Implementado: `Zentric.Api/Security/AuthorizationPolicies.cs` con 18 políticas y su diccionario `política → roles` construido desde el enum `UserRole`, registro dinámico de políticas y `FallbackPolicy = RequireAuthenticatedUser()` en `Program.cs`, y las **30 acciones** de los 9 controladores decoradas con `[Authorize(Policy = …)]`, dejando `[AllowAnonymous]` solo en `POST /api/auth/login` y `POST /api/users` (más el `.AllowAnonymous()` explícito de `GET /health`, porque la `FallbackPolicy` también alcanza a los endpoints mínimos) · objeto: Q-21, RG-03, ADR-0006 (el Admin **no** aprueba devoluciones)
[2026-09-29] **Verificación en dos capas de la matriz de autorización.** (1) Reflexión: `Zentric.Tests/Presentation/EndpointAuthorizationMatrixTests.cs` — ninguna acción sin política o anonimato explícito, la política declarada coincide con la spec, ninguna política queda muerta, y tres reglas puntuales de la Ley (7 casos; exige `ProjectReference` a `Zentric.Api` + `FrameworkReference Microsoft.AspNetCore.App`, y sacó a la luz dos `PackageReference` redundantes avisados con `NU1510` que se eliminaron). **Prueba de mutación:** añadir `Administrator` a `ReturnApprove` rompió la suite (`Failed: 1, Passed: 6`) y se revirtió. (2) HTTP real en Docker con tokens de los cinco roles: **33 comprobaciones, 0 fallos**, incluidos `GET /api/users` con token de Comprador o Supervisor `403` (antes `200` con la lista completa) y `POST /api/returns/{id}/approve` con token de Administrador `403` · objeto: T-032 parcial, RG-03
[2026-09-29] **Versionado el smoke de autorización** en `backend/scripts/authorization-smoke.ps1`: crea sus propios usuarios desechables (`*@q21.test` por corrida), lee las credenciales de parámetros/variables de entorno (defaults = los de desarrollo ya publicados en `docker-compose.yml`, cero secrets nuevos en el repo), imprime el `DELETE` de limpieza y devuelve exit `1` si algo falla, así que es apto para CI. Ejecutado desde el repo: `TOTAL DE COMPROBACIONES: 33 | FALLOS: 0`, exit `0`; datos de la prueba eliminados (`DELETE 5`, queda solo el Administrador) · objeto: T-032, gate Docker (11.4)
[2026-09-29] **Creada la spec [Presentation/02-authorization.md](Presentation/02-authorization.md)** (matriz de 18 políticas con su fundamento por política, los 30 endpoints, las tres capas de verificación y lo que la matriz **no** cubre) y actualizado [Presentation/01-endpoints.md](Presentation/01-endpoints.md), que aún decía que RG-03 "no está implementado" · objeto: SSoT presentación
[2026-09-29] **Abiertas Q-21b, Q-21c, Q-21d y Q-21e**, todas consecuencia directa de Q-21 y ninguna decidida por el agente: propiedad del recurso en lecturas y escrituras (Q-21b), quién cancela por quiebre de stock (Q-21c), quién emite facturas (Q-21d) y el conflicto con `frontendSDD/Frontend-Role-Modules.md`, que declara cuatro roles y deja a `Supervisor` sin módulo (Q-21e). La colisión de la aprobación de devoluciones **no** se preguntó: ya estaba resuelta por ADR-0006 · objeto: Q-21b, Q-21c, Q-21d, Q-21e
[2026-09-29] **CERRADA Q-22 (forma del contrato de los `enum`) con [ADR-0012](Adr/0012-contrato-json-de-los-enum-por-nombre.md).** El Owner dictó la forma **estricta**: el cuerpo JSON acepta **solo nombres** (`"Seller"` → `200`), un entero responde `400`. Implementado en `Zentric.Api/Contracts/EnumJsonContract.cs` (`JsonStringEnumConverter` con `allowIntegerValues: false`) enganchado a `AddControllers()` con `AddZentricEnumContract()`; el registro vive en una clase y no a pelo en `Program.cs` para poder ejercitarlo desde un test sin levantar el host. **Verificación en dos capas:** 5 pruebas nuevas en `Zentric.Tests/Presentation/EnumJsonContractTests.cs` sobre la tubería real de MVC (`AddControllers().AddZentricEnumContract()` resuelto del contenedor de servicios) y 3 comprobaciones HTTP nuevas en el smoke (`"role":2` → `400` con `$.role`, `"role":"Administrator"` → `200`, `"role":"supervisor"` en minúsculas → `200`); **prueba de mutación** cambiando `allowIntegerValues` a `true` → `Failed: 1`, revertido y confirmado en fuente y con `dotnet build --no-incremental`. **Corregida la premisa con la que se abrió la pregunta:** no se tocaba «todos los enum de entrada y salida» — las salidas ya devolvían nombres (`order.Status.ToString()`, `UserDto(…, string Role, …)`), la query ya los aceptaba, el radio real eran 4 campos de entrada y `frontend/` no tiene `src/` (0 archivos `.ts`), así que ningún cliente enviaba enteros · objeto: Q-22, ADR-0012, contrato REST
[2026-09-29] **Corregido el contrato de `enum` publicado para el frontend.** `frontendSDD/Frontend-Adapters.md` §3.2 mandaba convertir los enums con constantes numéricas y **las publicaba mal**: `Seller: 1, Buyer: 2, Admin: 3, LogisticsOperator: 4` no corresponde a `UserRole` (`Buyer=0, Seller=1, Administrator=2, Supervisor=3, LogisticsOperator=4`), faltaba `Supervisor` y en `OrderStatus` faltaba `Cancelled`. Reescrito con literales de texto y los valores del dominio; `Contract-alignment.md` movió Q-21 y Q-22 de «pendiente» a «cerrado» y quedó **Q-21b** como el único bloqueo de integración del frontend; changelog del frontend a **1.3.0** · objeto: contrato frontend, ADR-0012
[2026-09-29] **Arreglado un verde falso en el smoke de autorización:** solo llamaba a `exit 1` cuando había fallos, así que una corrida limpia no ejecutaba ningún `exit` y `$LASTEXITCODE` conservaba el valor del último comando externo (se observó `exit code 1` con `FALLOS: 0`). Ahora sale siempre con `exit $fallos`, verificado en proceso limpio: `TOTAL DE COMPROBACIONES: 36 | FALLOS: 0`, exit `0` · objeto: T-032, gate Docker (11.4)
[2026-09-29] **Limpieza de basura local del repositorio:** eliminada la carpeta `obj/` de la raíz, que arrastraba **13 archivos de sesiones anteriores** (`e2e-check.ps1`, `reconcile-sdd.ps1`, `cleanup.sql`, volcados `.txt` de pruebas, 10 KB). Nunca subieron al repo porque `.gitignore:46` (`[Oo]bj/`) los ignora, que es justo el peligro: basura que `git status` no muestra. Las comprobaciones que valían del script borrado siguen cubiertas, pero **no todas**: el smoke versionado mantiene alta anónima de Buyer `200`, alta de Seller sin token de Administrador `403`, `GET /api/users` sin token `401` y `/auth/me` con token `200`; contraseña incorrecta, correo inexistente y verificación de hash/firma los cubren `LoginCommandHandlerTests` y `AuthTests`. **Quedan sin ninguna prueba automatizada** el ataque por cabecera `X-Buyer-Id`, el token forjado sin firma, la contraseña corta y `GET /health` anónimo: esos cuatro escenarios se verificaron a mano el 2026-09-29 (los 13/13 anotados más arriba) y al borrar el script se perdió la forma de repetirlos → **registrado como deuda de T-032**, no como cubierto. Borrados también los temporales de sesión en `%TEMP%`; `git status --porcelain` queda vacío. Regla operativa: los ficheros de trabajo se escriben fuera del repo, no en `obj/` · objeto: higiene del repo
[2026-09-29] Conteos reconciliados y **re-verificados**: `dotnet build Zentric.slnx -warnaserror` → `0 Warning(s) 0 Error(s)`; `dotnet test` → **353/353 PASS** (348 + 5 del contrato de `enum`); archivos de prueba **41** (40 suites + `ManualClock`); smoke versionado en **36 comprobaciones** · objeto: E-025, E-028
[2026-10-01] **T-032 cerrado (primera entrega): pruebas E2E HTTP contra PostgreSQL efimero.** El Owner eligio Testcontainers entre cuatro opciones, aceptando que Docker pase a ser requisito de `dotnet test` (ADR-0016). `ZentricApiFactory : WebApplicationFactory<Program>` levanta el `Program` real contra `postgres:16.15-alpine` (la misma imagen que `docker-compose.yml`) en entorno Development, lo que ademas verifica el camino de migraciones automaticas. Cubre por HTTP real: **31 casos de la matriz de autorizacion**, el auto-registro Comprador/Vendedor, el contrato de enums (Q-22) y Problem Details. Para arrancar hizo falta extraer el alta del Administrador a `Zentric.Api/Bootstrap/AdministratorBootstrapper`: bajo `WebApplicationFactory` el evento `ApplicationStarted` no se dispara (el runner usa `IHost.StartAsync()`), y en vez de duplicar la siembra en las pruebas el arranque real y la suite comparten la misma implementacion. **Sigue pendiente** el flujo de negocio completo (carrito -> checkout -> pago -> factura -> devolucion) y la propiedad cruzada Q-21b por HTTP real. Build `-warnaserror`: 0/0. Tests: **482/482** (399 previas + 83 nuevas: matriz de autorizacion, contrato de enums, Problem Details, flujo de negocio completo y propiedad cruzada Q-21b por HTTP real) · objeto: T-032, ADR-0016
[2026-10-06] **Migración de la sesión de trabajo de Cline a OpenCode.** El Owner trasladó este repositorio de Cline a OpenCode. **No hizo falta migrar contexto**: la fuente única de verdad ya vive en el repo (`AGENTS.md`, `ZENTRIC.md`, `backendSDD/`, `frontendSDD/`) y OpenCode lee `AGENTS.md` igual que Cline, así que ningún documento se copió ni se duplicó (regla de la [sección 2.4](#24-estado-persistente-de-la-orchestración)). Lo único que faltaba en el nuevo entorno era la skill metodológica: instalada `generic-sdd-agent` v7.0.1 con el script propio `sync-skill.ps1` en el directorio de skills del usuario, **hash de origen y copia idénticos** (`675D47B4F96042DE5FC84AD55EEC28E1273C64D6D803BCB95BBFD94C70DF139A`, comando 5 de la [sección 11.3](#113-cómo-re-verificar-comandos-de-referencia)). **Re-verificación de la línea base tras el cambio de herramienta:** `dotnet build Zentric.slnx -warnaserror` → `0 Warning(s) 0 Error(s)`; `dotnet test Zentric.slnx` → **551/551**; `git status --short` → vacío en `feat/order-listings` con HEAD `a810bec`; 39 endpoints en 10 controladores. **Las 13 sesiones de Cline de este workspace** (`~/.cline/data/sessions/`) se conservan como historial de conversación y **no son fuente de verdad**: si alguna contradice este documento o una spec, manda este documento · objeto: E-028, skill
[2026-10-06] **INV-01 cerrado (ADR-0025): la reserva es un `UPDATE` condicional atómico.** El Owner dictó (grill Q8) que la no-negatividad del stock vive en la base con una sola sentencia `disponible -= n, reservado += n WHERE Id = id AND disponible >= n` (cero filas = se rechaza), y no en ningún token ni bloqueo. `IInventoryRepository` expone `TryReserveStockAsync(id, n) → bool` y `ReleaseReservedStockAsync(id, n)` (inverso condicional para la compensación de ADR-0001); `InventoryRepository` los ejecuta con `ExecuteUpdateAsync` sin transacción envolvente (candado = duración de la sentencia, decisión 4). `InventoryReservationService` reserva fila por fila: si la base rechaza una bodega la descarta y pasa a la siguiente, y si el total no alcanza libera lo ya aplicado antes de lanzar `InvalidOperationException`. El handler de checkout valida los productos **antes** de reservar porque la reserva ya escribe de inmediato; el guard de `Inventory.ReserveStock` se mantiene solo como defensa en profundidad (decisión 3) sobre la copia en memoria. **Verificación:** `InventoryAtomicReserveE2ETests` (2 hilos contra 1 unidad → gana exactamente 1; 10 hilos contra 5 → ganan exactamente 5, fila nunca negativa; liberación y rechazo) sobre PostgreSQL real, 3 pruebas nuevas de compensación/rechazo en `InventoryReservationServiceTests`, 6 fakes y el mock de checkout actualizados. Suite: `dotnet build -warnaserror` → 0/0; `dotnet test` → **551/551** (544 previas + 7 nuevas). Specs sincronizadas: marcas retiradas en `06-business-rules.md` (INV-01) y `05-ports.md` (puerto), mecanismo en `03-domain-services.md` e `inventory-reservation-service.md`. Quedan **17 marcadores** en `backendSDD/Domain` (eran 19 por el mismo criterio). El guard ya no protege en producción (solo la sentencia), pero se conserva por decisión del ADR; la ventana residual (fallo catastrófico de `SaveChanges` posterior a una reserva confirmada) queda al barrido del timeout (PED-01). La liberación por timeout sigue en `UpdateAsync` diferido: mismo riesgo de lost-update de siempre, fuera del alcance de ADR-0025 · objeto: INV-01, ADR-0025, ADR-0001

[2026-10-06] **Auditoría de deriva spec ↔ código: `backendSDD/` recontraída contra el árbol real (fase previa a «spec autosuficiente»).** El Owner fijó el criterio de terminado: *«mandar solo `backendSDD/` y que replique el mismo backend con cero preguntas»*, y eligió **spec autosuficiente total** (contrato exacto de los 39 endpoints + esquema de tablas, no solo reglas). Lo primero fue arreglar lo que la spec decía mal, porque sobre datos falsos no se construye nada. **Hallazgos y correcciones, todos verificados con comando:** (1) **Q-23 y Q-24 no existían en la spec** — `rg "Q-23|Q-24" backendSDD` → 0 resultados, vivían solo en el XML doc de `AuthorizationPolicies.cs`; hoy están en `Presentation/02-authorization.md` y en §9.1, con su fundamento. (2) **Matriz de autorización incompleta**: `02-authorization.md` §2 enumeraba **18** políticas (faltaban `FulfillmentDeliver` y `ReturnRefund`, justo las de Q-23/Q-24) y §3 tenía **30** filas cuando el título decía 39; `01-endpoints.md` §4 tenía **34**. Hoy ambas declaran **39 filas** y las **20** políticas del código, y las rutas coinciden entre sí y con el código (se corrigió `{id}/publish` → `{productId}/publish`). (3) **`03-entity-map.md` desactualizado y con fallo anti-amnesia**: decía 9 `DbSet` (hay **12**), 341 pruebas (hay **551**), 3 migraciones (hay **10**) y «nunca aplicadas»; además **`RefundCredit` y `StockAdjustmentRecord` tenían `DbSet` propio y no estaban en el mapa**, y la fila `E-028` apuntaba a `Payments/Payment.cs`, **archivo inexistente**, duplicando además el ID de «Documentos backendSDD/». Renumerado a **E-001…E-036 sin duplicados** (+3 filas: E-034 `PaymentReceipt`, E-035 `RefundCredit`, E-036 `StockAdjustmentRecord`) y añadida la lista de lo que queda fuera del mapa a propósito. (4) **§2.2, §4, §7, §10.2, §11, §14, §15 y `01-system-overview.md` / `02-software-architecture.md`** llevaban cifras de 2026-09-18…2026-09-30: 514 pruebas, 30 endpoints, 16 commands, 8 queries, 7 migraciones, 9 agregados, «migraciones nunca aplicadas», «OBS-06 FAILING», «Auth real fuera de alcance», «178 pruebas todas de dominio». **`§11.1` y `§12.1` se conservaron intactos por ser historial fechado**, con una nota que apunta a la verificación vigente. (5) **OBS-03 cerrado**: `ZentricApiFactory` (Testcontainers `postgres:16.15`) + `Program.cs:229 MigrateAsync()` en `Development` aplican las 10 migraciones y usan el esquema en cada corrida; **queda** el `docker compose up` manual sobre volumen limpio. (6) **`ADR-0019` contradecía a INV-05**: su decisión 6 seguía diciendo que bloquear al Vendedor **suspende sus productos**, cascada que el Owner retiró el 2026-10-04; añadida sección **Enmiendas** (el texto original se conserva) y tachada la consecuencia de código `SuspendProduct`. (7) **Marcadores reclasificados** — `FlatShippingFee` pasó de `NO IMPLEMENTADO` a **APLAZADO POR ADR-0008** (decisión de negocio, no deuda) y la «cascada de suspensión al bloquear» pasó a **RETIRADA**. **Quedan 13 marcas vivas en `backendSDD/Domain`:** 10 sobre **8 trabajos de código** (INV-05 ×2, `CartExpired` ×2, `ManualAdjust`, `PartialFulfillment`, CAT-02, ADR-0020, FAC-02, índice único `Email`/`IdentityDocument`), 2 de **Q-25** y 1 de diseño propuesto (`Guid`). (8) **Nueva pregunta abierta Q-25** — detectada por la auditoría: el estado `Suspendido` está en la Ley y `publish` reactiva desde él, pero **nada puede llevar un producto a `Suspended`**; la Ley no dice quién ni cuándo y `ProductManagement` es solo del `Seller`, así que el Freno de Mano prohíbe deducirlo. **Verificación:** solo tocaron `.md`, `git status` refleja los ficheros de spec y el árbol de código no cambió · objeto: E-028, E-034, E-035, E-036, Q-23, Q-24, Q-25, ADR-0019
[2026-10-12] **Auditoría y resolución del backlog de deuda técnica (ítems 1, 2, 3):** (1) **Limpieza de logs:** eliminados 15 archivos `.log` físicos residuales en raíz y `backend/`; verificado `.gitignore:122` (`*.log`). (2) **Documentación de Zentric.Api:** encabezado arquitectónico en `Program.cs` consolidando su rol como Adaptador Primario (Inbound Adapter / Composition Root) y prohibiendo su renombramiento a "backend" (commit `e0c36aa`). (3) **Auditoría automatizada de tests con tooling:** script en PowerShell evaluó los 65 archivos `*Tests.cs` (465 `[Fact]`, 24 `[Theory]`, 489 métodos); halladas 1.025 aserciones reales y 0 tautológicas (`Assert.True(true)`). Se detectó 1 prueba con cero aserciones (`ReserveForOrderAsync_DigitalItem_SkipsInventory`), corregida inmediatamente con aserción explícita de no-lanzamiento (`Record.ExceptionAsync`) y existencia cero (commit `f2921d5`). Suite unitaria: 457/457 PASS (1s); E2E en espera de Docker. · objeto: E-024, E-025, T-032


```

### 12.2 Control del documento

| Campo | Valor |
|---|---|
| Versión | **3.6.0** — Contrato de los `enum` por nombre: Q-22 cerrada con [ADR-0012](Adr/0012-contrato-json-de-los-enum-por-nombre.md) (`EnumJsonContract` con `allowIntegerValues: false`, 5 pruebas unitarias + prueba de mutación + 3 comprobaciones HTTP), `frontendSDD/Frontend-Adapters.md` §3.2 reescrito con los valores reales del dominio, exit code del smoke siempre explícito (**36 comprobaciones**), corregida la premisa de la que partió Q-22 (las salidas ya devolvían nombres), basura ignorada en `obj/` eliminada y conteos reconciliados a **353/353** |
| Última actualización | 2026-09-29 |
| Fuente de los datos | Verificación ejecutada el mismo día ([sección 11](#11-verificación-gates-y-criterios-de-finalización)) + ADRs + specs de `/SDD` |
| Alcance | Estado vigente, mapa, decisiones, preguntas, riesgos y protocolo. No contiene la historia de iteraciones previa |
| Regla de actualización | Patch: cifras/fechas · Minor: nueva sección, pregunta o gate · Major: reestructura (requiere decisión del Owner) |

### 12.3 Convención de enlaces

Los enlaces relativos de este archivo se resuelven desde `backendSDD/` (por ejemplo: `Domain/06-business-rules.md`, `Adr/0001-….md`, `../ZENTRIC.md`, `../Zentric.Domain/**`). Los enlaces internos usan los anclajes de la navegación superior; las referencias a la metodología v6.0.0 enlazan a [SKILL.md](../.agents/skills/generic-sdd-agent/SKILL.md) con su ancla.


## 14. Matriz de cobertura 360° (dimensiones aplicables)

> Plantilla obligatoria de la metodología ([sección 12](#12-registro-de-acciones-y-control-del-documento) de [SKILL.md](../.agents/skills/generic-sdd-agent/SKILL.md)). Cada dimensión aplicable está marcada: ✔ cubierta · ⚠️ parcial · 🟡 pendiente · ➖ no aplica (con motivo).

| # | Dimensión | Estado | Referencia o motivo |
|---|---|---|---|
| 1 | Propósito y señal de resultado | ✔ | Propósito en la [sección 1.1](#11-rol-objetivo-y-alcance); señal = suite verde + gates de la [sección 11.4](#114-gates-y-criterios-de-finalización-del-proyecto) |
| 2 | Actores | ✔ | Participantes de la Ley (ZENTRIC.md) y roles de agente en la [sección 1.3](#13-registro-de-agentes-y-formato-de-delegación) |
| 3 | Alcance y prioridad | ✔ | [secciones 1.1](#11-rol-objetivo-y-alcance) y [4](#4-fases-detalladas-fase-0a--fase-6) |
| 4 | Costo y recursos | 🟡 | `[PENDIENTE]` Sin estimación documentada; coste de licencia MediatR y de infraestructura sin dimensionar |
| 5 | Legal, privacidad y licencias | ⚠️ | Licencias de terceros verificadas ([sección 13.1](#131-estándares-dependencias-y-normativa-aplicable)); normativa de datos personales `[PENDIENTE]` de jurisdicción ([sección 13.1](#131-estándares-dependencias-y-normativa-aplicable), última fila) |
| 6 | Adopción y cambio | 🟡 | `[PENDIENTE]` No hay plan de migración de datos existentes ni estrategia de rollout de versión |
| 7 | Resultado posterior | 🟡 | `[PENDIENTE]` Gate 5 sin señal definida; candidata: tasa de error en checkout y uso de la reserva de stock |
| 8 | UX y estados | ➖ | No hay UI en este repositorio ([sección 0](#0-entrega-y-organización-del-repositorio)). En la API los estados de error están cubiertos por Problem Details ([sección 13.3](#133-problem-details-rfc-9457)) |
| 9 | Accesibilidad e i18n | ⚠️ | API agnóstica de idioma; `[PENDIENTE]` mensajes de error en inglés y sin versionar texto de dominio |
| 10 | Arquitectura y datos | ✔ | Regla hexagonal y mapa 33/33 ([secciones 0](#0-entrega-y-organización-del-repositorio) y [5](#5-mapa-de-entidades-anti-amnesia)) |
| 11 | Seguridad y amenazas | ⚠️ | Evaluación OWASP completa ([sección 13.2](#132-owasp-api-security-top-10-2023--evaluación-por-ítem)); controles de autenticación/autorización `[PENDIENTE]` |
| 12 | Rendimiento y capacidad | 🟡 | `[PENDIENTE]` Sin objetivos medibles de latencia, volumen ni límites de concurrencia |
| 13 | Fiabilidad y continuidad | 🟡 | `[PENDIENTE]` Sin política de backups, RPO/RTO ni plan de recuperación de PostgreSQL |
| 14 | Observabilidad y operación | ⚠️ | Logging de hosting y traza del `CheckoutTimeoutService`; `[PENDIENTE]` métricas, trazas distribuidas, correlation-id y alertas |
| 15 | Dependencias y cadena de suministro | ⚠️ | Licencias verificadas ([sección 13.1](#131-estándares-dependencias-y-normativa-aplicable)); `[PENDIENTE]` escaneo de vulnerabilidades y política de actualización en CI |
| 16 | Compatibilidad y soporte | ✔ | .NET 10 LTS hasta 2028-11 y PostgreSQL 16 hasta 2028-11 ([sección 13.1](#131-estándares-dependencias-y-normativa-aplicable)) |
| 17 | Pruebas y calidad | ✔ | **551/551** (2026-10-06) con 12 suites E2E sobre PostgreSQL real; faltan el smoke 400/404/500 y los reportes administrativos ([sección 11.2](#112-validaciones-no-ejecutadas-honestidad-de-evidencia)) |
| 18 | Despliegue y configuración | ⚠️ | `backend/Dockerfile`, `frontend/Dockerfile`, `.dockerignore`, compose y CI existen; compose ejecutado (fase 0C: `build` exit 0, `up` con healthcheck, `/health` → 200) pero **falta el gate completo de la Fase 6** (`build --no-cache` → `up` → smoke → `down`) y el arranque sobre volumen limpio |
| 19 | Datos y analítica | 🟡 | `[PENDIENTE]` No hay registro de auditoría persistido ni política de retención; los eventos de dominio solo viven en memoria durante la transacción |

## 15. Auditoría de mapeo de entidades (formato de la metodología)

> Plantilla de la sección 14.8 de [SKILL.md](../.agents/skills/generic-sdd-agent/SKILL.md), con los cruces obligatorios de la metodología (sección 14.4 de [SKILL.md](../.agents/skills/generic-sdd-agent/SKILL.md)).

```text
Auditoría de Mapeo — 2026-09-26 — alcance: todo el backend — base: commit 1d85a48
Cobertura: 33/33 mapeadas (100 %) · Huérfanos: 0 · Fantasmas: 0
Zonas no exploradas: (1) runtime de Docker/PostgreSQL, nunca levantado; (2) DI real en un entorno desplegado; (3) frontend, que no existe en este repositorio; (4) migraciones aplicadas a una base real
Cruces ejecutados: archivos fuente vs mapa · rutas y handlers vs puntos de entrada · DbSet y migraciones vs datos · imports y DI vs relaciones · pruebas vs entidades · documentos y Biblia vs código · manifiestos vs dependencias · CI e infraestructura vs operación
Cambios desde el mapa anterior: +0 ~6 −0 (E-021 a E-025 y E-033 actualizados al árbol real: DbModels, 10 repositorios, 7 migraciones, 9 controladores con 30 endpoints y 39 archivos de suite)
Huérfanos clasificados: ninguno
Veredicto: mapa COMPLETO para el código versionado; PARCIAL en runtime (ver zonas no exploradas)
Siguiente paso: Fase 6 — reparación, Docker e integración real
```

```text
Auditoría de Mapeo — 2026-10-06 — alcance: todo el backend — base: feat/order-listings @ a810bec
Cobertura: 36/36 mapeadas (100 %) · Huérfanos: 0 · Fantasmas: 0
Zonas no exploradas: (1) arranque manual de Docker/PostgreSQL sobre volumen limpio; (2) DI real en un entorno desplegado; (3) frontend, sin código fuente en este repositorio; (4) smoke de errores 400/404/500
Cruces ejecutados: árbol completo de Zentric.Domain vs mapa · DbSet vs DbModel vs Mapper vs repositorio · migraciones vs DbSet · endpoints HTTP vs matriz de autorización · comandos/queries vs ficheros de prueba · eventos vs consumidores · ADR y dictámenes vs specs
Hallazgos de este ciclo (fallo de la regla anti-amnesia, corregido hoy):
  · RefundCredit y StockAdjustmentRecord tenían DbSet propio y NO estaban en el mapa → +2 filas (E-035, E-036)
  · E-028 apuntaba a Zentric.Domain/Payments/Payment.cs, archivo inexistente → renombrada E-034 = PaymentReceipt
  · E-028 estaba duplicada (Payment y Documentos backendSDD/) → serie única E-001…E-036
  · Deriva de conteos: 9→12 DbSet, 341→551 pruebas, 3→10 migraciones, 16→25 commands, 8→14 queries, 9→10 agregados, 2→3 servicios de dominio, 6→7 eventos, v6.0.0→v7.0.1
  · "Migraciones nunca aplicadas" era falso desde que ZentricApiFactory + MigrateAsync() entraron en la suite
Cambios desde el mapa anterior: +3 ~14 −1
Huérfanos clasificados: enumeraciones, VOs embebidos en columnas, tipos de Result/Entity, los 7 registros de evento y los servicios de dominio (detalle en la sección 5.5)
Veredicto: mapa COMPLETO para el código versionado y coherente con el DbContext; PARCIAL solo en las zonas no exploradas
Siguiente paso: cerrar los marcadores [NO IMPLEMENTADO] de backendSDD/Domain/ y después congelar el contrato exacto (shapes de los 39 endpoints + esquema de tablas)
```

**Ciclo de vida del mapa (reglas de la [sección 14.5 de la metodología](../.agents/skills/generic-sdd-agent/SKILL.md#145-deriva-y-mantenimiento)):**

| Regla | Aplicación en este repositorio |
|---|---|
| Deriva por commit | El `mapa-base` se compara con `git log` al abrir sesión; si el árbol cambió, se reaudita solo lo afectado |
| Actualización por hito | Cada hito actualiza las filas afectadas de la [sección 5](#5-mapa-de-entidades-anti-amnesia) y deja entrada en la [sección 12.1](#121-registro-de-acciones-append-only) |
| Mapa no confiable | Si el mapa queda viejo o el repo cambió mucho, se marca `[OBSOLETO]` y se reconstruye antes de planificar |
| Honestidad de cobertura | Nunca se declara cobertura total sin enumerar las zonas no exploradas (las cuatro listadas arriba) |

## 16. Trazabilidad con la metodología v6.0.0

### 16.1 Correspondencia con la plantilla obligatoria de este documento

| Sección obligatoria ([[sección 13.2](#132-owasp-api-security-top-10-2023--evaluación-por-ítem) de la metodología](../.agents/skills/generic-sdd-agent/SKILL.md#132-plantilla-de-sddsddmd-memoria-viva-única)) | Dónde vive en este orquestador |
|---|---|
| 1. Contexto y alcance | Secciones 0 y 1 |
| 2. Mapa de entidades | Sección 5 |
| 3. Especificaciones activas | Secciones 6.5 y 18 |
| 4. Decisiones y ADDENDA | Sección 8 y carpeta `Adr/` |
| 5. Verificación y línea base | Sección 11 |
| 6. Riesgos, contradicciones y preguntas | Secciones 9 y 10 |
| 7. Estado y próximos pasos | Secciones 2.2, 4 y 12 |
| 8. Investigación y discovery | Sección 17 |

### 16.2 Gates de calidad ([[sección 10](#10-riesgos-hallazgos-y-observaciones) de la metodología](../.agents/skills/generic-sdd-agent/SKILL.md#10-gates-de-calidad-solo-en-vía-completa)) y su equivalente aquí

| Gate | Equivalente en este repositorio | Estado |
|---|---|---|
| Gate 0 Clasificar | 1.1 (rol y objetivo) + 2.2 (tablero de fases) | ✔ |
| Gate 1 Requisitos | 9.1 (preguntas abiertas) + 18 (FR y CA de SPEC-008) | ✔ para el trabajo en curso |
| Gate 1B Resultado | 11.4 (señal de cierre del proyecto) | ⚠️ La señal de resultado posterior sigue pendiente (dimensión 7) |
| Gate 2 Plan | 2.2 (tablero) + 4 (orden de fases) | ✔ |
| Gate 3 Consistencia | 3.1 (alignment gate) + 13.2 (OWASP) | ✔ ejecutado el 2026-09-26 |
| Gate 4 Entrega | 11.1, 11.2 y 3.5 (comandos) | ⚠️ parcial: sin E2E HTTP ni PostgreSQL real |
| Gate 5 Resultado posterior | — | 🟡 no programado |

### 16.3 Fases de la metodología ([sección 11](#11-verificación-gates-y-criterios-de-finalización)) y su equivalente aquí

| Fase de la metodología | Fase del proyecto | Nota |
|---|---|---|
| 0 Orientación | 0A y 2.3 | Detección de stack y regla de reanudación |
| 1 Descubrimiento | 5 y 7 | Mapa de entidades y estado por capa |
| 2 Especificación | 6 y 18 | Índice de specs y SPEC del trabajo activo |
| 3 Clarificación | 9 | Preguntas y verificaciones abiertas |
| 4 Plan | 2.2 | Tablero de fases aprobado |
| 5 Descomposición | 4 | Fases, entregables y tareas |
| 6 Implementación | 3A, 3B, 4 y 5 | Servicios, REST, integración y pruebas |
| 7 Diagnóstico | 3.1 y 10.1 | Matriz de decisión y estado de hallazgos |
| 8 Revisión | 16.4 | Checklist de cierre |
| 9 Cierre | 3.6 y 12.1 | Informe de cierre y registro |

### 16.4 Autoevaluación de cierre (checklist de la [sección 21 de la metodología](../.agents/skills/generic-sdd-agent/SKILL.md#21-checklist-de-revisión-fase-8-y-autoevaluación-previa-a-cerrar))

| Verificación | Estado |
|---|---|
| Cada requisito tiene implementación y evidencia; cada criterio de aceptación, una validación | ⚠️ E2E y PostgreSQL pendientes |
| Los invariantes se preservan; la Biblia no fue alterada y toda adición está como ADDENDUM | ✔ (`git log --numstat -- ZENTRIC.md`: `c347924` = **28/1**, único commit que añade contenido; `266b25d` = 225/0 y solo la reubicó en la raíz) |
| El mapa refleja el cambio; no quedan huérfanos; nada se duplicó | ✔ |
| Se respetó la organización del código que el repo ya usa | ✔ Regla hexagonal verificada |
| Errores coherentes y seguros; autorización en el límite correcto | ⚠️ Falta `type` URI en Problem Details ([sección 13.3](#133-problem-details-rfc-9457)) |
| Datos válidos y migraciones seguras | ✅ Migraciones aplicadas en cada corrida de la suite E2E contra PostgreSQL real (OBS-03 cerrado 2026-10-06); **falta** el arranque manual de compose sobre volumen limpio ([sección 11.2](#112-validaciones-no-ejecutadas-honestidad-de-evidencia)) |
| Sin secretos, datos personales sensibles ni logs inseguros | ❌ Credenciales en claro (OBS-04) |
| Matriz 360° marcada solo en lo aplicable | ✔ Sección 14 |
| Afirmaciones externas con fuente, fecha y nivel; nada inventado | ✔ Secciones 13 y 17 |
| Ninguna prueba fue ocultada, debilitada ni desactivada | ✔ **551/551** (2026-10-06) |
| Lo no ejecutado y lo asumido está declarado | ✔ Sección 11.2 |
| `AGENTS.md` y este archivo siguen siendo verdaderos y no se crearon archivos de más | ⚠️ Pendiente la ampliación propuesta de `AGENTS.md` ([sección 12.1](#121-registro-de-acciones-append-only)) |
| La respuesta empieza por la conclusión y termina con el siguiente paso | ✔ Protocolo 3.6 |

**Veredicto de la autoevaluación:** no es posible declarar `COMPLETE`; el estado máximo permitido es `IN_PROGRESS` (gate 4 parcial, riesgo abierto de secretos y dimensiones 360° pendientes).

## 17. Research Log (2026-09-26): verificación de estándares vigentes

> Registro exigido por la [sección 7.8 de la metodología](../.agents/skills/generic-sdd-agent/SKILL.md#78-research-log-en-sddsddmd-sección-88-investigación-y-discovery-opcional). Solo se asientan hallazgos verificados contra la fuente; lo no verificado queda `[PENDIENTE]`.

| Fecha | Fuente | Tipo | Hallazgo y uso |
|---|---|---|---|
| 2026-09-26 | [OWASP API Security Top 10 2023](https://owasp.org/API-Security/editions/2023/en/0x11-t10/) | primaria | Los 10 riesgos API1 a API10 de la edición 2023, con su nombre exacto; base de la evaluación de la [sección 13.2](#132-owasp-api-security-top-10-2023--evaluación-por-ítem) |
| 2026-09-26 | [RFC 9457 (IETF)](https://www.rfc-editor.org/info/rfc9457/) | primaria | "Problem Details for HTTP APIs" es **Proposed Standard** de julio de 2023 y **obsoleta RFC 9457**; añade un registro de URIs de tipo comunes, aclara el tratamiento de problemas múltiples y orienta sobre URIs no desreferenciables |
| 2026-09-26 | [.NET releases and support (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/core/releases-and-support) | primaria | .NET 10 es **LTS con soporte hasta noviembre de 2028**; .NET 9 (STS) y .NET 8 (LTS) terminan en noviembre de 2026; existe la propiedad MSBuild `CheckSdkVulnerabilities` (avisa con NETSDK1239 si el SDK está fuera de soporte) |
| 2026-09-26 | [Licensing FAQ (Lucky Penny Software)](https://luckypennysoftware.com/faq) | primaria | **MediatR 13.0.0 o superior requiere licencia comercial**; los niveles son por tamaño de equipo (Standard 1-10, Professional 11-50, Enterprise sin límite); no hace falta licencia en desarrollo, CI/CD, staging o QA, **sí en producción**; las versiones anteriores conservan MIT/Apache-2.0 y hay alternativa gratuita bajo RPL-1.5; la clave se aplica sin servidor de licencias (solo avisos en log); **FluentValidation no figura entre los paquetes con licencia comercial** |
| 2026-09-26 | [OpenAPI Specification 3.2.1](https://spec.openapis.org/oas/v3.2.1.html) | primaria | La versión vigente de la especificación es **3.2.1, publicada el 10 de septiembre de 2026**; 3.1.2 es la anterior |
| 2026-09-26 | [PostgreSQL Versioning Policy](https://www.postgresql.org/support/versioning/) | primaria | Soporte de 5 años por versión mayor: **16.15 → 2028-11-09**, 17.11 → 2029-11-08, 18.6 → 2030-11-14; 19 en beta (2026-09-24); se recomienda usar siempre el menor actual de la mayor elegida |
| 2026-09-26 | xUnit (notas de versión y NuGet) | secundaria | **xUnit v3 4.0.0 (2026-08-14)** es la versión mayor actual; v2 continúa en 2.9.3 |
| 2026-09-26 | NuGet (Npgsql.EntityFrameworkCore.PostgreSQL) | secundaria | Estable actual **10.0.3**; 11.0.0 sigue en versión preliminar |
| 2026-09-26 | [Ley 25.326 y Decreto 1558/2001 (Argentina)](https://www.argentina.gob.ar/normativa/nacional/ley-25326-64630) | primaria | Régimen de datos personales aplicable si la operación es argentina: registro de bases, aviso a los titulares, medidas de seguridad y derechos de acceso/rectificación |

**Límites de esta investigación (honestidad de evidencia):** no se pudo confirmar el umbral económico de la licencia de MediatR en la fuente consultada; no se levantó la API para leer la versión de OpenAPI que declara el documento generado; la jurisdicción legal aplicable es una decisión del Owner; las fechas de soporte de PostgreSQL corresponden a la política oficial vigente al 2026-09-26.

