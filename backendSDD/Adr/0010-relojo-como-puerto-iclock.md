# [ADR-0010](0010-relojo-como-puerto-iclock.md) — El tiempo entra al modelo por el puerto `IClock`

```yaml
id: 0010
title: Reloj como puerto de dominio (IClock) con adaptador de sistema y reloj falso en la suite
status: accepted
date: 2026-09-29
decided_by: agente técnico · decisión de ingeniería sin efecto en reglas de negocio (ratificación del Owner pendiente sobre la deuda residual)
relacionado: [H-06](../SDD.md#10-riesgos-hallazgos-y-observaciones), [R-06](../SDD.md#102-riesgos-y-observaciones-vigentes), [PED-01](../Domain/06-business-rules.md), [ADR-0009](0009-autenticacion-jwt-rg01.md)
```

## Contexto

H-06 llevaba abierto desde la auditoría inicial: **79 usos de `DateTime.UtcNow`** dentro de
`Zentric.Domain` y de los adaptadores. La mayoría son marcas de auditoría
(`CreatedAt`/`UpdatedAt`/`DeletedAt`), pero dos son **decisiones de negocio**:

| Decisión | Regla | Síntoma de ser intratable |
|---|---|---|
| Ventana de 15 minutos del carrito | [PED-01](../Domain/06-business-rules.md) | `CheckoutTimeoutService` calculaba `DateTime.UtcNow.AddMinutes(-15)` dentro del `BackgroundService`: comprobar que un carrito **no** expira a los 14 minutos exigía esperar en tiempo real o confiar en márgenes de reloj |
| Caducidad del token (60 min) | [ADR-0009](0009-autenticacion-jwt-rg01.md) | El emisor JWT construía `exp` con el reloj del sistema; un test de caducidad dormiría una hora o fracasaría según la hora del ejecutor |

El resultado previsible apareció en la suite: los casos de la ventana de expiración se
escribieron "contra el reloj del ejecutor", de modo que `ExpiredFilter_FreshCart_IsNotPickedUp`
fallaba o pasaba según la latencia del proceso que creaba el pedido.

`AGENTS.md` sección 2.1 prohíbe que `Zentric.Domain` dependa de paquetes de infraestructura,
así que quedaban tres caminos: (a) un `Func<DateTimeOffset>` suelto, (b) una librería de
abstracción de tiempo de terceros, o (c) un **puerto propio** definido en el Dominio.

## Decisión

**(c) Puerto propio en el Dominio.** El tiempo del sistema entra al modelo por `IClock` y
ninguna decisión de negocio vuelve a leer `DateTime.UtcNow` a escondidas.

| Pieza | Ubicación | Rol |
|---|---|---|
| `IClock` | `Zentric.Domain/Common/Ports/IClock.cs` | Puerto de salida mínimo: una sola propiedad, `DateTimeOffset UtcNow` |
| `SystemClock` | `Zentric.Infrastructure/Common/SystemClock.cs` | Adaptador de producción; singleton sin estado que delega en `DateTimeOffset.UtcNow` |
| Registro | `Program.cs` (Composition Root), `AddSingleton<IClock, SystemClock>()` | Único punto donde se elige el reloj; `AGENTS.md` sección 6 |
| `ManualClock` | `Zentric.Tests/Security/ManualClock.cs` | Reloj falso: `UtcNow` es lo que el test diga; `Advance(TimeSpan)` **solo avanza** |
| Consumidores | `CheckoutTimeoutService` (umbral PED-01) recibe `IClock` por constructor; `JwtAuthTokenService` (claim `exp`) recibe `Func<DateTimeOffset>`, que el Composition Root resuelve contra ese mismo `IClock` | Un adaptador de dominio no necesita saber que existe un reloj: le basta el instante |

Detalles que no son ornamentales:

1. **`DateTimeOffset`, no `DateTime`.** `DateTime` arrastra `Kind` y el valor `Unspecified`
   que EF devuelve al leer una columna `timestamp without time zone`; comparar un `DateTime`
   con `Kind=Utc` contra otro con `Kind=Unspecified` se resuelve en silencio y mal.
   `DateTimeOffset` no tiene esa ambigüedad. La conversión a `DateTime` se hace **solo en la
   frontera**: `ICustomerOrderRepository.GetExpiredOrdersAsync(DateTime threshold, …)` sigue
   recibiendo `DateTime` porque la columna lo es, y el llamante convierte con `.UtcDateTime`.
2. **El umbral vive en el servicio, no en el agregado.** `CustomerOrder.Checkout()` conserva
   su comprobación con el instante que el propio agregado conoce; el barrido masivo decide
   quién está vencido con `clock.UtcNow - 15 min`. Mover el reloj a los constructores del
   agregado es la parte que **no** se hizo (ver Consecuencias).
3. **El puerto es deliberadamente de una sola propiedad.** Un `IClock` con temporizadores,
   zonas horarias o `Stopwatch` filtraría conceptos de infraestructura al Dominio.

## Consecuencias

**Positivas**

- PED-01 es verificable: `CartExpirationTests` congeló el tiempo y quedó fijo el borde —
  carrito fresco no expira, 16 minutos sí, **15 exactos no** (el filtro usa `<` estricto),
  pedido pagado nunca se barre.
- La caducidad del token ya se comprueba sin esperar: `JwtAuthTokenServiceTests` fija el
  reloj en `10:00` y exige `exp` en `11:00`.
- Ninguna prueba vuelve a depender de la hora del ejecutor ni de cuánto tarde el proceso en
  crear un objeto.
- `Zentric.Domain` sigue sin `PackageReference` alguno: el puerto es código propio.

**Negativas / coste asumido**

- **Coexistencia de relojes.** Los pedidos nacen con el reloj real porque sus marcas de
  auditoría aún usan `DateTime.UtcNow`. Un test que construya el pedido "ahora" y **después**
  mueva el reloj falso compara dos relojes distintos y el resultado carece de sentido. Esta
  trampa se materializó durante la implementación (dos casos fallaban por sembrar el reloj
  tarde) y quedó documentada en el XML doc de `CartExpirationTests.ExpiredAsSeenBy`: el reloj
  falso se siembra **en el instante de creación del pedido** y solo entonces se avanza.
- Si alguien registra un `SystemClock` nuevo en lugar de resolver el singleton, el cambio es
  invisible pero inofensivo: el adaptador no tiene estado.

**Deuda que este ADR no cierra (propuesta, no aplicada)**

Las 79 marcas `CreatedAt/UpdatedAt/DeletedAt` de los 9 agregados siguen con `DateTime.UtcNow`.
Migrarlas exige pasar `IClock` a cada constructor y a cada fábrica, y choca con la
materialización de agregados que usan los mappers EF (`RuntimeHelpers.GetUninitializedObject`,
decisión de OBS-06): un agregado construido sin constructor no recibe el reloj. Queda como
**R-06** con dos salidas para el Owner: completar la migración (mappers con fábrica interna que
inyecte el reloj) o declarar la deuda como aceptada.

## Verificación

- `dotnet build Zentric.slnx -warnaserror` → `Build succeeded. 0 Warning(s) 0 Error(s)`.
- `dotnet test Zentric.slnx --no-build` → **341/341 PASS** (`Zentric.Tests.dll`, net10.0).
- `dotnet test --filter CartExpirationTests` → 7/7 PASS, incluidos los tres casos que antes
  dependían del reloj del ejecutor.
- Trazabilidad: H-06 marcado como corregido en la capa de decisión
  ([sección 10.1](../SDD.md#10-riesgos-hallazgos-y-observaciones)),
  R-06 reescrito con el residual exacto ([sección 10.2](../SDD.md#102-riesgos-y-observaciones-vigentes)),
  y [checkout-timeout-service.md](../Domain/services/checkout-timeout-service.md) añade el
  paso 1 (umbral desde `IClock`) y la forma de verificarlo sin esperar 15 minutos.

