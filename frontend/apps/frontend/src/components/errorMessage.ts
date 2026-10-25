import { isApiError } from '../domain';

/**
 * Mensaje apto para mostrar tras el fallo de un caso de uso.
 *
 * Vive en `components/`, no en los módulos: según Frontend-Architecture §2 es
 * el único punto permitido para importar `domain/` en tiempo de ejecución, y
 * aquí hace falta porque `ApiError` es una clase, no un tipo.
 *
 * Aplica la tabla de §5 —comportamiento por estado— de memoria, sin exponer
 * nunca una traza de pila ni texto crudo de base de datos:
 *
 * | Estado | Aquí |
 * | --- | --- |
 * | `400` / `404` / `409` | El `detail` del servidor: ya está escrito para el usuario |
 * | `401` | El adaptador ya limpió la sesión; se explica la caducidad |
 * | `403` | Permiso insuficiente **sin** cerrar la sesión |
 * | `5xx` | Mensaje genérico con el `traceId` para soporte |
 */
export interface OpcionesMensaje {
  /**
   * Estamos en la pantalla de acceso. Allí un `401` no significa "tu sesión
   * caducó" sino "esas credenciales no valen": decirle al usuario que su sesión
   * caducó justo cuando está intentando entrar sería mentirle.
   */
  enAcceso?: boolean;
}

export function mensajeDeError(error: unknown, opciones: OpcionesMensaje = {}): string {
  if (!isApiError(error)) {
    // Un error que no viene del servidor no se filtra: su texto podría contener
    // detalles técnicos que §5 prohíbe mostrar.
    return 'No se pudo completar la operación. Comprueba tu conexión e inténtalo de nuevo.';
  }

  if (error.status === 401) {
    return opciones.enAcceso === true
      ? 'El correo o la contraseña no son correctos.'
      : 'Tu sesión ha caducado. Vuelve a entrar para continuar.';
  }
  if (error.status === 403) return 'No tienes permiso para realizar esta acción.';

  if (error.status >= 500) {
    const referencia = error.traceId === undefined ? '' : ` (ref. ${error.traceId})`;
    return `El servidor tuvo un problema al procesar la solicitud${referencia}. Inténtalo de nuevo.`;
  }

  return error.userMessage;
}
