import { Button } from '../atoms/Button';

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

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const slots = buildPageWindow(currentPage, totalPages);

  return (
    <nav
      aria-label="Paginación"
      className={`flex flex-col gap-4 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between ${className ?? ''}`}
    >
      <p className="text-xs text-foreground-muted tabular-nums" aria-live="polite">
        Página <span className="font-semibold text-foreground">{currentPage}</span> de{' '}
        <span className="font-semibold text-foreground">{totalPages}</span>
        <span aria-hidden="true"> · </span>
        <span className="text-foreground">{totalItems}</span> elementos
      </p>

      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="text-foreground-muted hover:text-foreground"
        >
          Anterior
        </Button>

        <ul className="flex flex-wrap items-center gap-1">
          {slots.map((slot, index) =>
            slot === 'gap' ? (
              <li key={`gap-${index}`} aria-hidden="true" className="px-1 text-xs text-foreground-subtle">
                …
              </li>
            ) : (
              <li key={slot}>
                <button
                  type="button"
                  onClick={() => onPageChange(slot)}
                  aria-label={`Ir a la página ${slot}`}
                  aria-current={slot === currentPage ? 'page' : undefined}
                  className={`h-8 min-w-8 rounded-lg px-2 text-xs font-medium tabular-nums transition-colors ${
                    slot === currentPage
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
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="text-foreground-muted hover:text-foreground"
        >
          Siguiente
        </Button>
      </div>
    </nav>
  );
}
