import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useOrdersQuery, useCheckoutOrderMutation } from '../../application/services/orders';
import type { OrderItem, OrderListItem } from '../../domain';
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
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

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
      <div className="space-y-8 p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full">
        <Skeleton className="h-8 w-48 bg-[#111827]" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <Skeleton className="lg:col-span-8 h-80 rounded-2xl bg-[#111827]" />
          <Skeleton className="lg:col-span-4 h-80 rounded-2xl bg-[#111827]" />
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
          className="border-[#1F293D] text-[#94A3B8]"
        >
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
              Carrito de Compras
            </h1>
            <Badge variant="outline" className="border-[#1F293D] text-[#00D4AA] font-mono text-xs">
              {items.length} {items.length === 1 ? 'línea' : 'líneas'}
            </Badge>
          </div>
          <p className="text-sm text-[#94A3B8]">
            Verifique sus artículos antes de confirmar el checkout y bloquear su reserva de existencias.
          </p>
        </div>

        <Link to="/buyer/catalog">
          <Button variant="outline" size="sm" className="border-[#1F293D] text-[#94A3B8] hover:text-white">
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
            <div className="rounded-2xl border border-[#1F293D] bg-[#111827] overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-[#1F293D] bg-[#161F30]/40 flex items-center justify-between">
                <span className="text-xs uppercase font-mono tracking-wider text-[#94A3B8]">
                  Artículos en el Pedido
                </span>
                <span className="text-xs font-mono text-[#64748B]">
                  ID Pedido: {activeCart?.id.slice(0, 8)}...
                </span>
              </div>

              <div className="divide-y divide-[#1F293D]">
                {items.map((item: OrderItem) => (
                  <div
                    key={item.id}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#161F30]/30 transition-colors"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-[#00D4AA]" />
                        <span className="text-xs font-mono text-[#00D4AA] font-bold">
                          Variante SKU: {item.variantId.slice(0, 8)}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-[#64748B]">
                        Identificador de variante: {item.variantId}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 text-right">
                      <div>
                        <span className="text-[10px] uppercase font-mono text-[#64748B] block">Cantidad</span>
                        <span className="text-sm font-mono font-bold text-white tabular-nums">
                          {item.quantity} ud(s)
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-mono text-[#64748B] block">Precio Unitario</span>
                        <div className="text-sm font-mono text-[#94A3B8] tabular-nums">
                          <MoneyAmount amount={item.unitPrice} currency={activeCart?.currency ?? 'COP'} />
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-mono text-[#64748B] block">Subtotal</span>
                        <div className="text-base font-mono font-bold text-white tabular-nums">
                          <MoneyAmount amount={item.totalPrice} currency={activeCart?.currency ?? 'COP'} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Lado Derecho: Resumen Financiero y Checkout (35% -> col-span-4) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="rounded-2xl border border-[#1F293D] bg-[#111827] p-6 space-y-6 shadow-xl sticky top-6">
              <h2 className="text-sm uppercase font-mono tracking-wider text-[#94A3B8]">
                Resumen de Compra
              </h2>

              <div className="space-y-3 text-sm font-mono border-t border-[#1F293D] pt-4">
                <div className="flex justify-between text-[#94A3B8]">
                  <span>Subtotal</span>
                  <MoneyAmount amount={activeCart?.totalAmount ?? 0} currency={activeCart?.currency ?? 'COP'} />
                </div>
                <div className="flex justify-between text-[#94A3B8]">
                  <span>Impuestos incluidos</span>
                  <span>$0.00</span>
                </div>
                <div className="flex justify-between text-base font-bold text-white border-t border-[#1F293D] pt-3">
                  <span>Total</span>
                  <div className="text-[#00D4AA] text-lg">
                    <MoneyAmount amount={activeCart?.totalAmount ?? 0} currency={activeCart?.currency ?? 'COP'} />
                  </div>
                </div>
              </div>

              {/* Botón Primario de Checkout */}
              <Button
                onClick={handleCheckout}
                disabled={checkoutMutation.isPending}
                className="w-full h-12 bg-[#00D4AA] hover:bg-[#00D4AA]/90 text-[#0B0F19] font-bold text-sm shadow-lg shadow-[#00D4AA]/20 disabled:opacity-50"
              >
                {checkoutMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4 animate-spin" />
                    Iniciando reserva 15 min...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Confirmar Checkout (Reserva 15 min)
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>

              {/* Aviso de Reserva */}
              <div className="rounded-xl border border-[#1F293D] bg-[#161F30]/50 p-4 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-[#00D4AA] font-mono font-semibold">
                  <Clock className="h-4 w-4" />
                  Garantía de Checkout
                </div>
                <p className="text-[#94A3B8] leading-relaxed">
                  Al pulsar el botón de checkout, el sistema reserva las unidades en bodega y activa un reloj de 15 minutos en el que nadie más podrá comprar este stock.
                </p>
                <div className="flex items-center gap-2 text-[#64748B] pt-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Cero existencias negativas garantizadas.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
