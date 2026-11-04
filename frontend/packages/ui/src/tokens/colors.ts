/**
 * Paleta Zentric v2 — "Porcelana y Grafito" (Frontend-Design-System.md sección 9).
 *
 * Espejo de packages/ui/src/styles/theme.css. Existe en TS SOLO para lo que
 * JavaScript necesita: formateadores, validación de contraste y tests.
 * Regla de precedencia: si ambos divergen, MANDA EL CSS porque es lo que
 * pinta la UI (el test de paridad en tokens.test.ts lo hace fallar).
 *
 * `colors` espeja el MODO CLARO (:root) y `darkColors` el MODO OSCURO (.dark);
 * `roleAccents` espeja los scopes [data-role] de sección 9.2.
 */

// ----------------------------------------------------------------------------
// 1. Core Semantic Dual Palette (14 Canonical Tokens)
// ----------------------------------------------------------------------------

/** Modo Claro "Estudio Porcelana" — tokens :root de theme.css. */
export const colors = {
  /** Lienzo porcelana con tinte frío — fondo base de la consola. */
  background: '#F5F6F8',
  /** Tinta con matiz azul — texto primario (17.04:1 sobre lienzo). */
  foreground: '#0E1420',
  /** Texto secundario para descripciones y etiquetas (7.61:1 sobre lienzo). */
  foregroundMuted: '#454F63',
  /** Texto terciario / placeholders / metadatos (4.96:1 sobre lienzo). */
  foregroundSubtle: '#5F6B82',

  /** Jade de marca — acento por defecto (identidad Comprador, sección 9.2). */
  brand: '#0F766E',
  /** Hover/active de la acción primaria en claro (paso más profundo). */
  brandStrong: '#0B5D56',

  /** Ámbar profundo — alerta, transitorio y reloj de 15 minutos (4.64:1). */
  warning: '#B45309',

  /** Papel nítido de tarjeta. Exención sección 9.3: blanco puro, no gris desaturado. */
  surface: '#FFFFFF',
  /** Superficie secundaria (cabeceras, hover, bloques editoriales). */
  surfaceMuted: '#EEF0F4',
  /** Borde estructural estándar (1px solid). */
  border: '#E1E5EB',
  /** Borde sutil / hairline (1px solid divisorio interno). */
  borderSubtle: '#EBEEF2',

  /** Confirmado / activo (4.64:1). */
  success: '#15803D',
  /** Error / acción destructiva (5.98:1). */
  danger: '#B91C1C',
  /** Informativo / tránsito (6.20:1). */
  info: '#1D4ED8',
} as const;

/** Modo Oscuro "Bóveda Grafito" — tokens .dark de theme.css. */
export const darkColors = {
  background: '#0C0F16',
  foreground: '#EDF1F7',
  foregroundMuted: '#98A2B8',
  foregroundSubtle: '#7D88A3',

  brand: '#2DD4BF',
  brandStrong: '#5EEAD4',

  warning: '#FBBF24',

  surface: '#131824',
  surfaceMuted: '#1A2030',
  border: '#252D40',
  borderSubtle: '#1D2334',

  success: '#4ADE80',
  danger: '#F87171',
  info: '#60A5FA',
} as const;

// ----------------------------------------------------------------------------
// 2. Role-Scoped Accents ([data-role] in theme.css)
// ----------------------------------------------------------------------------

/**
 * Identidad por rol (sección 9.2): par [acento, acento-hover] por modo.
 * Comprador no aparece porque :root YA es el jade Comprador por defecto.
 */
export const roleAccents = {
  seller: {
    light: { brand: '#6D28D9', brandStrong: '#5B21B6' },
    dark: { brand: '#A78BFA', brandStrong: '#C4B5FD' },
  },
  admin: {
    light: { brand: '#4338CA', brandStrong: '#3730A3' },
    dark: { brand: '#818CF8', brandStrong: '#A5B4FC' },
  },
  logistics: {
    light: { brand: '#0E7490', brandStrong: '#0A5C74' },
    dark: { brand: '#22D3EE', brandStrong: '#67E8F9' },
  },
  supervisor: {
    light: { brand: '#A21CAF', brandStrong: '#86198F' },
    dark: { brand: '#E879F9', brandStrong: '#F0ABFC' },
  },
} as const;

// ----------------------------------------------------------------------------
// 3. Complete 50–950 Tonal Scales
// ----------------------------------------------------------------------------

export type ColorScaleStep = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950;
export type ColorScale = Record<ColorScaleStep, string>;

/** Escala Neutra Zentric Slate (con tinte frío B > R) */
export const neutralScale: ColorScale = {
  50: '#F8F9FA',
  100: '#EEF0F4',
  200: '#E1E5EB',
  300: '#CBD2DE',
  400: '#98A2B8',
  500: '#7D88A3',
  600: '#5F6B82',
  700: '#454F63',
  800: '#252D40',
  900: '#131824',
  950: '#0C0F16',
};

/** Escalas de marca por rol e identidad Comprador */
export const brandScales: Record<RoleAccent | 'buyer', ColorScale> = {
  buyer: {
    50: '#F0FDFA',
    100: '#CCFBF1',
    200: '#99F6E4',
    300: '#5EEAD4',
    400: '#2DD4BF',
    500: '#14B8A6',
    600: '#0D9488',
    700: '#0F766E',
    800: '#0B5D56',
    900: '#134E48',
    950: '#042F2C',
  },
  seller: {
    50: '#F5F3FF',
    100: '#EDE9FE',
    200: '#DDD6FE',
    300: '#C4B5FD',
    400: '#A78BFA',
    500: '#8B5CF6',
    600: '#7C3AED',
    700: '#6D28D9',
    800: '#5B21B6',
    900: '#4C1D95',
    950: '#2E1065',
  },
  admin: {
    50: '#EEF2FF',
    100: '#E0E7FF',
    200: '#C7D2FE',
    300: '#A5B4FC',
    400: '#818CF8',
    500: '#6366F1',
    600: '#4F46E5',
    700: '#4338CA',
    800: '#3730A3',
    900: '#312E81',
    950: '#1E1B4B',
  },
  logistics: {
    50: '#ECFEFF',
    100: '#CFFAFE',
    200: '#A5F3FC',
    300: '#67E8F9',
    400: '#22D3EE',
    500: '#06B6D4',
    600: '#0891B2',
    700: '#0E7490',
    800: '#0A5C74',
    900: '#164E63',
    950: '#083344',
  },
  supervisor: {
    50: '#FDF4FF',
    100: '#FAE8FF',
    200: '#F5D0FE',
    300: '#F0ABFC',
    400: '#E879F9',
    500: '#D946EF',
    600: '#C026D3',
    700: '#A21CAF',
    800: '#86198F',
    900: '#701A75',
    950: '#4A044E',
  },
};

/** Escalas semánticas de estado de dominio */
export const statusScales: Record<SemanticStatus, ColorScale> = {
  success: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E',
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
    900: '#14532D',
    950: '#052E16',
  },
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
    950: '#451A03',
  },
  danger: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
    950: '#450A0A',
  },
  info: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
    950: '#172554',
  },
};

// ----------------------------------------------------------------------------
// 4. Type Definitions
// ----------------------------------------------------------------------------

export type ColorToken = keyof typeof colors;
export type DarkColorToken = keyof typeof darkColors;
export type RoleAccent = keyof typeof roleAccents;
export type SemanticStatus = 'success' | 'warning' | 'danger' | 'info';
