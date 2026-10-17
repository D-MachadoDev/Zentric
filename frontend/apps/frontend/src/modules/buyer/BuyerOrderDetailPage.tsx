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
  Package,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';

/**
 * Detalle del Pedido para el Comprador (Frontend-Role-Modules §2.4).
 * Split-Frame Asimétrico (65% / 35%) con desglose de ítems, guías de despacho,
 * Factura Maestra, línea de tiempo OrderTimeline y disparador de devoluciones si Delivered.
 */
export function BuyerOrderDetailPage() {
  const { orderId } = useParams({ strict: false }) as { orderId?: string };

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
      <div className="space-y-8 p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full">
        <Skeleton className="h-8 w-48 bg-[#111827]" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <Skeleton className="lg:col-span-8 h-96 rounded-2xl bg-[#111827]" />
          <Skeleton className="lg:col-span-4 h-96 rounded-2xl bg-[#111827]" />
        </div>
      </div>
    );
  }

  if (isErrorOrder || !orderData) {
    return (
      <div className="p-6 sm:p-10 max-w-4xl mx-auto w-full space-y-4">
        <Link to="/buyer/orders">
          <Button variant="outline" size="sm" className="border-[#1F293D] text-[#94A3B8]">
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
    <div className="space-y-8 p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full">
      {/* ── Navegación y Encabezado ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#1F293D]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link to="/buyer/orders">
              <Button variant="outline" size="sm" className="border-[#1F293D] text-[#94A3B8] hover:text-white mr-2">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
              Pedido #{order.id.slice(0, 8)}
            </h1>
            <StatusBadge tone={TONOS_DE_ESTADO_DE_PEDIDO[order.status]}>
              {NOMBRES_DE_ESTADO_DE_PEDIDO[order.status]}
            </StatusBadge>
          </div>
          <p className="text-sm font-mono text-[#94A3B8]">
            Creado el {new Date(order.createdAt).toLocaleString('es-CO')} • ID Completo: {order.id}
          </p>
        </div>

        {isPendingPayment && (
          <Link to="/buyer/orders/$orderId/pay" params={{ orderId: order.id }}>
            <Button className="bg-[#FFB800] hover:bg-[#FFB800]/90 text-[#0B0F19] font-bold text-sm shadow-md shadow-[#FFB800]/20">
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
          <div className="rounded-2xl border border-[#1F293D] bg-[#111827] overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[#1F293D] bg-[#161F30]/40 flex items-center justify-between">
              <span className="text-xs uppercase font-mono tracking-wider text-[#94A3B8]">
                Líneas Compradas ({order.items.length})
              </span>
              <span className="text-xs font-mono text-white font-bold">
                Total: <MoneyAmount amount={order.totalAmount} currency={order.currency} />
              </span>
            </div>

            <div className="divide-y divide-[#1F293D]">
              {order.items.map((item: OrderItem) => (
                <div key={item.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-[#00D4AA]" />
                      <span className="text-xs font-mono font-bold text-white">
                        SKU Variante: {item.variantId.slice(0, 8)}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-[#64748B]">
                      ID de Variante: {item.variantId}
                    </p>
                  </div>

                  <div className="flex items-center gap-6 text-right">
                    <div>
                      <span className="text-[10px] uppercase font-mono text-[#64748B] block">Cantidad</span>
                      <span className="text-xs font-mono font-bold text-white tabular-nums">
                        {item.quantity} ud(s)
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-mono text-[#64748B] block">Precio Unitario</span>
                      <div className="text-xs font-mono text-[#94A3B8] tabular-nums">
                        <MoneyAmount amount={item.unitPrice} currency={order.currency} />
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-mono text-[#64748B] block">Importe</span>
                      <div className="text-sm font-mono font-bold text-white tabular-nums">
                        <MoneyAmount amount={item.totalPrice} currency={order.currency} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Guías de Despacho Logístico (Fulfillments) */}
          <div className="rounded-2xl border border-[#1F293D] bg-[#111827] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1F293D] pb-3">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-[#00D4AA]" />
                <h2 className="text-sm uppercase font-mono tracking-wider text-white">
                  Despachos Logísticos
                </h2>
              </div>
              <Badge variant="outline" className="text-xs font-mono border-[#1F293D] text-[#94A3B8]">
                {orderFulfillments.length} paquetes
              </Badge>
            </div>

            {orderFulfillments.length === 0 ? (
              <p className="text-xs font-mono text-[#64748B] py-2">
                {isPendingPayment
                  ? 'Las guías y paquetes de despacho se generan automáticamente tras acreditar el pago.'
                  : 'Sin información de despacho disponible actualmente.'}
              </p>
            ) : (
              <div className="space-y-3">
                {orderFulfillments.map((ful: FulfillmentOrder) => (
                  <div key={ful.id} className="p-4 rounded-xl border border-[#1F293D] bg-[#161F30]/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-white">
                        Despacho #{ful.id.slice(0, 8)}
                      </span>
                      <StatusBadge tone={TONOS_DE_ESTADO_DE_DESPACHO[ful.status]}>
                        {NOMBRES_DE_ESTADO_DE_DESPACHO[ful.status]}
                      </StatusBadge>
                    </div>
                    {ful.shipments && ful.shipments.length > 0 && (
                      <div className="space-y-1 pt-1">
                        {ful.shipments.map((s) => (
                          <div key={s.id} className="text-xs font-mono text-[#94A3B8] flex items-center justify-between">
                            <span>Bodega Origen: {s.warehouseId.slice(0, 8)}</span>
                            <span className="text-[#00D4AA] font-bold">Guía: {s.trackingNumber}</span>
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
          <div className="rounded-2xl border border-[#1F293D] bg-[#111827] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1F293D] pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#00D4AA]" />
                <h2 className="text-sm uppercase font-mono tracking-wider text-white">
                  Facturación Tributaria
                </h2>
              </div>
              <Badge variant="outline" className="text-xs font-mono border-[#1F293D] text-[#00D4AA]">
                Factura Maestra
              </Badge>
            </div>

            {isLoadingInvoices ? (
              <Skeleton className="h-16 w-full bg-[#161F30]" />
            ) : masterInvoice ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-[#1F293D] bg-[#161F30]/40">
                <div className="space-y-1">
                  <span className="text-xs font-mono font-bold text-white">
                    Factura #{masterInvoice.id.slice(0, 8)}
                  </span>
                  <p className="text-xs font-mono text-[#64748B]">
                    Emitida el: {new Date(masterInvoice.issuedAt).toLocaleDateString('es-CO')}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-mono text-[#64748B] block">Importe Total</span>
                  <div className="text-base font-mono font-bold text-[#00D4AA] tabular-nums">
                    <MoneyAmount amount={masterInvoice.totalAmount} currency={masterInvoice.currency} />
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs font-mono text-[#64748B] py-2">
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
          <div className="rounded-2xl border border-[#1F293D] bg-[#111827] p-6 space-y-6 shadow-xl sticky top-6">
            <h2 className="text-sm uppercase font-mono tracking-wider text-[#94A3B8]">
              Ciclo de Vida del Pedido
            </h2>

            {/* Componente OrderTimeline */}
            <OrderTimeline currentStatus={order.status} orientation="vertical" />

            {/* Solicitud de Devolución (Solo si Delivered) */}
            {isDelivered && (
              <div className="border-t border-[#1F293D] pt-5 space-y-3">
                <div className="space-y-1">
                  <span className="text-xs font-mono font-semibold text-white flex items-center gap-1.5">
                    <RotateCcw className="h-3.5 w-3.5 text-[#00D4AA]" />
                    Devolución de Producto
                  </span>
                  <p className="text-xs text-[#94A3B8]">
                    ¿Hubo algún problema con su producto físico recibido? Puede iniciar una solicitud dentro de los 30 días de entrega.
                  </p>
                </div>

                <Link to="/buyer/returns/new" search={{ orderId: order.id }}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-[#1F293D] text-[#00D4AA] hover:bg-[#161F30]"
                  >
                    Solicitar Devolución
                  </Button>
                </Link>
              </div>
            )}

            {/* Garantía de Seguridad */}
            <div className="rounded-xl border border-[#1F293D] bg-[#161F30]/50 p-4 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-[#00D4AA] font-mono font-semibold">
                <ShieldCheck className="h-4 w-4" />
                Garantía Zentric
              </div>
              <p className="text-[#94A3B8] leading-relaxed">
                Toda compra realizada en la plataforma cuenta con trazabilidad logística de punta a punta e inspección física garantizada en devoluciones.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
