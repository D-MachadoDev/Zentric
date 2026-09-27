# 02. Software Architecture — Zentric

> Documento exigido por [AGENTS.md :0.1](../AGENTS.md#01-consulta-obligatoria-antes-de-codificar). **Derivado** de [AGENTS.md](../AGENTS.md) ([:1](../AGENTS.md#1-vision-general-del-proyecto), [:2](../AGENTS.md#2-reglas-arquitectonicas-inviolables-hexagonal-ddd), [:3](../AGENTS.md#3-tratamiento-de-errores-y-excepciones-organizado-por-capa),
> [:6](../AGENTS.md#6-inyeccion-de-dependencias-di)) y de [backendSDD/Domain/01-domain-overview.md](Domain/01-domain-overview.md), más el estado observado del
> repositorio. No introduce decisiones nuevas: consolida y enlaza.

## 1. Estilo arquitectónico

`[CONFIRMADO]` Arquitectura **Hexagonal (Puertos y Adaptadores)** + **DDD** con
**CQRS**, **Mediator**, **Repository**, **Unit of Work** y **Result Pattern**
([AGENTS.md :1](../AGENTS.md#1-vision-general-del-proyecto)). El flujo de dependencias es unidireccional hacia el centro.

## 2. Proyectos y regla de dependencia

```text
        ┌──────────────────────────┐
        │        Zentric.Api       │   (Composition Root)
        │  Presentation / REST     │
        └───────────┬──────────────
                    │ referencia Application e Infrastructure
        ┌───────────▼──────────────┐        ┌────────────────────────────
        │   Zentric.Infrastructure │───────▶│     Zentric.Application    │
        │  EF Core · PostgreSQL    │        │  Casos de uso · puertos    │
        ──────────────────────────┘        ───────────┬────────────────┘
                                                        │ referencia solo Domain
                                            ┌───────────▼────────────────┐
                                            │      Zentric.Domain        │
                                            │ Entidades · VO · invariantes│
                                            │  SIN dependencias externas  │
                                            └────────────────────────────┘
```

| Proyecto | Puede referenciar | Prohibido |
|---|---|---|
| `Zentric.Domain` | **nada** | EF Core, ASP.NET, HTTP, cualquier paquete de infraestructura |
| `Zentric.Application` | `Zentric.Domain` | `Infrastructure`, `Api`, SQL, detalles HTTP, EF Core |
| `Zentric.Infrastructure` | `Application`, `Domain` | `Api` |
| `Zentric.Api` | `Application`, `Infrastructure` | Lógica de negocio; la referencia a `Infrastructure` es **solo** para el registro de DI en `Program.cs` |

`[CONFIRMADO]` `Zentric.Domain.csproj` hoy no tiene ninguna `PackageReference`:
la regla se cumple en el único proyecto existente.

## 3. Puertos y adaptadores

`[CONFIRMADO]` [AGENTS.md :2.2](../AGENTS.md#22-puertos-y-adaptadores) y [backendSDD/Domain/05-ports.md](Domain/05-ports.md):

- **Puertos de salida:** interfaces en `Application` o `Domain` (p. ej.
  `IUserRepository`, `IDomainEventDispatcher`). Hoy existen en
  `Zentric.Domain/<Módulo>/Ports/`.
- **Adaptadores de salida:** implementaciones concretas en `Infrastructure`.
- **Puertos de entrada:** casos de uso en `Application`.
- **Adaptadores de entrada:** controladores REST delgados en `Api`.

## 4. Modelado táctico

`[CONFIRMADO]` [AGENTS.md :2.3](../AGENTS.md#23-modelado-de-dominio-tactico):

- Entidades y raíces de agregado con identidad propia, sin setters públicos
  anémicos; la mutación ocurre por métodos de negocio que validan invariantes.
- Value Objects estrictamente inmutables.
- Agregados pequeños con límites transaccionales duros
  ([backendSDD/Domain/02-aggregates-and-entities.md :1](Domain/02-aggregates-and-entities.md#1-identity-module)).

## 5. Tratamiento de errores por capa

`[CONFIRMADO]` [AGENTS.md :3](../AGENTS.md#3-tratamiento-de-errores-y-excepciones-organizado-por-capa):

| Capa | Regla |
|---|---|
| Domain | Guardas defensivas (`ArgumentException`/`InvalidOperationException`) o `Result`. Prohibido `try-catch` técnico |
| Application | Validación de entrada obligatoria (FluentValidation) y retorno de `Result<T>`. Prohibido capturar excepciones catastróficas |
| Infrastructure | Traduce errores predecibles a `Result.Failure`; no expone `SqlException` ni cadenas de conexión |
| Api | Middleware global de excepciones; mapea `Result<T>` a HTTP con RFC 9457 (Problem Details) |

Prohibido usar excepciones para el flujo lógico habitual.

## 6. Inyección de dependencias

`[CONFIRMADO]` [AGENTS.md :6](../AGENTS.md#6-inyeccion-de-dependencias-di): cada capa expone su propio método de extensión de
registro; `Zentric.Api` es el Composition Root y el único autorizado a ensamblar
las capas.

## 7. Convenciones de código

`[CONFIRMADO]` [AGENTS.md :1](../AGENTS.md#1-vision-general-del-proyecto) y [:5](../AGENTS.md#5-convenciones-de-codigo-y-estilo-en-c):

- Código en **inglés**; comentarios y documentación en **español**.
- Interfaces con prefijo `I`; `PascalCase` para tipos y miembros; `camelCase` para
  locales; `_camelCase` para campos privados.
- Preferir `record`, `init`, `sealed` donde aplique; evitar setters públicos.
- Documentación XML en APIs públicas o reglas complejas.
- Tests con patrón `Metodo_Condicion_ResultadoEsperado`, en estilo BDD mapeado a
  los casos de uso de la especificación.

## 8. Comandos oficiales

`[CONFIRMADO]` [AGENTS.md :7](../AGENTS.md#7-comandos-de-verificacion-y-compilacion):

```powershell
dotnet restore
dotnet build Zentric.slnx
dotnet test
```

## 9. Estado observado vs arquitectura objetivo

| Elemento | Objetivo | Estado real |
|---|---|---|
| `Zentric.Domain` aislado | sí | **cumple** (verificado en el `.csproj`, 2026-09-18) |
| Organización por módulo de dominio | — | **cumple** (carpeta por contexto) |
| `Zentric.Application` | existe | **existe** (parcial: 3 commands, 2 puertos, `Result<T>`, sin validadores) |
| `Zentric.Infrastructure` | existe | **existe** (parcial: `ZentricDbContext` + 2 repositorios + 2 migraciones sin aplicar) |
| `Zentric.Api` | existe | **existe** (parcial: 3 endpoints, middleware simplificado) |
| Proyecto de pruebas | existe | **existe** (178 pruebas en verde, todas de dominio) |
| `Result<T>` | en Application/Infrastructure | **existe** (`Application/Common/Models/Result.cs`); no se usa en servicios de dominio (no hay servicios) |
| Eventos de dominio + dispatcher | puerto en Domain/Application | **no existen** (`// TODO` en su lugar → [H-14](SDD.md)) |
| Abstracción de tiempo | para reglas temporales | **no existe** (`DateTime.UtcNow` directo, [H-06](SDD.md)) |
| IDs fuertemente tipados | `record struct` | **no existen** (`Guid` plano, G-07) |
| Regla de dependencia | unidireccional hacia el centro | **cumple** (`Domain` ← `Application` ← `Infrastructure` ← `Api`) |
| Aislamiento EF ↔ dominio | entidades EF separadas ([:4.2](../AGENTS.md#42-infrastructure-adapter-agent)) | **no cumple** ([H-13](SDD.md): el `DbContext` mapea los agregados de dominio) |
| Validación de entrada (FluentValidation) | obligatoria en Application | **cumple** desde SPEC-007: `ValidationBehavior<,>` + 3 validadores (21 pruebas) |
| Middleware global + RFC 9457 | en Api | **cumple** en código desde SPEC-007 (`AddProblemDetails()` + `UseExceptionHandler()`); `[PENDIENTE]` verificación por HTTP real |

Detalle y evidencia: [SDD.md :5 (Verificación)](SDD.md).

## 10. Riesgos arquitectónicos abiertos

`[RIESGO]` Añadir `Infrastructure` (EF Core) antes de resolver los mapeos del
modelo obligaría a escribir y reescribir mapeos y migraciones. Orden recomendado:
estabilizar el dominio (Fases 1–3 del roadmap) y recién entonces construir
persistencia y API ([SDD.md :7 (Estado)](SDD.md)).

`[RIESGO]` La ausencia de `.editorconfig`, analizadores y CI permite que el
estilo y las reglas arquitectónicas se degraden sin que nada lo detecte
(ver [R-08](SDD.md) del bootstrap).
