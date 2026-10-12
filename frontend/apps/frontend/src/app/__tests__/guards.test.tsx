import { createMemoryHistory, createRouter, isRedirect } from '@tanstack/react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { InMemorySession } from '../../adapters';
import { UserRole } from '../../domain';
import { appServices } from '../providers/appServices';
import { exigirRol, exigirSesion, RolNoAutorizadoError } from '../routes/guards';
import { routerOptions } from '../routes/routerOptions';

/**
 * TanStack entrega la redirección como un `Response` de navegador cuyo payload
 * va dentro de `options`. `isRedirect` es el guard público; esto sólo lo abre.
 */
function redirectDe(error: unknown): { to?: string; search?: Record<string, unknown> } {
  if (!isRedirect(error)) throw new Error('Se esperaba una redirección');
  return (error as unknown as { options: { to?: string; search?: Record<string, unknown> } })
    .options;
}

/**
 * Guardas de rol (Frontend-Role-Modules §3).
 *
 * La tabla de la spec distingue TRES resultados, y cada uno es una decisión
 * distinta que conviene fijar con una prueba: sin sesión hay redirección, con
 * el rol equivocado hay estado 403 que conserva la sesión, y con el rol
 * correcto se pasa.
 */
describe('guardas de rol (§3)', () => {
  it('sin sesión redirige a /entrar con el aviso sin-sesion', () => {
    const session = new InMemorySession();

    try {
      exigirSesion({ session });
      expect.unreachable('Debía lanzar la redirección');
    } catch (error) {
      expect(isRedirect(error)).toBe(true);
      // §3: "Redirección a `/entrar` **con aviso**" — sin el parámetro la
      // pantalla de acceso no podría explicar por qué apareció.
      expect(redirectDe(error)).toMatchObject({ to: '/entrar', search: { aviso: 'sin-sesion' } });
    }
  });

  it('con token y rol no redirige', () => {
    const session = new InMemorySession();
    session.setAccessToken('token');
    session.setRole(UserRole.Buyer);

    expect(() => exigirSesion({ session })).not.toThrow();
  });

  it('un token sin rol no cuenta como sesión', () => {
    const session = new InMemorySession();
    session.setAccessToken('token');

    // El token y el rol se escriben juntos en el login; si sólo hubiera uno, la
    // sesión estaría a medias y la ruta no sabría qué módulo enseñarle.
    try {
      exigirSesion({ session });
      expect.unreachable('Debía lanzar la redirección');
    } catch (error) {
      expect(isRedirect(error)).toBe(true);
    }
  });

  it('con el rol exacto deja pasar', () => {
    const session = new InMemorySession();
    session.setAccessToken('token');
    session.setRole(UserRole.Buyer);

    expect(() => exigirRol({ session }, UserRole.Buyer)).not.toThrow();
  });

  it('con otro rol lanza RolNoAutorizadoError declarando el rol requerido', () => {
    const session = new InMemorySession();
    session.setAccessToken('token');
    session.setRole(UserRole.Buyer);

    expect(() => exigirRol({ session }, UserRole.Administrator)).toThrow(RolNoAutorizadoError);

    try {
      exigirRol({ session }, UserRole.Administrator);
    } catch (error) {
      // El rol requerido viaja en el error para que la pantalla de 403 pueda
      // decirlo sin adivinarlo de nuevo.
      expect((error as RolNoAutorizadoError).rolRequerido).toBe(UserRole.Administrator);
    }
  });

  it('un rol equivocado CONSERVA la sesión en lugar de cerrarla', () => {
    const session = new InMemorySession();
    session.setAccessToken('token');
    session.setRole(UserRole.Buyer);

    expect(() => exigirRol({ session }, UserRole.Administrator)).toThrow();

    // §3: la sesión se conserva, igual que en el servidor, donde un `403` no
    // cierra la sesión (`Frontend-Adapters.md` §5). Redirigir a `/entrar`
    // borraría una sesión válida sólo por pulsar un enlace que no corresponde.
    expect(session.getAccessToken()).toBe('token');
    expect(session.getRole()).toBe(UserRole.Buyer);
  });

  it('sin sesión, exigirRol redirige en vez de devolver un 403', () => {
    const session = new InMemorySession();

    // Un 403 sin sesión diría "no tienes permiso" a alguien que simplemente no
    // ha entrado: el mensaje correcto allí es "inicia sesión".
    try {
      exigirRol({ session }, UserRole.Administrator);
      expect.unreachable('Debía lanzar la redirección');
    } catch (error) {
      expect(isRedirect(error)).toBe(true);
    }
  });
});

/**
 * La guarda de `/entrar` es la única que ya vive en el árbol de rutas (F4a):
 * impide enseñar el formulario de acceso a quien ya tiene sesión.
 */
describe('ruta /entrar', () => {
  beforeEach(() => {
    appServices.session.clear();
  });

  it('redirige a / cuando ya hay sesión abierta', async () => {
    appServices.session.setAccessToken('token');
    appServices.session.setRole(UserRole.Buyer);

    const router = createRouter({
      ...routerOptions,
      history: createMemoryHistory({ initialEntries: ['/entrar'] }),
    });
    await router.load();

    expect(router.state.location.pathname).toBe('/');
  });

  it('muestra la pantalla de acceso cuando no hay sesión', async () => {
    const router = createRouter({
      ...routerOptions,
      history: createMemoryHistory({ initialEntries: ['/entrar'] }),
    });
    await router.load();

    expect(router.state.location.pathname).toBe('/entrar');
  });
});
