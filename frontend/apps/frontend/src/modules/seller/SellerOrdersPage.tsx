import { useState } from 'react';
import { useOrdersQuery, useOrderQuery } from '../../application/services/orders';
import { useProductsQuery } from '../../application/services/catalog';
import {
  OrderStatus,
  type OrderListItem,
  type OrderItem,
  type SellerOrderView,
  type Order,
  type Product,
  type ProductVariant,
} from '../../domain';
import {
  NOMBRES_DE_ESTADO_DE_PEDIDO,
  TONOS_DE_ESTADO_DE_PEDIDO,
} from '../../components/domainLabels';
import {
  Button,
  Input,
  Badge,
  Skeleton,
  Alert,
  AlertTitle,
  AlertDescription,
  MoneyAmount,
  StatusBadge,
  StateView,
} from '@zentric/ui';
import {
  Search,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';


/**
 * Vista de Pedidos para el Vendedor (SellerOrdersPage - Frontend-Role-Modules §2.3).
 * Split-Frame Asimétrico (65% Listado de Pedidos / 35% Detalle SellerOrderView).
 * Garantiza cumplimiento de ADR-0013: Muestra exclusivamente líneas propias y vendorSubtotal,
 * ocultando datos del comprador (PII) y márgenes de otros comerciantes.
 */
export function SellerOrdersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | OrderStatus>('All');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const {
    data: orders,
    isLoading: isLoadingOrders,
    isError: isErrorOrders,
    error: errorOrders,
    refetch: refetchOrders,
    isFetching: isFetchingOrders,
  } = useOrdersQuery();

  const {
    data: selectedOrderDetail,
    isLoading: isLoadingDetail,
  } = useOrderQuery(selectedOrderId ?? '');

  const { data: products } = useProductsQuery();

  // Mapeo auxiliar SKU / nombre de producto
  const variantNameMap = new Map<string, { sku: string; name: string }>();
  (products ?? []).forEach((p: Product) => {
    (p.variants ?? []).forEach((v: ProductVariant) => {
      variantNameMap.set(v.id, { sku: v.sku, name: p.name });
    });
  });

  const allOrders = orders ?? [];

  const filteredOrders = allOrders.filter((order: OrderListItem) => {
    const matchesSearch =
      !searchTerm.trim() ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Si no hay seleccionado y hay pedidos, preseleccionar el primero
  const activeOrder = selectedOrderId
    ? (selectedOrderDetail as (Order | SellerOrderView) | undefined)
    : filteredOrders.length > 0
    ? (filteredOrders[0] as unknown as (Order | SellerOrderView))
    : null;

  const currentOrderId = selectedOrderId ?? filteredOrders[0]?.id;

  if (isLoadingOrders) {
    return (
      <div className="space-y-8 p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full">
        <Skeleton className="h-8 w-48 bg-surface" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <Skeleton className="lg:col-span-8 h-96 rounded-2xl bg-surface" />
          <Skeleton className="lg:col-span-4 h-96 rounded-2xl bg-surface" />
        </div>
      </div>
    );
  }

  if (isErrorOrders) {
    return (
      <div className="space-y-6 p-6 sm:p-10 max-w-4xl mx-auto w-full">
        <Alert variant="destructive" className="border-red-900 bg-red-950/40 text-red-200">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <AlertTitle>Error al cargar pedidos</AlertTitle>
          <AlertDescription>
            {errorOrders instanceof Error
              ? errorOrders.message
              : 'Ocurrió un error inesperado al consultar los pedidos.'}
          </AlertDescription>
        </Alert>
        <Button
          onClick={() => refetchOrders()}
          variant="outline"
          className="border-border text-foreground hover:bg-border"
        >
          <RefreshCw className="h-4 w-4 mr-2" /> Reintentar
        </Button>
      </div>
    );
  }

  // Calcular subtotal de vendedor en la orden activa
  const vendorSubtotal =
    activeOrder && 'vendorSubtotal' in activeOrder
      ? activeOrder.vendorSubtotal
      : activeOrder && 'totalAmount' in activeOrder
      ? activeOrder.totalAmount
      : 0;

  return (
    <div className="space-y-8 p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full">
      {/* ── Encabezado de Pedidos ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
              Pedidos Recibidos
            </h1>
            <Badge variant="outline" className="border-border text-brand font-mono text-xs">
              {allOrders.length} Totales
            </Badge>
          </div>
          <p className="text-sm text-foreground-muted">
            Líneas vendidas, liquidación subtotal y estado de orden de compra (ADR-0013).
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetchOrders()}
          disabled={isFetchingOrders}
          className="border-border text-foreground-muted hover:text-foreground"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetchingOrders ? 'animate-spin' : ''}`} />
          Refrescar
        </Button>
      </div>

      {/* ── Composición Asimétrica Split-Frame (65% / 35%) ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Lado Izquierdo (65%): Listado de Pedidos ────────────────────── */}
        <section className="lg:col-span-8 space-y-6">
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
              <Input
                type="text"
                placeholder="Buscar por ID de pedido..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-surface border-border text-foreground placeholder:text-foreground-muted focus:border-brand"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'All' | OrderStatus)}
              aria-label="Filtrar por estado del pedido"
              className="bg-surface border border-border text-foreground text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-brand"
            >
              <option value="All">Todos los estados</option>
              {Object.values(OrderStatus).map((status) => (
                <option key={status} value={status}>
                  {NOMBRES_DE_ESTADO_DE_PEDIDO[status]}
                </option>
              ))}
            </select>
          </div>

          {filteredOrders.length === 0 ? (
            <StateView
              state="empty"
              title="No hay pedidos registrados"
              description={
                searchTerm || statusFilter !== 'All'
                  ? 'No hay pedidos que coincidan con los filtros aplicados.'
                  : 'Aún no se han recibido compras que contengan productos de tu catálogo.'
              }
            />
          ) : (

            <div className="space-y-3">
              {filteredOrders.map((order: OrderListItem) => {
                const isSelected = order.id === currentOrderId;

                return (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`rounded-2xl border p-5 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-brand bg-surface-muted shadow-lg shadow-brand/5'
                        : 'border-border bg-surface hover:border-border/80 hover:bg-surface-muted/40'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-foreground">
                            #{order.id.substring(0, 8)}
                          </span>
                          <StatusBadge tone={TONOS_DE_ESTADO_DE_PEDIDO[order.status]}>
                            {NOMBRES_DE_ESTADO_DE_PEDIDO[order.status]}
                          </StatusBadge>
                        </div>
                        <div className="text-xs text-foreground-muted flex items-center gap-2">
                          <span>{new Date(order.createdAt).toLocaleString()}</span>
                          <span>•</span>
                          <span>{order.itemCount ?? (order.items ?? []).length} ítems</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4">
                        <div className="text-right">
                          <div className="text-xs text-foreground-muted">Monto Total</div>
                          <div className="text-sm font-mono font-semibold text-brand">
                            <MoneyAmount amount={order.totalAmount} currency={order.currency} />
                          </div>
                        </div>
                        <ChevronRight className={`h-5 w-5 ${isSelected ? 'text-brand' : 'text-foreground-muted'}`} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Lado Derecho (35%): Ficha SellerOrderView (ADR-0013) ──────── */}
        <aside className="lg:col-span-4 space-y-6">
          {isLoadingDetail ? (
            <div className="rounded-2xl border border-border bg-surface p-6 space-y-4">
              <Skeleton className="h-6 w-32 bg-surface-muted" />
              <Skeleton className="h-24 rounded-lg bg-surface-muted" />
              <Skeleton className="h-40 rounded-lg bg-surface-muted" />
            </div>
          ) : activeOrder ? (
            <div className="rounded-2xl border border-border bg-surface p-6 space-y-6">
              <div className="space-y-1 pb-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-foreground font-sans">
                    Detalle de Liquidación
                  </h2>
                  <StatusBadge tone={TONOS_DE_ESTADO_DE_PEDIDO[activeOrder.status]}>
                    {NOMBRES_DE_ESTADO_DE_PEDIDO[activeOrder.status]}
                  </StatusBadge>
                </div>
                <p className="font-mono text-xs text-brand truncate">
                  ID: {activeOrder.id}
                </p>
                <p className="text-[11px] text-foreground-muted">
                  Creado: {new Date(activeOrder.createdAt).toLocaleString()}
                </p>
              </div>

              {/* Líneas Propias Vendidas */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                  Líneas de tu Catálogo
                </h3>

                {(!activeOrder.items || activeOrder.items.length === 0) ? (
                  <p className="text-xs text-foreground-muted italic">
                    Sin líneas de variantes especificadas.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {activeOrder.items.map((item: OrderItem) => {
                      const info = variantNameMap.get(item.variantId);

                      return (
                        <div
                          key={item.id ?? item.variantId}
                          className="rounded-xl border border-border bg-surface-muted/60 p-3 space-y-1"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-xs font-medium text-foreground">
                              {info?.name ?? 'Variante en Pedido'}
                            </span>
                            <span className="text-xs font-mono font-semibold text-brand">
                              <MoneyAmount amount={item.totalPrice} currency={activeOrder.currency} />
                            </span>
                          </div>
                          <div className="flex justify-between text-[11px] text-foreground-muted font-mono">
                            <span>SKU: {info?.sku ?? item.variantId.substring(0, 8)}</span>
                            <span>
                              {item.quantity} × <MoneyAmount amount={item.unitPrice} currency={activeOrder.currency} />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Subtotal Liquidable del Vendedor */}
              <div className="rounded-xl border border-border bg-surface-muted p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-foreground-muted">
                    Subtotal Vendedor
                  </span>
                  <span className="text-base font-mono font-bold text-foreground">
                    <MoneyAmount amount={vendorSubtotal} currency={activeOrder.currency} />
                  </span>
                </div>
                <p className="text-[11px] text-foreground-muted">
                  Monto bruto atribuido a tus productos antes de comisiones de plataforma.
                </p>
              </div>

              {/* Cumplimiento ADR-0013 */}
              <div className="flex items-start gap-2.5 rounded-xl border border-border bg-surface-muted/30 p-3.5">
                <ShieldCheck className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                <p className="text-[11px] text-foreground-muted leading-relaxed">
                  <strong>ADR-0013 (Aislamiento de Recursos):</strong> Los datos del comprador (PII)
                  y los importes de otros comercios participantes están protegidos por el servidor.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-foreground-muted">
              Selecciona un pedido para inspeccionar su liquidación.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
