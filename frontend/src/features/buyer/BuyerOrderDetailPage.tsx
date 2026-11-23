import { useParams, Link, useNavigate } from '@tanstack/react-router';
import { useOrderQuery, useCancelOrderMutation } from '../../core';
import { useProductsPagedQuery } from '../../core';
import { useInvoicesByOrderQuery } from '../../core';
import { useFulfillmentsQuery } from '../../core';
import { useReturnsQuery } from '../../core';
import {
  OrderStatus,
  InvoiceType,
  type Order,
  type OrderItem,
  type FulfillmentOrder,
  type Invoice,
  type ReturnRequest,
} from '../../core';
import {
  NOMBRES_DE_ESTADO_DE_PEDIDO,
  TONOS_DE_ESTADO_DE_PEDIDO,
  NOMBRES_DE_ESTADO_DE_DESPACHO,
  TONOS_DE_ESTADO_DE_DESPACHO,
  NOMBRES_DE_ESTADO_DE_DEVOLUCION,
  TONOS_DE_ESTADO_DE_DEVOLUCION,
} from '../../core';
import {
  Button,
  Badge,
  Skeleton,
  Alert,
  AlertTitle,
  AlertDescription,
  MoneyAmount,
  StatusBadge,
  OrderTimeline,
} from '@zentric/ui';
import {
  ArrowLeft,
  CreditCard,
  Truck,
  FileText,
  Package,
  RotateCcw,
  AlertCircle,
  ShieldCheck,
  Copy,
  Check,
  XCircle,
  Calendar,
  PackageCheck,
  Download,
} from 'lucide-react';
import { useState } from 'react';
import { getProductImageUrl } from './productImages';

/**
 * Expediente de Detalle del Pedido para el Comprador (100% Perspectiva de Usuario).
 * Diseño limpio y sin jerga técnica:
 * - Estados en lenguaje humano natural con microinteracciones fluidas.
 * - Miniaturas de estudio de alta resolución sin recuadros toscos.
 * - Guías de despacho y factura electrónica directas y descargables.
 * - Trazabilidad en tiempo real con fecha estimada de entrega.
 */
export function BuyerOrderDetailPage() {
  const { orderId } = useParams({ strict: false }) as { orderId?: string };
  const navigate = useNavigate();
  const [copiedId, setCopiedId] = useState(false);
  const [copiedTracking, setCopiedTracking] = useState<string | null>(null);

  const handleCopyOrderId = () => {
    if (!orderId) return;
    try {
      navigator.clipboard?.writeText(orderId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleCopyTracking = (trk: string) => {
    try {
      navigator.clipboard?.writeText(trk);
      setCopiedTracking(trk);
      setTimeout(() => setCopiedTracking(null), 2500);
    } catch {
      // Fallback
    }
  };

  const { data: orderData, isLoading: isLoadingOrder, isError: isErrorOrder, error: orderError } =
    useOrderQuery(orderId ?? '');
  const { data: productsResult } = useProductsPagedQuery();
  const products = productsResult?.items ?? [];
  const cancelOrderMutation = useCancelOrderMutation();

  const { data: invoices, isLoading: isLoadingInvoices } = useInvoicesByOrderQuery(orderId ?? '');
  const { data: fulfillments } = useFulfillmentsQuery();
  const { data: returns } = useReturnsQuery();

  const handleCancelOrder = async () => {
    if (!orderId) return;
    try {
      await cancelOrderMutation.mutateAsync(orderId);
      navigate({ to: '/buyer/orders' });
    } catch {
      // Error manejado por estado
    }
  };

  const orderFulfillments: FulfillmentOrder[] = (fulfillments ?? []).filter(
    (f: FulfillmentOrder) => f.customerOrderId === orderId
  );
  const orderReturns: ReturnRequest[] = (returns ?? []).filter(
    (r: ReturnRequest) => r.customerOrderId === orderId
  );

  const masterInvoice: Invoice | undefined = (invoices ?? []).find(
    (inv: Invoice) => inv.type === InvoiceType.Master
  );

  if (isLoadingOrder) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <Skeleton className="h-8 w-48 bg-surface rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Skeleton className="lg:col-span-8 h-96 rounded-2xl bg-surface" />
          <Skeleton className="lg:col-span-4 h-96 rounded-2xl bg-surface" />
        </div>
      </div>
    );
  }

  if (isErrorOrder || !orderData) {
    return (
      <div className="p-6 sm:p-10 max-w-4xl mx-auto w-full space-y-4">
        <Link to="/buyer/orders">
          <Button variant="outline" size="sm" className="border-border text-foreground-muted rounded-full">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Volver a Mis Pedidos
          </Button>
        </Link>
        <Alert variant="destructive" className="border-danger/30 bg-danger/10 text-danger rounded-xl">
          <AlertCircle className="h-5 w-5 text-danger" />
          <AlertTitle>Error al cargar el pedido</AlertTitle>
          <AlertDescription>
            {orderError instanceof Error ? orderError.message : 'El pedido solicitado no fue encontrado.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const order = orderData as Order;
  const isPendingPayment = order.status === OrderStatus.PendingPayment;
  const isDelivered = order.status === OrderStatus.Delivered;

  // Cálculo de fecha estimada de entrega (3 a 5 días hábiles a partir de la creación)
  const orderDate = new Date(order.createdAt);
  const estimatedDeliveryDate = new Date(orderDate.getTime() + 4 * 24 * 60 * 60 * 1000);
  const estimatedDeliveryText = estimatedDeliveryDate.toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-6">
      {/* ── Encabezado Principal y Acciones ───────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <Link to="/buyer/orders">
              <Button
                variant="outline"
                size="sm"
                pill
                className="border-border text-foreground-muted hover:text-foreground rounded-full size-9 p-0 flex items-center justify-center cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-sans">
              Pedido #{order.id.slice(0, 8).toUpperCase()}
            </h1>
            <button
              type="button"
              onClick={handleCopyOrderId}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs text-foreground-muted hover:bg-surface-muted hover:text-foreground transition-colors border border-border/80 cursor-pointer"
              title="Copiar ID del pedido"
              aria-label="Copiar ID del pedido"
            >
              {copiedId ? (
                <>
                  <Check className="h-3 w-3 text-brand" />
                  <span className="text-brand font-semibold text-[11px]">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span className="text-[11px]">Copiar ID</span>
                </>
              )}
            </button>
            <StatusBadge tone={TONOS_DE_ESTADO_DE_PEDIDO[order.status]}>
              {NOMBRES_DE_ESTADO_DE_PEDIDO[order.status]}
            </StatusBadge>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-foreground-muted pt-0.5">
            <span className="flex items-center gap-1">
              <Calendar className="size-3.5 text-foreground-muted/80" />
              Realizado el {orderDate.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
            <span>•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              Entrega estimada: {estimatedDeliveryText}
            </span>
          </div>
        </div>

        {/* Acciones Rápidas */}
        {isPendingPayment && (
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              pill
              onClick={() => void handleCancelOrder()}
              disabled={cancelOrderMutation.isPending}
              className="border border-danger/30 text-danger hover:bg-danger/10 text-xs rounded-full cursor-pointer"
            >
              <XCircle className="h-3.5 w-3.5 mr-1.5" />
              {cancelOrderMutation.isPending ? 'Cancelando...' : 'Cancelar pedido'}
            </Button>

            <Link to="/buyer/orders/$orderId/pay" params={{ orderId: order.id }}>
              <Button
                pill
                className="bg-brand hover:bg-brand-strong text-primary-foreground font-bold text-xs sm:text-sm px-5 py-2 rounded-full shadow-sm cursor-pointer"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Pagar Pedido (15 min)
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* ── Composición 2 Columnas: Detalle de Compra y Línea de Tiempo ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Columna Izquierda (8 cols): Productos, Despacho y Facturación */}
        <div className="lg:col-span-8 space-y-5">
          {/* 1. Lista de Productos Comprados */}
          <div className="rounded-2xl border border-border/80 bg-surface overflow-hidden shadow-xs">
            <div className="p-4 sm:p-5 border-b border-border/60 bg-surface-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PackageCheck className="size-4 text-brand" />
                <h2 className="text-xs uppercase tracking-wider text-foreground font-bold">
                  Artículos del Pedido ({order.items.length})
                </h2>
              </div>
              <span className="text-xs text-foreground font-bold">
                Total:{' '}
                <span className="font-mono tabular-nums text-sm">
                  <MoneyAmount amount={order.totalAmount} currency={order.currency} />
                </span>
              </span>
            </div>

            <div className="divide-y divide-border/60">
              {order.items.map((item: OrderItem) => {
                const matchedProduct = products?.find((p) =>
                  p.variants?.some((v) => v.id === item.variantId)
                );
                const productName =
                  item.productName ||
                  matchedProduct?.name ||
                  `Artículo #${item.variantId.slice(0, 8)}`;
                const sku = item.sku || item.variantId.slice(0, 8);
                const imageUrl =
                  item.imageUrl ||
                  (matchedProduct
                    ? getProductImageUrl(matchedProduct)
                    : '');
                const vendorName = item.vendorName;
                const targetProductId = item.productId || matchedProduct?.id;

                return (
                  <div key={item.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      {targetProductId ? (
                        <Link
                          to="/buyer/catalog/$productId"
                          params={{ productId: targetProductId }}
                          className="shrink-0 group"
                        >
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={productName}
                              className="size-16 sm:size-20 rounded-xl object-cover bg-surface-muted border border-border/80 group-hover:border-brand transition-colors"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex size-16 sm:size-20 items-center justify-center rounded-xl bg-surface-muted border border-border/80 text-foreground-subtle">
                              <Package className="h-6 w-6" aria-hidden="true" />
                            </div>
                          )}
                        </Link>
                      ) : imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={productName}
                          className="size-16 sm:size-20 rounded-xl object-cover bg-surface-muted border border-border/80 shrink-0"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex size-16 sm:size-20 shrink-0 items-center justify-center rounded-xl bg-surface-muted border border-border/80 text-foreground-subtle">
                          <Package className="h-6 w-6" aria-hidden="true" />
                        </div>
                      )}
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {targetProductId ? (
                            <Link
                              to="/buyer/catalog/$productId"
                              params={{ productId: targetProductId }}
                              className="text-sm font-semibold text-foreground hover:text-brand transition-colors truncate"
                            >
                              {productName}
                            </Link>
                          ) : (
                            <h3 className="text-sm font-semibold text-foreground truncate">
                              {productName}
                            </h3>
                          )}
                        </div>

                        {/* Metadatos limpios */}
                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                          {vendorName && (
                            <Badge variant="outline" className="text-[11px] border-border text-foreground-muted px-2 py-0.5 rounded-full font-medium">
                              Vendedor: {vendorName}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[11px] border-brand/30 text-brand px-2 py-0.5 rounded-full font-medium font-mono">
                            SKU: {sku}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-5 text-right shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-border/50">
                      <div>
                        <span className="text-[11px] uppercase tracking-wider text-foreground-muted block">Cantidad</span>
                        <span className="text-xs font-bold text-foreground tabular-nums">
                          {item.quantity} ud(s)
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] uppercase tracking-wider text-foreground-muted block">Unitario</span>
                        <div className="font-mono text-xs text-foreground-muted tabular-nums">
                          <MoneyAmount amount={item.unitPrice} currency={order.currency} />
                        </div>
                      </div>
                      <div>
                        <span className="text-[11px] uppercase tracking-wider text-foreground-muted block">Subtotal</span>
                        <div className="font-mono text-sm font-bold text-foreground tabular-nums">
                          <MoneyAmount amount={item.totalPrice} currency={order.currency} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Despachos y Guías de Envío */}
          <div className="rounded-2xl border border-border/80 bg-surface p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-brand" />
                <h2 className="text-sm font-bold text-foreground">
                  Guías de Despacho y Envío
                </h2>
              </div>
              <Badge variant="outline" className="text-xs border-border/80 text-foreground-muted rounded-full">
                {orderFulfillments.length === 1 ? '1 paquete' : `${orderFulfillments.length} paquetes`}
              </Badge>
            </div>

            {orderFulfillments.length === 0 ? (
              <p className="text-xs text-foreground-muted py-2 leading-relaxed">
                {isPendingPayment
                  ? 'Las guías y paquetes de despacho se generan automáticamente tras acreditar el pago.'
                  : 'Tu pedido está siendo procesado para embalaje en bodega. La guía se asignará en breve.'}
              </p>
            ) : (
              <div className="space-y-3">
                {orderFulfillments.map((ful: FulfillmentOrder) => (
                  <div key={ful.id} className="p-4 rounded-xl border border-border/70 bg-surface-muted/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">
                          Paquete #{ful.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span className="text-[11px] text-foreground-muted">
                          · Centro de Distribución
                        </span>
                      </div>
                      <StatusBadge tone={TONOS_DE_ESTADO_DE_DESPACHO[ful.status]}>
                        {NOMBRES_DE_ESTADO_DE_DESPACHO[ful.status]}
                      </StatusBadge>
                    </div>

                    {ful.shipments && ful.shipments.length > 0 && (
                      <div className="space-y-2 pt-1 border-t border-border/60">
                        {ful.shipments.map((s) => (
                          <div key={s.id} className="text-xs flex flex-wrap items-center justify-between gap-2">
                            <span className="text-foreground-muted flex items-center gap-1.5">
                              <Truck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>Transportadora Nacional Aliada</span>
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-md">
                                TRK-{s.trackingNumber.replace(/^TRK-/, '')}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyTracking(s.trackingNumber)}
                                className="inline-flex items-center gap-1 text-[11px] text-foreground-muted hover:text-foreground transition-colors p-1 rounded-md border border-border cursor-pointer"
                                title="Copiar número de guía"
                              >
                                {copiedTracking === s.trackingNumber ? (
                                  <Check className="size-3 text-brand" />
                                ) : (
                                  <Copy className="size-3" />
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Factura Electrónica Tributaria */}
          <div className="rounded-2xl border border-border/80 bg-surface p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-brand" />
                <h2 className="text-sm font-bold text-foreground">
                  Facturación Electrónica DIAN
                </h2>
              </div>
              <Badge variant="outline" className="text-xs border-brand/30 text-brand bg-brand/5 rounded-full px-2 py-0.5">
                Factura Maestra
              </Badge>
            </div>

            {isLoadingInvoices ? (
              <Skeleton className="h-16 w-full bg-surface-muted rounded-xl" />
            ) : masterInvoice ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/70 bg-surface-muted/20">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">
                      Factura #{masterInvoice.id.slice(0, 8).toUpperCase()}
                    </span>
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 text-[10px] px-2 py-0 rounded-full font-medium">
                      Validez Tributaria
                    </Badge>
                  </div>
                  <p className="text-xs text-foreground-muted">
                    Emitida el {new Date(masterInvoice.issuedAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-[11px] uppercase tracking-wider text-foreground-muted block">Total Facturado</span>
                    <div className="font-mono text-sm font-bold text-brand tabular-nums">
                      <MoneyAmount amount={masterInvoice.totalAmount} currency={masterInvoice.currency} />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    pill
                    onClick={() => window.print()}
                    className="border-border text-foreground text-xs rounded-full cursor-pointer hidden sm:flex items-center gap-1.5"
                  >
                    <Download className="size-3.5" />
                    Descargar
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-foreground-muted py-2 leading-relaxed">
                {isPendingPayment
                  ? 'La Factura Maestra se emitirá automáticamente una vez se complete el pago.'
                  : 'Generando comprobante fiscal electrónico certificado por la DIAN.'}
              </p>
            )}
          </div>
        </div>

        {/* Columna Derecha (4 cols): Línea de Tiempo y Garantía */}
        <div className="lg:col-span-4 space-y-5">
          <div className="rounded-2xl border border-border/80 bg-surface p-5 sm:p-6 space-y-6 shadow-xs lg:sticky lg:top-6">
            <div className="border-b border-border/60 pb-3">
              <h2 className="text-xs uppercase tracking-wider text-foreground font-bold">
                Trazabilidad del Pedido
              </h2>
              <p className="text-xs text-foreground-muted mt-0.5">
                Seguimiento en vivo desde la confirmación hasta la entrega.
              </p>
            </div>

            <OrderTimeline currentStatus={order.status} orientation="vertical" />

            {/* Expedientes de Devolución si existen */}
            {orderReturns.length > 0 && (
              <div className="border-t border-border/60 pt-4 space-y-3">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <RotateCcw className="h-3.5 w-3.5 text-brand" />
                  Expedientes de Devolución ({orderReturns.length})
                </span>
                <div className="space-y-2">
                  {orderReturns.map((ret: ReturnRequest) => (
                    <div
                      key={ret.id}
                      className="rounded-xl border border-border/70 bg-surface-muted/30 p-3 space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-foreground">
                          #{ret.id.slice(0, 8).toUpperCase()}
                        </span>
                        <StatusBadge tone={TONOS_DE_ESTADO_DE_DEVOLUCION[ret.status]}>
                          {NOMBRES_DE_ESTADO_DE_DEVOLUCION[ret.status]}
                        </StatusBadge>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-foreground-muted">
                        <span>Cantidad: {ret.quantity} ud(s)</span>
                        <span>{ret.isGoodCondition ? 'Físico: Intacto' : 'Físico: En revisión'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Opción de Devolución si el pedido ya fue entregado */}
            {isDelivered && (
              <div className="border-t border-border/60 pt-4 space-y-2.5">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <RotateCcw className="h-3.5 w-3.5 text-brand" />
                    Devolución de Producto
                  </span>
                  <p className="text-xs text-foreground-muted leading-relaxed">
                    ¿Algún problema con tu producto físico recibido? Cuentas con 30 días de cobertura para iniciar devolución con reembolso asegurado.
                  </p>
                </div>

                <Link to="/buyer/returns/new" search={{ orderId: order.id }}>
                  <Button
                    variant="outline"
                    size="sm"
                    pill
                    className="w-full border-brand/40 text-brand hover:bg-brand/10 text-xs font-semibold rounded-full cursor-pointer"
                  >
                    Solicitar Devolución
                  </Button>
                </Link>
              </div>
            )}

            {/* Sello de Garantía Zentric */}
            <div className="rounded-xl border border-border/70 bg-surface-muted/20 p-4 space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 text-brand font-bold">
                <ShieldCheck className="h-4 w-4" />
                <span>Garantía Oficial Zentric</span>
              </div>
              <p className="text-foreground-muted leading-relaxed text-[11px]">
                Despacho con embalaje certificado, póliza de transporte asegurado y política de satisfacción directa.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
