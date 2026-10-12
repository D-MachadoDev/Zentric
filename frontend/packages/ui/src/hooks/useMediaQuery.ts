import { useSyncExternalStore } from 'react';

/**
 * Devuelve `true` si la media query coincide con el viewport actual.
 *
 * Se usa para las tres rupturas de Frontend-Design-System.md seccion 6
 * (`900px` barra lateral, `560px` apilado).
 *
 * Implementado con `useSyncExternalStore` y no con `useState` + `useEffect`:
 * matchMedia ES un sistema externo, y suscribirse a él de forma sincrona evita
 * el render extra que provoca un `setState` dentro del effect (que React 19
 * marca como error).
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    // Sin ventana (SSR/prerender) no hay viewport: se asume el valor cerrado.
    () => false,
  );
}

/** Rupturas de la spec, centralizadas para no repetir el numero magico. */
export const breakpoints = {
  /** `> 900px`: barra lateral fija + contenido con ancho maximo de 1440px. */
  sidebar: '(min-width: 901px)',
  /** `<= 900px`: la barra lateral pasa a navegacion horizontal desplazable. */
  compact: '(max-width: 900px)',
  /** `<= 560px`: encabezados apilados, botones a ancho completo. */
  stacked: '(max-width: 560px)',
} as const;
