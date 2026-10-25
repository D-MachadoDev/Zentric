import { AlertCircle, Tags } from 'lucide-react';
import { Button, Skeleton } from '@zentric/ui';
import type { Category } from '../../../domain';

interface CategoryChipsProps {
  categories: Category[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  selectedId: string;
  /** Id centinela que representa "sin filtro de categoria". */
  allId: string;
  onSelect: (categoryId: string) => void;
}

const CHIP_BASE =
  'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors';

/**
 * Chips de categoria alimentados por `GET api/catalog/categories` (S1).
 *
 * Fuente unica: el backend solo devuelve categorias con al menos un producto
 * publicado, asi que la UI no filtra, no completa ni inventa categorias. Los
 * estados de carga, vacio y error dicen la verdad en pantalla.
 */
export function CategoryChips({
  categories,
  isLoading,
  isError,
  onRetry,
  selectedId,
  allId,
  onSelect,
}: CategoryChipsProps) {
  const available = categories ?? [];
  const hasCategories = available.length > 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Tags className="h-3.5 w-3.5 text-foreground-subtle" aria-hidden="true" />
        <span className="font-mono text-[11px] font-medium tracking-wider text-foreground-muted uppercase">
          Categorías
        </span>
      </div>

      <div
        role="group"
        aria-label="Categorías de productos"
        aria-busy={isLoading}
        className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1 scrollbar-none"
      >
        {isLoading && !categories ? (
          Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-28 shrink-0 rounded-full" />
          ))
        ) : (
          <>
            <button
              type="button"
              onClick={() => onSelect(allId)}
              aria-pressed={selectedId === allId}
              className={`${CHIP_BASE} ${
                selectedId === allId
                  ? 'border-brand/40 bg-brand/10 font-semibold text-brand'
                  : 'border-border text-foreground-muted hover:bg-surface-muted hover:text-foreground'
              }`}
            >
              Todas las categorías
            </button>

            {available.map((category) => {
              const isActive = selectedId === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => onSelect(category.id)}
                  aria-pressed={isActive}
                  className={`${CHIP_BASE} ${
                    isActive
                      ? 'border-brand/40 bg-brand/10 font-semibold text-brand'
                      : 'border-border text-foreground-muted hover:bg-surface-muted hover:text-foreground'
                  }`}
                >
                  <span>{category.name}</span>
                  <span className="sr-only">, {category.productCount} productos</span>
                  <span
                    aria-hidden="true"
                    className="rounded-full bg-surface-muted px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-foreground-muted"
                  >
                    {category.productCount}
                  </span>
                </button>
              );
            })}
          </>
        )}
      </div>

      {isError && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-2 text-[11px] text-warning"
        >
          <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
          <span>No pudimos cargar las categorías</span>
          <Button variant="ghost" size="sm" onClick={onRetry} className="h-6 px-2 text-[11px]">
            Reintentar
          </Button>
        </div>
      )}

      {!isLoading && !isError && !hasCategories && (
        <p className="text-[11px] text-foreground-muted">
          Aún no hay categorías publicadas: en cuanto un vendedor publique, aparecerán aquí.
        </p>
      )}
    </div>
  );
}
