/**
 * Formateadores de fecha y hora.
 *
 * El backend envía fechas en ISO 8601 (UTC). Aquí sólo se presentan: la
 * conversión de zona horaria es del cliente porque la consola se usa en el
 * navegador del operador, no en el servidor.
 */

/** Zona por defecto: la del navegador. Se puede fijar por tests. */
function resolveTimeZone(timeZone?: string): string {
  return timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** `10 oct 2026` — fecha corta para tablas y tarjetas. */
export function formatDate(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: resolveTimeZone(timeZone),
  }).format(new Date(iso));
}

/** `10 oct 2026, 14:32` — fecha y hora para auditoría y bitácoras. */
export function formatDateTime(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: resolveTimeZone(timeZone),
  }).format(new Date(iso));
}

/** `hace 3 min` — para estados recientes. Más de 7 días cae a fecha absoluta. */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const target = new Date(iso).getTime();
  const deltaSeconds = Math.round((target - now.getTime()) / 1000);

  const formatter = new Intl.RelativeTimeFormat('es-CO', { numeric: 'auto' });

  const table: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['second', 60],
    ['minute', 60],
    ['hour', 24],
    ['day', 7],
  ];

  let value = deltaSeconds;
  for (const [unit, limit] of table) {
    if (Math.abs(value) < limit) {
      return formatter.format(value, unit);
    }
    value = Math.trunc(value / limit);
  }

  return formatDate(iso);
}

/** `10 oct - 14 oct` — rango de entrega compacto. */
export function formatDateRange(fromIso: string, toIso: string, timeZone?: string): string {
  return `${formatDate(fromIso, timeZone)} – ${formatDate(toIso, timeZone)}`;
}
