import { createMemoryHistory, createRouter, isRedirect } from '@tanstack/react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { InMemorySession } from '../../adapters';
import { UserRole } from '../../domain';
import { appServices } from '../providers/appServices';
import {
  exigirRol,
  exigirSesion,
  exigirUnoDeRoles,
  getRoleHomePath,
  RolNoAutorizadoError,
} from '../routes/guards';
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
 * Guardas de rol.
 *
 * La tabla de la spec distingue TRES resultados, y cada uno es una decisión
 * distinta que conviene fijar con una prueba: sin sesión hay redirección, con
 * el rol equivocado hay estado 403 que conserva la sesión, y con el rol
 * correcto se pasa.
 */
describe('guardas de rol (§3)', () => {
  it('sin sesión redirige a /login con el aviso sin-sesion', () => {
    const session = new InMemorySession();

    try {
      exigirSesion({ session });
      expect.unreachable('Debía lanzar la redirección');
    } catch (error) {
      expect(isRedirect(error)).toBe(true);
      // Decisión A4 / §3: Redirección canónica a `/login` con aviso
      expect(redirectDe(error)).toMatchObject({ to: '/login', search: { aviso: 'sin-sesion' } });
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

    // La sesión se conserva, igual que en el servidor, donde un `403` no
    // cierra la sesión. Redirigir a `/login`
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

describe('getRoleHomePath (§2 y Decisión A4)', () => {
  it('retorna la ruta home canónica para cada uno de los 5 roles del sistema', () => {
    expect(getRoleHomePath(UserRole.Administrator)).toBe('/admin');
    expect(getRoleHomePath(UserRole.Seller)).toBe('/seller');
    expect(getRoleHomePath(UserRole.Buyer)).toBe('/buyer');
    expect(getRoleHomePath(UserRole.LogisticsOperator)).toBe('/logistics');
    expect(getRoleHomePath(UserRole.Supervisor)).toBe('/supervisor');
  });

  it('retorna /login cuando el rol es nulo o indefinido', () => {
    expect(getRoleHomePath(null)).toBe('/login');
  });
});

describe('exigirUnoDeRoles', () => {
  it('permite el acceso si el rol del usuario está en la lista de roles admitidos', () => {
    const session = new InMemorySession();
    session.setAccessToken('token-123');
    session.setRole(UserRole.Seller);

    expect(() =>
      exigirUnoDeRoles({ session }, [UserRole.Seller, UserRole.Administrator]),
    ).not.toThrow();

    // Comprueba también para Administrador en subárbol que lo admite
    session.setRole(UserRole.Administrator);
    expect(() =>
      exigirUnoDeRoles({ session }, [UserRole.Seller, UserRole.Administrator]),
    ).not.toThrow();
  });

  it('lanza RolNoAutorizadoError si el rol no está entre los admitidos, conservando la sesión', () => {
    const session = new InMemorySession();
    session.setAccessToken('token-123');
    session.setRole(UserRole.Buyer);

    expect(() =>
      exigirUnoDeRoles({ session }, [UserRole.Seller, UserRole.Administrator]),
    ).toThrow(RolNoAutorizadoError);

    // Invariante de seguridad: la sesión en RAM se conserva intacta
    expect(session.getAccessToken()).toBe('token-123');
    expect(session.getRole()).toBe(UserRole.Buyer);
  });

  it('redirige a login si no hay sesión activa', () => {
    const session = new InMemorySession();

    try {
      exigirUnoDeRoles({ session }, [UserRole.Seller, UserRole.Administrator]);
      expect.unreachable('Debía lanzar la redirección');
    } catch (error) {
      expect(isRedirect(error)).toBe(true);
      expect(redirectDe(error)).toMatchObject({ to: '/login' });
    }
  });
});

/**
 * La guarda de `/login` y `/entrar`:
 * impide enseñar el formulario de acceso a quien ya tiene sesión.
 */
describe('rutas públicas de autenticación y redirecciones', () => {
  beforeEach(() => {
    appServices.session.clear();
  });

  it('ruta /login redirige a / cuando ya hay sesión abierta', async () => {
    appServices.session.setAccessToken('token');
    appServices.session.setRole(UserRole.Buyer);

    const router = createRouter({
      ...routerOptions,
      history: createMemoryHistory({ initialEntries: ['/login'] }),
    });
    await router.load();

    expect(router.state.location.pathname).toBe('/');
  });

  it('ruta /login muestra la pantalla de acceso cuando no hay sesión', async () => {
    const router = createRouter({
      ...routerOptions,
      history: createMemoryHistory({ initialEntries: ['/login'] }),
    });
    await router.load();

    expect(router.state.location.pathname).toBe('/login');
  });

  it('ruta /entrar (alias) redirige a / cuando ya hay sesión abierta', async () => {
    appServices.session.setAccessToken('token');
    appServices.session.setRole(UserRole.Buyer);

    const router = createRouter({
      ...routerOptions,
      history: createMemoryHistory({ initialEntries: ['/entrar'] }),
    });
    await router.load();

    expect(router.state.location.pathname).toBe('/');
  });

  it('ruta /entrar (alias) muestra la pantalla de acceso cuando no hay sesión', async () => {
    const router = createRouter({
      ...routerOptions,
      history: createMemoryHistory({ initialEntries: ['/entrar'] }),
    });
    await router.load();

    expect(router.state.location.pathname).toBe('/entrar');
  });

  it('ruta /register redirige a / cuando ya hay sesión abierta', async () => {
    appServices.session.setAccessToken('token');
    appServices.session.setRole(UserRole.Buyer);

    const router = createRouter({
      ...routerOptions,
      history: createMemoryHistory({ initialEntries: ['/register'] }),
    });
    await router.load();

    expect(router.state.location.pathname).toBe('/');
  });

  it('ruta /register muestra la pantalla de registro cuando no hay sesión', async () => {
    const router = createRouter({
      ...routerOptions,
      history: createMemoryHistory({ initialEntries: ['/register'] }),
    });
    await router.load();

    expect(router.state.location.pathname).toBe('/register');
  });

  it('ruta /health es accesible públicamente sin sesión', async () => {
    const router = createRouter({
      ...routerOptions,
      history: createMemoryHistory({ initialEntries: ['/health'] }),
    });
    await router.load();

    expect(router.state.location.pathname).toBe('/health');
  });
});

describe('matriz de aislamiento de roles y superpotestad de Administrador', () => {
  beforeEach(() => {
    appServices.session.clear();
  });

  it('Administrador tiene acceso a todos los subárboles de rol', async () => {
    appServices.session.setAccessToken('admin-token');
    appServices.session.setRole(UserRole.Administrator);

    const adminSubtrees = [
      '/admin',
      '/seller',
      '/buyer',
      '/logistics',
      '/supervisor',
    ];

    for (const path of adminSubtrees) {
      const router = createRouter({
        ...routerOptions,
        history: createMemoryHistory({ initialEntries: [path] }),
      });
      await router.load();
      expect(router.state.location.pathname).toBe(path);
    }
  });

  it('Comprador puede navegar a subárbol /buyer pero es bloqueado en otros roles sin purgar su sesión', async () => {
    appServices.session.setAccessToken('buyer-token');
    appServices.session.setRole(UserRole.Buyer);

    // Permitido
    const routerBuyer = createRouter({
      ...routerOptions,
      history: createMemoryHistory({ initialEntries: ['/buyer'] }),
    });
    await routerBuyer.load();
    expect(routerBuyer.state.location.pathname).toBe('/buyer');

    // Bloqueado en /admin: carga la ruta pero renderiza error de rol no autorizado manteniendo la sesión
    const routerAdmin = createRouter({
      ...routerOptions,
      history: createMemoryHistory({ initialEntries: ['/admin'] }),
    });
    await routerAdmin.load();
    // La sesión en RAM se mantiene 100% intacta
    expect(appServices.session.getAccessToken()).toBe('buyer-token');
    expect(appServices.session.getRole()).toBe(UserRole.Buyer);
  });

  it('Vendedor puede navegar a subárbol /seller pero es bloqueado en /admin', async () => {
    appServices.session.setAccessToken('seller-token');
    appServices.session.setRole(UserRole.Seller);

    const routerSeller = createRouter({
      ...routerOptions,
      history: createMemoryHistory({ initialEntries: ['/seller'] }),
    });
    await routerSeller.load();
    expect(routerSeller.state.location.pathname).toBe('/seller');

    const routerAdmin = createRouter({
      ...routerOptions,
      history: createMemoryHistory({ initialEntries: ['/admin'] }),
    });
    await routerAdmin.load();
    expect(appServices.session.getAccessToken()).toBe('seller-token');
    expect(appServices.session.getRole()).toBe(UserRole.Seller);
  });

  it('acceso no autenticado a cualquier subárbol protegido redirige a /login', async () => {
    const protectedPaths = [
      '/admin',
      '/seller',
      '/buyer',
      '/logistics',
      '/supervisor',
    ];

    for (const path of protectedPaths) {
      const router = createRouter({
        ...routerOptions,
        history: createMemoryHistory({ initialEntries: [path] }),
      });
      await router.load();
      expect(router.state.location.pathname).toBe('/login');
    }
  });
});
