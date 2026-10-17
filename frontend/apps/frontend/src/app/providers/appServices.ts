import { createApiClient } from '../../adapters';
import { setDefaultApi, setDefaultSession } from '../../application';

/**
 * Instancia única de servicios de la aplicación.
 *
 * Configura los puertos globales por defecto para los hooks de TanStack Query
 * y los proveedores del árbol de componentes.
 */
export const appServices = createApiClient();

setDefaultApi(appServices.api);
setDefaultSession(appServices.session);
