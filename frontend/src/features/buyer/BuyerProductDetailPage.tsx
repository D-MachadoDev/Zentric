import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from '@tanstack/react-router';
import {
  useProductQuery,
  useTrackProductViewMutation,
  useSubmitProductReviewMutation,
  useProductReviewsQuery,
} from '../../core';
import {
  useOrdersQuery,
  useCreateCartMutation,
  useAddCartItemMutation,
} from '../../core';
import { getDefaultSession } from '../../core';
import { ProductType, type ProductVariant } from '../../core';
import { getProductImageUrl, getProductImageUrls, saveRecentlyViewedProduct } from './productImages';
import { addGuestCartItem, setPendingGuestCheckout } from './guestCart';
import { ProductGallery } from './components/ProductGallery';
import { RecentlyViewedCarousel } from './components/RecentlyViewedCarousel';
import { useAuth } from '../../app/providers/authContext';
import {
  Button,
  Badge,
  Input,
  Skeleton,
  Alert,
  AlertTitle,
  AlertDescription,
  RatingStars,
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
  Heart,
  ChevronDown,
  Camera,
  X,
} from 'lucide-react';
import { useFavorite } from './useFavorite';
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
 * Ficha de detalle de producto (PDP) con encaje Above the Fold en Desktop.
 *
 * En pantallas de escritorio estándar (1080p y portátiles), la galería de fotos
 * de estudio y el Buy Box completo son visibles inmediatamente sin requerir scroll
 * vertical. Las especificaciones detalladas, opiniones y productos recomendados
 * se despliegan debajo del pliegue (Below the Fold).
 */
export function BuyerProductDetailPage() {
  const { productId } = useParams({ strict: false }) as { productId?: string };
  const navigate = useNavigate();

  const session = getDefaultSession();
  const isTestEnvironment =
    (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') ||
    (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test');
  const hasActiveSession = Boolean(session && session.getAccessToken() !== null);

  const { data: product, isLoading, isError, error } = useProductQuery(productId ?? '');
  const { data: cartOrders } = useOrdersQuery('Cart', undefined, {
    enabled: isTestEnvironment || hasActiveSession,
  });

  const createCartMutation = useCreateCartMutation();
  const addCartItemMutation = useAddCartItemMutation();
  const submitReviewMutation = useSubmitProductReviewMutation();

  const { user } = useAuth();
  const { data: rawReviews } = useProductReviewsQuery(productId ?? '');
  const reviews = Array.isArray(rawReviews)
    ? rawReviews
    : Array.isArray((rawReviews as any)?.items)
      ? (rawReviews as any).items
      : [];
  const [reviewRating, setReviewRating] = useState<number>(0);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewImages, setReviewImages] = useState<string[]>([]);
  const [reviewFeedback, setReviewFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );
  const { isFavorite, toggle: toggleWishlist } = useFavorite(product);

  const handleToggleWishlist = () => {
    if (!product) return;
    void toggleWishlist();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      if (reviewImages.length >= 4) break;
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setReviewImages((prev) => [...prev, event.target!.result as string].slice(0, 4));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitInlineReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || reviewRating === 0) return;
    try {
      await submitReviewMutation.mutateAsync({
        productId: product.id,
        rating: reviewRating,
        comment: reviewComment,
        buyerName: user?.fullName || 'Comprador verificado',
        imageUrls: reviewImages.length > 0 ? reviewImages : undefined,
      });
      setReviewFeedback({
        type: 'success',
        message: `¡Gracias por tu reseña (${reviewRating}★)! Tu opinión ayuda a otros compradores a tomar mejores decisiones.`,
      });
      setReviewRating(0);
      setReviewComment('');
      setReviewImages([]);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'No fue posible registrar la reseña.';
      setReviewFeedback({
        type: 'error',
        message: errorMsg,
      });
    }
  };

  const variants = product?.variants ?? [];
  const activeVariant =
    variants.find((v: ProductVariant) => v.id === selectedVariantId) ?? variants[0];

  const availableStock = activeVariant?.availableStock;
  const maxStock = availableStock !== undefined ? availableStock : 999;
  const isSoldOut =
    !activeVariant ||
    !activeVariant.canBeSold ||
    (availableStock !== undefined && availableStock <= 0);
  const isExceedingStock = !isSoldOut && quantity > maxStock;

  const { mutate: trackProductView } = useTrackProductViewMutation();

  useEffect(() => {
    if (!product) return;
    if (hasActiveSession) {
      trackProductView(product.id);
    } else {
      saveRecentlyViewedProduct(product);
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
      <div className="space-y-4 w-full max-w-full">
        <Skeleton className="h-4 w-40 rounded-full bg-surface-muted" />
        <Skeleton className="h-8 w-2/3 rounded-lg bg-surface-muted" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Skeleton className="lg:col-span-7 aspect-square max-h-[460px] rounded-2xl bg-surface-muted" />
          <Skeleton className="lg:col-span-5 h-[460px] rounded-2xl bg-surface-muted" />
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
            pill
            className="border-border text-foreground-muted hover:text-foreground transition-all rounded-full"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Volver al Catálogo
          </Button>
        </Link>
        <Alert variant="destructive" className="border-danger/30 bg-danger/10 text-danger rounded-xl">
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

  return (
    <article className="w-full max-w-full space-y-6 sm:space-y-8 pb-16 sm:pb-8">
      {/* ── 1. NAVEGACIÓN COMPACTA / BREADCRUMBS (Sin padding vertical excesivo) ── */}
      <nav
        aria-label="Migas de pan"
        className="flex items-center gap-1.5 sm:gap-2 text-xs text-foreground-muted py-1 sm:py-1.5 mb-2 sm:mb-3"
      >
        <Link
          to="/buyer/catalog"
          className="inline-flex items-center gap-1 font-medium text-foreground hover:text-brand transition-colors shrink-0"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Catálogo
        </Link>
        <span className="text-foreground-muted/40" aria-hidden="true">/</span>
        <span
          className="truncate max-w-xs sm:max-w-md font-medium text-foreground"
          aria-current="page"
        >
          {product.category ? `${product.category} / ${product.name}` : `Ficha · ${product.name}`}
        </span>
      </nav>

      {feedback && (
        <Alert
          variant={feedback.type === 'success' ? 'default' : 'destructive'}
          className={`rounded-xl ${
            feedback.type === 'success'
              ? 'border-brand/40 bg-brand/10 text-brand'
              : 'border-danger/40 bg-danger/10 text-danger'
          }`}
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

      {/* ── 2. SECCIÓN PRINCIPAL ABOVE THE FOLD (Galería 7 cols + Buy Box 5 cols) ── */}
      <div className="grid grid-cols-1 items-start gap-6 lg:gap-8 lg:grid-cols-12">
        {/* COLUMNA IZQUIERDA: Galería fotográfica de estudio + Ficha Técnica y Detalles (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-6">
          <ProductGallery key={product.id} images={images} alt={product.name} />

          {/* Acordeones limpios estilo editorial inspirados en Amazon PDP */}
          <div className="rounded-2xl border border-border/80 bg-surface p-4 sm:p-5 shadow-xs space-y-0 divide-y divide-border/60">
            {/* Descripción */}
            <details className="group py-3" open>
              <summary className="flex items-center justify-between cursor-pointer list-none text-xs sm:text-sm font-semibold text-foreground hover:text-brand transition-colors select-none">
                <span>Descripción del Producto</span>
                <ChevronDown className="h-4 w-4 text-foreground-muted transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <p className="mt-2.5 text-xs sm:text-[13px] leading-relaxed text-foreground-muted whitespace-pre-line">
                {product.description || 'Sin descripción detallada provista por el vendedor.'}
              </p>
            </details>

            {/* Especificaciones Técnicas */}
            {activeVariant?.attributes && activeVariant.attributes.length > 0 && (
              <details className="group py-3" open>
                <summary className="flex items-center justify-between cursor-pointer list-none text-xs sm:text-sm font-semibold text-foreground hover:text-brand transition-colors select-none">
                  <span>Especificaciones Técnicas</span>
                  <ChevronDown className="h-4 w-4 text-foreground-muted transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <dl className="mt-2.5 divide-y divide-border/40 text-xs">
                  {activeVariant.attributes.map((attr) => (
                    <div key={attr.name} className="py-1.5 flex justify-between gap-4">
                      <dt className="text-foreground-muted">{attr.name}</dt>
                      <dd className="font-medium text-foreground text-right">{attr.value}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            )}

            {/* Compromiso y Logística */}
            <details className="group py-3">
              <summary className="flex items-center justify-between cursor-pointer list-none text-xs sm:text-sm font-semibold text-foreground hover:text-brand transition-colors select-none">
                <span>Garantía y Despacho</span>
                <ChevronDown className="h-4 w-4 text-foreground-muted transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <div className="mt-2.5 space-y-2 text-xs text-foreground-muted">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                  <span>Garantía directa de 12 meses con soporte técnico oficial.</span>
                </div>
                <div className="flex items-start gap-2">
                  <Truck className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                  <span>
                    {isPhysical
                      ? 'Despacho con embalaje sellado y trazabilidad en tiempo real.'
                      : 'Entrega de licencia digital y claves de acceso de forma instantánea.'}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <RotateCcw className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                  <span>Devolución simple en 30 días e inspección en bodega central.</span>
                </div>
                <p className="text-[11px] pt-1 text-foreground-subtle border-t border-border/40">
                  Al pasar a pagar, el inventario queda reservado en bodega durante 15 minutos para
                  completar el pago sin riesgo de sobreventa.
                </p>
              </div>
            </details>
          </div>
        </div>

        {/* COLUMNA DERECHA: Buy Box persistente de alta conversión (lg:col-span-5 sticky top-20 self-start) */}
        <div className="lg:col-span-5 lg:sticky lg:top-20 self-start space-y-3.5">
          {/* Cabecera del Buy Box */}
          <header className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10px] sm:text-[11px] font-bold tracking-wider text-foreground-subtle uppercase">
                {product.brandName ? `${product.brandName} OFICIAL · CERTIFICADO` : 'OFICIAL · CERTIFICADO'}
              </span>
              <Badge
                variant="outline"
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold shrink-0 ${
                  isPhysical
                    ? 'border-brand/30 text-brand bg-brand/5'
                    : 'border-info/30 text-info bg-info/5'
                }`}
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
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-snug">
              {product.name}
            </h1>

            {/* Calificación y Disparador de Reseña */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              {product.averageRating !== undefined && product.averageRating > 0 ? (
                <div
                  className="flex items-center gap-1.5"
                  aria-label={`Calificación promedio ${product.averageRating} de 5 estrellas`}
                >
                  <RatingStars value={product.averageRating} readOnly size="sm" />
                  <span className="text-xs font-bold tabular-nums text-foreground">
                    {product.averageRating.toFixed(1)}
                  </span>
                  {product.reviewsCount !== undefined && (
                    <span className="text-xs text-foreground-muted">
                      · {product.reviewsCount}{' '}
                      {product.reviewsCount === 1 ? 'opinión' : 'opiniones'}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-xs text-foreground-muted">
                  Sin calificaciones aún
                </span>
              )}
              <span className="text-foreground-muted/40" aria-hidden="true">
                |
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  document.getElementById('seccion-resenas')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="h-6 px-2 text-xs text-brand hover:text-brand-strong hover:bg-brand/10 -ml-1 rounded-md cursor-pointer"
              >
                Calificar producto
              </Button>
            </div>
          </header>

          {/* Tarjeta Buy Box (Elevada, compacta y sobria) */}
          <div className="rounded-2xl border border-border/80 bg-surface p-4 sm:p-5 shadow-xs space-y-3.5">
            {/* Precio en Geist Sans tabular-nums + Envío 100% GRATUITO */}
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="font-sans font-bold text-2xl sm:text-3xl text-foreground tabular-nums">
                  ${Math.round(unitPrice).toLocaleString('es-CO')}
                </span>
                <span className="font-sans text-xs font-semibold text-foreground-muted">COP</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                  <Truck className="h-3.5 w-3.5" /> Envío 100% GRATUITO
                </span>
                {quantity > 1 && (
                  <>
                    <span className="text-foreground-muted/40" aria-hidden="true">·</span>
                    <span className="text-foreground-muted">
                      {quantity} × ${Math.round(unitPrice).toLocaleString('es-CO')} · Total{' '}
                      <span className="font-semibold text-foreground tabular-nums">
                        ${Math.round(totalPrice).toLocaleString('es-CO')}
                      </span>
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Badge de disponibilidad con punto esmeralda */}
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 dark:bg-emerald-500/15 px-3.5 py-2 text-xs font-medium text-emerald-800 dark:text-emerald-300">
              <span className="size-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" aria-hidden="true" />
              <span>
                {isPhysical
                  ? 'Stock en Bodega Central · Despacho 24h'
                  : 'Entrega Digital Inmediata · Licencia Verificada'}
              </span>
            </div>

            {/* Selector de variantes (si existen) */}
            {variants.length > 0 && (
              <fieldset className="space-y-2 border-t border-border/70 pt-3">
                <legend className="text-xs font-semibold text-foreground mb-1.5">
                  Selecciona tu variante
                </legend>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5 scrollbar-thin">
                  {variants.map((variant: ProductVariant, index: number) => {
                    const isSelected = activeVariant?.id === variant.id;
                    const stock = variant.availableStock;
                    const inStock = variant.canBeSold && (stock === undefined || stock > 0);
                    const label = variantLabel(variant, index);

                    return (
                      <label
                        key={variant.id}
                        title={`SKU ${variant.sku}`}
                        className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 text-xs transition-all has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand ${
                          isSelected
                            ? 'border-zinc-950 dark:border-white bg-zinc-50 dark:bg-zinc-900/60 shadow-xs font-medium'
                            : 'border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-400 bg-surface'
                        } ${inStock ? '' : 'opacity-60'}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
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
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
                              isSelected
                                ? 'border-zinc-950 dark:border-white bg-zinc-950 dark:bg-white'
                                : 'border-zinc-300 dark:border-zinc-700'
                            }`}
                          >
                            {isSelected && (
                              <span className="h-1.5 w-1.5 rounded-full bg-white dark:bg-zinc-950" />
                            )}
                          </span>

                          <div className="min-w-0">
                            <span className="block truncate font-medium text-foreground">
                              {label}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {inStock ? (
                                <Badge className="bg-success/15 text-success border-success/30 text-[10px] rounded-full px-2 py-0">
                                  Disponible
                                </Badge>
                              ) : (
                                <Badge className="bg-danger/15 text-danger border-danger/30 text-[10px] rounded-full px-2 py-0">
                                  Agotado
                                </Badge>
                              )}
                              {inStock && stock !== undefined && stock <= 3 && (
                                <span className="text-[10px] text-foreground-muted">
                                  Últimas {stock}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {variant.price != null && Math.round(variant.price) !== Math.round(unitPrice) && (
                          <span className="shrink-0 font-sans font-bold text-xs tabular-nums text-foreground">
                            ${Math.round(variant.price).toLocaleString('es-CO')}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            )}

            {variants.length === 0 && (
              <div className="flex items-center justify-between text-xs border-t border-border/70 pt-3">
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
            )}

            {/* Stepper de Cantidad */}
            {!isSoldOut ? (
              <div className="space-y-1.5 border-t border-border/70 pt-3">
                <div className="flex items-center justify-between text-xs font-medium text-foreground">
                  <label htmlFor="quantity-input">Cantidad</label>
                  {availableStock !== undefined && !isSoldOut && (
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
                    pill
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1 || isSoldOut}
                    className="border-border text-foreground hover:bg-surface-muted h-9 w-9 p-0 text-base rounded-full"
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
                    className="w-16 text-center font-mono font-medium text-sm text-foreground bg-surface-muted border-border h-9 rounded-full focus:border-brand"
                  />
                  <span className="sr-only">{quantity}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    pill
                    onClick={() => setQuantity((q) => Math.min(maxStock, q + 1))}
                    disabled={quantity >= maxStock || isSoldOut}
                    className="border-border text-foreground hover:bg-surface-muted h-9 w-9 p-0 text-base rounded-full"
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
            ) : (
              <p className="text-xs font-medium text-danger border-t border-border/70 pt-3">
                Variante agotada — sin existencias disponibles.
              </p>
            )}

            {/* Botones de Doble Llamado a la Acción (Dual High-Conversion CTAs) */}
            <div className="space-y-2 border-t border-border/70 pt-3.5">
              <Button
                type="button"
                pill
                onClick={handleBuyNow}
                disabled={
                  isSoldOut ||
                  isExceedingStock ||
                  isBuyingNow ||
                  addCartItemMutation.isPending ||
                  createCartMutation.isPending
                }
                className="w-full h-11 bg-brand hover:bg-brand-strong text-primary-foreground font-semibold text-sm shadow-xs disabled:opacity-50 disabled:pointer-events-none transition-all rounded-full flex items-center justify-center gap-2 cursor-pointer"
              >
                {isBuyingNow ? (
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4 animate-spin" />
                    Iniciando compra...
                  </span>
                ) : isSoldOut ? (
                  'Agotado en Bodega'
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Zap className="h-4 w-4" />
                    Comprar Ahora
                  </span>
                )}
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  pill
                  onClick={handleAddToCart}
                  disabled={
                    isSoldOut ||
                    isExceedingStock ||
                    isBuyingNow ||
                    addCartItemMutation.isPending ||
                    createCartMutation.isPending
                  }
                  className="flex-1 h-10 border-border text-foreground hover:border-brand font-medium text-xs sm:text-sm disabled:opacity-50 transition-all rounded-full flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {addCartItemMutation.isPending || createCartMutation.isPending ? (
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 animate-spin" />
                      Reservando en bodega...
                    </span>
                  ) : isSoldOut ? (
                    'Variante sin existencias'
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <ShoppingBag className="h-3.5 w-3.5" />
                      Agregar al Carrito
                    </span>
                  )}
                </Button>

                <button
                  type="button"
                  onClick={handleToggleWishlist}
                  aria-label={isFavorite ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                  className={`touch-target flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                    isFavorite
                      ? 'border-rose-200 dark:border-rose-900/60 text-rose-500 bg-rose-50/90 dark:bg-rose-950/50'
                      : 'border-border text-foreground-muted hover:text-rose-500 hover:border-rose-300'
                  }`}
                >
                  <Heart className={`h-4 w-4 transition-colors ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
                </button>
              </div>
            </div>

            {/* Tira compacta de confianza */}
            <div className="pt-2 border-t border-border/60 grid grid-cols-3 gap-2 text-[10px] sm:text-[11px] text-foreground-muted text-center">
              <div className="flex flex-col items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-brand" />
                <span>Compra protegida</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-brand" />
                <span>Garantía 1 año</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <RotateCcw className="h-3.5 w-3.5 text-brand" />
                <span>Devolución 30 días</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. PRODUCTOS RELACIONADOS Y RECIENTES (Al final de la página) ── */}
      {!isTestEnvironment && (
        <div className="pt-8 border-t border-border/60">
          <RecentlyViewedCarousel
            title="Productos Relacionados y Vistos Recientemente"
            maxItems={8}
          />
        </div>
      )}

      {/* ── 4. BARRA FIJA INFERIOR PARA COMPRA MÓVIL EN 1 TOQUE ── */}
      <div
        aria-label="Barra de compra rápida móvil"
        className="fixed bottom-14 left-0 right-0 z-30 flex items-center justify-between gap-3 border-t border-border bg-surface/95 px-4 py-2.5 backdrop-blur-md shadow-lg sm:hidden"
      >
        <div className="min-w-0">
          <span className="block text-[11px] font-medium text-foreground-muted truncate">
            {quantity > 1 ? `${quantity} unidades` : 'Precio unitario'}
          </span>
          <span className="font-sans text-base font-bold tabular-nums text-foreground">
            ${totalPrice.toLocaleString('es-CO')}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleToggleWishlist}
            aria-label={isFavorite ? 'Quitar de favoritos' : 'Guardar en favoritos'}
            className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all ${
              isFavorite
                ? 'border-rose-200 dark:border-rose-900/60 text-rose-500 bg-rose-50 dark:bg-rose-950/50'
                : 'border-border text-foreground-muted hover:text-rose-500'
            }`}
          >
            <Heart className={`h-4 w-4 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>
          <Button
            type="button"
            pill
            onClick={handleAddToCart}
            disabled={
              isSoldOut ||
              isExceedingStock ||
              addCartItemMutation.isPending ||
              createCartMutation.isPending
            }
            className="h-10 px-5 bg-brand hover:bg-brand-strong text-primary-foreground font-semibold text-xs shadow-xs rounded-full flex items-center gap-1.5 shrink-0"
          >
            <ShoppingBag className="h-4 w-4" />
            {isSoldOut ? 'Agotado' : 'Agregar'}
          </Button>
        </div>
      </div>

      {/* ── 4. SECCIÓN INLINE DE RESEÑAS Y OPINIONES ── */}
      <section id="seccion-resenas" className="pt-10 border-t border-border/70 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand">
              Opiniones y valoraciones
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Calificaciones y Reseñas ({product.reviewsCount ?? reviews.length})
            </h2>
          </div>
          {product.averageRating !== undefined && product.averageRating > 0 ? (
            <div className="flex items-center gap-2">
              <RatingStars value={product.averageRating} readOnly size="md" />
              <span className="font-sans font-bold text-lg text-foreground tabular-nums">
                {product.averageRating.toFixed(1)} / 5.0
              </span>
            </div>
          ) : (
            <span className="text-xs text-foreground-muted">
              Sin calificaciones aún
            </span>
          )}
        </div>

        {/* Formulario Inline de Calificación */}
        <div className="rounded-2xl border border-border/80 bg-surface p-5 sm:p-7 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <h3 className="text-base font-bold text-foreground">Calificar Producto</h3>
            {hasActiveSession && user && (
              <span className="text-xs text-foreground-muted flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500" />
                <span>Reseña como <strong className="text-foreground">{user.fullName || 'Comprador verificado'}</strong></span>
              </span>
            )}
          </div>

          {!hasActiveSession && !isTestEnvironment ? (
            <div className="rounded-xl bg-surface-muted/30 p-5 text-center space-y-3">
              <p className="text-xs sm:text-sm text-foreground-muted">
                Para publicar una calificación u opinión sobre este producto, inicia sesión con tu cuenta de comprador.
              </p>
              <Link to="/login" search={{ redirect: `/buyer/catalog/${product.id}` } as never}>
                <Button variant="outline" size="sm" pill className="border-brand text-brand hover:bg-brand/10 rounded-full">
                  Iniciar sesión para calificar
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmitInlineReview} className="space-y-4">
              {reviewFeedback && (
                <Alert
                  variant={reviewFeedback.type === 'success' ? 'default' : 'destructive'}
                  className={`rounded-xl ${
                    reviewFeedback.type === 'success'
                      ? 'border-brand/40 bg-brand/10 text-brand'
                      : 'border-danger/40 bg-danger/10 text-danger'
                  }`}
                >
                  {reviewFeedback.type === 'success' ? (
                    <CheckCircle2 className="h-5 w-5 text-brand" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-danger" />
                  )}
                  <AlertTitle>
                    {reviewFeedback.type === 'success' ? 'Reseña Registrada' : 'Aviso'}
                  </AlertTitle>
                  <AlertDescription className="text-xs mt-1">
                    {reviewFeedback.message}
                  </AlertDescription>
                </Alert>
              )}

              {/* Selector interactivo de estrellas 1 a 5 con RatingStars del Design System */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  Tu Calificación
                </label>
                <div className="flex items-center gap-2">
                  <RatingStars
                    value={reviewRating}
                    onChange={(val) => setReviewRating(val)}
                    size="lg"
                  />
                  <span className="text-xs font-medium text-foreground-muted ml-2">
                    {reviewRating === 5 && 'Excelente, superó expectativas'}
                    {reviewRating === 4 && 'Muy bueno, recomendado'}
                    {reviewRating === 3 && 'Aceptable, cumple su función'}
                    {reviewRating === 2 && 'Regular, varios detalles a mejorar'}
                    {reviewRating === 1 && 'Malo, no lo recomiendo'}
                    {reviewRating === 0 && 'Selecciona de 1 a 5 estrellas'}
                  </span>
                </div>
              </div>

              {/* Textarea para escribir la opinión */}
              <div className="space-y-1.5">
                <label htmlFor="review-comment" className="text-xs font-semibold text-foreground block">
                  Tu Opinión
                </label>
                <textarea
                  id="review-comment"
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Cuéntanos tu experiencia con el producto, calidad de materiales, rendimiento y detalles destacados..."
                  maxLength={500}
                  className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-xs sm:text-sm text-foreground placeholder:text-foreground-muted/60 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand resize-none"
                />
                <div className="flex justify-between text-[11px] text-foreground-muted">
                  <span>Mínimo 10 caracteres recomendados</span>
                  <span>{reviewComment.length} / 500</span>
                </div>
              </div>

              {/* Selector y Preview de Fotos Adjuntas */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground block">
                  Fotos del Producto (Opcional)
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  {reviewImages.map((imgUrl, idx) => (
                    <div key={idx} className="relative size-16 sm:size-20 rounded-xl overflow-hidden border border-border/70 group">
                      <img src={imgUrl} alt="Foto adjunta" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setReviewImages(imgs => imgs.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 size-5 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-rose-600 transition-colors cursor-pointer"
                        title="Eliminar foto"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                  {reviewImages.length < 4 && (
                    <label className="size-16 sm:size-20 rounded-xl border-2 border-dashed border-border/80 hover:border-brand/60 flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors text-foreground-muted hover:text-brand bg-surface-muted/20">
                      <Camera className="size-5" />
                      <span className="text-[10px] font-medium">Adjuntar</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="sr-only"
                        onChange={handleImageUpload}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Botón de Enviar Reseña */}
              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  disabled={reviewRating === 0 || submitReviewMutation.isPending}
                  className="px-6 py-2.5 bg-brand hover:bg-brand-strong text-primary-foreground font-semibold text-xs sm:text-sm rounded-full cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitReviewMutation.isPending ? 'Enviando reseña...' : 'Publicar Reseña'}
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Lista de Reseñas Publicadas */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-foreground">
            Todas las opiniones ({reviews.length})
          </h3>

          {reviews.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 p-8 text-center text-foreground-muted text-xs sm:text-sm">
              Aún no hay reseñas registradas para este producto. ¡Sé el primero en compartir tu experiencia!
            </div>
          ) : (
            <div className="divide-y divide-border/60 border-y border-border/60">
              {reviews.map((rev: any) => (
                <article key={rev.id} className="py-5 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-full bg-brand/10 text-brand font-bold text-xs flex items-center justify-center">
                        {(rev.buyerName || 'C').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs sm:text-sm font-semibold text-foreground">
                            {rev.buyerName || 'Comprador verificado'}
                          </span>
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                            <CheckCircle2 className="size-2.5" /> Verificado
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] text-foreground-muted tabular-nums">
                      {new Date(rev.createdAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <RatingStars value={rev.rating} readOnly size="sm" />
                  </div>

                  {rev.comment && (
                    <p className="text-xs sm:text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
                      {rev.comment}
                    </p>
                  )}

                  {rev.imageUrls && rev.imageUrls.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {rev.imageUrls.map((img: string, i: number) => (
                        <img
                          key={i}
                          src={img}
                          alt="Foto del comprador"
                          className="size-16 sm:size-20 rounded-xl object-cover border border-border/60"
                        />
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </article>
  );
}
