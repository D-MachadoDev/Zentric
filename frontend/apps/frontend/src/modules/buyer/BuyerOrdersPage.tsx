import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useOrdersQuery } from '../../application/services/orders';
import { useProductsQuery } from '../../application/services/catalog';
import { OrderStatus, type OrderListItem } from '../../domain';
import {
  NOMBRES_DE_ESTADO_DE_PEDIDO,
  TONOS_DE_ESTADO_DE_PEDIDO,
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
} from 'lucide-react';
import { getProductImageUrl } from './productImages';

/**
 * Historial de Pedidos del Comprador (Frontend-Role-Modules §2.4).
 * Hero KPI Strip + Listado Filtrable con acceso al pago atómico de 15 min y detalle de despacho.
 */
export function BuyerOrdersPage() {
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const { data: orders, isLoading, isError, error, refetch, isFetching } = useOrdersQuery();
  const { data: products } = useProductsQuery();

  const allOrders = orders ?? [];

  // Excluir carritos abiertos de la vista de pedidos confirmados
  const nonCartOrders = allOrders.filter((o: OrderListItem) => o.status !== OrderStatus.Cart);

  // Métricas para el Hero KPI Strip
  const pendingPaymentOrders = nonCartOrders.filter(
    (o: OrderListItem) => o.status === OrderStatus.PendingPayment
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
        <Alert variant="destructive" className="border-red-900 bg-red-950/40 text-red-200">
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
                    <span className="text-sm font-mono font-bold text-foreground">
                      Pedido #{order.id.slice(0, 8)}
                    </span>
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

                {/* ── Desglose de Artículos del Pedido ── */}
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

                      return (
                        <div
                          key={item.id}
                          className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={imageUrl}
                              alt={productName}
                              className="h-12 w-12 rounded-xl object-cover bg-surface-muted border border-border shrink-0"
                              loading="lazy"
                            />
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-semibold text-foreground truncate">
                                  {productName}
                                </h4>
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
                    <div className="py-2 text-xs text-foreground-muted font-mono flex items-center gap-2">
                      <Package className="h-4 w-4 text-brand" />
                      <span>{order.itemCount} artículo(s) procesados en esta orden.</span>
                    </div>
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
                      <Link to="/buyer/orders/$orderId/pay" params={{ orderId: order.id }}>
                        <Button
                          size="sm"
                          className="bg-warning hover:bg-warning/90 text-primary-foreground font-bold text-xs shadow-md shadow-warning/20"
                        >
                          <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                          Pagar Pedido
                        </Button>
                      </Link>
                    )}

                    {isDelivered && (
                      <Link to="/buyer/returns/new">
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
