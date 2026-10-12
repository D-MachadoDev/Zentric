/**
 * Paleta Zentric (Q7-C).
 *
 * Espejo de packages/ui/src/styles/theme.css. Existe en TS SOLO para lo que
 * JavaScript necesita: formateadores, validación de contraste y tests.
 * Regla de precedencia (Frontend-Design-System.md seccion 2): si ambos
 * divergen, MANDA EL CSS porque es lo que pinta la UI.
 */
export const colors = {
  /** Obsidian profundo — fondo de la aplicacion. */
  background: '#09090B',
  /** Texto principal sobre fondo obsidian. */
  foreground: '#F4F4F5',

  /** Cian — accion primaria, foco y exito de marca. */
  brand: '#00D4AA',
  /** Hover/active de la accion primaria. */
  brandStrong: '#00B896',

  /** Ambar calido moderno — pendiente y enfasis. */
  warning: '#F59E0B',

  /** Superficie elevada solida con masa real (paneles, menus, dialogos). */
  surface: '#141418',
  /** Superficie secundaria (filas alternas, cabeceras de tabla). */
  surfaceMuted: '#1E1E24',
  /** Borde zinc definido y sutil. */
  border: '#27272A',

  /** Confirmado. */
  success: '#10B981',
  /** Error. */
  danger: '#EF4444',
  /** Informativo. */
  info: '#38BDF8',
} as const;

export type ColorToken = keyof typeof colors;
