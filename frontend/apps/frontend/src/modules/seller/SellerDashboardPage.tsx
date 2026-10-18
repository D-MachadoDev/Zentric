import { Link } from '@tanstack/react-router';
import { useProductsQuery } from '../../application/services/catalog';
import { useOrdersQuery } from '../../application/services/orders';
import { useFulfillmentsQuery } from '../../application/services/logistics';
import { useInvoicesQuery } from '../../application/services/billing';
import {
  ProductStatus,
  FulfillmentStatus,
  InvoiceType,
  type Product,
  type OrderListItem,
  type FulfillmentOrder,
  type Invoice,
} from '../../domain';
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
 * Panel Principal del Vendedor (SellerDashboardPage - Frontend-Role-Modules §2.3).
 * Hero KPI Strip + Split-Frame (65% Pedidos Recientes / 35% Operaciones Logísticas).
 * Métrica dominante con subtotal neto liquidado en facturas VendorDetail.
 */
export function SellerDashboardPage() {
  const { data: products, isLoading: isLoadingProducts, isError: isErrorProducts } = useProductsQuery();
  const { data: orders, isLoading: isLoadingOrders } = useOrdersQuery();
  const { data: fulfillments } = useFulfillmentsQuery();
  const { data: invoices } = useInvoicesQuery();

  const allProducts = products ?? [];
  const publishedCount = allProducts.filter((p: Product) => p.status === ProductStatus.Published).length;
  const suspendedCount = allProducts.filter((p: Product) => p.status === ProductStatus.Suspended).length;

  const allFulfillments = fulfillments ?? [];
  const pendingPackCount = allFulfillments.filter(
    (f: FulfillmentOrder) => f.status === FulfillmentStatus.PendingPack
  ).length;

  // Facturas de vendedor (VendorDetail) para el consolidado financiero
  const vendorInvoices = (invoices ?? []).filter((inv: Invoice) => inv.type === InvoiceType.VendorDetail);
  const netSettledTotal = vendorInvoices.reduce((sum: number, inv: Invoice) => sum + inv.totalAmount, 0);

  const recentOrders = (orders ?? []).slice(0, 5);

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
            <Badge variant="outline" className="border-border text-brand font-mono text-xs">
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
        <Alert variant="destructive" className="border-red-900 bg-red-950/40 text-red-200">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <AlertTitle>Aviso del Catálogo</AlertTitle>
          <AlertDescription className="text-xs font-mono">
            No fue posible conectar con el inventario del vendedor. Reintente más tarde.
          </AlertDescription>
        </Alert>
      )}

      {/* ── Hero KPI Strip Asimétrico ───────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
      </div>

      {/* ── Split-Frame Asimétrico (65% Pedidos / 35% Accesos Operativos) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Lado Izquierdo: Pedidos Recientes (65% -> col-span-8) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-2xl border border-border bg-surface overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-border bg-surface-muted/40 flex items-center justify-between">
              <span className="text-xs uppercase font-mono tracking-wider text-foreground-muted">
                Pedidos Recientes de mis Productos
              </span>
              <Link to="/seller/orders">
                <Button variant="ghost" size="sm" className="text-brand hover:text-brand/80 text-xs">
                  Ver Todos ({orders?.length ?? 0}) <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-foreground-muted">
                Sin ventas registradas recientemente en su cuenta de vendedor.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentOrders.map((order: OrderListItem) => (
                  <div key={order.id} className="p-5 flex items-center justify-between hover:bg-surface-muted/30 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-foreground">
                          Pedido #{order.id.slice(0, 8)}
                        </span>
                        <StatusBadge tone="neutral">{order.status}</StatusBadge>
                      </div>
                      <p className="text-xs font-mono text-foreground-muted">
                        Fecha: {new Date(order.createdAt).toLocaleDateString('es-CO')} • {order.itemCount} línea(s)
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-mono font-bold text-foreground tabular-nums">
                        <MoneyAmount amount={order.totalAmount} currency={order.currency} />
                      </div>
                      <Link to="/seller/orders">
                        <span className="text-xs font-mono text-brand hover:underline cursor-pointer">
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
          <div className="rounded-2xl border border-border bg-surface p-6 space-y-4 shadow-xl">
            <h2 className="text-sm uppercase font-mono tracking-wider text-foreground-muted">
              Acciones Rápidas
            </h2>

            <div className="space-y-2">
              <Link to="/seller/products">
                <Button variant="outline" className="w-full justify-start border-border text-foreground-muted hover:text-foreground hover:bg-surface-muted">
                  <Package className="h-4 w-4 mr-2 text-brand" />
                  Gestionar Catálogo de Productos
                </Button>
              </Link>
              <Link to="/seller/inventory">
                <Button variant="outline" className="w-full justify-start border-border text-foreground-muted hover:text-foreground hover:bg-surface-muted">
                  <Boxes className="h-4 w-4 mr-2 text-brand" />
                  Abastecimiento de Bodegas
                </Button>
              </Link>
              <Link to="/seller/fulfillments">
                <Button variant="outline" className="w-full justify-start border-border text-foreground-muted hover:text-foreground hover:bg-surface-muted">
                  <Truck className="h-4 w-4 mr-2 text-warning" />
                  Cola de Empaque y Despachos
                </Button>
              </Link>
              <Link to="/seller/returns">
                <Button variant="outline" className="w-full justify-start border-border text-foreground-muted hover:text-foreground hover:bg-surface-muted">
                  <RotateCcw className="h-4 w-4 mr-2 text-brand" />
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
