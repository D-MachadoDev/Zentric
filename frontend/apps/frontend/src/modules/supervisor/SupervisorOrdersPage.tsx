import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  AlertCircle,
  Eye,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Input,
  Skeleton,
} from '@zentric/ui';
import { useOrdersQuery } from '../../application/services';
import type { OrderListItem } from '../../domain';
import { OrderStatus } from '../../domain';

/**
 * Vista global de pedidos para el Supervisor (/supervisor/orders).
 *
 * Frontend-Role-Modules.md §2.6:
 * DataTable global de pedidos con filtro por `OrderStatus` y búsqueda por texto
 * en modo estricto de sólo lectura (cero botones de mutación comercial).
 */
export function SupervisorOrdersPage() {
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const parsedStatus = statusFilter === 'All' ? undefined : (statusFilter as OrderStatus);

  const {
    data: orders = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useOrdersQuery(parsedStatus);

  const filteredOrders = orders.filter((ord: OrderListItem) => {
    const matchesSearch =
      !searchTerm.trim() ||
      ord.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ord.buyerId && ord.buyerId.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'All' || ord.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const selectedOrder =
    orders.find((o: OrderListItem) => o.id === selectedOrderId) ??
    filteredOrders[0] ??
    null;

  if (isLoading) {
    return (
      <div className="space-y-8 p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full">
        <Skeleton className="h-10 w-64 bg-surface" />
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
          <AlertTitle>Error al cargar pedidos globales</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Ocurrió un error inesperado al consultar los pedidos.'}
          </AlertDescription>
        </Alert>
        <Button
          onClick={() => refetch()}
          variant="outline"
          className="border-border text-foreground hover:bg-border"
        >
          <RefreshCw className="h-4 w-4 mr-2" /> Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full">
      {/* ── Encabezado ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
              Auditoría Global de Pedidos
            </h1>
            <Badge variant="outline" className="border-border text-brand font-mono text-xs">
              {orders.length} Pedidos
            </Badge>
            <Badge variant="outline" className="border-border text-warning font-mono text-xs">
              Sólo Lectura
            </Badge>
          </div>
          <p className="text-sm text-foreground-muted">
            Inspección transversal de órdenes de compra en toda la plataforma sin acciones de alteración comercial.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="border-border text-foreground-muted hover:text-foreground"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Refrescar
        </Button>
      </div>

      {/* ── Split-Frame (65% / 35%) ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Lado Izquierdo (65%): Tabla de Pedidos ───────────────────────── */}
        <section className="lg:col-span-8 space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
              <Input
                type="text"
                placeholder="Buscar por ID de pedido o identificador de comprador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-surface border-border text-foreground placeholder:text-foreground-muted focus:border-brand"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filtrar por estado de pedido"
              className="bg-surface border border-border text-foreground text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-brand"
            >
              <option value="All">Todos los Estados</option>
              <option value={OrderStatus.Cart}>En Carrito (Cart)</option>
              <option value={OrderStatus.PendingPayment}>Pendiente de Pago (15 min)</option>
              <option value={OrderStatus.Paid}>Pagado (Paid)</option>
              <option value={OrderStatus.Dispatched}>Despachado (Dispatched)</option>
              <option value={OrderStatus.Delivered}>Entregado (Delivered)</option>
              <option value={OrderStatus.Cancelled}>Cancelado (Cancelled)</option>
            </select>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface p-12 text-center">
              <ShoppingBag className="h-10 w-10 text-foreground-muted mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-foreground">No se encontraron pedidos</h3>
              <p className="text-xs text-foreground-muted mt-1">
                No existen órdenes que coincidan con el estado o término de búsqueda indicado.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-surface overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-foreground-muted uppercase tracking-wider font-sans bg-surface-muted/40">
                      <th className="py-3 px-4">ID Pedido</th>
                      <th className="py-3 px-4">Comprador (Ref)</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4 text-right">Líneas</th>
                      <th className="py-3 px-4 text-right">Total</th>
                      <th className="py-3 px-4 text-right">Auditoría</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredOrders.map((ord: OrderListItem) => {
                      const isSelected = selectedOrder?.id === ord.id;
                      return (
                        <tr
                          key={ord.id}
                          onClick={() => setSelectedOrderId(ord.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-surface-muted' : 'hover:bg-surface-muted/40'
                          }`}
                        >
                          <td className="py-4 px-4 font-mono font-semibold text-foreground">
                            #{ord.id.substring(0, 8)}
                          </td>
                          <td className="py-4 px-4 font-mono text-foreground-muted">
                            {ord.buyerId ? `#${ord.buyerId.substring(0, 8)}` : 'Anónimo'}
                          </td>
                          <td className="py-4 px-4">
                            <Badge
                              variant="outline"
                              className="border-border text-border text-[11px] font-mono"
                            >
                              {ord.status}
                            </Badge>
                          </td>
                          <td className="py-4 px-4 text-right font-mono text-foreground-muted tabular-nums">
                            {ord.itemCount}
                          </td>
                          <td className="py-4 px-4 text-right font-mono font-bold text-brand tabular-nums">
                            ${ord.totalAmount.toLocaleString('es-CO')}{' '}
                            <span className="text-[10px] text-foreground-muted">{ord.currency}</span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <Link
                              to="/supervisor/orders/$orderId"
                              params={{ orderId: ord.id }}
                              className="inline-flex items-center gap-1 text-xs font-mono text-brand hover:underline"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Expediente 360°
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* Lado Derecho (35%): Resumen de Orden Seleccionada ────────────── */}
        <section className="lg:col-span-4 space-y-6">
          {selectedOrder ? (
            <div className="rounded-2xl border border-border bg-surface p-6 space-y-5">
              <div className="border-b border-border pb-4">
                <span className="text-[11px] font-mono text-foreground-muted block uppercase">
                  Resumen de Pedido Seleccionado
                </span>
                <h3 className="text-lg font-bold text-foreground font-mono mt-1">
                  #{selectedOrder.id}
                </h3>
                <Badge
                  variant="outline"
                  className="mt-2 border-brand/40 text-brand font-mono text-xs"
                >
                  Estado: {selectedOrder.status}
                </Badge>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-foreground-muted font-sans">Ref. Comprador:</span>
                  <span className="text-foreground">{selectedOrder.buyerId ?? 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-muted font-sans">Cantidad de Ítems:</span>
                  <span className="text-foreground tabular-nums">{selectedOrder.itemCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-muted font-sans">Importe Total:</span>
                  <span className="text-brand font-bold tabular-nums">
                    ${selectedOrder.totalAmount.toLocaleString('es-CO')} {selectedOrder.currency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-muted font-sans">Fecha Registro:</span>
                  <span className="text-foreground">
                    {selectedOrder.createdAt ? selectedOrder.createdAt.substring(0, 10) : '—'}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-border">
                <Link
                  to="/supervisor/orders/$orderId"
                  params={{ orderId: selectedOrder.id }}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-surface-muted hover:bg-border border border-brand/40 text-brand font-semibold text-xs py-2.5 px-4 transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  Abrir Expediente 360° del Pedido
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-surface p-8 text-center text-xs text-foreground-muted">
              Seleccione un pedido de la tabla para previsualizar su ficha de control.
            </div>
          )}

          <div className="rounded-2xl border border-border bg-surface p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-brand">
              <ShieldCheck className="h-4 w-4" />
              <span>Política OrderRead (Sólo Lectura)</span>
            </div>
            <p className="text-[11px] text-foreground-muted leading-relaxed">
              El Supervisor tiene visibilidad global sobre todos los estados del ciclo de compra sin permisos para cancelar órdenes, ejecutar pagos ni modificar direcciones de entrega.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
