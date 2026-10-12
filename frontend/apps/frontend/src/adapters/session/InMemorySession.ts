import type { CurrentUser, SessionPort, UserRole } from '../../domain';

/**
 * Sesión en memoria (Frontend-Adapters §4, Q15-B sobre `ADR-0009`).
 *
 * El access token vive **sólo** en esta clase: nada de `localStorage`,
 * `sessionStorage` ni cookies legibles por JavaScript, que expondrían un
 * bearer a cualquier XSS. Al recargar la página el estado se pierde y toca
 * volver a autenticarse — es el precio de no tener endpoint de refresco.
 */
export class InMemorySession implements SessionPort {
  #accessToken: string | null = null;
  #role: UserRole | null = null;
  #userId: string | null = null;
  #loadIdentity: (() => Promise<CurrentUser>) | null = null;

  /**
   * Enlaza la carga de identidad (`GET /api/auth/me`) **después** de construir
   * el cliente HTTP.
   *
   * El orden importa: el cliente necesita la sesión para leer el token y
   * `restore()` necesita al cliente para llamar al servidor. Inyectar el
   * `fetch` en el constructor rompería ese ciclo sin acoplar la sesión a la red.
   */
  bindIdentityLoader(load: () => Promise<CurrentUser>): void {
    this.#loadIdentity = load;
  }

  getAccessToken(): string | null {
    return this.#accessToken;
  }

  setAccessToken(token: string): void {
    this.#accessToken = token;
  }

  clear(): void {
    this.#accessToken = null;
    this.#role = null;
    this.#userId = null;
  }

  /**
   * Restaura la identidad sólo si aún hay token en memoria. **No** prolonga la
   * vida del token: lee los claims del vigente (§4). Sin token no hay nada que
   * restaurar, porque no existe refresh.
   */
  async restore(): Promise<boolean> {
    if (this.#accessToken === null || this.#loadIdentity === null) return false;

    const identity = await this.#loadIdentity();
    this.#role = identity.role;
    this.#userId = identity.userId;
    return true;
  }

  getRole(): UserRole | null {
    return this.#role;
  }

  setRole(role: UserRole): void {
    this.#role = role;
  }

  getUserId(): string | null {
    return this.#userId;
  }

  setUserId(id: string): void {
    this.#userId = id;
  }
}
