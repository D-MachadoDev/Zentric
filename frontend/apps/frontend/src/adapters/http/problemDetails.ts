import { ApiError } from '../../domain';

/**
 * Traducción de `ProblemDetails` a `ApiError` (Frontend-Adapters §3.4).
 *
 * El backend emite dos envoltorios distintos: el middleware de validación de
 * ASP.NET añade `title` + `errors` + `traceId`, mientras que el controlador
 * publica `status` + `detail`. El orden de extracción lo fija §3.4:
 * `detail` → `title` → `errors` aplanado → mensaje genérico con el estado.
 *
 * R-05: la forma vigente es RFC 9457 y el backend aún publica RFC 7807. Ambas
 * comparten estos campos, así que el cliente tolera los dos sin distinguirlos.
 */
export function toApiError(status: number, body: string): ApiError {
  const fallback = `El servidor devolvió un error (${status}).`;
  const problem = parseProblem(body);

  if (problem === null) return new ApiError(status, fallback);

  const detail =
    firstString(problem.detail) ??
    firstString(problem.title) ??
    flattenValidationErrors(problem.errors) ??
    fallback;

  return new ApiError(status, detail, firstString(problem.traceId));
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
 * legible, conservando el nombre del campo: la presentación ya no puede ofrecer
 * error por campo porque `ApiError` sólo transporta `detail`.
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
