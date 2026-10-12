/**
 * Estado de salud del servidor (`GET /health`).
 *
 * Origen: `backend/Zentric.Api/Program.cs` (MapGet "/health").
 * Devuelve 200 con `healthy` o `degraded`, y 53 con `unhealthy`; el 5xx lo
 * traduce el adaptador a `ApiError` (§5), por eso el modelo sólo cubre el 200.
 */
export type HealthState = 'healthy' | 'degraded';

export interface HealthStatus {
  status: HealthState;
  database: 'up' | 'down';
  /** ISO-8601 (DateTimeOffset serializado por el backend). */
  timestamp: string;
}
