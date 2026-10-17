import { useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  XCircle,
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
import { useReturnQuery, useReturnsQuery } from '../../application/services';
import type { ReturnRequest } from '../../domain';
import { ReturnStatus } from '../../domain';

/**
 * Fiscalización de Solicitudes de Devolución (/supervisor/returns).
 *
 * Frontend-Role-Modules.md §2.6:
 * Consume `GET /api/returns` y `GET /api/returns/{id}` en modo de sólo lectura.
 * Audita dictámenes técnicos de inspección física (`isGoodCondition`) y
 * resoluciones comerciales/financieras (`Approved`, `Rejected`, `Refunded`).
 * Cero botones de inspección, aprobación, rechazo o reembolso.
 */
export function SupervisorReturnsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReturnId, setSelectedReturnId] = useState<string>('');

  const parsedStatus = statusFilter === 'All' ? undefined : (statusFilter as ReturnStatus);

  const {
    data: returns = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useReturnsQuery(parsedStatus);

  const { data: detailedReturn } = useReturnQuery(selectedReturnId);

  const filteredReturns = returns.filter((ret: ReturnRequest) => {
    const matchesSearch =
      !searchTerm.trim() ||
      ret.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ret.customerOrderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ret.variantId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ret.warehouseId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All' || ret.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const activeReturn: ReturnRequest | null =
    detailedReturn ??
    returns.find((r: ReturnRequest) => r.id === selectedReturnId) ??
    filteredReturns[0] ??
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
          <AlertTitle>Error al cargar expedientes de devolución</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Ocurrió un error inesperado al consultar las devoluciones.'}
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
              Fiscalización de Devoluciones e Inspecciones
            </h1>
            <Badge variant="outline" className="border-[#1F293D] text-[#00D4AA] font-mono text-xs">
              {returns.length} Solicitudes
            </Badge>
            <Badge variant="outline" className="border-[#1F293D] text-[#FFB800] font-mono text-xs">
              Sólo Lectura
            </Badge>
          </div>
          <p className="text-sm text-[#94A3B8]">
            Auditoría de solicitudes de devolución física, dictámenes de recepción en bodega y resoluciones comerciales.
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
        {/* Lado Izquierdo (65%): Bandeja de Devoluciones ────────────────── */}
        <section className="lg:col-span-8 space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B]" />
              <Input
                type="text"
                placeholder="Buscar por ID de devolución, pedido, variante o bodega..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-[#111827] border-[#1F293D] text-white placeholder:text-[#64748B] focus:border-[#00D4AA]"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filtrar por estado de devolución"
              className="bg-[#111827] border border-[#1F293D] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#00D4AA]"
            >
              <option value="All">Todas las Devoluciones</option>
              <option value={ReturnStatus.Requested}>Solicitadas / En Inspección (Requested)</option>
              <option value={ReturnStatus.Approved}>Aprobadas por Vendedor (Approved)</option>
              <option value={ReturnStatus.Rejected}>Rechazadas (Rejected)</option>
              <option value={ReturnStatus.Refunded}>Reembolsadas (Refunded)</option>
            </select>
          </div>

          {filteredReturns.length === 0 ? (
            <div className="rounded-2xl border border-[#1F293D] bg-[#111827] p-12 text-center">
              <RotateCcw className="h-10 w-10 text-[#64748B] mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-white">No se encontraron devoluciones</h3>
              <p className="text-xs text-[#94A3B8] mt-1">
                No existen expedientes de devolución para el filtro o búsqueda seleccionados.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#1F293D] bg-[#111827] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#1F293D] text-[#94A3B8] uppercase tracking-wider font-sans bg-[#161F30]/40">
                      <th className="py-3 px-4">Devolución</th>
                      <th className="py-3 px-4">Pedido</th>
                      <th className="py-3 px-4 text-right">Cantidad</th>
                      <th className="py-3 px-4">Dictamen Físico</th>
                      <th className="py-3 px-4">Resolución</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F293D]/60">
                    {filteredReturns.map((ret: ReturnRequest) => {
                      const isSelected = activeReturn?.id === ret.id;
                      return (
                        <tr
                          key={ret.id}
                          onClick={() => setSelectedReturnId(ret.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-[#161F30]' : 'hover:bg-[#161F30]/40'
                          }`}
                        >
                          <td className="py-4 px-4 font-mono font-semibold text-white">
                            #{ret.id.substring(0, 8)}
                          </td>
                          <td className="py-4 px-4 font-mono text-[#E2E8F0]">
                            #{ret.customerOrderId.substring(0, 8)}
                          </td>
                          <td className="py-4 px-4 text-right font-mono font-semibold text-white tabular-nums">
                            {ret.quantity}
                          </td>
                          <td className="py-4 px-4">
                            {ret.isGoodCondition ? (
                              <Badge
                                variant="outline"
                                className="border-[#00D4AA]/40 text-[#00D4AA] text-[10px] font-mono"
                              >
                                Intacto (OK)
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="border-red-900/60 text-red-400 text-[10px] font-mono"
                              >
                                Dañado / No Apto
                              </Badge>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <Badge
                              variant="outline"
                              className="border-[#1F293D] text-[#E2E8F0] text-[11px] font-mono"
                            >
                              {ret.status}
                            </Badge>
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

        {/* Lado Derecho (35%): Expediente Técnico de Devolución ─────────── */}
        <section className="lg:col-span-4 space-y-6">
          {activeReturn ? (
            <div className="rounded-2xl border border-[#1F293D] bg-[#111827] p-6 space-y-5">
              <div className="border-b border-[#1F293D] pb-4">
                <span className="text-[11px] font-mono text-[#64748B] block uppercase">
                  Expediente de Devolución
                </span>
                <h3 className="text-lg font-bold text-white font-mono mt-1">
                  #{activeReturn.id.substring(0, 8)}
                </h3>
                <Badge
                  variant="outline"
                  className="mt-2 border-[#00D4AA]/40 text-[#00D4AA] font-mono text-xs"
                >
                  Estado: {activeReturn.status}
                </Badge>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-[#94A3B8] font-sans">Pedido Asociado:</span>
                  <span className="text-white">#{activeReturn.customerOrderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94A3B8] font-sans">Variante / SKU:</span>
                  <span className="text-[#00D4AA]">#{activeReturn.variantId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94A3B8] font-sans">Bodega Receptora:</span>
                  <span className="text-white">#{activeReturn.warehouseId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94A3B8] font-sans">Unidades Devueltas:</span>
                  <span className="text-white font-bold tabular-nums">
                    {activeReturn.quantity} unidades
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#161F30] border border-[#1F293D] space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#94A3B8]">Inspección Física (Bodega):</span>
                  <span className="font-mono font-semibold text-white flex items-center gap-1">
                    {activeReturn.isGoodCondition ? (
                      <>
                        <CheckCircle className="h-3.5 w-3.5 text-[#00D4AA]" />
                        Apto (Reingreso Usado)
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3.5 w-3.5 text-red-400" />
                        No Apto / Dañado
                      </>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#94A3B8]">Aprobación Vendedor:</span>
                  <span className="font-mono text-white">
                    {activeReturn.vendorApproved ? 'Aprobada' : 'Pendiente / Rechazada'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#1F293D] bg-[#111827] p-8 text-center text-xs text-[#94A3B8]">
              Seleccione una devolución de la tabla para auditar su dictamen técnico y estado de reembolso.
            </div>
          )}

          <div className="rounded-2xl border border-[#1F293D] bg-[#111827] p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#00D4AA]">
              <ShieldCheck className="h-4 w-4" />
              <span>Política ReturnRead (ADR-0006 y ADR-0018)</span>
            </div>
            <p className="text-[11px] text-[#94A3B8] leading-relaxed">
              El Supervisor verifica la coherencia entre el dictamen físico del Operador Logístico, la decisión comercial del Vendedor y el desembolso final del Administrador sin alterar los estados.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
