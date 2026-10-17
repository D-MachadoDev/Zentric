import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useProductsPagedQuery } from '../../application/services/catalog';
import { ProductType, type Product } from '../../domain';
import {
  Button,
  Input,
  Badge,
  Skeleton,
  Alert,
  AlertTitle,
  AlertDescription,
  StateView,
} from '@zentric/ui';
import {
  Search,
  ShoppingBag,
  Filter,
  ArrowRight,
  Package,
  RefreshCw,
  Clock,
  Truck,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

/**
 * Catálogo Público y Exploración de Productos para el Comprador (Frontend-Role-Modules §2.4).
 * Rediseñado con la doctrina de Modern High-End Commerce y Dual Theme (Decisión A3 y A4 en /grill-me).
 * Proporciona Hero Banner de propuestas de valor, filtros por categoría y tipo, y tarjetas comerciales ricas.
 */
export function BuyerCatalogPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | ProductType>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('Todos');

  const {
    data: pagedData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useProductsPagedQuery({
    page: page - 1,
    size: pageSize,
  });

  const products = pagedData?.items ?? [];
  const totalItems = pagedData?.totalItems ?? 0;
  const totalPages = pagedData?.totalPages ?? (Math.ceil(totalItems / pageSize) || 1);

  // Filtrado local por término de búsqueda, categoría y tipo de producto
  const filteredProducts = products.filter((product: Product) => {
    const matchesSearch =
      !searchTerm.trim() ||
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'All' || product.type === typeFilter;

    const matchesCategory =
      categoryFilter === 'Todos' ||
      (categoryFilter === 'Hardware' && (product.name.toLowerCase().includes('teclado') || product.name.toLowerCase().includes('mouse') || product.name.toLowerCase().includes('hardware'))) ||
      (categoryFilter === 'Monitores' && (product.name.toLowerCase().includes('monitor') || product.name.toLowerCase().includes('display'))) ||
      (categoryFilter === 'Ergonomía' && (product.name.toLowerCase().includes('ergon') || product.name.toLowerCase().includes('silla'))) ||
      (categoryFilter === 'Cloud' && (product.type === ProductType.Digital || product.name.toLowerCase().includes('licencia') || product.name.toLowerCase().includes('software')));

    return matchesSearch && matchesType && matchesCategory;
  });

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full transition-colors duration-200">
      {/* ── 1. Hero Banner: Flagship Commerce & Value Propositions ── */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-surface via-surface to-surface-muted/60 p-6 sm:p-10 lg:p-12 shadow-sm">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
            <Sparkles className="h-3.5 w-3.5" />
            <span>ZENTRIC MARKETPLACE · PLATAFORMA INTEGRAL DE COMERCIO</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground font-sans leading-tight">
            Catálogo de Productos
          </h1>

          <p className="text-base sm:text-lg text-foreground-muted leading-relaxed max-w-2xl">
            Equipamiento tecnológico profesional, hardware certificado y licencias digitales con existencias reales garantizadas en bodega y reserva atómica de 15 minutos.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link to="/buyer/cart">
              <Button size="lg" className="bg-brand hover:bg-brand-strong text-white font-semibold shadow-md shadow-brand/20">
                <ShoppingBag className="h-5 w-5 mr-2" />
                Ver Carrito
              </Button>
            </Link>

            <Button
              variant="outline"
              size="lg"
              onClick={() => refetch()}
              disabled={isFetching}
              className="border-border text-foreground-muted hover:text-foreground bg-surface/80"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Refrescar
            </Button>
          </div>
        </div>

        {/* ── Tarjetas de Propuestas de Valor (3 Pilares) ── */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-border">
          <div className="flex items-start gap-3 rounded-xl bg-surface/60 p-3.5 border border-border-subtle backdrop-blur-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Clock className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider font-mono">Reserva Atómica 15 min</h4>
              <p className="text-xs text-foreground-muted leading-snug">Bloqueo exclusivo de unidades en bodega al iniciar checkout. Cero sobreventa.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-surface/60 p-3.5 border border-border-subtle backdrop-blur-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-info/10 text-info">
              <Truck className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider font-mono">Red Multi-Bodega</h4>
              <p className="text-xs text-foreground-muted leading-snug">Despachos coordinados desde bodegas Zentric y bodegas directas de vendedor.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-surface/60 p-3.5 border border-border-subtle backdrop-blur-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider font-mono">Inspección de Calidad</h4>
              <p className="text-xs text-foreground-muted leading-snug">Cada producto físico es auditado. Facturación split transparente del 5% y 95%.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Píldoras de Categorías y Filtros Rápidos ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {['Todos', 'Hardware', 'Monitores', 'Ergonomía', 'Cloud'].map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => {
              setCategoryFilter(cat);
              setPage(1);
            }}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
              categoryFilter === cat
                ? 'bg-brand text-white shadow-sm font-semibold'
                : 'bg-surface border border-border text-foreground-muted hover:text-foreground hover:bg-surface-muted'
            }`}
          >
            {cat === 'Todos' ? 'Todos los productos' : cat}
          </button>
        ))}
      </div>

      {/* ── 3. Barra de Búsqueda y Segmentación por Tipo ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl border border-border bg-surface shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
          <Input
            type="search"
            placeholder="Buscar por nombre, descripción..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="pl-10 bg-surface-muted/60 border-border focus:border-brand text-foreground placeholder:text-foreground-muted/70 h-10 rounded-xl"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
            <Filter className="h-3.5 w-3.5 hidden sm:block" />
            <span className="hidden sm:inline font-mono">Tipo:</span>
          </div>

          <div className="inline-flex rounded-xl border border-border bg-surface-muted/60 p-1 text-xs font-mono">
            <button
              type="button"
              onClick={() => {
                setTypeFilter('All');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                typeFilter === 'All'
                  ? 'bg-brand text-white font-semibold shadow-sm'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => {
                setTypeFilter(ProductType.Physical);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                typeFilter === ProductType.Physical
                  ? 'bg-brand text-white font-semibold shadow-sm'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              Físicos
            </button>
            <button
              type="button"
              onClick={() => {
                setTypeFilter(ProductType.Digital);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                typeFilter === ProductType.Digital
                  ? 'bg-brand text-white font-semibold shadow-sm'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              Digitales
            </button>
          </div>

          <Badge variant="outline" className="border-border text-brand font-mono text-xs hidden md:inline-flex">
            {totalItems} disponibles
          </Badge>
        </div>
      </div>

      {/* ── 4. Manejo de los 4 Estados Canónicos ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-surface p-5 space-y-4 shadow-sm">
              <Skeleton className="h-48 w-full rounded-xl bg-surface-muted" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-3/4 bg-surface-muted" />
                <Skeleton className="h-4 w-1/2 bg-surface-muted" />
              </div>
              <div className="flex justify-between items-center pt-2">
                <Skeleton className="h-6 w-20 bg-surface-muted" />
                <Skeleton className="h-9 w-24 bg-surface-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <Alert variant="destructive" className="border-danger/30 bg-danger/10 text-danger">
          <AlertTitle>Error al cargar el catálogo</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'No fue posible consultar los productos.'}
          </AlertDescription>
        </Alert>
      ) : filteredProducts.length === 0 ? (
        <StateView
          state="empty"
          title="No se encontraron productos"
          description={
            searchTerm || typeFilter !== 'All' || categoryFilter !== 'Todos'
              ? 'No hay productos que coincidan con los criterios de búsqueda seleccionados.'
              : 'El catálogo no cuenta con productos publicados en este momento.'
          }
          action={
            searchTerm || typeFilter !== 'All' || categoryFilter !== 'Todos'
              ? {
                  label: 'Limpiar filtros',
                  onClick: () => {
                    setSearchTerm('');
                    setTypeFilter('All');
                    setCategoryFilter('Todos');
                  },
                }
              : undefined
          }
        />
      ) : (
        <div className="space-y-8">
          {/* ── Cuadrícula de Tarjetas Comerciales Enriquecidas ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product: Product) => {
              const totalAvailableStock =
                product.variants?.reduce(
                  (acc, v) => acc + (v.availableStock ?? 0),
                  0,
                ) ?? 0;
              const hasStock = totalAvailableStock > 0 || product.variants?.some((v) => v.canBeSold);
              const firstVariant = product.variants?.[0];

              return (
                <div
                  key={product.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-surface transition-all duration-300 hover:border-brand/50 hover:shadow-lg hover:-translate-y-0.5"
                >
                  {/* Contenedor Fotográfico de Alta Fidelidad (16:10) */}
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-surface-muted">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-surface-muted to-surface text-foreground-muted">
                        <Package className="h-12 w-12 opacity-30" />
                      </div>
                    )}

                    {/* Insignia de Tipo de Producto */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-md bg-surface/90 backdrop-blur-md px-2.5 py-1 text-[11px] font-semibold text-brand border border-border shadow-xs">
                        {product.type === ProductType.Physical ? (
                          <>
                            <span>⚡ Zentric Full · </span>
                            <span>Físico</span>
                          </>
                        ) : (
                          <span>Digital</span>
                        )}
                      </span>
                    </div>

                    {/* Insignia de Stock en Vivo */}
                    <div className="absolute top-3 right-3">
                      {hasStock ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-surface/90 backdrop-blur-md px-2 py-0.5 text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-xs">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>{totalAvailableStock > 0 ? `${totalAvailableStock} disp.` : 'Disponible'}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-surface/90 backdrop-blur-md px-2 py-0.5 text-[10px] font-mono font-semibold text-danger border border-danger/30 shadow-xs">
                          Agotado
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Cuerpo de la Tarjeta */}
                  <div className="p-5 flex flex-col flex-1 justify-between space-y-4">
                    <div className="space-y-2">
                      {/* SKU Técnico */}
                      {firstVariant?.sku && (
                        <div className="text-[10px] font-mono text-foreground-muted flex items-center gap-1">
                          <span className="uppercase tracking-wider">SKU:</span>
                          <span className="text-foreground font-semibold">{firstVariant.sku}</span>
                        </div>
                      )}

                      {/* Título de Producto */}
                      <h3 className="text-base font-semibold text-foreground group-hover:text-brand transition-colors line-clamp-2 leading-snug">
                        {product.name}
                      </h3>

                      {/* Descripción */}
                      <p className="text-xs text-foreground-muted line-clamp-2 leading-relaxed">
                        {product.description || 'Sin descripción técnica disponible.'}
                      </p>

                      {/* Micro-indicador de Disponibilidad */}
                      <div className="pt-1 flex items-center gap-1.5 text-[11px] font-mono">
                        {totalAvailableStock > 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            {totalAvailableStock} unid. disponibles en bodega
                          </span>
                        ) : hasStock ? (
                          <span className="text-brand flex items-center gap-1 font-medium">
                            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                            Stock verificado en bodega
                          </span>
                        ) : (
                          <span className="text-danger flex items-center gap-1 font-medium">
                            <span className="h-1.5 w-1.5 rounded-full bg-danger" />
                            Agotado en bodega
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Footer con Precio Prominente y Botón de Acción */}
                    <div className="pt-3 border-t border-border flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-foreground-muted">
                          Precio oficial
                        </span>
                        <div className="text-lg font-bold font-mono text-foreground tabular-nums">
                          ${product.price.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                          <span className="text-xs font-normal text-foreground-muted ml-1">{product.currency || 'COP'}</span>
                        </div>
                      </div>

                      <Link to="/buyer/catalog/$productId" params={{ productId: product.id }}>
                        <Button
                          size="sm"
                          className="bg-surface-muted hover:bg-brand text-brand hover:text-white font-medium border border-border hover:border-transparent transition-all shadow-xs"
                        >
                          Ver
                          <ArrowRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── 5. Paginación ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border pt-4 text-xs font-mono text-foreground-muted">
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
        </div>
      )}
    </div>
  );
}
