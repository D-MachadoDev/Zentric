import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from '@tanstack/react-router';
import { useOrderQuery, usePayOrderMutation } from '../../application/services/orders';
import { OrderStatus, type Order } from '../../domain';
import {
  Button,
  Input,
  Badge,
  Skeleton,
  Alert,
  AlertTitle,
  AlertDescription,
  MoneyAmount,
} from '@zentric/ui';
import {
  ArrowLeft,
  CreditCard,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Lock,
} from 'lucide-react';

/**
 * Consola de Pago y Reserva Atómica de 15 Minutos para el Comprador (Frontend-Role-Modules §2.4 y Frontend-User-Flows §2).
 * Incluye temporizador determinista en Geist Mono tabular-nums con alerta ámbar #FFB800,
 * y formulario de pago simulado que invoca usePayOrderMutation().
 */
export function BuyerOrderPaymentPage() {
  const { orderId } = useParams({ strict: false }) as { orderId?: string };
  const navigate = useNavigate();

  const { data: orderData, isLoading, isError, error } = useOrderQuery(orderId ?? '');
  const payOrderMutation = usePayOrderMutation();

  // Reloj regresivo de 15 minutos (900 segundos)
  const [secondsRemaining, setSecondsRemaining] = useState<number>(900);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Campos de tarjeta simulada
  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 8821');
  const [cardHolder, setCardHolder] = useState('COMPRADOR ZENTRIC');
  const [expiry, setExpiry] = useState('12/28');
  const [cvv, setCvv] = useState('742');

  useEffect(() => {
    if (secondsRemaining <= 0) {
      setIsExpired(true);
      return;
    }

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsRemaining]);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isUrgent = secondsRemaining > 0 && secondsRemaining <= 180;

  const handlePay = async () => {
    if (!orderId || isExpired) return;
    setPaymentError(null);

    try {
      await payOrderMutation.mutateAsync(orderId);
      // Tras pago exitoso, navegar a la vista de confirmación del pedido
      navigate({
        to: '/buyer/orders/$orderId',
        params: { orderId },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar el pago.';
      setPaymentError(msg);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6 sm:p-10 max-w-4xl mx-auto w-full">
        <Skeleton className="h-8 w-48 bg-surface" />
        <Skeleton className="h-96 rounded-2xl bg-surface" />
      </div>
    );
  }

  if (isError || !orderData) {
    return (
      <div className="p-6 sm:p-10 max-w-4xl mx-auto w-full space-y-4">
        <Link to="/buyer/orders">
          <Button variant="outline" size="sm" className="border-border text-foreground-muted">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Volver a Mis Pedidos
          </Button>
        </Link>
        <Alert variant="destructive" className="border-red-900 bg-red-950/40 text-red-200">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <AlertTitle>Error al consultar el pedido para pago</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'No fue posible cargar la información de pago.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const order = orderData as Order;

  // Si ya fue pagado previamente
  if (order.status !== OrderStatus.PendingPayment && order.status !== OrderStatus.Cart) {
    return (
      <div className="p-6 sm:p-10 max-w-2xl mx-auto w-full space-y-6 text-center">
        <div className="rounded-2xl border border-brand/30 bg-surface p-8 space-y-4 shadow-xl">
          <CheckCircle2 className="h-16 w-16 text-brand mx-auto" />
          <h1 className="text-2xl font-bold text-foreground font-sans">
            Este pedido ya fue procesado
          </h1>
          <p className="text-sm text-foreground-muted">
            El pedido #{order.id.slice(0, 8)} se encuentra en estado{' '}
            <strong className="text-foreground font-mono">{order.status}</strong> y no requiere pago adicional.
          </p>
          <Link to="/buyer/orders/$orderId" params={{ orderId: order.id }}>
            <Button className="bg-brand text-primary-foreground font-bold">
              Ver Expediente de Pedido
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 sm:p-8 lg:p-10 max-w-4xl mx-auto w-full">
      {/* ── Encabezado ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link to="/buyer/orders">
              <Button variant="outline" size="sm" className="border-border text-foreground-muted hover:text-foreground mr-2">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
              Pasarela de Pago
            </h1>
          </div>
          <p className="text-sm font-mono text-foreground-muted">
            Pedido #{order.id.slice(0, 8)} • Total a debitar:{' '}
            <MoneyAmount amount={order.totalAmount} currency={order.currency} />
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-brand">
          <Lock className="h-4 w-4" /> Conexión Cifrada SSL
        </div>
      </div>

      {paymentError && (
        <Alert variant="destructive" className="border-red-900 bg-red-950/40 text-red-200">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <AlertTitle>Fallo en la transacción</AlertTitle>
          <AlertDescription className="text-xs font-mono">{paymentError}</AlertDescription>
        </Alert>
      )}

      {/* ── Reloj Regresivo de Reserva Atómica (15 Minutos) ───────────────── */}
      <div
        className={`rounded-2xl border p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
          isExpired
            ? 'border-red-800 bg-red-950/30'
            : isUrgent
            ? 'border-warning bg-warning/10 shadow-lg shadow-warning/10 animate-pulse'
            : 'border-border bg-surface'
        }`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`p-3 rounded-xl border ${
              isExpired
                ? 'border-red-700 bg-red-900/30 text-red-400'
                : isUrgent
                ? 'border-warning bg-warning/20 text-warning'
                : 'border-border bg-surface-muted text-brand'
            }`}
          >
            <Clock className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xs uppercase font-mono tracking-wider text-foreground-muted">
              {isExpired ? 'Reserva Expirada' : 'Tiempo Restante de Reserva Atómica'}
            </h2>
            <p className="text-xs text-foreground-muted">
              {isExpired
                ? 'La reserva de inventario ha expirado y las existencias han sido liberadas.'
                : isUrgent
                ? '¡Últimos minutos! Complete su pago para evitar la liberación de stock.'
                : 'El stock permanecerá bloqueado en bodega exclusivamente para usted durante esta ventana.'}
            </p>
          </div>
        </div>

        <div className="text-right sm:text-right">
          <div
            className={`text-3xl sm:text-4xl font-extrabold font-mono tabular-nums tracking-tight ${
              isExpired ? 'text-red-400' : isUrgent ? 'text-warning' : 'text-foreground'
            }`}
          >
            {formattedTime}
          </div>
          <span className="text-[10px] uppercase font-mono text-foreground-muted block mt-0.5">
            Minutos : Segundos
          </span>
        </div>
      </div>

      {/* ── Tarjeta de Pago Simulado ────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-brand" />
            <h2 className="text-sm uppercase font-mono tracking-wider text-foreground">
              Método de Pago (Simulación Sandbox)
            </h2>
          </div>
          <Badge variant="outline" className="text-xs font-mono border-border text-brand">
            Tarjeta Débito / Crédito
          </Badge>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase text-foreground-muted block">
              Número de Tarjeta
            </label>
            <Input
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              disabled={isExpired}
              className="bg-surface-muted border-border font-mono text-foreground"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <label className="text-xs font-mono uppercase text-foreground-muted block">
                Titular de la Tarjeta
              </label>
              <Input
                value={cardHolder}
                onChange={(e) => setCardHolder(e.target.value)}
                disabled={isExpired}
                className="bg-surface-muted border-border font-mono text-foreground"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-foreground-muted block">
                Vencimiento
              </label>
              <Input
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                disabled={isExpired}
                className="bg-surface-muted border-border font-mono text-foreground text-center"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-foreground-muted block">
                CVV
              </label>
              <Input
                value={cvv}
                onChange={(e) => setCvv(e.target.value)}
                disabled={isExpired}
                className="bg-surface-muted border-border font-mono text-foreground text-center"
              />
            </div>
          </div>
        </div>

        {/* Resumen Final de Débito */}
        <div className="p-4 rounded-xl border border-border bg-surface-muted/40 flex items-center justify-between font-mono">
          <span className="text-sm text-foreground-muted">Total a debitar:</span>
          <div className="text-xl font-bold text-brand tabular-nums">
            <MoneyAmount amount={order.totalAmount} currency={order.currency} />
          </div>
        </div>

        {/* Botón de Acción de Pago */}
        <Button
          onClick={handlePay}
          disabled={isExpired || payOrderMutation.isPending}
          className="w-full h-14 bg-brand hover:bg-brand/90 text-primary-foreground font-bold text-base shadow-xl shadow-brand/20 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {payOrderMutation.isPending ? (
            <span className="flex items-center gap-2">
              <Clock className="h-5 w-5 animate-spin" />
              Procesando transacción con el banco...
            </span>
          ) : isExpired ? (
            'Tiempo de reserva agotado (00:00)'
          ) : (
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Confirmar y Pagar Pedido ({order.currency} ${order.totalAmount.toLocaleString('es-CO')})
            </span>
          )}
        </Button>

        <div className="flex items-center justify-center gap-2 text-xs font-mono text-foreground-muted pt-2">
          <ShieldCheck className="h-4 w-4 text-brand" />
          <span>Al pagar, se emiten las facturas split y las órdenes de despacho por bodega.</span>
        </div>
      </div>
    </div>
  );
}
