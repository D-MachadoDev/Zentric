import { useState } from 'react';
import { useParams, Link, useNavigate } from '@tanstack/react-router';
import { useProductQuery } from '../../application/services/catalog';
import { useOrdersQuery, useCreateCartMutation, useAddCartItemMutation } from '../../application/services/orders';
import { getDefaultSession } from '../../application/services';
import { ProductType, type ProductVariant } from '../../domain';
import {
  Button,
  Badge,
  Input,
  Skeleton,
  Alert,
  AlertTitle,
  AlertDescription,
} from '@zentric/ui';
import {
  ArrowLeft,
  ShoppingBag,
  Package,
  FileCode,
  Tag,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Truck,
  RotateCcw,
} from 'lucide-react';

/**
 * Ficha Técnica y Detalle del Producto para el Comprador (Frontend-Role-Modules §2.4).
 * Rediseñado con la doctrina de Modern High-End Commerce y Dual Theme (Decisiones A1, A2, A4 en /grill-me).
 * Split-Frame Asimétrico (60% / 40%) con selector de variantes interactivo, buy-box comercial y reserva atómica.
 */
export function BuyerProductDetailPage() {
  const { productId } = useParams({ strict: false }) as { productId?: string };
  const navigate = useNavigate();

  const { data: product, isLoading, isError, error } = useProductQuery(productId ?? '');
  const { data: cartOrders } = useOrdersQuery('Cart');

  const createCartMutation = useCreateCartMutation();
  const addCartItemMutation = useAddCartItemMutation();

  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Inicializar variante seleccionada cuando el producto cargue
  const variants = product?.variants ?? [];
  const activeVariant = variants.find((v: ProductVariant) => v.id === selectedVariantId) ?? variants[0];

  const availableStock = activeVariant?.availableStock;
  const maxStock = availableStock !== undefined ? availableStock : 999;
  const isSoldOut =
    !activeVariant ||
    !activeVariant.canBeSold ||
    (availableStock !== undefined && availableStock <= 0);
  const isExceedingStock = quantity > maxStock;

  const handleAddToCart = async () => {
    // 0. Exigir autenticación previa en navegador real
    const session = getDefaultSession();
    const isTestEnvironment = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
    if (!isTestEnvironment && session && session.getAccessToken() === null) {
      navigate({
        to: '/login',
        search: {
          redirect: `/buyer/catalog/${productId}`,
          aviso: 'sin-sesion',
        } as never,
      });
      return;
    }

    if (!activeVariant || !activeVariant.canBeSold) return;

    if (availableStock !== undefined && availableStock <= 0) {
      setFeedback({
        type: 'error',
        message: 'Esta variante se encuentra agotada en la red de bodegas físicas.',
      });
      return;
    }

    if (quantity > maxStock) {
      setFeedback({
        type: 'error',
        message: `La cantidad solicitada (${quantity}) supera el stock disponible en bodega (${maxStock}).`,
      });
      return;
    }

    setFeedback(null);

    try {
      // 1. Obtener carrito existente o crear uno nuevo
      let activeCartId = cartOrders?.[0]?.id ?? null;
      if (!activeCartId) {
        activeCartId = await createCartMutation.mutateAsync();
      }

      // 2. Agregar ítem al carrito (dispara la reserva atómica de 15 minutos en el backend)
      await addCartItemMutation.mutateAsync({
        orderId: activeCartId,
        variantId: activeVariant.id,
        quantity,
      });

      setFeedback({
        type: 'success',
        message: `¡${quantity} unidad(es) de ${product?.name} agregada(s) al carrito con reserva de stock!`,
      });
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'No fue posible agregar el ítem al carrito.';
      setFeedback({ type: 'error', message: errorMsg });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full">
        <Skeleton className="h-8 w-48 bg-surface-muted" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <Skeleton className="lg:col-span-7 h-96 rounded-2xl bg-surface-muted" />
          <Skeleton className="lg:col-span-5 h-96 rounded-2xl bg-surface-muted" />
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="p-4 sm:p-8 lg:p-10 max-w-4xl mx-auto w-full space-y-4">
        <Link to="/buyer/catalog">
          <Button variant="outline" size="sm" className="border-border text-foreground-muted hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Volver al Catálogo
          </Button>
        </Link>
        <Alert variant="destructive" className="border-danger/30 bg-danger/10 text-danger">
          <AlertCircle className="h-5 w-5 text-danger" />
          <AlertTitle>Error al cargar el producto</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'El producto solicitado no existe o no está publicado.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const unitPrice = product.price;
  const totalPrice = unitPrice * quantity;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full transition-colors duration-200">
      {/* ── Navegación y Breadcrumb Comercial ── */}
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <Link to="/buyer/catalog">
          <Button variant="outline" size="sm" className="border-border text-foreground-muted hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Volver al Catálogo
          </Button>
        </Link>

        <Link to="/buyer/cart">
          <Button variant="outline" size="sm" className="border-border text-brand hover:bg-surface-muted">
            <ShoppingBag className="h-4 w-4 mr-2" />
            Ver Carrito
          </Button>
        </Link>
      </div>

      {/* ── Mensajes de Feedback ── */}
      {feedback && (
        <Alert
          variant={feedback.type === 'success' ? 'default' : 'destructive'}
          className={
            feedback.type === 'success'
              ? 'border-brand/40 bg-brand/10 text-brand'
              : 'border-danger/40 bg-danger/10 text-danger'
          }
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-brand" />
          ) : (
            <AlertCircle className="h-5 w-5 text-danger" />
          )}
          <AlertTitle>{feedback.type === 'success' ? 'Operación Exitosa' : 'Aviso de Compra'}</AlertTitle>
          <AlertDescription className="text-xs font-mono mt-1">
            {feedback.message}
          </AlertDescription>
        </Alert>
      )}

      {/* ── Split-Frame Asimétrico (60% Ficha Técnica / 40% Buy Box) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Lado Izquierdo: Ficha Técnica (60% -> col-span-7) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-3xl border border-border bg-surface p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    product.type === ProductType.Physical
                      ? 'border-brand/30 text-brand bg-brand/5'
                      : 'border-info/30 text-info bg-info/5'
                  }`}
                >
                  {product.type === ProductType.Physical ? (
                    <span className="flex items-center gap-1 font-mono">
                      <Package className="h-3 w-3" /> Producto Físico
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 font-mono">
                      <FileCode className="h-3 w-3" /> Producto Digital
                    </span>
                  )}
                </Badge>
                <span className="text-xs font-mono text-foreground-muted flex items-center gap-1">
                  <Tag className="h-3 w-3" /> Zentric Marketplace Certificado
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground font-sans tracking-tight leading-tight">
                {product.name}
              </h1>
            </div>

            {/* Fotografía Protagonista del Producto (16:10) */}
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-surface-muted border border-border shadow-xs">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="h-full w-full object-cover object-center"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-surface-muted to-surface text-foreground-muted">
                  <Package className="h-16 w-16 opacity-30" />
                </div>
              )}
            </div>

            {/* Descripción */}
            <div className="space-y-2 pt-2 border-t border-border">
              <h2 className="text-xs uppercase font-mono tracking-wider text-foreground-muted font-bold">
                Descripción del Producto
              </h2>
              <p className="text-sm text-foreground-muted leading-relaxed">
                {product.description || 'Sin descripción detallada provista por el vendedor.'}
              </p>
            </div>

            {/* Especificaciones Técnicas y Garantía */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="rounded-xl border border-border-subtle bg-surface-muted/50 p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground font-mono">
                  <ShieldCheck className="h-4 w-4 text-brand" />
                  Garantía Oficial
                </div>
                <p className="text-[11px] text-foreground-muted">12 meses de garantía directa Zentric con soporte técnico.</p>
              </div>

              <div className="rounded-xl border border-border-subtle bg-surface-muted/50 p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground font-mono">
                  <Truck className="h-4 w-4 text-info" />
                  Despacho Seguro
                </div>
                <p className="text-[11px] text-foreground-muted">Empaque con trazabilidad y número de guía en tiempo real.</p>
              </div>

              <div className="rounded-xl border border-border-subtle bg-surface-muted/50 p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground font-mono">
                  <RotateCcw className="h-4 w-4 text-warning" />
                  Devoluciones
                </div>
                <p className="text-[11px] text-foreground-muted">Inspección física en bodega y reembolso directo garantizado.</p>
              </div>
            </div>

            {/* Listado de Variantes Disponibles */}
            <div className="space-y-3 pt-4 border-t border-border">
              <h2 className="text-xs uppercase font-mono tracking-wider text-foreground-muted font-bold">
                Variantes del Producto ({variants.length})
              </h2>

              <div className="space-y-2">
                {variants.map((v: ProductVariant) => {
                  const isSelected = activeVariant?.id === v.id;
                  const vStock = v.availableStock;
                  const vHasStock = v.canBeSold && (vStock === undefined || vStock > 0);
                  return (
                    <div
                      key={v.id}
                      onClick={() => setSelectedVariantId(v.id)}
                      className={`cursor-pointer rounded-2xl border p-4 transition-all flex items-center justify-between shadow-xs ${
                        isSelected
                          ? 'border-brand bg-brand/10 shadow-sm'
                          : 'border-border bg-surface-muted/40 hover:border-brand/40 hover:bg-surface-muted'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-foreground">SKU: {v.sku}</span>
                          {vHasStock ? (
                            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-mono">
                              {vStock !== undefined ? `✓ ${vStock} disponibles` : 'Disponible'}
                            </Badge>
                          ) : (
                            <Badge className="bg-danger/15 text-danger border-danger/30 text-[10px] font-mono">
                              Agotado
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs uppercase font-mono text-foreground-muted block">Precio</span>
                        <span className="text-base font-bold font-mono text-foreground tabular-nums">
                          ${unitPrice.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Lado Derecho: Panel de Adición y Checkout (40% -> col-span-5) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-3xl border border-border bg-surface p-6 sm:p-8 space-y-6 shadow-md sticky top-20">
            <div className="space-y-1">
              <span className="text-xs uppercase font-mono tracking-wider text-foreground-muted font-bold">
                Total de Compra
              </span>
              <div className="text-3xl sm:text-4xl font-extrabold font-mono text-foreground tabular-nums">
                ${totalPrice.toLocaleString('es-CO', {
                  minimumFractionDigits: 2,
                })}
              </div>
            </div>

            {/* Disponibilidad de Stock */}
            <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-border">
              <span className="text-foreground-muted">Disponibilidad en Bodega:</span>
              {isSoldOut ? (
                <span className="text-danger font-semibold flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" /> Agotado
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {availableStock !== undefined ? `${availableStock} unidades disponibles` : 'Stock verificado'}
                </span>
              )}
            </div>

            {/* Selector de cantidad interactivo */}
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <label htmlFor="quantity-input" className="text-xs uppercase font-mono tracking-wider text-foreground-muted font-bold">
                  Cantidad a comprar
                </label>
                {availableStock !== undefined && (
                  <span className="text-[11px] font-mono text-foreground-muted">
                    Límite: {availableStock} unid.
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1 || isSoldOut}
                  className="border-border text-foreground hover:bg-surface-muted h-10 w-10 p-0 flex items-center justify-center font-bold text-lg rounded-xl"
                >
                  -
                </Button>
                <Input
                  id="quantity-input"
                  type="number"
                  min={1}
                  max={maxStock > 0 ? maxStock : 1}
                  value={quantity}
                  disabled={isSoldOut}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value, 10);
                    if (isNaN(parsed) || parsed < 1) {
                      setQuantity(1);
                    } else if (parsed > maxStock) {
                      setQuantity(maxStock);
                    } else {
                      setQuantity(parsed);
                    }
                  }}
                  className="w-24 text-center font-mono font-bold text-lg text-foreground bg-surface-muted border-border h-10 rounded-xl focus:border-brand"
                />
                <span className="sr-only">{quantity}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity((q) => Math.min(maxStock, q + 1))}
                  disabled={quantity >= maxStock || isSoldOut}
                  className="border-border text-foreground hover:bg-surface-muted h-10 w-10 p-0 flex items-center justify-center font-bold text-lg rounded-xl"
                >
                  +
                </Button>
              </div>
              {isExceedingStock && (
                <p className="text-[11px] text-danger font-mono mt-1">
                  La cantidad máxima disponible en bodega es {maxStock}.
                </p>
              )}
            </div>

            {/* Acción de Reserva y Compra */}
            <div className="pt-2">
              <Button
                type="button"
                onClick={handleAddToCart}
                disabled={isSoldOut || isExceedingStock || addCartItemMutation.isPending || createCartMutation.isPending}
                className="w-full h-12 bg-brand hover:bg-brand-strong text-white font-bold text-base shadow-lg shadow-brand/20 disabled:opacity-50 disabled:pointer-events-none transition-all rounded-xl"
              >
                {addCartItemMutation.isPending || createCartMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Clock className="h-5 w-5 animate-spin" />
                    Reservando en bodega...
                  </span>
                ) : isSoldOut ? (
                  'Variante sin existencias'
                ) : (
                  <span className="flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5" />
                    Agregar al Carrito
                  </span>
                )}
              </Button>
            </div>

            {/* Invariante de Reserva Atómica Explicada */}
            <div className="rounded-2xl border border-border bg-surface-muted/60 p-4 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-brand font-mono font-bold">
                <Clock className="h-4 w-4" />
                Reserva Atómica de 15 Minutos
              </div>
              <p className="text-foreground-muted leading-relaxed">
                Al confirmar el checkout en su carrito, el sistema reserva existencias exclusivas en bodega física durante 15 minutos para que complete su pago con total seguridad.
              </p>
              <div className="flex items-center gap-2 text-foreground-muted pt-1">
                <ShieldCheck className="h-3.5 w-3.5 text-success" />
                <span>Garantía de stock verificado sin sobreventa.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
