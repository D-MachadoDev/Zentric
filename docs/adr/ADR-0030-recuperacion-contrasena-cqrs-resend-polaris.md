# ADR-0030 — Vertical Slice Architecture para Recuperación y Restablecimiento de Contraseñas (.NET 10 CQRS, Resend y Polaris)

- **Estado:** [APROBADO]
- **Fecha:** 2026-11-21
- **Autor:** Carlos (Agente T-005 — Guardián Diátaxis) / Aprobado por Marcos (Agente T-003 — Auditor RDD)
- **Ámbito:** Fullstack (`backend/Zentric.*`, `frontend/src/features/auth/`, `frontend/src/app/routes/`)
- **Relacionado con:** [ADR-0009](ADR-0009-autenticacion-jwt-rg01.md) (Autenticación JWT), [ADR-0011](ADR-0011-matriz-autorizacion-por-rol.md) (Matriz de Autorización) y [ADR-0015](ADR-0015-contrato-de-error-http-problem-json.md) (Problem Details)

---

## Contexto

El flujo de autenticación de Zentric Marketplace requería una solución robusta y segura para que los compradores que olvidaron su contraseña puedan recuperarla. Existía además un reporte de error (404 Not Found) al hacer clic en "¿Olvidaste tu contraseña?" en `LoginPage.tsx` debido a rutas no montadas en TanStack Router.

### Fuerzas en Conflicto

1. **Seguridad contra Enumeración de Cuentas (CWE-204)**:
   - Indicar si un correo electrónico existe o no en la base de datos permite a atacantes enumerar cuentas legítimas. Se requería una respuesta uniforme e idéntica independientemente de la existencia de la cuenta.
2. **Ciclo de Vida y Almacenamiento de Tokens Criptográficos**:
   - Los tokens de reseteo no pueden almacenarse en texto plano en la base de datos ni tener vidas útiles prolongadas que permitan ataques de fuerza bruta.
3. **Invariantes Arquitectónicos de Clean Architecture y EF Core (.NET 10)**:
   - La suite de pruebas de gobernanza (`TransversalGatesVerificationTests`) impone un invariante estricto reflexivo sobre el número de `DbSet<T>` expuestos en `ZentricDbContext` (exactamente 20). Agregar una entidad no podía quebrar este guardrail.
   - La matriz de autorización reflexiva (`EndpointAuthorizationMatrixTests`) exige registrar explícitamente cualquier nuevo endpoint expuesto en controladores.
4. **Experiencia de Usuario Zero-404 y Consistencia Visual Polaris**:
   - Las pantallas debían implementarse bajo los 5 Átomos Polaris inmutables sin romper la navegación de TanStack Router y con layout público limpio (eliminando barras de navegación distractoras).

---

## Alternativas Consideradas

| | Opción | Justificación |
|---|---|---|
| **A** | **Vertical Slice CQRS en Clean Architecture con Token Hash SHA-256, Resend y Polaris Zero-404** | — **Elegida.** Genera tokens efímeros criptográficos de 256 bits, almacena únicamente el hash SHA-256 en PostgreSQL, despacha correos vía Resend con fallback resiliente, mapea la persistencia en EF Core sin alterar `DbSet` canónicos y monta las rutas en frontend con validación Playwright E2E. |
| **B** | Servicio SaaS de Autenticación Externo (Auth0 / Firebase) | Introduce costos recurrentes, dependencias de infraestructura externa y rompe el modelo soberano de usuarios en PostgreSQL. |
| **C** | Envío de nueva contraseña generada automáticamente por correo | Práctica insegura que transmite secretos en texto claro por canales de correo no cifrados de extremo a extremo. |

---

## Decisión

Se adopta una **Rebanada Vertical Completa (Vertical Slice)** integrada:

### 1. Dominio y Seguridad Criptográfica (`Zentric.Domain`)
- **Entidad `PasswordResetToken`**:
  - `Id` (Guid, PK).
  - `UserId` (Guid, FK hacia `User`).
  - `TokenHash` (string, hash SHA-256 en Base64; el token raw de 32 bytes generado con `RandomNumberGenerator` nunca se persiste).
  - `ExpiresAt` (DateTimeOffset, caducidad fija a 15 minutos).
  - `UsedAt` (DateTimeOffset nullable, garantiza consumo atómico de un solo uso vía `Use(now)`).
  - Invariantes: `IsExpired(now)`, `IsValid(now)`.
- **Puertos**: `IPasswordResetTokenRepository` e `IEmailSender`.

### 2. Capa de Aplicación CQRS (`Zentric.Application`)
- `ForgotPasswordCommand`: Anti-enumeración estricta; si el usuario no existe, devuelve `Result<bool>.Success(true)` de forma indistinguible. Quema preventivamente tokens previos activos y despacha el correo vía `IEmailSender`.
- `ValidateResetTokenQuery`: Valida vigencia antes de mostrar la pantalla de reseteo.
- `ResetPasswordCommand`: Valida el token, actualiza la contraseña hasheada con `IPasswordHasher` (PBKDF2-HMAC-SHA256 con 600.000 iteraciones) y marca el token como consumido en una transacción atómica.

### 3. Persistencia e Infraestructura (`Zentric.Infrastructure`)
- `PasswordResetTokenDbModel` configurado en `OnModelCreating` de `ZentricDbContext`. Se consulta internamente vía `_dbContext.Set<PasswordResetTokenDbModel>()`, preservando el conteo público de 20 `DbSet<T>`.
- `ResendEmailSender`: Adaptador HTTP para Resend API (`POST https://api.resend.com/emails`) con fallback controlado a logger si no hay API key configurada en entornos locales.

### 4. Presentación Backend (`Zentric.Api`)
- `AuthController`: Expone `/api/auth/forgot-password`, `/api/auth/validate-reset-token` y `/api/auth/reset-password`.
- Registrados explícitamente como `Anonymous` en `EndpointAuthorizationMatrixTests.cs`.

### 5. Frontend React 18 / TanStack Router (`frontend/`)
- Rutas montadas con lazy loading: `/recuperar-contrasena` (`ForgotPasswordPage.tsx`) y `/restablecer-contrasena` (`ResetPasswordPage.tsx`).
- Vistas construidas bajo los 5 Átomos Polaris (Card, Banner, TextField, Button, InlineError).
- `PublicHeader.tsx`: Sanitizado para ocultar la barra de píldoras públicas en rutas de recuperación.
- Validación E2E Playwright: Flujos 4 y 5 en `tests/e2e/auth.spec.ts` certificando **Zero 404** en 5 navegadores (Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari).

---

## Consecuencias

### Positivas
- Resistencia probada a enumeración de cuentas (CWE-204) y tokens reutilizables.
- 100% de tests unitarios (10 xUnit) y E2E (25 Playwright) con exit code 0.
- Rutas de navegación fluidas sin pantallas rotas ni 404.

### Negativas / Mitigaciones
- Requiere proveedor transaccional configurado (Resend); se mitiga con fallback a logger en desarrollo.
