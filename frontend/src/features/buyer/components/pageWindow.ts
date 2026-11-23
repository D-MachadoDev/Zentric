/**
 * Ventana de numeros de pagina con elipsis.
 *
 * Con muchas paginas se muestran siempre la primera, la ultima y el entorno de
 * la actual: el comprador ve donde esta y a donde puede saltar sin scrollear
 * una fila interminable de numeros.
 *
 * Vive en su propio modulo (y no junto al componente) para que el archivo del
 * componente exporte SOLO componentes: mixing exports rompe el Fast Refresh
 * de Vite (regla react-refresh/only-export-components).
 */

export type PageSlot = number | 'gap';

export function buildPageWindow(current: number, total: number): PageSlot[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const visible = new Set<number>([1, total, current - 1, current, current + 1]);
  const pages = [...visible].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);

  const slots: PageSlot[] = [];
  let previous = 0;
  for (const page of pages) {
    if (previous !== 0 && page - previous > 1) {
      slots.push('gap');
    }
    slots.push(page);
    previous = page;
  }

  return slots;
}
