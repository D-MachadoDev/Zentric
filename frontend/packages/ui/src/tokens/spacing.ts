/**
 * Espaciado y forma (Frontend-Design-System.md seccion 2.3).
 *
 * Escala de 4 px. El multiplicador es intencional: cualquier valor fuera de
 * la escala rompe la retícula y se detecta en revisión.
 */
const SCALE = 4;

/** Paso de la escala a píxeles. `space(3)` -> 12. */
export function space(step: number): number {
  return step * SCALE;
}

/** Misma escala, lista estática para consumir sin ejecutar. */
export const spacing = {
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  6: '24px',
  8: '32px',
  12: '48px',
  16: '64px',
  24: '96px',
} as const;

/** Radios en píxeles. Los mismos valores viven en theme.css como --radius-*. */
export const radii = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

/** Fila de tabla densa pero respirada (seccion 1). */
export const rowHeight = 40;

/**
 * Duraciones de movimiento (seccion 7). Nunca se anima por encima de 200 ms
 * en la UI: la consola es una herramienta de trabajo, no un folleto.
 */
export const durations = {
  hover: 120,
  dialog: 200,
  skeletonLoop: 1400,
  spinnerLap: 700,
} as const;

/**
 * Curvas de transición y aceleración (Frontend-Design-System.md §1, §3).
 * easeOutExpo para paneles laterales y diálogos; easeOutQuint para microinteracciones.
 */
export const transitions = {
  easeOutExpo: 'cubic-bezier(0.16, 1, 0.3, 1)',
  easeOutQuint: 'cubic-bezier(0.22, 1, 0.36, 1)',
} as const;

