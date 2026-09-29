# [ADR-0009](0009-autenticacion-jwt-rg01.md) — Autenticación real con JWT (RG-01)

```yaml
id: 0009
title: Login con correo y contraseña, hash PBKDF2 en el servidor y token JWT
status: accepted
date: 2026-09-28
decided_by: owner del proyecto
relacionado: [Q-20](../SDD.md), [RG-01](../SDD.md), [R-16](../SDD.md#102-riesgos-y-observaciones-vigentes)
```

## Contexto

`ZENTRIC.md` es **contradictorio** en materia de autenticación:

| Fuente | Texto | Efecto |
| --- | --- | --- |
| Restricciones Generales, **RG-01** | "Toda operación debe ejecutarse por un usuario autenticado." | Obliga a autenticar |
| Alcance, **3.2 Procesos Fuera del Alcance** | "no contempla ... **mecanismos de autenticación técnica** ..." | Exime de definir *cómo* |

La Ley exige la **existencia** de identidad autenticada y excluye su **mecanismo**. Por eso el
agente no podía cerrar RG-01 por sí solo: faltaba el dictamen del Owner (Q-20).

Mientras tanto, el sistema **no autenticaba**. `HeaderBuyerAccessor` leía el identificador de
comprador de la cabecera `X-Buyer-Id`, que el cliente escribe libremente: cualquiera que enviara
un GUID obtenía la identidad de ese comprador. Se verificó además que `Zentric.Api` no declaraba
`AddAuthentication`, `[Authorize]` ni JwtBearer.

### Defecto de seguridad encontrado al diseñar esto

`CreateUserCommand` recibía **`PasswordHash` desde el cliente**. El servidor nunca veía la
contraseña en claro, de modo que:

1. el hash viajaba por la red como si fuera la contraseña, y
2. nada impedía que un cliente enviara un hash inventado, o la contraseña en claro.

Equivale a no tener credenciales. **Se corrige en este ADR**: el cliente envía `Password` y el
servidor calcula el hash.

## Decisión

**Autenticación real: login con correo y contraseña, hash en el servidor y token JWT.**

El Owner descartó las alternativas (b) credencial por rol sin login y (c) autenticación en el
gateway.

### 1. Almacenamiento de la contraseña

- Algoritmo: **PBKDF2-HMAC-SHA256**, 600 000 iteraciones, sal de 16 bytes, subclave de 32 bytes.
- Formato almacenado: `pbkdf2-sha256$600000$<salBase64>$<subclaveBase64>`.
- Verificación en tiempo constante (`CryptographicOperations.FixedTimeEquals`).

**Por qué PBKDF2 y no bcrypt/Argon2:** `Rfc2898DeriveBytes` viene en la biblioteca base de .NET,
así que **no se añade ninguna dependencia**. Es el criterio que ya rige el proyecto desde
[ADR-0007](0007-dispatcher-propio-sustituye-mediatr.md): no incorporar paquetes ajenos que
introduzcan riesgo de licencia. PBKDF2-HMAC-SHA256 con 600 000 iteraciones es la recomendación de
OWASP para derivación de claves.

### 2. Token

- **JWT** firmado con **HS256**, validado por el middleware estándar de ASP.NET Core.
- Vida del token: **60 minutos**. Sin token de refresco en esta versión.
- La clave de firma se lee de configuración y **debe tener al menos 32 bytes**; si falta, la API
  **no arranca**. No hay valor por defecto en el código.

### 3. Claims

| Claim | Contenido | Uso |
| --- | --- | --- |
| `sub` | `User.Id` | Identidad del llamante |
| `email` | Correo del usuario | Trazabilidad |
| `role` | `UserRole` (Buyer, Seller, Administrator, Supervisor, LogisticsOperator) | RG-02, un único rol |
| `name` | Nombre completo | Presentación |

`Buyer.UserId` es 1:1 con `User.Id` por decisión de modelado, así que `sub` sirve también como
identidad de comprador y `ICurrentBuyerAccessor` no necesita cambios de contrato.

### 4. Cierre del acceso por cabecera

`X-Buyer-Id` **se elimina**. `ICurrentBuyerAccessor` pasa a leer **solo** el claim `sub`.

Es seguro hacerlo ya porque **`frontend/` no contiene una sola línea de código**: no hay cliente
que se rompa. Dejar la cabecera como alternativa habría sido mantener abierta la vulnerabilidad
que RG-01 viene a cerrar.

### 5. Alcance de la autorización

Este ADR cumple **RG-01**: toda operación exige un usuario autenticado, salvo `POST /api/auth/login`
y `GET /health` (anónimos por necesidad: el primero para poder autenticarse, el segundo porque lo
invoca el *healthcheck* de Docker).

**RG-03** ("ningún participante podrá administrar información fuera de su rol") **no se implementa
aquí**. Mapear cada uno de los 28 endpoints a los roles de la Matriz de Responsabilidades es una
decisión de negocio que la Ley no explicita endpoint por endpoint; se registra como pregunta
abierta (Q-21) en lugar de inventar la matriz.

## Contrato afectado

| Cambio | Detalle |
| --- | --- |
| **NUEVO** | `POST /api/auth/login` → token + identidad. Anónimo. |
| **NUEVO** | `GET /api/auth/me` → identidad del token vigente. Autenticado. |
| **ROMPE** | `POST /api/users`: el campo `PasswordHash` se sustituye por `Password`. El servidor hashea. |
| **ELIMINA** | Cabecera `X-Buyer-Id` en las 28 rutas. |
| **NUEVO** | Configuración `Jwt:Issuer`, `Jwt:Audience`, `Jwt:SigningKey`, `Jwt:ExpirationMinutes`. |

## Consecuencias

**Positivas**

- RG-01 queda cumplido de forma literal y auditable.
- La contraseña nunca sale del proceso que la verifica.
- El hash se calcula con una constante de coste que se puede subir sin migrar datos.

**Negativas / coste asumido**

- Los usuarios ya registrados guardan un `PasswordHash` de formato desconocido (el que el cliente
  enviaba). **No son migrables**: deberán restablecer su contraseña. El entorno de desarrollo se
  puede vaciar sin pérdida.
- Sin refresh token: al cabo de 60 minutos el usuario debe volver a autenticarse.
- Tres sub-decisiones **no dictadas por la Ley** y marcadas como tales para que el Owner las
  confirme: longitud mínima de contraseña (8 caracteres), 60 minutos de vida del token y PBKDF2
  frente a Argon2id.

## Verificación

- `dotnet build Zentric.slnx -warnaserror` → 0 errores, 0 warnings.
- `dotnet test Zentric.slnx` → suite completa en verde, incluidas las pruebas nuevas de hash,
  emisión de token, rechazo de contraseña incorrecta y rechazo de usuario bloqueado.
- Comprobación manual contra PostgreSQL real: login correcto → `200` con token; contraseña
  incorrecta → `401`; usuario bloqueado → `403`; petición sin token → `401`; la cabecera
  `X-Buyer-Id` sola → `401`.