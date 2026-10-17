import * as React from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
} from 'lucide-react';
import { Button } from '../primitives/Button';
import { Input } from '../primitives/Input';
import { Checkbox } from '../primitives/Checkbox';
import { Skeleton } from '../primitives/Skeleton';
import { StateView } from './StateView';
import { cn } from '../lib/cn';

/**
 * Columna de la tabla interactiva de alta densidad.
 */
export interface DataTableColumn<T> {
  id: string;
  header: React.ReactNode;
  accessorKey?: keyof T;
  cell?: (info: { row: T; value: unknown; index: number }) => React.ReactNode;
  /** Indica si la columna contiene importes monetarios o cantidades de stock. */
  numeric?: boolean;
  /** Habilita ordenamiento interactivo por esta columna. */
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
}

/**
 * Configuración de paginación basada en cero (Frontend-Design-System §5.3).
 */
export interface DataTablePagination {
  /** Índice de página actual basado en cero (0, 1, 2...). */
  page: number;
  /** Cantidad de registros por página. */
  pageSize: number;
  /** Total de registros devueltos por el backend. */
  totalItems: number;
  /** Callback al cambiar de página. */
  onPageChange: (newPage: number) => void;
  /** Callback opcional al cambiar el tamaño de página. */
  onPageSizeChange?: (newPageSize: number) => void;
  /** Opciones de tamaño de página (por defecto: [10, 25, 50, 100]). */
  pageSizeOptions?: number[];
}

/**
 * Filtro interactivo de columna o categoría.
 */
export interface DataTableFilterOption {
  label: string;
  value: string;
}

export interface DataTableFilter {
  id: string;
  label: string;
  options: DataTableFilterOption[];
  selected: string;
  onChange: (value: string) => void;
}

export interface DataTableProps<T> extends React.HTMLAttributes<HTMLDivElement> {
  /** Registros a proyectar en las filas. */
  data: T[];
  /** Definición de columnas de la tabla. */
  columns: DataTableColumn<T>[];
  /** Función para extraer la clave única (ID / GUID) de cada fila. */
  keyExtractor: (item: T, index: number) => string;

  // Ordenamiento
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSortChange?: (columnId: string, direction: 'asc' | 'desc') => void;

  // Selección múltiple
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;

  // Búsqueda y filtros
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  filters?: DataTableFilter[];

  // Paginación
  pagination?: DataTablePagination;

  // Estados
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: { label: string; onClick: () => void };

  // Personalización
  toolbarActions?: React.ReactNode;
  stickyHeader?: boolean;
  className?: string;
}

function DataTable<T>({
  data,
  columns,
  keyExtractor,
  sortColumn: controlledSortColumn,
  sortDirection: controlledSortDirection,
  onSortChange,
  selectable = false,
  selectedIds: controlledSelectedIds,
  onSelectionChange,
  searchQuery: controlledSearchQuery,
  onSearchChange,
  searchPlaceholder = 'Buscar registros...',
  filters,
  pagination,
  isLoading = false,
  error,
  onRetry,
  emptyTitle,
  emptyDescription,
  emptyAction,
  toolbarActions,
  stickyHeader = false,
  className,
  ...props
}: DataTableProps<T>) {
  // 1. Estado local de ordenamiento (uncontrolled fallback)
  const [internalSortColumn, setInternalSortColumn] = React.useState<string | undefined>(controlledSortColumn);
  const [internalSortDirection, setInternalSortDirection] = React.useState<'asc' | 'desc'>(controlledSortDirection ?? 'asc');

  const currentSortColumn = controlledSortColumn ?? internalSortColumn;
  const currentSortDirection = controlledSortDirection ?? internalSortDirection;

  const handleHeaderSortClick = (columnId: string) => {
    let nextDirection: 'asc' | 'desc' = 'asc';
    if (currentSortColumn === columnId) {
      nextDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    }

    if (onSortChange) {
      onSortChange(columnId, nextDirection);
    } else {
      setInternalSortColumn(columnId);
      setInternalSortDirection(nextDirection);
    }
  };

  // 2. Estado local de selección múltiple (uncontrolled fallback)
  const [internalSelectedIds, setInternalSelectedIds] = React.useState<string[]>(controlledSelectedIds ?? []);
  const currentSelectedIds = controlledSelectedIds ?? internalSelectedIds;

  const setSelectedIds = (ids: string[]) => {
    if (onSelectionChange) {
      onSelectionChange(ids);
    } else {
      setInternalSelectedIds(ids);
    }
  };

  // 3. Estado local de búsqueda (uncontrolled fallback)
  const [internalSearchQuery, setInternalSearchQuery] = React.useState<string>(controlledSearchQuery ?? '');
  const currentSearchQuery = controlledSearchQuery ?? internalSearchQuery;

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (onSearchChange) {
      onSearchChange(val);
    } else {
      setInternalSearchQuery(val);
    }
  };

  // 4. Filtrado y ordenamiento local de filas si no es controlado externamente
  const processedData = React.useMemo(() => {
    let result = [...data];

    // Búsqueda local si no hay handler externo
    if (!onSearchChange && currentSearchQuery.trim().length > 0) {
      const q = currentSearchQuery.toLowerCase();
      result = result.filter((item) =>
        Object.values(item as Record<string, unknown>).some((val) =>
          String(val ?? '').toLowerCase().includes(q)
        )
      );
    }

    // Ordenamiento local si no hay handler externo
    if (!onSortChange && currentSortColumn) {
      const col = columns.find((c) => c.id === currentSortColumn);
      if (col && col.accessorKey) {
        result.sort((a, b) => {
          const valA = a[col.accessorKey!];
          const valB = b[col.accessorKey!];
          if (valA === valB) return 0;
          if (valA === null || valA === undefined) return 1;
          if (valB === null || valB === undefined) return -1;
          const comparison = valA < valB ? -1 : 1;
          return currentSortDirection === 'asc' ? comparison : -comparison;
        });
      }
    }

    return result;
  }, [data, onSearchChange, currentSearchQuery, onSortChange, currentSortColumn, currentSortDirection, columns]);

  // 5. Manejo de selección
  const allCurrentIds = React.useMemo(() => {
    return processedData.map((item, idx) => keyExtractor(item, idx));
  }, [processedData, keyExtractor]);

  const allSelected =
    allCurrentIds.length > 0 &&
    allCurrentIds.every((id) => currentSelectedIds.includes(id));

  const someSelected =
    allCurrentIds.some((id) => currentSelectedIds.includes(id)) && !allSelected;

  const toggleSelectAll = () => {
    if (allSelected) {
      const next = currentSelectedIds.filter((id) => !allCurrentIds.includes(id));
      setSelectedIds(next);
    } else {
      const union = Array.from(new Set([...currentSelectedIds, ...allCurrentIds]));
      setSelectedIds(union);
    }
  };

  const toggleSelectRow = (rowId: string) => {
    if (currentSelectedIds.includes(rowId)) {
      setSelectedIds(currentSelectedIds.filter((id) => id !== rowId));
    } else {
      setSelectedIds([...currentSelectedIds, rowId]);
    }
  };

  // 6. Cálculos de paginación
  const totalItems = pagination ? pagination.totalItems : processedData.length;
  const pageSize = pagination ? pagination.pageSize : processedData.length || 10;
  const currentPage = pagination ? pagination.page : 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : currentPage * pageSize + 1;
  const endItem = Math.min(totalItems, (currentPage + 1) * pageSize);

  return (
    <div
      data-slot="data-table"
      className={cn('flex flex-col gap-3 w-full', className)}
      {...props}
    >
      {/* Barra superior: Búsqueda, Filtros y Acciones */}
      {(onSearchChange || searchPlaceholder || filters?.length || toolbarActions || selectable) && (
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            {/* Input de Búsqueda */}
            <div className="relative min-w-[200px] max-w-sm flex-1">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={currentSearchQuery}
                onChange={handleSearchInputChange}
                placeholder={searchPlaceholder}
                className="pl-8 text-xs bg-surface border-border/80 h-9"
              />
            </div>

            {/* Filtros avanzados */}
            {filters?.map((filter) => (
              <div key={filter.id} className="flex items-center gap-1.5">
                <select
                  aria-label={filter.label}
                  value={filter.selected}
                  onChange={(e) => filter.onChange(e.target.value)}
                  className="h-9 rounded-md border border-border/80 bg-surface px-2.5 text-xs text-foreground focus-visible:border-ring focus-visible:outline-none"
                >
                  {filter.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}

            {/* Contador de selección activa */}
            {selectable && currentSelectedIds.length > 0 && (
              <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs text-primary font-medium">
                <span>{currentSelectedIds.length} seleccionados</span>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="underline hover:text-primary-strong text-[11px]"
                >
                  Limpiar
                </button>
              </div>
            )}
          </div>

          {/* Acciones adicionales en barra */}
          {toolbarActions && (
            <div className="flex items-center gap-2">{toolbarActions}</div>
          )}
        </div>
      )}

      {/* Contenedor principal de la tabla con scroll horizontal */}
      <div className="relative w-full overflow-x-auto rounded-xl border border-border/80 bg-surface shadow-xs">
        <table className="w-full caption-bottom text-sm border-collapse">
          {/* Cabecera */}
          <thead
            className={cn(
              'border-b border-border/80 bg-surface-muted/80 backdrop-blur-xs',
              stickyHeader && 'sticky top-0 z-10'
            )}
          >
            <tr className="border-b border-border/80">
              {selectable && (
                <th className="h-10 w-10 px-3 text-center align-middle">
                  <Checkbox
                    checked={allSelected}
                    aria-label="Seleccionar todas las filas"
                    onCheckedChange={toggleSelectAll}
                    className={cn(someSelected && 'data-[state=unchecked]:bg-primary/20')}
                  />
                </th>
              )}

              {columns.map((col) => {
                const isSorted = currentSortColumn === col.id;
                const sortDir = isSorted ? currentSortDirection : undefined;

                return (
                  <th
                    key={col.id}
                    aria-sort={
                      col.sortable
                        ? sortDir === 'asc'
                          ? 'ascending'
                          : sortDir === 'desc'
                            ? 'descending'
                            : 'none'
                        : undefined
                    }
                    className={cn(
                      'h-10 px-4 align-middle text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap',
                      col.numeric ? 'text-right' : 'text-left',
                      col.headerClassName
                    )}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => handleHeaderSortClick(col.id)}
                        className={cn(
                          'inline-flex items-center gap-1.5 hover:text-foreground focus-visible:outline-none focus-visible:underline',
                          col.numeric && 'flex-row-reverse'
                        )}
                      >
                        <span>{col.header}</span>
                        {isSorted ? (
                          sortDir === 'asc' ? (
                            <ArrowUp className="size-3 text-primary stroke-[2.5]" />
                          ) : (
                            <ArrowDown className="size-3 text-primary stroke-[2.5]" />
                          )
                        ) : (
                          <ArrowUpDown className="size-3 opacity-40 hover:opacity-100" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Cuerpo */}
          <tbody className="divide-y divide-border/60">
            {/* Estado 1: Loading */}
            {isLoading && (
              <>
                {Array.from({ length: 5 }).map((_, rIdx) => (
                  <tr key={`loading-row-${rIdx}`} className="border-b border-border/60">
                    {selectable && (
                      <td className="px-3 py-3 text-center align-middle">
                        <Skeleton className="size-4 mx-auto rounded bg-surface-muted" />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.id} className="px-4 py-3 align-middle">
                        <Skeleton
                          className={cn(
                            'h-4 rounded bg-surface-muted',
                            col.numeric ? 'ml-auto w-16' : 'w-3/4'
                          )}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            )}

            {/* Estado 2: Error */}
            {!isLoading && !!error && (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="p-8 text-center"
                >
                  <StateView
                    tone="error"
                    title="No se pudieron cargar los datos de la tabla"
                    description={
                      error instanceof Error
                        ? error.message
                        : 'Ocurrió un error al consultar el servidor.'
                    }
                    action={onRetry ? { label: 'Reintentar', onClick: onRetry } : undefined}
                  />
                </td>
              </tr>
            )}

            {/* Estado 3: Vacío */}
            {!isLoading && !error && processedData.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="p-8 text-center"
                >
                  <StateView
                    tone="empty"
                    title={emptyTitle ?? 'No se encontraron registros'}
                    description={
                      emptyDescription ??
                      'No hay elementos disponibles con los criterios de búsqueda actuales.'
                    }
                    action={emptyAction}
                  />
                </td>
              </tr>
            )}

            {/* Estado 4: Filas de Datos */}
            {!isLoading &&
              !error &&
              processedData.map((row, rIdx) => {
                const rowKey = keyExtractor(row, rIdx);
                const isSelected = currentSelectedIds.includes(rowKey);

                return (
                  <tr
                    key={rowKey}
                    data-state={isSelected ? 'selected' : undefined}
                    className={cn(
                      'border-b border-border/60 transition-colors hover:bg-white/[0.03]',
                      isSelected && 'bg-primary/5'
                    )}
                  >
                    {selectable && (
                      <td className="px-3 py-3 text-center align-middle">
                        <Checkbox
                          checked={isSelected}
                          aria-label={`Seleccionar fila ${rowKey}`}
                          onCheckedChange={() => toggleSelectRow(rowKey)}
                        />
                      </td>
                    )}

                    {columns.map((col) => {
                      const rawValue = col.accessorKey ? row[col.accessorKey] : undefined;
                      const cellContent = col.cell
                        ? col.cell({ row, value: rawValue, index: rIdx })
                        : (rawValue as React.ReactNode);

                      return (
                        <td
                          key={col.id}
                          className={cn(
                            'px-4 py-3 align-middle text-sm whitespace-nowrap text-foreground/90',
                            col.numeric
                              ? 'text-right font-mono tabular-nums'
                              : 'text-left font-sans',
                            col.className
                          )}
                        >
                          {cellContent}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Barra de Paginación */}
      {pagination && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-muted-foreground px-1 py-1">
          <div>
            Mostrando{' '}
            <span className="font-mono font-medium text-foreground tabular-nums">
              {startItem}
            </span>{' '}
            a{' '}
            <span className="font-mono font-medium text-foreground tabular-nums">
              {endItem}
            </span>{' '}
            de{' '}
            <span className="font-mono font-medium text-foreground tabular-nums">
              {totalItems}
            </span>{' '}
            resultados
          </div>

          <div className="flex items-center gap-2">
            {pagination.pageSizeOptions && pagination.onPageSizeChange && (
              <div className="flex items-center gap-1.5 mr-2">
                <span>Por página:</span>
                <select
                  aria-label="Registros por página"
                  value={pageSize}
                  onChange={(e) => pagination.onPageSizeChange!(Number(e.target.value))}
                  className="h-7 rounded border border-border/80 bg-surface px-1.5 text-xs text-foreground focus-visible:border-ring focus-visible:outline-none"
                >
                  {pagination.pageSizeOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <span className="mr-1">
              Página <span className="font-mono font-medium text-foreground tabular-nums">{currentPage + 1}</span> de{' '}
              <span className="font-mono font-medium text-foreground tabular-nums">{totalPages}</span>
            </span>

            <Button
              variant="outline"
              size="icon-sm"
              disabled={currentPage <= 0 || isLoading}
              onClick={() => pagination.onPageChange(currentPage - 1)}
              aria-label="Página anterior"
              className="size-7 border-border/80"
            >
              <ChevronLeft className="size-3.5" />
            </Button>

            <Button
              variant="outline"
              size="icon-sm"
              disabled={currentPage >= totalPages - 1 || isLoading}
              onClick={() => pagination.onPageChange(currentPage + 1)}
              aria-label="Página siguiente"
              className="size-7 border-border/80"
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export { DataTable };
