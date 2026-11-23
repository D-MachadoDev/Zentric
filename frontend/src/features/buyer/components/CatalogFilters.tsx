import { Search, X } from 'lucide-react';
import { ProductType, type Category } from '../../../core';
import { CategoryChips } from './CategoryChips';

export type CatalogSort = 'relevance' | 'price-asc' | 'price-desc';
export type CatalogTypeFilter = 'Todos' | ProductType;

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
  { value: 'Todos', label: 'Todos' },
  { value: ProductType.Physical, label: 'Físicos' },
  { value: ProductType.Digital, label: 'Digitales' },
];

const SORT_OPTIONS: { value: CatalogSort; label: string }[] = [
  { value: 'relevance', label: 'Mayor Relevancia' },
  { value: 'price-asc', label: 'Precio: Menor a Mayor' },
  { value: 'price-desc', label: 'Precio: Mayor a Menor' },
];

/**
 * Barra abierta minimalista de filtros del catálogo (Réplica fiel de prototypes/buyer-marketplace-v2.html #catalogo):
 * Erradica cajas cerradas y pesadas, ofreciendo chips horizontales suaves y selector de ordenación a la derecha.
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
    <div className="space-y-4">
      {/* ── Barra Abierta Minimalista (v2 Prototipo) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-3 sm:pb-4">
        {/* Fila 1 móvil / Izquierda desktop: Chips de Tipo + Buscador */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
          {/* Chips Horizontales de Filtro por Tipo */}
          <div
            role="group"
            aria-label="Tipo de producto"
            className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-0.5 shrink-0"
          >
            {TYPE_OPTIONS.map((option) => {
              const isSelected = typeFilter === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onTypeFilterChange(option.value)}
                  className={`px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 shadow-xs'
                      : 'border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400 font-medium'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          {/* Buscador de catálogo inline (ancho completo en móvil, compacto en desktop) */}
          <div className="relative w-full sm:max-w-xs flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => onSearchTermChange(event.target.value)}
              aria-label="Buscar por nombre o especificación"
              placeholder="Buscar por nombre o especificación..."
              className="w-full h-8 sm:h-9 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 pr-3 pl-8 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 transition-colors"
            />
          </div>
        </div>

        {/* Selector de ordenación a la derecha (con appearance-none y chevron sobrio) */}
        <div className="flex items-center justify-between sm:justify-end gap-2 text-xs shrink-0 pt-0.5 sm:pt-0">
          <label htmlFor="catalog-sort" className="text-zinc-500 font-medium">
            Ordenar:
          </label>
          <div className="relative">
            <select
              id="catalog-sort"
              aria-label="Ordenar por"
              value={sort}
              onChange={(event) => onSortChange(event.target.value as CatalogSort)}
              className="appearance-none h-8 sm:h-9 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 pr-7 pl-2.5 text-xs text-zinc-900 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer transition-colors"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-zinc-400">
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Chips de Categorías del Backend (Preservados para lectores de pantalla sin contaminar la UI visual minimalista) */}
      <div className="sr-only">
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

      {/* Indicadores de Filtros Activos y Limpieza */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-zinc-400 font-medium">Filtros activos:</span>
            {selectedCategoryName && (
              <span className="rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 px-2.5 py-0.5 text-zinc-700 dark:text-zinc-300">
                Categoría: {selectedCategoryName}
              </span>
            )}
            {typeFilter !== 'Todos' && (
              <span className="rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 px-2.5 py-0.5 text-zinc-700 dark:text-zinc-300">
                Tipo: {typeFilter === ProductType.Physical ? 'Físicos' : 'Digitales'}
              </span>
            )}
            {searchTerm.trim() !== '' && (
              <span className="rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 px-2.5 py-0.5 text-zinc-700 dark:text-zinc-300">
                «{searchTerm.trim()}»
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-red-500 dark:text-zinc-400 dark:hover:text-red-400 transition-colors cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
            Limpiar filtros
          </button>
        </div>
      )}
    </div>
  );
}
