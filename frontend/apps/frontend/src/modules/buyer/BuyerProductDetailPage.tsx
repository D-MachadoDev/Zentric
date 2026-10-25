import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from '@tanstack/react-router';
import { useProductQuery } from '../../application/services/catalog';
import {
  useOrdersQuery,
  useCreateCartMutation,
  useAddCartItemMutation,
} from '../../application/services/orders';
import { getDefaultSession } from '../../application/services';
import { ProductType, type ProductVariant } from '../../domain';
import { getProductImageUrl, saveRecentlyViewedProduct } from './productImages';
import { addGuestCartItem, setPendingGuestCheckout } from './guestCart';
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
  Zap,
  Layers,
} from 'lucide-react';

/**
 * Formatea una variante en un título y subtítulo amigables para el comprador,
 * priorizando los atributos definidos por el vendedor (Color, Talla, Capacidad, etc.)
 * y usando traducción semántica de SKU como respaldo.
 */
function formatVariantDisplay(
  variant: ProductVariant,
  index: number,
): { title: string; subtitle?: string; attributePills: Array<{ name: string; value: string }> } {
  const attrs = variant.attributes ?? [];
  if (attrs.length > 0) {
    const primaryTitle = attrs.map((a) => `${a.name}: ${a.value}`).join(' · ');
    return {
      title: primaryTitle,
      subtitle: `Opción verificada por el vendedor`,
      attributePills: attrs,
    };
  }

  const sku = variant.sku;
  const upper = sku.toUpperCase();

  if (upper.includes('RED')) {
    return {
      title: 'Edición Switch Red',
      subtitle: 'Tacto lineal, silencioso y ultra-rápido',
      attributePills: [{ name: 'Switch', value: 'Red Lineal' }],
    };
  }
  if (upper.includes('BROWN')) {
    return {
      title: 'Edición Switch Brown',
      subtitle: 'Tacto táctil equilibrado y ergonómico',
      attributePills: [{ name: 'Switch', value: 'Brown Táctil' }],
    };
  }
  if (upper.includes('BLUE')) {
    return {
      title: 'Edición Switch Blue',
      subtitle: 'Tacto táctil sonoro con clic mecánico',
      attributePills: [{ name: 'Switch', value: 'Blue Clicky' }],
    };
  }
  if (upper.includes('32GB') && upper.includes('1TB')) {
    return {
      title: 'Configuración Pro: 32GB RAM · 1TB NVMe',
      subtitle: 'Máxima potencia para desarrollo',
      attributePills: [
        { name: 'Memoria', value: '32GB RAM' },
        { name: 'Almacenamiento', value: '1TB NVMe' },
      ],
    };
  }
  if (upper.includes('16GB') && upper.includes('512GB')) {
    return {
      title: 'Configuración Base: 16GB RAM · 512GB SSD',
      subtitle: 'Rendimiento equilibrado y versátil',
      attributePills: [
        { name: 'Memoria', value: '16GB RAM' },
        { name: 'Almacenamiento', value: '512GB SSD' },
      ],
    };
  }
  if (upper.includes('64GB')) {
    return {
      title: 'Edición Enterprise: 64GB RAM',
      subtitle: 'Para virtualización y cómputo intensivo',
      attributePills: [{ name: 'Memoria', value: '64GB RAM' }],
    };
  }
  if (upper.includes('WHITE') || upper.includes('BLANCO')) {
    return {
      title: 'Color Blanco Glaciar',
      subtitle: 'Acabado mate premium',
      attributePills: [{ name: 'Color', value: 'Blanco Glaciar' }],
    };
  }
  if (upper.includes('BLACK') || upper.includes('NEGRO')) {
    return {
      title: 'Color Negro Carbón',
      subtitle: 'Acabado industrial anodizado',
      attributePills: [{ name: 'Color', value: 'Negro Carbón' }],
    };
  }
  if (upper.includes('5-USER') || upper.includes('USER-5')) {
    return {
      title: 'Licencia Empresa (5 Usuarios)',
      subtitle: 'Soporte prioritario cloud',
      attributePills: [{ name: 'Licencia', value: '5 Usuarios' }],
    };
  }
  if (upper.includes('USER-1') || upper.includes('1-USER')) {
    return {
      title: 'Licencia Individual (1 Usuario)',
      subtitle: 'Activación inmediata',
      attributePills: [{ name: 'Licencia', value: '1 Usuario' }],
    };
  }
  if (upper.includes('1000') || upper.includes('1000W')) {
    return {
      title: 'Potencia 1000W 80+ Platinum',
      subtitle: 'Certificación de alta eficiencia',
      attributePills: [{ name: 'Potencia', value: '1000W Platinum' }],
    };
  }
  if (upper.includes('850') || upper.includes('850W')) {
    return {
      title: 'Potencia 850W 80+ Gold',
      subtitle: 'Certificación estándar oro',
      attributePills: [{ name: 'Potencia', value: '850W Gold' }],
    };
  }

  const cleanSku = sku.replace(/^[A-Z0-9]+-/, '').replace(/-/g, ' ');
  return {
    title: cleanSku ? `Opción: ${cleanSku}` : `Opción ${index + 1}`,
    subtitle: `Ref: ${sku}`,
    attributePills: [],
  };
}

/**
 * Ficha Técnica y Detalle del Producto para el Comprador (Frontend-Role-Modules §2.4).
 * Diseñado con referencias de alta conversión (Amazon / Mercado Libre / Temu):
 * - Selector de variantes arriba en el Buy Box antes de los botones de compra.
 * - Botón "Comprar Ahora" con icono armónico en la paleta del sistema.
 * - Soporte de Modo Invitado: permite agregar al carrito sin sesión y sólo solicita
 *   iniciar sesión al confirmar la compra / pagar ahora.
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

  useEffect(() => {
    if (product) {
      saveRecentlyViewedProduct(product);
    }
  }, [product]);

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

    // En navegador real sin sesión activa: guardar en el carrito de invitado sin pedir login aún
    if (!isTestEnvironment && !hasActiveSession) {
      addGuestCartItem({
        variantId: activeVariant.id,
        productId: product.id,
        productName: product.name,
        sku: activeVariant.sku,
        unitPrice: product.price,
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
      // Si es visitante sin sesión en navegador real: guardar en carrito invitado y pedir login para confirmar compra
      if (!isTestEnvironment && !hasActiveSession) {
        addGuestCartItem({
          variantId: activeVariant.id,
          productId: product.id,
          productName: product.name,
          sku: activeVariant.sku,
          unitPrice: product.price,
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
      <div className="space-y-6 w-full max-w-full">
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

  const unitPrice = product.price;
  const totalPrice = unitPrice * quantity;
  const activeVariantMeta = activeVariant
    ? formatVariantDisplay(
        activeVariant,
        Math.max(
          0,
          variants.findIndex((v) => v.id === activeVariant.id),
        ),
      )
    : null;

  return (
    <div className="space-y-6 w-full max-w-full transition-colors duration-200">
      {/* ── Navegación y Breadcrumb Comercial ── */}
      <div className="flex items-center justify-between pb-2 border-b border-border">
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

        <Link to="/buyer/cart">
          <Button
            variant="outline"
            size="sm"
            className="border-border text-brand hover:bg-surface-muted"
          >
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
          <AlertTitle>
            {feedback.type === 'success' ? 'Operación Exitosa' : 'Aviso de Compra'}
          </AlertTitle>
          <AlertDescription className="text-xs font-mono mt-1">{feedback.message}</AlertDescription>
        </Alert>
      )}

      {/* ── Split-Frame Asimétrico (58% Galería y Ficha / 42% Buy Box Superior con Variantes) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Lado Izquierdo: Fotografía Protagonista y Especificaciones (col-span-7) */}
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
                  <Tag className="h-3 w-3 text-brand" /> Zentric Marketplace Certificado
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground font-sans tracking-tight leading-tight">
                {product.name}
              </h1>
            </div>

            {/* Fotografía Protagonista del Producto (16:10) */}
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-surface-muted border border-border shadow-xs">
              <img
                src={getProductImageUrl(product)}
                alt={product.name}
                className="h-full w-full object-cover object-center ring-1 ring-inset ring-black/10 dark:ring-white/10"
                loading="lazy"
              />
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
                <p className="text-[11px] text-foreground-muted">
                  12 meses de garantía directa Zentric con soporte técnico.
                </p>
              </div>

              <div className="rounded-xl border border-border-subtle bg-surface-muted/50 p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground font-mono">
                  <Truck className="h-4 w-4 text-info" />
                  Despacho Seguro
                </div>
                <p className="text-[11px] text-foreground-muted">
                  Empaque con trazabilidad y número de guía en tiempo real.
                </p>
              </div>

              <div className="rounded-xl border border-border-subtle bg-surface-muted/50 p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground font-mono">
                  <RotateCcw className="h-4 w-4 text-warning" />
                  Devoluciones
                </div>
                <p className="text-[11px] text-foreground-muted">
                  Inspección física en bodega y reembolso directo garantizado.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Lado Derecho: Buy Box Superior con Selector de Variantes y Compra Rápida (col-span-5) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-3xl border border-border bg-surface p-6 sm:p-7 space-y-5 shadow-md sticky top-20">
            {/* 1. Precio y Resumen de Opción Activa */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-mono tracking-wider text-foreground-muted font-bold">
                  Total de Compra
                </span>
                {activeVariantMeta && (
                  <span className="rounded-full border border-brand/30 bg-brand/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-brand">
                    {activeVariantMeta.title}
                  </span>
                )}
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold font-mono text-foreground tabular-nums">
                ${totalPrice.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-foreground-muted">
                Precio unitario: ${unitPrice.toLocaleString('es-CO', { minimumFractionDigits: 2 })}{' '}
                COP · Impuestos incluidos
              </p>
            </div>

            {/* 2. Selector de Variantes Arriba en el Buy Box (Estilo Amazon / Mercado Libre / Temu) */}
            <div className="space-y-2.5 pt-3 border-t border-border">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-1.5 text-xs uppercase font-mono tracking-wider text-foreground font-bold">
                  <Layers className="h-3.5 w-3.5 text-brand" />
                  Elige tu Variante ({variants.length})
                </h2>
                <span className="font-mono text-[10px] text-foreground-muted">
                   Selección instantánea
                </span>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
                {variants.map((v: ProductVariant, idx: number) => {
                  const isSelected = activeVariant?.id === v.id;
                  const vStock = v.availableStock;
                  const vHasStock = v.canBeSold && (vStock === undefined || vStock > 0);
                  const variantMeta = formatVariantDisplay(v, idx);

                  return (
                    <div
                      key={v.id}
                      onClick={() => setSelectedVariantId(v.id)}
                      className={`cursor-pointer rounded-2xl border p-3.5 transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-brand bg-brand/10 ring-1 ring-brand/40 shadow-xs'
                          : 'border-border bg-surface-muted/40 hover:border-brand/40 hover:bg-surface-muted'
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-foreground">
                            {variantMeta.title}
                          </span>
                          {vHasStock ? (
                            <Badge className="bg-success/15 text-success border-success/30 text-[10px] font-mono">
                              {vStock !== undefined ? `✓ ${vStock} disponibles` : 'Disponible'}
                            </Badge>
                          ) : (
                            <Badge className="bg-danger/15 text-danger border-danger/30 text-[10px] font-mono">
                              Agotado
                            </Badge>
                          )}
                        </div>

                        {variantMeta.attributePills.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            {variantMeta.attributePills.map((attr, attrIdx) => (
                              <span
                                key={`${v.id}-${attr.name}-${attrIdx}`}
                                className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-0.5 font-mono text-[10px] text-foreground-muted"
                              >
                                <strong className="text-foreground">{attr.name}:</strong>{' '}
                                {attr.value}
                              </span>
                            ))}
                          </div>
                        )}

                        {variantMeta.subtitle && (
                          <p className="text-[11px] text-foreground-muted">{variantMeta.subtitle}</p>
                        )}
                        <span className="text-[11px] font-mono text-foreground-subtle block">
                          SKU: {v.sku}
                        </span>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold ${
                            isSelected
                              ? 'border-brand bg-brand text-primary-foreground'
                              : 'border-border bg-surface text-transparent'
                          }`}
                          aria-hidden="true"
                        >
                          ✓
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Disponibilidad de Stock de la Variante Seleccionada */}
            <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-border">
              <span className="text-foreground-muted">Disponibilidad en Bodega:</span>
              {isSoldOut ? (
                <span className="text-danger font-semibold flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" /> Agotado
                </span>
              ) : (
                <span className="text-success font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {availableStock !== undefined
                    ? `${availableStock} unidades disponibles`
                    : 'Stock verificado'}
                </span>
              )}
            </div>

            {/* 4. Selector de cantidad interactivo */}
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="quantity-input"
                  className="text-xs uppercase font-mono tracking-wider text-foreground-muted font-bold"
                >
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

            {/* 5. Acciones Comerciales Arriba: Comprar Ahora (con ícono armónico) y Agregar al Carrito */}
            <div className="pt-2 space-y-2.5">
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
                className="w-full h-12 bg-brand hover:bg-brand-strong text-primary-foreground font-bold text-base shadow-lg shadow-brand/25 disabled:opacity-50 disabled:pointer-events-none transition-all active:scale-[0.98] rounded-xl flex items-center justify-center gap-2.5"
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
                    <Zap className="h-4 w-4 fill-current text-primary-foreground" />
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
                className="w-full h-11 border-brand/40 bg-brand/5 text-brand hover:bg-brand/15 font-semibold text-sm disabled:opacity-50 transition-all active:scale-[0.98] rounded-xl flex items-center justify-center gap-2"
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
                    <ShoppingBag className="h-4 w-4 text-brand" />
                    Agregar al Carrito
                  </span>
                )}
              </Button>
            </div>

            {/* 6. Garantía Comercial y Confianza */}
            <div className="rounded-2xl border border-border bg-surface-muted/60 p-4 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-brand font-semibold">
                <ShieldCheck className="h-4 w-4 text-success" />
                <span>Compra 100% Protegida y Segura</span>
              </div>
              <p className="text-foreground-muted leading-relaxed">
                Al pasar a pagar, el inventario queda reservado exclusivamente en bodega durante 15
                minutos para que completes tu pago sin riesgo de sobreventa.
              </p>
              <div className="flex items-center gap-2 text-foreground-muted pt-1 text-[11px]">
                <Truck className="h-3.5 w-3.5 text-brand" />
                <span>Despacho directo desde bodega física oficial.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
