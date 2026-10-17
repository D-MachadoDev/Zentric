import { redirect } from '@tanstack/react-router';
import { UserRole } from '../../domain';
import type { RouterContext } from './routerContext';

/**
 * Guardas de acceso (Frontend-Role-Modules §3).
 *
 * Con TanStack Router la guarda vive en `beforeLoad`: se ejecuta ANTES de
 * hidratar el módulo, así que una ruta no autorizada ni siquiera resuelve su
 * componente. Son guardas de PRESENTACIÓN — evitan pantallas inútiles; la
 * seguridad real la dan las 20 políticas del servidor (§5), y un `403` real
 * siempre prevalece sin cerrar la sesión.
 */

/**
 * Señal de "rol equivocado".
 *
 * Se lanza como error y la captura `defaultErrorComponent`, que pinta el estado
 * `403` **conservando la sesión** — igual que el servidor, donde un `403` no
 * cierra la sesión. Ese es el motivo de no redirigir aquí: redirigir a `/entrar`
 * borraría una sesión perfectamente válida sólo porque el usuario pulsó un
 * enlace que no le corresponde.
 */
export class RolNoAutorizadoError extends Error {
  readonly rolRequerido: UserRole;

  constructor(rolRequerido: UserRole) {
    super(`Esta sección está reservada al rol ${rolRequerido}.`);
    this.name = 'RolNoAutorizadoError';
    this.rolRequerido = rolRequerido;
  }
}

/**
 * Exige sesión. Sin ella redirige a `/entrar` **con aviso**, para que la
 * pantalla de acceso pueda decir por qué llegó.
 */
export function exigirSesion(context: RouterContext): void {
  if (context.session.getAccessToken() === null || context.session.getRole() === null) {
    throw redirect({ to: '/entrar' as any, search: { aviso: 'sin-sesion' } as any });
  }
}


/** Exige sesión y además el rol exacto del módulo. */
export function exigirRol(context: RouterContext, rol: UserRole): void {
  exigirSesion(context);
  if (context.session.getRole() !== rol) throw new RolNoAutorizadoError(rol);
}

/** Exige sesión y que el rol del usuario esté entre los roles admitidos. */
export function exigirUnoDeRoles(context: RouterContext, roles: readonly UserRole[]): void {
  exigirSesion(context);
  const userRole = context.session.getRole();
  if (userRole === null || !roles.includes(userRole)) {
    throw new RolNoAutorizadoError(roles[0] ?? UserRole.Administrator);
  }
}

