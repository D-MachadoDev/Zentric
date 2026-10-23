import { redirect } from '@tanstack/react-router';
import { UserRole } from '../../domain';
import type { RouterContext } from '../routes/routerContext';

/**
 * Guardas de acceso y navegación.
 *
 * En TanStack Router las guardas se ejecutan en `beforeLoad`:
 * - Se resuelven ANTES de hidratar el componente o descargar el bundle del módulo.
 * - Son guardas de presentación para evitar renders innecesarios.
 * - Las 21 políticas del backend en `AuthorizationPolicies.cs` garantizan la seguridad real.
 * - Un 403 en presentación jamás cierra la sesión en memoria (ADR-0009).
 */

/**
 * Excepción controlada para acceso a sección con rol no autorizado (403).
 * Conserva la sesión intacta en memoria.
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
 * Devuelve la ruta home canónica para cada rol de usuario según Decisión A4.
 */
export function getRoleHomePath(role: UserRole | null): string {
  switch (role) {
    case UserRole.Administrator:
      return '/admin';
    case UserRole.Seller:
      return '/seller';
    case UserRole.Buyer:
      return '/buyer';
    case UserRole.LogisticsOperator:
      return '/logistics';
    case UserRole.Supervisor:
      return '/supervisor';
    default:
      return '/login';
  }
}

/**
 * Exige sesión activa en memoria RAM.
 * Redirige a `/login` (o `/entrar`) con aviso si no existe token ni rol.
 */
export function exigirSesion(context: RouterContext, targetPath: string = '/login'): void {
  const token = context.session.getAccessToken();
  const role = context.session.getRole();

  if (token === null || role === null) {
    throw redirect({
      to: targetPath,
      search: { aviso: 'sin-sesion' },
    } as never);
  }
}

/**
 * Exige sesión activa y rol exacto en el usuario.
 * Si no hay sesión -> redirige a login.
 * Si el rol no coincide -> lanza RolNoAutorizadoError (403) preservando la sesión.
 */
export function exigirRol(context: RouterContext, rol: UserRole, targetPath: string = '/login'): void {
  exigirSesion(context, targetPath);
  if (context.session.getRole() !== rol) {
    throw new RolNoAutorizadoError(rol);
  }
}

/**
 * Exige sesión activa y que el rol del usuario esté entre los roles admitidos.
 * Si no hay sesión -> redirige a login.
 * Si el rol no coincide -> lanza RolNoAutorizadoError (403) con el rol prioritario.
 */
export function exigirUnoDeRoles(
  context: RouterContext,
  roles: readonly UserRole[],
  targetPath: string = '/login',
): void {
  exigirSesion(context, targetPath);
  const userRole = context.session.getRole();
  if (userRole === null || !roles.includes(userRole)) {
    throw new RolNoAutorizadoError(roles[0] ?? UserRole.Administrator);
  }
}
