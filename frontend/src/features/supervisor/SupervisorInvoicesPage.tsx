import { useState } from 'react';
import {
  AlertCircle,
  Layers,
  Receipt,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Input,
  Skeleton,
  Pagination,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@zentric/ui';
import { useInvoicesPagedQuery } from '../../core';
import type { Invoice, ListInvoicesPagedParams } from '../../core';
import { InvoiceType } from '../../core';
import { NOMBRES_DE_TIPO_DE_FACTURA } from '../../core';

/**
 * Libro Mayor Tributario del Supervisor (/supervisor/invoices).
 *
 * Frontend-Role-Modules.md sección 2.6:
 * Consume `GET /api/billing/invoices` en modo estricto de sólo lectura.
 * Desglosa Facturas Maestras (`Master`), comisiones de plataforma (`ZentricDetail` 5%)
 * y liquidaciones a vendedores (`VendorDetail` 95%). Cero botones de emisión o anulación.
 * Paginación server-side: el backend filtra, pagina y ordena; el frontend solo renderiza.
 */
export function SupervisorInvoicesPage() {
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Pagination params for server-side pagination
  const params: ListInvoicesPagedParams = {
    page: page - 1, // backend uses 0-based
    size: 20,
  };

  const { data: pagedResult, isLoading, isError, error, refetch, isFetching } = useInvoicesPagedQuery(params);
  const invoices = pagedResult?.items ?? [];
  const totalItems = pagedResult?.totalItems ?? 0;
  const totalPages = pagedResult?.totalPages ?? 0;

  const filteredInvoices = invoices.filter((inv: Invoice) => {
    const matchesSearch =
      !searchTerm.trim() ||
      inv.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customerOrderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.vendorId && inv.vendorId.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = typeFilter === 'All' || inv.type === typeFilter;

    return matchesSearch && matchesType;
  });

  const selectedInvoice =
    invoices.find((inv: Invoice) => inv.id === selectedInvoiceId) ??
    filteredInvoices[0] ??
    null;

  if (isLoading) {
    return (
      <div className="space-y-8 w-full max-w-full">
        <Skeleton className="h-10 w-64 rounded-none bg-surface" />
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
        <Alert variant="destructive" className="rounded-none border border-destructive bg-destructive/10 text-destructive">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <AlertTitle>Error al cargar el libro mayor tributario</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Ocurrió un error inesperado al consultar las facturas.'}
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

  const totalMaster = invoices
    .filter((i: Invoice) => i.type === InvoiceType.Master)
    .reduce((acc, i) => acc + i.totalAmount, 0);

  const totalCommission = invoices
    .filter((i: Invoice) => i.type === InvoiceType.ZentricDetail)
    .reduce((acc, i) => acc + i.totalAmount, 0);

  const totalVendors = invoices
    .filter((i: Invoice) => i.type === InvoiceType.VendorDetail)
    .reduce((acc, i) => acc + i.totalAmount, 0);

  return (
    <div className="space-y-8 w-full max-w-full">
      {/* ── Encabezado ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
              Libro Mayor Tributario y Comisiones Split
            </h1>
            <Badge variant="outline" pill className="border-border text-brand font-mono text-xs">
              {invoices.length} Comprobantes
            </Badge>
            <Badge variant="outline" pill className="border-border text-warning font-mono text-xs">
              Sólo Lectura
            </Badge>
          </div>
          <p className="text-sm text-foreground-muted">
            Auditoría contable de Facturas Maestras, comisiones de plataforma (5%) y liquidaciones a vendedores (95%).
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
        {/* Lado Izquierdo (65%): Tabla de Facturas ──────────────────────── */}
        <section className="lg:col-span-8 space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
              <Input
                type="text"
                placeholder="Buscar por ID factura, pedido o vendedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-none bg-surface border-border text-foreground placeholder:text-foreground-muted focus:border-brand"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label="Filtrar por tipo de factura"
              className="bg-surface border border-border text-foreground text-sm rounded-none px-3 py-2 outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <option value="All">Todos los Comprobantes</option>
              <option value={InvoiceType.Master}>Factura Maestra (Comprador)</option>
              <option value={InvoiceType.ZentricDetail}>Detalle Comisión Zentric (5%)</option>
              <option value={InvoiceType.VendorDetail}>Detalle Liquidación Vendedor (95%)</option>
            </select>
          </div>

          {filteredInvoices.length === 0 ? (
            <div className="rounded-none border border-border bg-surface p-12 text-center">
              <Receipt className="h-10 w-10 text-foreground-muted mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-foreground">No se encontraron facturas</h3>
              <p className="text-xs text-foreground-muted mt-1">
                No existen comprobantes tributarios que coincidan con los criterios de auditoría.
              </p>
            </div>
          ) : (
            <div className="rounded-none border border-border bg-surface overflow-hidden">
              <Table density="comfortable">
                <TableHeader>
                  <TableRow className="border-b border-border text-foreground-muted uppercase tracking-wider font-sans bg-surface-muted/40">
                    <TableHead className="py-3 px-4">Comprobante</TableHead>
                    <TableHead className="py-3 px-4">Pedido Original</TableHead>
                    <TableHead className="py-3 px-4">Tipo</TableHead>
                    <TableHead numeric className="py-3 px-4 text-right">Importe</TableHead>
                    <TableHead className="py-3 px-4">Emisión</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/60">
                  {filteredInvoices.map((inv: Invoice) => {
                    const isSelected = selectedInvoice?.id === inv.id;
                    return (
                      <TableRow
                        key={inv.id}
                        onClick={() => setSelectedInvoiceId(inv.id)}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedInvoiceId(inv.id);
                          }
                        }}
                        aria-selected={isSelected}
                        className={`cursor-pointer transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring ${
                          isSelected ? 'bg-surface-muted' : 'hover:bg-surface-muted/40'
                        }`}
                      >
                        <TableCell className="py-4 px-4 font-mono font-semibold text-foreground">
                          #{inv.id.substring(0, 8)}
                        </TableCell>
                        <TableCell className="py-4 px-4 font-mono text-foreground-muted">
                          #{inv.customerOrderId.substring(0, 8)}
                        </TableCell>
                        <TableCell className="py-4 px-4">
                          {inv.type === InvoiceType.Master ? (
                            <Badge
                              variant="outline"
                              pill
                              className="border-brand/40 text-brand text-[10px] font-mono"
                            >
                              Maestra
                            </Badge>
                          ) : inv.type === InvoiceType.ZentricDetail ? (
                            <Badge
                              variant="outline"
                              pill
                              className="border-warning/40 text-warning text-[10px] font-mono"
                            >
                              Comisión 5%
                            </Badge>
                          ) : (
                            <div className="space-y-0.5">
                              <Badge
                                variant="outline"
                                pill
                                className="border-foreground-muted/40 text-foreground-muted text-[10px] font-mono"
                              >
                                Vendedor 95%
                              </Badge>
                              {inv.vendorId && (
                                <div className="text-[10px] font-mono text-foreground-muted">
                                  Vend: #{inv.vendorId.substring(0, 6)}
                                </div>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell numeric className="py-4 px-4 text-right font-mono font-bold text-foreground tabular-nums">
                          ${inv.totalAmount.toLocaleString('es-CO')}{' '}
                          <span className="text-[10px] text-foreground-muted">{inv.currency}</span>
                        </TableCell>
                        <TableCell className="py-4 px-4 font-mono text-[11px] text-foreground-muted">
                          {inv.issuedAt ? inv.issuedAt.substring(0, 10) : '—'}
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

        {/* Lado Derecho (35%): Resumen Contable Split y Ficha de Factura ── */}
        <section className="lg:col-span-4 space-y-6">
          <div className="rounded-none border border-border bg-surface p-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground font-sans flex items-center gap-2">
              <Layers className="h-4 w-4 text-brand" />
              Balance Consolidado Split
            </h3>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="flex justify-between p-2.5 rounded-none bg-surface-muted/50 border border-border">
                <span className="text-foreground-muted">Facturas Maestras (100%):</span>
                <span className="text-foreground font-bold tabular-nums">
                  ${totalMaster.toLocaleString('es-CO')}
                </span>
              </div>
              <div className="flex justify-between p-2.5 rounded-none bg-surface-muted/50 border border-border">
                <span className="text-foreground-muted">Comisiones Zentric (5%):</span>
                <span className="text-warning font-bold tabular-nums">
                  ${totalCommission.toLocaleString('es-CO')}
                </span>
              </div>
              <div className="flex justify-between p-2.5 rounded-none bg-surface-muted/50 border border-border">
                <span className="text-foreground-muted">Liquidación Vendedores (95%):</span>
                <span className="text-brand font-bold tabular-nums">
                  ${totalVendors.toLocaleString('es-CO')}
                </span>
              </div>
            </div>
          </div>

          {selectedInvoice && (
            <div className="rounded-none border border-border bg-surface p-6 space-y-4">
              <div className="border-b border-border pb-3">
                <span className="text-[11px] font-mono text-foreground-muted block uppercase">
                  Comprobante Seleccionado
                </span>
                <h4 className="text-base font-bold text-foreground font-mono mt-1">
                  #{selectedInvoice.id}
                </h4>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-foreground-muted font-sans">Pedido Asociado:</span>
                  <span className="text-foreground">#{selectedInvoice.customerOrderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-muted font-sans">Tipo de Comprobante:</span>
                  <span className="text-brand">{NOMBRES_DE_TIPO_DE_FACTURA[selectedInvoice.type]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-muted font-sans">Vendedor Titular:</span>
                  <span className="text-foreground">{selectedInvoice.vendorId ?? 'Plataforma Zentric'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-muted font-sans">Importe Total:</span>
                  <span className="text-foreground font-bold tabular-nums">
                    ${selectedInvoice.totalAmount.toLocaleString('es-CO')} {selectedInvoice.currency}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-none border border-border bg-surface p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-brand">
              <ShieldCheck className="h-4 w-4" />
              <span>Política BillingRead (Sólo Lectura)</span>
            </div>
            <p className="text-[11px] text-foreground-muted leading-relaxed">
              La emisión y la anulación legal de comprobantes tributarios están reservadas exclusivamente al rol Administrador bajo la política <code className="font-mono text-foreground">BillingGenerate</code>.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
