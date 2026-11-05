/**
 * Tipografía Zentric: Geist Sans para UI y datos numéricos (con tabular-nums),
 * reservando Geist Mono exclusivamente para hashes, UUIDs técnicos y código crudo.
 */
export const typography = {
  sans: '"Geist Variable", system-ui, sans-serif',
  mono: '"Geist Variable", system-ui, sans-serif',
} as const;

/**
 * Escala de texto formal: incluye tokens micro-tipográficos dedicados (2xs, caption)
 * para erradicar las clases arbitrarias text-[11px] y text-[10px] en 79 ficheros.
 * Tupla: [font-size, line-height].
 */
export const typeScale = {
  '2xs': ['0.625rem', '1.4'],      // 10px / 14px — micro-indicadores, badges de tendencia
  caption: ['0.6875rem', '1.45'],  // 11px / 16px — cabeceras de tabla, metadatos, timestamp
  xs: ['0.75rem', '1.5'],          // 12px / 18px — badges estándar, etiquetas
  sm: ['0.875rem', '1.5'],         // 14px / 21px — celdas operativas, inputs, botones
  base: ['1rem', '1.5'],           // 16px / 24px — texto de cuerpo, modales
  lg: ['1.125rem', '1.4'],         // 18px / 25.2px — subtítulos, tarjetas
  xl: ['1.25rem', '1.35'],         // 20px / 27px — títulos de sección
  '2xl': ['1.5rem', '1.3'],        // 24px / 31.2px — títulos de diálogo/drawer
  '3xl': ['1.875rem', '1.25'],     // 30px / 37.5px — títulos de página, KPIs
  '4xl': ['2.25rem', '1.2'],       // 36px / 43.2px — cabeceras display hero
} as const;

export type TypeScaleToken = keyof typeof typeScale;

/** Configuración detallada con letter-spacing por paso tipográfico. */
export const typographySpecs = {
  '2xs': { fontSize: '0.625rem', lineHeight: '0.875rem', letterSpacing: '0.01em' },
  caption: { fontSize: '0.6875rem', lineHeight: '1rem', letterSpacing: '0.005em' },
  xs: { fontSize: '0.75rem', lineHeight: '1.125rem', letterSpacing: '0em' },
  sm: { fontSize: '0.875rem', lineHeight: '1.3125rem', letterSpacing: '0em' },
  base: { fontSize: '1rem', lineHeight: '1.5rem', letterSpacing: '0em' },
  lg: { fontSize: '1.125rem', lineHeight: '1.575rem', letterSpacing: '-0.01em' },
  xl: { fontSize: '1.25rem', lineHeight: '1.6875rem', letterSpacing: '-0.01em' },
  '2xl': { fontSize: '1.5rem', lineHeight: '1.95rem', letterSpacing: '-0.02em' },
  '3xl': { fontSize: '1.875rem', lineHeight: '2.344rem', letterSpacing: '-0.02em' },
  '4xl': { fontSize: '2.25rem', lineHeight: '2.7rem', letterSpacing: '-0.03em' },
} as const;

/** Pesos disponibles (400/500/600/700). */
export const fontWeights = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

/** Alturas de línea estándar. */
export const lineHeights = {
  none: 1,
  tight: 1.25,
  snug: 1.375,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2,
} as const;

/** Espaciado entre letras (tracking). */
export const letterSpacing = {
  tighter: '-0.05em',
  tight: '-0.025em',
  normal: '0em',
  wide: '0.025em',
  wider: '0.05em',
  micro: '0.01em',
  caption: '0.005em',
} as const;

/**
 * Cifras, importes y tablas usan la tipografía Sans con tabular-nums para una legibilidad
 * clara, limpia y moderna, evitando el aspecto condensado y minúsculo de las fuentes monoespaciadas.
 */
export const dataFontFamily = typography.sans;
