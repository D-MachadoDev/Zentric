import { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  PackageCheck,
  RefreshCw,
  Search,
  ShieldCheck,
  Truck,
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
import { useFulfillmentsQuery } from '../../application/services';
import type { FulfillmentOrder } from '../../domain';
import { FulfillmentStatus } from '../../domain';

/**
 * Monitoreo de Despachos y Cancelaciones por Quiebre (/supervisor/fulfillments).
 *
 * Frontend-Role-Modules.md §2.6:
 * Supervisión en modo sólo lectura de todas las órdenes de fulfillment en la red
 * logística (`GET /api/logistics/fulfillments`), incluyendo guías y motivos de
 * cancelación por stock fantasma (ADR-0014 / ADR-0021). Cero botones de mutación.
 */
export function SupervisorFulfillmentsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFulfillmentId, setSelectedFulfillmentId] = useState<string | null>(null);

  const parsedStatus = statusFilter === 'All' ? undefined : (statusFilter as FulfillmentStatus);

  const {
    data: fulfillments = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useFulfillmentsQuery(parsedStatus);

  const filteredFulfillments = fulfillments.filter((ful: FulfillmentOrder) => {
    const matchesSearch =
      !searchTerm.trim() ||
      ful.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ful.customerOrderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ful.vendorId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ful.cancellationReason &&
        ful.cancellationReason.toLowerCase().includes(searchTerm.toLowerCase())) ||
      ful.shipments.some((s) =>
        s.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase())
      );

    const matchesStatus = statusFilter === 'All' || ful.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const selectedFulfillment =
    fulfillments.find((f: FulfillmentOrder) => f.id === selectedFulfillmentId) ??
    filteredFulfillments[0] ??
    null;

  if (isLoading) {
    return (
      <div className="space-y-8 p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full">
        <Skeleton className="h-10 w-64 bg-[#111827]" />
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
          <AlertTitle>Error al cargar órdenes de despacho</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Ocurrió un error inesperado al consultar la red logística.'}
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
      {/* ── Encabezado ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#1F293D]">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
              Monitoreo de Despachos y Quiebres de Stock
            </h1>
            <Badge variant="outline" className="border-[#1F293D] text-[#00D4AA] font-mono text-xs">
              {fulfillments.length} Despachos
            </Badge>
            <Badge variant="outline" className="border-[#1F293D] text-[#FFB800] font-mono text-xs">
              Sólo Lectura
            </Badge>
          </div>
          <p className="text-sm text-[#94A3B8]">
            Trazabilidad de órdenes de empaque, guías transportadoras e incidentes de cancelación por stock fantasma.
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

      {/* ── Split-Frame (65% / 35%) ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Lado Izquierdo (65%): Tabla de Despachos ─────────────────────── */}
        <section className="lg:col-span-8 space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B]" />
              <Input
                type="text"
                placeholder="Buscar por ID despacho, pedido, vendedor, guía o motivo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-[#111827] border-[#1F293D] text-white placeholder:text-[#64748B] focus:border-[#00D4AA]"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filtrar por estado de despacho"
              className="bg-[#111827] border border-[#1F293D] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#00D4AA]"
            >
              <option value="All">Todos los Estados</option>
              <option value={FulfillmentStatus.PendingPack}>Pendiente de Empaque (PendingPack)</option>
              <option value={FulfillmentStatus.Packed}>Empacado (Packed)</option>
              <option value={FulfillmentStatus.Dispatched}>Despachado (Dispatched)</option>
              <option value={FulfillmentStatus.Delivered}>Entregado (Delivered)</option>
              <option value={FulfillmentStatus.Cancelled}>Cancelado por Quiebre (Cancelled)</option>
            </select>
          </div>

          {filteredFulfillments.length === 0 ? (
            <div className="rounded-2xl border border-[#1F293D] bg-[#111827] p-12 text-center">
              <PackageCheck className="h-10 w-10 text-[#64748B] mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-white">No se encontraron despachos</h3>
              <p className="text-xs text-[#94A3B8] mt-1">
                Ninguna orden de despacho coincide con los criterios de auditoría seleccionados.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#1F293D] bg-[#111827] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#1F293D] text-[#94A3B8] uppercase tracking-wider font-sans bg-[#161F30]/40">
                      <th className="py-3 px-4">Despacho</th>
                      <th className="py-3 px-4">Pedido</th>
                      <th className="py-3 px-4">Vendedor</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4 text-right">Guías</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F293D]/60">
                    {filteredFulfillments.map((ful: FulfillmentOrder) => {
                      const isSelected = selectedFulfillment?.id === ful.id;
                      const isCancelled = ful.status === FulfillmentStatus.Cancelled;
                      return (
                        <tr
                          key={ful.id}
                          onClick={() => setSelectedFulfillmentId(ful.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-[#161F30]' : 'hover:bg-[#161F30]/40'
                          }`}
                        >
                          <td className="py-4 px-4 font-mono font-semibold text-white">
                            #{ful.id.substring(0, 8)}
                          </td>
                          <td className="py-4 px-4 font-mono text-[#E2E8F0]">
                            #{ful.customerOrderId.substring(0, 8)}
                          </td>
                          <td className="py-4 px-4 font-mono text-[#94A3B8]">
                            #{ful.vendorId.substring(0, 8)}
                          </td>
                          <td className="py-4 px-4">
                            <Badge
                              variant="outline"
                              className={
                                isCancelled
                                  ? 'border-red-900/60 text-red-400 text-[11px] font-mono'
                                  : 'border-[#1F293D] text-[#00D4AA] text-[11px] font-mono'
                              }
                            >
                              {ful.status}
                            </Badge>
                          </td>
                          <td className="py-4 px-4 text-right font-mono text-white tabular-nums">
                            {ful.shipments.length}
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

        {/* Lado Derecho (35%): Expediente de Despacho Seleccionado ──────── */}
        <section className="lg:col-span-4 space-y-6">
          {selectedFulfillment ? (
            <div className="rounded-2xl border border-[#1F293D] bg-[#111827] p-6 space-y-5">
              <div className="border-b border-[#1F293D] pb-4">
                <span className="text-[11px] font-mono text-[#64748B] block uppercase">
                  Expediente Logístico
                </span>
                <h3 className="text-lg font-bold text-white font-mono mt-1">
                  #{selectedFulfillment.id.substring(0, 8)}
                </h3>
                <Badge
                  variant="outline"
                  className="mt-2 border-[#1F293D] text-[#00D4AA] font-mono text-xs"
                >
                  Estado: {selectedFulfillment.status}
                </Badge>
              </div>

              <div className="space-y-2.5 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-[#94A3B8] font-sans">Pedido Asociado:</span>
                  <span className="text-white">#{selectedFulfillment.customerOrderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94A3B8] font-sans">Vendedor Titular:</span>
                  <span className="text-white">#{selectedFulfillment.vendorId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94A3B8] font-sans">Paquetes / Guías:</span>
                  <span className="text-white tabular-nums">
                    {selectedFulfillment.shipments.length}
                  </span>
                </div>
              </div>

              {selectedFulfillment.cancellationReason && (
                <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-900/60 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-red-400">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Incidente de Stock Fantasma</span>
                  </div>
                  <p className="text-xs font-mono text-red-200">
                    {selectedFulfillment.cancellationReason}
                  </p>
                </div>
              )}

              <div className="space-y-2 pt-2 border-t border-[#1F293D]">
                <h4 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5 text-[#00D4AA]" />
                  Guías de Transporte Registradas
                </h4>
                {selectedFulfillment.shipments.length === 0 ? (
                  <p className="text-xs text-[#64748B]">
                    Sin guías de transporte emitidas todavía.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedFulfillment.shipments.map((ship) => (
                      <div
                        key={ship.id}
                        className="p-3 rounded-xl bg-[#161F30] border border-[#1F293D] text-xs font-mono space-y-1"
                      >
                        <div className="flex justify-between">
                          <span className="text-[#94A3B8]">Guía:</span>
                          <span className="text-[#00D4AA] font-bold">{ship.trackingNumber}</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-[#64748B]">Bodega Origen:</span>
                          <span className="text-white">#{ship.warehouseId.substring(0, 8)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#1F293D] bg-[#111827] p-8 text-center text-xs text-[#94A3B8]">
              Seleccione una orden de despacho para auditar sus paquetes y guías.
            </div>
          )}

          <div className="rounded-2xl border border-[#1F293D] bg-[#111827] p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#00D4AA]">
              <ShieldCheck className="h-4 w-4" />
              <span>Política FulfillmentRead (Sólo Lectura)</span>
            </div>
            <p className="text-[11px] text-[#94A3B8] leading-relaxed">
              Las transiciones operativas de empaque, despacho, entrega y cancelación por quiebre están reservadas al Operador Logístico y al Vendedor.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
