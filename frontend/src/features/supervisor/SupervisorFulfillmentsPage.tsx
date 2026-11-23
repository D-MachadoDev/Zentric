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
  StatusBadge,
  Pagination,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@zentric/ui';
import { useFulfillmentsPagedQuery } from '../../core';
import type { FulfillmentOrder, ListFulfillmentsPagedParams } from '../../core';
import { FulfillmentStatus } from '../../core';
import {
  NOMBRES_DE_ESTADO_DE_DESPACHO,
  TONOS_DE_ESTADO_DE_DESPACHO,
} from '../../core';

/**
 * Monitoreo de Despachos y Cancelaciones por Quiebre (/supervisor/fulfillments).
 *
 * Frontend-Role-Modules.md sección 2.6:
 * Supervisión en modo sólo lectura de todas las órdenes de fulfillment en la red
 * logística (`GET /api/logistics/fulfillments`), incluyendo guías y motivos de
 * cancelación por stock fantasma (AD/ AD). Cero botones de mutación.
 * Paginación server-side: el backend filtra, pagina y ordena; el frontend solo renderiza.
 */
export function SupervisorFulfillmentsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFulfillmentId, setSelectedFulfillmentId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const parsedStatus = statusFilter === 'All' ? undefined : (statusFilter as FulfillmentStatus);

  // Pagination params for server-side pagination
  const params: ListFulfillmentsPagedParams = {
    status: parsedStatus,
    page: page - 1, // backend uses 0-based
    size: 20,
  };

  const { data: pagedResult, isLoading, isError, error, refetch, isFetching } = useFulfillmentsPagedQuery(params);
  const fulfillments = pagedResult?.items ?? [];
  const totalItems = pagedResult?.totalItems ?? 0;
  const totalPages = pagedResult?.totalPages ?? 0;

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
          <AlertTitle>Error al cargar órdenes de despacho</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Ocurrió un error inesperado al consultar la red logística.'}
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
              Monitoreo de Despachos y Quiebres de Stock
            </h1>
            <Badge variant="outline" pill={true} className="border-border text-brand font-mono text-xs">
              {fulfillments.length} Despachos
            </Badge>
            <Badge variant="outline" pill={true} className="border-border text-warning font-mono text-xs">
              Sólo Lectura
            </Badge>
          </div>
          <p className="text-sm text-foreground-muted">
            Trazabilidad de órdenes de empaque, guías transportadoras e incidentes de cancelación por stock fantasma.
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
        {/* Lado Izquierdo (65%): Tabla de Despachos ─────────────────────── */}
        <section className="lg:col-span-8 space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
              <Input
                type="text"
                placeholder="Buscar por ID despacho, pedido, vendedor, guía o motivo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-none bg-surface border-border text-foreground placeholder:text-foreground-muted focus:border-brand"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filtrar por estado de despacho"
              className="bg-surface border border-border text-foreground text-sm rounded-none px-3 py-2 outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <option value="All">Todos los Estados</option>
              <option value={FulfillmentStatus.PendingPack}>Pendiente de Empaque</option>
              <option value={FulfillmentStatus.Packed}>Empacado</option>
              <option value={FulfillmentStatus.Dispatched}>Despachado</option>
              <option value={FulfillmentStatus.Delivered}>Entregado</option>
              <option value={FulfillmentStatus.Cancelled}>Cancelado por Quiebre</option>
            </select>
          </div>

          {filteredFulfillments.length === 0 ? (
            <div className="rounded-none border border-border bg-surface p-12 text-center">
              <PackageCheck className="h-10 w-10 text-foreground-muted mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-foreground">No se encontraron despachos</h3>
              <p className="text-xs text-foreground-muted mt-1">
                Ninguna orden de despacho coincide con los criterios de auditoría seleccionados.
              </p>
            </div>
          ) : (
            <div className="rounded-none border border-border bg-surface overflow-hidden">
              <Table density="comfortable">
                <TableHeader>
                  <TableRow className="border-b border-border text-foreground-muted uppercase tracking-wider font-sans bg-surface-muted/40">
                    <TableHead className="py-3 px-4">Despacho</TableHead>
                    <TableHead className="py-3 px-4">Pedido</TableHead>
                    <TableHead className="py-3 px-4">Vendedor</TableHead>
                    <TableHead className="py-3 px-4">Estado</TableHead>
                    <TableHead numeric className="py-3 px-4 text-right">Guías</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/60">
                  {filteredFulfillments.map((ful: FulfillmentOrder) => {
                    const isSelected = selectedFulfillment?.id === ful.id;
                    return (
                      <TableRow
                        key={ful.id}
                        onClick={() => setSelectedFulfillmentId(ful.id)}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedFulfillmentId(ful.id);
                          }
                        }}
                        aria-selected={isSelected}
                        className={`cursor-pointer transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring ${
                          isSelected ? 'bg-surface-muted' : 'hover:bg-surface-muted/40'
                        }`}
                      >
                        <TableCell className="py-4 px-4 font-mono font-semibold text-foreground">
                          #{ful.id.substring(0, 8)}
                        </TableCell>
                        <TableCell className="py-4 px-4 font-mono text-foreground-muted">
                          #{ful.customerOrderId.substring(0, 8)}
                        </TableCell>
                        <TableCell className="py-4 px-4 font-mono text-foreground-muted">
                          #{ful.vendorId.substring(0, 8)}
                        </TableCell>
                        <TableCell className="py-4 px-4">
                          <StatusBadge tone={TONOS_DE_ESTADO_DE_DESPACHO[ful.status]}>
                            {NOMBRES_DE_ESTADO_DE_DESPACHO[ful.status]}
                          </StatusBadge>
                        </TableCell>
                        <TableCell numeric className="py-4 px-4 text-right font-mono text-foreground tabular-nums">
                          {ful.shipments.length}
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

        {/* Lado Derecho (35%): Expediente de Despacho Seleccionado ──────── */}
        <section className="lg:col-span-4 space-y-6">
          {selectedFulfillment ? (
            <div className="rounded-none border border-border bg-surface p-6 space-y-5">
              <div className="border-b border-border pb-4">
                <span className="text-[11px] font-mono text-foreground-muted block uppercase">
                  Expediente Logístico
                </span>
                <h3 className="text-lg font-bold text-foreground font-mono mt-1">
                  #{selectedFulfillment.id.substring(0, 8)}
                </h3>
                <Badge
                  variant="outline"
                  pill={true}
                  className="mt-2 border-border text-brand font-mono text-xs"
                >
                  Estado: {NOMBRES_DE_ESTADO_DE_DESPACHO[selectedFulfillment.status]}
                </Badge>
              </div>

              <div className="space-y-2.5 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-foreground-muted font-sans">Pedido Asociado:</span>
                  <span className="text-foreground">#{selectedFulfillment.customerOrderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-muted font-sans">Vendedor Titular:</span>
                  <span className="text-foreground">#{selectedFulfillment.vendorId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-muted font-sans">Paquetes / Guías:</span>
                  <span className="text-foreground tabular-nums">
                    {selectedFulfillment.shipments.length}
                  </span>
                </div>
              </div>

              {selectedFulfillment.cancellationReason && (
                <div className="p-3.5 rounded-none bg-destructive/10 border border-destructive/30 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Incidente de Stock Fantasma</span>
                  </div>
                  <p className="text-xs font-mono text-destructive">
                    {selectedFulfillment.cancellationReason}
                  </p>
                </div>
              )}

              <div className="space-y-2 pt-2 border-t border-border">
                <h4 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5 text-brand" />
                  Guías de Transporte Registradas
                </h4>
                {selectedFulfillment.shipments.length === 0 ? (
                  <p className="text-xs text-foreground-muted">
                    Sin guías de transporte emitidas todavía.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedFulfillment.shipments.map((ship) => (
                      <div
                        key={ship.id}
                        className="p-3 rounded-none bg-surface-muted border border-border text-xs font-mono space-y-1"
                      >
                        <div className="flex justify-between">
                          <span className="text-foreground-muted">Guía:</span>
                          <span className="text-brand font-bold">{ship.trackingNumber}</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-foreground-muted">Bodega Origen:</span>
                          <span className="text-foreground">#{ship.warehouseId.substring(0, 8)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-none border border-border bg-surface p-8 text-center text-xs text-foreground-muted">
              Seleccione una orden de despacho para auditar sus paquetes y guías.
            </div>
          )}

          <div className="rounded-none border border-border bg-surface p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-brand">
              <ShieldCheck className="h-4 w-4" />
              <span>Política FulfillmentRead (Sólo Lectura)</span>
            </div>
            <p className="text-[11px] text-foreground-muted leading-relaxed">
              Las transiciones operativas de empaque, despacho, entrega y cancelación por quiebre están reservadas al Operador Logístico y al Vendedor.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
