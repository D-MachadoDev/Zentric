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
  FileCode,
  Tag,
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
    page,
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
          {/* Cuadrícula de Tarjetas con Doctrina Anti-IA Genérica */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product: Product) => (
              <div
                key={product.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-[#1F293D] bg-[#111827] p-5 transition-all hover:border-[#00D4AA]/50 hover:shadow-xl hover:shadow-[#00D4AA]/5"
              >
                <div className="space-y-3">
                  {/* Encabezado de Tarjeta con Tipo */}
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#64748B] flex items-center gap-1 truncate">
                      <Tag className="h-3 w-3" />
                      Zentric
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        product.type === ProductType.Physical
                          ? 'border-[#00D4AA]/30 text-[#00D4AA] bg-[#00D4AA]/5'
                          : 'border-blue-500/30 text-blue-400 bg-blue-500/5'
                      }`}
                    >
                      {product.type === ProductType.Physical ? (
                        <span className="flex items-center gap-1">
                          <Package className="h-3 w-3" /> Físico
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <FileCode className="h-3 w-3" /> Digital
                        </span>
                      )}
                    </Badge>
                  </div>

                  {/* Título de Producto */}
                  <div>
                    <h3 className="text-base font-semibold text-white group-hover:text-[#00D4AA] transition-colors line-clamp-2">
                      {product.name}
                    </h3>
                    <p className="text-xs text-[#94A3B8] mt-1 line-clamp-2">
                      {product.description || 'Sin descripción técnica disponible.'}
                    </p>
                  </div>
                </div>

                {/* Footer de Tarjeta con Precio y Enlace a Detalle */}
                <div className="mt-5 pt-4 border-t border-[#1F293D] flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-[#64748B]">
                      Precio base
                    </span>
                    <div className="text-lg font-bold font-mono text-white tabular-nums">
                      ${product.price.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <Link to="/buyer/catalog/$productId" params={{ productId: product.id }}>
                    <Button size="sm" className="bg-[#161F30] hover:bg-[#00D4AA] text-[#00D4AA] hover:text-[#0B0F19] font-medium border border-[#1F293D] hover:border-transparent transition-all">
                      Ver Ficha
                      <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </Link>
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
