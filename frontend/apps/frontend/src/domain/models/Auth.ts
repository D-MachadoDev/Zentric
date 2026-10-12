import type { UserRole } from '../enums';

/**
 * Credencial emitida por `POST /api/auth/login`.
 *
 * Origen: `AuthTokenResponse` en `backend/Zentric.Application/
 * Users/Commands/LoginCommand.cs`. `userId` es un Guid serializado como texto
 * (JSON no tiene tipo Guid) y `role` viaja como nombre de enum (ADR-0012).
 */
export interface AuthToken {
  token: string;
  /** ISO-8601 (DateTimeOffset). El token vive 60 minutos y NO hay refresh (ADR-0009). */
  expiresAt: string;
  userId: string;
  email: string;
  fullName: string;
  role: UserRole;
}

/**
 * Identidad reconstruida por `GET /api/auth/me` (`CurrentUserResponse`).
 * ATENCIÓN: el campo es `userId` (no `id`) y el nombre completo es `fullName`
 * (no `name`), a diferencia de `User` de listados.
 */
export interface CurrentUser {
  userId: string;
  email: string;
  fullName: string;
  role: UserRole;
}

/** Cuerpo de `POST /api/auth/login` (`LoginCommand`). */
export interface LoginInput {
  email: string;
  password: string;
}
