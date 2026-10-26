import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from '@tanstack/react-router';
import { useProductQuery, useTrackProductViewMutation } from '../../application/services/catalog';
import {
  useOrdersQuery,
  useCreateCartMutation,
  useAddCartItemMutation,
} from '../../application/services/orders';
import { getDefaultSession } from '../../application/services';
import { ProductType, type ProductVariant } from '../../domain';
import { getProductImageUrl, getProductImageUrls, saveRecentlyViewedProduct } from './productImages';
import { addGuestCartItem, setPendingGuestCheckout } from './guestCart';
import { ProductGallery } from './components/ProductGallery';
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
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Truck,
  RotateCcw,
  Zap,
} from 'lucide-react';

/**
 * Etiqueta legible de una variante para el comprador.
 *
 * Se apoya en los atributos que cargó el vendedor (Color, Talla, Capacidad…).
 * Sin atributos cae a un ordinal neutro: el SKU es un dato logístico y no se
 * muestra en la ficha (queda disponible en el `title` de la fila).
 */
function variantLabel(variant: ProductVariant, index: number): string {
  const attrs = (variant.attributes ?? []).filter((attr) => attr.name !== '__price__');
  if (attrs.length > 0) {
    return attrs.map((attr) => `${attr.name}: ${attr.value}`).join(' · ');
  }
  return `Opción ${index + 1}`;
}

/**
 * Ficha de detalle del producto para el comprador (Frontend-Role-Modules §2.4).
 *
 * Una sola superficie elevada (el buy box): la galería, la descripción y las
 * condiciones se separan con jerarquía y divisores, no con cajas anidadas.
 */
export function BuyerProductDetailPage() {
  const { productId } = useParams({ strict: false }) as { productId?: string };
  const navigate = useNavigate();

  const session = getDefaultSession();
  const isTestEnvironment = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
  const hasActiveSession = Boolean(session && session.getAccessToken() !== null);

  const { data: product, isLoading, isError, error } = useProductQuery(productId ?? '');
  const { data: cartOrders } = useOrdersQuery('Cart', undefined, {
    enabled: isTestEnvironment || hasActiveSession,
  });

  const createCartMutation = useCreateCartMutation();
  const addCartItemMutation = useAddCartItemMutation();

  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );

  const variants = product?.variants ?? [];
  const activeVariant =
    variants.find((v: ProductVariant) => v.id === selectedVariantId) ?? variants[0];

  const availableStock = activeVariant?.availableStock;
  const maxStock = availableStock !== undefined ? availableStock : 999;
  const isSoldOut =
    !activeVariant ||
    !activeVariant.canBeSold ||
    (availableStock !== undefined && availableStock <= 0);
  const isExceedingStock = quantity > maxStock;

  const trackProductView = useTrackProductViewMutation();

  useEffect(() => {
    if (product) {
      if (hasActiveSession) {
        trackProductView.mutate(product.id);
      } else {
        saveRecentlyViewedProduct(product);
      }
    }
  }, [product, hasActiveSession, trackProductView]);

  const unitPrice = activeVariant?.price ?? product?.price ?? 0;

  const handleAddToCart = async () => {
    if (!activeVariant || !activeVariant.canBeSold || !product) return;

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

    if (!isTestEnvironment && !hasActiveSession) {
      addGuestCartItem({
        variantId: activeVariant.id,
        productId: product.id,
        productName: product.name,
        sku: activeVariant.sku,
        unitPrice,
        currency: product.currency ?? 'COP',
        quantity,
        imageUrl: getProductImageUrl(product),
      });
      setFeedback({
        type: 'success',
        message: `¡${quantity} unidad(es) de ${product.name} agregada(s) a tu carrito! Solo te pediremos iniciar sesión cuando decidas pagar.`,
      });
      return;
    }

    try {
      let activeCartId = cartOrders?.[0]?.id ?? null;
      if (!activeCartId) {
        activeCartId = await createCartMutation.mutateAsync();
      }

      await addCartItemMutation.mutateAsync({
        orderId: activeCartId,
        variantId: activeVariant.id,
        quantity,
      });

      setFeedback({
        type: 'success',
        message: `¡${quantity} unidad(es) de ${product.name} agregada(s) al carrito con reserva de stock!`,
      });
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'No fue posible agregar el ítem al carrito.';
      setFeedback({ type: 'error', message: errorMsg });
    }
  };

  const [isBuyingNow, setIsBuyingNow] = useState(false);

  const handleBuyNow = async () => {
    if (!activeVariant || !activeVariant.canBeSold || !product) return;

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

    setIsBuyingNow(true);
    setFeedback(null);

    try {
      if (!isTestEnvironment && !hasActiveSession) {
        addGuestCartItem({
          variantId: activeVariant.id,
          productId: product.id,
          productName: product.name,
          sku: activeVariant.sku,
          unitPrice,
          currency: product.currency ?? 'COP',
          quantity,
          imageUrl: getProductImageUrl(product),
        });
        setPendingGuestCheckout(true);
        navigate({
          to: '/login',
          search: {
            redirect: '/buyer/cart',
            aviso: 'confirmar-compra',
          } as never,
        });
        return;
      }

      let activeCartId = cartOrders?.[0]?.id ?? null;
      if (!activeCartId) {
        activeCartId = await createCartMutation.mutateAsync();
      }

      await addCartItemMutation.mutateAsync({
        orderId: activeCartId,
        variantId: activeVariant.id,
        quantity,
      });

      navigate({ to: '/buyer/cart' });
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'No fue posible procesar la compra directa.';
      setFeedback({ type: 'error', message: errorMsg });
    } finally {
      setIsBuyingNow(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8 w-full max-w-full">
        <Skeleton className="h-4 w-40 bg-surface-muted" />
        <Skeleton className="h-9 w-2/3 bg-surface-muted" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <Skeleton className="lg:col-span-7 aspect-[4/3] rounded-xl bg-surface-muted" />
          <Skeleton className="lg:col-span-5 h-96 rounded-2xl bg-surface-muted" />
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="p-4 sm:p-8 lg:p-10 max-w-4xl mx-auto w-full space-y-4">
        <Link to="/buyer/catalog">
          <Button
            variant="outline"
            size="sm"
            className="border-border text-foreground-muted hover:text-foreground transition-all active:scale-[0.98]"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Volver al Catálogo
          </Button>
        </Link>
        <Alert variant="destructive" className="border-danger/30 bg-danger/10 text-danger">
          <AlertCircle className="h-5 w-5 text-danger" />
          <AlertTitle>Error al cargar el producto</AlertTitle>
          <AlertDescription>
            {error instanceof Error
              ? error.message
              : 'El producto solicitado no existe o no está publicado.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const images = getProductImageUrls(product);
  const totalPrice = unitPrice * quantity;
  const isPhysical = product.type === ProductType.Physical;
  const conditions = [
    {
      icon: ShieldCheck,
      title: 'Garantía oficial',
      detail: '12 meses de cobertura directa Zentric con soporte técnico.',
    },
    {
      icon: Truck,
      title: 'Despacho trazable',
      detail: 'Empaque sellado y número de guía en tiempo real.',
    },
    {
      icon: RotateCcw,
      title: 'Devolución simple',
      detail: 'Inspección en bodega y reembolso directo.',
    },
  ];

  return (
    <article className="w-full max-w-full space-y-8">
      {/* Navegación */}
      <div className="flex items-center justify-between gap-4">
        <Link to="/buyer/catalog">
          <Button
            variant="ghost"
            size="sm"
            className="text-foreground-muted hover:text-foreground -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Catálogo
          </Button>
        </Link>
        <Link to="/buyer/cart">
          <Button variant="outline" size="sm" className="border-border text-brand">
            <ShoppingBag className="h-4 w-4 mr-2" />
            Carrito
          </Button>
        </Link>
      </div>

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
          <AlertTitle>
            {feedback.type === 'success' ? 'Operación Exitosa' : 'Aviso de Compra'}
          </AlertTitle>
          <AlertDescription className="text-xs mt-1">{feedback.message}</AlertDescription>
        </Alert>
      )}

      {/* Encabezado */}
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={
              isPhysical
                ? 'border-brand/30 text-brand bg-brand/5'
                : 'border-info/30 text-info bg-info/5'
            }
          >
            {isPhysical ? (
              <span className="flex items-center gap-1">
                <Package className="h-3 w-3" /> Producto Físico
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <FileCode className="h-3 w-3" /> Producto Digital
              </span>
            )}
          </Badge>
          <span className="text-xs text-foreground-muted">Marketplace verificado</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.02em] text-foreground leading-[1.1] max-w-[22ch]">
          {product.name}
        </h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* Galería, descripción y condiciones */}
        <div className="lg:col-span-7 space-y-8">
          <ProductGallery key={product.id} images={images} alt={product.name} />

          <section className="space-y-2.5">
            <h2 className="text-lg font-semibold text-foreground">Descripción</h2>
            <p className="text-[15px] leading-relaxed text-foreground-muted max-w-[68ch] whitespace-pre-line">
              {product.description || 'Sin descripción detallada provista por el vendedor.'}
            </p>
          </section>

          <section className="border-t border-border pt-2">
            <dl className="divide-y divide-border">
              {conditions.map((condition) => (
                <div key={condition.title} className="flex gap-3 py-3.5">
                  <condition.icon className="h-4 w-4 mt-0.5 shrink-0 text-brand" aria-hidden="true" />
                  <div className="space-y-0.5">
                    <dt className="text-sm font-medium text-foreground">{condition.title}</dt>
                    <dd className="text-xs leading-relaxed text-foreground-muted">
                      {condition.detail}
                    </dd>
                  </div>
                </div>
              ))}
            </dl>
          </section>
        </div>

        {/* Buy box: la única superficie elevada de la ficha */}
        <aside className="lg:col-span-5">
          <div className="surface-hairline rounded-2xl p-6 sm:p-7 space-y-6 lg:sticky lg:top-20">
            <div className="space-y-1">
              <div className="text-3xl font-bold tabular-nums text-foreground">
                ${unitPrice.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-foreground-muted">
                {quantity > 1 ? (
                  <>
                    {quantity} × ${unitPrice.toLocaleString('es-CO')} · Total{' '}
                    <span className="font-semibold text-foreground tabular-nums">
                      ${totalPrice.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                    </span>
                  </>
                ) : (
                  'Impuestos incluidos · Precio unitario'
                )}
              </p>
            </div>

            {variants.length > 0 && (
              <fieldset className="space-y-2.5 border-t border-border pt-5">
                <legend className="text-sm font-semibold text-foreground mb-2.5">
                  Elegí tu variante
                </legend>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
                  {variants.map((variant: ProductVariant, index: number) => {
                    const isSelected = activeVariant?.id === variant.id;
                    const stock = variant.availableStock;
                    const inStock = variant.canBeSold && (stock === undefined || stock > 0);
                    const label = variantLabel(variant, index);

                    return (
                      <label
                        key={variant.id}
                        title={`SKU ${variant.sku}`}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand ${
                          isSelected
                            ? 'border-brand bg-brand/5'
                            : 'border-border hover:border-brand/40'
                        } ${inStock ? '' : 'opacity-70'}`}
                      >
                        <input
                          type="radio"
                          name="producto-variante"
                          className="sr-only"
                          checked={isSelected}
                          onChange={() => setSelectedVariantId(variant.id)}
                          aria-label={label}
                        />
                        <span
                          aria-hidden="true"
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                            isSelected ? 'border-brand' : 'border-border'
                          }`}
                        >
                          {isSelected && <span className="h-2 w-2 rounded-full bg-brand" />}
                        </span>

                        <span className="min-w-0 flex-1 space-y-1">
                          <span className="block truncate text-sm font-medium text-foreground">
                            {label}
                          </span>
                          <span className="flex items-center gap-2">
                            {inStock ? (
                              <Badge className="bg-success/15 text-success border-success/30 text-[10px]">
                                Disponible
                              </Badge>
                            ) : (
                              <Badge className="bg-danger/15 text-danger border-danger/30 text-[10px]">
                                Agotado
                              </Badge>
                            )}
                            {inStock && stock !== undefined && (
                              <span className="text-[11px] text-foreground-muted">
                                {stock} unid.
                              </span>
                            )}
                          </span>
                        </span>

                        <span className="shrink-0 text-sm font-medium tabular-nums text-foreground">
                          ${(variant.price ?? product.price).toLocaleString('es-CO')}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            )}

            <div className="flex items-center justify-between text-sm border-t border-border pt-5">
              <span className="text-foreground-muted">Disponibilidad</span>
              {isSoldOut ? (
                <span className="font-medium text-danger">Sin stock</span>
              ) : (
                <span className="font-medium text-success">
                  {availableStock !== undefined
                    ? `${availableStock} unidades`
                    : 'Stock verificado'}
                </span>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="quantity-input" className="text-sm font-medium text-foreground">
                  Cantidad
                </label>
                {availableStock !== undefined && (
                  <span className="text-[11px] text-foreground-muted">
                    Máximo {availableStock}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1 || isSoldOut}
                  className="border-border text-foreground hover:bg-surface-muted h-10 w-10 p-0 text-lg rounded-xl"
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
                  className="w-20 text-center font-medium text-base text-foreground bg-surface-muted border-border h-10 rounded-xl focus:border-brand"
                />
                <span className="sr-only">{quantity}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity((q) => Math.min(maxStock, q + 1))}
                  disabled={quantity >= maxStock || isSoldOut}
                  className="border-border text-foreground hover:bg-surface-muted h-10 w-10 p-0 text-lg rounded-xl"
                >
                  +
                </Button>
              </div>
              {isExceedingStock && (
                <p className="text-[11px] text-danger">
                  La cantidad máxima disponible en bodega es {maxStock}.
                </p>
              )}
            </div>

            <div className="space-y-2.5 border-t border-border pt-5">
              <Button
                type="button"
                onClick={handleBuyNow}
                disabled={
                  isSoldOut ||
                  isExceedingStock ||
                  isBuyingNow ||
                  addCartItemMutation.isPending ||
                  createCartMutation.isPending
                }
                className="w-full h-12 bg-brand hover:bg-brand-strong text-primary-foreground font-semibold text-base shadow-sm disabled:opacity-50 disabled:pointer-events-none transition-all active:scale-[0.99] rounded-xl flex items-center justify-center gap-2"
              >
                {isBuyingNow ? (
                  <span className="flex items-center gap-2">
                    <Clock className="h-5 w-5 animate-spin" />
                    Iniciando compra...
                  </span>
                ) : isSoldOut ? (
                  'Agotado en Bodega'
                ) : (
                  <span className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Comprar Ahora
                  </span>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleAddToCart}
                disabled={
                  isSoldOut ||
                  isExceedingStock ||
                  isBuyingNow ||
                  addCartItemMutation.isPending ||
                  createCartMutation.isPending
                }
                className="w-full h-11 border-brand/40 text-brand hover:bg-brand/5 font-medium text-sm disabled:opacity-50 transition-all active:scale-[0.99] rounded-xl flex items-center justify-center gap-2"
              >
                {addCartItemMutation.isPending || createCartMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4 animate-spin" />
                    Reservando en bodega...
                  </span>
                ) : isSoldOut ? (
                  'Variante sin existencias'
                ) : (
                  <span className="flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4" />
                    Agregar al Carrito
                  </span>
                )}
              </Button>
            </div>

            <p className="text-[11px] leading-relaxed text-foreground-muted border-t border-border pt-4">
              Al pasar a pagar, el inventario queda reservado en bodega durante 15 minutos para
              completar el pago sin riesgo de sobreventa.
            </p>
          </div>
        </aside>
      </div>
    </article>
  );
}
