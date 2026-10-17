import type { createRouter } from '@tanstack/react-router';
import { RouteErrorComponent } from './RouteErrorComponent';
import { routeTree } from './routeTree';
import { appServices } from '../providers/appServices';

/**
 * Opciones compartidas del router (C4-4-Codigo-React.md §1.1).
 *
 * En producción y en pruebas unitarias se aplican las MISMAS opciones, garantizando
 * que el contexto de dependencias y el tratamiento de errores 403 / 404 sean idénticos.
 */
export const routerOptions = {
  routeTree,
  context: {
    session: appServices.session,
    sessionPort: appServices.session,
    api: appServices.api,
    apiPort: appServices.api,
  },
  defaultPreload: 'intent',
  defaultNotFoundComponent: () => (
    <main className="grid place-items-center gap-4 p-12 text-center text-foreground">
      <div className="max-w-md space-y-3 rounded-xl border border-border bg-surface p-8 shadow-xl">
        <span className="font-mono text-sm font-semibold text-warning">404</span>
        <h1 className="text-2xl font-semibold">Página no encontrada</h1>
        <p className="text-sm text-foreground-muted">La ruta solicitada no existe en la consola.</p>
      </div>
    </main>
  ),
  defaultErrorComponent: RouteErrorComponent,
} satisfies Parameters<typeof createRouter>[0];
