/**
 * Error base del dominio del cliente.
 */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

/**
 * Estructura estándar RFC 7807 / RFC 9457 para Problem Details.
 */
export interface ProblemDetailsData {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  code?: string;
  traceId?: string;
  errors?: Record<string, string[]>;
  [key: string]: unknown;
}

/**
 * Error normalizado de Problem Details (RFC 7807 y RFC 9457).
 *
 * Captura todos los campos emitidos por ResultExtensions.cs y GlobalExceptionHandler.cs
 * del backend C# sin perder metadatos de validación ni códigos de diagnóstico.
 */
export class ProblemDetailsError extends DomainError {
  readonly status: number;
  readonly title: string;
  readonly detail: string;
  readonly type?: string;
  readonly instance?: string;
  readonly code?: string;
  readonly traceId?: string;
  readonly errors?: Record<string, string[]>;

  constructor(data: ProblemDetailsData) {
    const status = data.status ?? 500;
    const detail = data.detail ?? data.title ?? `Error HTTP ${status}`;
    super(detail);
    this.name = 'ProblemDetailsError';
    this.status = status;
    this.title = data.title ?? 'Error';
    this.detail = detail;
    this.type = data.type;
    this.instance = data.instance;
    this.code = data.code;
    this.traceId = data.traceId;
    this.errors = data.errors;
  }

  /** Mensaje apto para presentar al usuario en formularios o banners */
  get userMessage(): string {
    return this.detail;
  }
}

export function isProblemDetailsError(error: unknown): error is ProblemDetailsError {
  return error instanceof ProblemDetailsError;
}
