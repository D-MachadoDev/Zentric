import { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  useOrdersQuery,
  useCheckoutOrderMutation,
  useRemoveCartItemMutation,
  useUpdateCartItemQuantityMutation,
} from '../../core';
import { useUserProfileQuery } from '../../core';
import { getDefaultSession } from '../../core';
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
} from 'lucide-react';

/**
 * Carrito de Compras del Comprador:
 * Respaldo directo en el backend para usuarios autenticados y soporte para compra como invitado.
 * Tipografía limpia sin fuentes fijas ni textos diminutos ilegibles.
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
        <Skeleton className="h-8 w-48 bg-surface" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <Skeleton className="lg:col-span-8 h-80 rounded-2xl bg-surface" />
          <Skeleton className="lg:col-span-4 h-80 rounded-2xl bg-surface" />
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
    <div className="space-y-6 sm:space-y-8 w-full max-w-full">
      {/* ── Encabezado ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Carrito de compras
            </h1>
            <Badge variant="outline" className="border-border/80 text-foreground text-xs font-semibold">
              {items.length} {items.length === 1 ? 'línea' : 'líneas'}
            </Badge>
            {isGuestMode && (
              <Badge variant="outline" className="border-brand/40 bg-brand/10 text-brand text-xs">
                Modo Invitado
              </Badge>
            )}
          </div>
          <p className="text-sm text-foreground-muted">
            Revisa tus artículos antes de continuar al pago seguro con reserva de stock en bodega.
          </p>
        </div>

        <Link to="/buyer/catalog">
          <Button
            variant="outline"
            size="sm"
            className="border-border text-foreground-muted hover:text-foreground text-xs"
          >
            <ShoppingBag className="h-4 w-4 mr-1.5" /> Continuar comprando
          </Button>
        </Link>
      </div>

      {checkoutError && (
        <Alert variant="destructive" className="border-danger/30 bg-danger/10 text-danger">
          <AlertCircle className="h-5 w-5 text-danger" />
          <AlertTitle>No se pudo iniciar el pago</AlertTitle>
          <AlertDescription className="text-xs">{checkoutError}</AlertDescription>
        </Alert>
      )}

      {/* ── Composición Split-Frame ── */}
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
          {/* Lado Izquierdo: Tabla de Artículos */}
          <div className="lg:col-span-8 space-y-4">
            <div className="rounded-2xl border border-border/80 bg-surface overflow-hidden shadow-xs">
              <div className="p-4 sm:p-5 border-b border-border/70 bg-surface-muted/30 flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-foreground-muted font-semibold">
                  Artículos en tu compra
                </span>
                <span className="text-xs text-foreground-muted">
                  {isGuestMode
                    ? 'Carrito temporal'
                    : `Pedido #${activeCart?.id.slice(0, 8)}`}
                </span>
              </div>

              <div className="divide-y divide-border/60">
                {items.map((item: OrderItem) => (
                  <div
                    key={item.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-surface-muted/20 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.productName || 'Producto Zentric'}
                          className="h-16 w-16 rounded-xl object-cover bg-surface-muted border border-border/70 shrink-0"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-surface-muted border border-border/70 text-brand shrink-0">
                          <Package className="h-7 w-7" />
                        </div>
                      )}

                      <div className="space-y-1 min-w-0 flex-1">
                        {item.productId ? (
                          <Link
                            to="/buyer/catalog/$productId"
                            params={{ productId: item.productId }}
                            className="text-sm font-semibold text-foreground hover:text-brand transition-colors truncate block"
                          >
                            {item.productName || 'Producto Zentric'}
                          </Link>
                        ) : (
                          <h3 className="text-sm font-semibold text-foreground truncate">
                            {item.productName || 'Producto Zentric'}
                          </h3>
                        )}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-foreground-muted">
                          <span className="text-brand font-medium">
                            Variante SKU: {item.sku || item.variantId.slice(0, 8)}
                          </span>
                          {item.vendorName && (
                            <>
                              <span>·</span>
                              <span>Vendedor: {item.vendorName}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 text-right">
                      <div>
                        <span className="text-xs uppercase text-foreground-muted block font-medium">
                          Cantidad
                        </span>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleUpdateQuantity(activeCart!.id, item.variantId, item.quantity - 1)
                            }
                            disabled={updateQuantityMutation.isPending || item.quantity <= 1}
                            aria-label={`Disminuir cantidad de ${item.productName || 'producto'}`}
                            className="h-7 w-7 p-0 text-foreground-muted hover:text-foreground"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => {
                              const newQty = parseInt(e.target.value, 10);
                              if (!isNaN(newQty) && newQty >= 1) {
                                handleUpdateQuantity(activeCart!.id, item.variantId, newQty);
                              }
                            }}
                            min={1}
                            className="w-12 text-center text-sm font-semibold text-foreground border border-border/80 rounded-lg bg-surface px-1 py-1 focus:outline-none focus:ring-2 focus:ring-brand"
                            aria-label={`Cantidad de ${item.productName || 'producto'}`}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleUpdateQuantity(activeCart!.id, item.variantId, item.quantity + 1)
                            }
                            disabled={updateQuantityMutation.isPending}
                            aria-label={`Aumentar cantidad de ${item.productName || 'producto'}`}
                            className="h-7 w-7 p-0 text-foreground-muted hover:text-foreground"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div>
                        <span className="text-xs uppercase text-foreground-muted block font-medium">
                          Unitario
                        </span>
                        <div className="text-sm font-medium text-foreground-muted tabular-nums">
                          <MoneyAmount
                            amount={item.unitPrice}
                            currency={activeCart?.currency ?? 'COP'}
                          />
                        </div>
                      </div>

                      <div>
                        <span className="text-xs uppercase text-foreground-muted block font-medium">
                          Subtotal
                        </span>
                        <div className="text-sm sm:text-base font-bold text-foreground tabular-nums">
                          <MoneyAmount
                            amount={item.totalPrice}
                            currency={activeCart?.currency ?? 'COP'}
                          />
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setItemToDelete({
                            orderId: activeCart!.id,
                            variantId: item.variantId,
                            productName: item.productName || 'Producto Zentric',
                          })
                        }
                        aria-label={`Eliminar ${item.productName || 'Producto Zentric'}`}
                        className="text-foreground-muted hover:bg-destructive/10 hover:text-destructive p-1.5"
                        title="Eliminar del carrito"
                        disabled={removeCartItemMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Lado Derecho: Resumen de Compra y Envío */}
          <div className="lg:col-span-4 space-y-6">
            <div className="rounded-2xl border border-border/80 bg-surface p-5 sm:p-6 space-y-5 shadow-xs sticky top-6">
              <h2 className="text-sm uppercase tracking-wider text-foreground-muted font-bold">
                Resumen de compra
              </h2>

              {/* Domicilio de Entrega */}
              <div className="rounded-xl border border-border/70 bg-surface-muted/30 p-3.5 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-semibold text-foreground">
                    <MapPin className="h-3.5 w-3.5 text-brand" />
                    Enviar a domicilio
                  </span>
                  {!isGuestMode && (
                    <Link
                      to="/buyer/profile"
                      className="text-xs font-medium text-brand hover:underline"
                    >
                      {hasSavedAddress ? 'Modificar' : 'Configurar'}
                    </Link>
                  )}
                </div>
                {isGuestMode ? (
                  <p className="text-xs text-foreground-muted">
                    Podrás confirmar tu dirección exacta en el siguiente paso.
                  </p>
                ) : hasSavedAddress ? (
                  <div className="text-xs text-foreground-muted">
                    <p className="font-medium text-foreground">{shippingAddress?.street}</p>
                    <p>
                      {shippingAddress?.city}, {shippingAddress?.state} ({shippingAddress?.country})
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-foreground-muted">
                    Podrás ingresar tu dirección de entrega en la pantalla de pago.
                  </p>
                )}
              </div>

              <div className="space-y-3 text-sm border-t border-border/70 pt-4">
                <div className="flex justify-between text-foreground-muted">
                  <span>Productos ({items.length})</span>
                  <MoneyAmount
                    amount={activeCart?.totalAmount ?? 0}
                    currency={activeCart?.currency ?? 'COP'}
                  />
                </div>
                <div className="flex justify-between text-foreground-muted">
                  <span>Envío asegurado</span>
                  <span className="text-success font-semibold">Gratis</span>
                </div>
                <div className="flex justify-between text-base font-bold text-foreground border-t border-border/70 pt-3">
                  <span>Total a pagar</span>
                  <div className="text-brand text-lg">
                    <MoneyAmount
                      amount={activeCart?.totalAmount ?? 0}
                      currency={activeCart?.currency ?? 'COP'}
                    />
                  </div>
                </div>
              </div>

              {/* Botón Principal */}
              <Button
                onClick={handleCheckout}
                disabled={checkoutMutation.isPending}
                className="w-full h-12 bg-brand hover:bg-brand-strong text-primary-foreground font-bold text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                {checkoutMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4 animate-spin" />
                    Reservando stock en bodega...
                  </span>
                ) : isGuestMode ? (
                  <span className="flex items-center gap-2">
                    <LogIn className="h-4 w-4" />
                    Continuar e iniciar sesión
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Continuar compra · Pagar ahora
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>

              {/* Aviso de Reserva */}
              <div className="rounded-xl border border-border/70 bg-surface-muted/30 p-3.5 space-y-1.5 text-xs">
                <div className="flex items-center gap-2 text-brand font-semibold">
                  <ShieldCheck className="h-4 w-4 text-success" />
                  <span>Compra protegida · Reserva de 15 min</span>
                </div>
                <p className="text-foreground-muted leading-relaxed">
                  Al avanzar al pago, apartamos tus unidades en bodega por 15 minutos para que nadie más las compre.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmación de Eliminación */}
      {itemToDelete && (
        <Alert
          variant="destructive"
          className="border-destructive/40 bg-destructive/10 text-destructive fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        >
          <div className="w-full max-w-md bg-surface rounded-2xl border border-border p-6 shadow-xl">
            <AlertTitle className="text-lg font-bold text-foreground">¿Eliminar del carrito?</AlertTitle>
            <AlertDescription className="mt-2 text-sm text-foreground-muted">
              Se quitará &quot;{itemToDelete.productName}&quot; de tu lista de compra.
            </AlertDescription>
            <div className="flex gap-2 mt-6 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setItemToDelete(null)}
                disabled={removeCartItemMutation.isPending}
                className="border-border text-foreground-muted text-xs"
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                size="sm"
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
                className="text-xs"
              >
                {removeCartItemMutation.isPending ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </div>
          </div>
        </Alert>
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
