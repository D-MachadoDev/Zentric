/**
 * Tipografía Zentric (Q8-B): Geist Sans para UI, Geist Mono para datos.
 *
 * Las familias se cargan con @fontsource-variable (bundle local, sin CDN
 * remota bloqueante — Frontend-Design-System.md seccion 2.2).
 *
 * OJO: el nombre de la familia la dicta el paquete, no la intuicion.
 * `@fontsource-variable/geist` declara `'Geist Variable'` (NO 'Geist Sans
 * Variable'); verificar contra node_modules/@fontsource-variable/geist/index.css.
 * Un nombre equivocado compila y pasa los tests, pero el navegador cae a
 * system-ui en silencio.
 */
export const typography = {
  sans: '"Geist Variable", system-ui, sans-serif',
  mono: '"Geist Mono Variable", ui-monospace, monospace',
} as const;

/** Escala de texto: nombre -> [tamaño, line-height]. */
export const typeScale = {
  xs: ['0.75rem', '1.5'],
  sm: ['0.875rem', '1.5'],
  base: ['1rem', '1.5'],
  lg: ['1.125rem', '1.4'],
  xl: ['1.25rem', '1.35'],
  '2xl': ['1.5rem', '1.3'],
  '3xl': ['1.875rem', '1.25'],
  '4xl': ['2.25rem', '1.2'],
} as const;

export type TypeScaleToken = keyof typeof typeScale;

/** Pesos disponibles (400/500/600/700). */
export const fontWeights = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

/**
 * Cifras, IDs/GUID y tablas usan mono para que las columnas se alineen
 * verticalmente: es la razón de existir de la segunda familia.
 */
export const dataFontFamily = typography.mono;
