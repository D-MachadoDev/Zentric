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
  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error && typeof (error as { message: unknown }).message === 'string'
        ? (error as { message: string }).message
        : '';

  const lowerMessage = rawMessage.toLowerCase();

  // 1. Fallos de conectividad o red
  if (
    lowerMessage.includes('failed to fetch') ||
    lowerMessage.includes('network failure') ||
    lowerMessage.includes('network error')
  ) {
    return 'No fue posible conectar con el servidor. Comprueba tu conexión a internet.';
  }

  // 2. Errores en contexto de acceso (login / autenticación)
  if (opciones.enAcceso === true) {
    const is401 = isApiError(error) && error.status === 401;
    const containsEnglishCredentialClue =
      lowerMessage.includes('invalid') ||
      lowerMessage.includes('password') ||
      lowerMessage.includes('credential');

    if (is401 || containsEnglishCredentialClue) {
      return 'El correo o la contraseña no son correctos.';
    }

    // Si viene un error ya localizado en español que no es ApiError genérico, se respeta
    if (rawMessage.trim().length > 0 && !isApiError(error)) {
      return rawMessage;
    }
  }

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
