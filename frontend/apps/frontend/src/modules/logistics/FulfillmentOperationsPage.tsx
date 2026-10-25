import { useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import {
  Truck,
  Package,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  AlertTriangle,
  Ban,
  ShieldCheck,
  Send,
  CheckCheck,
} from 'lucide-react';
import {
  Button,
  Badge,
  Skeleton,
  Alert,
  AlertTitle,
  AlertDescription,
} from '@zentric/ui';
import {
  useFulfillmentQuery,
  usePackFulfillmentMutation,
  useDispatchFulfillmentMutation,
  useDeliverFulfillmentMutation,
} from '../../application/services';
import { NOMBRES_DE_ESTADO_DE_DESPACHO } from '../../components/domainLabels';
import { FulfillmentStatus } from '../../domain';

interface FulfillmentOperationsPageProps {
  fulfillmentId?: string;
}

export function FulfillmentOperationsPage({ fulfillmentId }: FulfillmentOperationsPageProps) {
  const params = useParams({ strict: false });
  const id = fulfillmentId ?? (params as Record<string, string>)?.id ?? '';

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data: fulfillment,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useFulfillmentQuery(id);

  const packMutation = usePackFulfillmentMutation();
  const dispatchMutation = useDispatchFulfillmentMutation();
  const deliverMutation = useDeliverFulfillmentMutation();

  const handlePack = async () => {
    setActionError(null);
    setActionSuccess(null);
    try {
      await packMutation.mutateAsync(id);
      setActionSuccess('Paquete empacado y verificado en bodega exitosamente.');
      refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error al registrar empaque.');
    }
  };

  const handleDispatch = async () => {
    setActionError(null);
    setActionSuccess(null);
    try {
      await dispatchMutation.mutateAsync(id);
      setActionSuccess('Paquete despachado con guía asignada en ruta.');
      refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error al registrar despacho.');
    }
  };

  const handleDeliver = async () => {
    setActionError(null);
    setActionSuccess(null);
    try {
      await deliverMutation.mutateAsync(id);
      setActionSuccess('Entrega certificada exitosamente al comprador final.');
      refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error al certificar entrega.');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8 w-full max-w-full">
        <Skeleton className="h-10 w-64 bg-surface" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <Skeleton className="lg:col-span-7 h-96 rounded-2xl bg-surface" />
          <Skeleton className="lg:col-span-5 h-96 rounded-2xl bg-surface" />
        </div>
      </div>
    );
  }

  if (isError || !fulfillment) {
    return (
      <div className="space-y-6 p-6 sm:p-10 max-w-4xl mx-auto w-full">
        <Alert variant="destructive" className="border-red-900 bg-red-950/40 text-red-200">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <AlertTitle>Error al cargar el despacho</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'No se encontró el despacho solicitado.'}
          </AlertDescription>
        </Alert>
        <Link to="/logistics/fulfillments">
          <Button variant="outline" className="border-border text-foreground hover:bg-border">
            <ArrowLeft className="h-4 w-4 mr-2" /> Volver a Despachos
          </Button>
        </Link>
      </div>
    );
  }

  const isPendingPack = fulfillment.status === FulfillmentStatus.PendingPack;
  const isPacked = fulfillment.status === FulfillmentStatus.Packed;
  const isDispatched = fulfillment.status === FulfillmentStatus.Dispatched;
  const isDelivered = fulfillment.status === FulfillmentStatus.Delivered;
  const isCancelled = fulfillment.status === FulfillmentStatus.Cancelled;

  return (
    <div className="space-y-8 w-full max-w-full">
      {/* ── Encabezado ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              to="/logistics/fulfillments"
              className="text-foreground-muted hover:text-foreground transition-colors mr-1"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
              Estación Operativa de Despacho
            </h1>
            <Badge variant="outline" className="border-border text-brand font-mono text-xs">
              #{fulfillment.id.substring(0, 8)}
            </Badge>
          </div>
          <p className="text-sm text-foreground-muted">
            Transición secuencial de empaque, despacho y entrega de paquetes en la red Zentric.
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

      {/* ── Feedback de Operación ────────────────────────────────────────── */}
      {actionSuccess && (
        <Alert className="border-brand/40 bg-brand/10 text-brand">
          <CheckCircle className="h-4 w-4 text-brand" />
          <AlertTitle>Operación Exitosa</AlertTitle>
          <AlertDescription className="text-xs">{actionSuccess}</AlertDescription>
        </Alert>
      )}

      {actionError && (
        <Alert variant="destructive" className="border-red-900 bg-red-950/40 text-red-200">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertTitle>Error en la Operación</AlertTitle>
          <AlertDescription className="text-xs">{actionError}</AlertDescription>
        </Alert>
      )}

      {/* ── Split-Frame (60% / 40%) ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Lado Izquierdo (60%): Expediente de Despacho y Guías ──────────── */}
        <section className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <span className="text-[11px] font-mono text-foreground-muted block">ORDEN DE ENVÍO</span>
                <h3 className="text-lg font-bold text-foreground mt-0.5">
                  Despacho #{fulfillment.id}
                </h3>
              </div>
              <Badge
                variant="outline"
                className={`font-mono text-xs ${
                  fulfillment.status === FulfillmentStatus.PendingPack
                    ? 'border-warning/40 text-warning bg-warning/10'
                    : fulfillment.status === FulfillmentStatus.Packed || fulfillment.status === FulfillmentStatus.Dispatched
                    ? 'border-brand/40 text-brand bg-brand/10'
                    : fulfillment.status === FulfillmentStatus.Delivered
                    ? 'border-emerald-400/40 text-emerald-300 bg-emerald-500/10'
                    : 'border-red-400/40 text-red-400 bg-red-400/10'
                }`}
              >
                {NOMBRES_DE_ESTADO_DE_DESPACHO[fulfillment.status] ?? fulfillment.status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-surface-muted/60 border border-border">
                <span className="text-foreground-muted block text-[11px] font-sans">Pedido Relacionado</span>
                <span className="text-foreground mt-1 block font-mono font-semibold">#{fulfillment.customerOrderId}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-muted/60 border border-border">
                <span className="text-foreground-muted block text-[11px] font-sans">Vendedor Titular</span>
                <span className="text-brand mt-1 block font-semibold">
                  {fulfillment.vendorId === '0b01129d-c0a9-4325-8394-4b9e636a4e88'
                    ? 'Valeria Mendoza (seller@zentric.local)'
                    : `Vendedor #${fulfillment.vendorId.substring(0, 8)}`}
                </span>
                <span className="text-[10px] font-mono text-foreground-muted block mt-0.5">
                  ID: {fulfillment.vendorId}
                </span>
              </div>
            </div>

            {/* Guías y Envíos Físicos */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground-muted font-sans flex items-center gap-2">
                <Truck className="h-4 w-4 text-brand" />
                Envíos y Guías de Transporte
              </h4>

              {fulfillment.shipments && fulfillment.shipments.length > 0 ? (
                <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                  {fulfillment.shipments.map((s, idx) => (
                    <div key={s.id || idx} className="p-3 bg-surface-muted/40 flex justify-between items-center text-xs">
                      <div>
                        <span className="text-foreground font-mono">Guía: {s.trackingNumber}</span>
                        <span className="text-[11px] text-foreground-muted block font-mono">
                          Bodega: #{s.warehouseId.substring(0, 8)}
                        </span>
                      </div>
                      <Badge variant="outline" className="border-border text-brand text-[10px] font-mono">
                        Asignada
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-surface-muted/40 border border-border text-xs text-foreground-muted">
                  Guías de transporte pendientes de generación por transportadora.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Lado Derecho (40%): Estación de Transición Secuencial ─────────── */}
        <section className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl border border-border bg-surface p-6 space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground font-sans flex items-center gap-2">
              <Package className="h-4 w-4 text-brand" />
              Transición de Estado
            </h3>

            {/* Botón de Empaque */}
            {isPendingPack && (
              <div className="space-y-3">
                <p className="text-xs text-foreground-muted leading-relaxed">
                  El paquete se encuentra en cola de empaque. Verifique unidades físicas en bodega antes de sellar.
                </p>
                <Button
                  onClick={handlePack}
                  disabled={packMutation.isPending}
                  className="w-full bg-brand text-primary-foreground hover:bg-brand/90 font-semibold text-xs transition-all active:scale-[0.98]"
                >
                  <Package className="h-4 w-4 mr-2" />
                  {packMutation.isPending ? 'Empacando...' : 'Registrar Empaque (Packed)'}
                </Button>
              </div>
            )}

            {/* Botón de Despacho */}
            {isPacked && (
              <div className="space-y-3">
                <p className="text-xs text-foreground-muted leading-relaxed">
                  El paquete está sellado y listo en muelle de carga. Registre la salida con la transportadora.
                </p>
                <Button
                  onClick={handleDispatch}
                  disabled={dispatchMutation.isPending}
                  className="w-full bg-warning text-primary-foreground hover:bg-warning/90 font-semibold text-xs transition-all active:scale-[0.98]"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {dispatchMutation.isPending ? 'Despachando...' : 'Despachar Paquete (Dispatched)'}
                </Button>
              </div>
            )}

            {/* Botón Exclusivo de Entrega */}
            {isDispatched && (
              <div className="space-y-3">
                <p className="text-xs text-foreground-muted leading-relaxed">
                  El paquete se encuentra en tránsito. Certifique la entrega efectiva en el domicilio del comprador.
                </p>
                <Button
                  onClick={handleDeliver}
                  disabled={deliverMutation.isPending}
                  className="w-full bg-brand text-primary-foreground hover:bg-brand/90 font-bold text-xs transition-all active:scale-[0.98]"
                >
                  <CheckCheck className="h-4 w-4 mr-2" />
                  {deliverMutation.isPending ? 'Certificando...' : 'Certificar Entrega al Comprador (Delivered)'}
                </Button>
              </div>
            )}

            {isDelivered && (
              <div className="p-4 rounded-xl bg-brand/10 border border-brand/30 text-center space-y-1">
                <CheckCircle className="h-6 w-6 text-brand mx-auto" />
                <h4 className="text-xs font-bold text-brand uppercase tracking-wider">
                  Entrega Certificada
                </h4>
                <p className="text-[11px] text-foreground-muted">
                  Ciclo de despacho cerrado exitosamente. El comprador ha recibido el producto.
                </p>
              </div>
            )}

            {isCancelled && (
              <div className="p-4 rounded-xl bg-red-950/30 border border-red-900/40 text-center space-y-1">
                <Ban className="h-6 w-6 text-red-400 mx-auto" />
                <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider">
                  Despacho Cancelado
                </h4>
                {fulfillment.cancellationReason && (
                  <p className="text-[11px] text-red-300 font-mono">
                    {fulfillment.cancellationReason}
                  </p>
                )}
              </div>
            )}

            {/* Acción de Quiebre por Stock Fantasma (ADR-0014) */}
            {!isDelivered && !isCancelled && (
              <div className="pt-3 border-t border-border">
                <Link
                  to="/logistics/fulfillments/$id/ghost-stock"
                  params={{ id: fulfillment.id }}
                >
                  <Button
                    variant="outline"
                    className="w-full border-red-900/60 text-red-400 hover:bg-red-950/40 hover:text-red-300 text-xs"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                    Reportar Quiebre de Stock Fantasma
                  </Button>
                </Link>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-brand">
              <ShieldCheck className="h-4 w-4" />
              <span>Potestad Exclusiva de Entrega</span>
            </div>
            <p className="text-[11px] text-foreground-muted leading-relaxed">
              La certificación de entrega (`Delivered`) es potestad exclusiva del Operador Logístico (política `FulfillmentDeliver`). El Vendedor tiene prohibida esta acción para prevenir fraudes en la liquidación de fondos.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
