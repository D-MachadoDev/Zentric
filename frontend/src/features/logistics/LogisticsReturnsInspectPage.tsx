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
  StatusBadge,
  Input,
  Skeleton,
  Alert,
  AlertTitle,
  AlertDescription,
  Pagination,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@zentric/ui';
import {
  NOMBRES_DE_ESTADO_DE_DEVOLUCION,
  TONOS_DE_ESTADO_DE_DEVOLUCION,
  useReturnsPagedQuery,
  useInspectReturnMutation,
} from '../../core';
import type { ListReturnsPagedParams, ReturnRequest } from '../../core';
import { ReturnStatus } from '../../core';

/**
 * Fiscalización de Solicitudes de Devolución (/logistics/returns/inspect).
 *
 * Frontend-Role-Modules.md sección 2.6:
 * Consume `GET /api/returns` y `GET /api/returns/{id}` en modo de sólo lectura.
 * Audita dictámenes técnicos de inspección física (`isGoodCondition`) y
 * resoluciones comerciales/financieras (`Approved`, `Rejected`, `Refunded`).
 * Cero botones de inspección, aprobación, rechazo o reembolso.
 * Paginación server-side: el backend filtra, pagina y ordena; el frontend solo renderiza.
 */
export function LogisticsReturnsInspectPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(ReturnStatus.Requested);
  const [selectedReturnId, setSelectedReturnId] = useState<string | null>(null);
  const [isGoodCondition, setIsGoodCondition] = useState<boolean>(true);
  const [page, setPage] = useState(1);

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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
          <AlertTitle>Error al cargar devoluciones</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Ocurrió un error inesperado.'}
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
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
              Estación de Inspección Técnica de Devoluciones
            </h1>
            <Badge variant="outline" className="border-border text-brand font-mono text-xs">
              ADR-0018
            </Badge>
          </div>
          <p className="text-sm text-foreground-muted">
            Verificación física del estado del producto devuelto en bodega antes de la resolución comercial del vendedor.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          pill={true}
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
          <AlertTitle>Dictamen Registrado</AlertTitle>
          <AlertDescription className="text-xs">{actionSuccess}</AlertDescription>
        </Alert>
      )}

      {actionError && (
        <Alert variant="destructive" className="border-destructive bg-destructive/10 text-destructive">
          <AlertCircle className="h-4 w-4 text-destructive" />
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
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
              <Input
                type="text"
                placeholder="Buscar por ID devolución, pedido o variante..."
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
              <option value={ReturnStatus.Requested}>Pendientes de Dictamen</option>
              <option value={ReturnStatus.Approved}>Aprobadas Comercial</option>
              <option value={ReturnStatus.Rejected}>Rechazadas</option>
              <option value={ReturnStatus.Refunded}>Reembolsadas</option>
              <option value="All">Todas las Devoluciones</option>
            </select>
          </div>

          {filteredReturns.length === 0 ? (
            <div className="rounded-none border border-border bg-surface p-12 text-center">
              <ClipboardCheck className="h-10 w-10 text-foreground-muted mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-foreground">No hay devoluciones para inspeccionar</h3>
              <p className="text-xs text-foreground-muted mt-1">
                Todas las devoluciones recibidas en bodega cuentan con dictamen técnico físico.
              </p>
            </div>
          ) : (
            <div className="rounded-none border border-border bg-surface overflow-hidden">
              <Table density="compact" aria-label="Devoluciones para inspección física">
                <TableHeader>
                  <TableRow>
                    <TableHead className="py-3 px-4">Devolución</TableHead>
                    <TableHead className="py-3 px-4">Pedido Original</TableHead>
                    <TableHead numeric className="py-3 px-4">Cantidad</TableHead>
                    <TableHead className="py-3 px-4">Dictamen Técnico</TableHead>
                    <TableHead className="py-3 px-4">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReturns.map((ret: ReturnRequest) => {
                    const isSelected = selectedReturn?.id === ret.id;
                    return (
                      <TableRow
                        key={ret.id}
                        onClick={() => setSelectedReturnId(ret.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-surface-muted border-l-2 border-l-brand'
                            : 'hover:bg-surface-muted/40'
                        }`}
                      >
                        <TableCell className="py-4 px-4 font-mono font-semibold text-foreground">
                          #{ret.id.substring(0, 8)}
                        </TableCell>
                        <TableCell className="py-4 px-4 font-mono text-foreground-muted">
                          #{ret.customerOrderId.substring(0, 8)}
                        </TableCell>
                        <TableCell numeric className="py-4 px-4 font-mono font-semibold text-foreground tabular-nums">
                          {ret.quantity}
                        </TableCell>
                        <TableCell className="py-4 px-4">
                          {ret.isGoodCondition === true ? (
                            <Badge variant="outline" className="border-brand/40 text-brand text-2xs">
                              Intacto
                            </Badge>
                          ) : ret.isGoodCondition === false ? (
                            <Badge variant="outline" className="border-destructive/30 text-destructive text-[10px]">
                              Dañado
                            </Badge>
                          ) : (
                            <span className="text-[11px] text-warning font-mono">Por Inspeccionar</span>
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

        {/* Lado Derecho (35%): Panel de Dictamen Físico ──────────────────── */}
        <section className="lg:col-span-4 space-y-6">
          {selectedReturn ? (
            <div className="rounded-none border border-border bg-surface p-6 space-y-5">
              <div className="border-b border-border pb-3">
                <span className="text-[11px] font-mono text-foreground-muted block">
                  EXPEDIENTE DE RECEPCIÓN
                </span>
                <h3 className="text-base font-bold text-foreground mt-1">
                  Devolución #{selectedReturn.id.substring(0, 8)}
                </h3>
              </div>

              <div className="space-y-2.5 text-xs font-mono">
                <div>
                  <span className="text-foreground-muted block text-[11px] font-sans">Pedido:</span>
                  <span className="text-foreground">#{selectedReturn.customerOrderId.slice(0, 8)}</span>
                </div>
                <div>
                  <span className="text-foreground-muted block text-[11px] font-sans">Producto:</span>
                  <span className="text-foreground">{selectedReturn.productName ?? 'Artículo'}</span>
                </div>
                <div>
                  <span className="text-foreground-muted block text-[11px] font-sans">Vendedor:</span>
                  <span className="text-brand">#{selectedReturn.vendorId?.slice(0, 8) ?? '—'}</span>
                </div>
                <div>
                  <span className="text-foreground-muted block text-[11px] font-sans">Unidades Recibidas:</span>
                  <span className="text-foreground font-bold tabular-nums">
                    {selectedReturn.quantity} unidades
                  </span>
                </div>
              </div>

              {/* Formulario de Dictamen */}
              <form onSubmit={handleInspectSubmit} className="space-y-4 pt-2 border-t border-border">
                <label className="text-xs font-semibold text-foreground-muted block">
                  Dictamen Físico de Recepción en Bodega
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIsGoodCondition(true)}
                    className={`p-3 rounded-none border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all active:scale-[0.98] ${
                      isGoodCondition
                        ? 'border-brand bg-brand/10 text-brand'
                        : 'border-border bg-surface-muted/40 text-foreground-muted hover:border-foreground-muted'
                    }`}
                  >
                    <Check className="h-4 w-4" />
                    <span>Favorable (Intacto)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsGoodCondition(false)}
                    className={`p-3 rounded-none border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all active:scale-[0.98] ${
                      !isGoodCondition
                        ? 'border-destructive bg-destructive/10 text-destructive'
                        : 'border-border bg-surface-muted/40 text-foreground-muted hover:border-foreground-muted'
                    }`}
                  >
                    <X className="h-4 w-4" />
                    <span>Desfavorable (Dañado)</span>
                  </button>
                </div>

                <Button
                  type="submit"
                  pill={true}
                  fillOnHover={true}
                  disabled={inspectMutation.isPending}
                  className="w-full bg-brand text-primary-foreground hover:bg-brand/90 font-semibold text-xs transition-all active:scale-[0.98]"
                >
                  {inspectMutation.isPending ? 'Registrando...' : 'Emitir Dictamen Físico'}
                </Button>
              </form>
            </div>
          ) : (
            <div className="rounded-none border border-border bg-surface p-8 text-center text-xs text-foreground-muted">
              Seleccione una devolución recibida en bodega para asentar el dictamen físico.
            </div>
          )}

          <div className="rounded-none border border-border bg-surface p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-brand">
              <ShieldCheck className="h-4 w-4" />
              <span>Separación de Competencias (ADR-0018)</span>
            </div>
            <p className="text-[11px] text-foreground-muted leading-relaxed">
              El Operador Logístico asienta únicamente la condición física del producto. La decisión de aceptar o rechazar comercialmente la devolución corresponde al vendedor dueño de la variante (ADR-0006).
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
