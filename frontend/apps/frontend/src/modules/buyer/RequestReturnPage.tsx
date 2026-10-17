import { useState } from 'react';
import { useSearch, Link, useNavigate } from '@tanstack/react-router';
import { useOrdersQuery, useOrderQuery } from '../../application/services/orders';
import { useFulfillmentsQuery } from '../../application/services/logistics';
import { useWarehousesQuery } from '../../application/services/warehouses';
import { useRequestReturnMutation } from '../../application/services/returns';
import { OrderStatus, type Order, type OrderItem, type FulfillmentOrder, type Warehouse } from '../../domain';
import {
  Button,
  Input,
  Badge,
  Skeleton,
  Alert,
  AlertTitle,
  AlertDescription,
} from '@zentric/ui';
import {
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Package,
  ShieldAlert,
} from 'lucide-react';

/**
 * Solicitud de Devolución para el Comprador (Frontend-Role-Modules §2.4 y Frontend-User-Flows §5).
 * Valida que el pedido esté en Delivered, permite seleccionar la variante física a devolver
 * y registra la solicitud técnica en el backend.
 */
export function RequestReturnPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { orderId?: string };

  const { data: deliveredOrders, isLoading: isLoadingOrders } = useOrdersQuery(OrderStatus.Delivered);
  const { data: warehouses } = useWarehousesQuery();
  const { data: fulfillments } = useFulfillmentsQuery();

  const requestReturnMutation = useRequestReturnMutation();

  const [selectedOrderId, setSelectedOrderId] = useState<string>(search?.orderId ?? '');
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Consultar detalle del pedido seleccionado
  const { data: selectedOrderData } = useOrderQuery(selectedOrderId);
  const selectedOrder = selectedOrderData as Order | undefined;

  const orderItems: OrderItem[] = selectedOrder?.items ?? [];

  // Fulfillments de la orden para deducir bodega física de recepción
  const orderFulfillments: FulfillmentOrder[] = (fulfillments ?? []).filter(
    (f: FulfillmentOrder) => f.customerOrderId === selectedOrderId
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId || !selectedVariantId) {
      setFeedback({ type: 'error', message: 'Debe seleccionar un pedido entregado y una variante.' });
      return;
    }

    if (quantity <= 0) {
      setFeedback({ type: 'error', message: 'La cantidad debe ser mayor a cero.' });
      return;
    }

    // Determinar bodega de destino (de los despachos o la primera bodega disponible)
    const targetWarehouseId =
      selectedWarehouseId ||
      orderFulfillments[0]?.shipments?.[0]?.warehouseId ||
      warehouses?.[0]?.id ||
      '00000000-0000-0000-0000-000000000001';

    try {
      await requestReturnMutation.mutateAsync({
        customerOrderId: selectedOrderId,
        variantId: selectedVariantId,
        warehouseId: targetWarehouseId,
        quantity,
      });

      setFeedback({
        type: 'success',
        message: 'Solicitud de devolución registrada exitosamente. Pendiente de recepción física en bodega.',
      });

      setTimeout(() => {
        navigate({ to: '/buyer/orders/$orderId', params: { orderId: selectedOrderId } });
      }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar la solicitud de devolución.';
      setFeedback({ type: 'error', message: msg });
    }
  };

  if (isLoadingOrders) {
    return (
      <div className="space-y-6 p-6 sm:p-10 max-w-4xl mx-auto w-full">
        <Skeleton className="h-8 w-48 bg-[#111827]" />
        <Skeleton className="h-96 rounded-2xl bg-[#111827]" />
      </div>
    );
  }

  const eligibleOrders = deliveredOrders ?? [];

  return (
    <div className="space-y-8 p-6 sm:p-8 lg:p-10 max-w-3xl mx-auto w-full">
      {/* ── Encabezado ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#1F293D]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link to="/buyer/orders">
              <Button variant="outline" size="sm" className="border-[#1F293D] text-[#94A3B8] hover:text-white mr-2">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
              Solicitud de Devolución
            </h1>
          </div>
          <p className="text-sm font-mono text-[#94A3B8]">
            Aplica exclusivamente a productos físicos en estado Entregado (Delivered) dentro de los 30 días.
          </p>
        </div>
      </div>

      {feedback && (
        <Alert
          variant={feedback.type === 'success' ? 'default' : 'destructive'}
          className={
            feedback.type === 'success'
              ? 'border-[#00D4AA]/40 bg-[#00D4AA]/10 text-[#00D4AA]'
              : 'border-red-900 bg-red-950/40 text-red-200'
          }
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-[#00D4AA]" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-400" />
          )}
          <AlertTitle>{feedback.type === 'success' ? 'Solicitud Enviada' : 'Error de Validación'}</AlertTitle>
          <AlertDescription className="text-xs font-mono mt-1">{feedback.message}</AlertDescription>
        </Alert>
      )}

      {/* ── Formulario de Solicitud ─────────────────────────────────────── */}
      <form noValidate onSubmit={handleSubmit} className="rounded-2xl border border-[#1F293D] bg-[#111827] p-6 sm:p-8 space-y-6 shadow-xl">
        {/* Selección de Pedido */}
        <div className="space-y-2">
          <label className="text-xs font-mono uppercase text-[#94A3B8] block">
            1. Seleccione el Pedido Entregado
          </label>
          <select
            value={selectedOrderId}
            onChange={(e) => {
              setSelectedOrderId(e.target.value);
              setSelectedVariantId('');
            }}
            className="w-full rounded-lg border border-[#1F293D] bg-[#161F30] px-3.5 py-2.5 text-sm font-mono text-white focus:border-[#00D4AA] focus:outline-none"
          >
            <option value="">-- Seleccionar Pedido --</option>
            {eligibleOrders.map((o) => (
              <option key={o.id} value={o.id}>
                Pedido #{o.id.slice(0, 8)} • {o.currency} ${o.totalAmount.toLocaleString('es-CO')} ({o.status})
              </option>
            ))}
          </select>
          {eligibleOrders.length === 0 && (
            <p className="text-xs font-mono text-[#FFB800]">
              No cuenta con pedidos en estado Entregado (Delivered) disponibles para devolución.
            </p>
          )}
        </div>

        {/* Selección de Variante de la Orden */}
        {selectedOrderId && (
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase text-[#94A3B8] block">
              2. Variante del Producto a Devolver
            </label>
            {orderItems.length === 0 ? (
              <p className="text-xs font-mono text-[#64748B]">Cargando ítems del pedido...</p>
            ) : (
              <div className="space-y-2">
                {orderItems.map((item: OrderItem) => {
                  const isSelected = selectedVariantId === item.variantId;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedVariantId(item.variantId);
                        setQuantity(1);
                      }}
                      className={`cursor-pointer rounded-xl border p-4 transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-[#00D4AA] bg-[#00D4AA]/10'
                          : 'border-[#1F293D] bg-[#161F30]/60 hover:border-[#94A3B8]/40'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-[#00D4AA]" />
                          <span className="text-xs font-mono font-bold text-white">
                            Variante SKU: {item.variantId.slice(0, 8)}
                          </span>
                        </div>
                        <p className="text-xs font-mono text-[#64748B]">
                          Cantidad comprada: {item.quantity} ud(s) • Total: ${item.totalPrice.toLocaleString('es-CO')}
                        </p>
                      </div>

                      <Badge
                        variant="outline"
                        className={isSelected ? 'border-[#00D4AA] text-[#00D4AA]' : 'border-[#1F293D] text-[#64748B]'}
                      >
                        {isSelected ? 'Seleccionado' : 'Elegir'}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Cantidad a Devolver */}
        {selectedVariantId && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-[#94A3B8] block">
                3. Cantidad a Devolver
              </label>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="bg-[#161F30] border-[#1F293D] font-mono text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-[#94A3B8] block">
                Bodega de Recepción
              </label>
              <select
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                className="w-full rounded-lg border border-[#1F293D] bg-[#161F30] px-3.5 py-2 text-sm font-mono text-white focus:border-[#00D4AA] focus:outline-none"
              >
                <option value="">Bodega por defecto del despacho</option>
                {(warehouses ?? []).map((w: Warehouse) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.type})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Motivo de la Devolución */}
        <div className="space-y-2">
          <label className="text-xs font-mono uppercase text-[#94A3B8] block">
            4. Motivo de la Solicitud
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Describa el motivo técnico o comercial de la devolución..."
            className="w-full rounded-lg border border-[#1F293D] bg-[#161F30] p-3 text-sm font-sans text-white placeholder-[#64748B] focus:border-[#00D4AA] focus:outline-none"
          />
        </div>

        {/* Advertencia Legal / Dominio */}
        <div className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-4 space-y-1 text-xs">
          <div className="flex items-center gap-2 text-[#FFB800] font-mono font-bold">
            <ShieldAlert className="h-4 w-4" />
            Condiciones de Devolución (ZENTRIC.md Dominio 10 y 11)
          </div>
          <p className="text-[#94A3B8] leading-relaxed">
            Al registrar la solicitud, un Operador Logístico inspeccionará el paquete físico en bodega. Si el dictamen es favorable, el vendedor podrá aprobar el reingreso como stock usado y se autorizará el reembolso financiero.
          </p>
        </div>

        {/* Botón de Envío */}
        <Button
          type="submit"
          disabled={!selectedOrderId || !selectedVariantId || requestReturnMutation.isPending}
          className="w-full h-12 bg-[#00D4AA] hover:bg-[#00D4AA]/90 text-[#0B0F19] font-bold text-sm shadow-lg shadow-[#00D4AA]/20 disabled:opacity-40"
        >
          {requestReturnMutation.isPending ? (
            <span className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 animate-spin" />
              Registrando solicitud...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              Enviar Solicitud de Devolución
            </span>
          )}
        </Button>
      </form>
    </div>
  );
}
