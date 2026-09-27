# [ADR-0007](0007-dispatcher-propio-sustituye-mediatr.md) — Dispatcher propio en lugar de MediatR

```yaml
id: 0007
title: Sustituir MediatR por un dispatcher propio, sin dependencias externas
status: accepted
date: 2026-09-27
decided_by: owner del proyecto
relacionado: [Q-14](../SDD.md), [R-19](../SDD.md#102-riesgos-y-observaciones-vigentes)
```

## Contexto

El proyecto usaba **MediatR 14.2.0** como bus de comandos, queries y notificaciones.

La verificación del paquete instalado (`~/.nuget/packages/mediatr/14.2.0/mediatr.nuspec`) confirmó el riesgo que estaba abierto desde 2026-09-18:

- La licencia es **RPL 1.5** (Reciprocal Public License), una licencia **copyleft** que obliga a publicar el código derivado bajo los mismos términos, **o** comprar una licencia comercial en `luckypennysoftware.com`.
- El propio `.nuspec` exige `<requireLicenseAcceptance>true</requireLicenseAcceptance>`.
- MediatR 14 exige además una clave de licencia para eliminar la advertencia en tiempo de ejecución.

Para un producto comercial en desarrollo, depender de una licencia copyleft o de pago es un riesgo inaceptable: obligaría a publicar el código del backend o a pagar una licencia que no estaba presupuestada.

## Decisión

Se sustituye MediatR por un **dispatcher propio**, implementado dentro de la capa Application y sin dependencias externas.

Vive en `Zentric.Application/Common/Messaging/`:

| Abstracción propia | Sustituye a |
|---|---|
| `IRequest<TResponse>` | `MediatR.IRequest<TResponse>` |
| `IRequestHandler<TRequest, TResponse>` | `MediatR.IRequestHandler<,>` |
| `INotification` / `INotificationHandler<T>` | `MediatR.INotification` / `INotificationHandler<>` |
| `IPipelineBehavior<TRequest, TResponse>` | `MediatR.IPipelineBehavior<,>` |
| `IMediator` | `MediatR.IMediator` + `ISender` |
| `Mediator` | `MediatR.Mediator` |
| `AddZentricApplication()` | `AddMediatR()` |

### Semántica conservada

La migración no cambia el comportamiento observable del sistema:

- Un mensaje (`IRequest<TResponse>`) tiene **un** handler.
- Una notificación tiene **cero o varios** handlers y se publica en paralelo secuencial (`Publish`).
- Los comportamientos del pipeline envuelven la ejecución del handler; la validación de FluentValidation se ejecuta **antes** del handler y devuelve `Result.Failure` en vez de lanzar.
- El registro se hace por escaneo del ensamblado de Application, con `TryAddEnumerable` para no duplicar registros.

### Detalle de implementación que conviene conocer

El dispatcher resuelve los comportamientos por **interfaz cerrada sobre el tipo concreto** del mensaje (`IPipelineBehavior<CreateCartCommand, Result<Guid>>`). Pedir `IPipelineBehavior<IRequest<TResponse>, TResponse>` devolvería una lista vacía, porque el registro abierto `typeof(IPipelineBehavior<,>)` solo enlaza con el tipo real. La resolución se hace por reflexión sobre `GetServices(Type)`.

## Consecuencias

**Positivas**

- Cero riesgo de licencia: no hay clave que comprar ni código que publicar.
- Una dependencia de terceros menos en la capa Application.
- El comportamiento del pipeline es explícito y legible en el repositorio.

**Negativas / coste asumido**

- Se mantiene código de plumbing propio que habría que revisar con cada versión de .NET.
- La resolución de handlers y comportamientos usa reflexión, igual que hacía MediatR; no es una regresión de rendimiento, pero sí una superficie que mantener.
- Se pierden los extras de MediatR que el proyecto nunca usó (streaming, notificaciones de pago, publishers de terceros).

**Impacto en el código**

- 40 archivos con `using MediatR;` pasaron a `using Zentric.Application.Common.Messaging;`.
- `DomainEventDispatcher` usa `IMediator` en lugar de `IPublisher`.
- `ApiControllerBase` resuelve `IMediator` en lugar de `ISender`.
- `Program.cs` llama a `AddZentricApplication()` y registra `ValidationBehavior<,>`.
- Se eliminó el `PackageReference` de `MediatR` en `Zentric.Application.csproj`.

## Verificación

- `dotnet build Zentric.slnx` → Build succeeded, 0 warnings.
- `dotnet test` → 268/268 pruebas en verde, incluidas las de integración del pipeline de validación
  (`Zentric.Tests/UseCases/ValidationPipelineTests.cs`), que ejercitan el dispatcher real.
