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
import { OrderStatus, type Order, type OrderItem } from '../../core';
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
  Package,
  RefreshCw,
  Edit3,
  Truck,
  XCircle,
  Building2,
  Smartphone,
  Check,
} from 'lucide-react';

/**
 * Consola de Pago y Reserva Atómica para el Comprador (Above the Fold / 2 Columnas).
 * Diseñada para conversión limpia: CERO scroll necesario en desktop para pagar.
 * Columna izquierda: Domicilio de entrega y selector de medios de pago colombianos (PSE, Tarjetas, Billeteras).
 * Columna derecha (sticky): Botón de pago prominente arriba, reloj de reserva atómica y resumen visual con fotos.
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

  const [paymentMethod, setPaymentMethod] = useState<'pse' | 'card' | 'wallet'>('pse');

  const calculateRemainingSeconds = () => {
    const expiresAt = (orderData as Order | undefined)?.expiresAt;
    if (!expiresAt) return 900;
    const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  };

  const [secondsRemaining, setSecondsRemaining] = useState<number>(() =>
    calculateRemainingSeconds(),
  );
  const canPay = (orderData as Order | undefined)?.canStillPay !== false;
  const isExpired = !canPay || secondsRemaining <= 0;

  const expiresAt = (orderData as Order | undefined)?.expiresAt;
  const [seenExpiresAt, setSeenExpiresAt] = useState<string | undefined>(expiresAt);

  if (seenExpiresAt !== expiresAt) {
    setSeenExpiresAt(expiresAt);
    const initialSeconds = calculateRemainingSeconds();
    setSecondsRemaining(initialSeconds);
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
        fullName: profileData?.fullName ?? '',
        phone: phone.trim(),
        documentNumber: profileData?.documentNumber ?? '',
        address: {
          street: street.trim(),
          city: city.trim(),
          state: stateRegion.trim(),
          zipCode: zipCode.trim(),
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
      <div className="space-y-6 p-6 sm:p-10 max-w-5xl mx-auto w-full">
        <Skeleton className="h-8 w-48 bg-surface" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Skeleton className="lg:col-span-7 h-96 rounded-2xl bg-surface" />
          <Skeleton className="lg:col-span-5 h-96 rounded-2xl bg-surface" />
        </div>
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
        <Alert variant="destructive" className="border-danger/30 bg-danger/10 text-danger rounded-xl">
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
        <div className="rounded-2xl border border-border bg-surface p-8 space-y-4 shadow-xs">
          <CheckCircle2 className="h-16 w-16 text-success mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">
            Este pedido ya fue procesado
          </h1>
          <p className="text-sm text-foreground-muted">
            El pedido #{order.id.slice(0, 8)} se encuentra en estado{' '}
            <strong className="text-foreground">{order.status}</strong> y no requiere pago adicional.
          </p>
          <Link to="/buyer/orders/$orderId" params={{ orderId: order.id }}>
            <Button className="bg-brand text-primary-foreground font-semibold rounded-full px-6">
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
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-6">
      {/* ── Encabezado Compacto ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
        <div className="flex items-center gap-3">
          <Link to="/buyer/orders">
            <Button
              variant="outline"
              size="sm"
              pill
              className="border-border text-foreground-muted hover:text-foreground rounded-full size-9 p-0 flex items-center justify-center cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Pasarela de Pago
              </h1>
              <Badge variant="outline" className="border-brand/40 text-brand text-xs font-semibold px-2 py-0.5 rounded-full">
                Pedido #{order.id.slice(0, 8).toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-foreground-muted mt-0.5">
              Transacción protegida con reserva de inventario y cifrado bancario de 256 bits.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            pill
            onClick={() => void handleCancelOrder()}
            disabled={cancelOrderMutation.isPending}
            className="text-xs text-foreground-muted hover:text-danger hover:bg-danger/10 rounded-full cursor-pointer"
          >
            <XCircle className="h-3.5 w-3.5 mr-1 text-danger/80" />
            {cancelOrderMutation.isPending ? 'Cancelando...' : 'Cancelar pedido'}
          </Button>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-muted/50 border border-border text-xs text-foreground-muted font-medium">
            <Lock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Pago Seguro SSL</span>
          </div>
        </div>
      </div>

      {paymentError && (
        <Alert variant="destructive" className="border-danger/30 bg-danger/10 text-danger rounded-xl">
          <AlertCircle className="h-5 w-5 text-danger" />
          <AlertTitle>Fallo en la transacción</AlertTitle>
          <AlertDescription className="text-xs">{paymentError}</AlertDescription>
        </Alert>
      )}

      {renewalSuccess && (
        <Alert className="border-success/30 bg-success/10 text-success rounded-xl">
          <CheckCircle2 className="h-5 w-5 text-success" />
          <AlertTitle>Reserva reactivada</AlertTitle>
          <AlertDescription className="text-xs">{renewalSuccess}</AlertDescription>
        </Alert>
      )}

      {/* ── Composición 2 Columnas: Above the Fold (CERO Scroll para Pagar en Desktop) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* ── COLUMNA IZQUIERDA: Domicilio y Selector de Medios de Pago (7 cols) ── */}
        <div className="lg:col-span-7 space-y-5">
          {/* 1. Domicilio de entrega */}
          <section className="rounded-2xl border border-border/80 bg-surface p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">
                    Domicilio de Entrega
                  </h2>
                  <p className="text-xs text-foreground-muted">
                    Dirección física a donde se despachará tu guía trazable.
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                pill
                onClick={() => setIsEditingAddress((v) => !v)}
                className="border-border text-xs font-semibold text-foreground hover:bg-surface-muted rounded-full cursor-pointer"
              >
                <Edit3 className="h-3 w-3 mr-1.5" />
                {isEditingAddress ? 'Cerrar' : 'Modificar'}
              </Button>
            </div>

            {hasAddressConfigured && !isEditingAddress ? (
              <div className="rounded-xl border border-border/60 bg-surface-muted/20 p-3.5 flex items-start gap-3">
                <Truck className="size-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                <div className="space-y-0.5 text-xs text-foreground leading-relaxed">
                  <div className="font-semibold text-foreground flex items-center gap-2">
                    <span>{street}</span>
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 text-[10px] px-2 py-0 rounded-full font-medium">
                      Verificado
                    </Badge>
                  </div>
                  <p className="text-foreground-muted">
                    {city}
                    {stateRegion ? `, ${stateRegion}` : ''}
                    {zipCode ? ` · Código Postal: ${zipCode}` : ''}
                  </p>
                  {phone && (
                    <p className="text-foreground-muted font-mono">
                      Teléfono de contacto: {phone}
                    </p>
                  )}
                </div>
              </div>
            ) : null}

            {addressSavedMessage && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{addressSavedMessage}</span>
              </div>
            )}

            {isEditingAddress && (
              <div className="space-y-3 rounded-xl border border-border bg-surface-muted/30 p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-semibold text-foreground block">
                      Dirección exacta (Calle, Carrera, Número, Apto/Oficina)
                    </label>
                    <Input
                      placeholder="Ej. Carrera 7 # 71-21, Apto 502"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      className="bg-surface border-border text-xs sm:text-sm text-foreground rounded-lg"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground block">
                      Ciudad / Municipio
                    </label>
                    <Input
                      placeholder="Ej. Bogotá D.C."
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="bg-surface border-border text-xs sm:text-sm text-foreground rounded-lg"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground block">
                      Departamento
                    </label>
                    <Input
                      placeholder="Ej. Cundinamarca"
                      value={stateRegion}
                      onChange={(e) => setStateRegion(e.target.value)}
                      className="bg-surface border-border text-xs sm:text-sm text-foreground rounded-lg"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground block">
                      Código Postal
                    </label>
                    <Input
                      placeholder="110221"
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      className="bg-surface border-border text-xs sm:text-sm text-foreground rounded-lg"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground block">
                      Teléfono de contacto
                    </label>
                    <Input
                      placeholder="+57 300 123 4567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="bg-surface border-border text-xs sm:text-sm text-foreground rounded-lg"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    pill
                    onClick={() => setIsEditingAddress(false)}
                    className="border-border text-foreground-muted text-xs rounded-full cursor-pointer"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    pill
                    onClick={() => void handleSaveAddressInline()}
                    disabled={updateProfileMutation.isPending}
                    className="bg-brand text-primary-foreground font-semibold text-xs rounded-full cursor-pointer"
                  >
                    {updateProfileMutation.isPending
                      ? 'Guardando domicilio...'
                      : 'Guardar domicilio de entrega'}
                  </Button>
                </div>
              </div>
            )}
          </section>

          {/* 2. Selector de Métodos de Pago */}
          <section className="rounded-2xl border border-border/80 bg-surface p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">Método de Pago</h2>
                  <p className="text-xs text-foreground-muted">Selecciona tu canal de pago preferido en Colombia</p>
                </div>
              </div>
              <Badge variant="outline" className="text-[11px] border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-semibold rounded-full px-2 py-0.5 bg-emerald-500/10">
                Pasarela Segura
              </Badge>
            </div>

            {/* Opciones de Método de Pago */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('pse')}
                className={`flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  paymentMethod === 'pse'
                    ? 'border-brand bg-brand/5 ring-1 ring-brand shadow-xs'
                    : 'border-border/80 bg-surface hover:border-brand/40 hover:bg-surface-muted/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Building2 className={`size-5 ${paymentMethod === 'pse' ? 'text-brand' : 'text-foreground-muted'}`} />
                  {paymentMethod === 'pse' && <Check className="size-4 text-brand" />}
                </div>
                <div className="mt-3">
                  <span className="text-xs font-bold text-foreground block">PSE</span>
                  <span className="text-[11px] text-foreground-muted block mt-0.5">Débito bancario en línea</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  paymentMethod === 'card'
                    ? 'border-brand bg-brand/5 ring-1 ring-brand shadow-xs'
                    : 'border-border/80 bg-surface hover:border-brand/40 hover:bg-surface-muted/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <CreditCard className={`size-5 ${paymentMethod === 'card' ? 'text-brand' : 'text-foreground-muted'}`} />
                  {paymentMethod === 'card' && <Check className="size-4 text-brand" />}
                </div>
                <div className="mt-3">
                  <span className="text-xs font-bold text-foreground block">Tarjeta Crédito / Débito</span>
                  <span className="text-[11px] text-foreground-muted block mt-0.5">Visa, Mastercard, Amex</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('wallet')}
                className={`flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  paymentMethod === 'wallet'
                    ? 'border-brand bg-brand/5 ring-1 ring-brand shadow-xs'
                    : 'border-border/80 bg-surface hover:border-brand/40 hover:bg-surface-muted/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Smartphone className={`size-5 ${paymentMethod === 'wallet' ? 'text-brand' : 'text-foreground-muted'}`} />
                  {paymentMethod === 'wallet' && <Check className="size-4 text-brand" />}
                </div>
                <div className="mt-3">
                  <span className="text-xs font-bold text-foreground block">Billetera Móvil</span>
                  <span className="text-[11px] text-foreground-muted block mt-0.5">Nequi · Daviplata</span>
                </div>
              </button>
            </div>

            {/* Aviso de Seguridad Bancaria */}
            <div className="rounded-xl border border-border/80 bg-surface-muted/20 p-4 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <ShieldCheck className="size-4 text-brand" />
                <span>No ingreses datos de tarjeta</span>
              </div>
              <p className="text-xs text-foreground-muted leading-relaxed">
                El proceso de pago se realiza de manera segura y verificada. La confirmación del débito se transmite con cifrado extremo de extremo a extremo sin exponer credenciales bancarias.
              </p>
            </div>
          </section>
        </div>

        {/* ── COLUMNA DERECHA (STICKY): Resumen del Pedido y Botón de Pago (5 cols) ── */}
        <div className="lg:col-span-5 lg:sticky lg:top-6 space-y-4">
          {/* Botón de Acción de Pago — ARRIBA DESTACADO SIN SCROLL */}
          <div className="rounded-2xl border border-border/80 bg-surface p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-foreground-muted font-bold">
                Total a Debitar
              </span>
              <div className="font-mono text-2xl font-black text-foreground tabular-nums">
                <MoneyAmount amount={order.totalAmount} currency={order.currency} />
              </div>
            </div>

            <Button
              onClick={handlePay}
              disabled={isExpired || !canPay || payOrderMutation.isPending}
              pill
              className="w-full h-12 bg-brand hover:bg-brand-strong text-primary-foreground font-bold text-sm sm:text-base rounded-full shadow-md transition-all active:scale-[0.98] cursor-pointer"
            >
              {payOrderMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Clock className="h-4 w-4 animate-spin" />
                  Procesando con el banco...
                </span>
              ) : isExpired ? (
                'Tiempo de reserva agotado (00:00)'
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Confirmar y Pagar Pedido
                </span>
              )}
            </Button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-foreground-muted">
              <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Garantía de compra protegida · Despacho oficial</span>
            </div>
          </div>

          {/* Temporizador de Reserva Atómica (15 Minutos) */}
          <div
            className={`rounded-2xl border p-4 transition-all ${
              isExpired
                ? canStillPayWithStock
                  ? 'border-warning/50 bg-warning/10'
                  : 'border-danger/30 bg-danger/10'
                : isUrgent
                  ? 'border-amber-500 bg-amber-500/10 shadow-xs animate-pulse'
                  : 'border-border/80 bg-surface shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-xl border shrink-0 ${
                    isExpired
                      ? canStillPayWithStock
                        ? 'border-warning/60 bg-warning/20 text-warning'
                        : 'border-danger/40 bg-danger/10 text-danger'
                      : isUrgent
                        ? 'border-amber-500/50 bg-amber-500/20 text-amber-600 dark:text-amber-400'
                        : 'border-border bg-surface-muted text-brand'
                  }`}
                >
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xs uppercase tracking-wider text-foreground-muted font-bold">
                    {isExpired ? 'Reserva Expirada' : 'Tiempo Restante de Reserva Atómica'}
                  </h3>
                  <p className="text-[11px] text-foreground-muted leading-tight mt-0.5">
                    {isExpired
                      ? canStillPayWithStock
                        ? 'El tiempo concluyó, pero aún hay stock disponible en bodega.'
                        : 'La reserva ha expirado y las existencias se liberaron.'
                      : isUrgent
                        ? '¡Últimos minutos! Completa tu pago antes de que se libere el stock.'
                        : 'Stock reservado exclusivamente en bodega durante esta ventana.'}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span
                  className={`font-mono text-2xl font-black tabular-nums tracking-tight ${
                    isExpired ? 'text-danger' : isUrgent ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'
                  }`}
                >
                  {formattedTime}
                </span>
              </div>
            </div>

            {isExpired && canStillPayWithStock && (
              <div className="pt-3 border-t border-warning/30 mt-3 flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  pill
                  onClick={() => void handleRenewReservation()}
                  disabled={renewReservationMutation.isPending}
                  className="bg-brand hover:bg-brand-strong text-primary-foreground font-semibold text-xs rounded-full cursor-pointer"
                >
                  <RefreshCw
                    className={`h-3 w-3 mr-1.5 ${
                      renewReservationMutation.isPending ? 'animate-spin' : ''
                    }`}
                  />
                  {renewReservationMutation.isPending
                    ? 'Reactivando...'
                    : 'Reactivar reserva (15 min)'}
                </Button>
              </div>
            )}
          </div>

          {/* Resumen de Artículos con Fotos Claras */}
          <div className="rounded-2xl border border-border/80 bg-surface p-4 sm:p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
              <span className="text-xs font-bold text-foreground">
                Artículos en el pedido ({order.items.length})
              </span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <Truck className="size-3.5" /> Envío Gratuito
              </span>
            </div>

            <div className="divide-y divide-border/60 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
              {order.items.map((item: OrderItem) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.productName || 'Producto'}
                        className="size-11 rounded-lg object-cover bg-surface-muted border border-border/70 shrink-0"
                      />
                    ) : (
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-surface-muted border border-border/70 text-foreground-subtle">
                        <Package className="size-5" aria-hidden="true" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {item.productName || `Artículo #${item.variantId.slice(0, 8)}`}
                      </p>
                      <p className="text-[11px] text-foreground-muted">
                        Cant: {item.quantity} × <MoneyAmount amount={item.unitPrice} currency={order.currency} />
                      </p>
                    </div>
                  </div>
                  <div className="font-mono font-bold text-foreground tabular-nums shrink-0">
                    <MoneyAmount amount={item.totalPrice} currency={order.currency} />
                  </div>
                </div>
              ))}
            </div>

            {/* Desglose Económico */}
            <div className="border-t border-border/60 pt-3 space-y-1.5 text-xs text-foreground-muted">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-mono tabular-nums text-foreground">
                  <MoneyAmount amount={order.totalAmount} currency={order.currency} />
                </span>
              </div>
              <div className="flex justify-between">
                <span>Costo de Envío Nacional</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">GRATIS</span>
              </div>
              <div className="flex justify-between border-t border-border/60 pt-2 font-bold text-foreground text-sm">
                <span>Total</span>
                <span className="font-mono tabular-nums text-base">
                  <MoneyAmount amount={order.totalAmount} currency={order.currency} />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
