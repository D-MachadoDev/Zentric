import type { SessionPort } from '../../domain';

/**
 * Contrato de lo que una guarda necesita para decidir (Frontend-Role-Modules §3).
 *
 * Las guardas `beforeLoad` corren FUERA del render, así que no pueden usar
 * hooks y reciben la instancia por parámetro. Es la MISMA `SessionPort` que
 * consumen los componentes vía `useAuth()` — nunca una copia: una copia
 * quedaría con el token viejo después de cada login y la guarda dejaría de ver
 * la sesión recién abierta.
 */
export interface RouterContext {
  session: SessionPort;
}

/**
 * Parámetros de búsqueda de `/entrar`.
 *
 * Las guardas dejan un aviso en la URL al redirigir sin sesión, para que la
 * pantalla de acceso explique POR QUÉ pide credenciales en vez de mostrar un
 * formulario mudo (§3: "Redirección a `/entrar` con aviso").
 */
export type EntrarAviso = 'sin-sesion';

export interface EntrarSearch {
  aviso?: EntrarAviso;
}

export function parseEntrarSearch(search: Record<string, unknown>): EntrarSearch {
  // Sólo se reconoce el aviso que las guardas saben emitir: cualquier otro
  // valor que llegue en la URL se descarta en vez de reflejarse en pantalla.
  return { aviso: search['aviso'] === 'sin-sesion' ? 'sin-sesion' : undefined };
}
