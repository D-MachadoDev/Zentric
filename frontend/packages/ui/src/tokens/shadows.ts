/**
 * Sombras y elevaciones del Design System Zentric (Frontend-Design-System.md sección 2.3).
 *
 * Implementa la doctrina visual anti-IA: difusiones suaves con tinte frío
 * en modo claro (nunca negro opaco), y realce mediante hairline specular en modo oscuro.
 */

export const shadowsLight = {
  none: 'none',
  xs: '0 1px 2px 0 rgba(14, 20, 32, 0.05)',
  sm: '0 1px 3px 0 rgba(14, 20, 32, 0.08), 0 1px 2px -1px rgba(14, 20, 32, 0.06)',
  md: '0 4px 6px -1px rgba(14, 20, 32, 0.08), 0 2px 4px -2px rgba(14, 20, 32, 0.05)',
  lg: '0 10px 15px -3px rgba(14, 20, 32, 0.08), 0 4px 6px -4px rgba(14, 20, 32, 0.04)',
  xl: '0 20px 25px -5px rgba(14, 20, 32, 0.09), 0 8px 10px -6px rgba(14, 20, 32, 0.04)',
  '2xl': '0 25px 50px -12px rgba(14, 20, 32, 0.18)',
  inner: 'inset 0 2px 4px 0 rgba(14, 20, 32, 0.05)',
  surfaceHairline:
    '0 1px 3px 0 rgba(14, 20, 32, 0.04), 0 1px 2px -1px rgba(14, 20, 32, 0.04)',
} as const;

export const shadowsDark = {
  none: 'none',
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.4)',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.45), 0 1px 2px -1px rgba(0, 0, 0, 0.35)',
  md: '0 4px 8px -1px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.03)',
  lg: '0 10px 20px -3px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
  xl: '0 20px 30px -5px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.4)',
  surfaceHairline:
    '0 1px 2px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
} as const;

/** Tokens canónicos por defecto (modo claro). */
export const shadows = shadowsLight;

export type ShadowToken = keyof typeof shadowsLight;
