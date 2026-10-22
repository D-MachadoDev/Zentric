import { Button } from '@zentric/ui';
import { buildPageWindow } from './pageWindow';

interface CatalogPaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

export function CatalogPagination({
  page,
  totalPages,
  totalItems,
  onPageChange,
}: CatalogPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const slots = buildPageWindow(page, totalPages);

  return (
    <nav
      aria-label="Paginación del catálogo"
      className="flex flex-col gap-4 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="font-mono text-xs text-foreground-muted tabular-nums" aria-live="polite">
        Página <span className="font-semibold text-foreground">{page}</span> de{' '}
        <span className="font-semibold text-foreground">{totalPages}</span>
        <span aria-hidden="true"> · </span>
        <span className="text-foreground">{totalItems}</span> productos
      </p>

      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="text-foreground-muted hover:text-foreground"
        >
          Anterior
        </Button>

        <ul className="flex flex-wrap items-center gap-1">
          {slots.map((slot, index) =>
            slot === 'gap' ? (
              <li
                key={`gap-${index}`}
                aria-hidden="true"
                className="px-1 text-xs text-foreground-subtle"
              >
                …
              </li>
            ) : (
              <li key={slot}>
                <button
                  type="button"
                  onClick={() => onPageChange(slot)}
                  aria-label={`Ir a la página ${slot}`}
                  aria-current={slot === page ? 'page' : undefined}
                  className={`h-8 min-w-8 rounded-lg px-2 text-xs font-medium tabular-nums transition-colors ${
                    slot === page
                      ? 'bg-brand font-semibold text-background'
                      : 'text-foreground-muted hover:bg-surface-muted hover:text-foreground'
                  }`}
                >
                  {slot}
                </button>
              </li>
            ),
          )}
        </ul>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="text-foreground-muted hover:text-foreground"
        >
          Siguiente
        </Button>
      </div>
    </nav>
  );
}
