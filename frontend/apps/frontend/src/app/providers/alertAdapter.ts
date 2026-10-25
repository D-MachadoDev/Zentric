import { AlertAdapter } from '../../adapters/alert/AlertAdapter';

/**
 * Instancia única de alertas (misma razón que `appServices`): el adaptador guarda
 * al host que está escuchando, y sólo puede haber uno montado. Si cada página
 * creara el suyo, la confirmación abriría en un host que nadie ve.
 */
export const alertAdapter = new AlertAdapter();
