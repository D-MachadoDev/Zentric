import { isApiError } from '../types';

/**
 * Traduce fallos técnicos del servidor a mensajes amigables para el usuario.
 * Protege la seguridad de la plataforma evitando mostrar trazas técnicas o datos sensibles en pantalla.
 */
export interface OpcionesMensaje {
  /**
   * Permite distinguir si el usuario estaba intentando entrar (credenciales incorrectas)
   * o si ya estaba navegando y su sesión expiró.
   */
  enAcceso?: boolean;
}

export function mensajeDeError(error: unknown, opciones: OpcionesMensaje = {}): string {
  if (!isApiError(error)) {
    // Un error que no viene del servidor no se filtra: su texto podría contener
    // detalles técnicos que sección 5 prohíbe mostrar.
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
