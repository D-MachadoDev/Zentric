/**
 * Paleta Zentric v2 — "Porcelana y Grafito" (Frontend-Design-System.md §9).
 *
 * Espejo de packages/ui/src/styles/theme.css. Existe en TS SOLO para lo que
 * JavaScript necesita: formateadores, validación de contraste y tests.
 * Regla de precedencia: si ambos divergen, MANDA EL CSS porque es lo que
 * pinta la UI (el test de paridad en tokens.test.ts lo hace fallar).
 *
 * `colors` espeja el MODO CLARO (:root) y `darkColors` el MODO OSCURO (.dark);
 * `roleAccents` espeja los scopes [data-role] de §9.2.
 */

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

  /** Jade de marca — acento por defecto (identidad Comprador, §9.2). */
  brand: '#0F766E',
  /** Hover/active de la acción primaria en claro (paso más profundo). */
  brandStrong: '#0B5D56',

  /** Ámbar profundo — alerta, transitorio y reloj de 15 minutos (4.64:1). */
  warning: '#B45309',

  /** Papel nítido de tarjeta. Exención §9.3: blanco puro, no gris desaturado. */
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

/**
 * Identidad por rol (§9.2): par [acento, acento-hover] por modo.
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

export type ColorToken = keyof typeof colors;
export type DarkColorToken = keyof typeof darkColors;
export type RoleAccent = keyof typeof roleAccents;
