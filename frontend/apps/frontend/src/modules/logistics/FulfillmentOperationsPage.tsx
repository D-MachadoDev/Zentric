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
      <div className="space-y-8 p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full">
        <Skeleton className="h-10 w-64 bg-[#111827]" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <Skeleton className="lg:col-span-7 h-96 rounded-2xl bg-[#111827]" />
          <Skeleton className="lg:col-span-5 h-96 rounded-2xl bg-[#111827]" />
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
          <Button variant="outline" className="border-[#1F293D] text-white hover:bg-[#1F293D]">
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
    <div className="space-y-8 p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full">
      {/* ── Encabezado ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#1F293D]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              to="/logistics/fulfillments"
              className="text-[#94A3B8] hover:text-white transition-colors mr-1"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
              Estación Operativa de Despacho
            </h1>
            <Badge variant="outline" className="border-[#1F293D] text-[#00D4AA] font-mono text-xs">
              #{fulfillment.id.substring(0, 8)}
            </Badge>
          </div>
          <p className="text-sm text-[#94A3B8]">
            Transición secuencial de empaque, despacho y entrega de paquetes en la red Zentric.
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

      {/* ── Feedback de Operación ────────────────────────────────────────── */}
      {actionSuccess && (
        <Alert className="border-[#00D4AA]/40 bg-[#00D4AA]/10 text-[#00D4AA]">
          <CheckCircle className="h-4 w-4 text-[#00D4AA]" />
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
          <div className="rounded-2xl border border-[#1F293D] bg-[#111827] p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-[#1F293D] pb-4">
              <div>
                <span className="text-[11px] font-mono text-[#64748B] block">ORDEN DE ENVÍO</span>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  Despacho #{fulfillment.id}
                </h3>
              </div>
              <Badge
                variant="outline"
                className="border-[#1F293D] text-[#00D4AA] font-mono text-xs"
              >
                {fulfillment.status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3.5 rounded-xl bg-[#161F30]/60 border border-[#1F293D]">
                <span className="text-[#94A3B8] block text-[11px] font-sans">Pedido Relacionado</span>
                <span className="text-white mt-1 block">#{fulfillment.customerOrderId}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#161F30]/60 border border-[#1F293D]">
                <span className="text-[#94A3B8] block text-[11px] font-sans">Vendedor Titular</span>
                <span className="text-[#00D4AA] mt-1 block">#{fulfillment.vendorId}</span>
              </div>
            </div>

            {/* Guías y Envíos Físicos */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] font-sans flex items-center gap-2">
                <Truck className="h-4 w-4 text-[#00D4AA]" />
                Envíos y Guías de Transporte
              </h4>

              {fulfillment.shipments && fulfillment.shipments.length > 0 ? (
                <div className="divide-y divide-[#1F293D] rounded-xl border border-[#1F293D] overflow-hidden">
                  {fulfillment.shipments.map((s, idx) => (
                    <div key={s.id || idx} className="p-3 bg-[#161F30]/40 flex justify-between items-center text-xs">
                      <div>
                        <span className="text-white font-mono">Guía: {s.trackingNumber}</span>
                        <span className="text-[11px] text-[#64748B] block font-mono">
                          Bodega: #{s.warehouseId.substring(0, 8)}
                        </span>
                      </div>
                      <Badge variant="outline" className="border-[#1F293D] text-[#00D4AA] text-[10px] font-mono">
                        Asignada
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[#161F30]/40 border border-[#1F293D] text-xs text-[#94A3B8]">
                  Guías de transporte pendientes de generación por transportadora.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Lado Derecho (40%): Estación de Transición Secuencial ─────────── */}
        <section className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl border border-[#1F293D] bg-[#111827] p-6 space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white font-sans flex items-center gap-2">
              <Package className="h-4 w-4 text-[#00D4AA]" />
              Transición de Estado
            </h3>

            {/* Botón de Empaque */}
            {isPendingPack && (
              <div className="space-y-3">
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  El paquete se encuentra en cola de empaque. Verifique unidades físicas en bodega antes de sellar.
                </p>
                <Button
                  onClick={handlePack}
                  disabled={packMutation.isPending}
                  className="w-full bg-[#00D4AA] text-[#0B0F19] hover:bg-[#00D4AA]/90 font-semibold text-xs"
                >
                  <Package className="h-4 w-4 mr-2" />
                  {packMutation.isPending ? 'Empacando...' : 'Registrar Empaque (Packed)'}
                </Button>
              </div>
            )}

            {/* Botón de Despacho */}
            {isPacked && (
              <div className="space-y-3">
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  El paquete está sellado y listo en muelle de carga. Registre la salida con la transportadora.
                </p>
                <Button
                  onClick={handleDispatch}
                  disabled={dispatchMutation.isPending}
                  className="w-full bg-[#FFB800] text-[#0B0F19] hover:bg-[#FFB800]/90 font-semibold text-xs"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {dispatchMutation.isPending ? 'Despachando...' : 'Despachar Paquete (Dispatched)'}
                </Button>
              </div>
            )}

            {/* Botón Exclusivo de Entrega */}
            {isDispatched && (
              <div className="space-y-3">
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  El paquete se encuentra en tránsito. Certifique la entrega efectiva en el domicilio del comprador.
                </p>
                <Button
                  onClick={handleDeliver}
                  disabled={deliverMutation.isPending}
                  className="w-full bg-[#00D4AA] text-[#0B0F19] hover:bg-[#00D4AA]/90 font-bold text-xs"
                >
                  <CheckCheck className="h-4 w-4 mr-2" />
                  {deliverMutation.isPending ? 'Certificando...' : 'Certificar Entrega al Comprador (Delivered)'}
                </Button>
              </div>
            )}

            {isDelivered && (
              <div className="p-4 rounded-xl bg-[#00D4AA]/10 border border-[#00D4AA]/30 text-center space-y-1">
                <CheckCircle className="h-6 w-6 text-[#00D4AA] mx-auto" />
                <h4 className="text-xs font-bold text-[#00D4AA] uppercase tracking-wider">
                  Entrega Certificada
                </h4>
                <p className="text-[11px] text-[#94A3B8]">
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
              <div className="pt-3 border-t border-[#1F293D]">
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

          <div className="rounded-2xl border border-[#1F293D] bg-[#111827] p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#00D4AA]">
              <ShieldCheck className="h-4 w-4" />
              <span>Potestad Exclusiva de Entrega</span>
            </div>
            <p className="text-[11px] text-[#94A3B8] leading-relaxed">
              La certificación de entrega (`Delivered`) es potestad exclusiva del Operador Logístico (política `FulfillmentDeliver`). El Vendedor tiene prohibida esta acción para prevenir fraudes en la liquidación de fondos.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
