import { useState } from 'react';
import {
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  FileCheck,
  Ban,
  Receipt,
  Layers,
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
  useInvoicesQuery,
  useGenerateInvoicesMutation,
  useAnnulInvoicesMutation,
} from '../../application/services';
import type { Invoice } from '../../domain';
import { InvoiceType } from '../../domain';

export function InvoiceManagementPage() {
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Formulario de emisión
  const [generateOrderId, setGenerateOrderId] = useState('');
  const [generateSuccess, setGenerateSuccess] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Formulario de anulación
  const [annulOrderId, setAnnulOrderId] = useState('');
  const [annulReason, setAnnulReason] = useState('');
  const [annulSuccess, setAnnulSuccess] = useState<string | null>(null);
  const [annulError, setAnnulError] = useState<string | null>(null);

  const {
    data: invoices = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useInvoicesQuery();

  const generateMutation = useGenerateInvoicesMutation();
  const annulMutation = useAnnulInvoicesMutation();

  const filteredInvoices = invoices.filter((inv: Invoice) => {
    const matchesSearch =
      !searchTerm.trim() ||
      inv.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customerOrderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.vendorId && inv.vendorId.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = typeFilter === 'All' || inv.type === typeFilter;

    return matchesSearch && matchesType;
  });

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerateError(null);
    setGenerateSuccess(null);

    if (!generateOrderId.trim()) {
      setGenerateError('Debe ingresar el ID del pedido para emitir facturación.');
      return;
    }

    try {
      await generateMutation.mutateAsync(generateOrderId.trim());
      setGenerateSuccess(`Facturación split generada exitosamente para pedido #${generateOrderId.substring(0, 8)}...`);
      setGenerateOrderId('');
    } catch (err) {
      setGenerateError(
        err instanceof Error ? err.message : 'Error al emitir facturación split.'
      );
    }
  };

  const handleAnnul = async (e: React.FormEvent) => {
    e.preventDefault();
    setAnnulError(null);
    setAnnulSuccess(null);

    if (!annulOrderId.trim()) {
      setAnnulError('Debe ingresar el ID del pedido a anular.');
      return;
    }

    if (!annulReason.trim()) {
      setAnnulError('Debe especificar el motivo obligatorio de anulación.');
      return;
    }

    try {
      await annulMutation.mutateAsync({
        orderId: annulOrderId.trim(),
        input: { reason: annulReason.trim() },
      });
      setAnnulSuccess(`Facturas anuladas exitosamente para pedido #${annulOrderId.substring(0, 8)}...`);
      setAnnulOrderId('');
      setAnnulReason('');
    } catch (err) {
      setAnnulError(
        err instanceof Error ? err.message : 'Error al anular facturas.'
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
          <AlertTitle>Error al cargar facturas</AlertTitle>
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
              Facturación Split y Libro Tributario
            </h1>
            <Badge variant="outline" className="border-border text-brand font-mono text-xs">
              {invoices.length} Comprobantes
            </Badge>
          </div>
          <p className="text-sm text-foreground-muted">
            Emisión atómica split (Factura Maestra, Detalle Zentric y Detalle Vendedor) y anulación legal de comprobantes.
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

      {/* ── Split-Frame (65% / 35%) ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Lado Izquierdo (65%): Tabla de Facturas ──────────────────────── */}
        <section className="lg:col-span-8 space-y-6">
          {/* Controles de Búsqueda y Filtro de Tipo */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
              <Input
                type="text"
                placeholder="Buscar por ID factura, pedido o vendedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-surface border-border text-foreground placeholder:text-foreground-muted focus:border-brand"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label="Filtrar por tipo de factura"
              className="bg-surface border border-border text-foreground text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-brand"
            >
              <option value="All">Todos los Comprobantes</option>
              <option value={InvoiceType.Master}>Factura Maestra (Comprador)</option>
              <option value={InvoiceType.ZentricDetail}>Detalle Comisión Zentric</option>
              <option value={InvoiceType.VendorDetail}>Detalle Liquidación Vendedor</option>
            </select>
          </div>

          {filteredInvoices.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface p-12 text-center">
              <Receipt className="h-10 w-10 text-foreground-muted mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-foreground">No se encontraron facturas</h3>
              <p className="text-xs text-foreground-muted mt-1">
                Genere la facturación split para pedidos pagados o ajuste los filtros.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-surface overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-foreground-muted uppercase tracking-wider font-sans bg-surface-muted/40">
                      <th className="py-3 px-4">Comprobante</th>
                      <th className="py-3 px-4">Pedido Original</th>
                      <th className="py-3 px-4">Tipo</th>
                      <th className="py-3 px-4 text-right">Importe</th>
                      <th className="py-3 px-4">Emisión</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredInvoices.map((inv: Invoice) => (
                      <tr key={inv.id} className="hover:bg-surface-muted/40 transition-colors">
                        <td className="py-4 px-4 font-mono font-semibold text-foreground">
                          #{inv.id.substring(0, 8)}
                        </td>
                        <td className="py-4 px-4 font-mono text-border">
                          #{inv.customerOrderId.substring(0, 8)}
                        </td>
                        <td className="py-4 px-4">
                          {inv.type === InvoiceType.Master ? (
                            <Badge
                              variant="outline"
                              className="border-brand/40 text-brand text-[10px] font-mono"
                            >
                              Maestra
                            </Badge>
                          ) : inv.type === InvoiceType.ZentricDetail ? (
                            <Badge
                              variant="outline"
                              className="border-warning/40 text-warning text-[10px] font-mono"
                            >
                              Comisión 5%
                            </Badge>
                          ) : (
                            <div className="space-y-0.5">
                              <Badge
                                variant="outline"
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
                        </td>
                        <td className="py-4 px-4 text-right font-mono font-bold text-foreground tabular-nums">
                          ${inv.totalAmount.toLocaleString('es-CO')}{' '}
                          <span className="text-[10px] text-foreground-muted">{inv.currency}</span>
                        </td>
                        <td className="py-4 px-4 font-mono text-[11px] text-foreground-muted">
                          {inv.issuedAt ? inv.issuedAt.substring(0, 10) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* Lado Derecho (35%): Estaciones de Emisión y Anulación ────────── */}
        <section className="lg:col-span-4 space-y-6">
          {/* Estación 1: Emitir Facturación Split */}
          <div className="rounded-2xl border border-border bg-surface p-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground font-sans flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-brand" />
              Emitir Facturación Split
            </h3>

            {generateSuccess && (
              <Alert className="border-brand/40 bg-brand/10 text-brand">
                <CheckCircle className="h-4 w-4 text-brand" />
                <AlertDescription className="text-xs">{generateSuccess}</AlertDescription>
              </Alert>
            )}

            {generateError && (
              <Alert variant="destructive" className="border-red-900 bg-red-950/40 text-red-200">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-xs">{generateError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleGenerate} className="space-y-3 text-xs">
              <div>
                <label className="text-border block mb-1">ID del Pedido Pagado (UUID)</label>
                <Input
                  type="text"
                  placeholder="UUID del pedido a facturar"
                  value={generateOrderId}
                  onChange={(e) => setGenerateOrderId(e.target.value)}
                  className="bg-surface-muted border-border text-foreground font-mono text-xs focus:border-brand"
                />
              </div>

              <Button
                type="submit"
                disabled={generateMutation.isPending}
                className="w-full bg-brand text-primary-foreground hover:bg-brand/90 font-semibold text-xs"
              >
                {generateMutation.isPending ? 'Generando...' : 'Emitir Facturación Split'}
              </Button>
            </form>
          </div>

          {/* Estación 2: Anulación Legal */}
          <div className="rounded-2xl border border-red-900/40 bg-surface p-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-red-400 font-sans flex items-center gap-2">
              <Ban className="h-4 w-4" />
              Anulación Legal de Facturas
            </h3>

            {annulSuccess && (
              <Alert className="border-brand/40 bg-brand/10 text-brand">
                <CheckCircle className="h-4 w-4 text-brand" />
                <AlertDescription className="text-xs">{annulSuccess}</AlertDescription>
              </Alert>
            )}

            {annulError && (
              <Alert variant="destructive" className="border-red-900 bg-red-950/40 text-red-200">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-xs">{annulError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleAnnul} className="space-y-3 text-xs">
              <div>
                <label className="text-border block mb-1">ID del Pedido a Anular (UUID)</label>
                <Input
                  type="text"
                  placeholder="UUID del pedido facturado"
                  value={annulOrderId}
                  onChange={(e) => setAnnulOrderId(e.target.value)}
                  className="bg-surface-muted border-border text-foreground font-mono text-xs focus:border-red-500"
                />
              </div>

              <div>
                <label className="text-border block mb-1">Motivo Legal de Anulación</label>
                <Input
                  type="text"
                  placeholder="Ej. Devolución total del pedido"
                  value={annulReason}
                  onChange={(e) => setAnnulReason(e.target.value)}
                  className="bg-surface-muted border-border text-foreground text-xs focus:border-red-500"
                />
              </div>

              <Button
                type="submit"
                variant="outline"
                disabled={annulMutation.isPending}
                className="w-full border-red-900/60 text-red-400 hover:bg-red-950/40 hover:text-red-300 font-semibold text-xs"
              >
                {annulMutation.isPending ? 'Anulando...' : 'Anular Facturas del Pedido'}
              </Button>
            </form>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-brand">
              <Layers className="h-4 w-4" />
              <span>Invariante de Split de Facturación</span>
            </div>
            <p className="text-[11px] text-foreground-muted leading-relaxed">
              Zentric desglosa automáticamente cada pedido en una Factura Maestra hacia el comprador, una Factura de Comisión del 5% para la plataforma, y las Facturas de Detalle hacia los respectivos vendedores participantes (95%).
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
