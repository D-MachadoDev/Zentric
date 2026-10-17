import { ProblemDetailsError } from './DomainError';

/**
 * Adaptador / alias de ProblemDetailsError para compatibilidad total con código existente.
 *
 * El adaptador HTTP traduce el `ProblemDetails` (RFC 7807/9457) del backend a esta
 * clase; ninguna capa superior conoce el formato del servidor.
 */
export class ApiError extends ProblemDetailsError {
  constructor(status: number, detail: string, traceId?: string) {
    super({
      status,
      detail,
      title: status >= 500 ? 'Error del servidor' : 'Error de solicitud',
      traceId,
    });
    this.name = 'ApiError';
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError || error instanceof ProblemDetailsError;
}
