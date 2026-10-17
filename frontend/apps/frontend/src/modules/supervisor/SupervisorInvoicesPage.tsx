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
} from '@zentric/ui';
import { useInvoicesQuery } from '../../application/services';
import type { Invoice } from '../../domain';
import { InvoiceType } from '../../domain';

/**
 * Libro Mayor Tributario del Supervisor (/supervisor/invoices).
 *
 * Frontend-Role-Modules.md §2.6:
 * Consume `GET /api/billing/invoices` en modo estricto de sólo lectura.
 * Desglosa Facturas Maestras (`Master`), comisiones de plataforma (`ZentricDetail` 5%)
 * y liquidaciones a vendedores (`VendorDetail` 95%). Cero botones de emisión o anulación.
 */
export function SupervisorInvoicesPage() {
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  const {
    data: invoices = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useInvoicesQuery();

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
          <AlertTitle>Error al cargar el libro mayor tributario</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Ocurrió un error inesperado al consultar las facturas.'}
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
    <div className="space-y-8 p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full">
      {/* ── Encabezado ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#1F293D]">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
              Libro Mayor Tributario y Comisiones Split
            </h1>
            <Badge variant="outline" className="border-[#1F293D] text-[#00D4AA] font-mono text-xs">
              {invoices.length} Comprobantes
            </Badge>
            <Badge variant="outline" className="border-[#1F293D] text-[#FFB800] font-mono text-xs">
              Sólo Lectura
            </Badge>
          </div>
          <p className="text-sm text-[#94A3B8]">
            Auditoría contable de Facturas Maestras, comisiones de plataforma (5%) y liquidaciones a vendedores (95%).
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
        {/* Lado Izquierdo (65%): Tabla de Facturas ──────────────────────── */}
        <section className="lg:col-span-8 space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B]" />
              <Input
                type="text"
                placeholder="Buscar por ID factura, pedido o vendedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-[#111827] border-[#1F293D] text-white placeholder:text-[#64748B] focus:border-[#00D4AA]"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label="Filtrar por tipo de factura"
              className="bg-[#111827] border border-[#1F293D] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#00D4AA]"
            >
              <option value="All">Todos los Comprobantes</option>
              <option value={InvoiceType.Master}>Factura Maestra (Comprador)</option>
              <option value={InvoiceType.ZentricDetail}>Detalle Comisión Zentric (5%)</option>
              <option value={InvoiceType.VendorDetail}>Detalle Liquidación Vendedor (95%)</option>
            </select>
          </div>

          {filteredInvoices.length === 0 ? (
            <div className="rounded-2xl border border-[#1F293D] bg-[#111827] p-12 text-center">
              <Receipt className="h-10 w-10 text-[#64748B] mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-white">No se encontraron facturas</h3>
              <p className="text-xs text-[#94A3B8] mt-1">
                No existen comprobantes tributarios que coincidan con los criterios de auditoría.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#1F293D] bg-[#111827] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#1F293D] text-[#94A3B8] uppercase tracking-wider font-sans bg-[#161F30]/40">
                      <th className="py-3 px-4">Comprobante</th>
                      <th className="py-3 px-4">Pedido Original</th>
                      <th className="py-3 px-4">Tipo</th>
                      <th className="py-3 px-4 text-right">Importe</th>
                      <th className="py-3 px-4">Emisión</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F293D]/60">
                    {filteredInvoices.map((inv: Invoice) => {
                      const isSelected = selectedInvoice?.id === inv.id;
                      return (
                        <tr
                          key={inv.id}
                          onClick={() => setSelectedInvoiceId(inv.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-[#161F30]' : 'hover:bg-[#161F30]/40'
                          }`}
                        >
                          <td className="py-4 px-4 font-mono font-semibold text-white">
                            #{inv.id.substring(0, 8)}
                          </td>
                          <td className="py-4 px-4 font-mono text-[#E2E8F0]">
                            #{inv.customerOrderId.substring(0, 8)}
                          </td>
                          <td className="py-4 px-4">
                            {inv.type === InvoiceType.Master ? (
                              <Badge
                                variant="outline"
                                className="border-[#00D4AA]/40 text-[#00D4AA] text-[10px] font-mono"
                              >
                                Maestra
                              </Badge>
                            ) : inv.type === InvoiceType.ZentricDetail ? (
                              <Badge
                                variant="outline"
                                className="border-[#FFB800]/40 text-[#FFB800] text-[10px] font-mono"
                              >
                                Comisión 5%
                              </Badge>
                            ) : (
                              <div className="space-y-0.5">
                                <Badge
                                  variant="outline"
                                  className="border-[#94A3B8]/40 text-[#94A3B8] text-[10px] font-mono"
                                >
                                  Vendedor 95%
                                </Badge>
                                {inv.vendorId && (
                                  <div className="text-[10px] font-mono text-[#64748B]">
                                    Vend: #{inv.vendorId.substring(0, 6)}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-4 text-right font-mono font-bold text-white tabular-nums">
                            ${inv.totalAmount.toLocaleString('es-CO')}{' '}
                            <span className="text-[10px] text-[#94A3B8]">{inv.currency}</span>
                          </td>
                          <td className="py-4 px-4 font-mono text-[11px] text-[#94A3B8]">
                            {inv.issuedAt ? inv.issuedAt.substring(0, 10) : '—'}
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

        {/* Lado Derecho (35%): Resumen Contable Split y Ficha de Factura ── */}
        <section className="lg:col-span-4 space-y-6">
          <div className="rounded-2xl border border-[#1F293D] bg-[#111827] p-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white font-sans flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#00D4AA]" />
              Balance Consolidado Split
            </h3>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="flex justify-between p-2.5 rounded-lg bg-[#161F30] border border-[#1F293D]">
                <span className="text-[#94A3B8]">Facturas Maestras (100%):</span>
                <span className="text-white font-bold tabular-nums">
                  ${totalMaster.toLocaleString('es-CO')}
                </span>
              </div>
              <div className="flex justify-between p-2.5 rounded-lg bg-[#161F30] border border-[#1F293D]">
                <span className="text-[#94A3B8]">Comisiones Zentric (5%):</span>
                <span className="text-[#FFB800] font-bold tabular-nums">
                  ${totalCommission.toLocaleString('es-CO')}
                </span>
              </div>
              <div className="flex justify-between p-2.5 rounded-lg bg-[#161F30] border border-[#1F293D]">
                <span className="text-[#94A3B8]">Liquidación Vendedores (95%):</span>
                <span className="text-[#00D4AA] font-bold tabular-nums">
                  ${totalVendors.toLocaleString('es-CO')}
                </span>
              </div>
            </div>
          </div>

          {selectedInvoice && (
            <div className="rounded-2xl border border-[#1F293D] bg-[#111827] p-6 space-y-4">
              <div className="border-b border-[#1F293D] pb-3">
                <span className="text-[11px] font-mono text-[#64748B] block uppercase">
                  Comprobante Seleccionado
                </span>
                <h4 className="text-base font-bold text-white font-mono mt-1">
                  #{selectedInvoice.id}
                </h4>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-[#94A3B8] font-sans">Pedido Asociado:</span>
                  <span className="text-white">#{selectedInvoice.customerOrderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94A3B8] font-sans">Tipo de Comprobante:</span>
                  <span className="text-[#00D4AA]">{selectedInvoice.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94A3B8] font-sans">Vendedor Titular:</span>
                  <span className="text-white">{selectedInvoice.vendorId ?? 'Plataforma Zentric'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94A3B8] font-sans">Importe Total:</span>
                  <span className="text-white font-bold tabular-nums">
                    ${selectedInvoice.totalAmount.toLocaleString('es-CO')} {selectedInvoice.currency}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-[#1F293D] bg-[#111827] p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#00D4AA]">
              <ShieldCheck className="h-4 w-4" />
              <span>Política BillingRead (Sólo Lectura)</span>
            </div>
            <p className="text-[11px] text-[#94A3B8] leading-relaxed">
              La emisión y la anulación legal de comprobantes tributarios están reservadas exclusivamente al rol Administrador bajo la política <code className="font-mono text-white">BillingGenerate</code>.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
