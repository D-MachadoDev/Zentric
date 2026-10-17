import { ProblemDetailsError } from '../../domain';
import type { ProblemDetailsData } from '../../domain';

/**
 * Traducción de `ProblemDetails` a `ProblemDetailsError` (Frontend-Adapters §3.4).
 *
 * El backend emite dos envoltorios distintos: el middleware de validación de
 * ASP.NET añade `title` + `errors` + `traceId`, mientras que el controlador
 * publica `status` + `detail`. El orden de extracción lo fija §3.4:
 * `detail` → `title` → `errors` aplanado → mensaje genérico con el estado.
 *
 * Compatible con RFC 7807 y RFC 9457.
 */
export function toApiError(status: number, body: string): ProblemDetailsError {
  const fallback = `El servidor devolvió un error (${status}).`;
  const problem = parseProblem(body);

  if (problem === null) {
    return new ProblemDetailsError({
      status,
      title: status >= 500 ? 'Error del servidor' : 'Error de solicitud',
      detail: fallback,
    });
  }

  const detail =
    firstString(problem['detail']) ??
    firstString(problem['title']) ??
    flattenValidationErrors(problem['errors']) ??
    fallback;

  const title =
    firstString(problem['title']) ??
    (status >= 500 ? 'Error del servidor' : 'Error de solicitud');

  const traceId = firstString(problem['traceId']);
  const code = firstString(problem['code']);
  const type = firstString(problem['type']);
  const instance = firstString(problem['instance']);
  const errors = isRecord(problem['errors'])
    ? (problem['errors'] as Record<string, string[]>)
    : undefined;

  const data: ProblemDetailsData = {
    status,
    title,
    detail,
    type,
    instance,
    code,
    traceId,
    errors,
  };

  return new ProblemDetailsError(data);
}

function parseProblem(body: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(body);
    return isRecord(parsed) ? parsed : null;
  } catch {
    // Un cuerpo no JSON (HTML de un proxy, por ejemplo) degrada al mensaje genérico.
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function firstString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * Aplana `errors` del middleware de validación (`{ role: ["…"] }`) en un mensaje
 * legible, conservando el nombre del campo.
 */
function flattenValidationErrors(errors: unknown): string | null {
  if (!isRecord(errors)) return null;

  const messages: string[] = [];
  for (const [field, value] of Object.entries(errors)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string') messages.push(`${field}: ${item}`);
      }
    } else if (typeof value === 'string') {
      messages.push(`${field}: ${value}`);
    }
  }

  return messages.length > 0 ? messages.join(' ') : null;
}
