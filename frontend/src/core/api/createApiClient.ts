import type { ZentricApiPort } from '../types';
import { HttpClient, type HttpClientOptions } from './HttpClient';
import { MemorySessionAdapter } from '../session/MemorySessionAdapter';

export interface ApiClientBundle {
  session: MemorySessionAdapter;
  api: ZentricApiPort;
}

/**
 * Compone la sesión en memoria y el cliente HTTP.
 */
export function createApiClient(options: Omit<HttpClientOptions, 'session'> = {}): ApiClientBundle {
  const session = new MemorySessionAdapter();
  const api = new HttpClient({ ...options, session });
  session.bindIdentityLoader(() => api.getCurrentUser());

  return { session, api };
}
