import { useState, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import {
  useProductsPagedQuery,
  usePublishProductMutation,
  useSuspendProductMutation,
} from '../../core';
import { getDefaultSession } from '../../core';
import { ProductStatus, ProductType, type Product } from '../../core';
import {
  NOMBRES_DE_ESTADO_DE_PRODUCTO,
  TONOS_DE_ESTADO_DE_PRODUCTO,
} from '../../core';
import {
  Button,
  Input,
  Badge,
  Skeleton,
  Alert,
  AlertTitle,
  AlertDescription,
  MoneyAmount,
  StatusBadge,
  StateView,
} from '@zentric/ui';
import {
  PlusCircle,
  Search,
  Eye,
  CheckCircle,
  PauseCircle,
  Package,
  FileCode,
  RefreshCw,
  Copy,
  X,
} from 'lucide-react';

/**
 * Catálogo Propio del Vendedor (SellerProductsPage - Frontend-Role-Modules sección 2.3).
 * Consulta el catálogo con `vendorId` del vendedor activo para listar tanto
 * productos Published como Suspended, con alternancia inmediata de estado comercial
 * y filtros multidimensionales de interés operativo (tipo, categoría, variantes y orden).
 */
export function SellerProductsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | ProductStatus>('All');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Physical' | 'Digital'>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [variantsFilter, setVariantsFilter] = useState<'All' | 'has-variants' | 'single'>('All');
  const [sortFilter, setSortFilter] = useState<'recent' | 'name-asc' | 'price-asc' | 'price-desc'>('recent');

  const vendorId = getDefaultSession()?.getUserId() ?? undefined;
  const { data: productsResult, isLoading, isError, error, refetch, isFetching } = useProductsPagedQuery({ vendorId: vendorId || undefined, size: 100 });
  const publishMutation = usePublishProductMutation();
  const suspendMutation = useSuspendProductMutation();

  const allProducts = productsResult?.items ?? [];

  const availableCategories = useMemo(() => {
    const categoriesSet = new Set<string>();
    allProducts.forEach((p: Product) => {
      if (p.category && p.category.trim()) {
        categoriesSet.add(p.category.trim());
      }
    });
    return Array.from(categoriesSet).sort();
  }, [allProducts]);

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    statusFilter !== 'All' ||
    typeFilter !== 'All' ||
    categoryFilter !== 'All' ||
    variantsFilter !== 'All' ||
    sortFilter !== 'recent';

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('All');
    setTypeFilter('All');
    setCategoryFilter('All');
    setVariantsFilter('All');
    setSortFilter('recent');
  };

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const cleanPrice = term.replace(/[$. ]/g, '');

    return allProducts
      .filter((product: Product) => {
        // Búsqueda inteligente multidimensional (nombre, descripción, SKU, atributos, precio, categoría, tipo)
        const matchesSearch =
          !term ||
          product.name.toLowerCase().includes(term) ||
          (product.description && product.description.toLowerCase().includes(term)) ||
          (product.category && product.category.toLowerCase().includes(term)) ||
          (product.type && product.type.toLowerCase().includes(term)) ||
          (product.status && product.status.toLowerCase().includes(term)) ||
          (product.id && product.id.toLowerCase().includes(term)) ||
          (cleanPrice.length > 0 && String(product.price).includes(cleanPrice)) ||
          (product.variants ?? []).some(
            (v) =>
              v.sku?.toLowerCase().includes(term) ||
              v.id?.toLowerCase().includes(term) ||
              (v.price !== undefined && cleanPrice.length > 0 && String(v.price).includes(cleanPrice)) ||
              (v.attributes ?? []).some(
                (a) =>
                  a.name.toLowerCase().includes(term) ||
                  a.value.toLowerCase().includes(term) ||
                  `${a.name} ${a.value}`.toLowerCase().includes(term),
              ),
          );

        const matchesStatus = statusFilter === 'All' || product.status === statusFilter;
        const matchesType = typeFilter === 'All' || product.type === typeFilter;
        const matchesCategory = categoryFilter === 'All' || product.category === categoryFilter;
        const matchesVariants =
          variantsFilter === 'All' ||
          (variantsFilter === 'has-variants'
            ? (product.variants?.length ?? 0) > 0
            : (product.variants?.length ?? 0) === 0);

        return matchesSearch && matchesStatus && matchesType && matchesCategory && matchesVariants;
      })
      .sort((a, b) => {
        if (sortFilter === 'name-asc') return a.name.localeCompare(b.name);
        if (sortFilter === 'price-asc') return a.price - b.price;
        if (sortFilter === 'price-desc') return b.price - a.price;
        // 'recent' por defecto: más recientes primero para dar visibilidad inmediata a productos recién creados
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
  }, [allProducts, searchTerm, statusFilter, typeFilter, categoryFilter, variantsFilter, sortFilter]);

  const handleToggleStatus = async (product: Product) => {
    if (product.status === ProductStatus.Published) {
      await suspendMutation.mutateAsync(product.id);
    } else {
      await publishMutation.mutateAsync(product.id);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8 w-full max-w-full">
        <Skeleton className="h-8 w-48 bg-surface" />
        <Skeleton className="h-96 rounded-2xl bg-surface" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 sm:p-10 max-w-4xl mx-auto w-full space-y-4">
        <Alert variant="destructive" className="border-destructive bg-destructive/10 text-destructive">
          <AlertTitle>Error al cargar catálogo propio</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'No fue posible consultar sus productos.'}
          </AlertDescription>
        </Alert>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="border-border text-foreground-muted">
          <RefreshCw className="h-4 w-4 mr-1.5" /> Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 w-full max-w-full">
      {/* ── Encabezado ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
              Mis Productos
            </h1>
            <Badge variant="outline" className="border-border text-brand font-mono text-xs">
              {filteredProducts.length} de {allProducts.length} Productos
            </Badge>
          </div>
          <p className="text-sm text-foreground-muted">
            Gestión comercial de fichas de producto, control de publicación y precios por SKU.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="border-border text-foreground-muted hover:text-foreground"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refrescar
          </Button>

          <Link to="/seller/products/new">
            <Button className="bg-brand hover:bg-brand/90 text-primary-foreground font-bold text-xs shadow-md shadow-brand/20">
              <PlusCircle className="h-4 w-4 mr-1.5" />
              Nuevo Producto
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Controles de Búsqueda y Filtros de Interés ───────────────────── */}
      <div className="space-y-4 rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xs">
        {/* Fila Principal: Búsqueda y Pestañas de Estado con respiración amplia */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
            <Input
              type="search"
              placeholder="Buscar por nombre o descripción, SKU, atributo, categoría o precio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 bg-surface-muted/50 border-border/80 focus:border-brand text-foreground placeholder:text-foreground-muted text-sm rounded-xl"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-foreground-muted hover:text-foreground font-mono"
              >
                ✕
              </button>
            )}
          </div>

          <div className="inline-flex rounded-xl border border-border/80 bg-surface-muted/50 p-1 text-xs shrink-0 font-medium">
            <button
              type="button"
              onClick={() => setStatusFilter('All')}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                statusFilter === 'All'
                  ? 'bg-brand text-primary-foreground font-semibold shadow-xs'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter(ProductStatus.Published)}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                statusFilter === ProductStatus.Published
                  ? 'bg-brand text-primary-foreground font-semibold shadow-xs'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              Publicados
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter(ProductStatus.Suspended)}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                statusFilter === ProductStatus.Suspended
                  ? 'bg-brand text-primary-foreground font-semibold shadow-xs'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              Suspendidos
            </button>
          </div>
        </div>

        {/* Fila Secundaria: Filtros limpios sin clutter técnico */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3.5 border-t border-border/50 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filtro Tipo */}
            <select
              aria-label="Filtrar por tipo de producto"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'All' | 'Physical' | 'Digital')}
              className="rounded-lg border border-border/70 bg-surface-muted/40 hover:bg-surface-muted/70 px-3 py-1.5 text-xs text-foreground focus:border-brand focus:outline-none transition-colors"
            >
              <option value="All">Tipo: Todos</option>
              <option value="Physical">Físicos (con bodega)</option>
              <option value="Digital">Digitales (licencias)</option>
            </select>

            {/* Filtro Categoría */}
            {availableCategories.length > 0 && (
              <select
                aria-label="Filtrar por categoría"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-lg border border-border/70 bg-surface-muted/40 hover:bg-surface-muted/70 px-3 py-1.5 text-xs text-foreground focus:border-brand focus:outline-none transition-colors"
              >
                <option value="All">Categoría: Todas</option>
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}

            {/* Filtro Variantes */}
            <select
              aria-label="Filtrar por estructura de variantes"
              value={variantsFilter}
              onChange={(e) => setVariantsFilter(e.target.value as 'All' | 'has-variants' | 'single')}
              className="rounded-lg border border-border/70 bg-surface-muted/40 hover:bg-surface-muted/70 px-3 py-1.5 text-xs text-foreground focus:border-brand focus:outline-none transition-colors"
            >
              <option value="All">Estructura: Todas</option>
              <option value="has-variants">Con variantes (SKUs)</option>
              <option value="single">Opción única (simple)</option>
            </select>

            {/* Ordenamiento */}
            <select
              aria-label="Ordenar productos"
              value={sortFilter}
              onChange={(e) => setSortFilter(e.target.value as 'recent' | 'name-asc' | 'price-asc' | 'price-desc')}
              className="rounded-lg border border-border/70 bg-surface-muted/40 hover:bg-surface-muted/70 px-3 py-1.5 text-xs text-foreground focus:border-brand focus:outline-none transition-colors"
            >
              <option value="recent">Orden: Más recientes</option>
              <option value="name-asc">Orden: Nombre (A–Z)</option>
              <option value="price-asc">Orden: Menor precio</option>
              <option value="price-desc">Orden: Mayor precio</option>
            </select>
          </div>

          {hasActiveFilters && filteredProducts.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="text-xs text-foreground-muted hover:text-danger gap-1 h-8 px-2.5"
            >
              <X className="h-3.5 w-3.5" />
              Limpiar filtros
            </Button>
          )}
        </div>
      </div>

      {/* ── Tabla / Listado de Productos ───────────────────────────────── */}
      {filteredProducts.length === 0 ? (
        <StateView
          state="empty"
          title="No se encontraron productos"
          description={
            hasActiveFilters
              ? 'No hay productos que coincidan con los criterios de búsqueda y filtros seleccionados.'
              : 'Aún no tiene productos registrados en su catálogo de vendedor.'
          }
          action={
            hasActiveFilters
              ? {
                  label: 'Limpiar filtros',
                  onClick: handleResetFilters,
                }
              : {
                  label: 'Crear Producto',
                  onClick: () => window.location.assign('/seller/products/new'),
                }
          }
        />
      ) : (
        <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-xl">
          <div className="divide-y divide-border">
            {filteredProducts.map((product: Product) => {
              const isPublished = product.status === ProductStatus.Published;
              const skuPrices = product.variants
                .map((v) => v.price ?? product.price)
                .filter((p) => p > 0);
              const minSkuPrice = skuPrices.length > 0 ? Math.min(...skuPrices) : product.price;
              const maxSkuPrice = skuPrices.length > 0 ? Math.max(...skuPrices) : product.price;
              const hasVariableSkuPricing = maxSkuPrice > minSkuPrice;

              return (
                <div
                  key={product.id}
                  className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-surface-muted/30 transition-colors"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-base font-bold text-foreground font-sans">
                        {product.name}
                      </span>
                      <StatusBadge tone={TONOS_DE_ESTADO_DE_PRODUCTO[product.status]}>
                        {NOMBRES_DE_ESTADO_DE_PRODUCTO[product.status]}
                      </StatusBadge>
                      <Badge
                        variant="outline"
                        className="border-border text-foreground-muted text-xs font-mono"
                      >
                        {product.type === ProductType.Physical ? (
                          <span className="flex items-center gap-1">
                            <Package className="h-3 w-3 text-brand" /> Físico
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <FileCode className="h-3 w-3 text-blue-400" /> Digital
                          </span>
                        )}
                      </Badge>
                      {product.category && (
                        <Badge variant="outline" className="border-border text-foreground-subtle text-[11px] font-mono">
                          {product.category}
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-foreground-muted line-clamp-2">
                      {product.description || 'Sin descripción provista.'}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-foreground-muted">
                      <span>{product.variants.length} variante(s)</span>
                      {hasVariableSkuPricing && (
                        <>
                          <span>•</span>
                          <span className="text-brand"> Precios por SKU activos</span>
                        </>
                      )}
                      <span>•</span>
                      <span>Creado: {new Date(product.createdAt).toLocaleDateString('es-CO')}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        ID: {product.id}
                        <button
                          type="button"
                          onClick={() => navigator.clipboard?.writeText(product.id)}
                          className="text-foreground-muted hover:text-foreground"
                          title="Copiar ID"
                          aria-label="Copiar ID del producto"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-4 md:pt-0 border-border">
                    <div className="text-left md:text-right">
                      <span className="text-[10px] uppercase font-mono text-foreground-muted block">
                        {hasVariableSkuPricing ? 'Desde (Precio Base)' : 'Precio Base'}
                      </span>
                      <div className="text-lg font-bold font-mono text-foreground tabular-nums">
                        <MoneyAmount amount={product.price} currency={product.currency} />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={isPublished ? 'outline' : 'secondary'}
                        onClick={() => handleToggleStatus(product)}
                        disabled={publishMutation.isPending || suspendMutation.isPending}
                        className={`text-xs font-mono ${
                          isPublished
                            ? 'border-warning/40 text-warning hover:bg-warning/10'
                            : 'bg-brand text-primary-foreground font-bold'
                        }`}
                      >
                        {isPublished ? (
                          <span className="flex items-center gap-1.5">
                            <PauseCircle className="h-3.5 w-3.5" /> Suspender
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5">
                            <CheckCircle className="h-3.5 w-3.5" /> Publicar
                          </span>
                        )}
                      </Button>

                      {product.variants.length > 0 && (
                        <Link
                          to="/seller/inventory"
                          search={{ variantId: product.variants[0]!.id } as never}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-border text-brand hover:text-brand"
                          >
                            <Package className="h-3.5 w-3.5 mr-1.5" /> Abastecer
                          </Button>
                        </Link>
                      )}

                      <Link
                        to="/seller/products/$productId"
                        params={{ productId: product.id }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-border text-foreground-muted hover:text-foreground"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1.5" /> Ficha
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
