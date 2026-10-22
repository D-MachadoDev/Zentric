import * as React from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown, RotateCcw, X } from 'lucide-react';

import { cn } from '../lib/cn';
import { Skeleton } from '../primitives/Skeleton';

// ─────────────────────────────────────────────────────────────────────────────
// Contrato del compuesto (Frontend-Design-System §5.3 "DataTable")
// ─────────────────────────────────────────────────────────────────────────────

/** Una columna de la tabla. `numeric` alinea a la derecha y usa Geist Mono. */
export interface DataTableColumn<T> {
  id: string;
  header: React.ReactNode;
  /** Clave del objeto que aporta el valor de la celda. */
  accessorKey?: string;
  /** La columna puede ordenarse desde su cabecera. */
  sortable?: boolean;
  /** Columna de cifras: alineacion derecha + `tabular-nums` (§4.1 Voz 3). */
  numeric?: boolean;
  /** Render propio de la celda. */
  cell?: (context: { row: T; value: unknown; index: number }) => React.ReactNode;
}

/** Opción de un filtro de facetas. */
export interface DataTableFilterOption {
  label: string;
  value: string;
}

/** Filtro de facetas: se resuelve en el servidor, no en el cliente. */
export interface DataTableFilter {
  id: string;
  label: string;
  options: DataTableFilterOption[];
  selected: string;
  onChange: (value: string) => void;
}

/** Paginación basada en cero: `page` arranca en 0. */
export interface DataTablePagination {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  keyExtractor: (item: T, index: number) => string;
  className?: string;

  // ── Ordenamiento ──
  /** Columna ordenada (controlado). Sin este valor, el orden es local. */
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  /** Si se provee, la tabla NO ordena localmente: el servidor responde. */
  onSortChange?: (columnId: string, direction: 'asc' | 'desc') => void;

  // ── Seleccion ──
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;

  // ── Busqueda ──
  searchQuery?: string;
  /** Si se provee, la tabla NO filtra localmente: el servidor responde. */
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;

  // ── Filtros de facetas ──
  filters?: DataTableFilter[];

  // ── Paginacion ──
  pagination?: DataTablePagination;

  // ── Estados ──
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: { label: string; onClick: () => void };

  // ── Extras ──
  toolbarActions?: React.ReactNode;
  stickyHeader?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilidades puras
// ─────────────────────────────────────────────────────────────────────────────

function isNullish(value: unknown): boolean {
  return value === null || value === undefined;
}

/**
 * Compara dos valores de columna sin lanzar.
 *
 * Los nulos y los indefinidos van AL FINAL en orden ascendente: un dato
 * ausente no es "el mas pequeno", es "no hay dato". Los numeros se comparan
 * numericamente y el resto como texto en minúsculas, para que el orden sea
 * estable y predecible.
 */
function compareValues(a: unknown, b: unknown): number {
  const aNullish = isNullish(a);
  const bNullish = isNullish(b);

  if (aNullish && bNullish) return 0;
  if (aNullish) return 1;
  if (bNullish) return -1;

  if (typeof a === 'number' && typeof b === 'number') {
    return a === b ? 0 : a < b ? -1 : 1;
  }

  const left = String(a).toLowerCase();
  const right = String(b).toLowerCase();

  if (left === right) return 0;
  return left < right ? -1 : 1;
}

/** Texto buscable de una fila: la concatenacion de sus valores no nulos. */
function rowSearchText<T>(row: T, columns: DataTableColumn<T>[]): string {
  if (isNullish(row)) return '';

  const record = row as unknown as Record<string, unknown>;

  return columns
    .map((column) => {
      if (!column.accessorKey) return '';
      const value = record[column.accessorKey];
      return isNullish(value) ? '' : String(value);
    })
    .join(' ')
    .toLowerCase();
}

function cellValue<T>(row: T, column: DataTableColumn<T>): unknown {
  if (isNullish(row) || !column.accessorKey) return undefined;
  return (row as unknown as Record<string, unknown>)[column.accessorKey];
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────────────────

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  className,

  sortColumn,
  sortDirection,
  onSortChange,

  selectable,
  selectedIds,
  onSelectionChange,

  searchQuery,
  onSearchChange,
  searchPlaceholder,

  filters,

  pagination,

  isLoading,
  error,
  onRetry,
  emptyTitle = 'Sin resultados',
  emptyDescription = 'No hay registros que coincidan con los criterios actuales.',
  emptyAction,

  toolbarActions,
  stickyHeader,
}: DataTableProps<T>) {
  // ── Ordenamiento ──────────────────────────────────────────────────────────
  // El estado interno avanza aunque el consumidor no re-renderice (controlado
  // con `onSortChange` pero sin feedback de props). Cuando las props cambian de
  // verdad, se re-sincronizan DURANTE el render: setState en un efecto
  // provocaria renders en cascada.
  const [sortState, setSortState] = React.useState<{
    columnId: string | undefined;
    direction: 'asc' | 'desc';
  }>(() => ({ columnId: sortColumn, direction: sortDirection ?? 'asc' }));

  const [seenSortProps, setSeenSortProps] = React.useState({
    sortColumn,
    sortDirection,
  });

  if (seenSortProps.sortColumn !== sortColumn || seenSortProps.sortDirection !== sortDirection) {
    setSeenSortProps({ sortColumn, sortDirection });
    setSortState({ columnId: sortColumn, direction: sortDirection ?? 'asc' });
  }

  // ── Busqueda ─────────────────────────────────────────────────────────────
  const [localQuery, setLocalQuery] = React.useState(searchQuery ?? '');
  const [seenSearchProp, setSeenSearchProp] = React.useState(searchQuery);
  if (seenSearchProp !== searchQuery) {
    setSeenSearchProp(searchQuery);
    setLocalQuery(searchQuery ?? '');
  }

  const query = onSearchChange ? (searchQuery ?? '') : localQuery;

  // ── Seleccion ────────────────────────────────────────────────────────────
  const [localSelection, setLocalSelection] = React.useState<string[]>(selectedIds ?? []);
  const selectionKey = (selectedIds ?? []).join('');
  const [seenSelectionKey, setSeenSelectionKey] = React.useState(selectionKey);
  if (seenSelectionKey !== selectionKey) {
    setSeenSelectionKey(selectionKey);
    setLocalSelection(selectedIds ?? []);
  }

  const selection = React.useMemo(() => new Set(localSelection), [localSelection]);

  // ── Datos derivados ───────────────────────────────────────────────────────
  const rows = React.useMemo(() => data ?? [], [data]);

  const visibleRows = React.useMemo(() => {
    // Con `onSearchChange` la tabla filtra en el servidor: el cliente no
    // descarta filas porque solo ve una pagina de la coleccion completa.
    if (onSearchChange) return rows;

    const term = query.trim().toLowerCase();
    if (term === '') return rows;

    return rows.filter((row) => rowSearchText(row, columns).includes(term));
  }, [columns, onSearchChange, query, rows]);

  const sortedRows = React.useMemo(() => {
    // Con `onSortChange` el orden llega del servidor: reordenar aqui seria
    // mentir sobre el estado real de la coleccion.
    if (onSortChange) return visibleRows;

    const column = columns.find((candidate) => candidate.id === sortState.columnId);
    if (!column?.accessorKey) return visibleRows;

    const direction = sortState.direction === 'asc' ? 1 : -1;
    return [...visibleRows].sort(
      (a, b) => direction * compareValues(cellValue(a, column), cellValue(b, column))
    );
  }, [columns, onSortChange, sortState.columnId, sortState.direction, visibleRows]);

  // Cada fila viaja con su clave: `noUncheckedIndexedAccess` obliga a no
  // indexar un array y asumir que el elemento existe.
  const keyedRows = React.useMemo(
    () => sortedRows.map((row, index) => ({ row, key: keyExtractor(row, index) })),
    [keyExtractor, sortedRows]
  );

  const rowKeys = React.useMemo(() => keyedRows.map((entry) => entry.key), [keyedRows]);

  // ── Acciones ──────────────────────────────────────────────────────────────
  const handleSort = (columnId: string) => {
    const direction: 'asc' | 'desc' =
      sortState.columnId === columnId && sortState.direction === 'asc' ? 'desc' : 'asc';

    setSortState({ columnId, direction });
    onSortChange?.(columnId, direction);
  };

  const commitSelection = (next: string[]) => {
    setLocalSelection(next);
    onSelectionChange?.(next);
  };

  const toggleRow = (key: string) => {
    const next = selection.has(key)
      ? localSelection.filter((candidate) => candidate !== key)
      : [...localSelection, key];
    commitSelection(next);
  };

  const toggleAll = () => {
    const allSelected = rowKeys.length > 0 && rowKeys.every((key) => selection.has(key));
    commitSelection(allSelected ? [] : rowKeys);
  };

  const clearSelection = () => commitSelection([]);

  // ── Paginacion ────────────────────────────────────────────────────────────
  const page = pagination?.page ?? 0;
  const pageSize = pagination?.pageSize ?? (rows.length || 1);
  const totalItems = pagination?.totalItems ?? rows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / Math.max(1, pageSize)));
  const rangeFrom = totalItems === 0 ? 0 : page * pageSize + 1;
  const rangeTo = totalItems === 0 ? 0 : Math.min((page + 1) * pageSize, totalItems);
  const canGoBack = page > 0;
  const canGoForward = page < totalPages - 1;

  // ── Render ────────────────────────────────────────────────────────────────
  const hasToolbar = Boolean(searchPlaceholder || filters?.length || toolbarActions);
  const showSelectionBar = selectable && localSelection.length > 0;

  return (
    <div className={cn('flex flex-col gap-4', className)} data-slot="data-table">
      {hasToolbar && (
        <div className="flex flex-wrap items-center gap-2">
          {searchPlaceholder && (
            <input
              type="search"
              value={query}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              onChange={(event) => {
                const value = event.target.value;
                if (onSearchChange) {
                  onSearchChange(value);
                } else {
                  setLocalQuery(value);
                }
              }}
              className="h-8 min-w-56 rounded-md border border-border bg-background px-2.5 text-xs text-foreground placeholder:text-foreground-muted focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
            />
          )}

          {filters?.map((filter) => (
            <select
              key={filter.id}
              value={filter.selected}
              aria-label={filter.label}
              onChange={(event) => filter.onChange(event.target.value)}
              className="h-8 rounded-md border border-border bg-surface px-2 text-xs text-foreground focus:ring-1 focus:ring-brand focus:outline-none"
            >
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ))}

          {toolbarActions && <div className="ml-auto flex items-center gap-2">{toolbarActions}</div>}
        </div>
      )}

      {showSelectionBar && (
        <div className="flex items-center gap-3 border-t border-border-subtle pt-3">
          <span className="text-xs font-medium text-foreground">
            {`${localSelection.length} seleccionados`}
          </span>
          <button
            type="button"
            onClick={clearSelection}
            className="inline-flex items-center gap-1 text-xs text-foreground-muted transition-colors hover:text-danger"
          >
            <X className="h-3 w-3" aria-hidden="true" />
            Limpiar
          </button>
        </div>
      )}

      {error ? (
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4"
        >
          <p className="text-sm font-medium text-destructive">{error.message}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-destructive/30 px-3 text-xs font-medium text-destructive transition-colors hover:bg-destructive/15"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
              Reintentar
            </button>
          )}
        </div>
      ) : (
        <div className="w-full overflow-auto rounded-md border border-border/80 bg-surface">
          <table className="w-full text-sm text-foreground">
            <thead
              className={cn(
                'bg-surface-muted text-xs font-medium text-muted-foreground uppercase',
                stickyHeader && 'sticky top-0 z-10'
              )}
            >
              <tr>
                {selectable && (
                  <th scope="col" className="w-10 px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      aria-label="Seleccionar todas las filas"
                      checked={rowKeys.length > 0 && rowKeys.every((key) => selection.has(key))}
                      onChange={toggleAll}
                      className="size-3.5 accent-[var(--brand)]"
                    />
                  </th>
                )}

                {columns.map((column) => {
                  const isSorted = sortState.columnId === column.id;
                  const ariaSort = isSorted
                    ? sortState.direction === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none';

                  return (
                    <th
                      key={column.id}
                      scope="col"
                      aria-sort={ariaSort}
                      className={cn('px-4 py-3', column.numeric ? 'text-right' : 'text-left')}
                    >
                      {column.sortable ? (
                        <button
                          type="button"
                          onClick={() => handleSort(column.id)}
                          className={cn(
                            'inline-flex items-center gap-1 transition-colors hover:text-foreground',
                            column.numeric && 'flex-row-reverse'
                          )}
                        >
                          <span>{column.header}</span>
                          {isSorted ? (
                            sortState.direction === 'asc' ? (
                              <ArrowUp className="h-3 w-3" aria-hidden="true" />
                            ) : (
                              <ArrowDown className="h-3 w-3" aria-hidden="true" />
                            )
                          ) : (
                            <ChevronsUpDown
                              className="h-3 w-3 opacity-50"
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      ) : (
                        column.header
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-border/80">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, rowIndex) => (
                  <tr key={`skeleton-${rowIndex}`}>
                    {selectable && (
                      <td className="px-4 py-3">
                        <Skeleton className="h-3.5 w-3.5" />
                      </td>
                    )}
                    {columns.map((column) => (
                      <td key={column.id} className="px-4 py-3">
                        <Skeleton className="h-3.5 w-2/3" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : sortedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (selectable ? 1 : 0)}
                    className="px-4 py-10"
                  >
                    <div role="status" className="flex flex-col items-center gap-2 text-center">
                      <p className="text-sm font-semibold text-foreground">{emptyTitle}</p>
                      <p className="max-w-md text-xs text-foreground-muted">{emptyDescription}</p>
                      {emptyAction && (
                        <button
                          type="button"
                          onClick={emptyAction.onClick}
                          className="mt-1 inline-flex h-8 items-center rounded-md border border-border bg-surface px-3 text-xs font-medium text-foreground transition-colors hover:bg-surface-muted"
                        >
                          {emptyAction.label}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                keyedRows.map(({ row, key }, index) => {
                  return (
                    <tr key={key} className="hover:bg-surface-muted/50">
                      {selectable && (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            aria-label={`Seleccionar fila ${key}`}
                            checked={selection.has(key)}
                            onChange={() => toggleRow(key)}
                            className="size-3.5 accent-[var(--brand)]"
                          />
                        </td>
                      )}

                      {columns.map((column) => {
                        const value = cellValue(row, column);

                        return (
                          <td
                            key={column.id}
                            className={cn(
                              'px-4 py-3 text-foreground/90',
                              column.numeric && 'text-right font-mono tabular-nums'
                            )}
                          >
                            {column.cell
                              ? column.cell({ row, value, index })
                              : isNullish(value)
                                ? ''
                                : String(value)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {pagination && !error && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/80 pt-4">
          <span className="text-xs text-muted-foreground">
            {`Mostrando ${rangeFrom} a ${rangeTo} de ${totalItems} resultados`}
          </span>

          <div className="flex items-center gap-2">
            {pagination.pageSizeOptions && pagination.onPageSizeChange && (
              <select
                aria-label="Registros por página"
                value={pagination.pageSize}
                onChange={(event) => pagination.onPageSizeChange?.(Number(event.target.value))}
                className="h-8 rounded-md border border-border bg-surface px-2 text-xs text-foreground focus:ring-1 focus:ring-brand focus:outline-none"
              >
                {pagination.pageSizeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}

            <span className="text-xs text-muted-foreground">
              {`Página ${page + 1} de ${totalPages}`}
            </span>

            <button
              type="button"
              aria-label="Página anterior"
              onClick={() => pagination.onPageChange(page - 1)}
              disabled={!canGoBack}
              className="rounded border border-border/80 px-3 py-1 text-xs transition-colors hover:bg-surface-muted disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              type="button"
              aria-label="Página siguiente"
              onClick={() => pagination.onPageChange(page + 1)}
              disabled={!canGoForward}
              className="rounded border border-border/80 px-3 py-1 text-xs transition-colors hover:bg-surface-muted disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
