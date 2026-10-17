import { createRootRouteWithContext, createRoute, Outlet, redirect } from '@tanstack/react-router';
import { RootLayout } from '../../layouts/RootLayout';
import { UserRole } from '../../domain';
import type { RouterContext } from './routerContext';
import { appServices } from '../providers/appServices';

/**
 * Raíz del árbol de rutas con contexto tipado de sesión.
 */
const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <RootLayout>
      <Outlet />
    </RootLayout>
  ),
});

/**
 * Ruta /entrar para acceso con credenciales.
 */
const entrarRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/entrar',
  beforeLoad: ({ context }) => {
    if (context.session.getAccessToken() !== null && context.session.getRole() !== null) {
      throw redirect({ to: '/' });
    }
  },
  component: () => (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-8 shadow-2xl">
        <h1 className="text-2xl font-bold tracking-tight text-white">Entrar a la consola</h1>
        <p className="text-sm text-zinc-400">Ingrese sus credenciales de acceso.</p>
      </div>
    </main>
  ),
});

/**
 * Ruta raíz (/) con despacho según rol del usuario autenticado.
 */
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: ({ context }) => {
    if (context.session.getAccessToken() === null || context.session.getRole() === null) {
      throw redirect({ to: '/entrar', search: { aviso: 'sin-sesion' } as any });
    }
  },
  component: () => {
    const role = appServices.session.getRole();


    switch (role) {
      case UserRole.Administrator:
        return (
          <main className="p-8">
            <h1 className="text-2xl font-bold">Panel general</h1>
            <p className="text-sm text-zinc-400">Consola de administración</p>
          </main>
        );
      case UserRole.Seller:
        return (
          <main className="p-8">
            <h1 className="text-2xl font-bold">Mis productos</h1>
            <p className="text-sm text-zinc-400">Gestión de catálogo e inventario</p>
          </main>
        );
      case UserRole.Buyer:
        return (
          <main className="p-8">
            <h1 className="text-2xl font-bold">Panel del Comprador</h1>
            <p className="text-sm text-zinc-400">Mis pedidos y compras</p>
          </main>
        );
      case UserRole.LogisticsOperator:
        return (
          <main className="p-8">
            <h1 className="text-2xl font-bold">Panel Logístico</h1>
            <p className="text-sm text-zinc-400">Despachos y fulfillment</p>
          </main>
        );
      default:
        return (
          <main className="p-8">
            <p className="text-sm text-zinc-400">Panel en preparación</p>
          </main>
        );
    }
  },
});

export const routeTree = rootRoute.addChildren([indexRoute, entrarRoute]);
