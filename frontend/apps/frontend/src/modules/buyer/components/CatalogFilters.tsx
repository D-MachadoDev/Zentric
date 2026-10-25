import { Search, X } from 'lucide-react';
import { Button } from '@zentric/ui';
import { ProductType, type Category } from '../../../domain';
import { CategoryChips } from './CategoryChips';

export type CatalogSort = 'relevance' | 'price-asc' | 'price-desc';
export type CatalogTypeFilter = 'All' | ProductType;

interface CatalogFiltersProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  typeFilter: CatalogTypeFilter;
  onTypeFilterChange: (value: CatalogTypeFilter) => void;
  sort: CatalogSort;
  onSortChange: (value: CatalogSort) => void;
  categoryId: string;
  categories: Category[] | undefined;
  isCategoriesLoading: boolean;
  isCategoriesError: boolean;
  onRetryCategories: () => void;
  onSelectCategory: (categoryId: string) => void;
  allCategoriesId: string;
  selectedCategoryName: string | null;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

const TYPE_OPTIONS: { value: CatalogTypeFilter; label: string }[] = [
  { value: 'All', label: 'Todos' },
  { value: ProductType.Physical, label: 'Físicos' },
  { value: ProductType.Digital, label: 'Digitales' },
];

const SORT_OPTIONS: { value: CatalogSort; label: string }[] = [
  { value: 'relevance', label: 'Relevancia' },
  { value: 'price-asc', label: 'Menor precio' },
  { value: 'price-desc', label: 'Mayor precio' },
];

/**
 * Barra de filtros del catalogo.
 *
 * Los tres controles viajan al servidor (`search`, `type`, `sort`): ninguno
 * filtra la pagina activa en el cliente. Las categorias tienen su propia fila
 * porque son el eje principal con el que el comprador organiza el catalogo.
 */
export function CatalogFilters({
  searchTerm,
  onSearchTermChange,
  typeFilter,
  onTypeFilterChange,
  sort,
  onSortChange,
  categoryId,
  categories,
  isCategoriesLoading,
  isCategoriesError,
  onRetryCategories,
  onSelectCategory,
  allCategoriesId,
  selectedCategoryName,
  hasActiveFilters,
  onClearFilters,
}: CatalogFiltersProps) {
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-surface p-4 shadow-xs">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative min-w-0 flex-1 lg:max-w-sm">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-foreground-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
            aria-label="Buscar por nombre o especificación"
            placeholder="Buscar por nombre o especificación..."
            className="w-full rounded-lg border border-border bg-background/80 py-2 pr-3 pl-9 text-xs text-foreground transition-colors placeholder:text-foreground-muted focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
          />
        </div>

        <div
          role="group"
          aria-label="Tipo de producto"
          className="flex shrink-0 flex-wrap items-center gap-1.5"
        >
          {TYPE_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={typeFilter === option.value ? 'default' : 'outline'}
              size="sm"
              aria-pressed={typeFilter === option.value}
              onClick={() => onTypeFilterChange(option.value)}
              className="text-xs font-semibold"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="border-t border-border/60 pt-3.5">
        <CategoryChips
          categories={categories}
          isLoading={isCategoriesLoading}
          isError={isCategoriesError}
          onRetry={onRetryCategories}
          selectedId={categoryId}
          allId={allCategoriesId}
          onSelect={onSelectCategory}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor="catalog-sort"
            className="font-mono text-[11px] font-medium tracking-wider text-foreground-muted uppercase"
          >
            Ordenar por
          </label>
          <select
            id="catalog-sort"
            value={sort}
            onChange={(event) => onSortChange(event.target.value as CatalogSort)}
            className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-brand focus:outline-none"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2">
            <ul className="flex flex-wrap items-center gap-1.5 text-[11px]">
              {selectedCategoryName && (
                <li className="rounded-md border border-border bg-surface-muted px-2 py-0.5 text-foreground-muted">
                  Categoría: {selectedCategoryName}
                </li>
              )}
              {typeFilter !== 'All' && (
                <li className="rounded-md border border-border bg-surface-muted px-2 py-0.5 text-foreground-muted">
                  Tipo: {typeFilter === ProductType.Physical ? 'Físicos' : 'Digitales'}
                </li>
              )}
              {searchTerm.trim() !== '' && (
                <li className="rounded-md border border-border bg-surface-muted px-2 py-0.5 text-foreground-muted">
                  Búsqueda: «{searchTerm.trim()}»
                </li>
              )}
            </ul>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="gap-1 text-xs text-foreground-muted hover:text-danger"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Limpiar filtros
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
