import type { createRouter } from '@tanstack/react-router';
import { RouteErrorComponent } from './RouteErrorComponent';
import { routeTree } from './routeTree';
import { appServices } from '../providers/appServices';

/**
 * Opciones compartidas del router.
 *
 * En producción y en las pruebas se usan las MISMAS opciones: si el
 * `defaultNotFoundComponent` sólo viviera en el componente, el test seguiría
 * pasando con una app que en pantalla real se quedaría en blanco.
 */
export const routerOptions = {
  routeTree,
  context: {
    session: appServices.session,
  },
  defaultPreload: 'intent',
  // Sin esto el error de ruta no llega a ningún componente y la app se queda
  // en blanco sin diagnóstico.
  defaultNotFoundComponent: () => (
    <main className="grid place-items-center gap-4 p-12">
      <h1 className="text-2xl font-semibold">Página no encontrada</h1>
      <p className="text-foreground/60">La ruta solicitada no existe en la consola.</p>
    </main>
  ),
  // §3: una guarda que lanza `RolNoAutorizadoError` debe pintar un 403 que
  // conserve la sesión, no una pantalla genérica de fallo.
  defaultErrorComponent: RouteErrorComponent,
} satisfies Parameters<typeof createRouter>[0];
