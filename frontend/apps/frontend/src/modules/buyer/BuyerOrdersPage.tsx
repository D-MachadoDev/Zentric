import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useOrdersQuery, useCancelOrderMutation } from '../../application/services/orders';
import { useProductsPagedQuery } from '../../application/services/catalog';
import { useReturnsQuery } from '../../application/services/returns';
import { OrderStatus, type OrderListItem, type ReturnRequest } from '../../domain';
import {
  NOMBRES_DE_ESTADO_DE_PEDIDO,
  TONOS_DE_ESTADO_DE_PEDIDO,
  NOMBRES_DE_ESTADO_DE_DEVOLUCION,
  TONOS_DE_ESTADO_DE_DEVOLUCION,
} from '../../components/domainLabels';
import {
  Button,
  Badge,
  Skeleton,
  Alert,
  AlertTitle,
  AlertDescription,
  StateView,
  MoneyAmount,
  StatusBadge,
  StatCard,
} from '@zentric/ui';
import {
  ShoppingBag,
  CreditCard,
  Eye,
  RefreshCw,
  Clock,
  CheckCircle,
  Truck,
  RotateCcw,
  Package,
  Copy,
  Check,
  XCircle,
} from 'lucide-react';
import { getProductImageUrl } from './productImages';

/**
 * Historial de Pedidos del Comprador (Frontend-Role-Modules sección 2.4).
 * - Los pedidos en `PendingPayment` solo permanecen en "Pendientes de Pago" mientras su
 *   ventana de 15 minutos esté vigente (`expiresAt > now`). Si expiran, salen de la lista.
 * - Incluye botón "Cancelar pedido" para liberar manualmente la reserva sin esperar 15 minutos.
 * - Todos los elementos (título del pedido, productos, miniaturas y devoluciones) son clicables.
 */
export function BuyerOrdersPage() {
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const { data: orders, isLoading, isError, error, refetch, isFetching } = useOrdersQuery();
  const { data: productsResult } = useProductsPagedQuery();
  const products = productsResult?.items ?? [];
  const { data: returns } = useReturnsQuery();
  const cancelOrderMutation = useCancelOrderMutation();
  const buyerReturns = returns ?? [];

  const handleCopyOrderId = (id: string) => {
    try {
      navigator.clipboard?.writeText(id);
      setCopiedOrderId(id);
      setTimeout(() => setCopiedOrderId(null), 2500);
    } catch {
      // Fallback silencioso si el portapapeles no está disponible
    }
  };

  const handleCancelPendingOrder = async (orderId: string) => {
    setCancellingOrderId(orderId);
    try {
      await cancelOrderMutation.mutateAsync(orderId);
      void refetch();
    } finally {
      setCancellingOrderId(null);
    }
  };

  const allOrders = orders ?? [];

  const isPendingPaymentActive = (o: OrderListItem): boolean => {
    if (o.status !== OrderStatus.PendingPayment) return false;
    // El backend es la autoridad sobre la ventana de 15 min (expiresAt/canStillPay).
    // El frontend solo refleja ese veredicto para evitar desfases por reloj del cliente.
    if (o.canStillPay === false) return false;
    return true;
  };

  // Excluir carritos abiertos y pedidos pendientes de pago cuyo tiempo de checkout de 15 min ya expiró
  const nonCartOrders = allOrders.filter((o: OrderListItem) => {
    if (o.status === OrderStatus.Cart) return false;
    if (o.status === OrderStatus.PendingPayment) {
      return isPendingPaymentActive(o);
    }
    return true;
  });

  // Métricas para el Hero KPI Strip
  const pendingPaymentOrders = nonCartOrders.filter((o: OrderListItem) =>
    isPendingPaymentActive(o),
  );
  const deliveredOrders = nonCartOrders.filter(
    (o: OrderListItem) => o.status === OrderStatus.Delivered
  );
  const paidOrDispatchedOrders = nonCartOrders.filter(
    (o: OrderListItem) =>
      o.status === OrderStatus.Paid || o.status === OrderStatus.Dispatched
  );

  // Filtrado de lista por estado
  const filteredOrders = nonCartOrders.filter((o: OrderListItem) => {
    if (selectedStatus === 'All') return true;
    return o.status === selectedStatus;
  });

  if (isLoading) {
    return (
      <div className="space-y-8 w-full max-w-full">
        <Skeleton className="h-8 w-48 bg-surface" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Skeleton className="h-28 rounded-2xl bg-surface" />
          <Skeleton className="h-28 rounded-2xl bg-surface" />
          <Skeleton className="h-28 rounded-2xl bg-surface" />
        </div>
        <Skeleton className="h-80 rounded-2xl bg-surface" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 sm:p-10 max-w-4xl mx-auto w-full space-y-4">
        <Alert variant="destructive" className="border-danger/30 bg-danger/10 text-danger">
          <AlertTitle>Error al cargar el historial de pedidos</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'No fue posible consultar sus compras.'}
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
              Mis Pedidos
            </h1>
            <Badge variant="outline" className="border-border text-brand font-mono text-xs">
              {nonCartOrders.length} totales
            </Badge>
          </div>
          <p className="text-sm text-foreground-muted">
            Historial de transacciones, estado de despachos y facturas tributarias de la plataforma.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="border-border text-foreground-muted hover:text-foreground"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refrescar
          </Button>

          <Link to="/buyer/cart">
            <Button variant="secondary" size="sm" className="bg-surface border border-border text-brand">
              <ShoppingBag className="h-4 w-4 mr-1.5" /> Ver Carrito
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Hero KPI Strip Asimétrico ───────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard
          title="Pendientes de Pago (15 min)"
          value={pendingPaymentOrders.length.toString()}
          badge={{
            label: pendingPaymentOrders.length > 0 ? 'Acción Requerida' : 'Al Día',
            tone: pendingPaymentOrders.length > 0 ? 'warning' : 'neutral',
          }}
          icon={Clock}
          subtitle="Pedidos en ventana de checkout atómico"
        />
        <StatCard
          title="En Proceso y Despacho"
          value={paidOrDispatchedOrders.length.toString()}
          badge={{ label: 'En Ruta', tone: 'info' }}
          icon={Truck}
          subtitle="Pagados y en preparación o en camino"
        />
        <StatCard
          title="Entregados"
          value={deliveredOrders.length.toString()}
          badge={{ label: 'Completados', tone: 'success' }}
          icon={CheckCircle}
          subtitle="Entregas completadas satisfactoriamente"
        />
      </div>

      {/* ── Seguimiento de Devoluciones y Garantías Activas (Clicables) ── */}
      {buyerReturns.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-brand" />
              <h2 className="text-sm font-bold text-foreground font-sans">
                Mis Solicitudes de Devolución y Garantía
              </h2>
            </div>
            <Badge variant="outline" className="border-border text-brand font-mono text-xs">
              {buyerReturns.length} {buyerReturns.length === 1 ? 'expediente' : 'expedientes'}
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {buyerReturns.map((ret: ReturnRequest) => (
              <Link
                key={ret.id}
                to="/buyer/orders/$orderId"
                params={{ orderId: ret.customerOrderId }}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-muted/40 p-3 text-xs transition-colors hover:border-brand/50 hover:bg-surface-muted"
              >
                <div className="space-y-0.5 font-mono">
                  <div className="font-bold text-foreground hover:text-brand">
                    Devolución #{ret.id.slice(0, 8).toUpperCase()}
                  </div>
                  <div className="text-[11px] text-foreground-muted">
                    Pedido #{ret.customerOrderId.slice(0, 8).toUpperCase()} · Cant: {ret.quantity} ud(s)
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge tone={TONOS_DE_ESTADO_DE_DEVOLUCION[ret.status]}>
                    {NOMBRES_DE_ESTADO_DE_DEVOLUCION[ret.status]}
                  </StatusBadge>
                  <span className="font-mono text-[10px] text-foreground-muted">
                    {ret.isGoodCondition ? 'Inspección: Intacto' : 'Inspección física en proceso'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Filtros por Estado ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {[
          { id: 'All', label: 'Todos' },
          { id: OrderStatus.PendingPayment, label: 'Pendientes de Pago' },
          { id: OrderStatus.Paid, label: 'Pagados' },
          { id: OrderStatus.Dispatched, label: 'Despachados' },
          { id: OrderStatus.Delivered, label: 'Entregados' },
          { id: OrderStatus.Cancelled, label: 'Cancelados' },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setSelectedStatus(f.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors whitespace-nowrap ${
              selectedStatus === f.id
                ? 'bg-brand text-primary-foreground font-bold'
                : 'bg-surface text-foreground-muted hover:text-primary-foreground border border-border'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Lista de Pedidos ────────────────────────────────────────────── */}
      {filteredOrders.length === 0 ? (
        <StateView
          state="empty"
          title="No se encontraron pedidos"
          description={
            selectedStatus !== 'All'
              ? 'No tienes pedidos registrados en el estado seleccionado.'
              : 'Aún no has confirmado ningún pedido. Explora el catálogo para comenzar.'
          }
          action={
            selectedStatus !== 'All'
              ? {
                  label: 'Mostrar todos',
                  onClick: () => setSelectedStatus('All'),
                }
              : {
                  label: 'Explorar Catálogo',
                  onClick: () => window.location.assign('/buyer/catalog'),
                }
          }
        />
      ) : (
        <div className="space-y-6">
          {filteredOrders.map((order: OrderListItem) => {
            const isPendingPayment = order.status === OrderStatus.PendingPayment;
            const isDelivered = order.status === OrderStatus.Delivered;

            return (
              <div
                key={order.id}
                className={`rounded-2xl border bg-surface transition-all overflow-hidden ${
                  isPendingPayment
                    ? 'border-warning/50 shadow-lg shadow-warning/5'
                    : 'border-border hover:border-brand/40 shadow-xs'
                }`}
              >
                {/* ── Cabecera del Pedido ── */}
                <div className="border-b border-border/70 bg-surface-muted/40 p-4 sm:px-6 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <Link
                        to="/buyer/orders/$orderId"
                        params={{ orderId: order.id }}
                        className="text-sm font-mono font-bold text-foreground hover:text-brand transition-colors"
                      >
                        Pedido #{order.id.slice(0, 8).toUpperCase()}
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleCopyOrderId(order.id)}
                        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-mono text-foreground-muted hover:bg-surface-muted hover:text-foreground transition-colors border border-border/70"
                        title="Copiar ID completo del pedido"
                        aria-label="Copiar ID del pedido"
                      >
                        {copiedOrderId === order.id ? (
                          <>
                            <Check className="h-3 w-3 text-brand" />
                            <span className="text-[10px] text-brand font-semibold">¡Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span className="text-[10px]">Copiar ID</span>
                          </>
                        )}
                      </button>
                    </div>
                    <StatusBadge tone={TONOS_DE_ESTADO_DE_PEDIDO[order.status]}>
                      {NOMBRES_DE_ESTADO_DE_PEDIDO[order.status]}
                    </StatusBadge>
                    {isPendingPayment && (
                      <Badge className="bg-warning/20 text-warning border-warning/30 text-xs font-mono animate-pulse">
                        <Clock className="h-3 w-3 mr-1 inline" />
                        Reserva activa (15 min)
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono text-foreground-muted">
                    <span>
                      {new Date(order.createdAt).toLocaleDateString('es-CO', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <span>•</span>
                    <span>
                      {order.itemCount} {order.itemCount === 1 ? 'artículo' : 'artículos'}
                    </span>
                  </div>
                </div>

                {/* ── Desglose de Artículos del Pedido (100% Clicable) ── */}
                <div className="p-4 sm:p-6 divide-y divide-border/50">
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item) => {
                      const matchedProduct = products?.find((p) =>
                        p.variants?.some((v) => v.id === item.variantId)
                      );
                      const matchedVariant = matchedProduct?.variants?.find(
                        (v) => v.id === item.variantId
                      );
                      const productName = item.productName || matchedProduct?.name || 'Artículo de compra';
                      const sku = item.sku || matchedVariant?.sku;
                      const imageUrl = item.imageUrl || (matchedProduct
                        ? getProductImageUrl(matchedProduct)
                        : 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=300&q=80');
                      const vendorName = item.vendorName;
                      const targetProductId = item.productId || matchedProduct?.id;

                      return (
                        <div
                          key={item.id}
                          className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {targetProductId ? (
                              <Link
                                to="/buyer/catalog/$productId"
                                params={{ productId: targetProductId }}
                                className="shrink-0"
                              >
                                <img
                                  src={imageUrl}
                                  alt={productName}
                                  className="h-12 w-12 rounded-xl object-cover bg-surface-muted border border-border hover:border-brand transition-colors"
                                  loading="lazy"
                                />
                              </Link>
                            ) : (
                              <Link
                                to="/buyer/orders/$orderId"
                                params={{ orderId: order.id }}
                                className="shrink-0"
                              >
                                <img
                                  src={imageUrl}
                                  alt={productName}
                                  className="h-12 w-12 rounded-xl object-cover bg-surface-muted border border-border hover:border-brand transition-colors"
                                  loading="lazy"
                                />
                              </Link>
                            )}
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-2">
                                {targetProductId ? (
                                  <Link
                                    to="/buyer/catalog/$productId"
                                    params={{ productId: targetProductId }}
                                    className="text-sm font-semibold text-foreground hover:text-brand transition-colors truncate"
                                  >
                                    {productName}
                                  </Link>
                                ) : (
                                  <Link
                                    to="/buyer/orders/$orderId"
                                    params={{ orderId: order.id }}
                                    className="text-sm font-semibold text-foreground hover:text-brand transition-colors truncate"
                                  >
                                    {productName}
                                  </Link>
                                )}
                                {vendorName && (
                                  <Badge variant="outline" className="text-[10px] font-mono border-border text-foreground-muted px-1.5 py-0 shrink-0">
                                    {vendorName}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-foreground-muted">
                                {sku && (
                                  <span className="text-[11px] text-brand">
                                    SKU: {sku}
                                  </span>
                                )}
                                <span>•</span>
                                <span>Cant: {item.quantity}</span>
                                <span>•</span>
                                <span>
                                  ${item.unitPrice.toLocaleString('es-CO', { minimumFractionDigits: 0 })} c/u
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="block font-mono text-sm font-bold text-foreground tabular-nums">
                              ${item.totalPrice.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                            </span>
                            <span className="text-[10px] font-mono text-foreground-muted">
                              {order.currency || 'COP'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <Link
                      to="/buyer/orders/$orderId"
                      params={{ orderId: order.id }}
                      className="py-2 text-xs text-foreground-muted hover:text-brand font-mono flex items-center gap-2 transition-colors"
                    >
                      <Package className="h-4 w-4 text-brand" />
                      <span>{order.itemCount} artículo(s) procesados en esta orden. Ver desglose →</span>
                    </Link>
                  )}
                </div>

                {/* ── Pie del Pedido con Total y Acciones ── */}
                <div className="border-t border-border/70 bg-surface-muted/20 p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-foreground-muted block">
                      Importe Total
                    </span>
                    <div className="text-xl font-bold font-mono text-foreground tabular-nums">
                      <MoneyAmount amount={order.totalAmount} currency={order.currency} />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {isPendingPayment && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void handleCancelPendingOrder(order.id)}
                          disabled={cancellingOrderId === order.id || cancelOrderMutation.isPending}
                          className="border-danger/40 text-danger hover:bg-danger/10 text-xs font-mono"
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1.5" />
                          {cancellingOrderId === order.id ? 'Cancelando...' : 'Cancelar pedido'}
                        </Button>

                        <Link to="/buyer/orders/$orderId/pay" params={{ orderId: order.id }}>
                          <Button
                            size="sm"
                            className="bg-warning hover:bg-warning/90 text-primary-foreground font-bold text-xs shadow-md shadow-warning/20"
                          >
                            <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                            Pagar Pedido
                          </Button>
                        </Link>
                      </>
                    )}

                    {isDelivered && (
                      <Link to="/buyer/returns/new" search={{ orderId: order.id }}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-border text-foreground-muted hover:text-foreground text-xs"
                        >
                          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                          Devolución
                        </Button>
                      </Link>
                    )}

                    <Link to="/buyer/orders/$orderId" params={{ orderId: order.id }}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-border text-foreground-muted hover:text-foreground hover:bg-surface-muted text-xs"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1.5" />
                        Ver Detalle
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
