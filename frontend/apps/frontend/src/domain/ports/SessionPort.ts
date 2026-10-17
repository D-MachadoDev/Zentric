import type { CurrentUser } from '../models';
import type { UserRole } from '../enums';

/**
 * Puerto de sesión (Frontend-Architecture §5.2).
 *
 * El backend NO tiene token de refresco (ADR-0009). El access token vive
 * SOLO en memoria RAM; al recargar la página se pierde y toca volver a autenticarse.
 * Por eso ninguna operación usa `localStorage` ni `sessionStorage`.
 */
export interface SessionPort {
  /** Access token en memoria; `null` si no hay sesión. */
  getAccessToken(): string | null;
  setAccessToken(token: string): void;
  getUser?(): CurrentUser | null;
  setUser?(user: CurrentUser): void;
  clear(): void;
  /**
   * Reconstruye la identidad al abrir la app: si hay token en memoria llama a
   * `GET /api/auth/me`. Sin token no restaura (no hay refresh) y devuelve false.
   */
  restore(): Promise<boolean>;
  getRole(): UserRole | null;
  setRole(role: UserRole): void;
  getUserId(): string | null;
  setUserId(id: string): void;
  /** Suscripción a eventos de cambio de sesión (ej. clear / login) */
  subscribe?(listener: () => void): () => void;
}
