/**
 * Identificadores y cantidades.
 *
 * Los GUID del backend se muestran truncados en listas y completos al
 * copiarlos: un GUID entero rompe la retícula de cualquier tabla densa.
 */

/** `e2c1a7f3…9b41` — estable, para listas. */
export function shortId(id: string, head = 8, tail = 4): string {
  if (id.length <= head + tail + 1) return id;
  return `${id.slice(0, head)}…${id.slice(-tail)}`;
}

/** Formatea un entero con separador de miles del locale. */
export function formatCount(value: number, locale = 'es-CO'): string {
  return new Intl.NumberFormat(locale).format(value);
}

/**
 * Porcentaje con una décima, para métricas como `StockFantasmaRate`.
 * El backend envía la razón (0–1); aquí se pinta como porcentaje.
 */
export function formatRate(ratio: number, locale = 'es-CO'): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(ratio);
}
