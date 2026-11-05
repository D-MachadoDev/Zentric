import { useState } from 'react';
import { useSearch, Link, useNavigate } from '@tanstack/react-router';
import { useOrdersQuery, useOrderQuery } from '../../core';
import { useRequestReturnMutation } from '../../core';
import { OrderStatus, type Order, type OrderItem } from '../../core';
import {
  Button,
  Input,
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
 * Solicitud de Devolución para el Comprador (Frontend-Role-Modules sección 2.4 y Frontend-User-Flows sección 5).
 * Valida que el pedido esté en Delivered, permite seleccionar la variante física a devolver
 * y registra la solicitud técnica en el backend. La bodega de recepción la resuelve el sistema.
 */
export function RequestReturnPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { orderId?: string };

  const { data: deliveredOrders, isLoading: isLoadingOrders } = useOrdersQuery(OrderStatus.Delivered);

  const requestReturnMutation = useRequestReturnMutation();

  const [selectedOrderId, setSelectedOrderId] = useState<string>(search?.orderId ?? '');
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<string>('');
  const [acceptedTerms, setAcceptedTerms] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Consultar detalle del pedido seleccionado
  const { data: selectedOrderData } = useOrderQuery(selectedOrderId);
  const selectedOrder = selectedOrderData as Order | undefined;

  const orderItems: OrderItem[] = selectedOrder?.items ?? [];

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

    if (!acceptedTerms) {
      setFeedback({ type: 'error', message: 'Debe aceptar los términos y condiciones de devolución.' });
      return;
    }

    try {
      await requestReturnMutation.mutateAsync({
        customerOrderId: selectedOrderId,
        variantId: selectedVariantId,
        quantity,
      });

      setFeedback({
        type: 'success',
        message: 'Solicitud de devolución registrada exitosamente. Pendiente de recepción física en bodega.',
      });

      setTimeout(() => {
        navigate({ to: '/buyer/orders' });
      }, 2000);
    } catch (error: any) {
      setFeedback({
        type: 'error',
        message: error?.message || 'Error al registrar la devolución.',
      });
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-border pb-4">
        <Link to="/buyer/orders" className="p-2 rounded-lg hover:bg-surface-muted text-foreground-muted hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <RotateCcw className="h-6 w-6 text-brand" />
            Solicitud de Devolución
          </h1>
          <p className="text-sm text-foreground-muted mt-1">
            Proceso de devolución asistido (Garantía Legal de 30 días). Selecciona el pedido entregado y el artículo a devolver.
          </p>
        </div>
      </div>

      {feedback && (
        <Alert variant={feedback.type === 'success' ? 'default' : 'destructive'} className="border-border bg-surface">
          {feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <AlertTitle className="text-sm font-bold">{feedback.type === 'success' ? 'Éxito' : 'Error'}</AlertTitle>
          <AlertDescription className="text-xs">{feedback.message}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-6 bg-surface border border-border rounded-2xl p-6 shadow-sm">
        {/* Selección de Pedido */}
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider font-semibold text-foreground-muted block">
            1. Pedido Entregado
          </label>
          {isLoadingOrders ? (
            <Skeleton className="h-10 w-full" />
          ) : (deliveredOrders ?? []).length === 0 ? (
            <div className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-xs text-warning">
              No cuenta con pedidos en estado Entregado para solicitar devoluciones.
            </div>
          ) : (
            <select
              value={selectedOrderId}
              onChange={(e) => {
                setSelectedOrderId(e.target.value);
                setSelectedVariantId('');
              }}
              className="w-full rounded-lg border border-border bg-surface-muted px-3.5 py-2 text-sm text-foreground focus:border-brand focus:outline-none"
            >
              <option value="">-- Seleccionar Pedido --</option>
              {(deliveredOrders ?? []).map((order: any) => (
                <option key={order.id} value={order.id}>
                  Orden #{order.id.slice(0, 8)} - {new Date(order.createdAt || Date.now()).toLocaleDateString()}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Selección de Variante */}
        {selectedOrder && (
          <div className="space-y-4 animate-in fade-in">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider font-semibold text-foreground-muted block">
                2. Artículo a Devolver
              </label>
              <div className="grid grid-cols-1 gap-3">
                {orderItems.map((item: OrderItem) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedVariantId(item.variantId)}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedVariantId === item.variantId
                        ? 'border-brand bg-brand/5'
                        : 'border-border bg-surface-muted hover:border-brand/50'
                    }`}
                  >
                    <div className="h-10 w-10 bg-surface rounded-lg flex items-center justify-center border border-border/50">
                      <Package className="h-5 w-5 text-foreground-muted" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">Variante SKU: {item.variantId}</p>
                      <p className="text-xs text-foreground-muted">Cantidad comprada: {item.quantity}</p>
                    </div>
                    {selectedVariantId === item.variantId && <CheckCircle2 className="h-5 w-5 text-brand" />}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider font-semibold text-foreground-muted block">
                  3. Cantidad a Devolver
                </label>
                <Input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="bg-surface-muted border-border text-foreground"
                />
              </div>
            </div>
          </div>
        )}

        {/* Motivo de la Devolución */}
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider font-semibold text-foreground-muted block">
            4. Motivo de la Solicitud
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Describa el motivo técnico o comercial de la devolución..."
            className="w-full rounded-lg border border-border bg-surface-muted p-3 text-sm font-sans text-foreground placeholder-foreground-muted focus:border-brand focus:outline-none"
          />
        </div>

        {/* Advertencia Legal / Dominio */}
        <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 space-y-1 text-xs">
          <div className="flex items-center gap-2 text-warning font-semibold text-sm">
            <ShieldAlert className="h-4 w-4" />
            Condiciones de Devolución (Garantía Legal)
          </div>
          <p className="text-foreground-muted leading-relaxed">
            Tienes hasta 30 días corridos desde la entrega para solicitar la devolución. Al registrar la solicitud, un Operador Logístico inspeccionará el paquete físico en bodega. Si el dictamen es favorable, el vendedor podrá aprobar el reingreso como stock usado y se autorizará el reembolso financiero.
          </p>
        </div>

        {/* Aceptación de términos */}
        <label className="flex items-start gap-2 text-xs text-foreground-muted cursor-pointer">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            Acepto los{' '}
            <Link to="/terms" className="text-brand underline">
              Términos y Condiciones
            </Link>{' '}
            y las Políticas de Devolución de Zentric (estilo Mercado Libre: el comprador asume el envío de vuelta salvo defecto de fábrica).
          </span>
        </label>

        {/* Botón de Envío */}
        <Button
          type="submit"
          disabled={!selectedOrderId || !selectedVariantId || !acceptedTerms || requestReturnMutation.isPending}
          className="w-full h-12 bg-brand hover:bg-brand/90 text-primary-foreground font-bold text-sm shadow-lg shadow-brand/20 disabled:opacity-40"
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
