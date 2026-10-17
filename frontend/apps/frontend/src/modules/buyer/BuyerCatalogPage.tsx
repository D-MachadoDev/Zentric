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
} from 'lucide-react';

/**
 * Catálogo Público y Exploración de Productos para el Comprador (Frontend-Role-Modules §2.4).
 * Muestra productos en estado Published con paginación, filtros y jerarquía visual estricta.
 */
export function BuyerCatalogPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | ProductType>('All');

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

  // Filtrado local por término de búsqueda y tipo de producto (Físico vs Digital)
  const filteredProducts = products.filter((product: Product) => {
    const matchesSearch =
      !searchTerm.trim() ||
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'All' || product.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-8 p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full">
      {/* ── Encabezado y Barra de Filtros ───────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#1F293D]">
        <div className="space-y-1.5">
          <span className="kicker-spike">PORTAL DE COMPRAS · STOCK VERIFICADO EN BODEGA</span>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
              Catálogo de Productos
            </h1>
            <Badge variant="outline" className="border-[#1F293D] text-[#00D4AA] font-mono text-xs">
              {totalItems} disponibles
            </Badge>
          </div>
          <p className="text-sm text-[#94A3B8]">
            Explore productos con existencias garantizadas en bodega y reserva atómica de 15 minutos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/buyer/cart">
            <Button variant="secondary" className="bg-[#111827] border border-[#1F293D] text-[#00D4AA] hover:bg-[#161F30]">
              <ShoppingBag className="h-4 w-4 mr-2" />
              Ver Carrito
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="border-[#1F293D] text-[#94A3B8] hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refrescar
          </Button>
        </div>
      </div>

      {/* ── Barra de Búsqueda y Segmentación ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B]" />
          <Input
            type="search"
            placeholder="Buscar por nombre, descripción..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="pl-10 bg-[#111827] border-[#1F293D] focus:border-[#00D4AA] text-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[#64748B] hidden sm:block" />
          <div className="inline-flex rounded-lg border border-[#1F293D] bg-[#111827] p-1 text-xs font-mono">
            <button
              type="button"
              onClick={() => setTypeFilter('All')}
              className={`px-3 py-1 rounded-md transition-colors ${
                typeFilter === 'All' ? 'bg-[#00D4AA] text-[#0B0F19] font-semibold' : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter(ProductType.Physical)}
              className={`px-3 py-1 rounded-md transition-colors ${
                typeFilter === ProductType.Physical ? 'bg-[#00D4AA] text-[#0B0F19] font-semibold' : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              Físicos
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter(ProductType.Digital)}
              className={`px-3 py-1 rounded-md transition-colors ${
                typeFilter === ProductType.Digital ? 'bg-[#00D4AA] text-[#0B0F19] font-semibold' : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              Digitales
            </button>
          </div>
        </div>
      </div>

      {/* ── Manejo de los 4 Estados Canónicos ────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-[#1F293D] bg-[#111827] p-5 space-y-4">
              <Skeleton className="h-44 w-full rounded-xl bg-[#161F30]" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-3/4 bg-[#161F30]" />
                <Skeleton className="h-4 w-1/2 bg-[#161F30]" />
              </div>
              <div className="flex justify-between items-center pt-2">
                <Skeleton className="h-6 w-20 bg-[#161F30]" />
                <Skeleton className="h-8 w-24 bg-[#161F30]" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <Alert variant="destructive" className="border-red-900 bg-red-950/40 text-red-200">
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
            searchTerm || typeFilter !== 'All'
              ? 'No hay productos que coincidan con los criterios de búsqueda seleccionados.'
              : 'El catálogo no cuenta con productos publicados en este momento.'
          }
          action={
            searchTerm || typeFilter !== 'All'
              ? {
                  label: 'Limpiar filtros',
                  onClick: () => {
                    setSearchTerm('');
                    setTypeFilter('All');
                  },
                }
              : undefined
          }
        />
      ) : (
        <div className="space-y-8">
          {/* Cuadrícula de Tarjetas con Doctrina Anti-IA Genérica y Fotografía Real */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product: Product) => (
              <div
                key={product.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[#1F293D] bg-[#111827] transition-all hover:border-[#00D4AA]/60 hover:shadow-xl hover:shadow-[#00D4AA]/10"
              >
                {/* ── Contenedor Fotográfico de Producto ── */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#161F30]">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#161F30] to-[#111827] text-[#64748B]">
                      <Package className="h-12 w-12 opacity-30" />
                    </div>
                  )}

                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#0B0F19]/80 backdrop-blur-md px-2.5 py-1 text-[11px] font-semibold text-[#00D4AA] border border-[#00D4AA]/30">
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

                  <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center rounded-md bg-[#0B0F19]/80 backdrop-blur-md px-2 py-0.5 text-[10px] font-mono text-[#94A3B8] border border-[#1F293D]">
                      {product.variants?.length ? `${product.variants.length} var.` : '1 SKU'}
                    </span>
                  </div>
                </div>

                <div className="p-5 flex flex-col flex-1 justify-between space-y-4">
                  <div className="space-y-2">
                    {/* Título de Producto */}
                    <h3 className="text-base font-semibold text-white group-hover:text-[#00D4AA] transition-colors line-clamp-2">
                      {product.name}
                    </h3>
                    <p className="text-xs text-[#94A3B8] line-clamp-2 leading-relaxed">
                      {product.description || 'Sin descripción técnica disponible.'}
                    </p>

                    {/* Disponibilidad de Stock en Bodega */}
                    {(() => {
                      const totalAvailableStock =
                        product.variants?.reduce(
                          (acc, v) => acc + (v.availableStock ?? 0),
                          0,
                        ) ?? 0;
                      return (
                        <div className="pt-1 flex items-center gap-1.5 text-[11px] font-mono">
                          {totalAvailableStock > 0 ? (
                            <span className="text-[#00D4AA] flex items-center gap-1 font-medium">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#00D4AA]" />
                              {totalAvailableStock} unid. disponibles en bodega
                            </span>
                          ) : (
                            <span className="text-red-400 flex items-center gap-1 font-medium">
                              <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                              Agotado en bodega
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Footer de Tarjeta con Precio y Enlace a Detalle */}
                  <div className="pt-3 border-t border-[#1F293D] flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-[#64748B]">
                        Precio contado
                      </span>
                      <div className="text-lg font-bold font-mono text-white tabular-nums">
                        ${product.price.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                        <span className="text-xs font-normal text-[#64748B] ml-1">{product.currency || 'COP'}</span>
                      </div>
                    </div>

                    <Link to="/buyer/catalog/$productId" params={{ productId: product.id }}>
                      <Button size="sm" className="bg-[#161F30] hover:bg-[#00D4AA] text-[#00D4AA] hover:text-[#0B0F19] font-medium border border-[#1F293D] hover:border-transparent transition-all">
                        Ver
                        <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[#1F293D] pt-4 text-xs font-mono text-[#94A3B8]">
              <div>
                Página <span className="text-white font-bold">{page}</span> de{' '}
                <span className="text-white font-bold">{totalPages}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="border-[#1F293D] text-[#94A3B8]"
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="border-[#1F293D] text-[#94A3B8]"
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
