/**
 * Paleta Zentric (Q7-C / Frontend-Design-System.md §3).
 *
 * Espejo de packages/ui/src/styles/theme.css. Existe en TS SOLO para lo que
 * JavaScript necesita: formateadores, validación de contraste y tests.
 * Regla de precedencia (Frontend-Design-System.md seccion 2): si ambos
 * divergen, MANDA EL CSS porque es lo que pinta la UI.
 */
export const colors = {
  /** Lienzo base (carbón azulado profundo) — fondo de la consola. */
  background: '#0A0E1A',
  /** Texto principal sobre fondo carbón (alto contraste > 14:1). */
  foreground: '#F1F5F9',
  /** Texto secundario para descripciones y etiquetas (contraste >= 6.2:1). */
  foregroundMuted: '#94A3B8',
  /** Texto terciario / placeholders / metadatos (contraste >= 4.5:1). */
  foregroundSubtle: '#728399',

  /** Cian Zentric — acción primaria, foco y éxito de marca. */
  brand: '#00D4AA',
  /** Hover/active de la acción primaria. */
  brandStrong: '#00B896',

  /** Ámbar canónico — alerta, transitorio y reloj de 15 minutos. */
  warning: '#FFB800',

  /** Superficie primaria sólida (tarjetas, tablas, modales). */
  surface: '#111827',
  /** Superficie secundaria (cabeceras, hover, bloques de código). */
  surfaceMuted: '#161F30',
  /** Borde estructural estándar (1px solid). */
  border: '#1F293D',
  /** Borde sutil / hairline (1px solid divisorio interno). */
  borderSubtle: '#192231',

  /** Confirmado / activo. */
  success: '#10B981',
  /** Error / acción destructiva. */
  danger: '#EF4444',
  /** Informativo / tránsito. */
  info: '#3B82F6',
} as const;

export type ColorToken = keyof typeof colors;

