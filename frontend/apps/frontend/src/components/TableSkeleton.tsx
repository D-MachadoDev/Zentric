import { Skeleton } from '@zentric/ui';

/**
 * Esqueleto accesible para visualización de estados de carga en tablas y listados.
 * Compone el átomo Skeleton de @zentric/ui.
 */
export function TableSkeleton({ filas = 5 }: { filas?: number }) {
  return (
    <div
      data-slot="table-skeleton"
      className="flex flex-col gap-2.5 rounded-xl border border-border/60 bg-surface/30 p-4 shadow-xs"
      aria-hidden="true"
    >
      {Array.from({ length: filas }, (_, indice) => (
        <Skeleton key={indice} className="h-10 w-full rounded-lg" />
      ))}
    </div>
  );
}
