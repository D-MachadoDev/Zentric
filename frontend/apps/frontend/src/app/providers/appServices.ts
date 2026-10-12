import { createApiClient } from '../../adapters';

/**
 * Instancia única de servicios de la aplicación.
 *
 * Vive en su propio fichero y a nivel de módulo por dos razones que no son
 * detalles de empaquetado:
 *
 * 1. **Debe ser única.** El router lee la sesión en sus guardas `beforeLoad`
 *    (fuera del render) y los componentes la leen desde `useAuth()`. Dos
 *    instancias significarían que, tras un login, la guarda seguiría viendo el
 *    token viejo.
 * 2. **Debe ser estable.** Recrearla en cada render destruiría la sesión en
 *    memoria justo en el momento en que se acaba de abrir.
 */
export const appServices = createApiClient();
