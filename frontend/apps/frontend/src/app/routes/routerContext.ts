import type { QueryClient } from '@tanstack/react-query';
import type { SessionPort, ZentricApiPort } from '../../domain';

/**
 * Contrato de contexto inyectado al router en beforeLoad y loaders.
 *
 * Contiene dependencias inyectadas para resolución determinista:
 * - `session`: Puerto de sesión en memoria RAM (ADR-0009).
 * - `api`: Puerto de cliente API central Zentric.
 * - `queryClient`: Gestor de caché TanStack Query para invalidación y prefetching.
 */
export interface RouterContext {
  session: SessionPort;
  sessionPort?: SessionPort;
  api?: ZentricApiPort;
  apiPort?: ZentricApiPort;
  queryClient?: QueryClient;
}

/**
 * Parámetros de búsqueda reconocidos en `/login` y `/entrar`.
 */
export type LoginAviso = 'sin-sesion' | 'expirada' | 'desconectado' | 'cuenta-creada';

export interface LoginSearch {
  aviso?: LoginAviso;
  redirect?: string;
}

export function parseLoginSearch(search: Record<string, unknown>): LoginSearch {
  const avisoRaw = search['aviso'];
  const aviso: LoginAviso | undefined =
    avisoRaw === 'sin-sesion' ||
    avisoRaw === 'expirada' ||
    avisoRaw === 'desconectado' ||
    avisoRaw === 'cuenta-creada'
      ? (avisoRaw as LoginAviso)
      : undefined;

  const redirectRaw = search['redirect'];
  const redirect = typeof redirectRaw === 'string' && redirectRaw.startsWith('/') ? redirectRaw : undefined;

  return { aviso, redirect };
}

// Aliases para compatibilidad con código existente
export type EntrarAviso = 'sin-sesion';
export type EntrarSearch = LoginSearch;
export const parseEntrarSearch = parseLoginSearch;
