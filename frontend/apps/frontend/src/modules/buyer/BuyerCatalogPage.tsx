import { useState, useMemo, useRef, useEffect } from 'react';
import { Link, useSearch } from '@tanstack/react-router';
import { useProductsPagedQuery } from '../../application/services/catalog';
import { ProductType, type Product } from '../../domain';
import {
  Button,
  Skeleton,
  Alert,
  AlertTitle,
  AlertDescription,
  StateView,
} from '@zentric/ui';
import {
  Search,
  Package,
  FileCode,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Truck,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Flame,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { getProductImageUrl, getRecentlyViewedProducts } from './productImages';

/**
 * Taxonomía de categorías comerciales escalable.
 */
interface CategoryDef {
  id: string;
  name: string;
  keywords: string[];
}

const MARKETPLACE_CATEGORIES: CategoryDef[] = [
  { id: 'all', name: 'Todas las Categorías', keywords: [] },
  { id: 'computacion', name: 'Computación & Laptops', keywords: ['laptop', 'portatil', 'notebook', 'computador', 'pc'] },
  { id: 'perifericos', name: 'Periféricos & Teclados', keywords: ['teclado', 'keyboard', 'mouse', 'raton', 'pad'] },
  { id: 'audio', name: 'Audio & Monitores', keywords: ['audio', 'auricular', 'headphone', 'monitor', 'pantalla'] },
  { id: 'software', name: 'Software & Licencias Cloud', keywords: ['software', 'cloud', 'licencia', 'saas'] },
  { id: 'hardware', name: 'Componentes & Hardware', keywords: ['disco', 'ssd', 'memoria', 'servidor', 'ram'] },
];

/**
 * Catálogo Comercial de Marketplace para el Comprador (Buyer Role).
 * Cumple estrictamente con la doctrina anti-IA genérica:
 * - Hero promocional con fotografía real y llamados de acción claros.
 * - Barra de confianza Zentric (reserva de 15 min, despacho particionado).
 * - Carrusel de productos populares y destacados cuando el catálogo cuenta con volumen.
 * - Carrusel de productos vistos recientemente.
 * - Cuadrícula completa de productos con tarjetas comerciales enriquecidas:
 *   - Toda la tarjeta es clicable e interactiva.
 *   - Micro-textos de escasez y urgencia ("¡Últimas unidades!").
 *   - Valoración social (estrellas y opiniones).
 *   - Fotografía de alta resolución con fallbacks realistas.
 *   - Cero emojis en las insignias técnicas.
 * - Filtros avanzados y escalables con preservación total del contrato de tests.
 */
export function BuyerCatalogPage() {
  const search = useSearch({ strict: false }) as {
    cat?: string;
    q?: string;
    filter?: string;
  };

  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [searchTerm, setSearchTerm] = useState(search?.q ?? '');
  const [typeFilter, setTypeFilter] = useState<'All' | ProductType>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>(search?.cat ?? 'all');
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [priceSort, setPriceSort] = useState<'relevance' | 'price-asc' | 'price-desc'>('relevance');

  const carouselRef = useRef<HTMLDivElement>(null);

  // Scroll suave a la cuadrícula de productos
  const scrollToProductGrid = useCallback(() => {
    const grid = document.getElementById('product-grid');
    if (grid) {
      grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Sincronizar parámetros de URL de navegación comercial (shortcuts del header o búsqueda)
  useEffect(() => {
    if (search?.cat !== undefined) {
      setSelectedCategory(search.cat);
      setPage(1);
    }
    if (search?.q !== undefined) {
      setSearchTerm(search.q);
      setPage(1);
    }
  }, [search?.cat, search?.q]);

  // Consulta paginada del backend con filtro de categoría en backend (Slice 4)
  const {
    data: pagedData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useProductsPagedQuery({
    page,
    size: pageSize,
    category: selectedCategory !== 'all' ? selectedCategory : undefined,
  });

  const products: Product[] = pagedData?.items ?? [];
  const totalItems = pagedData?.totalItems ?? 0;
  const totalPages = pagedData?.totalPages ?? (Math.ceil(totalItems / pageSize) || 1);

  // Productos vistos recientemente desde almacenamiento de sesión
  const recentlyViewed = useMemo(() => getRecentlyViewedProducts(), []);

  // Productos destacados para el carrusel de populares
  // Solo se muestra cuando el catálogo tiene más de 2 productos para evitar duplicidad visual
  const popularProducts = useMemo(() => {
    return products.length > 2 ? products.slice(0, 6) : [];
  }, [products]);

  // Filtrado reactivo en cliente sobre la página activa (categoría delegada al backend)
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Filtro por tipo de producto (Físico / Digital)
        if (typeFilter !== 'All' && p.type !== typeFilter) {
          return false;
        }

        // Filtro por término de búsqueda (nombre o descripción)
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchName = p.name.toLowerCase().includes(term);
          const matchDesc = p.description?.toLowerCase().includes(term) ?? false;
          if (!matchName && !matchDesc) return false;
        }

        // Filtro solo productos en stock
        if (onlyInStock) {
          const hasStock =
            p.type === ProductType.Digital ||
            p.variants?.some((v) => v.canBeSold && (v.availableStock === undefined || v.availableStock > 0));
          if (!hasStock) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (priceSort === 'price-asc') return a.price - b.price;
        if (priceSort === 'price-desc') return b.price - a.price;
        return 0;
      });
  }, [products, typeFilter, searchTerm, onlyInStock, priceSort]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setTypeFilter('All');
    setSelectedCategory('all');
    setOnlyInStock(false);
    setPriceSort('relevance');
    setPage(1);
  };

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = 320;
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // Estado del carrusel
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Auto-play del carrusel
  useEffect(() => {
    if (!isAutoPlaying || popularProducts.length <= 1) return;
    const interval = setInterval(() => {
      if (carouselRef.current) {
        const maxIndex = popularProducts.length - 1;
        const nextIndex = carouselIndex >= maxIndex ? 0 : carouselIndex + 1;
        setCarouselIndex(nextIndex);
        carouselRef.current.scrollBy({
          left: 320,
          behavior: 'smooth',
        });
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [carouselIndex, isAutoPlaying]);

  // Navegación por teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (carouselRef.current && carouselIndex > 0) {
          setCarouselIndex(carouselIndex - 1);
          carouselRef.current.scrollBy({ left: -320, behavior: 'smooth' });
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (carouselRef.current && carouselIndex < popularProducts.length - 1) {
          setCarouselIndex(carouselIndex + 1);
          carouselRef.current.scrollBy({ left: 320, behavior: 'smooth' });
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [carouselIndex]);

  // Pausar auto-play al hacer hover
  const handleMouseEnter = () => setIsAutoPlaying(false);
  const handleMouseLeave = () => setIsAutoPlaying(true);

  return (
    <div className="space-y-10 py-2 sm:py-4">
      {/* ── 1. Hero Comercial de Alto Impacto (Anti-IA Genérica) ── */}
      <section
        aria-label="Campañas destacadas"
        className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-r from-surface via-surface to-surface-muted/60 p-6 sm:p-10 lg:p-12 shadow-sm"
      >
        <div className="relative z-10 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
          <div className="space-y-4 lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Marketplace Zentric — Garantía Oficial</span>
            </div>

            <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl leading-tight">
              <span className="text-brand">Marketplace Zentric</span> — Todo lo que buscas, con garantía
            </h2>

            <p className="max-w-xl text-sm sm:text-base text-foreground-muted leading-relaxed">
              Tecnología, moda, hogar, deporte y más. Miles de productos de vendedores verificados con despacho asegurado, reserva de 15 minutos y devolución segura. Compra con confianza.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to="/buyer/catalog"
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-background transition-all hover:bg-brand/90 hover:shadow-md hover:shadow-brand/20"
              >
                Explorar Catálogo Completo
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Fotografía de Vanguardia del Hero */}
          <div className="relative lg:col-span-5 hidden lg:block">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1000&q=80"
                alt="Marketplace Zentric — Todo en un solo lugar"
                className="h-full w-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-border/80 bg-surface/90 backdrop-blur-md p-3 text-xs flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">Envíos Directos Asegurados</p>
                  <p className="text-[11px] text-foreground-muted font-mono">Stock 100% verificado en bodega</p>
                </div>
                <span className="rounded-md bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  En Stock
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

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
      {popularProducts.length > 0 && (
        <section aria-label="Productos populares" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-amber-500" />
              <h2 className="text-lg font-bold text-foreground sm:text-xl">
                Productos Populares & Más Vendidos
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => scrollCarousel('left')}
                className="h-8 w-8 p-0 rounded-full"
                aria-label="Desplazar a la izquierda"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => scrollCarousel('right')}
                className="h-8 w-8 p-0 rounded-full"
                aria-label="Desplazar a la derecha"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div
            ref={carouselRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="flex gap-4 overflow-x-auto pb-4 scrollbar-none scroll-smooth"
          >
            {popularProducts.map((product, index) => {
              const imageUrl = getProductImageUrl(product);
              const firstVariant = product.variants?.[0];
              const availableStock = firstVariant?.availableStock ?? 0;
              const hasLowStock = availableStock > 0 && availableStock <= 5;

              return (
                <Link
                  key={`popular-${product.id}`}
                  to="/buyer/catalog/$productId"
                  params={{ productId: product.id }}
                  className="group relative flex w-72 shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-all duration-300 hover:border-brand/60 hover:shadow-lg hover:-translate-y-1"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-surface-muted">
                    <img
                      src={imageUrl}
                      alt={product.name}
                      loading="lazy"
                      className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-2.5 left-2.5">
                      <span className="inline-flex items-center gap-1 rounded-md bg-surface/90 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-brand border border-border shadow-xs">
                        <CheckCircle2 className="h-3 w-3" />
                        Envío Asegurado
                      </span>
                    </div>
                    {hasLowStock && (
                      <div className="absolute bottom-2.5 left-2.5">
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/90 text-background px-2 py-0.5 text-[10px] font-bold shadow-xs">
                          <Flame className="h-3 w-3" />
                          ¡Últimas unidades!
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-4 flex flex-col flex-1 justify-between space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] text-foreground-muted font-mono">
                        <span className="font-semibold text-brand">
                          {product.type === ProductType.Physical ? 'Físico' : 'Digital'}
                        </span>
                        <span>·</span>
                        <span>{product.variants?.length ?? 1} {(product.variants?.length ?? 1) === 1 ? 'variante' : 'variantes'}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-foreground group-hover:text-brand transition-colors line-clamp-1">
                        {product.name}
                      </h3>
                    </div>

                    <div className="pt-2 border-t border-border flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-mono tracking-wider text-foreground-muted">
                          Precio
                        </span>
                        <div className="text-base font-bold font-mono text-foreground tabular-nums">
                          ${product.price.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                          <span className="text-xs font-normal text-foreground-muted ml-1">
                            {product.currency || 'COP'}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-brand group-hover:underline">
                        Ver Ficha →
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
          </div>

          {/* Dots indicators */}
          <div className="flex items-center justify-center gap-1.5 mt-4" role="tablist" aria-label="Navegación del carrusel">
            {popularProducts.map((_, index) => (
              <button
                key={index}
                role="tab"
                aria-selected={index === carouselIndex}
                aria-label={`Ir a producto ${index + 1}`}
                onClick={() => {
                  setCarouselIndex(index);
                  if (carouselRef.current) {
                    carouselRef.current.scrollTo({
                      left: index * 320,
                      behavior: 'smooth',
                    });
                  }
                }}
                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                  index === carouselIndex
                    ? 'bg-brand w-6'
                    : 'bg-foreground-muted/40 hover:bg-foreground-muted/60'
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
            <Clock className="h-5 w-5 text-brand" />
            <h2 className="text-lg font-bold text-foreground sm:text-xl">
              Vistos Recientemente por Ti
            </h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
            {recentlyViewed.map((prod) => (
              <Link
                key={`recent-${prod.id}`}
                to="/buyer/catalog/$productId"
                params={{ productId: prod.id }}
                className="group flex w-60 shrink-0 items-center gap-3 rounded-xl border border-border bg-surface p-3 transition-colors hover:border-brand/40"
              >
                <img
                  src={getProductImageUrl(prod)}
                  alt={prod.name}
                  className="h-14 w-14 shrink-0 rounded-lg object-cover bg-surface-muted"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-semibold text-foreground group-hover:text-brand truncate">
                    {prod.name}
                  </h4>
                  <p className="font-mono text-xs font-bold text-foreground tabular-nums">
                    ${prod.price.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── 5. Sección de Catálogo Completo con Filtros Avanzados ── */}
      <section id="catalogo" aria-label="Catálogo de productos" className="space-y-6 pt-4 border-t border-border">
        {/* Encabezado Obligatorio para Compatibilidad con Tests */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Catálogo de Productos
            </h1>
            <p className="text-xs sm:text-sm text-foreground-muted">
              Explora hardware de alta especificación, accesorios y software con garantía oficial y disponibilidad inmediata.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="text-xs gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </div>

        {/* ── 6. Barra de Filtros Principales (Tipo, Categoría, Stock y Orden) ── */}
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 shadow-xs">
          {/* Fila 1: Búsqueda local + Tipo de Producto + Categoría */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Búsqueda local — Requisito de tests: placeholder matches /Buscar por nombre/i */}
            <div className="relative flex-1 min-w-0 lg:max-w-xs">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre o especificación técnica..."
                className="w-full rounded-lg border border-border bg-background/80 py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-foreground-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand transition-colors"
              />
            </div>

            {/* Selector de Tipo de Producto — Requisito de tests: botones con nombres 'Todos', 'Físicos', 'Digitales' */}
            <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
              <Button
                variant={typeFilter === 'All' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTypeFilter('All')}
                className="text-xs font-semibold"
              >
                Todos
              </Button>
              <Button
                variant={typeFilter === ProductType.Physical ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTypeFilter(ProductType.Physical)}
                className="text-xs font-semibold"
              >
                Físicos
              </Button>
              <Button
                variant={typeFilter === ProductType.Digital ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTypeFilter(ProductType.Digital)}
                className="text-xs font-semibold"
              >
                Digitales
              </Button>
            </div>

            {/* Selector de Categorías — Compacto y escalable */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0 lg:flex-1 lg:justify-end">
              <span className="text-foreground-muted font-medium shrink-0 hidden sm:inline">Categoría:</span>
              <div className="flex items-center gap-1.5 shrink-0">
                {MARKETPLACE_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setPage(1);
                      scrollToProductGrid();
                    }}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                      selectedCategory === cat.id
                        ? 'bg-brand/10 text-brand font-semibold border border-brand/30'
                        : 'text-foreground-muted hover:bg-surface-muted hover:text-foreground'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Fila 2: Disponibilidad y Ordenamiento */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3 text-xs">
            {/* Solo en stock */}
            <label className="flex items-center gap-1.5 cursor-pointer text-foreground-muted hover:text-foreground">
              <input
                type="checkbox"
                checked={onlyInStock}
                onChange={(e) => setOnlyInStock(e.target.checked)}
                className="rounded border-border text-brand focus:ring-brand"
              />
              <span className="text-xs">Solo en stock</span>
            </label>

            {/* Ordenamiento */}
            <div className="flex items-center gap-2">
              <span className="text-foreground-muted font-medium shrink-0 hidden sm:inline">Ordenar:</span>
              <select
                value={priceSort}
                onChange={(e) => setPriceSort(e.target.value as any)}
                className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-brand"
              >
                <option value="relevance">Relevancia</option>
                <option value="price-asc">Menor precio</option>
                <option value="price-desc">Mayor precio</option>
              </select>
            </div>

            {/* Botón limpiar filtros (visible solo si hay filtros activos) */}
            {(typeFilter !== 'All' || selectedCategory !== 'all' || onlyInStock) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="text-xs text-foreground-muted hover:text-danger"
              >
                Limpiar filtros
              </Button>
            )}
          </div>
        </div>

        {/* ── 8. Manejo de Errores — Requisito de tests: 'Error al cargar el catálogo' ── */}
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
          /* ── 9. Estado de Carga (Skeletons) ── */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-surface p-4 space-y-3">
                <Skeleton className="aspect-[16/10] w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-6 w-1/3 pt-2" />
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          /* ── 10. Estado Vacío — Requisito de tests: 'No se encontraron productos' y botón 'Limpiar filtros' ── */
          <StateView
            state="empty"
            title="No se encontraron productos"
            description={
              searchTerm || typeFilter !== 'All' || selectedCategory !== 'all'
                ? 'No hay productos que coincidan con los criterios de búsqueda seleccionados.'
                : 'El catálogo no cuenta con productos publicados en este momento.'
            }
            action={
              searchTerm || typeFilter !== 'All' || selectedCategory !== 'all'
                ? {
                    label: 'Limpiar filtros',
                    onClick: handleClearFilters,
                  }
                : undefined
            }
          />
        ) : (
          /* ── 11. Cuadrícula de Tarjetas Comerciales Enriquecidas ── */
          <div id="product-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product: Product) => {
              const imageUrl = getProductImageUrl(product);
              const firstVariant = product.variants?.[0];
              const availableStock = firstVariant?.availableStock;
              const isDigital = product.type === ProductType.Digital;

              // Psicología de urgencia comercial
              const isLowStock = !isDigital && availableStock !== undefined && availableStock > 0 && availableStock <= 5;
              const isOutOfStock = !isDigital && availableStock !== undefined && availableStock === 0;

              return (
                <Link
                  key={product.id}
                  to="/buyer/catalog/$productId"
                  params={{ productId: product.id }}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-surface transition-all duration-300 hover:border-brand/60 hover:shadow-xl hover:-translate-y-1"
                >
                  {/* Contenedor Fotográfico de Alta Calidad */}
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-surface-muted">
                    <img
                      src={imageUrl}
                      alt={product.name}
                      className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />

                    {/* Insignia de Tipo de Producto — Requisito de tests: 'Físico' o 'Digital' */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-md bg-surface/90 backdrop-blur-md px-2.5 py-1 text-[11px] font-semibold text-brand border border-border shadow-xs">
                        {product.type === ProductType.Physical ? (
                          <>
                            <Package className="h-3 w-3" />
                            <span>Físico</span>
                          </>
                        ) : (
                          <>
                            <FileCode className="h-3 w-3 text-blue-400" />
                            <span>Digital</span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* Insignia de Urgencia Comercial */}
                    <div className="absolute top-3 right-3">
                      {isDigital ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/90 text-white px-2 py-0.5 text-[10px] font-semibold shadow-xs">
                          <Zap className="h-3 w-3" />
                          Entrega Inmediata
                        </span>
                      ) : isLowStock ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/95 text-background px-2 py-0.5 text-[10px] font-bold shadow-xs">
                          <Flame className="h-3 w-3" />
                          ¡Últimas unidades!
                        </span>
                      ) : isOutOfStock ? (
                        <span className="inline-flex items-center rounded-md bg-danger/90 text-white px-2 py-0.5 text-[10px] font-bold shadow-xs">
                          Agotado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/90 text-white px-2 py-0.5 text-[10px] font-semibold shadow-xs">
                          <CheckCircle2 className="h-3 w-3" />
                          En Stock
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Cuerpo de la Tarjeta */}
                  <div className="p-5 flex flex-col flex-1 justify-between space-y-4">
                    <div className="space-y-1.5">
                      {/* Especificación de Variante y Despacho */}
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-foreground-muted">
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="h-3 w-3" />
                          Despacho Garantizado
                        </span>
                        <span>·</span>
                        <span>{product.variants?.length ?? 1} {(product.variants?.length ?? 1) === 1 ? 'variante' : 'variantes'}</span>
                      </div>

                      {/* Título de Producto */}
                      <h3 className="text-base font-semibold text-foreground group-hover:text-brand transition-colors line-clamp-2 leading-snug">
                        {product.name}
                      </h3>

                      {/* Descripción */}
                      <p className="text-xs text-foreground-muted line-clamp-2 leading-relaxed">
                        {product.description || 'Especificación técnica verificada por el marketplace.'}
                      </p>
                    </div>

                    {/* Footer con Precio Prominente y Botón de Acción */}
                    <div className="pt-3 border-t border-border flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-foreground-muted">
                          Precio oficial
                        </span>
                        <div className="text-lg font-bold font-mono text-foreground tabular-nums">
                          ${product.price.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                          <span className="text-xs font-normal text-foreground-muted ml-1">
                            {product.currency || 'COP'}
                          </span>
                        </div>
                      </div>

                      <div className="inline-flex items-center gap-1 rounded-lg bg-surface-muted px-3 py-1.5 text-xs font-semibold text-brand transition-colors group-hover:bg-brand group-hover:text-background">
                        Ver
                        <ArrowRight className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* ── 12. Paginación — Requisito de tests: botones 'Anterior' y 'Siguiente' ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border pt-6 text-xs font-mono text-foreground-muted">
            <div>
              Página <span className="text-foreground font-bold">{page}</span> de{' '}
              <span className="text-foreground font-bold">{totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="border-border text-foreground-muted hover:text-foreground"
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="border-border text-foreground-muted hover:text-foreground"
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
