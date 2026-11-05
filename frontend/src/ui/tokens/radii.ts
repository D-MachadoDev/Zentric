/**
 * Radios de curvatura del Design System Zentric (Frontend-Design-System.md sección 2.3).
 *
 * Mapea tanto valores numéricos enteros en píxeles (para cálculos JS, Canvas y motion)
 * como cadenas CSS con unidad para paridad estricta con theme.css.
 */

/** Radios numéricos en píxeles. */
export const radii = {
  none: 0,
  xs: 4,      // Sustituye los rounded-[4px] en Checkbox
  sm: 6,      // Badges e insignias
  md: 8,      // Inputs de formulario y botones
  lg: 12,     // Tarjetas estándar y popovers
  xl: 16,     // Modales y contenedores principales
  '2xl': 20,  // Paneles de login y banners
  '3xl': 24,  // Contenedores promocionales amplios
  '4xl': 28,  // Tarjetas display de gran formato
  full: 9999, // Píldoras, avatares y dots
} as const;

export type RadiusToken = keyof typeof radii;

/** Radios formateados como cadenas CSS con unidad píxel. */
export const radiusValues: Record<RadiusToken, string> = {
  none: '0px',
  xs: '4px',
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '20px',
  '3xl': '24px',
  '4xl': '28px',
  full: '9999px',
} as const;

/** Retorna el radio en píxeles para un token dado. */
export function getRadius(token: RadiusToken): number {
  return radii[token];
}

/** Retorna la cadena CSS para un token dado. */
export function getRadiusCss(token: RadiusToken): string {
  return radiusValues[token];
}
