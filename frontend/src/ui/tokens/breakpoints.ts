/**
 * Rupturas de diseño responsivo (01-principios-ux.md sección 2.6).
 *
 * Estandariza la cuadrícula de dispositivos para erradicar los saltos de layout
 * en tablets y alinear Tailwind v4 con los hooks de consulta de medios.
 */

/** Puntos de ruptura numéricos en píxeles. */
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type BreakpointToken = keyof typeof breakpoints;

/** Valores de ancho formateados con unidades. */
export const breakpointValues: Record<BreakpointToken, string> = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

/** Media queries de tipo min-width (mobile-first). */
export const mediaQueries = {
  sm: '(min-width: 640px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  xl: '(min-width: 1280px)',
  '2xl': '(min-width: 1536px)',
} as const;

/** Media queries de rango acotado para estilos exclusivos por dispositivo. */
export const rangeMediaQueries = {
  mobileOnly: '(max-width: 639px)',
  tabletOnly: '(min-width: 768px) and (max-width: 1023px)',
  desktopUp: '(min-width: 1024px)',
} as const;
