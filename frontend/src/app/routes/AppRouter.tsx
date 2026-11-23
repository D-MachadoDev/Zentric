import { createRouter, RouterProvider } from '@tanstack/react-router';
import { routerOptions } from './routerOptions';

const router = createRouter(routerOptions);

/**
 * Registra el router en el sistema de tipos de TanStack Router.
 *
 * Sin esto, `<Link to="...">` de TanStack no valida las rutas y cualquier
 * typo pasaría en silencio hasta ejecución. Hace falta ya en F4, cuando
 * aparezcan los enlaces de navegación por rol.
 */
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export function AppRouterProvider() {
  return <RouterProvider router={router} />;
}
