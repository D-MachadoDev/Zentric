import { useState } from 'react';
import {
  useFulfillmentsQuery,
  usePackFulfillmentMutation,
  useDispatchFulfillmentMutation,
  useCancelGhostStockMutation,
} from '../../application/services/logistics';
import { useWarehousesQuery } from '../../application/services/warehouses';
import {
  FulfillmentStatus,
  type FulfillmentOrder,
  type Shipment,
  type Warehouse,
} from '../../domain';
import {
  NOMBRES_DE_ESTADO_DE_DESPACHO,
  TONOS_DE_ESTADO_DE_DESPACHO,
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
  Truck,
  PackageCheck,
  Send,
  AlertTriangle,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Warehouse as WarehouseIcon,
  Ban,
} from 'lucide-react';


/**
 * Cola Operativa de Despachos del Vendedor (SellerFulfillmentsPage - Frontend-Role-Modules §2.3).
 * Split-Frame Asimétrico (65% Cola de Despachos / 35% Estación de Empaque y Reporte de Quiebre).
 *
 * Invariante de Seguridad Estricta:
 * El vendedor puede empacar (pack), despachar (dispatch) o reportar quiebre (cancel-ghost-stock).
 * La certificación de entrega (deliver) está estrictamente oculta y reservada al Operador Logístico.
 */
export function SellerFulfillmentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | FulfillmentStatus>('All');
  const [selectedFulfillmentId, setSelectedFulfillmentId] = useState<string | null>(null);

  // Modal / Formulario Cancel Ghost Stock
  const [showGhostModal, setShowGhostModal] = useState(false);
  const [ghostVariantId, setGhostVariantId] = useState('');
  const [ghostWarehouseId, setGhostWarehouseId] = useState('');
  const [ghostQuantity, setGhostQuantity] = useState<number>(1);
  const [ghostError, setGhostError] = useState<string | null>(null);
  const [ghostSuccess, setGhostSuccess] = useState<string | null>(null);

  const {
    data: fulfillments,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useFulfillmentsQuery();

  const { data: warehouses } = useWarehousesQuery();
  const packMutation = usePackFulfillmentMutation();
  const dispatchMutation = useDispatchFulfillmentMutation();
  const cancelGhostStockMutation = useCancelGhostStockMutation();

  const allFulfillments = fulfillments ?? [];
  const allWarehouses = warehouses ?? [];

  const warehouseMap = new Map<string, Warehouse>(allWarehouses.map((w: Warehouse) => [w.id, w]));

  const filteredFulfillments = allFulfillments.filter((f: FulfillmentOrder) => {
    const matchesSearch =
      !searchTerm.trim() ||
      f.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.customerOrderId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All' || f.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const selectedFulfillment =
    allFulfillments.find((f: FulfillmentOrder) => f.id === selectedFulfillmentId) ??
    filteredFulfillments[0] ??
    null;

  const currentId = selectedFulfillment?.id;

  const handlePack = async (id: string) => {
    try {
      await packMutation.mutateAsync(id);
    } catch {
      // Error manejado en query client / ui
    }
  };

  const handleDispatch = async (id: string) => {
    try {
      await dispatchMutation.mutateAsync(id);
    } catch {
      // Error manejado en query client / ui
    }
  };

  const handleCancelGhostStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFulfillment) return;

    setGhostError(null);
    setGhostSuccess(null);

    if (!ghostVariantId.trim()) {
      setGhostError('Debe especificar la variante que presenta quiebre de stock.');
      return;
    }

    if (!ghostWarehouseId.trim()) {
      setGhostError('Debe especificar la bodega física del quiebre.');
      return;
    }

    if (ghostQuantity <= 0) {
      setGhostError('La cantidad a cancelar debe ser mayor que cero.');
      return;
    }

    try {
      await cancelGhostStockMutation.mutateAsync({
        fulfillmentOrderId: selectedFulfillment.id,
        variantId: ghostVariantId.trim(),
        warehouseId: ghostWarehouseId.trim(),
        quantityToCancel: ghostQuantity,
      });

      setGhostSuccess('Quiebre de stock fantasma reportado y orden cancelada.');
      setShowGhostModal(false);
      setGhostQuantity(1);
      setGhostVariantId('');
    } catch (err) {
      setGhostError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al reportar el quiebre por stock fantasma.'
      );
    }
  };

  if (isLoading) {
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

  if (isError) {
    return (
      <div className="space-y-6 p-6 sm:p-10 max-w-4xl mx-auto w-full">
        <Alert variant="destructive" className="border-red-900 bg-red-950/40 text-red-200">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <AlertTitle>Error al cargar despachos</AlertTitle>
          <AlertDescription>
            {error instanceof Error
              ? error.message
              : 'Ocurrió un error al consultar las órdenes de despacho logístico.'}
          </AlertDescription>
        </Alert>
        <Button
          onClick={() => refetch()}
          variant="outline"
          className="border-[#1F293D] text-white hover:bg-[#1F293D]"
        >
          <RefreshCw className="h-4 w-4 mr-2" /> Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full">
      {/* ── Encabezado de Despachos ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#1F293D]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
              Cola de Despachos Propios
            </h1>
            <Badge variant="outline" className="border-[#1F293D] text-[#00D4AA] font-mono text-xs">
              {allFulfillments.length} Envíos
            </Badge>
          </div>
          <p className="text-sm text-[#94A3B8]">
            Gestión de empaque y entrega a transporte logístico. Entrega final reservada al operador.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="border-[#1F293D] text-[#94A3B8] hover:text-white"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Refrescar
        </Button>
      </div>

      {ghostSuccess && (
        <Alert className="border-[#00D4AA]/40 bg-[#00D4AA]/10 text-[#00D4AA]">
          <CheckCircle2 className="h-4 w-4 text-[#00D4AA]" />
          <AlertDescription className="text-xs">{ghostSuccess}</AlertDescription>
        </Alert>
      )}

      {/* ── Composición Asimétrica Split-Frame (65% / 35%) ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Lado Izquierdo (65%): Lista de Despachos ───────────────────── */}
        <section className="lg:col-span-8 space-y-6">
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B]" />
              <Input
                type="text"
                placeholder="Buscar por ID de despacho o pedido..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-[#111827] border-[#1F293D] text-white placeholder:text-[#64748B] focus:border-[#00D4AA]"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'All' | FulfillmentStatus)}
              aria-label="Filtrar por estado de despacho"
              className="bg-[#111827] border border-[#1F293D] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#00D4AA]"
            >
              <option value="All">Todos los estados</option>
              {Object.values(FulfillmentStatus).map((status) => (
                <option key={status} value={status}>
                  {NOMBRES_DE_ESTADO_DE_DESPACHO[status]}
                </option>
              ))}
            </select>
          </div>

          {filteredFulfillments.length === 0 ? (
            <StateView
              state="empty"
              title="No hay despachos en cola"
              description={
                searchTerm || statusFilter !== 'All'
                  ? 'No hay despachos que coincidan con los filtros aplicados.'
                  : 'No tienes órdenes de despacho activas en este momento.'
              }
            />
          ) : (

            <div className="space-y-3">
              {filteredFulfillments.map((f: FulfillmentOrder) => {
                const isSelected = f.id === currentId;

                return (
                  <div
                    key={f.id}
                    onClick={() => setSelectedFulfillmentId(f.id)}
                    className={`rounded-2xl border p-5 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#00D4AA] bg-[#161F30] shadow-lg shadow-[#00D4AA]/5'
                        : 'border-[#1F293D] bg-[#111827] hover:border-[#1F293D]/80 hover:bg-[#161F30]/40'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-white">
                            Despacho #{f.id.substring(0, 8)}
                          </span>
                          <StatusBadge tone={TONOS_DE_ESTADO_DE_DESPACHO[f.status]}>
                            {NOMBRES_DE_ESTADO_DE_DESPACHO[f.status]}
                          </StatusBadge>
                        </div>
                        <div className="text-xs text-[#94A3B8] font-mono">
                          Pedido: #{f.customerOrderId.substring(0, 8)} • Creado:{' '}
                          {new Date(f.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3">
                        <div className="text-right text-xs text-[#94A3B8]">
                          {f.shipments?.length ?? 0} paquetes
                        </div>
                        <ChevronRight
                          className={`h-5 w-5 ${isSelected ? 'text-[#00D4AA]' : 'text-[#64748B]'}`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Lado Derecho (35%): Estación de Operación Logística ───────── */}
        <aside className="lg:col-span-4 space-y-6">
          {selectedFulfillment ? (
            <div className="rounded-2xl border border-[#1F293D] bg-[#111827] p-6 space-y-6">
              <div className="space-y-1 pb-4 border-b border-[#1F293D]">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-white font-sans">
                    Operación de Despacho
                  </h2>
                  <StatusBadge tone={TONOS_DE_ESTADO_DE_DESPACHO[selectedFulfillment.status]}>
                    {NOMBRES_DE_ESTADO_DE_DESPACHO[selectedFulfillment.status]}
                  </StatusBadge>
                </div>
                <p className="font-mono text-xs text-[#00D4AA] truncate">
                  ID: {selectedFulfillment.id}
                </p>
                <p className="text-[11px] text-[#64748B]">
                  Pedido Asociado: {selectedFulfillment.customerOrderId}
                </p>
              </div>

              {/* Guías y Paquetes de Envío */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
                  Guías de Transporte
                </h3>
                {(!selectedFulfillment.shipments || selectedFulfillment.shipments.length === 0) ? (
                  <p className="text-xs text-[#64748B] italic">
                    Sin guías de transporte asociadas aún.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedFulfillment.shipments.map((s: Shipment) => {
                      const warehouse = warehouseMap.get(s.warehouseId);

                      return (
                        <div
                          key={s.id}
                          className="rounded-xl border border-[#1F293D] bg-[#161F30]/60 p-3 space-y-1 text-xs"
                        >
                          <div className="font-mono font-semibold text-white">
                            Guía: {s.trackingNumber}
                          </div>
                          <div className="text-[11px] text-[#94A3B8] flex items-center gap-1">
                            <WarehouseIcon className="h-3 w-3" />
                            {warehouse?.location ?? s.warehouseId}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Acciones Operativas según Estado */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
                  Transición de Estado
                </h3>

                {selectedFulfillment.status === FulfillmentStatus.PendingPack && (
                  <Button
                    onClick={() => handlePack(selectedFulfillment.id)}
                    disabled={packMutation.isPending}
                    className="w-full bg-[#00D4AA] text-[#0B0F19] hover:bg-[#00D4AA]/90 font-semibold"
                  >
                    {packMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <PackageCheck className="h-4 w-4 mr-2" />
                    )}
                    Registrar Empaque (Packed)
                  </Button>
                )}

                {selectedFulfillment.status === FulfillmentStatus.Packed && (
                  <Button
                    onClick={() => handleDispatch(selectedFulfillment.id)}
                    disabled={dispatchMutation.isPending}
                    className="w-full bg-[#00D4AA] text-[#0B0F19] hover:bg-[#00D4AA]/90 font-semibold"
                  >
                    {dispatchMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Despachar Paquete (Dispatched)
                  </Button>
                )}

                {selectedFulfillment.status === FulfillmentStatus.Dispatched && (
                  <div className="rounded-xl border border-[#1F293D] bg-[#161F30]/40 p-4 text-center space-y-2">
                    <Truck className="h-6 w-6 text-[#00D4AA] mx-auto animate-pulse" />
                    <p className="text-xs font-medium text-white">
                      En Tránsito hacia el Comprador
                    </p>
                    <p className="text-[11px] text-[#94A3B8]">
                      La certificación de entrega final (Delivered) corresponde exclusivamente al
                      Operador Logístico (AuthorizationPolicies).
                    </p>
                  </div>
                )}

                {selectedFulfillment.status === FulfillmentStatus.Delivered && (
                  <div className="rounded-xl border border-[#00D4AA]/30 bg-[#00D4AA]/10 p-4 text-center space-y-1">
                    <CheckCircle2 className="h-6 w-6 text-[#00D4AA] mx-auto" />
                    <p className="text-xs font-semibold text-[#00D4AA]">
                      Entrega Certificada
                    </p>
                    <p className="text-[11px] text-[#94A3B8]">
                      El comprador ha recibido satisfactoriamente este envío.
                    </p>
                  </div>
                )}

                {selectedFulfillment.status === FulfillmentStatus.Cancelled && (
                  <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-4 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-red-400">
                      <Ban className="h-4 w-4" /> Despacho Cancelado
                    </div>
                    {selectedFulfillment.cancellationReason && (
                      <p className="text-[11px] text-[#94A3B8]">
                        Motivo: {selectedFulfillment.cancellationReason}
                      </p>
                    )}
                  </div>
                )}

                {/* Reportar Quiebre de Stock Fantasma (ADR-0014) */}
                {selectedFulfillment.status !== FulfillmentStatus.Delivered &&
                  selectedFulfillment.status !== FulfillmentStatus.Cancelled && (
                    <Button
                      variant="outline"
                      onClick={() => setShowGhostModal(true)}
                      className="w-full border-red-900/50 text-red-400 hover:bg-red-950/40 hover:text-red-300 text-xs"
                    >
                      <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                      Reportar Quiebre de Stock Fantasma
                    </Button>
                  )}
              </div>

              {/* Formulario / Modal para CancelGhostStock */}
              {showGhostModal && (
                <div className="rounded-xl border border-red-900/60 bg-red-950/30 p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-red-400 uppercase tracking-wider">
                      Reporte de Stock Fantasma
                    </span>
                    <button
                      onClick={() => setShowGhostModal(false)}
                      className="text-xs text-[#94A3B8] hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                    Advierte que no existen unidades físicas disponibles en la bodega. Esto cancelará
                    el despacho y devolverá el saldo al comprador (ADR-0014/ADR-0022).
                  </p>

                  {ghostError && (
                    <p className="text-xs text-red-300 font-medium">{ghostError}</p>
                  )}

                  <form onSubmit={handleCancelGhostStock} noValidate className="space-y-3">
                    <div>
                      <label className="text-[11px] text-[#E2E8F0] block mb-1">
                        ID de Variante
                      </label>
                      <Input
                        type="text"
                        placeholder="UUID de la variante"
                        value={ghostVariantId}
                        onChange={(e) => setGhostVariantId(e.target.value)}
                        className="bg-[#111827] border-red-900/60 text-white font-mono text-xs focus:border-red-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-[#E2E8F0] block mb-1">
                        Bodega del Quiebre
                      </label>
                      <select
                        value={ghostWarehouseId}
                        onChange={(e) => setGhostWarehouseId(e.target.value)}
                        aria-label="Seleccionar bodega física del quiebre"
                        className="w-full bg-[#111827] border border-red-900/60 text-white text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-red-500"
                      >
                        <option value="">-- Seleccionar Bodega --</option>
                        {allWarehouses.map((w: Warehouse) => (
                          <option key={w.id} value={w.id}>
                            {w.location}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-[#E2E8F0] block mb-1">
                        Cantidad Faltante
                      </label>
                      <Input
                        type="number"
                        min={1}
                        value={ghostQuantity}
                        onChange={(e) =>
                          setGhostQuantity(parseInt(e.target.value, 10) || 0)
                        }
                        className="bg-[#111827] border-red-900/60 text-white font-mono text-xs focus:border-red-500"
                      />
                    </div>

                    <div className="flex gap-2 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowGhostModal(false)}
                        className="flex-1 border-[#1F293D] text-[#94A3B8] text-xs"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        disabled={cancelGhostStockMutation.isPending}
                        size="sm"
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
                      >
                        {cancelGhostStockMutation.isPending ? 'Confirmando...' : 'Confirmar Quiebre'}
                      </Button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-[#1F293D] bg-[#111827] p-8 text-center text-sm text-[#64748B]">
              Selecciona un despacho para operar o verificar su estado.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
