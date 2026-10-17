import { useParams, Link } from '@tanstack/react-router';
import {
  useProductQuery,
  usePublishProductMutation,
  useSuspendProductMutation,
} from '../../application/services/catalog';
import { ProductStatus, type ProductVariant } from '../../domain';
import {
  NOMBRES_DE_ESTADO_DE_PRODUCTO,
  TONOS_DE_ESTADO_DE_PRODUCTO,
} from '../../components/domainLabels';
import {
  Button,
  Badge,
  Skeleton,
  Alert,
  AlertTitle,
  AlertDescription,
  MoneyAmount,
  StatusBadge,
} from '@zentric/ui';
import {
  ArrowLeft,
  Boxes,
  PauseCircle,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

/**
 * Ficha Técnica y Estado Comercial de Producto para Vendedor (SellerProductDetailPage).
 * Permite auditar variantes SKU, disponibilidad de venta y alternar estado comercial.
 */
export function SellerProductDetailPage() {
  const { productId } = useParams({ strict: false }) as { productId?: string };

  const { data: product, isLoading, isError, error } = useProductQuery(productId ?? '');
  const publishMutation = usePublishProductMutation();
  const suspendMutation = useSuspendProductMutation();

  const handleToggleStatus = async () => {
    if (!product) return;
    if (product.status === ProductStatus.Published) {
      await suspendMutation.mutateAsync(product.id);
    } else {
      await publishMutation.mutateAsync(product.id);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6 sm:p-10 max-w-7xl mx-auto w-full">
        <Skeleton className="h-8 w-48 bg-surface" />
        <Skeleton className="h-96 rounded-2xl bg-surface" />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="p-6 sm:p-10 max-w-4xl mx-auto w-full space-y-4">
        <Link to="/seller/products">
          <Button variant="outline" size="sm" className="border-border text-foreground-muted">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Volver a Mis Productos
          </Button>
        </Link>
        <Alert variant="destructive" className="border-red-900 bg-red-950/40 text-red-200">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <AlertTitle>Error al cargar el producto</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'El producto solicitado no fue encontrado.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const isPublished = product.status === ProductStatus.Published;

  return (
    <div className="space-y-8 p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full">
      {/* ── Encabezado y Retorno ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link to="/seller/products">
              <Button variant="outline" size="sm" className="border-border text-foreground-muted hover:text-foreground mr-2">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
              {product.name}
            </h1>
            <StatusBadge tone={TONOS_DE_ESTADO_DE_PRODUCTO[product.status]}>
              {NOMBRES_DE_ESTADO_DE_PRODUCTO[product.status]}
            </StatusBadge>
          </div>
          <p className="text-sm font-mono text-foreground-muted">
            Creado el {new Date(product.createdAt).toLocaleDateString('es-CO')} • ID: {product.id}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant={isPublished ? 'outline' : 'secondary'}
            onClick={handleToggleStatus}
            disabled={publishMutation.isPending || suspendMutation.isPending}
            className={`text-xs font-mono ${
              isPublished
                ? 'border-warning/40 text-warning hover:bg-warning/10'
                : 'bg-brand text-primary-foreground font-bold'
            }`}
          >
            {isPublished ? (
              <span className="flex items-center gap-1.5">
                <PauseCircle className="h-3.5 w-3.5" /> Suspender Venta
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5" /> Publicar Producto
              </span>
            )}
          </Button>

          <Link to="/seller/inventory">
            <Button variant="secondary" size="sm" className="bg-surface border border-border text-brand">
              <Boxes className="h-4 w-4 mr-1.5" /> Cargar Stock
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Ficha Técnica ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-6">
          <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="space-y-2">
              <span className="text-xs font-mono uppercase text-foreground-muted block">Descripción</span>
              <p className="text-sm text-foreground-muted leading-relaxed">
                {product.description || 'Sin descripción detallada provista.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-border pt-4 font-mono text-xs">
              <div>
                <span className="text-foreground-muted block">Tipo de Producto:</span>
                <span className="text-foreground font-bold">{product.type}</span>
              </div>
              <div>
                <span className="text-foreground-muted block">Precio Base:</span>
                <span className="text-brand font-bold text-base">
                  <MoneyAmount amount={product.price} currency={product.currency} />
                </span>
              </div>
            </div>

            {/* Listado de Variantes */}
            <div className="space-y-3 border-t border-border pt-6">
              <h2 className="text-sm uppercase font-mono tracking-wider text-foreground">
                Variantes SKU Registradas ({product.variants.length})
              </h2>

              <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-surface-muted/40">
                {product.variants.map((v: ProductVariant) => (
                  <div key={v.id} className="p-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-foreground">
                          SKU: {v.sku}
                        </span>
                        <Badge
                          variant="outline"
                          className={
                            v.canBeSold
                              ? 'border-brand/30 text-brand text-[10px] font-mono'
                              : 'border-red-500/30 text-red-400 text-[10px] font-mono'
                          }
                        >
                          {v.canBeSold ? 'Disponible para Venta' : 'Sin Existencias'}
                        </Badge>
                      </div>
                      <span className="text-[11px] font-mono text-foreground-muted block">
                        ID: {v.id}
                      </span>
                    </div>

                    <Link to="/seller/inventory">
                      <Button variant="outline" size="sm" className="border-border text-brand text-xs font-mono">
                        Abastecer
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-2xl border border-border bg-surface p-6 space-y-4 shadow-xl">
            <h3 className="text-xs font-mono uppercase text-foreground-muted">
              Condiciones Comerciales
            </h3>
            <p className="text-xs text-foreground-muted leading-relaxed">
              La disponibilidad comercial de una variante se activa automáticamente cuando se abastece inventario positivo en alguna bodega física.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
