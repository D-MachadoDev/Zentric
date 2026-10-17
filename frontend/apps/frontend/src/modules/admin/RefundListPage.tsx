import { useState } from 'react';
import {
  RotateCcw,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Search,
  DollarSign,
  ShieldCheck,
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
  useRefundReturnMutation,
} from '../../application/services';
import type { ReturnRequest } from '../../domain';
import { ReturnStatus } from '../../domain';

export function RefundListPage() {
  const [statusFilter, setStatusFilter] = useState<string>(ReturnStatus.Approved);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReturnId, setSelectedReturnId] = useState<string | null>(null);
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

  const refundMutation = useRefundReturnMutation();

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

  const handleRefund = async (id: string) => {
    setActionError(null);
    setActionSuccess(null);

    try {
      await refundMutation.mutateAsync(id);
      setActionSuccess('Reembolso financiero acreditado exitosamente al comprador.');
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Error al procesar el desembolso de reembolso.'
      );
    }
  };

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
          <AlertTitle>Error al cargar devoluciones</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Ocurrió un error inesperado.'}
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
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
              Reembolsos y Liquidación de Devoluciones
            </h1>
            <Badge variant="outline" className="border-border text-brand font-mono text-xs">
              {returns.length} Casos
            </Badge>
          </div>
          <p className="text-sm text-foreground-muted">
            Acreditación financiera de fondos al comprador tras la aprobación comercial del vendedor titular.
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

      {/* ── Feedback ────────────────────────────────────────────────────── */}
      {actionSuccess && (
        <Alert className="border-brand/40 bg-brand/10 text-brand">
          <CheckCircle className="h-4 w-4 text-brand" />
          <AlertTitle>Reembolso Liquidado</AlertTitle>
          <AlertDescription className="text-xs">{actionSuccess}</AlertDescription>
        </Alert>
      )}

      {actionError && (
        <Alert variant="destructive" className="border-red-900 bg-red-950/40 text-red-200">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertTitle>Error en Liquidación</AlertTitle>
          <AlertDescription className="text-xs">{actionError}</AlertDescription>
        </Alert>
      )}

      {/* ── Split-Frame (65% / 35%) ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Lado Izquierdo (65%): Bandeja de Devoluciones ────────────────── */}
        <section className="lg:col-span-8 space-y-6">
          {/* Controles de Búsqueda y Pestañas de Estado */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
              <Input
                type="text"
                placeholder="Buscar por ID de devolución, pedido o variante..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-surface border-border text-foreground placeholder:text-foreground-muted focus:border-brand"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filtrar por estado de devolución"
              className="bg-surface border border-border text-foreground text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-brand"
            >
              <option value={ReturnStatus.Approved}>Pendientes de Reembolso (Aprobadas)</option>
              <option value={ReturnStatus.Refunded}>Reembolsadas</option>
              <option value={ReturnStatus.Requested}>En Inspección</option>
              <option value={ReturnStatus.Rejected}>Rechazadas</option>
              <option value="All">Todas las Devoluciones</option>
            </select>
          </div>

          {filteredReturns.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface p-12 text-center">
              <RotateCcw className="h-10 w-10 text-foreground-muted mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-foreground">No hay devoluciones en este estado</h3>
              <p className="text-xs text-foreground-muted mt-1">
                Todas las solicitudes aprobadas han sido reembolsadas o no coinciden con los filtros.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-surface overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-foreground-muted uppercase tracking-wider font-sans bg-surface-muted/40">
                      <th className="py-3 px-4">Devolución</th>
                      <th className="py-3 px-4">Pedido Original</th>
                      <th className="py-3 px-4 text-right">Cantidad</th>
                      <th className="py-3 px-4">Dictamen Físico</th>
                      <th className="py-3 px-4">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredReturns.map((ret: ReturnRequest) => {
                      const isSelected = selectedReturn?.id === ret.id;
                      return (
                        <tr
                          key={ret.id}
                          onClick={() => setSelectedReturnId(ret.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-surface-muted border-l-2 border-l-brand'
                              : 'hover:bg-surface-muted/40'
                          }`}
                        >
                          <td className="py-4 px-4 font-mono text-foreground">
                            #{ret.id.substring(0, 8)}
                          </td>
                          <td className="py-4 px-4 font-mono text-border">
                            #{ret.customerOrderId.substring(0, 8)}
                          </td>
                          <td className="py-4 px-4 text-right font-mono font-semibold text-foreground tabular-nums">
                            {ret.quantity}
                          </td>
                          <td className="py-4 px-4">
                            {ret.isGoodCondition === true ? (
                              <Badge variant="outline" className="border-brand/40 text-brand text-[10px]">
                                Intacto (OK)
                              </Badge>
                            ) : ret.isGoodCondition === false ? (
                              <Badge variant="outline" className="border-red-900/60 text-red-400 text-[10px]">
                                Dañado
                              </Badge>
                            ) : (
                              <span className="text-[11px] text-foreground-muted">Pendiente</span>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <Badge
                              variant="outline"
                              className="border-border text-foreground-muted text-[11px]"
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

        {/* Lado Derecho (35%): Panel de Liquidación y Desembolso ────────── */}
        <section className="lg:col-span-4 space-y-6">
          {selectedReturn ? (
            <div className="rounded-2xl border border-border bg-surface p-6 space-y-6">
              <div className="border-b border-border pb-4">
                <span className="text-[11px] font-mono text-foreground-muted block">
                  EXPEDIENTE DE REEMBOLSO
                </span>
                <h3 className="text-lg font-bold text-foreground mt-1">
                  Devolución #{selectedReturn.id.substring(0, 8)}
                </h3>
                <span className="text-xs font-mono text-brand">
                  Estado: {selectedReturn.status}
                </span>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div>
                  <span className="text-foreground-muted block text-[11px] font-sans">
                    Pedido Asociado
                  </span>
                  <span className="text-foreground">#{selectedReturn.customerOrderId}</span>
                </div>

                <div>
                  <span className="text-foreground-muted block text-[11px] font-sans">
                    Variante / SKU
                  </span>
                  <span className="text-brand">#{selectedReturn.variantId}</span>
                </div>

                <div>
                  <span className="text-foreground-muted block text-[11px] font-sans">
                    Cantidad a Reembolsar
                  </span>
                  <span className="text-foreground font-bold tabular-nums">
                    {selectedReturn.quantity} unidades
                  </span>
                </div>

                <div>
                  <span className="text-foreground-muted block text-[11px] font-sans">
                    Veredicto Físico de Recepción
                  </span>
                  <span className="text-foreground font-sans">
                    {selectedReturn.isGoodCondition ? 'Aceptado en buen estado' : 'Dañado / No conforme'}
                  </span>
                </div>

                <div>
                  <span className="text-foreground-muted block text-[11px] font-sans">
                    Aprobación Comercial del Vendedor
                  </span>
                  <span className="text-foreground font-sans">
                    {selectedReturn.vendorApproved ? 'Aprobado por el dueño' : 'Pendiente / Rechazado'}
                  </span>
                </div>
              </div>

              {/* Botón Destructivo de Reembolso */}
              <div className="pt-2 border-t border-border">
                {selectedReturn.status === ReturnStatus.Approved ? (
                  <Button
                    onClick={() => handleRefund(selectedReturn.id)}
                    disabled={refundMutation.isPending}
                    className="w-full bg-brand text-primary-foreground hover:bg-brand/90 font-bold text-xs"
                  >
                    <DollarSign className="h-4 w-4 mr-1.5" />
                    {refundMutation.isPending ? 'Liquidando Reembolso...' : 'Acreditar Reembolso'}
                  </Button>
                ) : selectedReturn.status === ReturnStatus.Refunded ? (
                  <div className="p-3 rounded-xl bg-brand/10 border border-brand/30 text-center text-xs text-brand font-semibold flex items-center justify-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Reembolso Acreditado al Comprador
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-surface-muted border border-border text-center text-xs text-foreground-muted">
                    No elegible para desembolso directo. Requiere aprobación comercial previa.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-surface p-8 text-center text-xs text-foreground-muted">
              Seleccione una devolución de la lista para gestionar su reembolso.
            </div>
          )}

          <div className="rounded-2xl border border-border bg-surface p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-brand">
              <ShieldCheck className="h-4 w-4" />
              <span>Gobernanza Financiera (ADR-0006)</span>
            </div>
            <p className="text-[11px] text-foreground-muted leading-relaxed">
              El desembolso financiero sólo puede ser ejecutado por el Administrador una vez que el vendedor titular emitió su aprobación formal, protegiendo los balances de liquidación comercial.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
