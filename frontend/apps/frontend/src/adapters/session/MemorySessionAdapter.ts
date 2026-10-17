import type { CurrentUser, SessionPort, UserRole } from '../../domain';

/**
 * Adaptador de sesión en memoria RAM (Frontend-Adapters §4, ADR-0009).
 *
 * El token JWT y el perfil de usuario se retienen exclusivamente en memoria volátil.
 * Está ESTRICTAMENTE PROHIBIDO el uso de localStorage, sessionStorage o cookies
 * legibles por JavaScript, previniendo vulnerabilidades XSS.
 *
 * Al recargar la página el estado se pierde intencionalmente (sin refresh token).
 */
export class MemorySessionAdapter implements SessionPort {
  #accessToken: string | null = null;
  #user: CurrentUser | null = null;
  #role: UserRole | null = null;
  #userId: string | null = null;
  #loadIdentity: (() => Promise<CurrentUser>) | null = null;
  #subscribers = new Set<() => void>();

  /**
   * Enlaza la carga de identidad (`GET /api/auth/me`) tras construir el cliente HTTP.
   */
  bindIdentityLoader(load: () => Promise<CurrentUser>): void {
    this.#loadIdentity = load;
  }

  getAccessToken(): string | null {
    return this.#accessToken;
  }

  setAccessToken(token: string): void {
    this.#accessToken = token;
    this.#notifySubscribers();
  }

  getUser(): CurrentUser | null {
    return this.#user;
  }

  setUser(user: CurrentUser): void {
    this.#user = user;
    this.#role = user.role;
    this.#userId = user.userId;
    this.#notifySubscribers();
  }

  getRole(): UserRole | null {
    return this.#role;
  }

  setRole(role: UserRole): void {
    this.#role = role;
    if (this.#user && this.#user.role !== role) {
      this.#user = { ...this.#user, role };
    }
    this.#notifySubscribers();
  }

  getUserId(): string | null {
    return this.#userId;
  }

  setUserId(id: string): void {
    this.#userId = id;
    if (this.#user && this.#user.userId !== id) {
      this.#user = { ...this.#user, userId: id };
    }
    this.#notifySubscribers();
  }

  clear(): void {
    this.#accessToken = null;
    this.#user = null;
    this.#role = null;
    this.#userId = null;
    this.#notifySubscribers();
  }

  /**
   * Restaura la identidad llamando a `GET /api/auth/me` si existe un token en RAM.
   * Sin token no hay nada que restaurar (no hay refresh token por diseño).
   */
  async restore(): Promise<boolean> {
    if (this.#accessToken === null || this.#loadIdentity === null) return false;

    try {
      const identity = await this.#loadIdentity();
      this.setUser(identity);
      return true;
    } catch {
      this.clear();
      return false;
    }
  }

  subscribe(listener: () => void): () => void {
    this.#subscribers.add(listener);
    return () => {
      this.#subscribers.delete(listener);
    };
  }

  #notifySubscribers(): void {
    for (const listener of this.#subscribers) {
      try {
        listener();
      } catch (err) {
        // Silenciar errores en listeners para no romper el flujo de sesión
        console.error('Error en listener de sesión:', err);
      }
    }
  }
}

/** Alias para compatibilidad con código existente */
export { MemorySessionAdapter as InMemorySession };
