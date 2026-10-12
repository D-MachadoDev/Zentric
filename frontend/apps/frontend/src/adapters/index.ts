import type { ZentricApiPort } from '../domain';
import { ZentricHttpClient } from './http/ZentricHttpClient';
import type { ZentricHttpClientOptions } from './http/ZentricHttpClient';
import { InMemorySession } from './session/InMemorySession';

export * from './http/problemDetails';
export * from './http/ZentricHttpClient';
export * from './session/InMemorySession';
export * from './alert/AlertAdapter';

export interface ApiClientBundle {
  session: InMemorySession;
  api: ZentricApiPort;
}

/**
 * Compone la sesión y el cliente HTTP, que se necesitan mutuamente: el cliente
 * lee el token de la sesión y `SessionPort.restore()` necesita al cliente para
 * llamar a `GET /api/auth/me`. Se construye primero la sesión sin dependencias
 * y recién después se enlaza el cargador de identidad.
 *
 * Fuera de esta función nadie conoce ambos lados a la vez (Frontend-Architecture §2).
 */
export function createApiClient(options: Omit<ZentricHttpClientOptions, 'session'> = {}): ApiClientBundle {
  const session = new InMemorySession();
  const api = new ZentricHttpClient({ ...options, session });
  session.bindIdentityLoader(() => api.currentUser());

  return { session, api };
}
