import { createRootRoute, createRoute, Outlet } from '@tanstack/react-router';
import { RootLayout } from '../../layouts/RootLayout';

/**
 * Árbol de rutas limpio para el reinicio del frontend.
 */
const rootRoute = createRootRoute({
  component: () => (
    <RootLayout>
      <Outlet />
    </RootLayout>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-8 shadow-2xl">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 font-bold text-xl">
          Z
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Zentric Frontend Rebuild</h1>
        <p className="text-sm text-zinc-400">
          Frontend vaciado y listo para estructurar desde cero. Base técnica (Vite, TypeScript, Tailwind, Router) operativa y conectada al backend.
        </p>
      </div>
    </main>
  ),
});

export const routeTree = rootRoute.addChildren([indexRoute]);
