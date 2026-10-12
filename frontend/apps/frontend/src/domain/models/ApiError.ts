/**
 * Único tipo de error de dominio del cliente (Frontend-Architecture §5).
 *
 * El adaptador HTTP traduce el `ProblemDetails` (RFC 7807) del backend a esta
 * clase; ninguna capa superior conoce el formato del servidor.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly detail: string;
  readonly traceId?: string;

  constructor(status: number, detail: string, traceId?: string) {
    super(detail);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
    this.traceId = traceId;
  }

  /**
   * Mensaje apto para mostrar al usuario.
   *
   * El `detail` del `ProblemDetails` ya es el mensaje que el servidor considera
   * presentable (§5: 400 y 409 muestran "el mensaje del servidor"), así que aquí
   * se propaga sin reescribir. El COMPORTAMIENTO por estado (401 limpia sesión,
   * 403 la conserva, 5xx ofrece reintento con `traceId`) vive en la capa de
   * presentación, no en el error: ver la tabla de §5.
   */
  get userMessage(): string {
    return this.detail;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
