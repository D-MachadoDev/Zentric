import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from '@tanstack/react-router';
import {
  useOrderQuery,
  usePayOrderMutation,
  useCheckoutOrderMutation,
  useCancelOrderMutation,
} from '../../core';
import {
  useUserProfileQuery,
  useUpdateUserProfileMutation,
} from '../../core';
import { OrderStatus, type Order } from '../../core';
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
 * Consola de Pago y Reserva Atómica de 15 Minutos para el Comprador.
 * Gestión en línea del domicilio de entrega, temporizador de reserva y confirmación de pago.
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

  const canPay = (orderData as Order | undefined)?.canStillPay !== false;

  useEffect(() => {
    if (!canPay) {
      setIsExpired(true);
    }
  }, [canPay]);

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
        fullName: profileData?.fullName || 'Andrés Castillo',
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
        <div className="rounded-2xl border border-border bg-surface p-8 space-y-4 shadow-sm">
          <CheckCircle2 className="h-16 w-16 text-success mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">
            Este pedido ya fue procesado
          </h1>
          <p className="text-sm text-foreground-muted">
            El pedido #{order.id.slice(0, 8)} se encuentra en estado{' '}
            <strong className="text-foreground">{order.status}</strong> y no requiere pago adicional.
          </p>
          <Link to="/buyer/orders/$orderId" params={{ orderId: order.id }}>
            <Button className="bg-brand text-primary-foreground font-semibold">
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
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
      {/* ── Encabezado ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link to="/buyer/orders">
              <Button
                variant="outline"
                size="sm"
                className="border-border text-foreground-muted hover:text-foreground mr-1"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Pasarela de Pago
            </h1>
          </div>
          <p className="text-sm text-foreground-muted">
            Pedido #{order.id.slice(0, 8)} • Total a pagar:{' '}
            <span className="font-semibold text-foreground">
              <MoneyAmount amount={order.totalAmount} currency={order.currency} />
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleCancelOrder()}
            disabled={cancelOrderMutation.isPending}
            className="border-danger/30 text-danger hover:bg-danger/10 text-xs font-medium"
          >
            <XCircle className="h-3.5 w-3.5 mr-1.5" />
            {cancelOrderMutation.isPending ? 'Cancelando...' : 'Cancelar pedido'}
          </Button>
          <div className="flex items-center gap-1.5 text-xs text-foreground-muted font-medium">
            <Lock className="h-3.5 w-3.5 text-brand" />
            <span>Pago Seguro SSL</span>
          </div>
        </div>
      </div>

      {paymentError && (
        <Alert variant="destructive" className="border-danger/30 bg-danger/10 text-danger">
          <AlertCircle className="h-5 w-5 text-danger" />
          <AlertTitle>Fallo en la transacción</AlertTitle>
          <AlertDescription className="text-xs">{paymentError}</AlertDescription>
        </Alert>
      )}

      {renewalSuccess && (
        <Alert className="border-success/30 bg-success/10 text-success">
          <CheckCircle2 className="h-5 w-5 text-success" />
          <AlertTitle>Reserva reactivada</AlertTitle>
          <AlertDescription className="text-xs">{renewalSuccess}</AlertDescription>
        </Alert>
      )}

      {/* ── Paso 1: Domicilio de Entrega y Facturación ── */}
      <div className="rounded-2xl border border-border/80 bg-surface p-5 sm:p-6 space-y-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-foreground">
                  Domicilio de entrega
                </h2>
                <Badge variant="outline" className="border-brand/30 text-brand text-xs font-medium">
                  Envío verificado
                </Badge>
              </div>
              {hasAddressConfigured && !isEditingAddress ? (
                <p className="text-xs sm:text-sm text-foreground-muted mt-0.5">
                  {street} · {city}, {stateRegion} ({zipCode || 'Colombia'}) · Tel: {phone}
                </p>
              ) : (
                <p className="text-xs sm:text-sm text-foreground-muted mt-0.5">
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
            className="border-border text-foreground hover:bg-surface-muted text-xs font-medium"
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
          <div className="space-y-3 rounded-xl border border-border/70 bg-surface-muted/30 p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-medium text-foreground-muted block">
                  Dirección exacta (Calle, Carrera, Número, Apto/Oficina)
                </label>
                <Input
                  placeholder="Ej. Carrera 7 # 71-21, Apto 502"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="bg-surface border-border text-sm text-foreground"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground-muted block">
                  Ciudad / Municipio
                </label>
                <Input
                  placeholder="Ej. Bogotá D.C."
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="bg-surface border-border text-sm text-foreground"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground-muted block">
                  Departamento / Estado
                </label>
                <Input
                  placeholder="Ej. Cundinamarca"
                  value={stateRegion}
                  onChange={(e) => setStateRegion(e.target.value)}
                  className="bg-surface border-border text-sm text-foreground"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground-muted block">
                  Código Postal
                </label>
                <Input
                  placeholder="110221"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  className="bg-surface border-border text-sm text-foreground"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground-muted block">
                  Teléfono de contacto para entrega
                </label>
                <Input
                  placeholder="+57 300 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-surface border-border text-sm text-foreground"
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
        className={`rounded-2xl border p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
          isExpired
            ? canStillPayWithStock
              ? 'border-warning/50 bg-warning/10'
              : 'border-danger/30 bg-danger/10'
            : isUrgent
              ? 'border-warning bg-warning/10 shadow-sm animate-pulse'
              : 'border-border/80 bg-surface shadow-xs'
        }`}
      >
        <div className="flex items-start sm:items-center gap-4">
          <div
            className={`p-3 rounded-xl border shrink-0 ${
              isExpired
                ? canStillPayWithStock
                  ? 'border-warning/60 bg-warning/20 text-warning'
                  : 'border-danger/40 bg-danger/10 text-danger'
                : isUrgent
                  ? 'border-warning/60 bg-warning/20 text-warning'
                  : 'border-border bg-surface-muted text-brand'
            }`}
          >
            <Clock className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xs uppercase tracking-wider text-foreground-muted font-semibold">
              {isExpired ? 'Reserva Expirada' : 'Tiempo Restante de Reserva Atómica'}
            </h2>
            <p className="text-xs sm:text-sm text-foreground-muted leading-relaxed">
              {isExpired
                ? canStillPayWithStock
                  ? 'El tiempo inicial de 15 minutos concluyó, pero aún hay stock disponible en bodega. Reactiva tu reserva para completar el pago.'
                  : 'La reserva de inventario ha expirado y las existencias se agotaron en bodega.'
                : isUrgent
                  ? '¡Últimos minutos! Completa tu pago para evitar que las unidades se liberen a otros compradores.'
                  : 'El stock permanecerá bloqueado en bodega exclusivamente para ti durante esta ventana.'}
            </p>
            {isExpired && canStillPayWithStock && (
              <div className="pt-2">
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
                    : 'Reactivar reserva (15 min)'}
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="text-left sm:text-right shrink-0">
          <div
            className={`text-3xl sm:text-4xl font-extrabold tabular-nums tracking-tight ${
              isExpired ? 'text-danger' : isUrgent ? 'text-warning' : 'text-foreground'
            }`}
          >
            {formattedTime}
          </div>
          <span className="text-xs text-foreground-muted block mt-0.5">
            Minutos : Segundos
          </span>
        </div>
      </div>

      {/* ── Paso 3: Tarjeta de Pago Seguro ──────────────────────────────── */}
      <div className="rounded-2xl border border-border/80 bg-surface p-5 sm:p-8 space-y-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-border/70 pb-4">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-brand" />
            <h2 className="text-sm sm:text-base font-bold text-foreground">
              Método de pago
            </h2>
          </div>
          <Badge variant="outline" className="text-xs border-border text-foreground font-medium">
            Tarjeta Débito / Crédito
          </Badge>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground-muted block">
              Número de tarjeta
            </label>
            <Input
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              disabled={isExpired}
              className="bg-surface border-border text-sm text-foreground"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-foreground-muted block">
                Titular de la tarjeta
              </label>
              <Input
                value={cardHolder}
                onChange={(e) => setCardHolder(e.target.value)}
                disabled={isExpired}
                className="bg-surface border-border text-sm text-foreground"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground-muted block">
                Vencimiento
              </label>
              <Input
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                disabled={isExpired}
                className="bg-surface border-border text-sm text-foreground text-center"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground-muted block">
                CVV
              </label>
              <Input
                value={cvv}
                onChange={(e) => setCvv(e.target.value)}
                disabled={isExpired}
                className="bg-surface border-border text-sm text-foreground text-center"
              />
            </div>
          </div>
        </div>

        {/* Resumen Final de Débito */}
        <div className="p-4 rounded-xl border border-border/70 bg-surface-muted/30 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-sm font-medium text-foreground-muted block">Total a debitar:</span>
            <span className="text-xs text-foreground-muted flex items-center gap-1">
              <Truck className="h-3.5 w-3.5 text-brand" /> Envío a domicilio incluido
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">
            <MoneyAmount amount={order.totalAmount} currency={order.currency} />
          </div>
        </div>

        {/* Botón de Acción de Pago */}
        <Button
          onClick={handlePay}
          disabled={isExpired || !canPay || payOrderMutation.isPending}
          className="w-full h-12 sm:h-13 bg-brand hover:bg-brand-strong text-primary-foreground font-bold text-sm sm:text-base rounded-xl shadow-xs transition-colors"
        >
          {payOrderMutation.isPending ? (
            <span className="flex items-center gap-2">
              <Clock className="h-5 w-5 animate-spin" />
              Procesando pago con el banco...
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

        <div className="flex items-center justify-center gap-2 text-xs text-foreground-muted pt-1">
          <ShieldCheck className="h-4 w-4 text-brand" />
          <span>Al pagar, se emite tu factura electrónica y se genera la orden de despacho en bodega.</span>
        </div>
      </div>
    </div>
  );
}
