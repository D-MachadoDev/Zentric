import type { ZentricApiPort } from '../domain';
import { HttpClient } from './http/HttpClient';
import type { HttpClientOptions } from './http/HttpClient';
import { MemorySessionAdapter } from './session/MemorySessionAdapter';

export * from './http/problemDetails';
export * from './http/HttpClient';
export * from './session/MemorySessionAdapter';
export * from './alert/AlertAdapter';

export interface ApiClientBundle {
  session: MemorySessionAdapter;
  api: ZentricApiPort;
}

/**
 * Compone la sesión en memoria y el cliente HTTP.
 *
 * El cliente lee el token de la sesión síncronamente y `SessionPort.restore()`
 * usa el cliente para llamar a `GET /api/auth/me`.
 */
export function createApiClient(options: Omit<HttpClientOptions, 'session'> = {}): ApiClientBundle {
  const session = new MemorySessionAdapter();
  const api = new HttpClient({ ...options, session });
  session.bindIdentityLoader(() => api.getCurrentUser());

  return { session, api };
}
