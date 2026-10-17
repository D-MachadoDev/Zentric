import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  useProductsQuery,
  usePublishProductMutation,
  useSuspendProductMutation,
} from '../../application/services/catalog';
import { ProductStatus, ProductType, type Product } from '../../domain';
import {
  NOMBRES_DE_ESTADO_DE_PRODUCTO,
  TONOS_DE_ESTADO_DE_PRODUCTO,
} from '../../components/domainLabels';
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
} from 'lucide-react';


/**
 * Catálogo Propio del Vendedor (SellerProductsPage - Frontend-Role-Modules §2.3).
 * Muestra productos en estado Published y Suspended con acciones rápidas de cambio de estado
 * comercial y acceso a la creación de productos y variantes.
 */
export function SellerProductsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | ProductStatus>('All');

  const { data: products, isLoading, isError, error, refetch, isFetching } = useProductsQuery();
  const publishMutation = usePublishProductMutation();
  const suspendMutation = useSuspendProductMutation();

  const allProducts = products ?? [];

  const filteredProducts = allProducts.filter((product: Product) => {
    const matchesSearch =
      !searchTerm.trim() ||
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All' || product.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleToggleStatus = async (product: Product) => {
    if (product.status === ProductStatus.Published) {
      await suspendMutation.mutateAsync(product.id);
    } else {
      await publishMutation.mutateAsync(product.id);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8 p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full">
        <Skeleton className="h-8 w-48 bg-[#111827]" />
        <Skeleton className="h-96 rounded-2xl bg-[#111827]" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 sm:p-10 max-w-4xl mx-auto w-full space-y-4">
        <Alert variant="destructive" className="border-red-900 bg-red-950/40 text-red-200">
          <AlertTitle>Error al cargar catálogo propio</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'No fue posible consultar sus productos.'}
          </AlertDescription>
        </Alert>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="border-[#1F293D] text-[#94A3B8]">
          <RefreshCw className="h-4 w-4 mr-1.5" /> Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full">
      {/* ── Encabezado ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#1F293D]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
              Mis Productos
            </h1>
            <Badge variant="outline" className="border-[#1F293D] text-[#00D4AA] font-mono text-xs">
              {allProducts.length} registros
            </Badge>
          </div>
          <p className="text-sm text-[#94A3B8]">
            Catálogo propio comercial. Puede pausar temporalmente productos o crear nuevas referencias con variantes.
          </p>
        </div>

        <div className="flex items-center gap-3">
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

          <Link to="/seller/products/new">
            <Button className="bg-[#00D4AA] hover:bg-[#00D4AA]/90 text-[#0B0F19] font-bold text-xs shadow-md shadow-[#00D4AA]/20">
              <PlusCircle className="h-4 w-4 mr-1.5" />
              Nuevo Producto
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Barra de Búsqueda y Filtros de Estado Comercial ─────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B]" />
          <Input
            type="search"
            placeholder="Buscar por nombre o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-[#111827] border-[#1F293D] focus:border-[#00D4AA] text-white"
          />
        </div>

        <div className="inline-flex rounded-lg border border-[#1F293D] bg-[#111827] p-1 text-xs font-mono">
          <button
            type="button"
            onClick={() => setStatusFilter('All')}
            className={`px-3 py-1 rounded-md transition-colors ${
              statusFilter === 'All' ? 'bg-[#00D4AA] text-[#0B0F19] font-semibold' : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter(ProductStatus.Published)}
            className={`px-3 py-1 rounded-md transition-colors ${
              statusFilter === ProductStatus.Published
                ? 'bg-[#00D4AA] text-[#0B0F19] font-semibold'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Publicados
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter(ProductStatus.Suspended)}
            className={`px-3 py-1 rounded-md transition-colors ${
              statusFilter === ProductStatus.Suspended
                ? 'bg-[#00D4AA] text-[#0B0F19] font-semibold'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Suspendidos
          </button>
        </div>
      </div>

      {/* ── Tabla / Listado de Productos ───────────────────────────────── */}
      {filteredProducts.length === 0 ? (
        <StateView
          state="empty"
          title="No se encontraron productos"
          description={
            searchTerm || statusFilter !== 'All'
              ? 'No hay productos que coincidan con los criterios de búsqueda.'
              : 'Aún no tiene productos registrados en su catálogo de vendedor.'
          }
          action={
            searchTerm || statusFilter !== 'All'
              ? {
                  label: 'Limpiar filtros',
                  onClick: () => {
                    setSearchTerm('');
                    setStatusFilter('All');
                  },
                }
              : {
                  label: 'Crear Producto',
                  onClick: () => window.location.assign('/seller/products/new'),
                }
          }
        />
      ) : (
        <div className="rounded-2xl border border-[#1F293D] bg-[#111827] overflow-hidden shadow-xl">
          <div className="divide-y divide-[#1F293D]">
            {filteredProducts.map((product: Product) => {
              const isPublished = product.status === ProductStatus.Published;

              return (
                <div
                  key={product.id}
                  className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-[#161F30]/30 transition-colors"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-base font-bold text-white font-sans">
                        {product.name}
                      </span>
                      <StatusBadge tone={TONOS_DE_ESTADO_DE_PRODUCTO[product.status]}>
                        {NOMBRES_DE_ESTADO_DE_PRODUCTO[product.status]}
                      </StatusBadge>
                      <Badge
                        variant="outline"
                        className="border-[#1F293D] text-[#94A3B8] text-xs font-mono"
                      >
                        {product.type === ProductType.Physical ? (
                          <span className="flex items-center gap-1">
                            <Package className="h-3 w-3 text-[#00D4AA]" /> Físico
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <FileCode className="h-3 w-3 text-blue-400" /> Digital
                          </span>
                        )}
                      </Badge>
                    </div>

                    <p className="text-xs text-[#94A3B8] line-clamp-2">
                      {product.description || 'Sin descripción provista.'}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[#64748B]">
                      <span>{product.variants.length} variante(s)</span>
                      <span>•</span>
                      <span>Creado: {new Date(product.createdAt).toLocaleDateString('es-CO')}</span>
                      <span>•</span>
                      <span>ID: {product.id}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-4 md:pt-0 border-[#1F293D]">
                    <div className="text-left md:text-right">
                      <span className="text-[10px] uppercase font-mono text-[#64748B] block">Precio Base</span>
                      <div className="text-lg font-bold font-mono text-white tabular-nums">
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
                            ? 'border-[#FFB800]/40 text-[#FFB800] hover:bg-[#FFB800]/10'
                            : 'bg-[#00D4AA] text-[#0B0F19] font-bold'
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

                      <Link to="/seller/products/$productId" params={{ productId: product.id }}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-[#1F293D] text-[#94A3B8] hover:text-white"
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
