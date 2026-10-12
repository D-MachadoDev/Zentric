import { useEffect, useState } from 'react';

/**
 * Retrasa la propagacion del valor hasta que deja de cambiar.
 *
 * El caso de uso es el filtro de busqueda de listados: sin debounce cada
 * tecla dispararia una llamada al backend. El valor nunca viaja al servidor
 * desde aqui; lo hace el adaptador HTTP (F3).
 */
export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
