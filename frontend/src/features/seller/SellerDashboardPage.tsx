import { Link } from '@tanstack/react-router';
import { useProductsPagedQuery } from '../../core';
import { useOrdersQuery } from '../../core';
import { useFulfillmentsQuery } from '../../core';
import { useInvoicesQuery } from '../../core';
import { useInventoriesQuery } from '../../core';
import { useReturnsQuery } from '../../core';
import { getDefaultSession } from '../../core';
import {
  OrderStatus,
  ProductStatus,
  FulfillmentStatus,
  InvoiceType,
  ReturnStatus,
  type Product,
  type OrderListItem,
  type FulfillmentOrder,
  type Invoice,
  type Inventory,
  type ReturnRequest,
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
  StatCard,
} from '@zentric/ui';
import {
  Package,
  Boxes,
  Truck,
  RotateCcw,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  PlusCircle,
} from 'lucide-react';

/**
 * Panel Principal del Vendedor (SellerDashboardPage - Frontend-Role-Modules sección 2.3).
 * Hero KPI Strip + Split-Frame (65% Pedidos Recientes / 35% Operaciones Logísticas).
 * Métrica dominante con subtotal neto liquidado en facturas VendorDetail.
 */
export function SellerDashboardPage() {
  const vendorId = getDefaultSession()?.getUserId() ?? undefined;
  const { data: productsResult, isLoading: isLoadingProducts, isError: isErrorProducts } = useProductsPagedQuery({ vendorId });
  const products = productsResult?.items ?? [];
  const { data: orders, isLoading: isLoadingOrders } = useOrdersQuery();
  const { data: pendingPaymentOrders } = useOrdersQuery(OrderStatus.PendingPayment);
  const { data: fulfillments } = useFulfillmentsQuery();
  const { data: invoices } = useInvoicesQuery();
  const { data: inventories } = useInventoriesQuery();
  const { data: returns } = useReturnsQuery();

  const allProducts = products;
  const publishedCount = allProducts.filter((p: Product) => p.status === ProductStatus.Published).length;
  const suspendedCount = allProducts.filter((p: Product) => p.status === ProductStatus.Suspended).length;

  const allFulfillments = fulfillments ?? [];
  const pendingPackCount = allFulfillments.filter(
    (f: FulfillmentOrder) => f.status === FulfillmentStatus.PendingPack
  ).length;

  // Facturas de vendedor (VendorDetail) para el consolidado financiero (95% neto)
  const vendorInvoices = (invoices ?? []).filter((inv: Invoice) => inv.type === InvoiceType.VendorDetail);
  const netSettledTotal = vendorInvoices.reduce((sum: number, inv: Invoice) => sum + inv.totalAmount, 0);
  const grossSoldEstimated = Math.round(netSettledTotal / 0.95);
  const platformCommissionEstimated = Math.max(0, grossSoldEstimated - netSettledTotal);

  // Salud de stock y postventa del vendedor
  const allInventories = inventories ?? [];
  const lowStockCount = allInventories.filter((inv: Inventory) => inv.availableQuantity <= 5).length;
  const pendingReturnsCount = (returns ?? []).filter(
    (r: ReturnRequest) => r.status === ReturnStatus.Requested
  ).length;

  const recentOrders = (orders ?? []).slice(0, 5);
  const potentialCustomersCount = (pendingPaymentOrders ?? []).length;

  if (isLoadingProducts || isLoadingOrders) {
    return (
      <div className="space-y-8 w-full max-w-full">
        <Skeleton className="h-8 w-48 bg-surface" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
          <Skeleton className="h-28 rounded-2xl bg-surface" />
          <Skeleton className="h-28 rounded-2xl bg-surface" />
          <Skeleton className="h-28 rounded-2xl bg-surface" />
          <Skeleton className="h-28 rounded-2xl bg-surface" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <Skeleton className="lg:col-span-8 h-80 rounded-2xl bg-surface" />
          <Skeleton className="lg:col-span-4 h-80 rounded-2xl bg-surface" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full max-w-full">
      {/* ── Encabezado de la Consola del Vendedor ─────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
              Consola del Vendedor
            </h1>
            <Badge variant="outline" className="border-border text-brand font-medium text-xs">
              Portal Comercial
            </Badge>
          </div>
          <p className="text-sm text-foreground-muted">
            Supervisión de catálogo propio, abastecimiento en bodegas físicas y empaque de despachos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/seller/products/new">
            <Button className="bg-brand hover:bg-brand/90 text-primary-foreground font-bold text-xs shadow-md shadow-brand/20">
              <PlusCircle className="h-4 w-4 mr-1.5" />
              Nuevo Producto
            </Button>
          </Link>
          <Link to="/seller/inventory">
            <Button variant="outline" size="sm" className="border-border text-foreground-muted hover:text-foreground">
              <Boxes className="h-4 w-4 mr-1.5" /> Cargar Stock
            </Button>
          </Link>
        </div>
      </div>

      {isErrorProducts && (
        <Alert variant="destructive" className="border-destructive bg-destructive/10 text-destructive">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <AlertTitle>Aviso del Catálogo</AlertTitle>
          <AlertDescription className="text-xs">
            No fue posible conectar con el inventario del vendedor. Reintente más tarde.
          </AlertDescription>
        </Alert>
      )}

      {/* ── Hero KPI Strip Asimétrico ───────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard
          title="Liquidación Neta Acumulada"
          value={<MoneyAmount amount={netSettledTotal} currency="COP" />}
          badge={{ label: 'Liquidado', tone: 'success' }}
          icon={TrendingUp}
          subtitle="Total acreditado en facturas VendorDetail"
        />
        <StatCard
          title="Productos Publicados"
          value={publishedCount.toString()}
          badge={{ label: 'En Venta', tone: 'info' }}
          icon={Package}
          subtitle="Visibles en el catálogo del comprador"
        />
        <StatCard
          title="Productos Suspendidos"
          value={suspendedCount.toString()}
          badge={{ label: 'En Pausa', tone: 'neutral' }}
          icon={Boxes}
          subtitle="Pausados temporalmente de la venta"
        />
        <StatCard
          title="Despachos por Empacar"
          value={pendingPackCount.toString()}
          badge={{
            label: pendingPackCount > 0 ? 'Pendiente' : 'Al Día',
            tone: pendingPackCount > 0 ? 'warning' : 'neutral',
          }}
          icon={Truck}
          subtitle="Órdenes pagadas en espera de empaque"
        />
        <StatCard
          title="Clientes Potenciales"
          value={potentialCustomersCount.toString()}
          badge={{
            label: potentialCustomersCount > 0 ? 'Leads' : 'Sin Leads',
            tone: potentialCustomersCount > 0 ? 'info' : 'neutral',
          }}
          icon={TrendingUp}
          subtitle="Pedidos en pago pendiente (checkout iniciado)"
        />
      </div>

      {/* ── Split-Frame Asimétrico (65% Pedidos / 35% Accesos Operativos) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Lado Izquierdo: Pedidos Recientes (65% -> col-span-8) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-xs">
            <div className="p-5 sm:p-6 border-b border-border bg-surface-muted/30 flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold font-sans tracking-tight text-foreground">
                  Pedidos Recientes de mis Productos
                </h2>
                <p className="text-xs sm:text-sm text-foreground-muted mt-0.5">
                  Órdenes directas que contienen artículos de tu catálogo
                </p>
              </div>
              <Link to="/seller/orders">
                <Button variant="ghost" size="sm" className="text-brand hover:text-brand/80 text-xs sm:text-sm font-semibold">
                  Ver Todos ({orders?.length ?? 0}) <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <div className="p-10 text-center text-sm font-medium text-foreground-muted">
                Sin ventas registradas recientemente en su cuenta de vendedor.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentOrders.map((order: OrderListItem) => (
                  <div key={order.id} className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-surface-muted/30 transition-colors">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-sm sm:text-base font-bold text-foreground tracking-tight">
                          Pedido #{order.id.slice(0, 8)}
                        </span>
                        <StatusBadge tone="neutral">{order.status}</StatusBadge>
                      </div>
                      <p className="text-xs sm:text-sm text-foreground-muted font-sans">
                        Fecha: {new Date(order.createdAt).toLocaleDateString('es-CO')} • {order.itemCount} línea(s)
                      </p>
                    </div>

                    <div className="text-left sm:text-right flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2">
                      <div className="text-base sm:text-lg font-bold font-sans text-foreground tabular-nums">
                        <MoneyAmount amount={order.totalAmount} currency={order.currency} />
                      </div>
                      <Link to="/seller/orders">
                        <span className="text-xs sm:text-sm font-medium text-brand hover:underline cursor-pointer">
                          Ver Desglose
                        </span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Lado Derecho: Cola Operativa (35% -> col-span-4) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Desglose Financiero Split (100% / 5% / 95%) */}
          <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-sm font-bold font-sans tracking-wide text-foreground">
                Liquidación Split (5% / 95%)
              </h2>
              <Badge variant="outline" className="border-brand/40 text-brand font-medium text-xs">
                ADR-0023
              </Badge>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground-muted">Ventas Brutas (100%):</span>
                <span className="text-foreground font-semibold tabular-nums text-base">
                  <MoneyAmount amount={grossSoldEstimated} currency="COP" />
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground-muted">Comisión Zentric (-5%):</span>
                <span className="text-warning font-semibold tabular-nums text-base">
                  - <MoneyAmount amount={platformCommissionEstimated} currency="COP" />
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="text-sm sm:text-base font-bold text-foreground">Neto Vendedor (95%):</span>
                <span className="text-xl sm:text-2xl font-black text-brand tabular-nums tracking-tight">
                  <MoneyAmount amount={netSettledTotal} currency="COP" />
                </span>
              </div>
            </div>
          </div>

          {/* Radar de Stock y Postventa */}
          <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 space-y-4 shadow-xs">
            <h2 className="text-sm font-bold font-sans tracking-wide text-foreground">
              Radar de Stock y Postventa
            </h2>
            <div className="grid grid-cols-2 gap-3.5">
              <Link
                to="/seller/inventory"
                className="rounded-xl border border-border bg-surface-muted/30 p-4 hover:border-brand/50 hover:bg-surface-muted/60 transition-all"
              >
                <span className="text-xs font-semibold text-foreground-muted block uppercase tracking-wider">
                  Stock Crítico
                </span>
                <span className={`text-2xl sm:text-3xl font-extrabold tabular-nums my-1 block ${lowStockCount > 0 ? 'text-warning' : 'text-brand'}`}>
                  {lowStockCount}
                </span>
                <span className="text-xs text-foreground-muted block">variantes ≤ 5 uds</span>
              </Link>
              <Link
                to="/seller/returns"
                className="rounded-xl border border-border bg-surface-muted/30 p-4 hover:border-brand/50 hover:bg-surface-muted/60 transition-all"
              >
                <span className="text-xs font-semibold text-foreground-muted block uppercase tracking-wider">
                  Devoluciones
                </span>
                <span className={`text-2xl sm:text-3xl font-extrabold tabular-nums my-1 block ${pendingReturnsCount > 0 ? 'text-warning' : 'text-brand'}`}>
                  {pendingReturnsCount}
                </span>
                <span className="text-xs text-foreground-muted block">por decidir</span>
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 space-y-4 shadow-xs">
            <h2 className="text-sm font-bold font-sans tracking-wide text-foreground">
              Acciones Rápidas
            </h2>

            <div className="space-y-2.5">
              <Link to="/seller/products" className="block">
                <Button variant="outline" className="w-full h-12 justify-start border-border text-foreground text-sm font-medium hover:bg-surface-muted rounded-xl px-4 transition-colors">
                  <Package className="h-4.5 w-4.5 mr-3 text-brand shrink-0" />
                  Gestionar Catálogo de Productos
                </Button>
              </Link>
              <Link to="/seller/inventory" className="block">
                <Button variant="outline" className="w-full h-12 justify-start border-border text-foreground text-sm font-medium hover:bg-surface-muted rounded-xl px-4 transition-colors">
                  <Boxes className="h-4.5 w-4.5 mr-3 text-brand shrink-0" />
                  Abastecimiento de Bodegas
                </Button>
              </Link>
              <Link to="/seller/fulfillments" className="block">
                <Button variant="outline" className="w-full h-12 justify-start border-border text-foreground text-sm font-medium hover:bg-surface-muted rounded-xl px-4 transition-colors">
                  <Truck className="h-4.5 w-4.5 mr-3 text-warning shrink-0" />
                  Cola de Empaque y Despachos
                </Button>
              </Link>
              <Link to="/seller/returns" className="block">
                <Button variant="outline" className="w-full h-12 justify-start border-border text-foreground text-sm font-medium hover:bg-surface-muted rounded-xl px-4 transition-colors">
                  <RotateCcw className="h-4.5 w-4.5 mr-3 text-brand shrink-0" />
                  Aprobación de Devoluciones
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
