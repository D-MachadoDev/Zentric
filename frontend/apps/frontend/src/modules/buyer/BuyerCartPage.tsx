import { useState, useCallback } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useOrdersQuery, useCheckoutOrderMutation, useRemoveCartItemMutation, useUpdateCartItemQuantityMutation } from '../../application/services/orders';
import type { OrderItem, OrderListItem, UpdateCartItemQuantityInput } from '../../domain';
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
  Truck,
  Trash2,
  Plus,
  Minus,
} from 'lucide-react';

/**
 * Carrito de Compras del Comprador (Frontend-Role-Modules §2.4 y Frontend-User-Flows §2).
 * Split-Frame Asimétrico (65% / 35%) con congelamiento de precios (ADR-0020)
 * y disparador de reserva atómica de 15 minutos en checkout.
 */
export function BuyerCartPage() {
  const navigate = useNavigate();
  const { data: cartOrders, isLoading, isError, error, refetch } = useOrdersQuery('Cart');
  const checkoutMutation = useCheckoutOrderMutation();
  const removeCartItemMutation = useRemoveCartItemMutation();
  const updateQuantityMutation = useUpdateCartItemQuantityMutation();
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ orderId: string; variantId: string; productName: string } | null>(null);
  const [deleteFeedback, setDeleteFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [quantityFeedback, setQuantityFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleUpdateQuantity = useCallback(
    async (orderId: string, variantId: string, quantity: number) => {
      if (quantity < 1) return;
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
    [updateQuantityMutation]
  );

  // El carrito activo es el primer pedido en estado 'Cart'
  const activeCart: OrderListItem | undefined = cartOrders?.[0];
  const items: OrderItem[] = activeCart?.items ?? [];
  const hasItems = items.length > 0;

  const handleCheckout = async () => {
    if (!activeCart || !hasItems) return;
    setCheckoutError(null);

    try {
      // Disparar checkout atómico en el backend (reserva de 15 min)
      await checkoutMutation.mutateAsync(activeCart.id);
      // Navegar a la pasarela de pago del pedido
      navigate({
        to: '/buyer/orders/$orderId/pay',
        params: { orderId: activeCart.id },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar el checkout.';
      setCheckoutError(msg);
    }
  };

  if (isLoading) {
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

  if (isError) {
    return (
      <div className="p-6 sm:p-10 max-w-4xl mx-auto w-full space-y-4">
        <Alert variant="destructive" className="border-red-900 bg-red-950/40 text-red-200">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <AlertTitle>Error al cargar el carrito</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'No fue posible consultar su carrito activo.'}
          </AlertDescription>
        </Alert>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="border-border text-foreground-muted transition-all active:scale-[0.98]"
        >
          <RefreshCw className="h-4 w-4 mr-1.5" /> Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full max-w-full">
      {/* ── Encabezado ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
              Carrito de Compras
            </h1>
            <Badge variant="outline" className="border-border text-brand font-mono text-xs">
              {items.length} {items.length === 1 ? 'línea' : 'líneas'}
            </Badge>
          </div>
          <p className="text-sm text-foreground-muted">
            Verifique sus artículos antes de confirmar el checkout y bloquear su reserva de existencias.
          </p>
        </div>

        <Link to="/buyer/catalog">
          <Button variant="outline" size="sm" className="border-border text-foreground-muted hover:text-foreground">
            <ShoppingBag className="h-4 w-4 mr-1.5" /> Continuar comprando
          </Button>
        </Link>
      </div>

      {checkoutError && (
        <Alert variant="destructive" className="border-red-900 bg-red-950/40 text-red-200">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <AlertTitle>Error en el checkout</AlertTitle>
          <AlertDescription className="text-xs font-mono">{checkoutError}</AlertDescription>
        </Alert>
      )}

      {/* ── Composición Split-Frame (65% Tabla de Líneas / 35% Resumen Financiero) ── */}
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
          {/* Lado Izquierdo: Tabla de Artículos (65% -> col-span-8) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="rounded-2xl border border-border bg-surface overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-border bg-surface-muted/40 flex items-center justify-between">
                <span className="text-xs uppercase font-mono tracking-wider text-foreground-muted">
                  Artículos en el Pedido
                </span>
                <span className="text-xs font-mono text-foreground-muted">
                  ID Pedido: {activeCart?.id.slice(0, 8)}...
                </span>
              </div>

              <div className="divide-y divide-border">
                {items.map((item: OrderItem) => (
                  <div
                    key={item.id}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-surface-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.productName || 'Producto Zentric'}
                          className="h-16 w-16 rounded-xl object-cover bg-surface-muted border border-border shrink-0"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-surface-muted border border-border text-brand shrink-0">
                          <Package className="h-7 w-7" />
                        </div>
                      )}

                      <div className="space-y-1 min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-foreground truncate">
                          {item.productName || 'Producto Oficial Zentric'}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-foreground-muted">
                          <span className="text-brand font-medium">
                            Variante SKU: {item.sku || item.variantId.slice(0, 8)}
                          </span>
                          {item.vendorName && (
                            <>
                              <span>·</span>
                              <span>Vendido por: {item.vendorName}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 text-right">
                      <div>
                        <span className="text-[10px] uppercase font-mono text-foreground-muted block">Cantidad</span>
                        <div className="flex items-center gap-2 mt-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUpdateQuantity(activeCart!.id, item.variantId, item.quantity - 1)}
                            disabled={updateQuantityMutation.isPending || item.quantity <= 1}
                            aria-label={`Disminuir cantidad de ${item.productName || 'producto'}`}
                            className="h-8 w-8 p-0 text-foreground-muted hover:bg-brand/10 hover:text-brand disabled:opacity-50"
                          >
                            <Minus className="h-4 w-4" />
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
                            onBlur={(e) => {
                              const newQty = parseInt(e.target.value, 10);
                              if (!isNaN(newQty) && newQty >= 1) {
                                handleUpdateQuantity(activeCart!.id, item.variantId, newQty);
                              }
                            }}
                            min={1}
                            className="w-16 text-center text-sm font-mono font-bold text-foreground border border-border rounded bg-surface px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand"
                            aria-label={`Cantidad de ${item.productName || 'producto'}`}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUpdateQuantity(activeCart!.id, item.variantId, item.quantity + 1)}
                            disabled={updateQuantityMutation.isPending}
                            aria-label={`Aumentar cantidad de ${item.productName || 'producto'}`}
                            className="h-8 w-8 p-0 text-foreground-muted hover:bg-brand/10 hover:text-brand"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-mono text-foreground-muted block">Precio Unitario</span>
                        <div className="text-sm font-mono text-foreground-muted tabular-nums">
                          <MoneyAmount amount={item.unitPrice} currency={activeCart?.currency ?? 'COP'} />
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-mono text-foreground-muted block">Subtotal</span>
                        <div className="text-base font-mono font-bold text-foreground tabular-nums">
                          <MoneyAmount amount={item.totalPrice} currency={activeCart?.currency ?? 'COP'} />
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setItemToDelete({ orderId: activeCart!.id, variantId: item.variantId, productName: item.productName || 'Producto Oficial Zentric' })}
                        aria-label={`Eliminar ${item.productName || 'Producto Oficial Zentric'}`}
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

          {/* Lado Derecho: Resumen Financiero y Checkout (35% -> col-span-4) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="rounded-2xl border border-border bg-surface p-6 space-y-6 shadow-xl sticky top-6">
              <h2 className="text-sm uppercase font-mono tracking-wider text-foreground-muted">
                Resumen de Compra
              </h2>

              <div className="space-y-3 text-sm font-mono border-t border-border pt-4">
                <div className="flex justify-between text-foreground-muted">
                  <span>Subtotal</span>
                  <MoneyAmount amount={activeCart?.totalAmount ?? 0} currency={activeCart?.currency ?? 'COP'} />
                </div>
                <div className="flex justify-between text-foreground-muted">
                  <span>Impuestos incluidos</span>
                  <span>$0.00</span>
                </div>
                <div className="flex justify-between text-base font-bold text-foreground border-t border-border pt-3">
                  <span>Total</span>
                  <div className="text-brand text-lg">
                    <MoneyAmount amount={activeCart?.totalAmount ?? 0} currency={activeCart?.currency ?? 'COP'} />
                  </div>
                </div>
              </div>

              {/* Botón Primario de Checkout */}
              <Button
                onClick={handleCheckout}
                disabled={checkoutMutation.isPending}
                className="w-full h-12 bg-brand hover:bg-brand/90 text-primary-foreground font-bold text-sm shadow-lg shadow-brand/20 disabled:opacity-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {checkoutMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4 animate-spin" />
                    Iniciando compra protegida...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Confirmar Checkout (Reserva 15 min)
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>

              {/* Aviso de Reserva */}
              <div className="rounded-xl border border-border bg-surface-muted/50 p-4 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-brand font-semibold">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span>Compra 100% Protegida</span>
                </div>
                <p className="text-foreground-muted leading-relaxed">
                  Al proceder al pago, reservamos tus unidades en bodega física durante 15 minutos para que completes tu compra sin riesgo de que se agote.
                </p>
                <div className="flex items-center gap-2 text-foreground-muted pt-1 text-[11px]">
                  <Truck className="h-3.5 w-3.5 text-brand" />
                  <span>Despacho directo desde red de bodegas oficiales.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmación de Eliminación */}
      {itemToDelete && (
        <Alert variant="destructive" className="border-destructive/40 bg-destructive/10 text-destructive fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md bg-surface rounded-2xl border border-destructive/40 p-6 shadow-xl animate-in fade-in zoom-in-95">
            <AlertTitle className="text-lg">¿Eliminar del carrito?</AlertTitle>
            <AlertDescription className="mt-2">
              Se eliminará "{itemToDelete.productName}" permanentemente.
            </AlertDescription>
            <div className="flex gap-2 mt-6 justify-end">
              <Button
                variant="outline"
                onClick={() => setItemToDelete(null)}
                disabled={removeCartItemMutation.isPending}
                className="border-border text-foreground-muted transition-all active:scale-[0.98]"
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  if (!itemToDelete) return;
                  try {
                    await removeCartItemMutation.mutateAsync({ orderId: itemToDelete.orderId, variantId: itemToDelete.variantId });
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
        </Alert>
      )}

      {/* Feedback visual éxito/error */}
      {deleteFeedback && (
        <Alert
          variant={deleteFeedback.type === 'success' ? 'success' : 'destructive'}
          className="fixed bottom-4 right-4 z-50 w-full max-w-sm shadow-xl animate-in slide-in-from-right"
          role="alert"
        >
          <AlertTitle className="flex items-center gap-2">
            {deleteFeedback.type === 'success' ? (
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-400" />
            )}
            {deleteFeedback.type === 'success' ? 'Éxito' : 'Error'}
          </AlertTitle>
          <AlertDescription>{deleteFeedback.message}</AlertDescription>
        </Alert>
      )}

      {quantityFeedback && (
        <Alert
          variant={quantityFeedback.type === 'success' ? 'success' : 'destructive'}
          className="fixed bottom-4 right-4 z-50 w-full max-w-sm shadow-xl animate-in slide-in-from-right"
          role="alert"
          style={{ bottom: deleteFeedback ? '5.5rem' : '1rem' }}
        >
          <AlertTitle className="flex items-center gap-2">
            {quantityFeedback.type === 'success' ? (
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-400" />
            )}
            {quantityFeedback.type === 'success' ? 'Éxito' : 'Error'}
          </AlertTitle>
          <AlertDescription>{quantityFeedback.message}</AlertDescription>
        </Alert>
      )}

    </div>
  );
}
