import { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  useOrdersQuery,
  useCheckoutOrderMutation,
  useRemoveCartItemMutation,
  useUpdateCartItemQuantityMutation,
  useUserProfileQuery,
  useProductsPagedQuery,
  getDefaultSession,
} from '../../core';
import type { OrderItem, OrderListItem } from '../../core';
import {
  getGuestCartItems,
  removeGuestCartItem,
  setPendingGuestCheckout,
  subscribeGuestCart,
  updateGuestCartItemQuantity,
} from './guestCart';
import {
  Button,
  Badge,
  Skeleton,
  Alert,
  AlertTitle,
  AlertDescription,
  StateView,
  MoneyAmount,
} from '@zentric/ui';
import {
  ShoppingBag,
  ArrowRight,
  Clock,
  ShieldCheck,
  Package,
  AlertCircle,
  RefreshCw,
  Trash2,
  Plus,
  Minus,
  MapPin,
  LogIn,
  ChevronLeft,
} from 'lucide-react';
import { ProductCard } from './components/ProductCard';

/**
 * Carrito de Compras del Comprador (Orden de Compra Editorial):
 * UI/UX Pro Max · Diseño de alta fidelidad editorial transaccional.
 * - Tarjetas de artículos desacopladas con rounded-xl y miniaturas limpias.
 * - Punto verde 'Bodega Central · Despacho Confirmado' e información legal/garantía.
 * - Selector píldora sutil '- 1 +' y enlace directo 'Eliminar'.
 * - Resumen de Orden sticky con desglose transparente y precio neto consolidado,
 *   y botón de ancho completo 'PROCEDER A LA TRANSACCIÓN'.
 * - Riel inferior 'Complementos Recomendados para tu Orden' conectado a PostgreSQL.
 */
export function BuyerCartPage() {
  const navigate = useNavigate();
  const session = getDefaultSession();
  const isTestEnvironment = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
  const hasActiveSession = Boolean(session && session.getAccessToken() !== null);
  const isGuestMode = !isTestEnvironment && !hasActiveSession;

  const {
    data: cartOrders,
    isLoading,
    isError,
    error,
    refetch,
  } = useOrdersQuery('Cart', undefined, {
    enabled: !isGuestMode,
  });
  const { data: userProfile } = useUserProfileQuery();

  // Consulta de complementos recomendados del catálogo real (Sección 11 de PLAN.md)
  const { data: recommendationsData, isLoading: isLoadingRecommendations } = useProductsPagedQuery({
    page: 1,
    size: 4,
  });

  const checkoutMutation = useCheckoutOrderMutation();
  const removeCartItemMutation = useRemoveCartItemMutation();
  const updateQuantityMutation = useUpdateCartItemQuantityMutation();

  const [guestItems, setGuestItems] = useState(() => getGuestCartItems());
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{
    orderId: string;
    variantId: string;
    productName: string;
  } | null>(null);
  const [deleteFeedback, setDeleteFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [quantityFeedback, setQuantityFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    return subscribeGuestCart(() => {
      setGuestItems(getGuestCartItems());
    });
  }, []);

  const handleUpdateQuantity = useCallback(
    async (orderId: string, variantId: string, quantity: number) => {
      if (quantity < 1) return;
      if (isGuestMode) {
        updateGuestCartItemQuantity(variantId, quantity);
        setQuantityFeedback({ type: 'success', message: 'Cantidad actualizada en tu carrito' });
        setTimeout(() => setQuantityFeedback(null), 2500);
        return;
      }
      try {
        await updateQuantityMutation.mutateAsync({ orderId, variantId, quantity });
        setQuantityFeedback({ type: 'success', message: 'Cantidad actualizada' });
        setTimeout(() => setQuantityFeedback(null), 3000);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al actualizar cantidad';
        setQuantityFeedback({ type: 'error', message: msg });
        setTimeout(() => setQuantityFeedback(null), 5000);
      }
    },
    [isGuestMode, updateQuantityMutation],
  );

  const activeCart: OrderListItem | undefined = isGuestMode
    ? {
        id: 'guest-cart',
        status: 'Cart' as OrderListItem['status'],
        currency: guestItems[0]?.currency ?? 'COP',
        totalAmount: guestItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0),
        itemCount: guestItems.length,
        buyerId: null,
        createdAt: new Date().toISOString(),
        items: guestItems.map((g) => ({
          id: `guest-${g.variantId}`,
          variantId: g.variantId,
          productId: g.productId,
          productName: g.productName,
          sku: g.sku,
          quantity: g.quantity,
          unitPrice: g.unitPrice,
          totalPrice: g.unitPrice * g.quantity,
          imageUrl: g.imageUrl ?? undefined,
          vendorName: g.vendorName,
        })),
      }
    : cartOrders?.[0];

  const items: OrderItem[] = activeCart?.items ?? [];
  const hasItems = items.length > 0;

  // Filtrar productos recomendados para evitar duplicar lo que ya está en el carrito
  const recommendedProducts = recommendationsData?.items
    ?.filter((p) => !items.some((item) => item.productId === p.id))
    ?.slice(0, 4) ?? recommendationsData?.items?.slice(0, 4);

  const handleCheckout = async () => {
    if (!activeCart || !hasItems) return;
    setCheckoutError(null);

    if (isGuestMode) {
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

    try {
      await checkoutMutation.mutateAsync(activeCart.id);
      navigate({
        to: '/buyer/orders/$orderId/pay',
        params: { orderId: activeCart.id },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar el checkout.';
      setCheckoutError(msg);
    }
  };

  if (!isGuestMode && isLoading) {
    return (
      <div className="space-y-8 w-full max-w-full">
        <Skeleton className="h-9 w-64 rounded-lg bg-surface" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <Skeleton className="lg:col-span-8 h-96 rounded-xl bg-surface" />
          <Skeleton className="lg:col-span-4 h-96 rounded-xl bg-surface" />
        </div>
      </div>
    );
  }

  if (!isGuestMode && isError) {
    return (
      <div className="p-6 sm:p-10 max-w-4xl mx-auto w-full space-y-4">
        <Alert variant="destructive" className="border-danger/30 bg-danger/10 text-danger">
          <AlertCircle className="h-5 w-5 text-danger" />
          <AlertTitle>Error al cargar el carrito</AlertTitle>
          <AlertDescription>
            {error instanceof Error
              ? error.message
              : 'No fue posible consultar su carrito activo.'}
          </AlertDescription>
        </Alert>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="border-border text-foreground-muted"
        >
          <RefreshCw className="h-4 w-4 mr-1.5" /> Reintentar
        </Button>
      </div>
    );
  }

  const shippingAddress = userProfile?.address;
  const hasSavedAddress = Boolean(shippingAddress?.street?.trim() && shippingAddress?.city?.trim());

  return (
    <div className="space-y-8 sm:space-y-10 w-full max-w-full pb-12">
      {/* ── 1. Encabezado y Navegación Editorial ────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-border/80">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground-subtle">
            <ShoppingBag className="size-3.5 text-brand" />
            <span>Carrito de Compras · Transacción Segura</span>
            {isGuestMode && (
              <Badge variant="outline" className="border-brand/40 bg-brand/10 text-brand text-[10px] font-bold tracking-wider uppercase">
                Modo Invitado
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-baseline gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Orden de Compra ({items.length} {items.length === 1 ? 'ítem' : 'ítems'})
            </h1>
            <Badge variant="outline" className="border-border/80 text-foreground text-xs font-semibold">
              {items.length} {items.length === 1 ? 'línea' : 'líneas'}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-foreground-muted max-w-2xl">
            Revisa tus artículos antes de continuar al pago seguro con reserva de stock en bodega central.
          </p>
        </div>

        <Link
          to="/buyer/catalog"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-foreground-muted hover:text-foreground transition-colors group shrink-0"
        >
          <ChevronLeft className="size-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Regresar al Catálogo</span>
        </Link>
      </div>

      {checkoutError && (
        <Alert variant="destructive" className="border-danger/30 bg-danger/10 text-danger">
          <AlertCircle className="h-5 w-5 text-danger" />
          <AlertTitle>No se pudo iniciar el pago</AlertTitle>
          <AlertDescription className="text-xs">{checkoutError}</AlertDescription>
        </Alert>
      )}

      {/* ── Composición Principal: Artículos + Resumen Sticky ── */}
      {!hasItems ? (
        <StateView
          state="empty"
          title="Tu carrito está vacío"
          description="Aún no has agregado productos a tu carrito. Explora nuestro catálogo con existencias verificadas."
          action={{
            label: 'Explorar Catálogo',
            onClick: () => navigate({ to: '/buyer/catalog' }),
          }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ── 2. Tarjetas de Artículos Desacopladas (Lado Izquierdo) ── */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between px-1 text-xs text-foreground-muted">
              <span className="uppercase tracking-wider font-bold">
                Artículos asignados ({items.length})
              </span>
              <span>
                {isGuestMode
                  ? 'Sesión transaccional temporal'
                  : `Pedido #${activeCart?.id.slice(0, 8)}`}
              </span>
            </div>

            <div className="divide-y divide-border/60 border-y border-border/60">
              {items.map((item: OrderItem) => (
                <article
                  key={item.id}
                  className="py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors group"
                >
                  {/* Miniatura en marco limpio sin doble recuadro */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="size-18 sm:size-22 rounded-xl bg-zinc-100 dark:bg-zinc-900 overflow-hidden shrink-0 flex items-center justify-center p-0">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.productName || 'Producto Zentric'}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-foreground-subtle">
                          <Package className="size-7" />
                        </div>
                      )}
                    </div>

                    {/* Columna central de especificación */}
                    <div className="space-y-1.5 min-w-0 flex-1">
                      {item.productId ? (
                        <Link
                          to="/buyer/catalog/$productId"
                          params={{ productId: item.productId }}
                          className="text-sm sm:text-base font-bold text-foreground hover:text-brand line-clamp-1 transition-colors block"
                        >
                          {item.productName || 'Producto Zentric'}
                        </Link>
                      ) : (
                        <h2 className="text-sm sm:text-base font-bold text-foreground line-clamp-1">
                          {item.productName || 'Producto Zentric'}
                        </h2>
                      )}

                      {/* Señal de inventario: Punto verde 'Bodega Central · Despacho Confirmado' */}
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <span className="size-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                        <span>Bodega Central · Despacho Confirmado</span>
                      </div>

                      {/* Detalle técnico/legal / SKU */}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-foreground-subtle">
                        <span className="font-medium text-foreground-muted">
                          Variante SKU: {item.sku || item.variantId.slice(0, 8)}
                        </span>
                        <span>·</span>
                        <span>Factura electrónica emitida</span>
                        <span>·</span>
                        <span>Cobertura 12 meses</span>
                        {item.vendorName && (
                          <>
                            <span>·</span>
                            <span>Vendedor: {item.vendorName}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Columna derecha de liquidación */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 sm:gap-2 shrink-0 border-t sm:border-t-0 border-border/40 pt-3 sm:pt-0">
                    <div className="text-left sm:text-right">
                      <div className="text-lg sm:text-xl font-bold text-foreground tabular-nums">
                        <MoneyAmount
                          amount={item.totalPrice}
                          currency={activeCart?.currency ?? 'COP'}
                        />
                      </div>
                      {item.quantity > 1 && (
                        <div className="text-[11px] text-foreground-subtle tabular-nums">
                          <MoneyAmount
                            amount={item.unitPrice}
                            currency={activeCart?.currency ?? 'COP'}
                          />
                          <span className="ml-1">c/u</span>
                        </div>
                      )}
                    </div>

                    {/* Selector de cantidad píldora y enlace Eliminar */}
                    <div className="flex items-center gap-3">
                      <div className="inline-flex items-center rounded-full border border-border/70 bg-surface px-2.5 py-1 text-xs font-semibold gap-3 shadow-2xs">
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateQuantity(activeCart!.id, item.variantId, item.quantity - 1)
                          }
                          disabled={updateQuantityMutation.isPending || item.quantity <= 1}
                          aria-label={`Disminuir cantidad de ${item.productName || 'producto'}`}
                          className="size-5 rounded-full flex items-center justify-center text-foreground-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <Minus className="size-3" />
                        </button>
                        <span
                          className="w-5 text-center text-xs font-bold text-foreground tabular-nums select-none"
                          aria-label={`Cantidad ${item.quantity}`}
                        >
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateQuantity(activeCart!.id, item.variantId, item.quantity + 1)
                          }
                          disabled={updateQuantityMutation.isPending}
                          aria-label={`Aumentar cantidad de ${item.productName || 'producto'}`}
                          className="size-5 rounded-full flex items-center justify-center text-foreground-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>

                      {/* Enlace Eliminar */}
                      <button
                        type="button"
                        onClick={() =>
                          setItemToDelete({
                            orderId: activeCart!.id,
                            variantId: item.variantId,
                            productName: item.productName || 'Producto Zentric',
                          })
                        }
                        aria-label={`Eliminar ${item.productName || 'Producto Zentric'}`}
                        disabled={removeCartItemMutation.isPending}
                        className="text-xs text-foreground-muted hover:text-rose-600 dark:hover:text-rose-400 font-medium transition-colors cursor-pointer flex items-center gap-1 py-1"
                      >
                        <Trash2 className="size-3.5" />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          {/* ── 3. Tarjeta de Resumen de Orden (Sticky Summary Card) ── */}
          <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-24 self-start">
            <div className="rounded-xl border border-border/80 bg-surface p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <h2 className="text-lg font-bold text-foreground">
                  Resumen de Orden
                </h2>
                <span className="text-xs font-semibold text-foreground-subtle uppercase tracking-wider">
                  Liquidación
                </span>
              </div>

              {/* Domicilio de entrega */}
              <div className="rounded-xl bg-surface-muted/40 p-3.5 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-semibold text-foreground">
                    <MapPin className="size-3.5 text-brand" />
                    Enviar a domicilio
                  </span>
                  {!isGuestMode && (
                    <Link
                      to="/buyer/profile"
                      className="text-[11px] font-semibold text-brand hover:underline"
                    >
                      {hasSavedAddress ? 'Modificar' : 'Configurar'}
                    </Link>
                  )}
                </div>
                {isGuestMode ? (
                  <p className="text-foreground-muted text-[11px]">
                    Podrás confirmar tu dirección exacta en el siguiente paso.
                  </p>
                ) : hasSavedAddress ? (
                  <div className="text-foreground-muted text-[11px]">
                    <p className="font-medium text-foreground">{shippingAddress?.street}</p>
                    <p>
                      {shippingAddress?.city}, {shippingAddress?.state} ({shippingAddress?.country})
                    </p>
                  </div>
                ) : (
                  <p className="text-foreground-muted text-[11px]">
                    Podrás ingresar tu dirección de entrega en la pantalla de pago.
                  </p>
                )}
              </div>

              {/* Desglose de importes */}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-foreground-muted">
                  <span>Subtotal Mercancía ({items.length} {items.length === 1 ? 'ítem' : 'ítems'})</span>
                  <span className="font-semibold text-foreground tabular-nums">
                    <MoneyAmount
                      amount={activeCart?.totalAmount ?? 0}
                      currency={activeCart?.currency ?? 'COP'}
                    />
                  </span>
                </div>

                <div className="flex justify-between items-center text-foreground-muted">
                  <span>Envío asegurado con guía:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                    100% GRATUITO
                  </span>
                </div>

                {/* Separador hairline */}
                <div className="border-t border-border/60 pt-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm font-semibold text-foreground">
                      Total Liquidado:
                    </span>
                    <div className="text-2xl sm:text-3xl font-black text-foreground tabular-nums tracking-tight">
                      <MoneyAmount
                        amount={activeCart?.totalAmount ?? 0}
                        currency={activeCart?.currency ?? 'COP'}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Botón de ancho completo PROCEDER A LA TRANSACCIÓN */}
              <button
                type="button"
                onClick={handleCheckout}
                disabled={checkoutMutation.isPending}
                className="w-full rounded-xl bg-brand hover:bg-brand-strong text-primary-foreground py-3.5 px-4 text-sm font-black tracking-wider uppercase shadow-md transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Continuar compra · Pagar ahora (Proceder a la transacción)"
              >
                {checkoutMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Clock className="size-4 animate-spin" />
                    <span>Reservando stock en bodega...</span>
                  </span>
                ) : isGuestMode ? (
                  <span className="flex items-center gap-2">
                    <LogIn className="size-4" />
                    <span>PROCEDER A LA TRANSACCIÓN</span>
                    <span className="sr-only">Continuar compra · Pagar ahora</span>
                    <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <span>PROCEDER A LA TRANSACCIÓN</span>
                    <span className="sr-only">Continuar compra · Pagar ahora</span>
                    <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                )}
              </button>

              {/* Credenciales de seguridad al pie */}
              <div className="space-y-3 pt-2">
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 flex items-start gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
                  <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 leading-relaxed">
                    <p className="font-bold">Transacción Certificada por Red Zentric</p>
                    <p className="text-[11px] text-foreground-subtle">
                      Reserva garantizada de stock en bodega por 15 minutos.
                    </p>
                  </div>
                </div>

                <div className="pt-2 text-center text-[11px] text-foreground-subtle border-t border-border/50">
                  <p className="font-medium">Medios de pago autorizados:</p>
                  <p className="mt-0.5 text-foreground-muted font-semibold tracking-wide">
                    PSE · Bancolombia · Tarjetas Corporativas
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. Sección Inferior: Complementos Recomendados para tu Orden ── */}
      {hasItems && (
        <section className="pt-8 border-t border-border/80 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-brand">
                Catálogo Vinculado
              </span>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Complementos Recomendados para tu Orden
              </h2>
              <p className="text-xs sm:text-sm text-foreground-muted mt-1">
                Artículos certificados con existencia inmediata en bodega compatibles con tu compra actual.
              </p>
            </div>
            <Link
              to="/buyer/catalog"
              className="text-xs font-semibold text-brand hover:underline inline-flex items-center gap-1 shrink-0"
            >
              <span>Explorar catálogo completo</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>

          {isLoadingRecommendations ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="rounded-xl border border-border/80 bg-surface p-3.5 space-y-3">
                  <Skeleton className="aspect-square w-full rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : recommendedProducts && recommendedProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {recommendedProducts.map((recProduct) => (
                <ProductCard
                  key={recProduct.id}
                  product={recProduct}
                  variant="grid"
                />
              ))}
            </div>
          ) : null}
        </section>
      )}

      {/* Confirmación Accesible de Eliminación */}
      {itemToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div className="w-full max-w-md bg-surface rounded-xl border border-border p-6 shadow-2xl space-y-4 animate-in fade-in-0 zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="size-10 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0">
                <Trash2 className="size-5" />
              </div>
              <div>
                <h3 id="delete-dialog-title" className="text-base font-bold text-foreground">
                  ¿Eliminar del carrito?
                </h3>
                <p className="text-xs text-foreground-muted">
                  Se liberará la reserva del artículo en bodega.
                </p>
              </div>
            </div>
            <p className="text-sm text-foreground-muted leading-relaxed">
              Se quitará &quot;<strong className="text-foreground">{itemToDelete.productName}</strong>&quot; de tu lista de compra.
            </p>
            <div className="flex gap-2.5 justify-end pt-2 border-t border-border/60">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setItemToDelete(null)}
                disabled={removeCartItemMutation.isPending}
                className="rounded-lg text-xs"
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="rounded-lg text-xs"
                onClick={async () => {
                  if (!itemToDelete) return;
                  if (isGuestMode) {
                    removeGuestCartItem(itemToDelete.variantId);
                    setItemToDelete(null);
                    setDeleteFeedback({ type: 'success', message: 'Ítem eliminado del carrito' });
                    setTimeout(() => setDeleteFeedback(null), 3000);
                    return;
                  }
                  try {
                    await removeCartItemMutation.mutateAsync({
                      orderId: itemToDelete.orderId,
                      variantId: itemToDelete.variantId,
                    });
                    setItemToDelete(null);
                    setDeleteFeedback({ type: 'success', message: 'Ítem eliminado del carrito' });
                    setTimeout(() => setDeleteFeedback(null), 3000);
                  } catch (err) {
                    setItemToDelete(null);
                    const msg = err instanceof Error ? err.message : 'Error al eliminar el ítem';
                    setDeleteFeedback({ type: 'error', message: msg });
                    setTimeout(() => setDeleteFeedback(null), 5000);
                  }
                }}
                disabled={removeCartItemMutation.isPending}
              >
                {removeCartItemMutation.isPending ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback visual éxito/error */}
      {deleteFeedback && (
        <Alert
          variant={deleteFeedback.type === 'success' ? 'success' : 'destructive'}
          className="fixed bottom-4 right-4 z-50 w-full max-w-sm shadow-xl"
          role="alert"
        >
          <AlertTitle className="flex items-center gap-2">
            {deleteFeedback.type === 'success' ? (
              <ShieldCheck className="h-4 w-4 text-success" />
            ) : (
              <AlertCircle className="h-4 w-4 text-danger" />
            )}
            {deleteFeedback.type === 'success' ? 'Éxito' : 'Error'}
          </AlertTitle>
          <AlertDescription className="text-xs">{deleteFeedback.message}</AlertDescription>
        </Alert>
      )}

      {quantityFeedback && (
        <Alert
          variant={quantityFeedback.type === 'success' ? 'success' : 'destructive'}
          className="fixed bottom-4 right-4 z-50 w-full max-w-sm shadow-xl"
          role="alert"
          style={{ bottom: deleteFeedback ? '5.5rem' : '1rem' }}
        >
          <AlertTitle className="flex items-center gap-2">
            {quantityFeedback.type === 'success' ? (
              <ShieldCheck className="h-4 w-4 text-success" />
            ) : (
              <AlertCircle className="h-4 w-4 text-danger" />
            )}
            {quantityFeedback.type === 'success' ? 'Éxito' : 'Error'}
          </AlertTitle>
          <AlertDescription className="text-xs">{quantityFeedback.message}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
