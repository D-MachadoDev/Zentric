import { useParams, Link } from '@tanstack/react-router';
import { useOrderQuery } from '../../application/services/orders';
import { useInvoicesByOrderQuery } from '../../application/services/billing';
import { useFulfillmentsQuery } from '../../application/services/logistics';
import { OrderStatus, InvoiceType, type OrderItem, type FulfillmentOrder, type Invoice } from '../../domain';
import {
  NOMBRES_DE_ESTADO_DE_PEDIDO,
  TONOS_DE_ESTADO_DE_PEDIDO,
  NOMBRES_DE_ESTADO_DE_DESPACHO,
  TONOS_DE_ESTADO_DE_DESPACHO,
} from '../../components/domainLabels';
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
  RotateCcw,
  AlertCircle,
  ShieldCheck,
  Copy,
  Check,
} from 'lucide-react';
import { useState } from 'react';

/**
 * Detalle del Pedido para el Comprador (Frontend-Role-Modules §2.4).
 * Split-Frame Asimétrico (65% / 35%) con desglose de ítems, guías de despacho,
 * Factura Maestra, línea de tiempo OrderTimeline y disparador de devoluciones si Delivered.
 */
export function BuyerOrderDetailPage() {
  const { orderId } = useParams({ strict: false }) as { orderId?: string };
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!orderId) return;
    try {
      navigator.clipboard?.writeText(orderId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const { data: orderData, isLoading: isLoadingOrder, isError: isErrorOrder, error: orderError } =
    useOrderQuery(orderId ?? '');

  const { data: invoices, isLoading: isLoadingInvoices } = useInvoicesByOrderQuery(orderId ?? '');
  const { data: fulfillments } = useFulfillmentsQuery();

  // Filtrar fulfillments pertenecientes a esta orden
  const orderFulfillments: FulfillmentOrder[] = (fulfillments ?? []).filter(
    (f: FulfillmentOrder) => f.customerOrderId === orderId
  );

  // Extraer Factura Maestra (Master)
  const masterInvoice: Invoice | undefined = (invoices ?? []).find(
    (inv: Invoice) => inv.type === InvoiceType.Master
  );

  if (isLoadingOrder) {
    return (
      <div className="space-y-8 w-full max-w-full">
        <Skeleton className="h-8 w-48 bg-surface" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
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
          <Button variant="outline" size="sm" className="border-border text-foreground-muted transition-all active:scale-[0.98]">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Volver a Mis Pedidos
          </Button>
        </Link>
        <Alert variant="destructive" className="border-red-900 bg-red-950/40 text-red-200">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <AlertTitle>Error al cargar el pedido</AlertTitle>
          <AlertDescription>
            {orderError instanceof Error ? orderError.message : 'El pedido solicitado no fue encontrado.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // orderData es un Order
  const order = orderData as import('../../domain').Order;
  const isPendingPayment = order.status === OrderStatus.PendingPayment;
  const isDelivered = order.status === OrderStatus.Delivered;

  return (
    <div className="space-y-8 w-full max-w-full">
      {/* ── Navegación y Encabezado ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link to="/buyer/orders">
              <Button variant="outline" size="sm" className="border-border text-foreground-muted hover:text-foreground mr-2 transition-all active:scale-[0.98]">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
                Pedido #{order.id.slice(0, 8).toUpperCase()}
              </h1>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-mono text-foreground-muted hover:bg-surface-muted hover:text-foreground transition-colors border border-border"
                title="Copiar ID completo del pedido"
                aria-label="Copiar ID del pedido"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-brand" />
                    <span className="text-brand font-semibold">¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copiar ID</span>
                  </>
                )}
              </button>
            </div>
            <StatusBadge tone={TONOS_DE_ESTADO_DE_PEDIDO[order.status]}>
              {NOMBRES_DE_ESTADO_DE_PEDIDO[order.status]}
            </StatusBadge>
          </div>
          <p className="text-xs font-mono text-foreground-muted">
            Creado el {new Date(order.createdAt).toLocaleDateString('es-CO')} • ID: {order.id}
          </p>
        </div>

        {isPendingPayment && (
          <Link to="/buyer/orders/$orderId/pay" params={{ orderId: order.id }}>
            <Button className="bg-warning hover:bg-warning/90 text-primary-foreground font-bold text-sm shadow-md shadow-warning/20">
              <CreditCard className="h-4 w-4 mr-2" />
              Pagar Pedido (15 min)
            </Button>
          </Link>
        )}
      </div>

      {/* ── Composición Asimétrica Split-Frame (65% Detalle / 35% Línea de Tiempo y Acciones) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Lado Izquierdo: Ítems, Despachos y Factura Maestra (65% -> col-span-8) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Desglose de Líneas de Pedido */}
          <div className="rounded-2xl border border-border bg-surface overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-border bg-surface-muted/40 flex items-center justify-between">
              <span className="text-xs uppercase font-mono tracking-wider text-foreground-muted">
                Líneas Compradas ({order.items.length})
              </span>
              <span className="text-xs font-mono text-foreground font-bold">
                Total: <MoneyAmount amount={order.totalAmount} currency={order.currency} />
              </span>
            </div>

            <div className="divide-y divide-border">
              {order.items.map((item: OrderItem) => {
                const productName = item.productName || `Artículo #${item.variantId.slice(0, 8)}`;
                const sku = item.sku || item.variantId.slice(0, 8);
                const imageUrl = item.imageUrl || 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=300&q=80';
                const vendorName = item.vendorName;

                return (
                  <div key={item.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <img
                        src={imageUrl}
                        alt={productName}
                        className="h-14 w-14 rounded-xl object-cover bg-surface-muted border border-border shrink-0"
                        loading="lazy"
                      />
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-semibold text-foreground truncate">
                            {productName}
                          </h4>
                          {vendorName && (
                            <Badge variant="outline" className="text-[10px] font-mono border-border text-foreground-muted px-1.5 py-0">
                              Vendedor: {vendorName}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-foreground-muted">
                          <Badge variant="outline" className="text-[10px] font-mono border-brand/30 text-brand px-1.5 py-0">
                            SKU: {sku}
                          </Badge>
                          <span>•</span>
                          <span className="text-[11px] text-foreground-muted">ID: {item.variantId}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-right shrink-0">
                      <div>
                        <span className="text-[10px] uppercase font-mono text-foreground-muted block">Cantidad</span>
                        <span className="text-xs font-mono font-bold text-foreground tabular-nums">
                          {item.quantity} ud(s)
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-mono text-foreground-muted block">Precio Unitario</span>
                        <div className="text-xs font-mono text-foreground-muted tabular-nums">
                          <MoneyAmount amount={item.unitPrice} currency={order.currency} />
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-mono text-foreground-muted block">Importe</span>
                        <div className="text-sm font-mono font-bold text-foreground tabular-nums">
                          <MoneyAmount amount={item.totalPrice} currency={order.currency} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Guías de Despacho Logístico (Fulfillments) */}
          <div className="rounded-2xl border border-border bg-surface p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-brand" />
                <h2 className="text-sm uppercase font-mono tracking-wider text-foreground">
                  Despachos Logísticos
                </h2>
              </div>
              <Badge variant="outline" className="text-xs font-mono border-border text-foreground-muted">
                {orderFulfillments.length} paquetes
              </Badge>
            </div>

            {orderFulfillments.length === 0 ? (
              <p className="text-xs font-mono text-foreground-muted py-2">
                {isPendingPayment
                  ? 'Las guías y paquetes de despacho se generan automáticamente tras acreditar el pago.'
                  : 'Sin información de despacho disponible actualmente.'}
              </p>
            ) : (
              <div className="space-y-3">
                {orderFulfillments.map((ful: FulfillmentOrder) => (
                  <div key={ful.id} className="p-4 rounded-xl border border-border bg-surface-muted/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-foreground">
                        Despacho #{ful.id.slice(0, 8)}
                      </span>
                      <StatusBadge tone={TONOS_DE_ESTADO_DE_DESPACHO[ful.status]}>
                        {NOMBRES_DE_ESTADO_DE_DESPACHO[ful.status]}
                      </StatusBadge>
                    </div>
                    {ful.shipments && ful.shipments.length > 0 && (
                      <div className="space-y-1 pt-1">
                        {ful.shipments.map((s) => (
                          <div key={s.id} className="text-xs font-mono text-foreground-muted flex items-center justify-between">
                            <span>Bodega Origen: {s.warehouseId.slice(0, 8)}</span>
                            <span className="text-brand font-bold">Guía: {s.trackingNumber}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Factura Maestra del Comprador */}
          <div className="rounded-2xl border border-border bg-surface p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-brand" />
                <h2 className="text-sm uppercase font-mono tracking-wider text-foreground">
                  Facturación Tributaria
                </h2>
              </div>
              <Badge variant="outline" className="text-xs font-mono border-border text-brand">
                Factura Maestra
              </Badge>
            </div>

            {isLoadingInvoices ? (
              <Skeleton className="h-16 w-full bg-surface-muted" />
            ) : masterInvoice ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-surface-muted/40">
                <div className="space-y-1">
                  <span className="text-xs font-mono font-bold text-foreground">
                    Factura #{masterInvoice.id.slice(0, 8)}
                  </span>
                  <p className="text-xs font-mono text-foreground-muted">
                    Emitida el: {new Date(masterInvoice.issuedAt).toLocaleDateString('es-CO')}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-mono text-foreground-muted block">Importe Total</span>
                  <div className="text-base font-mono font-bold text-brand tabular-nums">
                    <MoneyAmount amount={masterInvoice.totalAmount} currency={masterInvoice.currency} />
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs font-mono text-foreground-muted py-2">
                {isPendingPayment
                  ? 'La Factura Maestra se emitirá automáticamente una vez se complete el pago.'
                  : 'Factura en proceso de generación.'}
              </p>
            )}
          </div>
        </div>

        {/* Lado Derecho: Línea de Tiempo y Acciones (35% -> col-span-4) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Tarjeta de Línea de Tiempo */}
          <div className="rounded-2xl border border-border bg-surface p-6 space-y-6 shadow-xl sticky top-6">
            <h2 className="text-sm uppercase font-mono tracking-wider text-foreground-muted">
              Ciclo de Vida del Pedido
            </h2>

            {/* Componente OrderTimeline */}
            <OrderTimeline currentStatus={order.status} orientation="vertical" />

            {/* Solicitud de Devolución (Solo si Delivered) */}
            {isDelivered && (
              <div className="border-t border-border pt-5 space-y-3">
                <div className="space-y-1">
                  <span className="text-xs font-mono font-semibold text-foreground flex items-center gap-1.5">
                    <RotateCcw className="h-3.5 w-3.5 text-brand" />
                    Devolución de Producto
                  </span>
                  <p className="text-xs text-foreground-muted">
                    ¿Hubo algún problema con su producto físico recibido? Puede iniciar una solicitud dentro de los 30 días de entrega.
                  </p>
                </div>

                <Link to="/buyer/returns/new" search={{ orderId: order.id }}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-border text-brand hover:bg-surface-muted"
                  >
                    Solicitar Devolución
                  </Button>
                </Link>
              </div>
            )}

            {/* Garantía de Seguridad */}
            <div className="rounded-xl border border-border bg-surface-muted/50 p-4 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-brand font-mono font-semibold">
                <ShieldCheck className="h-4 w-4" />
                Garantía Zentric
              </div>
              <p className="text-foreground-muted leading-relaxed">
                Toda compra realizada en la plataforma cuenta con trazabilidad logística de punta a punta e inspección física garantizada en devoluciones.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
