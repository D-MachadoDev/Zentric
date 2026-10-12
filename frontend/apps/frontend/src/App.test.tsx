import { render, screen } from '@testing-library/react';
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppQueryClientProvider } from './app/providers/AppQueryClientProvider';
import { AuthProvider } from './app/providers/AuthProvider';
import { appServices } from './app/providers/appServices';
import { routerOptions } from './app/routes/routerOptions';
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
});
