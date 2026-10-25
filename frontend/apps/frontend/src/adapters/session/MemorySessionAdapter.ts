import type { CurrentUser, SessionPort, UserRole } from '../../domain';

export const SESSION_TOKEN_STORAGE_KEY = 'zentric.auth.token';
export const SESSION_USER_STORAGE_KEY = 'zentric.auth.user';

/**
 * Adaptador de sesión sincronizado con `localStorage` ([ADDENDUM - DICTADO POR OWNER] ADR-0009).
 *
 * Hidrata síncronamente `accessToken` y `CurrentUser` desde `window.localStorage`
 * al inicializar para preservar la sesión activa al recargar la página (`F5`), y
 * revalida la identidad contra `GET /api/auth/me`.
 */
export class MemorySessionAdapter implements SessionPort {
  #accessToken: string | null = null;
  #user: CurrentUser | null = null;
  #role: UserRole | null = null;
  #userId: string | null = null;
  #loadIdentity: (() => Promise<CurrentUser>) | null = null;
  #subscribers = new Set<() => void>();

  constructor() {
    this.#hydrateFromStorage();
  }

  #hydrateFromStorage(): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      const savedToken = window.localStorage.getItem(SESSION_TOKEN_STORAGE_KEY);
      if (savedToken) {
        this.#accessToken = savedToken;
      }
      const savedUserRaw = window.localStorage.getItem(SESSION_USER_STORAGE_KEY);
      if (savedUserRaw) {
        const parsed = JSON.parse(savedUserRaw) as Partial<CurrentUser>;
        if (parsed && typeof parsed.userId === 'string' && typeof parsed.role === 'string') {
          this.#user = {
            userId: parsed.userId,
            email: typeof parsed.email === 'string' ? parsed.email : '',
            fullName: typeof parsed.fullName === 'string' ? parsed.fullName : '',
            role: parsed.role as UserRole,
          };
          this.#role = parsed.role as UserRole;
          this.#userId = parsed.userId;
        }
      }
    } catch {
      // Si el JSON en localStorage está corrupto o el navegador bloquea storage, limpia en silencio.
      this.#clearStorage();
    }
  }

  #persistToken(token: string | null): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      if (token === null) {
        window.localStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
      } else {
        window.localStorage.setItem(SESSION_TOKEN_STORAGE_KEY, token);
      }
    } catch {
      // Silenciar fallos de cuota de almacenamiento
    }
  }

  #persistUser(): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      if (this.#user) {
        window.localStorage.setItem(SESSION_USER_STORAGE_KEY, JSON.stringify(this.#user));
      } else if (this.#userId && this.#role) {
        window.localStorage.setItem(
          SESSION_USER_STORAGE_KEY,
          JSON.stringify({
            userId: this.#userId,
            email: '',
            fullName: '',
            role: this.#role,
          })
        );
      } else {
        window.localStorage.removeItem(SESSION_USER_STORAGE_KEY);
      }
    } catch {
      // Silenciar fallos de cuota de almacenamiento
    }
  }

  #clearStorage(): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      window.localStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
      window.localStorage.removeItem(SESSION_USER_STORAGE_KEY);
    } catch {
      // Silenciar fallos de acceso a storage
    }
  }

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
    this.#persistToken(token);
    this.#notifySubscribers();
  }

  getUser(): CurrentUser | null {
    return this.#user;
  }

  setUser(user: CurrentUser): void {
    this.#user = user;
    this.#role = user.role;
    this.#userId = user.userId;
    this.#persistUser();
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
    this.#persistUser();
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
    this.#persistUser();
    this.#notifySubscribers();
  }

  clear(): void {
    this.#accessToken = null;
    this.#user = null;
    this.#role = null;
    this.#userId = null;
    this.#clearStorage();
    this.#notifySubscribers();
  }

  /**
   * Restaura la identidad llamando a `GET /api/auth/me` si existe un token activo.
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
