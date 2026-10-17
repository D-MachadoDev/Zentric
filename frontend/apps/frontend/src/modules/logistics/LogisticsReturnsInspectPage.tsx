import { useState } from 'react';
import {
  ClipboardCheck,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  ShieldCheck,
  Check,
  X,
} from 'lucide-react';
import {
  Button,
  Badge,
  Input,
  Skeleton,
  Alert,
  AlertTitle,
  AlertDescription,
} from '@zentric/ui';
import {
  useReturnsQuery,
  useInspectReturnMutation,
} from '../../application/services';
import type { ReturnRequest } from '../../domain';
import { ReturnStatus } from '../../domain';

export function LogisticsReturnsInspectPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(ReturnStatus.Requested);
  const [selectedReturnId, setSelectedReturnId] = useState<string | null>(null);
  const [isGoodCondition, setIsGoodCondition] = useState<boolean>(true);

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const parsedStatus = statusFilter === 'All' ? undefined : (statusFilter as ReturnStatus);

  const {
    data: returns = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useReturnsQuery(parsedStatus);

  const inspectMutation = useInspectReturnMutation();

  const filteredReturns = returns.filter((ret: ReturnRequest) => {
    const matchesSearch =
      !searchTerm.trim() ||
      ret.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ret.customerOrderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ret.variantId.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const selectedReturn =
    returns.find((r: ReturnRequest) => r.id === selectedReturnId) ??
    filteredReturns[0] ??
    null;

  const handleInspectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReturn) return;

    setActionError(null);
    setActionSuccess(null);

    try {
      await inspectMutation.mutateAsync({
        id: selectedReturn.id,
        input: { isGoodCondition },
      });
      setActionSuccess(
        `Dictamen técnico (${isGoodCondition ? 'Favorable' : 'Desfavorable'}) registrado exitosamente.`
      );
      refetch();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Error al registrar la inspección física.'
      );
    }
  };

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
          <AlertTitle>Error al cargar devoluciones</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Ocurrió un error inesperado.'}
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
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
              Estación de Inspección Técnica de Devoluciones
            </h1>
            <Badge variant="outline" className="border-[#1F293D] text-[#00D4AA] font-mono text-xs">
              ADR-0018
            </Badge>
          </div>
          <p className="text-sm text-[#94A3B8]">
            Verificación física del estado del producto devuelto en bodega antes de la resolución comercial del vendedor.
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

      {/* ── Feedback ────────────────────────────────────────────────────── */}
      {actionSuccess && (
        <Alert className="border-[#00D4AA]/40 bg-[#00D4AA]/10 text-[#00D4AA]">
          <CheckCircle className="h-4 w-4 text-[#00D4AA]" />
          <AlertTitle>Dictamen Registrado</AlertTitle>
          <AlertDescription className="text-xs">{actionSuccess}</AlertDescription>
        </Alert>
      )}

      {actionError && (
        <Alert variant="destructive" className="border-red-900 bg-red-950/40 text-red-200">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertTitle>Error Operativo</AlertTitle>
          <AlertDescription className="text-xs">{actionError}</AlertDescription>
        </Alert>
      )}

      {/* ── Split-Frame (65% / 35%) ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Lado Izquierdo (65%): Bandeja de Devoluciones a Inspeccionar ──── */}
        <section className="lg:col-span-8 space-y-6">
          {/* Controles de Búsqueda y Filtro de Estado */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B]" />
              <Input
                type="text"
                placeholder="Buscar por ID devolución, pedido o variante..."
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
              <option value={ReturnStatus.Requested}>Pendientes de Dictamen (Requested)</option>
              <option value={ReturnStatus.Approved}>Aprobadas Comercial</option>
              <option value={ReturnStatus.Rejected}>Rechazadas</option>
              <option value={ReturnStatus.Refunded}>Reembolsadas</option>
              <option value="All">Todas las Devoluciones</option>
            </select>
          </div>

          {filteredReturns.length === 0 ? (
            <div className="rounded-2xl border border-[#1F293D] bg-[#111827] p-12 text-center">
              <ClipboardCheck className="h-10 w-10 text-[#64748B] mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-white">No hay devoluciones para inspeccionar</h3>
              <p className="text-xs text-[#94A3B8] mt-1">
                Todas las devoluciones recibidas en bodega cuentan con dictamen técnico físico.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#1F293D] bg-[#111827] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#1F293D] text-[#94A3B8] uppercase tracking-wider font-sans bg-[#161F30]/40">
                      <th className="py-3 px-4">Devolución</th>
                      <th className="py-3 px-4">Pedido Original</th>
                      <th className="py-3 px-4 text-right">Cantidad</th>
                      <th className="py-3 px-4">Dictamen Técnico</th>
                      <th className="py-3 px-4">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F293D]/60">
                    {filteredReturns.map((ret: ReturnRequest) => {
                      const isSelected = selectedReturn?.id === ret.id;
                      return (
                        <tr
                          key={ret.id}
                          onClick={() => setSelectedReturnId(ret.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-[#161F30] border-l-2 border-l-[#00D4AA]'
                              : 'hover:bg-[#161F30]/40'
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
                            {ret.isGoodCondition === true ? (
                              <Badge variant="outline" className="border-[#00D4AA]/40 text-[#00D4AA] text-[10px]">
                                Intacto (OK)
                              </Badge>
                            ) : ret.isGoodCondition === false ? (
                              <Badge variant="outline" className="border-red-900/60 text-red-400 text-[10px]">
                                Dañado
                              </Badge>
                            ) : (
                              <span className="text-[11px] text-[#FFB800] font-mono">Por Inspeccionar</span>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <Badge
                              variant="outline"
                              className="border-[#1F293D] text-[#94A3B8] text-[11px]"
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

        {/* Lado Derecho (35%): Panel de Dictamen Físico ──────────────────── */}
        <section className="lg:col-span-4 space-y-6">
          {selectedReturn ? (
            <div className="rounded-2xl border border-[#1F293D] bg-[#111827] p-6 space-y-5">
              <div className="border-b border-[#1F293D] pb-3">
                <span className="text-[11px] font-mono text-[#64748B] block">
                  EXPEDIENTE DE RECEPCIÓN
                </span>
                <h3 className="text-base font-bold text-white mt-1">
                  Devolución #{selectedReturn.id.substring(0, 8)}
                </h3>
              </div>

              <div className="space-y-2.5 text-xs font-mono">
                <div>
                  <span className="text-[#94A3B8] block text-[11px] font-sans">Pedido:</span>
                  <span className="text-white">#{selectedReturn.customerOrderId}</span>
                </div>
                <div>
                  <span className="text-[#94A3B8] block text-[11px] font-sans">Variante:</span>
                  <span className="text-[#00D4AA]">#{selectedReturn.variantId}</span>
                </div>
                <div>
                  <span className="text-[#94A3B8] block text-[11px] font-sans">Unidades Recibidas:</span>
                  <span className="text-white font-bold tabular-nums">
                    {selectedReturn.quantity} unidades
                  </span>
                </div>
              </div>

              {/* Formulario de Dictamen */}
              <form onSubmit={handleInspectSubmit} className="space-y-4 pt-2 border-t border-[#1F293D]">
                <label className="text-xs font-semibold text-[#E2E8F0] block">
                  Dictamen Físico de Recepción en Bodega
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIsGoodCondition(true)}
                    className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-colors ${
                      isGoodCondition
                        ? 'border-[#00D4AA] bg-[#00D4AA]/10 text-[#00D4AA]'
                        : 'border-[#1F293D] bg-[#161F30]/40 text-[#94A3B8] hover:border-[#94A3B8]'
                    }`}
                  >
                    <Check className="h-4 w-4" />
                    <span>Favorable (Intacto)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsGoodCondition(false)}
                    className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-colors ${
                      !isGoodCondition
                        ? 'border-red-500 bg-red-950/40 text-red-400'
                        : 'border-[#1F293D] bg-[#161F30]/40 text-[#94A3B8] hover:border-[#94A3B8]'
                    }`}
                  >
                    <X className="h-4 w-4" />
                    <span>Desfavorable (Dañado)</span>
                  </button>
                </div>

                <Button
                  type="submit"
                  disabled={inspectMutation.isPending}
                  className="w-full bg-[#00D4AA] text-[#0B0F19] hover:bg-[#00D4AA]/90 font-semibold text-xs"
                >
                  {inspectMutation.isPending ? 'Registrando...' : 'Emitir Dictamen Físico'}
                </Button>
              </form>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#1F293D] bg-[#111827] p-8 text-center text-xs text-[#94A3B8]">
              Seleccione una devolución recibida en bodega para asentar el dictamen físico.
            </div>
          )}

          <div className="rounded-2xl border border-[#1F293D] bg-[#111827] p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#00D4AA]">
              <ShieldCheck className="h-4 w-4" />
              <span>Separación de Competencias (ADR-0018)</span>
            </div>
            <p className="text-[11px] text-[#94A3B8] leading-relaxed">
              El Operador Logístico asienta únicamente la condición física (`isGoodCondition`). La decisión de aceptar o rechazar comercialmente la devolución corresponde exclusivamente al vendedor dueño de la variante (`ADR-0006`).
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
