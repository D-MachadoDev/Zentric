import { useState } from 'react';
import {
  useReturnsQuery,
  useApproveReturnMutation,
  useRejectReturnMutation,
} from '../../application/services/returns';
import { useWarehousesQuery } from '../../application/services/warehouses';
import { useProductsQuery } from '../../application/services/catalog';
import {
  ReturnStatus,
  type ReturnRequest,
  type Warehouse,
  type Product,
  type ProductVariant,
} from '../../domain';
import {
  NOMBRES_DE_ESTADO_DE_DEVOLUCION,
  TONOS_DE_ESTADO_DE_DEVOLUCION,
} from '../../components/domainLabels';
import {
  Button,
  Input,
  Badge,
  Skeleton,
  Alert,
  AlertTitle,
  AlertDescription,
  StatusBadge,
  StateView,
} from '@zentric/ui';
import {
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  Check,
  X,
} from 'lucide-react';


/**
 * Resolución Comercial de Devoluciones del Vendedor (SellerReturnsPage - Frontend-Role-Modules §2.3).
 * Split-Frame Asimétrico (65% Bandeja de Devoluciones / 35% Estación de Decisión Comercial).
 *
 * Cumplimiento de ADR-0006:
 * Exhibe el veredicto de inspección física (isGoodCondition) emitido por el operador logístico
 * y permite al vendedor aprobar comercialmente (reingresando a usedQuantity) o rechazar la solicitud.
 */
export function SellerReturnsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | ReturnStatus>('All');
  const [selectedReturnId, setSelectedReturnId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const {
    data: returns,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useReturnsQuery();

  const { data: warehouses } = useWarehousesQuery();
  const { data: products } = useProductsQuery();
  const approveMutation = useApproveReturnMutation();
  const rejectMutation = useRejectReturnMutation();

  const allReturns = returns ?? [];
  const allWarehouses = warehouses ?? [];
  const allProducts = products ?? [];

  const warehouseMap = new Map<string, Warehouse>(allWarehouses.map((w: Warehouse) => [w.id, w]));
  const variantMap = new Map<string, { sku: string; name: string }>();

  allProducts.forEach((p: Product) => {
    (p.variants ?? []).forEach((v: ProductVariant) => {
      variantMap.set(v.id, { sku: v.sku, name: p.name });
    });
  });

  const filteredReturns = allReturns.filter((r: ReturnRequest) => {
    const matchesSearch =
      !searchTerm.trim() ||
      r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.customerOrderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.variantId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const selectedReturn =
    allReturns.find((r: ReturnRequest) => r.id === selectedReturnId) ??
    filteredReturns[0] ??
    null;

  const currentId = selectedReturn?.id;

  const handleApprove = async (id: string) => {
    setActionSuccess(null);
    try {
      await approveMutation.mutateAsync(id);
      setActionSuccess('Devolución aprobada exitosamente. Las unidades reingresan a stock usado (ADR-0006).');
    } catch {
      // Error manejado en query client
    }
  };

  const handleReject = async (id: string) => {
    setActionSuccess(null);
    try {
      await rejectMutation.mutateAsync(id);
      setActionSuccess('Solicitud de devolución rechazada comercialmente.');
    } catch {
      // Error manejado en query client
    }
  };

  if (isLoading) {
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

  if (isError) {
    return (
      <div className="space-y-6 p-6 sm:p-10 max-w-4xl mx-auto w-full">
        <Alert variant="destructive" className="border-red-900 bg-red-950/40 text-red-200">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <AlertTitle>Error al cargar devoluciones</AlertTitle>
          <AlertDescription>
            {error instanceof Error
              ? error.message
              : 'Ocurrió un error al consultar las solicitudes de devolución.'}
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
    <div className="space-y-8 w-full max-w-full">
      {/* ── Encabezado de Devoluciones ───────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
              Resolución de Devoluciones
            </h1>
            <Badge variant="outline" className="border-border text-brand font-mono text-xs">
              {allReturns.length} Solicitudes
            </Badge>
          </div>
          <p className="text-sm text-foreground-muted">
            Aprobación o rechazo comercial de solicitudes tras la inspección física en bodega (ADR-0006).
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

      {actionSuccess && (
        <Alert className="border-brand/40 bg-brand/10 text-brand">
          <CheckCircle2 className="h-4 w-4 text-brand" />
          <AlertDescription className="text-xs">{actionSuccess}</AlertDescription>
        </Alert>
      )}

      {/* ── Composición Asimétrica Split-Frame (65% / 35%) ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Lado Izquierdo (65%): Bandeja de Devoluciones ───────────────── */}
        <section className="lg:col-span-8 space-y-6">
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
              <Input
                type="text"
                placeholder="Buscar por ID, pedido o variante..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-surface border-border text-foreground placeholder:text-foreground-muted focus:border-brand"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'All' | ReturnStatus)}
              aria-label="Filtrar por estado de devolución"
              className="bg-surface border border-border text-foreground text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-brand"
            >
              <option value="All">Todos los estados</option>
              {Object.values(ReturnStatus).map((status) => (
                <option key={status} value={status}>
                  {NOMBRES_DE_ESTADO_DE_DEVOLUCION[status]}
                </option>
              ))}
            </select>
          </div>

          {filteredReturns.length === 0 ? (
            <StateView
              state="empty"
              title="No hay devoluciones registradas"
              description={
                searchTerm || statusFilter !== 'All'
                  ? 'No hay solicitudes de devolución que coincidan con los filtros aplicados.'
                  : 'Ningún comprador ha solicitado devolución para tus productos.'
              }
            />
          ) : (

            <div className="space-y-3">
              {filteredReturns.map((r: ReturnRequest) => {
                const isSelected = r.id === currentId;
                const variantInfo = variantMap.get(r.variantId);
                const warehouse = warehouseMap.get(r.warehouseId);

                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedReturnId(r.id)}
                    className={`rounded-2xl border p-5 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-brand bg-surface-muted shadow-lg shadow-brand/5'
                        : 'border-border bg-surface hover:border-border/80 hover:bg-surface-muted/40'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-foreground">
                            Devolución #{r.id.substring(0, 8)}
                          </span>
                          <StatusBadge tone={TONOS_DE_ESTADO_DE_DEVOLUCION[r.status]}>
                            {NOMBRES_DE_ESTADO_DE_DEVOLUCION[r.status]}
                          </StatusBadge>
                        </div>
                        <div className="text-xs text-foreground-muted">
                          {variantInfo?.name ?? 'Producto devuelto'} • {r.quantity} unidades
                        </div>
                        <div className="text-[11px] font-mono text-foreground-muted">
                          Pedido: #{r.customerOrderId.substring(0, 8)} • Bodega: {warehouse?.location ?? r.warehouseId}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3">
                        <div className="text-right">
                          <span
                            className={`text-xs font-medium px-2 py-1 rounded-full ${
                              r.isGoodCondition
                                ? 'bg-brand/10 text-brand border border-brand/30'
                                : 'bg-red-950/40 text-red-400 border border-red-900/40'
                            }`}
                          >
                            {r.isGoodCondition ? 'Buen Estado' : 'Dañado / No Apto'}
                          </span>
                        </div>
                        <ChevronRight
                          className={`h-5 w-5 ${isSelected ? 'text-brand' : 'text-foreground-muted'}`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Lado Derecho (35%): Ficha de Dictamen y Decisión Comercial ──── */}
        <aside className="lg:col-span-4 space-y-6">
          {selectedReturn ? (
            <div className="rounded-2xl border border-border bg-surface p-6 space-y-6">
              <div className="space-y-1 pb-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-foreground font-sans">
                    Expediente de Devolución
                  </h2>
                  <StatusBadge tone={TONOS_DE_ESTADO_DE_DEVOLUCION[selectedReturn.status]}>
                    {NOMBRES_DE_ESTADO_DE_DEVOLUCION[selectedReturn.status]}
                  </StatusBadge>
                </div>
                <p className="font-mono text-xs text-brand truncate">
                  ID: {selectedReturn.id}
                </p>
                <p className="text-[11px] text-foreground-muted">
                  Pedido: {selectedReturn.customerOrderId}
                </p>
              </div>

              {/* Dictamen de Inspección Física (ADR-0018) */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                  Inspección Física en Bodega
                </h3>

                <div
                  className={`rounded-xl border p-4 space-y-2 ${
                    selectedReturn.isGoodCondition
                      ? 'border-brand/40 bg-brand/5'
                      : 'border-red-900/40 bg-red-950/20'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {selectedReturn.isGoodCondition ? (
                      <ShieldCheck className="h-5 w-5 text-brand" />
                    ) : (
                      <ShieldAlert className="h-5 w-5 text-red-400" />
                    )}
                    <span className="text-xs font-bold text-foreground">
                      {selectedReturn.isGoodCondition
                        ? 'Dictamen Favorable'
                        : 'Dictamen Desfavorable'}
                    </span>
                  </div>
                  <p className="text-[11px] text-foreground-muted leading-relaxed">
                    {selectedReturn.isGoodCondition
                      ? 'El operador logístico verificó que el producto devuelto se encuentra íntegro y sin daños.'
                      : 'El operador logístico constató que el producto presenta anomalías, rotura o empaque violentado.'}
                  </p>
                </div>
              </div>

              {/* Detalles de la Variante y Cantidad */}
              <div className="rounded-xl border border-border bg-surface-muted/60 p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-foreground-muted">Variante:</span>
                  <span className="font-mono text-foreground truncate max-w-[160px]">
                    {selectedReturn.variantId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-muted">Cantidad Solicitada:</span>
                  <span className="font-mono font-semibold text-foreground">
                    {selectedReturn.quantity} unidades
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-muted">Bodega Receptora:</span>
                  <span className="text-foreground">
                    {warehouseMap.get(selectedReturn.warehouseId)?.location ?? selectedReturn.warehouseId}
                  </span>
                </div>
              </div>

              {/* Botones de Decisión Comercial (Exclusivos del Vendedor) */}
              {selectedReturn.status === ReturnStatus.Requested && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                    Resolución Comercial
                  </h3>

                  <Button
                    onClick={() => handleApprove(selectedReturn.id)}
                    disabled={approveMutation.isPending}
                    className="w-full bg-brand text-primary-foreground hover:bg-brand/90 font-semibold"
                  >
                    {approveMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Aprobar Devolución
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => handleReject(selectedReturn.id)}
                    disabled={rejectMutation.isPending}
                    className="w-full border-red-900/60 text-red-400 hover:bg-red-950/40 hover:text-red-300"
                  >
                    {rejectMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <X className="h-4 w-4 mr-2" />
                    )}
                    Rechazar Devolución
                  </Button>
                </div>
              )}

              {selectedReturn.status === ReturnStatus.Approved && (
                <div className="rounded-xl border border-brand/30 bg-brand/10 p-4 text-center space-y-1">
                  <CheckCircle2 className="h-6 w-6 text-brand mx-auto" />
                  <p className="text-xs font-semibold text-brand">
                    Devolución Aprobada
                  </p>
                  <p className="text-[11px] text-foreground-muted">
                    Pendiente de liquidación y desembolso de reembolso por el Administrador.
                  </p>
                </div>
              )}

              {selectedReturn.status === ReturnStatus.Rejected && (
                <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-4 text-center space-y-1">
                  <XCircle className="h-6 w-6 text-red-400 mx-auto" />
                  <p className="text-xs font-semibold text-red-400">
                    Devolución Rechazada
                  </p>
                  <p className="text-[11px] text-foreground-muted">
                    La solicitud fue denegada comercialmente por el vendedor.
                  </p>
                </div>
              )}

              {selectedReturn.status === ReturnStatus.Refunded && (
                <div className="rounded-xl border border-brand/30 bg-brand/10 p-4 text-center space-y-1">
                  <CheckCircle2 className="h-6 w-6 text-brand mx-auto" />
                  <p className="text-xs font-semibold text-brand">
                    Reembolsada al Comprador
                  </p>
                  <p className="text-[11px] text-foreground-muted">
                    El Administrador ya acreditó el reembolso financiero al comprador.
                  </p>
                </div>
              )}

              {/* Nota ADR-0006 */}
              <div className="rounded-xl border border-border bg-surface-muted/30 p-3.5">
                <p className="text-[11px] text-foreground-muted leading-relaxed">
                  <strong>ADR-0006:</strong> Al aprobar una devolución sobre producto físico en buen estado,
                  el backend reingresa automáticamente las existencias a la categoría de <em>Stock Usado</em> (usedQuantity).
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-foreground-muted">
              Selecciona una solicitud para dictaminar su aprobación o rechazo.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
