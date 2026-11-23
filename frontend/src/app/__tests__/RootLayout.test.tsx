import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider, Outlet } from '@tanstack/react-router';
import { RootLayout } from '../layouts/RootLayout';

describe('RootLayout y Herramientas de Desarrollo TanStack (@FEAT-DEVTOOLS-TANSTACK)', () => {
  it('renderiza la barra de progreso superior y el contenido hijo proyectado dentro del router', async () => {
    const queryClient = new QueryClient();

    const rootTestRoute = createRootRoute({
      component: () => (
        <RootLayout>
          <Outlet />
        </RootLayout>
      ),
    });

    const indexTestRoute = createRoute({
      getParentRoute: () => rootTestRoute,
      path: '/',
      component: () => <div data-testid="contenido-hijo">Consola Operativa Zentric</div>,
    });

    const routeTree = rootTestRoute.addChildren([indexTestRoute]);
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ['/'] }),
    });

    await router.load();

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    expect(await screen.findByTestId('contenido-hijo')).toBeInTheDocument();
    expect(screen.getByText('Consola Operativa Zentric')).toBeInTheDocument();
  });

  it('proyecta los devtools de TanStack Query y TanStack Router en modo desarrollo', async () => {
    const queryClient = new QueryClient();

    const rootTestRoute = createRootRoute({
      component: () => (
        <RootLayout>
          <div data-testid="vista-activa">Pantalla de Prueba</div>
        </RootLayout>
      ),
    });

    const indexTestRoute = createRoute({
      getParentRoute: () => rootTestRoute,
      path: '/',
      component: () => <div data-testid="inicio">Inicio</div>,
    });

    const routeTree = rootTestRoute.addChildren([indexTestRoute]);
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ['/'] }),
    });

    await router.load();

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    expect(await screen.findByTestId('vista-activa')).toBeInTheDocument();
    expect(container.firstChild).toBeInTheDocument();
  });
});
