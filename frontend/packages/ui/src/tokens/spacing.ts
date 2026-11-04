/**
 * Espaciado y forma (Frontend-Design-System.md seccion 2.3).
 *
 * Escala base de 4 px con pasos intermedios de densidad (0.5, 1.5, 2.5, 3.5)
 * formalizados para armonizar las 16 utilidades ad-hoc detectadas en la auditoría.
 */
const SCALE = 4;

/** Paso de la escala a píxeles. Admite enteros y medios pasos (ej: space(1.5) -> 6). */
export function space(step: number): number {
  return step * SCALE;
}

/** Escala estática completa (0 a 24) con medios pasos intencionales. */
export const spacing = {
  0: '0px',
  0.5: '2px',    // Micro-gap, dot offsets, pill vertical padding
  1: '4px',
  1.5: '6px',    // Button icon+text gap, compact badge padding
  2: '8px',
  2.5: '10px',   // Badge horizontal padding, compact table cell py
  3: '12px',
  3.5: '14px',   // Compact card padding, alert internal padding
  4: '16px',
  5: '20px',
  6: '24px',
  7: '28px',
  8: '32px',
  9: '36px',
  10: '40px',
  11: '44px',
  12: '48px',
  14: '56px',
  16: '64px',
  18: '72px',
  20: '80px',
  24: '96px',
} as const;

export type SpacingToken = keyof typeof spacing;

/** Configuraciones de densidad para vistas comerciales vs operativas. */
export const density = {
  compact: {
    tableRowHeight: 32,
    tableCellPadding: '6px 12px',
    inputHeight: 34,
    buttonSmHeight: 32,
    cardPadding: '16px',
  },
  comfortable: {
    tableRowHeight: 40,
    tableCellPadding: '10px 16px',
    inputHeight: 40,
    buttonSmHeight: 36,
    cardPadding: '24px',
  },
} as const;

/** Filas de tabla: estándar y compacta. */
export const rowHeight = density.comfortable.tableRowHeight;
export const rowHeightCompact = density.compact.tableRowHeight;

/** Duraciones de movimiento en UI operativa (≤ 200ms para respuesta inmediata). */
export const durations = {
  hover: 120,
  dialog: 200,
  skeletonLoop: 1400,
  spinnerLap: 700,
} as const;

/** Curvas de aceleración canónicas. */
export const transitions = {
  easeOutExpo: 'cubic-bezier(0.16, 1, 0.3, 1)',
  easeOutQuint: 'cubic-bezier(0.22, 1, 0.36, 1)',
} as const;

// Re-exportación de radios para retrocompatibilidad
export { radii } from './radii';
