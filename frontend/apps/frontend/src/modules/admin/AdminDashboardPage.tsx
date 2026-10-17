import { Link } from '@tanstack/react-router';
import {
  Users,
  Warehouse as WarehouseIcon,
  ShoppingBag,
  FileText,
  Activity,
  AlertCircle,
  RefreshCw,
  ArrowUpRight,
  ShieldCheck,
  RotateCcw,
  Sliders,
} from 'lucide-react';
import {
  Button,
  Badge,
  Skeleton,
  Alert,
  AlertTitle,
  AlertDescription,
} from '@zentric/ui';
import {
  useUsersQuery,
  useWarehousesQuery,
  useOrdersQuery,
  useInvoicesQuery,
  useHealthQuery,
} from '../../application/services';
import type { Invoice, OrderListItem, User } from '../../domain';
import { InvoiceType, OrderStatus } from '../../domain';

export function AdminDashboardPage() {
  const {
    data: users = [],
    isLoading: isLoadingUsers,
    isError: isErrorUsers,
    refetch: refetchUsers,
  } = useUsersQuery();

  const {
    data: warehouses = [],
    isLoading: isLoadingWarehouses,
    isError: isErrorWarehouses,
  } = useWarehousesQuery();

  const {
    data: orders = [],
    isLoading: isLoadingOrders,
    isError: isErrorOrders,
  } = useOrdersQuery();

  const {
    data: invoices = [],
    isLoading: isLoadingInvoices,
    isError: isErrorInvoices,
  } = useInvoicesQuery();

  const {
    data: health,
    isLoading: isLoadingHealth,
    isError: isErrorHealth,
  } = useHealthQuery();

  const isLoading =
    isLoadingUsers ||
    isLoadingWarehouses ||
    isLoadingOrders ||
    isLoadingInvoices ||
    isLoadingHealth;

  if (isLoading) {
    return (
      <div className="space-y-8 p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full">
        <Skeleton className="h-10 w-64 bg-surface" />
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

  // Cálculos de métricas
  const masterInvoices = invoices.filter((inv: Invoice) => inv.type === InvoiceType.Master);
  const totalFacturado = masterInvoices.reduce((acc, inv) => acc + inv.totalAmount, 0);

  const activeUsersCount = users.filter((u: User) => u.isActive).length;
  const activeWarehousesCount = warehouses.filter((w) => w.isActive).length;
  const pendingOrdersCount = orders.filter(
    (o: OrderListItem) => o.status === OrderStatus.PendingPayment || o.status === OrderStatus.Paid
  ).length;

  const isHealthy = health?.status === 'healthy';

  return (
    <div className="space-y-8 p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full">
      {/* ── Encabezado Principal ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-1.5">
          <span className="kicker-spike">GOBERNANZA CENTRAL · MATRIZ 21 POLÍTICAS</span>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
              Consola de Administración Central
            </h1>
            <Badge variant="outline" className="border-border text-brand font-mono text-xs">
              Root RBAC
            </Badge>
          </div>
          <p className="text-sm text-foreground-muted">
            Supervisión integral de usuarios, infraestructura de bodegas, facturación split y reconciliación operativa.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetchUsers()}
          className="border-border text-foreground-muted hover:text-foreground"
        >
          <RefreshCw className="h-4 w-4 mr-2" /> Actualizar Datos
        </Button>
      </div>

      {/* ── Alertas si algún servicio falla ─────────────────────────────── */}
      {(isErrorUsers || isErrorWarehouses || isErrorOrders || isErrorInvoices) && (
        <Alert variant="destructive" className="border-red-900 bg-red-950/40 text-red-200">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertTitle>Fallo parcial en telemetría administrativa</AlertTitle>
          <AlertDescription>
            Uno o más servicios reportaron latencia o fallos de red. Las métricas pueden mostrar datos en caché.
          </AlertDescription>
        </Alert>
      )}

      {/* ── Hero KPI Strip ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Volumen Facturado Dominante */}
        <div className="rounded-2xl border border-border bg-surface p-5 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between text-foreground-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider font-sans">
              Volumen Facturado
            </span>
            <FileText className="h-4 w-4 text-brand" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-foreground font-mono tabular-nums tracking-tight">
              ${totalFacturado.toLocaleString('es-CO')}
            </div>
            <div className="text-xs text-brand mt-1 font-mono">
              {masterInvoices.length} facturas maestras emitidas
            </div>
          </div>
        </div>

        {/* KPI 2: Usuarios Activos */}
        <div className="rounded-2xl border border-border bg-surface p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-foreground-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider font-sans">
              Usuarios Activos
            </span>
            <Users className="h-4 w-4 text-foreground-muted" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-foreground font-mono tabular-nums">
              {activeUsersCount}
            </div>
            <div className="text-xs text-foreground-muted mt-1">
              De {users.length} usuarios registrados en la red
            </div>
          </div>
        </div>

        {/* KPI 3: Red de Bodegas */}
        <div className="rounded-2xl border border-border bg-surface p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-foreground-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider font-sans">
              Bodegas Físicas
            </span>
            <WarehouseIcon className="h-4 w-4 text-foreground-muted" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-foreground font-mono tabular-nums">
              {activeWarehousesCount}
            </div>
            <div className="text-xs text-foreground-muted mt-1">
              Capacidad total activa en la red
            </div>
          </div>
        </div>

        {/* KPI 4: Pedidos en Trámite */}
        <div className="rounded-2xl border border-border bg-surface p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-foreground-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider font-sans">
              Pedidos Pendientes
            </span>
            <ShoppingBag className="h-4 w-4 text-warning" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-warning font-mono tabular-nums">
              {pendingOrdersCount}
            </div>
            <div className="text-xs text-foreground-muted mt-1">
              Requieren pago o procesamiento
            </div>
          </div>
        </div>
      </div>

      {/* ── Composición Asimétrica Split-Frame (65% / 35%) ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Lado Izquierdo (65%): Actividad Reciente de Pedidos y Facturas */}
        <section className="lg:col-span-8 space-y-6">
          <div className="rounded-2xl border border-border bg-surface p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="text-base font-semibold text-foreground font-sans flex items-center gap-2">
                <Activity className="h-4 w-4 text-brand" />
                Pedidos Recientes de la Plataforma
              </h2>
              <span className="text-xs font-mono text-foreground-muted">
                {orders.length} pedidos totales
              </span>
            </div>

            {orders.length === 0 ? (
              <p className="text-xs text-foreground-muted py-8 text-center">
                Sin pedidos registrados en la plataforma.
              </p>
            ) : (
              <div className="divide-y divide-border/60 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-foreground-muted uppercase tracking-wider border-b border-border">
                      <th className="py-2.5 px-3">ID Pedido</th>
                      <th className="py-2.5 px-3">Estado</th>
                      <th className="py-2.5 px-3 text-right">Líneas</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
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
                            className="text-[11px] border-border text-foreground-muted"
                          >
                            {ord.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-foreground-muted">
                          {ord.itemCount}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-semibold text-brand">
                          ${ord.totalAmount.toLocaleString('es-CO')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Lado Derecho (35%): Panel de Salud y Accesos de Gestión ───────── */}
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
                <span>Motor:</span>
                <span className="text-foreground">ASP.NET Core (.NET 10)</span>
              </div>
              <div className="flex justify-between">
                <span>Base de Datos:</span>
                <span className="text-foreground">PostgreSQL 16 Alpine</span>
              </div>
              <div className="flex justify-between">
                <span>Persistencia:</span>
                <span className="text-foreground">14 DbSets Auditados</span>
              </div>
            </div>
          </div>

          {/* Accesos Rápidos de Administración */}
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-3">
            <h3 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
              Acciones Administrativas
            </h3>

            <div className="space-y-2">
              <Link
                to="/admin/users"
                className="flex items-center justify-between p-3 rounded-xl bg-surface-muted/60 hover:bg-surface-muted border border-border transition-colors group"
              >
                <div className="flex items-center gap-2.5 text-xs text-foreground">
                  <ShieldCheck className="h-4 w-4 text-brand" />
                  <span>Directorio de Usuarios</span>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-foreground-muted group-hover:text-foreground transition-colors" />
              </Link>

              <Link
                to="/admin/warehouses"
                className="flex items-center justify-between p-3 rounded-xl bg-surface-muted/60 hover:bg-surface-muted border border-border transition-colors group"
              >
                <div className="flex items-center gap-2.5 text-xs text-foreground">
                  <WarehouseIcon className="h-4 w-4 text-brand" />
                  <span>Gestión de Bodegas</span>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-foreground-muted group-hover:text-foreground transition-colors" />
              </Link>

              <Link
                to="/admin/inventory-adjustments"
                className="flex items-center justify-between p-3 rounded-xl bg-surface-muted/60 hover:bg-surface-muted border border-border transition-colors group"
              >
                <div className="flex items-center gap-2.5 text-xs text-foreground">
                  <Sliders className="h-4 w-4 text-warning" />
                  <span>Ajustes por Conteo Físico</span>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-foreground-muted group-hover:text-foreground transition-colors" />
              </Link>

              <Link
                to="/admin/returns"
                className="flex items-center justify-between p-3 rounded-xl bg-surface-muted/60 hover:bg-surface-muted border border-border transition-colors group"
              >
                <div className="flex items-center gap-2.5 text-xs text-foreground">
                  <RotateCcw className="h-4 w-4 text-red-400" />
                  <span>Reembolsos de Devoluciones</span>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-foreground-muted group-hover:text-foreground transition-colors" />
              </Link>

              <Link
                to="/admin/invoices"
                className="flex items-center justify-between p-3 rounded-xl bg-surface-muted/60 hover:bg-surface-muted border border-border transition-colors group"
              >
                <div className="flex items-center gap-2.5 text-xs text-foreground">
                  <FileText className="h-4 w-4 text-brand" />
                  <span>Facturación Split y Comisiones</span>
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
