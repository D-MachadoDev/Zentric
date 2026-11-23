import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import {
  useCategoriesQuery,
  useProductsPagedQuery,
  useOrdersQuery,
  useCreateCartMutation,
  useAddCartItemMutation,
  getDefaultSession,
} from '../../core';
import { type Product, type ProductType } from '../../core';
import {
  Alert,
  AlertTitle,
  AlertDescription,
  Button,
  Skeleton,
  StateView,
  useDebounce,
} from '@zentric/ui';
import {
  Package,
  RefreshCw,
} from 'lucide-react';
import { RecentlyViewedCarousel } from './components/RecentlyViewedCarousel';
import { CatalogFilters, type CatalogSort, type CatalogTypeFilter } from './components/CatalogFilters';
import { CatalogHero } from './components/CatalogHero';
import { CatalogPagination } from './components/CatalogPagination';
import { CatalogTrustStrip } from './components/CatalogTrustStrip';
import { CategoryCircleRail } from './components/CategoryCircleRail';
import { ProductCard } from './components/ProductCard';
import { resolveProductAvailability } from './components/productPresentation';
import { addGuestCartItem } from './guestCart';
import { getProductImageUrl } from './productImages';

/** Cantidad de productos por pagina que pide la grilla al backend. */
const CATALOG_PAGE_SIZE = 12;
/** Centinela de "sin filtro de categoria" (el backend tambien trata `all` como ausente). */
const ALL_CATEGORIES = 'all';
/** Milisegundos que se espera antes de mandar la busqueda al servidor. */
const SEARCH_DEBOUNCE_MS = 300;

type CatalogSearch = {
  cat?: string;
  q?: string;
  page?: string | number;
};

function readPageParam(value: string | number | undefined): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function resolveScrollBehavior(): ScrollBehavior {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'smooth';
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

/**
 * Tienda del comprador (S1 + S2 + S3).
 */
export function BuyerCatalogPage() {
  const search = useSearch({ strict: false }) as CatalogSearch;
  const navigate = useNavigate();
  const session = getDefaultSession();
  const hasActiveSession = Boolean(session && session.getAccessToken() !== null);
  const { data: cartOrders } = useOrdersQuery('Cart', undefined, {
    enabled: hasActiveSession,
  });
  const createCartMutation = useCreateCartMutation();
  const addCartItemMutation = useAddCartItemMutation();

  const [page, setPage] = useState(() => readPageParam(search?.page));
  const [searchInput, setSearchInput] = useState(search?.q ?? '');
  const [typeFilter, setTypeFilter] = useState<CatalogTypeFilter>('Todos');
  const [selectedCategory, setSelectedCategory] = useState<string>(search?.cat ?? ALL_CATEGORIES);
  const [sort, setSort] = useState<CatalogSort>('relevance');

  const urlCategory = search?.cat;
  const urlQuery = search?.q;
  const urlPage = readPageParam(search?.page);
  const [seenUrl, setSeenUrl] = useState(() => ({
    cat: urlCategory,
    q: urlQuery,
    page: urlPage,
  }));

  if (seenUrl.cat !== urlCategory || seenUrl.q !== urlQuery || seenUrl.page !== urlPage) {
    setSeenUrl({ cat: urlCategory, q: urlQuery, page: urlPage });

    if (seenUrl.q !== urlQuery) {
      setSearchInput(urlQuery ?? '');
      setPage(1);
    }
    if (seenUrl.cat !== urlCategory) {
      setSelectedCategory(urlCategory ?? ALL_CATEGORIES);
      setPage(1);
    }
    if (seenUrl.page !== urlPage) {
      setPage(urlPage);
    }
  }

  const debouncedSearch = useDebounce(searchInput.trim(), SEARCH_DEBOUNCE_MS);

  const {
    data: categories,
    isLoading: isCategoriesLoading,
    isError: isCategoriesError,
    refetch: refetchCategories,
  } = useCategoriesQuery();

  const {
    data: pagedData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useProductsPagedQuery({
    page,
    size: CATALOG_PAGE_SIZE,
    category: selectedCategory !== ALL_CATEGORIES ? selectedCategory : undefined,
    search: debouncedSearch !== '' ? debouncedSearch : undefined,
    sort,
    type: typeFilter !== 'Todos' ? typeFilter : undefined as ProductType | undefined,
  });

  const pagedItems = pagedData?.items;
  const products: Product[] = useMemo(() => pagedItems ?? [], [pagedItems]);
  const totalItems = pagedData?.totalItems ?? 0;
  const totalPages = pagedData?.totalPages ?? 0;


  const popularProducts = useMemo(
    () =>
      products
        .filter((product) => resolveProductAvailability(product) !== 'out-of-stock')
        .slice(0, 8),
    [products],
  );

  const selectedCategoryName = useMemo(() => {
    if (selectedCategory === ALL_CATEGORIES) return null;
    return categories?.find((category) => category.id === selectedCategory)?.name ?? selectedCategory;
  }, [categories, selectedCategory]);

  const hasActiveFilters =
    searchInput.trim() !== '' || typeFilter !== 'Todos' || selectedCategory !== ALL_CATEGORIES;

  const scrollToProductGrid = useCallback(() => {
    const target = document.getElementById('catalogo') ?? document.getElementById('product-grid');
    if (target) {
      const topOffset = target.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({
        top: Math.max(0, topOffset),
        behavior: resolveScrollBehavior(),
      });
    }
  }, []);

  const buildSearchParams = useCallback(
    (overrides: { cat?: string | null; page?: number | null; q?: string | null }) => {
      const next: Record<string, unknown> = { ...(search ?? {}) };

      if (overrides.cat !== undefined) {
        if (overrides.cat === null) delete next.cat;
        else next.cat = overrides.cat;
      }
      if (overrides.page !== undefined) {
        if (overrides.page === null || overrides.page <= 1) delete next.page;
        else next.page = overrides.page;
      }
      if (overrides.q !== undefined) {
        if (overrides.q === null || overrides.q === '') delete next.q;
        else next.q = overrides.q;
      }

      return next;
    },
    [search],
  );

  const handleSelectCategory = useCallback(
    (categoryId: string) => {
      setSelectedCategory(categoryId);
      setPage(1);
      navigate({
        search: buildSearchParams({
          cat: categoryId === ALL_CATEGORIES ? null : categoryId,
          page: null,
        }) as never,
        resetScroll: false,
      });
      scrollToProductGrid();
    },
    [buildSearchParams, navigate, scrollToProductGrid],
  );

  const handlePageChange = useCallback(
    (nextPage: number) => {
      setPage(nextPage);
      navigate({
        search: buildSearchParams({ page: nextPage }) as never,
        resetScroll: false,
      });
      scrollToProductGrid();
    },
    [buildSearchParams, navigate, scrollToProductGrid],
  );

  const handleClearFilters = useCallback(() => {
    setSearchInput('');
    setTypeFilter('Todos');
    setSelectedCategory(ALL_CATEGORIES);
    setSort('relevance');
    setPage(1);
    navigate({
      search: buildSearchParams({ cat: null, page: null, q: null }) as never,
      resetScroll: false,
    });
    scrollToProductGrid();
  }, [buildSearchParams, navigate, scrollToProductGrid]);

  const handleAddToCart = useCallback(
    async (product: Product) => {
      const matchedVariant = product.variants?.find(
        (candidate) =>
          candidate.canBeSold &&
          (candidate.availableStock === undefined || candidate.availableStock > 0),
      );

      const variantId = matchedVariant?.id ?? product.variants?.[0]?.id ?? product.id;
      const sku = matchedVariant?.sku ?? product.variants?.[0]?.sku ?? product.id;
      const unitPrice = matchedVariant?.price ?? product.variants?.[0]?.price ?? product.price;

      if (!hasActiveSession) {
        addGuestCartItem({
          variantId,
          productId: product.id,
          productName: product.name,
          sku,
          unitPrice,
          currency: product.currency ?? 'COP',
          quantity: 1,
          imageUrl: getProductImageUrl(product),
        });
        return;
      }

      let activeCartId = cartOrders?.[0]?.id ?? null;
      if (!activeCartId) {
        activeCartId = await createCartMutation.mutateAsync();
      }

      await addCartItemMutation.mutateAsync({
        orderId: activeCartId,
        variantId,
        quantity: 1,
      });
    },
    [
      addCartItemMutation,
      cartOrders,
      createCartMutation,
      hasActiveSession,
    ],
  );

  return (
    <div className="space-y-3 sm:space-y-4 pt-0 pb-1 sm:pb-2">
      {/* ── 1. Bento Hero Showcase (Dual Bento 8 cols + 4 cols - Prototipo v2) ── */}
      <CatalogHero
        onExploreAll={scrollToProductGrid}
        onSelectCategory={handleSelectCategory}
      />

      {/* ── 2. Explorar por Categoría (Círculos de Producto con Stock Inmediato) ── */}
      <CategoryCircleRail
        categories={categories ?? []}
        selectedCategory={selectedCategory}
        onSelectCategory={handleSelectCategory}
        onViewAll={scrollToProductGrid}
        isLoading={isCategoriesLoading}
      />

      {/* ── 3. Sección completa del catálogo: filtros, grilla y paginación ── */}
      <section
        id="catalogo"
        aria-label="Catálogo de productos"
        className="space-y-4 border-t border-zinc-200 dark:border-zinc-800 pt-4 sm:pt-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
              Catálogo de Productos
            </h1>
            <p className="text-xs text-zinc-500 sm:text-sm">
              {isLoading && totalItems === 0
                ? 'Buscando productos publicados...'
                : `${totalItems} ${totalItems === 1 ? 'producto publicado' : 'productos publicados'}`}
              {selectedCategoryName ? ` en ${selectedCategoryName}` : ''}
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="shrink-0 gap-1.5 text-xs"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isFetching ? 'motion-safe:animate-spin' : ''}`}
              aria-hidden="true"
            />
            Actualizar
          </Button>
        </div>

        <CatalogFilters
          searchTerm={searchInput}
          onSearchTermChange={(value) => {
            setSearchInput(value);
            setPage(1);
          }}
          typeFilter={typeFilter}
          onTypeFilterChange={(value) => {
            setTypeFilter(value);
            setPage(1);
          }}
          sort={sort}
          onSortChange={(value) => {
            setSort(value);
            setPage(1);
          }}
          categoryId={selectedCategory}
          categories={categories}
          isCategoriesLoading={isCategoriesLoading}
          isCategoriesError={isCategoriesError}
          onRetryCategories={() => refetchCategories()}
          onSelectCategory={handleSelectCategory}
          allCategoriesId={ALL_CATEGORIES}
          selectedCategoryName={selectedCategoryName}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={handleClearFilters}
        />

        {isError ? (
          <Alert variant="destructive">
            <AlertTitle>Error al cargar el catálogo</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>{error instanceof Error ? error.message : 'No fue posible consultar los productos.'}</p>
              <Button size="sm" variant="outline" onClick={() => refetch()} className="text-xs">
                Refrescar
              </Button>
            </AlertDescription>
          </Alert>
        ) : isLoading ? (
          <div
            className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3.5 sm:gap-5 lg:gap-6"
            aria-busy="true"
          >
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="space-y-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-3 sm:p-4">
                <Skeleton className="aspect-square w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-6 w-1/3 pt-2" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          selectedCategory !== ALL_CATEGORIES ? (
            <div className="space-y-6">
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 p-6 sm:p-8 text-center space-y-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Package className="h-5 w-5" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
                  Inventario en preparación para {selectedCategoryName ?? 'esta categoría'}
                </h2>
                <p className="mx-auto max-w-xl text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Estamos abasteciendo nuevas referencias en esta categoría. Mientras tanto, te sugerimos estos artículos destacados de alta demanda con despacho garantizado:
                </p>
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    pill
                    onClick={handleClearFilters}
                    className="rounded-full px-5 text-xs font-semibold"
                  >
                    Ver todas las categorías
                  </Button>
                </div>
              </div>

              {/* Inyección Inmediata de Productos Sugeridos Populares */}
              {popularProducts.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                    Artículos sugeridos con disponibilidad inmediata:
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3.5 sm:gap-5 lg:gap-6">
                    {popularProducts.slice(0, 5).map((product) => (
                      <ProductCard key={`suggested-${product.id}`} product={product} onAddToCart={handleAddToCart} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <StateView
              state="empty"
              title="No se encontraron productos"
              description={
                hasActiveFilters
                  ? 'No hay productos que coincidan con los criterios de búsqueda seleccionados.'
                  : 'El catálogo no cuenta con productos publicados en este momento.'
              }
              action={
                hasActiveFilters
                  ? { label: 'Mostrar todo el catálogo', onClick: handleClearFilters }
                  : undefined
              }
            />
          )
        ) : (
          <div
            id="product-grid"
            className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3.5 sm:gap-5 lg:gap-6"
          >
            {products.map((product) => (
              <ProductCard key={product.id} product={product} onAddToCart={handleAddToCart} />
            ))}
          </div>
        )}

        {!isError && !isLoading && products.length > 0 && (
          <CatalogPagination
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
            onPageChange={handlePageChange}
          />
        )}
      </section>

      {/* ── 4. Franja de garantías institucionales de confianza (Prototipo v2) ── */}
      <CatalogTrustStrip />

      {/* Historial accesible preservado sin contaminar la UI comercial visual */}
      <div className="sr-only">
        <RecentlyViewedCarousel title="Vistos Recientemente por Ti" maxItems={10} />
      </div>
    </div>
  );
}
