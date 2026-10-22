import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import {
  useCategoriesQuery,
  useProductsPagedQuery,
} from '../../application/services/catalog';
import { type Product } from '../../domain';
import {
  Alert,
  AlertTitle,
  AlertDescription,
  Button,
  MoneyAmount,
  Skeleton,
  StateView,
  useDebounce,
} from '@zentric/ui';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  RefreshCw,
  ShieldCheck,
  RotateCcw,
  Truck,
} from 'lucide-react';
import { getProductImageUrl, getRecentlyViewedProducts } from './productImages';
import { CatalogFilters, type CatalogSort, type CatalogTypeFilter } from './components/CatalogFilters';
import { CatalogHero } from './components/CatalogHero';
import { CatalogPagination } from './components/CatalogPagination';
import { ProductCard } from './components/ProductCard';
import { ProductRailCard } from './components/ProductRailCard';

/** Cantidad de productos por pagina que pide la grilla al backend. */
const CATALOG_PAGE_SIZE = 12;
/** Centinela de "sin filtro de categoria" (el backend tambien trata `all` como ausente). */
const ALL_CATEGORIES = 'all';
/** Milisegundos que se espera antes de mandar la busqueda al servidor. */
const SEARCH_DEBOUNCE_MS = 300;
/** Ancho aproximado de una ficha del carrusel, en pixeles. */
const CAROUSEL_STEP_PX = 320;
/** Cadencia del avance automatico del carrusel, en milisegundos. */
const CAROUSEL_AUTOPLAY_MS = 5000;

type CatalogSearch = {
  cat?: string;
  q?: string;
  page?: string | number;
};

function readPageParam(value: string | number | undefined): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

/**
 * El movimiento del carrusel respeta `prefers-reduced-motion`; ademas jsdom no
 * implementa `matchMedia`, asi que la comprobacion es defensiva.
 */
function resolveScrollBehavior(): ScrollBehavior {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'smooth';
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

/**
 * Catalogo comercial del comprador (S1 + S2 + S3).
 *
 * Toda la seccion consume el backend: las categorias salen de
 * `GET api/catalog/categories`, el hero de `GET api/catalog/products/hero` y la
 * grilla de `GET api/catalog/products/paged` con `search`, `sort`, `type`,
 * `category` y `page` resueltos en el servidor. No hay filtrado local sobre la
 * pagina activa ni datos inventados.
 */
export function BuyerCatalogPage() {
  const search = useSearch({ strict: false }) as CatalogSearch;
  const navigate = useNavigate();

  const [page, setPage] = useState(() => readPageParam(search?.page));
  const [searchInput, setSearchInput] = useState(search?.q ?? '');
  const [typeFilter, setTypeFilter] = useState<CatalogTypeFilter>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>(search?.cat ?? ALL_CATEGORIES);
  const [sort, setSort] = useState<CatalogSort>('relevance');

  // El URL (?cat, ?q, ?page) es una fuente externa: cuando cambia por un
  // shortcut del header o por el boton atras del navegador, el estado local se
  // ajusta durante el render (patron de React: "adjusting state when props
  // change"), sin efectos que encadenen renders.
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

  // Solo viaja al servidor lo que el comprador ya termino de escribir.
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
    type: typeFilter !== 'All' ? typeFilter : undefined,
  });

  const products: Product[] = pagedData?.items ?? [];
  const totalItems = pagedData?.totalItems ?? 0;
  const totalPages = pagedData?.totalPages ?? 0;

  const recentlyViewed = useMemo(() => getRecentlyViewedProducts(), []);

  // El carrusel reutiliza la pagina activa; con menos de 3 productos seria ruido.
  const popularProducts = useMemo(
    () => (products.length > 2 ? products.slice(0, 6) : []),
    [products],
  );
  const hasPopularProducts = popularProducts.length > 0;

  const selectedCategoryName = useMemo(() => {
    if (selectedCategory === ALL_CATEGORIES) return null;
    return categories?.find((category) => category.id === selectedCategory)?.name ?? selectedCategory;
  }, [categories, selectedCategory]);

  const hasActiveFilters =
    searchInput.trim() !== '' || typeFilter !== 'All' || selectedCategory !== ALL_CATEGORIES;

  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const carouselRef = useRef<HTMLDivElement>(null);

  const scrollToProductGrid = useCallback(() => {
    document.getElementById('product-grid')?.scrollIntoView({
      behavior: resolveScrollBehavior(),
      block: 'start',
    });
  }, []);

  const scrollCarouselBy = useCallback(
    (delta: number) => {
      const scroller = carouselRef.current;
      if (scroller && typeof scroller.scrollBy === 'function') {
        scroller.scrollBy({ left: delta, behavior: resolveScrollBehavior() });
      }
    },
    [carouselRef],
  );

  const scrollCarouselTo = useCallback(
    (index: number) => {
      const scroller = carouselRef.current;
      if (scroller && typeof scroller.scrollTo === 'function') {
        scroller.scrollTo({ left: index * CAROUSEL_STEP_PX, behavior: resolveScrollBehavior() });
      }
    },
    [carouselRef],
  );

  const goToCarouselIndex = useCallback(
    (index: number) => {
      const lastIndex = Math.max(popularProducts.length - 1, 0);
      const nextIndex = Math.min(Math.max(index, 0), lastIndex);
      setCarouselIndex(nextIndex);
      scrollCarouselTo(nextIndex);
    },
    [popularProducts.length, scrollCarouselTo],
  );

  /**
   * Avance automatico del carrusel.
   *
   * Se detiene al pasar el puntero y al enfocar el carrusel (para que quien
   * navega con teclado pueda detenerlo), y no corre si el sistema pide menos
   * movimiento. El temporizador no se reinicia con cada cambio de indice.
   */
  useEffect(() => {
    if (!isAutoPlaying || !hasPopularProducts || resolveScrollBehavior() === 'auto') {
      return;
    }

    const interval = setInterval(() => {
      setCarouselIndex((current) => {
        const nextIndex = current >= popularProducts.length - 1 ? 0 : current + 1;
        scrollCarouselTo(nextIndex);
        return nextIndex;
      });
    }, CAROUSEL_AUTOPLAY_MS);

    return () => clearInterval(interval);
  }, [hasPopularProducts, isAutoPlaying, popularProducts.length, scrollCarouselTo]);

  /**
   * Navegacion por teclado del carrusel.
   *
   * El manejador vive en el propio carrusel (y el carrusel es enfocable) en
   * lugar de `document`: asi las flechas siguen moviendo el cursor de texto en
   * los campos de busqueda de la pagina.
   */
  const handleCarouselKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return;
    }
    event.preventDefault();
    goToCarouselIndex(carouselIndex + (event.key === 'ArrowLeft' ? -1 : 1));
  };

  const handleCarouselScrollStep = (direction: 'left' | 'right') => {
    const delta = direction === 'left' ? -CAROUSEL_STEP_PX : CAROUSEL_STEP_PX;
    const nextIndex = carouselIndex + (direction === 'left' ? -1 : 1);
    setCarouselIndex(Math.min(Math.max(nextIndex, 0), Math.max(popularProducts.length - 1, 0)));
    scrollCarouselBy(delta);
  };

  /**
   * Refleja en el URL los filtros navegables (`?cat`, `?page`): la vista se
   * puede compartir y el boton atras del navegador devuelve al estado previo.
   */
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
      });
      scrollToProductGrid();
    },
    [buildSearchParams, navigate, scrollToProductGrid],
  );

  const handlePageChange = useCallback(
    (nextPage: number) => {
      setPage(nextPage);
      navigate({ search: buildSearchParams({ page: nextPage }) as never });
      scrollToProductGrid();
    },
    [buildSearchParams, navigate, scrollToProductGrid],
  );

  const handleClearFilters = useCallback(() => {
    setSearchInput('');
    setTypeFilter('All');
    setSelectedCategory(ALL_CATEGORIES);
    setSort('relevance');
    setPage(1);
    navigate({ search: buildSearchParams({ cat: null, page: null, q: null }) as never });
  }, [buildSearchParams, navigate]);

  return (
    <div className="space-y-10 py-2 sm:py-4">
      {/* ── 1. Primera impresion: mosaico de productos reales (S2) ── */}
      <CatalogHero onExploreAll={scrollToProductGrid} />

      {/* ── 2. Barra de Confianza y Garantías de Marketplace (SIN duplicados con Hero) ── */}
      <section
        aria-label="Garantías del comprador"
        className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4"
      >
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-foreground">Reserva de 15 Minutos</h3>
            <p className="text-[11px] text-foreground-muted">Stock asegurado en checkout</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-foreground">Envíos Asegurados</h3>
            <p className="text-[11px] text-foreground-muted">Despacho directo y rastreable</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-foreground">Garantía Oficial</h3>
            <p className="text-[11px] text-foreground-muted">Soporte directo y original</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
            <RotateCcw className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-foreground">Devolución Segura</h3>
            <p className="text-[11px] text-foreground-muted">Reembolso ágil y transparente</p>
          </div>
        </div>
      </section>

      {/* ── 3. Carrusel: Productos Populares & Tendencias (Visible con >2 productos) ── */}
      {hasPopularProducts && (
        <section aria-label="Productos populares" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-warning" aria-hidden="true" />
              <h2 className="text-lg font-bold text-foreground sm:text-xl">
                Productos Populares & Más Vendidos
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => handleCarouselScrollStep('left')}
                className="rounded-full"
                aria-label="Desplazar a la izquierda"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => handleCarouselScrollStep('right')}
                className="rounded-full"
                aria-label="Desplazar a la derecha"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div
            ref={carouselRef}
            role="group"
            aria-label="Productos populares del catálogo"
            tabIndex={0}
            onKeyDown={handleCarouselKeyDown}
            onMouseEnter={() => setIsAutoPlaying(false)}
            onMouseLeave={() => setIsAutoPlaying(true)}
            onFocus={() => setIsAutoPlaying(false)}
            onBlur={() => setIsAutoPlaying(true)}
            className="flex gap-4 overflow-x-auto pb-4 scrollbar-none scroll-smooth focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:outline-none"
          >
            {popularProducts.map((product) => (
              <ProductRailCard key={`popular-${product.id}`} product={product} />
            ))}
          </div>

          <div
            className="mt-4 flex items-center justify-center gap-1.5"
            role="tablist"
            aria-label="Navegación del carrusel"
          >
            {popularProducts.map((product, index) => (
              <button
                key={`popular-dot-${product.id}`}
                type="button"
                role="tab"
                aria-selected={index === carouselIndex}
                aria-label={`Ir a producto ${index + 1}`}
                onClick={() => goToCarouselIndex(index)}
                className={`h-2 rounded-full transition-[width,background-color] duration-200 ${
                  index === carouselIndex
                    ? 'w-6 bg-brand'
                    : 'w-2 bg-foreground-muted/40 hover:bg-foreground-muted/60'
                }`}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── 4. Carrusel: Vistos Recientemente (si existen) ── */}
      {recentlyViewed.length > 0 && (
        <section aria-label="Vistos recientemente" className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-brand" aria-hidden="true" />
            <h2 className="text-lg font-bold text-foreground sm:text-xl">Vistos Recientemente por Ti</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
            {recentlyViewed.map((product) => (
              <Link
                key={`recent-${product.id}`}
                to="/buyer/catalog/$productId"
                params={{ productId: product.id }}
                className="group flex w-60 shrink-0 items-center gap-3 rounded-xl border border-border bg-surface p-3 transition-colors hover:border-brand/40"
              >
                <img
                  src={getProductImageUrl(product)}
                  alt={product.name}
                  className="h-14 w-14 shrink-0 rounded-lg bg-surface-muted object-cover"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-xs font-semibold text-foreground group-hover:text-brand">
                    {product.name}
                  </h4>
                  <div className="text-xs font-bold text-foreground">
                    <MoneyAmount amount={product.price} currency={product.currency ?? 'COP'} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── 5. Sección completa del catálogo: filtros, grilla y paginación ── */}
      <section
        id="catalogo"
        aria-label="Catálogo de productos"
        className="space-y-6 border-t border-border pt-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <p className="font-mono text-[11px] font-medium tracking-[0.16em] text-foreground-subtle uppercase">
              Todos los productos
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Catálogo de Productos
            </h1>
            <p className="text-xs text-foreground-muted sm:text-sm">
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
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            aria-busy="true"
          >
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="space-y-3 rounded-2xl border border-border bg-surface p-4">
                <Skeleton className="aspect-[16/10] w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-6 w-1/3 pt-2" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
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
        ) : (
          <div
            id="product-grid"
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
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
    </div>
  );
}
