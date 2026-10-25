import { useState } from 'react';
import {
  AlertCircle,
  Ban,
  CheckCircle,
  FileCheck,
  Receipt,
  RefreshCw,
  Search,
} from 'lucide-react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Input,
  MoneyAmount,
  Skeleton,
  StatusBadge,
} from '@zentric/ui';
import {
  useAnnulInvoicesMutation,
  useGenerateInvoicesMutation,
  useInvoicesQuery,
  useOrdersQuery,
} from '../../application/services';
import type { Invoice, OrderListItem } from '../../domain';
import { InvoiceType, OrderStatus } from '../../domain';
import {
  NOMBRES_DE_COMPROBANTE,
  NOMBRES_DE_ESTADO_DE_PEDIDO,
  TONOS_DE_COMPROBANTE,
  TONOS_DE_ESTADO_DE_PEDIDO,
} from '../../components/domainLabels';

/**
 * Consola de Facturación Operativa (Frontend-Role-Modules §2.2).
 *
 * Split-Frame 65/35: tabla de "Comprobantes Emitidos" en lenguaje de negocio
 * a la izquierda; a la derecha dos estaciones de acción —emitir facturación y
 * anular la factura del comprador—.
 *
 * [ADDENDUM - DICTADO POR OWNER, 2026-10-18]: el Administrador opera con
 * "Número de pedido" (formato corto #XXXXXXXX), no con UUIDs, y el
 * vocabulario es de negocio: Factura Comprador, Comisión Plataforma (5%) y
 * Liquidación Vendedor (95%). El párrafo técnico del invariante de split se
 * retiró: la documentación de desarrollo no es UI.
 */

/** Opciones del filtro por tipo de comprobante (rótulos de negocio cortos). */
const OPCIONES_DE_TIPO: ReadonlyArray<{ valor: string; etiqueta: string }> = [
  { valor: 'All', etiqueta: 'Todos los comprobantes' },
  { valor: InvoiceType.Master, etiqueta: 'Factura Comprador' },
  { valor: InvoiceType.ZentricDetail, etiqueta: 'Comisión Plataforma' },
  { valor: InvoiceType.VendorDetail, etiqueta: 'Liquidación Vendedor' },
];

/** Fecha corta legible (Voz 3: telemetría). El dato crudo lo dicta el servidor. */
function fechaCorta(iso: string): string {
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime())
    ? '—'
    : fecha.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Resuelve el "Número de pedido" que escribe el Administrador (formato corto
 * #XXXXXXXX o el identificador completo) contra los pedidos vivos de la
 * plataforma. El admin opera números de negocio, no UUIDs.
 */
function resolverPedido(input: string, orders: OrderListItem[]): OrderListItem | null {
  const numero = input.trim().replace(/^#/, '').toLowerCase();
  if (!numero) return null;
  return (
    orders.find((o) => o.id.toLowerCase() === numero) ??
    orders.find((o) => o.id.toLowerCase().startsWith(numero)) ??
    null
  );
}

/** Estados que ya tienen pago confirmado: requisito para emitir facturación. */
const ESTADOS_PAGADOS: ReadonlyArray<OrderStatus> = [
  OrderStatus.Paid,
  OrderStatus.Dispatched,
  OrderStatus.Delivered,
];

export function InvoiceManagementPage() {
  const [typeFilter, setTypeFilter] = useState<'All' | InvoiceType>('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Estación de emisión
  const [numeroDeEmision, setNumeroDeEmision] = useState('');
  const [generateSuccess, setGenerateSuccess] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Estación de anulación
  const [numeroDeAnulacion, setNumeroDeAnulacion] = useState('');
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

  // Pedidos vivos: permiten resolver el número amigable y validar el estado
  // antes de emitir. El servidor sigue siendo la autoridad financiera.
  const {
    data: orders = [],
    isError: isErrorOrders,
  } = useOrdersQuery();

  const generateMutation = useGenerateInvoicesMutation();
  const annulMutation = useAnnulInvoicesMutation();

  const pedidoDeEmision = resolverPedido(numeroDeEmision, orders);
  const pedidoDeAnulacion = resolverPedido(numeroDeAnulacion, orders);

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

    if (!numeroDeEmision.trim()) {
      setGenerateError('Ingrese el número del pedido pagado a facturar.');
      return;
    }

    if (!pedidoDeEmision) {
      setGenerateError('No encontramos ningún pedido con ese número. Verifíquelo e intente de nuevo.');
      return;
    }

    try {
      await generateMutation.mutateAsync(pedidoDeEmision.id);
      setGenerateSuccess(
        `Facturación emitida para el pedido #${pedidoDeEmision.id.slice(0, 8)}: factura del comprador, comisión de la plataforma (5%) y liquidación al vendedor (95%).`
      );
      setNumeroDeEmision('');
    } catch (err) {
      setGenerateError(
        err instanceof Error ? err.message : 'No fue posible emitir la facturación del pedido.'
      );
    }
  };

  const handleAnnul = async (e: React.FormEvent) => {
    e.preventDefault();
    setAnnulError(null);
    setAnnulSuccess(null);

    if (!numeroDeAnulacion.trim()) {
      setAnnulError('Ingrese el número del pedido cuya facturación desea anular.');
      return;
    }

    if (!pedidoDeAnulacion) {
      setAnnulError('No encontramos ningún pedido con ese número. Verifíquelo e intente de nuevo.');
      return;
    }

    if (!annulReason.trim()) {
      setAnnulError('El motivo legal es obligatorio para anular la facturación.');
      return;
    }

    try {
      await annulMutation.mutateAsync({
        orderId: pedidoDeAnulacion.id,
        input: { reason: annulReason.trim() },
      });
      setAnnulSuccess(
        `Facturación del pedido #${pedidoDeAnulacion.id.slice(0, 8)} anulada. El motivo legal quedó registrado.`
      );
      setNumeroDeAnulacion('');
      setAnnulReason('');
    } catch (err) {
      setAnnulError(
        err instanceof Error ? err.message : 'No fue posible anular la facturación del pedido.'
      );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8 w-full max-w-full">
        <Skeleton className="h-8 w-80" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <Skeleton className="lg:col-span-8 h-96 rounded-2xl" />
          <div className="lg:col-span-4 space-y-6">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-72 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6 p-6 sm:p-10 max-w-4xl mx-auto w-full">
        <Alert variant="destructive">
          <AlertCircle className="h-5 w-5" aria-hidden="true" />
          <AlertTitle>No fue posible cargar la facturación</AlertTitle>
          <AlertDescription>
            {error instanceof Error
              ? error.message
              : 'Ocurrió un error inesperado al consultar los comprobantes.'}
          </AlertDescription>
        </Alert>
        <Button
          onClick={() => refetch()}
          variant="outline"
          className="border-border text-foreground-muted hover:text-foreground"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full max-w-full">
      {/* ── Encabezado de la Consola de Facturación ───────────────────────── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-2">
          <span className="kicker-spike">Operación financiera del marketplace</span>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
              Facturación y Comisiones
            </h1>
            <Badge
              variant="outline"
              className="border-border font-mono text-xs text-foreground-muted tabular-nums"
            >
              {invoices.length} {invoices.length === 1 ? 'comprobante' : 'comprobantes'}
            </Badge>
          </div>
          <p className="text-sm text-foreground-muted">
            Emisión de comprobantes de pedidos pagados, comisión de la plataforma y liquidación a
            vendedores.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          aria-busy={isFetching}
          className="border-border text-foreground-muted hover:text-foreground"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} aria-hidden="true" />
          Refrescar
        </Button>
      </header>

      {isErrorOrders && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>Pedidos no disponibles</AlertTitle>
          <AlertDescription>
            No fue posible consultar los pedidos; el número de pedido no podrá validarse hasta
            restablecer la conexión.
          </AlertDescription>
        </Alert>
      )}

      {/* ── Split-Frame 65/35 (Frontend-Design-System §2.1) ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Izquierda (65%): Comprobantes Emitidos ────────────────────────── */}
        <section className="lg:col-span-8" aria-labelledby="comprobantes-emitidos">
          <div className="rounded-2xl border border-border bg-surface overflow-hidden">
            <div className="flex items-center justify-between border-b border-border bg-surface-muted/40 px-5 py-4">
              <h2
                id="comprobantes-emitidos"
                className="text-sm font-semibold text-foreground font-sans"
              >
                Comprobantes Emitidos
              </h2>
              <span className="font-mono text-xs text-foreground-muted tabular-nums">
                {filteredInvoices.length} de {invoices.length}
              </span>
            </div>

            {/* Búsqueda y filtro por tipo de comprobante */}
            <div className="flex flex-col sm:flex-row gap-3 border-b border-border px-5 py-4">
              <div className="relative flex-1">
                <Search
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted"
                  aria-hidden="true"
                />
                <Input
                  type="text"
                  aria-label="Buscar comprobantes"
                  placeholder="Buscar por comprobante, pedido o vendedor…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-surface text-foreground placeholder:text-foreground-muted"
                />
              </div>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as 'All' | InvoiceType)}
                aria-label="Filtrar por tipo de comprobante"
                className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {OPCIONES_DE_TIPO.map((opcion) => (
                  <option key={opcion.valor} value={opcion.valor}>
                    {opcion.etiqueta}
                  </option>
                ))}
              </select>
            </div>

            {filteredInvoices.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <Receipt className="h-8 w-8 text-foreground-subtle mx-auto mb-3" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-foreground">Sin comprobantes que coincidan</h3>
                <p className="text-xs text-foreground-muted mt-1">
                  Ajuste la búsqueda o el tipo, o emita la facturación de un pedido pagado.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-foreground-muted">
                      <th scope="col" className="px-5 py-2.5 font-medium uppercase tracking-wider">
                        Comprobante
                      </th>
                      <th scope="col" className="px-5 py-2.5 font-medium uppercase tracking-wider">
                        Pedido
                      </th>
                      <th scope="col" className="px-5 py-2.5 font-medium uppercase tracking-wider">
                        Tipo
                      </th>
                      <th
                        scope="col"
                        className="px-5 py-2.5 font-medium uppercase tracking-wider text-right"
                      >
                        Importe
                      </th>
                      <th
                        scope="col"
                        className="px-5 py-2.5 font-medium uppercase tracking-wider text-right"
                      >
                        Emisión
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredInvoices.map((inv: Invoice) => (
                      <tr key={inv.id} className="transition-colors hover:bg-surface-muted/40">
                        <td className="px-5 py-3.5 font-mono font-semibold text-foreground">
                          #{inv.id.slice(0, 8)}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-foreground-muted">
                          #{inv.customerOrderId.slice(0, 8)}
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge tone={TONOS_DE_COMPROBANTE[inv.type]}>
                            {NOMBRES_DE_COMPROBANTE[inv.type]}
                          </StatusBadge>
                          {inv.type === InvoiceType.VendorDetail && inv.vendorId && (
                            <div className="mt-1 font-mono text-[10px] text-foreground-muted">
                              Vendedor #{inv.vendorId.slice(0, 8)}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <MoneyAmount
                            amount={inv.totalAmount}
                            currency={inv.currency}
                            className="font-semibold text-foreground"
                          />
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-foreground-muted tabular-nums">
                          {inv.issuedAt ? fechaCorta(inv.issuedAt) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Derecha (35%): Estaciones de acción ───────────────────────────── */}
        <aside className="lg:col-span-4 space-y-6" aria-label="Acciones de facturación">
          {/* Estación 1: Emitir Facturación (acción primaria, índigo de mando) */}
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
            <div className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-brand" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-foreground font-sans">Emitir Facturación</h3>
            </div>
            <p className="text-xs text-foreground-muted leading-relaxed">
              Para un pedido pagado se emiten la factura del comprador, la comisión de la plataforma
              (5%) y la liquidación al vendedor (95%).
            </p>

            {generateSuccess && (
              <Alert variant="success" role="status">
                <CheckCircle className="h-4 w-4" aria-hidden="true" />
                <AlertDescription className="text-xs">{generateSuccess}</AlertDescription>
              </Alert>
            )}

            {generateError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <AlertDescription className="text-xs">{generateError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleGenerate} className="space-y-3" noValidate>
              <div className="space-y-1.5">
                <label
                  htmlFor="numero-de-emision"
                  className="text-xs font-medium text-foreground-muted"
                >
                  Número de pedido
                </label>
                <Input
                  id="numero-de-emision"
                  type="text"
                  placeholder="Ej. #A1B2C3D4"
                  value={numeroDeEmision}
                  onChange={(e) => setNumeroDeEmision(e.target.value)}
                  aria-invalid={Boolean(generateError)}
                  className="border-border bg-surface-muted/60 font-mono text-xs"
                />
              </div>

              {pedidoDeEmision && (
                <div
                  role="status"
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-muted/50 px-3 py-2"
                >
                  <span className="font-mono text-xs text-foreground">
                    #{pedidoDeEmision.id.slice(0, 8)}
                  </span>
                  <StatusBadge tone={TONOS_DE_ESTADO_DE_PEDIDO[pedidoDeEmision.status]}>
                    {NOMBRES_DE_ESTADO_DE_PEDIDO[pedidoDeEmision.status]}
                  </StatusBadge>
                  <MoneyAmount
                    amount={pedidoDeEmision.totalAmount}
                    currency={pedidoDeEmision.currency}
                    className="text-xs font-semibold"
                  />
                </div>
              )}

              {pedidoDeEmision && !ESTADOS_PAGADOS.includes(pedidoDeEmision.status) && (
                <p className="text-xs text-warning">
                  Este pedido aún no tiene pago confirmado; la facturación se emite sólo para
                  pedidos pagados.
                </p>
              )}

              <Button
                type="submit"
                className="w-full font-semibold"
                isLoading={generateMutation.isPending}
              >
                Emitir Facturación
              </Button>
            </form>
          </div>

          {/* Estación 2: Anular Factura Comprador (acción destructiva) */}
          <div className="rounded-2xl border border-destructive/30 bg-surface p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Ban className="h-4 w-4 text-destructive" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-foreground font-sans">
                Anular Factura Comprador
              </h3>
            </div>
            <p className="text-xs text-foreground-muted leading-relaxed">
              Revierte los comprobantes emitidos de un pedido; el motivo legal queda registrado en el
              libro de comprobantes.
            </p>

            {annulSuccess && (
              <Alert variant="success" role="status">
                <CheckCircle className="h-4 w-4" aria-hidden="true" />
                <AlertDescription className="text-xs">{annulSuccess}</AlertDescription>
              </Alert>
            )}

            {annulError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <AlertDescription className="text-xs">{annulError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleAnnul} className="space-y-3" noValidate>
              <div className="space-y-1.5">
                <label
                  htmlFor="numero-de-anulacion"
                  className="text-xs font-medium text-foreground-muted"
                >
                  Número de pedido
                </label>
                <Input
                  id="numero-de-anulacion"
                  type="text"
                  placeholder="Ej. #A1B2C3D4"
                  value={numeroDeAnulacion}
                  onChange={(e) => setNumeroDeAnulacion(e.target.value)}
                  aria-invalid={Boolean(annulError)}
                  className="border-border bg-surface-muted/60 font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="motivo-legal" className="text-xs font-medium text-foreground-muted">
                  Motivo legal (obligatorio)
                </label>
                <Input
                  id="motivo-legal"
                  type="text"
                  placeholder="Ej. Devolución total acreditada al comprador"
                  value={annulReason}
                  onChange={(e) => setAnnulReason(e.target.value)}
                  aria-invalid={Boolean(annulError)}
                  className="border-border bg-surface-muted/60 text-xs"
                />
              </div>

              {pedidoDeAnulacion && (
                <div
                  role="status"
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-muted/50 px-3 py-2"
                >
                  <span className="font-mono text-xs text-foreground">
                    #{pedidoDeAnulacion.id.slice(0, 8)}
                  </span>
                  <StatusBadge tone={TONOS_DE_ESTADO_DE_PEDIDO[pedidoDeAnulacion.status]}>
                    {NOMBRES_DE_ESTADO_DE_PEDIDO[pedidoDeAnulacion.status]}
                  </StatusBadge>
                  <MoneyAmount
                    amount={pedidoDeAnulacion.totalAmount}
                    currency={pedidoDeAnulacion.currency}
                    className="text-xs font-semibold"
                  />
                </div>
              )}

              <Button
                type="submit"
                variant="destructive"
                className="w-full font-semibold"
                isLoading={annulMutation.isPending}
              >
                Anular Facturación
              </Button>
            </form>
          </div>
        </aside>
      </div>
    </div>
  );
}
