import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from '@tanstack/react-router';
import {
  useOrderQuery,
  usePayOrderMutation,
  useCheckoutOrderMutation,
  useCancelOrderMutation,
} from '../../application/services/orders';
import {
  useUserProfileQuery,
  useUpdateUserProfileMutation,
} from '../../application/services/identity';
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
  MapPin,
  RefreshCw,
  Edit3,
  Truck,
  XCircle,
} from 'lucide-react';

/**
 * Consola de Pago y Reserva Atómica de 15 Minutos para el Comprador (Frontend-Role-Modules §2.4 y Frontend-User-Flows §2).
 * Incluye:
 * - Gestión en línea de Domicilio de Entrega estilo Mercado Libre (respaldada por GET/PUT /api/users/profile).
 * - Temporizador determinista en Geist Mono tabular-nums con reactivación de reserva de 15 min mientras exista stock disponible.
 * - Botón "Cancelar pedido y liberar reserva" para desistir inmediatamente sin esperar los 15 minutos.
 * - Formulario de pago que invoca usePayOrderMutation().
 */
export function BuyerOrderPaymentPage() {
  const { orderId } = useParams({ strict: false }) as { orderId?: string };
  const navigate = useNavigate();

  const { data: orderData, isLoading, isError, error, refetch } = useOrderQuery(orderId ?? '');
  const { data: profileData } = useUserProfileQuery();
  const updateProfileMutation = useUpdateUserProfileMutation();
  const payOrderMutation = usePayOrderMutation();
  const renewReservationMutation = useCheckoutOrderMutation();
  const cancelOrderMutation = useCancelOrderMutation();

  const calculateRemainingSeconds = () => {
    const expiresAt = (orderData as Order | undefined)?.expiresAt;
    if (!expiresAt) return 900;
    const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  };

  const [secondsRemaining, setSecondsRemaining] = useState<number>(() =>
    calculateRemainingSeconds(),
  );
  const [isExpired, setIsExpired] = useState<boolean>(false);

  const expiresAt = (orderData as Order | undefined)?.expiresAt;
  const [seenExpiresAt, setSeenExpiresAt] = useState<string | undefined>(expiresAt);

  if (seenExpiresAt !== expiresAt) {
    setSeenExpiresAt(expiresAt);
    const initialSeconds = calculateRemainingSeconds();
    setSecondsRemaining(initialSeconds);
    setIsExpired(initialSeconds <= 0);
  }

  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [renewalSuccess, setRenewalSuccess] = useState<string | null>(null);

  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [stateRegion, setStateRegion] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [phone, setPhone] = useState('');
  const [addressSavedMessage, setAddressSavedMessage] = useState<string | null>(null);
  const [seenProfileId, setSeenProfileId] = useState<string | undefined>(undefined);

  if (profileData && seenProfileId !== profileData.id) {
    setSeenProfileId(profileData.id);
    setStreet(profileData.address?.street ?? '');
    setCity(profileData.address?.city ?? '');
    setStateRegion(profileData.address?.state ?? '');
    setZipCode(profileData.address?.zipCode ?? '');
    setPhone(profileData.phone ?? '');
  }

  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 8821');
  const [cardHolder, setCardHolder] = useState('COMPRADOR ZENTRIC');
  const [expiry, setExpiry] = useState('12/28');
  const [cvv, setCvv] = useState('742');

  useEffect(() => {
    if (isExpired) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        let next: number;
        if (expiresAt) {
          const serverDiff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
          next = Math.min(prev - 1, serverDiff);
        } else {
          next = prev - 1;
        }

        if (next <= 0) {
          setIsExpired(true);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, isExpired]);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isUrgent = secondsRemaining > 0 && secondsRemaining <= 180;

  const handleSaveAddressInline = async () => {
    setAddressSavedMessage(null);
    try {
      await updateProfileMutation.mutateAsync({
        fullName: profileData?.fullName || 'Comprador Zentric',
        phone: phone.trim() || '+57 300 000 0000',
        documentNumber: profileData?.documentNumber || '1000000000',
        address: {
          street: street.trim(),
          city: city.trim(),
          state: stateRegion.trim(),
          zipCode: zipCode.trim() || '110111',
          country: profileData?.address?.country || 'Colombia',
        },
      });
      setIsEditingAddress(false);
      setAddressSavedMessage('Dirección de entrega actualizada para este pedido.');
      setTimeout(() => setAddressSavedMessage(null), 4000);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'No fue posible guardar la dirección de entrega.';
      setPaymentError(msg);
    }
  };

  const handleRenewReservation = async () => {
    if (!orderId) return;
    setPaymentError(null);
    setRenewalSuccess(null);
    try {
      await renewReservationMutation.mutateAsync(orderId);
      setSecondsRemaining(900);
      setIsExpired(false);
      setRenewalSuccess(
        '¡Reserva de stock renovada por 15 minutos adicionales! Ya puedes confirmar tu pago.',
      );
      void refetch();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'No fue posible renovar la reserva porque el stock ya no está disponible.';
      setPaymentError(msg);
    }
  };

  const handleCancelOrder = async () => {
    if (!orderId) return;
    setPaymentError(null);
    try {
      await cancelOrderMutation.mutateAsync(orderId);
      navigate({ to: '/buyer/orders' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No fue posible cancelar el pedido.';
      setPaymentError(msg);
    }
  };

  const handlePay = async () => {
    if (!orderId || isExpired) return;
    setPaymentError(null);

    try {
      await payOrderMutation.mutateAsync(orderId);
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
        <Alert variant="destructive" className="border-danger/30 bg-danger/10 text-danger">
          <AlertCircle className="h-5 w-5 text-danger" />
          <AlertTitle>Error al consultar el pedido para pago</AlertTitle>
          <AlertDescription>
            {error instanceof Error
              ? error.message
              : 'No fue posible cargar la información de pago.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const order = orderData as Order;

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
            <strong className="text-foreground font-mono">{order.status}</strong> y no requiere pago
            adicional.
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

  const canStillPayWithStock = order.canStillPay !== false;
  const hasAddressConfigured = Boolean(street.trim() && city.trim());

  return (
    <div className="space-y-6 p-6 sm:p-8 lg:p-10 max-w-4xl mx-auto w-full">
      {/* ── Encabezado ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link to="/buyer/orders">
              <Button
                variant="outline"
                size="sm"
                className="border-border text-foreground-muted hover:text-foreground mr-2"
              >
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

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleCancelOrder()}
            disabled={cancelOrderMutation.isPending}
            className="border-danger/40 text-danger hover:bg-danger/10 text-xs font-mono"
          >
            <XCircle className="h-3.5 w-3.5 mr-1.5" />
            {cancelOrderMutation.isPending ? 'Cancelando...' : 'Cancelar pedido'}
          </Button>
          <div className="flex items-center gap-2 text-xs font-mono text-brand">
            <Lock className="h-4 w-4" /> Conexión Cifrada SSL
          </div>
        </div>
      </div>

      {paymentError && (
        <Alert variant="destructive" className="border-danger/30 bg-danger/10 text-danger">
          <AlertCircle className="h-5 w-5 text-danger" />
          <AlertTitle>Fallo en la transacción</AlertTitle>
          <AlertDescription className="text-xs font-mono">{paymentError}</AlertDescription>
        </Alert>
      )}

      {renewalSuccess && (
        <Alert variant="success" className="border-brand/40 bg-brand/10 text-brand">
          <CheckCircle2 className="h-5 w-5 text-brand" />
          <AlertTitle>Reserva Reactivada</AlertTitle>
          <AlertDescription className="text-xs font-mono">{renewalSuccess}</AlertDescription>
        </Alert>
      )}

      {/* ── Paso 1: Domicilio de Entrega y Facturación (Estilo Mercado Libre) ── */}
      <div className="rounded-2xl border border-border bg-surface p-6 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand/30 bg-brand/10 text-brand">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-foreground font-sans">
                  Domicilio de Entrega
                </h2>
                <Badge variant="outline" className="border-brand/30 text-brand font-mono text-[10px]">
                  Envío Asegurado
                </Badge>
              </div>
              {hasAddressConfigured && !isEditingAddress ? (
                <p className="text-xs text-foreground-muted">
                  {street} · {city}, {stateRegion} ({zipCode || 'Colombia'}) · Tel: {phone}
                </p>
              ) : (
                <p className="text-xs text-foreground-muted">
                  Confirma o modifica la dirección física donde recibirás tu pedido.
                </p>
              )}
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsEditingAddress((v) => !v)}
            className="border-border text-brand hover:bg-surface-muted text-xs"
          >
            <Edit3 className="h-3.5 w-3.5 mr-1.5" />
            {isEditingAddress ? 'Cerrar edición' : 'Modificar dirección'}
          </Button>
        </div>

        {addressSavedMessage && (
          <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{addressSavedMessage}</span>
          </div>
        )}

        {isEditingAddress && (
          <div className="space-y-3 rounded-xl border border-border bg-surface-muted/40 p-4 pt-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[11px] font-mono uppercase text-foreground-muted block">
                  Dirección exacta (Calle, Carrera, Número, Apto/Oficina)
                </label>
                <Input
                  placeholder="Ej. Carrera 7 # 71-21, Apto 502"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="bg-surface border-border text-xs text-foreground"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-mono uppercase text-foreground-muted block">
                  Ciudad / Municipio
                </label>
                <Input
                  placeholder="Ej. Bogotá D.C."
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="bg-surface border-border text-xs text-foreground"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-mono uppercase text-foreground-muted block">
                  Departamento / Estado
                </label>
                <Input
                  placeholder="Ej. Cundinamarca"
                  value={stateRegion}
                  onChange={(e) => setStateRegion(e.target.value)}
                  className="bg-surface border-border text-xs text-foreground"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-mono uppercase text-foreground-muted block">
                  Código Postal
                </label>
                <Input
                  placeholder="110221"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  className="bg-surface border-border font-mono text-xs text-foreground"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-mono uppercase text-foreground-muted block">
                  Teléfono de Contacto para Entrega
                </label>
                <Input
                  placeholder="+57 300 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-surface border-border font-mono text-xs text-foreground"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditingAddress(false)}
                className="border-border text-foreground-muted text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => void handleSaveAddressInline()}
                disabled={updateProfileMutation.isPending}
                className="bg-brand text-primary-foreground font-semibold text-xs"
              >
                {updateProfileMutation.isPending
                  ? 'Guardando domicilio...'
                  : 'Guardar domicilio de entrega'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Paso 2: Reloj Regresivo de Reserva Atómica (15 Minutos) y Reactivación ── */}
      <div
        className={`rounded-2xl border p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
          isExpired
            ? canStillPayWithStock
              ? 'border-warning/50 bg-warning/10'
              : 'border-danger/30 bg-danger/10'
            : isUrgent
              ? 'border-warning bg-warning/10 shadow-lg shadow-warning/10 animate-pulse'
              : 'border-border bg-surface'
        }`}
      >
        <div className="flex items-start sm:items-center gap-4">
          <div
            className={`p-3 rounded-xl border shrink-0 ${
              isExpired
                ? canStillPayWithStock
                  ? 'border-warning bg-warning/20 text-warning'
                  : 'border-danger/40 bg-danger/10 text-danger'
                : isUrgent
                  ? 'border-warning bg-warning/20 text-warning'
                  : 'border-border bg-surface-muted text-brand'
            }`}
          >
            <Clock className="h-7 w-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xs uppercase font-mono tracking-wider text-foreground-muted">
              {isExpired ? 'Reserva Expirada' : 'Tiempo Restante de Reserva Atómica'}
            </h2>
            <p className="text-xs text-foreground-muted">
              {isExpired
                ? canStillPayWithStock
                  ? 'El tiempo inicial de 15 minutos concluyó, pero aún hay stock disponible en bodega. Reactiva tu reserva para completar el pago.'
                  : 'La reserva de inventario ha expirado y las existencias se agotaron en bodega.'
                : isUrgent
                  ? '¡Últimos minutos! Complete su pago para evitar la liberación de stock.'
                  : 'El stock permanecerá bloqueado en bodega exclusivamente para usted durante esta ventana.'}
            </p>
            {isExpired && canStillPayWithStock && (
              <div className="pt-1">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void handleRenewReservation()}
                  disabled={renewReservationMutation.isPending}
                  className="bg-brand hover:bg-brand-strong text-primary-foreground font-semibold text-xs"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 mr-1.5 ${
                      renewReservationMutation.isPending ? 'animate-spin' : ''
                    }`}
                  />
                  {renewReservationMutation.isPending
                    ? 'Reactivando reserva...'
                    : 'Reactivar Reserva (15 min) con Stock Disponible'}
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="text-right sm:text-right shrink-0">
          <div
            className={`text-3xl sm:text-4xl font-extrabold font-mono tabular-nums tracking-tight ${
              isExpired ? 'text-danger' : isUrgent ? 'text-warning' : 'text-foreground'
            }`}
          >
            {formattedTime}
          </div>
          <span className="text-[10px] uppercase font-mono text-foreground-muted block mt-0.5">
            Minutos : Segundos
          </span>
        </div>
      </div>

      {/* ── Paso 3: Tarjeta de Pago Simulado ──────────────────────────────── */}
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
          <div className="space-y-0.5">
            <span className="text-sm text-foreground-muted block">Total a debitar:</span>
            <span className="text-[11px] text-foreground-subtle flex items-center gap-1">
              <Truck className="h-3 w-3 text-brand" /> Envío a domicilio incluido
            </span>
          </div>
          <div className="text-xl font-bold text-brand tabular-nums">
            <MoneyAmount amount={order.totalAmount} currency={order.currency} />
          </div>
        </div>

        {/* Botón de Acción de Pago */}
        <Button
          onClick={handlePay}
          disabled={isExpired || payOrderMutation.isPending}
          className="w-full h-14 bg-brand hover:bg-brand-strong text-primary-foreground font-bold text-base shadow-xl shadow-brand/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
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
              Confirmar y Pagar Pedido ({order.currency} $
              {order.totalAmount.toLocaleString('es-CO')})
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
