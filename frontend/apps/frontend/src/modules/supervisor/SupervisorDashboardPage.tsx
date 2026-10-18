import { Link } from '@tanstack/react-router';
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  Eye,
  FileText,
  PackageCheck,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShoppingBag,
  Sliders,
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
  useHealthQuery,
  useInvoicesQuery,
  useOrdersQuery,
  useReturnsQuery,
} from '../../application/services';
import type {
  FulfillmentOrder,
  Invoice,
  OrderListItem,
  ReturnRequest,
} from '../../domain';
import {
  FulfillmentStatus,
  InvoiceType,
  OrderStatus,
  ReturnStatus,
} from '../../domain';

/**
 * Consola de Fiscalización Transversal del Supervisor (/supervisor).
 *
 * ZENTRIC.md Dominio 1 y Frontend-Role-Modules.md §2.6:
 * Opera en modo de sólo lectura sobre pedidos, despachos, devoluciones y facturas.
 * Regla estricta de privacidad: NUNCA invoca `/api/users` dado que la política
 * `UserAdministration` reserva los datos personales (PII) al Administrador.
 */
export function SupervisorDashboardPage() {
  const {
    data: health,
    isLoading: isLoadingHealth,
    isError: isErrorHealth,
    refetch: refetchHealth,
  } = useHealthQuery();

  const {
    data: orders = [],
    isLoading: isLoadingOrders,
    isError: isErrorOrders,
    refetch: refetchOrders,
  } = useOrdersQuery();

  const {
    data: fulfillments = [],
    isLoading: isLoadingFulfillments,
    isError: isErrorFulfillments,
    refetch: refetchFulfillments,
  } = useFulfillmentsQuery();

  const {
    data: returns = [],
    isLoading: isLoadingReturns,
    isError: isErrorReturns,
    refetch: refetchReturns,
  } = useReturnsQuery();

  const {
    data: invoices = [],
    isLoading: isLoadingInvoices,
    isError: isErrorInvoices,
    refetch: refetchInvoices,
  } = useInvoicesQuery();

  const isLoading =
    isLoadingHealth ||
    isLoadingOrders ||
    isLoadingFulfillments ||
    isLoadingReturns ||
    isLoadingInvoices;

  const hasAnyError =
    isErrorHealth ||
    isErrorOrders ||
    isErrorFulfillments ||
    isErrorReturns ||
    isErrorInvoices;

  const handleRefreshAll = () => {
    void refetchHealth();
    void refetchOrders();
    void refetchFulfillments();
    void refetchReturns();
    void refetchInvoices();
  };

  if (isLoading) {
    return (
      <div className="space-y-8 w-full max-w-full">
        <Skeleton className="h-10 w-72 bg-surface" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl bg-surface" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <Skeleton className="lg:col-span-8 h-80 rounded-2xl bg-surface" />
          <Skeleton className="lg:col-span-4 h-80 rounded-2xl bg-surface" />
        </div>
      </div>
    );
  }

  // Cálculos de auditoría transversal
  const masterInvoices = invoices.filter((inv: Invoice) => inv.type === InvoiceType.Master);
  const zentricInvoices = invoices.filter((inv: Invoice) => inv.type === InvoiceType.ZentricDetail);
  const totalFacturado = masterInvoices.reduce((acc, inv) => acc + inv.totalAmount, 0);
  const totalComisiones = zentricInvoices.reduce((acc, inv) => acc + inv.totalAmount, 0);

  const paidOrDeliveredOrders = orders.filter(
    (o: OrderListItem) =>
      o.status === OrderStatus.Paid ||
      o.status === OrderStatus.Dispatched ||
      o.status === OrderStatus.Delivered
  ).length;

  const cancelledFulfillmentsCount = fulfillments.filter(
    (f: FulfillmentOrder) => f.status === FulfillmentStatus.Cancelled
  ).length;

  const activeReturnsCount = returns.filter(
    (r: ReturnRequest) =>
      r.status === ReturnStatus.Requested || r.status === ReturnStatus.Approved
  ).length;

  const isHealthy = health?.status === 'healthy';

  return (
    <div className="space-y-8 w-full max-w-full">
      {/* ── Encabezado Principal ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
              Consola de Fiscalización y Auditoría
            </h1>
            <Badge variant="outline" className="border-border text-brand font-mono text-xs">
              Supervisor 360°
            </Badge>
            <Badge variant="outline" className="border-border text-warning font-mono text-xs">
              Sólo Lectura
            </Badge>
          </div>
          <p className="text-sm text-foreground-muted">
            Monitoreo transversal de pedidos, logística particionada, devoluciones y libro mayor tributario sin acceso a PII.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefreshAll}
          className="border-border text-foreground-muted hover:text-foreground transition-all active:scale-[0.98]"
        >
          <RefreshCw className="h-4 w-4 mr-2" /> Actualizar Telemetría
        </Button>
      </div>

      {/* ── Alerta de Fallo Parcial en Telemetría ───────────────────────── */}
      {hasAnyError && (
        <Alert variant="destructive" className="border-red-900 bg-red-950/40 text-red-200">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertTitle>Fallo parcial en telemetría de fiscalización</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>
              Uno o más flujos auditados reportaron error de comunicación. Puede reintentar la sincronización.
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshAll}
              className="border-red-800 text-red-200 hover:bg-red-900/40 shrink-0"
            >
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* ── Hero KPI Strip ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Volumen Bruto Auditado */}
        <div className="rounded-2xl border border-border bg-surface p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-foreground-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider font-sans">
              Volumen Bruto Auditado
            </span>
            <FileText className="h-4 w-4 text-brand" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-foreground font-mono tabular-nums tracking-tight">
              ${totalFacturado.toLocaleString('es-CO')}
            </div>
            <div className="text-xs text-brand mt-1 font-mono tabular-nums">
              Comisión 5%: ${totalComisiones.toLocaleString('es-CO')}
            </div>
          </div>
        </div>

        {/* KPI 2: Trazabilidad de Pedidos */}
        <div className="rounded-2xl border border-border bg-surface p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-foreground-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider font-sans">
              Pedidos Globales
            </span>
            <ShoppingBag className="h-4 w-4 text-foreground-muted" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-foreground font-mono tabular-nums">
              {orders.length}
            </div>
            <div className="text-xs text-foreground-muted mt-1 font-mono tabular-nums">
              {paidOrDeliveredOrders} confirmados en flujo
            </div>
          </div>
        </div>

        {/* KPI 3: Red de Despachos y Quiebres */}
        <div className="rounded-2xl border border-border bg-surface p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-foreground-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider font-sans">
              Órdenes de Despacho
            </span>
            <PackageCheck className="h-4 w-4 text-warning" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-foreground font-mono tabular-nums">
              {fulfillments.length}
            </div>
            <div className="text-xs text-warning mt-1 font-mono tabular-nums">
              {cancelledFulfillmentsCount} cancelados por quiebre
            </div>
          </div>
        </div>

        {/* KPI 4: Expedientes de Devolución */}
        <div className="rounded-2xl border border-border bg-surface p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-foreground-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider font-sans">
              Devoluciones en Red
            </span>
            <RotateCcw className="h-4 w-4 text-foreground-muted" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-foreground font-mono tabular-nums">
              {returns.length}
            </div>
            <div className="text-xs text-foreground-muted mt-1 font-mono tabular-nums">
              {activeReturnsCount} pendientes de cierre
            </div>
          </div>
        </div>
      </div>

      {/* ── Composición Asimétrica Split-Frame (65% / 35%) ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Lado Izquierdo (65%): Actividad Reciente de Pedidos Auditados */}
        <section className="lg:col-span-8 space-y-6">
          <div className="rounded-2xl border border-border bg-surface p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="text-base font-semibold text-foreground font-sans flex items-center gap-2">
                <Activity className="h-4 w-4 text-brand" />
                Matriz de Pedidos Auditados en Tiempo Real
              </h2>
              <Link
                to="/supervisor/orders"
                className="text-xs font-mono text-brand hover:underline flex items-center gap-1"
              >
                Ver todos ({orders.length})
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {orders.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <ShoppingBag className="h-8 w-8 text-foreground-muted mx-auto" />
                <p className="text-xs text-foreground-muted">
                  Sin pedidos registrados para fiscalización.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/60 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-foreground-muted uppercase tracking-wider border-b border-border">
                      <th className="py-2.5 px-3">ID Pedido</th>
                      <th className="py-2.5 px-3">Estado</th>
                      <th className="py-2.5 px-3 text-right">Líneas</th>
                      <th className="py-2.5 px-3 text-right">Importe</th>
                      <th className="py-2.5 px-3 text-right">Expediente</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {orders.slice(0, 6).map((ord: OrderListItem) => (
                      <tr key={ord.id} className="hover:bg-surface-muted/40 transition-colors">
                        <td className="py-3 px-3 font-mono text-foreground">
                          #{ord.id.substring(0, 8)}
                        </td>
                        <td className="py-3 px-3">
                          <Badge
                            variant="outline"
                            className="text-[11px] border-border text-foreground-muted font-mono"
                          >
                            {ord.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-foreground-muted tabular-nums">
                          {ord.itemCount}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-semibold text-brand tabular-nums">
                          ${ord.totalAmount.toLocaleString('es-CO')}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Link
                            to="/supervisor/orders/$orderId"
                            params={{ orderId: ord.id }}
                            className="inline-flex items-center gap-1 text-xs font-mono text-foreground-muted hover:text-brand"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Auditar 360°
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Lado Derecho (35%): Salud Operativa, Privacidad y Estaciones ─── */}
        <section className="lg:col-span-4 space-y-6">
          {/* Telemetría de Salud */}
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                Estado del Servidor
              </span>
              <div className="flex items-center gap-1.5">
                <span
                  className={`h-2 w-2 rounded-full ${
                    isHealthy && !isErrorHealth ? 'bg-brand' : 'bg-red-400 animate-pulse'
                  }`}
                />
                <span className="text-xs font-mono text-foreground">
                  {isHealthy && !isErrorHealth ? 'Operativo' : 'Degradado'}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-foreground-muted space-y-1 font-mono">
              <div className="flex justify-between">
                <span>Base de Datos:</span>
                <span className="text-foreground">{health?.database ?? 'up'}</span>
              </div>
              <div className="flex justify-between">
                <span>Modo de Acceso:</span>
                <span className="text-brand">Auditoría Sin Mutación Comercial</span>
              </div>
              <div className="flex justify-between">
                <span>Excepción Autorizada:</span>
                <span className="text-warning">InventoryAdjust (ADR-0021)</span>
              </div>
            </div>
          </div>

          {/* Garantía de Privacidad PII */}
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-brand">
              <ShieldAlert className="h-4 w-4" />
              <span>Aislamiento de Privacidad (Sin PII)</span>
            </div>
            <p className="text-[11px] text-foreground-muted leading-relaxed">
              Por cumplimiento de la política <code className="font-mono text-foreground">UserAdministration</code>, el Supervisor audita identificadores transaccionales sin consultar el directorio de datos personales (<code className="font-mono text-foreground">/api/users</code>).
            </p>
          </div>

          {/* Accesos Rápidos de Fiscalización */}
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-3">
            <h3 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
              Módulos de Fiscalización
            </h3>

            <div className="space-y-2">
              <Link
                to="/supervisor/orders"
                className="flex items-center justify-between p-3 rounded-xl bg-surface-muted/60 hover:bg-surface-muted border border-border transition-colors group"
              >
                <div className="flex items-center gap-2.5 text-xs text-foreground">
                  <ShoppingBag className="h-4 w-4 text-brand" />
                  <span>Pedidos Globales (Sólo Lectura)</span>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-foreground-muted group-hover:text-foreground transition-colors" />
              </Link>

              <Link
                to="/supervisor/fulfillments"
                className="flex items-center justify-between p-3 rounded-xl bg-surface-muted/60 hover:bg-surface-muted border border-border transition-colors group"
              >
                <div className="flex items-center gap-2.5 text-xs text-foreground">
                  <PackageCheck className="h-4 w-4 text-brand" />
                  <span>Monitoreo de Despachos y Quiebres</span>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-foreground-muted group-hover:text-foreground transition-colors" />
              </Link>

              <Link
                to="/supervisor/returns"
                className="flex items-center justify-between p-3 rounded-xl bg-surface-muted/60 hover:bg-surface-muted border border-border transition-colors group"
              >
                <div className="flex items-center gap-2.5 text-xs text-foreground">
                  <RotateCcw className="h-4 w-4 text-brand" />
                  <span>Fiscalización de Devoluciones</span>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-foreground-muted group-hover:text-foreground transition-colors" />
              </Link>

              <Link
                to="/supervisor/invoices"
                className="flex items-center justify-between p-3 rounded-xl bg-surface-muted/60 hover:bg-surface-muted border border-border transition-colors group"
              >
                <div className="flex items-center gap-2.5 text-xs text-foreground">
                  <FileText className="h-4 w-4 text-brand" />
                  <span>Libro Mayor Tributario Split</span>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-foreground-muted group-hover:text-foreground transition-colors" />
              </Link>

              <Link
                to="/supervisor/inventory-audit"
                className="flex items-center justify-between p-3 rounded-xl bg-surface-muted/60 hover:bg-surface-muted border border-border transition-colors group"
              >
                <div className="flex items-center gap-2.5 text-xs text-foreground">
                  <Sliders className="h-4 w-4 text-warning" />
                  <span>Auditoría de Stock por Conteo Físico</span>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-foreground-muted group-hover:text-foreground transition-colors" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
