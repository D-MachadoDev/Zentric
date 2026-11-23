import { useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Clock,
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
  StatusBadge,
  Pagination,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@zentric/ui';
import { useReturnQuery, useReturnsPagedQuery } from '../../core';
import type { ListReturnsPagedParams, ReturnRequest } from '../../core';
import { ReturnStatus } from '../../core';
import {
  NOMBRES_DE_ESTADO_DE_DEVOLUCION,
  TONOS_DE_ESTADO_DE_DEVOLUCION,
} from '../../core';

/**
 * Fiscalización de Solicitudes de Devolución (/supervisor/returns).
 *
 * Frontend-Role-Modules.md sección 2.6:
 * Consume `GET /api/returns` y `GET /api/returns/{id}` en modo de sólo lectura.
 * Audita dictámenes técnicos de inspección física (`isGoodCondition`) y
 * resoluciones comerciales/financieras (`Approved`, `Rejected`, `Refunded`).
 * Cero botones de inspección, aprobación, rechazo o reembolso.
 * Paginación server-side: el backend filtra, pagina y ordena; el frontend solo renderiza.
 */
export function SupervisorReturnsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReturnId, setSelectedReturnId] = useState<string>('');
  const [page, setPage] = useState(1);

  const parsedStatus = statusFilter === 'All' ? undefined : (statusFilter as ReturnStatus);

  // Pagination params for server-side pagination
  const params: ListReturnsPagedParams = {
    status: parsedStatus,
    page: page - 1, // backend uses 0-based
    size: 20,
  };

  const { data: pagedResult, isLoading, isError, error, refetch, isFetching } = useReturnsPagedQuery(params);
  const returns = pagedResult?.items ?? [];
  const totalItems = pagedResult?.totalItems ?? 0;
  const totalPages = pagedResult?.totalPages ?? 0;

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
      <div className="space-y-8 w-full max-w-full">
        <Skeleton className="h-10 w-64 bg-surface rounded-none" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <Skeleton className="lg:col-span-8 h-96 rounded-none border border-border bg-surface" />
          <Skeleton className="lg:col-span-4 h-96 rounded-none border border-border bg-surface" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6 p-6 sm:p-10 max-w-4xl mx-auto w-full">
        <Alert variant="destructive" className="rounded-none border-destructive bg-destructive/10 text-destructive">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <AlertTitle>Error al cargar expedientes de devolución</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Ocurrió un error inesperado al consultar las devoluciones.'}
          </AlertDescription>
        </Alert>
        <Button
          onClick={() => refetch()}
          variant="outline"
          pill={true}
          className="border-border text-foreground hover:bg-border transition-all active:scale-[0.98]"
        >
          <RefreshCw className="h-4 w-4 mr-2" /> Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full max-w-full">
      {/* ── Encabezado ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
              Fiscalización de Devoluciones e Inspecciones
            </h1>
            <Badge variant="outline" pill={true} className="border-border text-brand font-mono text-xs">
              {returns.length} Solicitudes
            </Badge>
            <Badge variant="outline" pill={true} className="border-border text-warning font-mono text-xs">
              Sólo Lectura
            </Badge>
          </div>
          <p className="text-sm text-foreground-muted">
            Auditoría de solicitudes de devolución física, dictámenes de recepción en bodega y resoluciones comerciales.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          pill={true}
          onClick={() => refetch()}
          disabled={isFetching}
          className="border-border text-foreground-muted hover:text-foreground transition-all active:scale-[0.98]"
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
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
              <Input
                type="text"
                placeholder="Buscar por ID de devolución, pedido, variante o bodega..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-none bg-surface border-border text-foreground placeholder:text-foreground-muted focus:border-brand"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filtrar por estado de devolución"
              className="bg-surface border border-border text-foreground text-sm rounded-none px-3 py-2 outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <option value="All">Todas las Devoluciones</option>
              <option value={ReturnStatus.Requested}>Solicitadas / En Inspección</option>
              <option value={ReturnStatus.Approved}>Aprobadas por Vendedor</option>
              <option value={ReturnStatus.Rejected}>Rechazadas</option>
              <option value={ReturnStatus.Refunded}>Reembolsadas</option>
            </select>
          </div>

          {filteredReturns.length === 0 ? (
            <div className="rounded-none border border-border bg-surface p-12 text-center">
              <RotateCcw className="h-10 w-10 text-foreground-muted mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-foreground">No se encontraron devoluciones</h3>
              <p className="text-xs text-foreground-muted mt-1">
                No existen expedientes de devolución para el filtro o búsqueda seleccionados.
              </p>
            </div>
          ) : (
            <div className="rounded-none border border-border bg-surface overflow-hidden">
              <Table density="comfortable">
                <TableHeader>
                  <TableRow className="border-b border-border text-foreground-muted uppercase tracking-wider font-sans bg-surface-muted/40">
                    <TableHead className="py-3 px-4">Devolución</TableHead>
                    <TableHead className="py-3 px-4">Pedido</TableHead>
                    <TableHead numeric className="py-3 px-4 text-right">Cantidad</TableHead>
                    <TableHead className="py-3 px-4">Dictamen Físico</TableHead>
                    <TableHead className="py-3 px-4">Resolución</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/60">
                  {filteredReturns.map((ret: ReturnRequest) => {
                    const isSelected = activeReturn?.id === ret.id;
                    return (
                      <TableRow
                        key={ret.id}
                        onClick={() => setSelectedReturnId(ret.id)}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedReturnId(ret.id);
                          }
                        }}
                        aria-selected={isSelected}
                        className={`cursor-pointer transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring ${
                          isSelected ? 'bg-surface-muted' : 'hover:bg-surface-muted/40'
                        }`}
                      >
                        <TableCell className="py-4 px-4 font-mono font-semibold text-foreground">
                          #{ret.id.substring(0, 8)}
                        </TableCell>
                        <TableCell className="py-4 px-4 font-mono text-foreground-muted">
                          #{ret.customerOrderId.substring(0, 8)}
                        </TableCell>
                        <TableCell numeric className="py-4 px-4 text-right font-mono font-semibold text-foreground tabular-nums">
                          {ret.quantity}
                        </TableCell>
                        <TableCell className="py-4 px-4">
                          {ret.isGoodCondition === true ? (
                            <Badge
                              variant="outline"
                              pill={true}
                              className="border-brand/40 text-brand text-2xs font-mono"
                            >
                              Intacto
                            </Badge>
                          ) : ret.isGoodCondition === false ? (
                            <Badge
                              variant="outline"
                              pill={true}
                              className="border-destructive/30 text-destructive text-[10px] font-mono"
                            >
                              Dañado / No Apto
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              pill={true}
                              className="border-warning/40 text-warning text-[10px] font-mono"
                            >
                              Pendiente Inspección
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-4 px-4">
                          <StatusBadge tone={TONOS_DE_ESTADO_DE_DEVOLUCION[ret.status]}>
                            {NOMBRES_DE_ESTADO_DE_DEVOLUCION[ret.status]}
                          </StatusBadge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        {totalPages > 1 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalItems}
            onPageChange={setPage}
            className="mt-6"
          />
        )}

        {/* Lado Derecho (35%): Expediente Técnico de Devolución ─────────── */}
        <section className="lg:col-span-4 space-y-6">
          {activeReturn ? (
            <div className="rounded-none border border-border bg-surface p-6 space-y-5">
              <div className="border-b border-border pb-4">
                <span className="text-[11px] font-mono text-foreground-muted block uppercase">
                  Expediente de Devolución
                </span>
                <h3 className="text-lg font-bold text-foreground font-mono mt-1">
                  #{activeReturn.id.substring(0, 8)}
                </h3>
                <Badge
                  variant="outline"
                  pill={true}
                  className="mt-2 border-brand/40 text-brand font-mono text-xs"
                >
                  Estado: {NOMBRES_DE_ESTADO_DE_DEVOLUCION[activeReturn.status]}
                </Badge>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-foreground-muted font-sans">Pedido Asociado:</span>
                  <span className="text-foreground">#{activeReturn.customerOrderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-muted font-sans">Variante / SKU:</span>
                  <span className="text-brand">#{activeReturn.variantId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-muted font-sans">Bodega Receptora:</span>
                  <span className="text-foreground">#{activeReturn.warehouseId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-muted font-sans">Unidades Devueltas:</span>
                  <span className="text-foreground font-bold tabular-nums">
                    {activeReturn.quantity} unidades
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-none bg-surface-muted border border-border space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-foreground-muted">Inspección Física (Bodega):</span>
                  <span className="font-mono font-semibold text-foreground flex items-center gap-1">
                    {activeReturn.isGoodCondition === true ? (
                      <>
                        <CheckCircle className="h-3.5 w-3.5 text-brand" />
                        Apto (Reingreso Usado)
                      </>
                    ) : activeReturn.isGoodCondition === false ? (
                      <>
                        <XCircle className="h-3.5 w-3.5 text-destructive" />
                        No Apto / Dañado
                      </>
                    ) : (
                      <>
                        <Clock className="h-3.5 w-3.5 text-warning" />
                        Pendiente Inspección
                      </>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-foreground-muted">Aprobación Vendedor:</span>
                  <span className="font-mono text-foreground">
                    {activeReturn.vendorApproved ? 'Aprobada' : 'Pendiente / Rechazada'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-none border border-border bg-surface p-8 text-center text-xs text-foreground-muted">
              Seleccione una devolución de la tabla para auditar su dictamen técnico y estado de reembolso.
            </div>
          )}

          <div className="rounded-none border border-border bg-surface p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-brand">
              <ShieldCheck className="h-4 w-4" />
              <span>Política ReturnRead (ADR-0006 y ADR-0018)</span>
            </div>
            <p className="text-[11px] text-foreground-muted leading-relaxed">
              El Supervisor verifica la coherencia entre el dictamen físico del Operador Logístico, la decisión comercial del Vendedor y el desembolso final del Administrador sin alterar los estados.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
