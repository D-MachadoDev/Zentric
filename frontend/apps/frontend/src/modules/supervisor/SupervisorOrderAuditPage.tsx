import { Link, useParams } from '@tanstack/react-router';
import {
  AlertCircle,
  ArrowLeft,
  FileText,
  Layers,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Skeleton,
} from '@zentric/ui';
import {
  useFulfillmentsQuery,
  useInvoicesByOrderQuery,
  useOrderQuery,
} from '../../application/services';
import type {
  FulfillmentOrder,
  Invoice,
  Order,
  OrderItem,
  SellerOrderView,
} from '../../domain';
import { InvoiceType } from '../../domain';

export interface SupervisorOrderAuditPageProps {
  orderId?: string;
}

/**
 * Expediente 360° de Auditoría de Pedido (/supervisor/orders/$orderId).
 *
 * Frontend-Role-Modules.md §2.6:
 * Cruza en Split-Frame (65% / 35%) las líneas del pedido (`GET /api/orders/{id}`),
 * los despachos por bodega (`GET /api/logistics/fulfillments`) y las tres facturas
 * del split tributario (`Master`, `ZentricDetail`, `VendorDetail` vía
 * `GET /api/billing/invoices/order/{orderId}`).
 */
export function SupervisorOrderAuditPage({ orderId: propOrderId }: SupervisorOrderAuditPageProps = {}) {
  const params = useParams({ strict: false }) as { orderId?: string; id?: string };
  const resolvedOrderId = propOrderId ?? params?.orderId ?? params?.id ?? '';

  const {
    data: orderDetail,
    isLoading: isLoadingOrder,
    isError: isErrorOrder,
    error: orderError,
    refetch: refetchOrder,
  } = useOrderQuery(resolvedOrderId);

  const {
    data: allFulfillments = [],
    isLoading: isLoadingFulfillments,
    isError: isErrorFulfillments,
    refetch: refetchFulfillments,
  } = useFulfillmentsQuery();

  const {
    data: orderInvoices = [],
    isLoading: isLoadingInvoices,
    isError: isErrorInvoices,
    refetch: refetchInvoices,
  } = useInvoicesByOrderQuery(resolvedOrderId);

  const isLoading = isLoadingOrder || isLoadingFulfillments || isLoadingInvoices;
  const isError = isErrorOrder || isErrorFulfillments || isErrorInvoices;

  const handleRetry = () => {
    void refetchOrder();
    void refetchFulfillments();
    void refetchInvoices();
  };

  if (isLoading) {
    return (
      <div className="space-y-8 w-full max-w-full">
        <Skeleton className="h-10 w-72 bg-surface" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <Skeleton className="lg:col-span-8 h-96 rounded-2xl bg-surface" />
          <Skeleton className="lg:col-span-4 h-96 rounded-2xl bg-surface" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6 p-6 sm:p-10 max-w-4xl mx-auto w-full">
        <Alert variant="destructive" className="border-red-900 bg-red-950/40 text-red-200">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <AlertTitle>Error al cargar el expediente 360° del pedido</AlertTitle>
          <AlertDescription>
            {orderError instanceof Error
              ? orderError.message
              : 'No fue posible recuperar la trazabilidad cruzada del pedido.'}
          </AlertDescription>
        </Alert>
        <Button
          onClick={handleRetry}
          variant="outline"
          className="border-border text-foreground hover:bg-border transition-all active:scale-[0.98]"
        >
          <RefreshCw className="h-4 w-4 mr-2" /> Reintentar
        </Button>
      </div>
    );
  }

  if (!orderDetail) {
    return (
      <div className="space-y-6 p-6 sm:p-10 max-w-4xl mx-auto w-full">
        <div className="rounded-2xl border border-border bg-surface p-12 text-center space-y-3">
          <ShoppingBag className="h-10 w-10 text-foreground-muted mx-auto" />
          <h2 className="text-base font-semibold text-foreground">Expediente de pedido no encontrado</h2>
          <p className="text-xs text-foreground-muted">
            No se encontró información para el identificador solicitado ({resolvedOrderId || 'Sin ID'}).
          </p>
          <Link
            to="/supervisor/orders"
            className="inline-flex items-center gap-2 text-xs font-mono text-brand hover:underline pt-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver al listado de pedidos
          </Link>
        </div>
      </div>
    );
  }

  const isFullOrder = (o: Order | SellerOrderView): o is Order => 'totalAmount' in o;
  const totalAmount = isFullOrder(orderDetail)
    ? orderDetail.totalAmount
    : orderDetail.vendorSubtotal;
  const buyerId = isFullOrder(orderDetail) ? orderDetail.buyerId : null;

  const orderFulfillments = allFulfillments.filter(
    (f: FulfillmentOrder) => f.customerOrderId === orderDetail.id
  );

  const masterInvoice = orderInvoices.find((inv: Invoice) => inv.type === InvoiceType.Master);
  const zentricInvoice = orderInvoices.find(
    (inv: Invoice) => inv.type === InvoiceType.ZentricDetail
  );
  const vendorInvoices = orderInvoices.filter(
    (inv: Invoice) => inv.type === InvoiceType.VendorDetail
  );

  const masterTotal = masterInvoice?.totalAmount ?? 0;
  const commissionTotal = zentricInvoice?.totalAmount ?? 0;
  const vendorNetTotal = vendorInvoices.reduce((acc, inv) => acc + inv.totalAmount, 0);
  const isSplitBalanced =
    orderInvoices.length > 0 && Math.abs(masterTotal - (commissionTotal + vendorNetTotal)) < 0.01;

  return (
    <div className="space-y-8 w-full max-w-full">
      {/* ── Encabezado ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to="/supervisor/orders"
              className="text-xs font-mono text-foreground-muted hover:text-foreground flex items-center gap-1 mr-2"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Pedidos
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
              Expediente 360° de Pedido
            </h1>
            <Badge variant="outline" className="border-border text-brand font-mono text-xs">
              #{orderDetail.id.substring(0, 8)}
            </Badge>
            <Badge variant="outline" className="border-border text-warning font-mono text-xs">
              {orderDetail.status}
            </Badge>
          </div>
          <p className="text-sm text-foreground-muted">
            Auditoría cruzada de líneas de compra, despachos particionados por bodega y facturación split.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRetry}
          className="border-border text-foreground-muted hover:text-foreground transition-all active:scale-[0.98]"
        >
          <RefreshCw className="h-4 w-4 mr-2" /> Sincronizar Expediente
        </Button>
      </div>

      {/* ── Split-Frame (65% / 35%) ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Lado Izquierdo (65%): Líneas del Pedido y Despachos Logísticos ─ */}
        <section className="lg:col-span-8 space-y-6">
          {/* Bloque 1: Líneas del Pedido */}
          <div className="rounded-2xl border border-border bg-surface p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground font-sans flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-brand" />
                Líneas de Variantes del Pedido
              </h2>
              <span className="text-xs font-mono text-foreground-muted">
                {orderDetail.items.length} ítems
              </span>
            </div>

            {orderDetail.items.length === 0 ? (
              <p className="text-xs text-foreground-muted py-4 text-center">
                El pedido no contiene líneas registradas.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-foreground-muted uppercase">
                      <th className="py-2.5 px-3">Línea ID</th>
                      <th className="py-2.5 px-3">Variante (SKU ID)</th>
                      <th className="py-2.5 px-3 text-right">Cantidad</th>
                      <th className="py-2.5 px-3 text-right">Precio Unit.</th>
                      <th className="py-2.5 px-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {orderDetail.items.map((item: OrderItem) => (
                      <tr key={item.id} className="hover:bg-surface-muted/40">
                        <td className="py-3 px-3 font-mono text-foreground-muted">
                          #{item.id.substring(0, 8)}
                        </td>
                        <td className="py-3 px-3 font-mono text-brand">
                          {item.variantId}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-foreground tabular-nums">
                          {item.quantity}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-foreground-muted tabular-nums">
                          ${item.unitPrice.toLocaleString('es-CO')}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-foreground tabular-nums">
                          ${item.totalPrice.toLocaleString('es-CO')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Bloque 2: Despachos Particionados por Bodega */}
          <div className="rounded-2xl border border-border bg-surface p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground font-sans flex items-center gap-2">
                <PackageCheck className="h-4 w-4 text-warning" />
                Órdenes de Empaque y Despacho Asociadas
              </h2>
              <span className="text-xs font-mono text-foreground-muted">
                {orderFulfillments.length} despachos
              </span>
            </div>

            {orderFulfillments.length === 0 ? (
              <p className="text-xs text-foreground-muted py-4 text-center">
                No se han emitido órdenes de despacho para este pedido.
              </p>
            ) : (
              <div className="space-y-3">
                {orderFulfillments.map((ful: FulfillmentOrder) => (
                  <div
                    key={ful.id}
                    className="p-4 rounded-xl bg-surface-muted/60 border border-border space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-foreground">
                        Despacho #{ful.id.substring(0, 8)}
                      </span>
                      <Badge
                        variant="outline"
                        className="border-border text-brand font-mono text-[11px]"
                      >
                        {ful.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between font-mono text-[11px] text-foreground-muted">
                      <span>Vendedor: #{ful.vendorId.substring(0, 8)}</span>
                      <span>Paquetes: {ful.shipments.length}</span>
                    </div>
                    {ful.cancellationReason && (
                      <div className="text-[11px] font-mono text-red-400">
                        Motivo Cancelación: {ful.cancellationReason}
                      </div>
                    )}
                    {ful.shipments.length > 0 && (
                      <div className="pt-2 border-t border-border/60 space-y-1">
                        {ful.shipments.map((ship) => (
                          <div
                            key={ship.id}
                            className="flex justify-between font-mono text-[11px] text-foreground-muted"
                          >
                            <span>Bodega: #{ship.warehouseId.substring(0, 8)}</span>
                            <span className="text-brand">Guía: {ship.trackingNumber}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Lado Derecho (35%): Auditoría del Split Tributario ───────────── */}
        <section className="lg:col-span-4 space-y-6">
          <div className="rounded-2xl border border-border bg-surface p-6 space-y-5">
            <div className="border-b border-border pb-4">
              <span className="text-[11px] font-mono text-foreground-muted block uppercase">
                Conciliación Financiera
              </span>
              <h3 className="text-base font-bold text-foreground mt-1 flex items-center gap-2">
                <FileText className="h-4 w-4 text-brand" />
                Split Tributario (3 Comprobantes)
              </h3>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-foreground-muted font-sans">Ref. Comprador:</span>
                <span className="text-foreground">{buyerId ?? 'Protegido'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground-muted font-sans">Total Pedido:</span>
                <span className="text-foreground font-bold tabular-nums">
                  ${totalAmount.toLocaleString('es-CO')} {orderDetail.currency}
                </span>
              </div>
            </div>

            {orderInvoices.length === 0 ? (
              <div className="p-4 rounded-xl bg-surface-muted border border-border text-xs text-foreground-muted text-center">
                Aún no se han emitido comprobantes tributarios para este pedido.
              </div>
            ) : (
              <div className="space-y-3">
                {orderInvoices.map((inv: Invoice) => (
                  <div
                    key={inv.id}
                    className="p-3.5 rounded-xl bg-surface-muted border border-border space-y-1.5 text-xs font-mono"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-foreground font-semibold">
                        #{inv.id.substring(0, 8)}
                      </span>
                      <Badge
                        variant="outline"
                        className="border-border text-brand text-[10px]"
                      >
                        {inv.type === InvoiceType.Master
                          ? 'Factura Maestra'
                          : inv.type === InvoiceType.ZentricDetail
                            ? 'Comisión Zentric (5%)'
                            : 'Liquidación Vendedor (95%)'}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-[11px] text-foreground-muted">
                      <span>{inv.vendorId ? `Vend: #${inv.vendorId.substring(0, 8)}` : 'Plataforma'}</span>
                      <span className="text-foreground font-bold tabular-nums">
                        ${inv.totalAmount.toLocaleString('es-CO')} {inv.currency}
                      </span>
                    </div>
                  </div>
                ))}

                <div className="p-3 rounded-xl bg-brand/10 border border-brand/30 text-[11px] font-mono space-y-1">
                  <div className="flex items-center justify-between text-brand font-bold">
                    <span className="flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5" />
                      Invariante Contable:
                    </span>
                    <span>{isSplitBalanced ? 'Verificada (100%)' : 'En Revisión'}</span>
                  </div>
                  <div className="text-foreground-muted tabular-nums">
                    Maestra (${masterTotal.toLocaleString('es-CO')}) = Comisión ($
                    {commissionTotal.toLocaleString('es-CO')}) + Vendedores ($
                    {vendorNetTotal.toLocaleString('es-CO')})
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-brand">
              <ShieldCheck className="h-4 w-4" />
              <span>Expediente 360° en Modo Sólo Lectura</span>
            </div>
            <p className="text-[11px] text-foreground-muted leading-relaxed">
              Esta vista consolida la trazabilidad de extremo a extremo del pedido sin habilitar botones de facturación, anulación ni alteración logística.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
