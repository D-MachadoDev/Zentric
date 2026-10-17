import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalErrorBoundary } from './app/components/GlobalErrorBoundary';
import { AppQueryClientProvider } from './app/providers/AppQueryClientProvider';
import { AuthProvider } from './app/providers/AuthProvider';
import { alertAdapter } from './app/providers/alertAdapter';
import { appServices } from './app/providers/appServices';
import { AppRouterProvider } from './app/routes/AppRouter';
import * as routeDefs from './app/routes/routeTree';
import { routerOptions } from './app/routes/routerOptions';
import { AlertHost } from './components/alert/AlertHost';
import { TableSkeleton } from './components/TableSkeleton';
import { UserRole } from './domain';

// Q11 (TanStack Router) se verifica contra una historia en memoria: en jsdom
// no hay historial de navegador real, pero la resolución de rutas y las
// opciones son las mismas que en producción porque se reutilizan.
function renderAt(path: string) {
  const router = createRouter({
    ...routerOptions,
    history: createMemoryHistory({ initialEntries: [path] }),
  });

  return render(
    <AppQueryClientProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </AppQueryClientProvider>,
  );
}

/** Sesión en memoria sin tocar la red: los servicios se sustituyen por dobles. */
function iniciarSesion(role: UserRole) {
  appServices.session.setAccessToken('token-de-prueba');
  appServices.session.setRole(role);
  appServices.session.setUserId('00000000-0000-0000-0000-000000000001');
  vi.spyOn(appServices.api, 'currentUser').mockResolvedValue({
    userId: '00000000-0000-0000-0000-000000000001',
    email: 'prueba@zentric.test',
    fullName: 'Cuenta de prueba',
    role,
  });
}

describe('AppRouter', () => {
  beforeEach(() => {
    appServices.session.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('la raíz sin sesión lleva al acceso, no a una pantalla en blanco', async () => {
    // La consola exige sesión: `/` ya no es una portada pública, es el panel. La
    // guarda de `_console` redirige a `/entrar`, que es la única puerta.
    renderAt('/');

    expect(await screen.findByText('Entrar a la consola')).toBeInTheDocument();
  });

  it('la raíz con sesión de Administrador monta el panel general', async () => {
    iniciarSesion(UserRole.Administrator);
    vi.spyOn(appServices.api, 'listUsers').mockResolvedValue([]);
    vi.spyOn(appServices.api, 'listWarehouses').mockResolvedValue([]);
    vi.spyOn(appServices.api, 'listProducts').mockResolvedValue([]);
    vi.spyOn(appServices.api, 'getHealth').mockResolvedValue({
      status: 'healthy',
      database: 'up',
      timestamp: '2026-01-01T00:00:00Z',
    });

    renderAt('/');

    expect(await screen.findByRole('heading', { name: 'Panel general' })).toBeInTheDocument();
  });

  it('la raíz despacha por rol: el Vendedor ve su panel y no el del Administrador', async () => {
    iniciarSesion(UserRole.Seller);
    vi.spyOn(appServices.api, 'listProducts').mockResolvedValue([]);

    renderAt('/');

    expect(await screen.findByRole('heading', { name: 'Mis productos' })).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Panel general' }),
    ).not.toBeInTheDocument();
  });

  it('la raíz despacha por rol: el Comprador ve su panel', async () => {
    iniciarSesion(UserRole.Buyer);
    vi.spyOn(appServices.api, 'listOrders').mockResolvedValue([]);

    renderAt('/');

    expect(await screen.findByRole('heading', { name: 'Panel del Comprador' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Panel general' })).not.toBeInTheDocument();
  });

  it('la raíz despacha por rol: el Operador Logístico ve su panel', async () => {
    iniciarSesion(UserRole.LogisticsOperator);
    vi.spyOn(appServices.api, 'listFulfillments').mockResolvedValue([]);
    vi.spyOn(appServices.api, 'listReturns').mockResolvedValue([]);

    renderAt('/');

    expect(await screen.findByRole('heading', { name: 'Panel Logístico' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Panel general' })).not.toBeInTheDocument();
  });

  it('un rol sin módulo (Supervisor) ve un estado explícito, no una pantalla en blanco', async () => {
    iniciarSesion(UserRole.Supervisor);

    renderAt('/');

    expect(await screen.findByText('Panel en preparación')).toBeInTheDocument();
  });

  it('muestra la vista de no encontrada en vez de dejar la pantalla en blanco', async () => {
    renderAt('/ruta-que-no-existe');

    expect(await screen.findByText('Página no encontrada')).toBeInTheDocument();
  });

  it('GlobalErrorBoundary captura fallos de renderizado y permite reiniciar', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const BrokenChild = (): never => {
      throw new Error('Error catastrófico simulado');
    };

    render(
      <GlobalErrorBoundary>
        <BrokenChild />
      </GlobalErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Algo interrumpió la consola')).toBeInTheDocument();
    expect(screen.getByText('Error catastrófico simulado')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reiniciar Consola' }));
    consoleSpy.mockRestore();
  });

  it('AlertHost enlaza alertAdapter, muestra avisos y resuelve confirmaciones modales', async () => {
    render(<AlertHost />);

    await act(async () => {
      await alertAdapter.show('success', 'Operación lista', 'Todo en orden');
    });

    let confirmPromise!: Promise<boolean>;
    act(() => {
      confirmPromise = alertAdapter.confirm('Confirmar acción', '¿Desea continuar?', 'Sí, continuar');
    });

    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('Confirmar acción')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sí, continuar' }));
    await expect(confirmPromise).resolves.toBe(true);
  });

  it('TableSkeleton y AppRouterProvider montan sin errores y routeTree define componentes', () => {
    const { container } = render(<TableSkeleton filas={3} />);
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
    render(<TableSkeleton />);

    render(
      <AppQueryClientProvider>
        <AuthProvider>
          <AppRouterProvider />
        </AuthProvider>
      </AppQueryClientProvider>,
    );

    // Verifica que todas las definiciones de ruta exportadas expongan su función component
    for (const [key, route] of Object.entries(routeDefs)) {
      if (key.endsWith('Route') && route && typeof route === 'object' && 'options' in route) {
        const opts = (route as { options?: { component?: () => unknown } }).options;
        if (typeof opts?.component === 'function' && key !== 'indexRoute') {
          expect(opts.component()).toBeTruthy();
        }
      }
    }
  });
});
