import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  RefreshCw,
  ReceiptText as ReceiptIcon,
  RotateCcw,
  ShoppingBag,
  Sliders,
  Store,
  Users,
  Warehouse as WarehouseIcon,
  type LucideIcon,
} from 'lucide-react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  MoneyAmount,
  Skeleton,
  StatCard,
  StatusBadge,
} from '@zentric/ui';
import {
  useHealthQuery,
  useInvoicesQuery,
  useOrdersQuery,
  useUsersQuery,
  useWarehousesQuery,
} from '../../application/services';
import type { Invoice, OrderListItem, User, Warehouse } from '../../domain';
import { InvoiceType, OrderStatus, UserRole } from '../../domain';
import {
  NOMBRES_DE_ESTADO_DE_PEDIDO,
  TONOS_DE_ESTADO_DE_PEDIDO,
} from '../../components/domainLabels';

/**
 * Centro de Mando del Administrador (Frontend-Role-Modules §2.2).
 *
 * Composición: Hero KPI Strip —el GMV facturado domina la banda y tres
 * contadores compactos lo acompañan en línea (Frontend-Design-System §2.1:
 * prohibida la cuadrícula de tarjetas clonadas)— y debajo Split-Frame 65/35:
 * actividad reciente de pedidos a la izquierda; salud operativa y accesos de
 * gestión a la derecha.
 *
 * [ADDENDUM - DICTADO POR OWNER, 2026-10-18]: cero telemetría técnica de
 * servidor (motor, versiones, DbSets, matriz de políticas); ese detalle vive
 * en la página pública `/health`. Aquí sólo se habla el negocio del
 * marketplace.
 */

/** Accesos de gestión: a dónde va el Administrador a operar el negocio. */
const ACCESOS_DE_GESTION: ReadonlyArray<{
  to: '/admin/users' | '/admin/warehouses' | '/admin/inventory-adjustments' | '/admin/returns' | '/admin/invoices';
  label: string;
  icon: LucideIcon;
}> = [
  { to: '/admin/users', label: 'Usuarios', icon: Users },
  { to: '/admin/warehouses', label: 'Bodegas', icon: WarehouseIcon },
  { to: '/admin/inventory-adjustments', label: 'Ajustes de Inventario', icon: Sliders },
  { to: '/admin/returns', label: 'Devoluciones', icon: RotateCcw },
  { to: '/admin/invoices', label: 'Facturación', icon: ReceiptIcon },
];

/** Fecha corta legible (Voz 3: telemetría). El dato crudo lo dicta el servidor. */
function fechaCorta(iso: string): string {
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime())
    ? '—'
    : fecha.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Hora de la última verificación de salud (Voz 3). */
function horaCorta(iso: string): string {
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime()) ? '—' : fecha.toLocaleTimeString('es-CO');
}

/**
 * Vendedor visible del pedido en lenguaje de negocio: el nombre del vendedor
 * cuando todas las líneas son del mismo, o "Multi-vendedor" cuando el pedido
 * particiona entre varios (ZENTRIC.md Dominio 6: despacho multi-vendedor).
 */
function vendedorDelPedido(order: OrderListItem): string {
  const nombres = Array.from(
    new Set(order.items.map((item) => item.vendorName).filter((name): name is string => Boolean(name)))
  );
  if (nombres.length === 0) return '—';
  if (nombres.length === 1) return nombres[0] ?? '—';
  return 'Multi-vendedor';
}

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
    refetch: refetchWarehouses,
  } = useWarehousesQuery();

  const {
    data: orders = [],
    isLoading: isLoadingOrders,
    isError: isErrorOrders,
    refetch: refetchOrders,
  } = useOrdersQuery();

  const {
    data: invoices = [],
    isLoading: isLoadingInvoices,
    isError: isErrorInvoices,
    refetch: refetchInvoices,
  } = useInvoicesQuery();

  const {
    data: health,
    isLoading: isLoadingHealth,
    isError: isErrorHealth,
    isFetching: isFetchingHealth,
    refetch: refetchHealth,
  } = useHealthQuery();

  const isLoading =
    isLoadingUsers ||
    isLoadingWarehouses ||
    isLoadingOrders ||
    isLoadingInvoices ||
    isLoadingHealth;

  // Latencia de la sonda /health medida en el cliente: ida y vuelta de cada
  // sondeo (inicial, botón Actualizar y la automática cada 30 s). El contrato
  // del backend no la expone; es telemetría de presentación, no un dato de
  // negocio (Frontend-Design-System §2.1, capa 3).
  const [apiLatencyMs, setApiLatencyMs] = useState<number | null>(null);
  const sondeoIniciadoEn = useRef<number | null>(null);

  useEffect(() => {
    if (isFetchingHealth) {
      sondeoIniciadoEn.current = performance.now();
    } else if (sondeoIniciadoEn.current !== null) {
      setApiLatencyMs(Math.max(1, Math.round(performance.now() - sondeoIniciadoEn.current)));
      sondeoIniciadoEn.current = null;
    }
  }, [isFetchingHealth]);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchUsers(),
        refetchWarehouses(),
        refetchOrders(),
        refetchInvoices(),
        refetchHealth(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  // ── Métricas de negocio ────────────────────────────────────────────────
  // GMV Facturado: monto total de las facturas del comprador (ZENTRIC.md
  // Dominio 9: la Factura Maestra consolida el 100% del pedido).
  const facturasComprador = invoices.filter((inv: Invoice) => inv.type === InvoiceType.Master);
  const gmvFacturado = facturasComprador.reduce((acc, inv) => acc + inv.totalAmount, 0);
  const gmvCurrency = facturasComprador[0]?.currency ?? 'COP';

  const vendedoresRegistrados = users.filter((u: User) => u.role === UserRole.Seller);
  const vendedoresActivos = vendedoresRegistrados.filter((u: User) => u.isActive).length;

  const bodegasOperativas = warehouses.filter((w: Warehouse) => w.isActive).length;

  // Pedido "en proceso": vive en la operación (pago, empaque o despacho).
  // Carrito no es pedido; Entregado/Cancelado ya salió del circuito.
  const pedidosEnProceso = orders.filter(
    (o: OrderListItem) =>
      o.status === OrderStatus.PendingPayment ||
      o.status === OrderStatus.Paid ||
      o.status === OrderStatus.Dispatched
  ).length;

  const actividadReciente = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  const plataformaOperativa = !isErrorHealth && health?.status === 'healthy';
  const baseDeDatosEnLinea = health?.database === 'up';

  if (isLoading) {
    return (
      <div className="space-y-8 w-full max-w-full">
        <div className="space-y-2.5 pb-6 border-b border-border">
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-8 w-72" />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Skeleton className="lg:col-span-6 h-44 rounded-2xl" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:col-span-6">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <Skeleton className="lg:col-span-8 h-80 rounded-2xl" />
          <div className="lg:col-span-4 space-y-6">
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-72 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full max-w-full">
      {/* ── Encabezado del Centro de Mando ─────────────────────────────────── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-2">
          <span className="kicker-spike">Gobernanza del marketplace</span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
            Centro de Mando
          </h1>
          <p className="text-sm text-foreground-muted">
            Panorama del marketplace en vivo: ventas facturadas, vendedores, bodegas y pedidos en curso.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          aria-busy={isRefreshing}
          className="border-border text-foreground-muted hover:text-foreground"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
          Actualizar
        </Button>
      </header>

      {/* ── Aviso cuando alguna fuente no responde ─────────────────────────── */}
      {(isErrorUsers || isErrorWarehouses || isErrorOrders || isErrorInvoices) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>Datos parcialmente no disponibles</AlertTitle>
          <AlertDescription>
            Una o varias fuentes del marketplace no respondieron; algunas cifras pueden estar
            desactualizadas.
          </AlertDescription>
        </Alert>
      )}

      {/* ── Hero KPI Strip: GMV dominante + contadores compactos (§2.1) ────── */}
      <section
        aria-label="Indicadores principales del marketplace"
        className="grid grid-cols-1 gap-4 lg:grid-cols-12"
      >
        <StatCard
          variant="hero"
          className="lg:col-span-6"
          title="GMV Facturado"
          value={<MoneyAmount amount={gmvFacturado} currency={gmvCurrency} />}
          subtitle={`${facturasComprador.length} ${
            facturasComprador.length === 1 ? 'pedido facturado' : 'pedidos facturados'
          } en la plataforma`}
          icon={ReceiptIcon}
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:col-span-6">
          <StatCard
            variant="compact"
            title="Vendedores activos"
            value={vendedoresActivos}
            subtitle={`de ${vendedoresRegistrados.length} registrados`}
            icon={Store}
          />
          <StatCard
            variant="compact"
            title="Bodegas operativas"
            value={bodegasOperativas}
            subtitle={`de ${warehouses.length} en la red logística`}
            icon={WarehouseIcon}
          />
          <StatCard
            variant="compact"
            title="Pedidos en proceso"
            value={pedidosEnProceso}
            subtitle="en pago, empaque o despacho"
            icon={ShoppingBag}
          />
        </div>
      </section>

      {/* ── Split-Frame 65/35 (Frontend-Design-System §2.1) ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Izquierda (65%): Actividad Reciente de la Plataforma ─────────── */}
        <section className="lg:col-span-8" aria-labelledby="actividad-reciente">
          <div className="rounded-2xl border border-border bg-surface overflow-hidden">
            <div className="flex items-center justify-between border-b border-border bg-surface-muted/40 px-5 py-4">
              <h2
                id="actividad-reciente"
                className="text-sm font-semibold text-foreground flex items-center gap-2 font-sans"
              >
                <Activity className="h-4 w-4 text-brand" aria-hidden="true" />
                Actividad Reciente de la Plataforma
              </h2>
              <span className="font-mono text-xs text-foreground-muted tabular-nums">
                {orders.length} {orders.length === 1 ? 'pedido' : 'pedidos'}
              </span>
            </div>

            {actividadReciente.length === 0 ? (
              <p className="px-5 py-12 text-center text-sm text-foreground-muted">
                Sin pedidos registrados en la plataforma.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-foreground-muted">
                      <th scope="col" className="px-5 py-2.5 font-medium uppercase tracking-wider">
                        Pedido
                      </th>
                      <th scope="col" className="px-5 py-2.5 font-medium uppercase tracking-wider">
                        Estado
                      </th>
                      <th scope="col" className="px-5 py-2.5 font-medium uppercase tracking-wider">
                        Vendedor
                      </th>
                      <th
                        scope="col"
                        className="px-5 py-2.5 font-medium uppercase tracking-wider text-right"
                      >
                        Total
                      </th>
                      <th
                        scope="col"
                        className="px-5 py-2.5 font-medium uppercase tracking-wider text-right"
                      >
                        Fecha
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {actividadReciente.map((order: OrderListItem) => (
                      <tr key={order.id} className="transition-colors hover:bg-surface-muted/40">
                        <td className="px-5 py-3 font-mono font-semibold text-foreground">
                          #{order.id.slice(0, 8)}
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge tone={TONOS_DE_ESTADO_DE_PEDIDO[order.status]}>
                            {NOMBRES_DE_ESTADO_DE_PEDIDO[order.status]}
                          </StatusBadge>
                        </td>
                        <td className="px-5 py-3 text-foreground-muted max-w-40 truncate">
                          {vendedorDelPedido(order)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <MoneyAmount
                            amount={order.totalAmount}
                            currency={order.currency}
                            className="font-semibold text-foreground"
                          />
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-foreground-muted tabular-nums">
                          {fechaCorta(order.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Derecha (35%): Salud Operativa + Accesos de Gestión ──────────── */}
        <aside className="lg:col-span-4 space-y-6">
          {/* Salud Operativa: indicadores simples, sin telemetría de servidor */}
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground font-sans">Salud Operativa</h3>

            <div className="flex items-center gap-2.5" role="status" aria-live="polite">
              <span
                aria-hidden="true"
                className={`size-2 rounded-full ${
                  plataformaOperativa ? 'bg-success' : 'bg-danger animate-pulse'
                }`}
              />
              <span
                className={`text-sm font-medium ${plataformaOperativa ? 'text-foreground' : 'text-danger'}`}
              >
                {plataformaOperativa ? 'Plataforma operativa' : 'Plataforma degradada'}
              </span>
            </div>

            <dl className="space-y-2 border-t border-border-subtle pt-3 font-mono text-xs tabular-nums">
              <div className="flex items-center justify-between">
                <dt className="text-foreground-muted">Latencia API</dt>
                <dd className="text-foreground">
                  {apiLatencyMs !== null ? `${apiLatencyMs} ms` : '—'}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-foreground-muted">PostgreSQL</dt>
                <dd className="flex items-center gap-1.5 text-foreground">
                  <span
                    aria-hidden="true"
                    className={`size-1.5 rounded-full ${
                      health
                        ? baseDeDatosEnLinea
                          ? 'bg-success'
                          : 'bg-danger'
                        : 'bg-foreground-subtle'
                    }`}
                  />
                  {health ? (baseDeDatosEnLinea ? 'En línea' : 'Caída') : 'Sin señal'}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-foreground-muted">Última verificación</dt>
                <dd className="text-foreground">
                  {health?.timestamp ? horaCorta(health.timestamp) : '—'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Accesos de Gestión: las cinco estaciones de operación */}
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground font-sans">Accesos de Gestión</h3>
            <nav aria-label="Accesos de gestión" className="space-y-1.5">
              {ACCESOS_DE_GESTION.map((acceso) => (
                <Link
                  key={acceso.to}
                  to={acceso.to}
                  className="group flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-muted/40 px-3.5 py-2.5 transition-colors hover:border-brand/40 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <span className="flex items-center gap-2.5 text-xs font-medium text-foreground">
                    <acceso.icon className="h-4 w-4 text-brand" aria-hidden="true" />
                    {acceso.label}
                  </span>
                  <ArrowUpRight
                    className="h-3.5 w-3.5 text-foreground-subtle transition-colors group-hover:text-brand"
                    aria-hidden="true"
                  />
                </Link>
              ))}
            </nav>
          </div>
        </aside>
      </div>
    </div>
  );
}
