import { Skeleton } from '@zentric/ui/components/ui/skeleton';

/**
 * Esqueleto de tabla.
 *
 * §4 exige "estructura visible, sin salto de layout" mientras carga un listado.
 * Vive en `components/` porque lo usan varios módulos y cada copia local se
 * desincronizaba del diseño (tres módulos ya lo repetían).
 *
 * `aria-hidden`: no aporta información; la región que lo contiene es la que se
 * anuncia, y los datos llegan después.
 */
export function TableSkeleton({ filas = 5 }: { filas?: number }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-border/60 bg-surface/30 p-4 shadow-sm" aria-hidden="true">
      {Array.from({ length: filas }, (_, indice) => (
        <Skeleton key={indice} className="h-10 w-full rounded-lg" />
      ))}
    </div>
  );
}
