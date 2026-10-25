import { useState, type FormEvent } from 'react';
import { useNavigate, useSearch, Link } from '@tanstack/react-router';
import { useLoginMutation } from '../../application/services/identity';
import { LoginSchema } from '../../application/schemas';
import { getRoleHomePath } from '../../app/guards/routeGuards';
import { appServices } from '../../app/providers/appServices';
import { UserRole } from '../../domain';
import {
  consumePendingGuestCheckout,
  getGuestCartCount,
  syncGuestCartToBackend,
} from '../buyer/guestCart';
import {
  Button,
  Input,
  Label,
  Alert,
  AlertTitle,
  AlertDescription,
  Logo,
  LogoMark,
  type BrandRole,
} from '@zentric/ui';
import {
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShoppingBag,
  Truck,
  RotateCcw,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';

const BUYER_DEMO_IDENTITY = {
  role: 'buyer' as BrandRole,
  label: 'Comprador',
  email: 'buyer@zentric.local',
  password: 'BuyerLocal12345',
  route: '/buyer',
};

/**
 * Pantalla de Inicio de Sesión de Comprador (/login y /entrar).
 * Diseñada 100% para la persona Compradora (sin jerga interna ni ruido operativo).
 * El visitante entra primero al Marketplace como invitado (/buyer) y solo llega aquí
 * cuando desea finalizar su compra o consultar sus pedidos personales.
 */
export function LoginPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as {
    aviso?: string;
    redirect?: string;
  };

  const loginMutation = useLoginMutation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(true);
  const [acceptPrivacy, setAcceptPrivacy] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    legal?: string;
  }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const guestItemCount = getGuestCartCount();

  const completePostLoginNavigation = async (role: UserRole) => {
    if (role === UserRole.Buyer) {
      await syncGuestCartToBackend(appServices.api);
      const hadPendingCheckout = consumePendingGuestCheckout();
      if (hadPendingCheckout) {
        navigate({ to: '/buyer/cart' });
        return;
      }
    }
    const targetPath = search.redirect || getRoleHomePath(role);
    navigate({ to: targetPath });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!acceptTerms || !acceptPrivacy) {
      setFieldErrors((prev) => ({
        ...prev,
        legal:
          'Debes aceptar los Términos y Condiciones y la Política de Privacidad y Tratamiento de Datos.',
      }));
      return;
    }

    const validation = LoginSchema.safeParse({ email, password });
    if (!validation.success) {
      const formatted = validation.error.format();
      setFieldErrors({
        email: formatted.email?._errors[0],
        password: formatted.password?._errors[0],
      });
      return;
    }

    setFieldErrors({});

    try {
      const result = await loginMutation.mutateAsync({
        email: validation.data.email,
        password: validation.data.password,
      });

      await completePostLoginNavigation(result.role);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Error de autenticación. Verifique sus credenciales.';
      setSubmitError(errorMsg);
    }
  };

  const handleQuickBuyerDemo = async () => {
    if (!acceptTerms || !acceptPrivacy) {
      setFieldErrors({
        legal:
          'Debes aceptar los Términos y Condiciones y la Política de Privacidad para continuar.',
      });
      return;
    }
    setEmail(BUYER_DEMO_IDENTITY.email);
    setPassword(BUYER_DEMO_IDENTITY.password);
    setFieldErrors({});
    setSubmitError(null);
    try {
      const result = await loginMutation.mutateAsync({
        email: BUYER_DEMO_IDENTITY.email,
        password: BUYER_DEMO_IDENTITY.password,
      });
      await completePostLoginNavigation(result.role);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Error de autenticación. Verifique sus credenciales.';
      setSubmitError(errorMsg);
    }
  };

  const renderAviso = () => {
    if (search.aviso === 'sin-sesion') {
      return (
        <Alert variant="info" className="mb-5">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Sesión Requerida</AlertTitle>
          <AlertDescription>
            Ingresa con tu cuenta para consultar tus pedidos, direcciones o garantías.
          </AlertDescription>
        </Alert>
      );
    }
    if (search.aviso === 'expirada') {
      return (
        <Alert variant="warning" className="mb-5">
          <Clock className="h-4 w-4" />
          <AlertTitle>Sesión Expirada</AlertTitle>
          <AlertDescription>
            Por tu seguridad la sesión ha caducado. Ingresa nuevamente tus datos.
          </AlertDescription>
        </Alert>
      );
    }
    if (search.aviso === 'cuenta-creada') {
      return (
        <Alert variant="success" className="mb-5">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Cuenta Creada Exitosamente</AlertTitle>
          <AlertDescription>
            Tu cuenta de comprador está lista. Inicia sesión para continuar con tu compra.
          </AlertDescription>
        </Alert>
      );
    }
    return null;
  };

  return (
    <div
      data-role="buyer"
      className="surface-hairline my-4 flex w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border bg-surface text-foreground shadow-2xl transition-colors lg:flex-row"
    >
      {/* ── Escenario Izquierdo: Propuesta de Valor para el Comprador (54%) ── */}
      <div className="relative flex flex-col justify-between overflow-hidden border-b border-border bg-surface-muted/90 p-8 sm:p-10 lg:w-[54%] lg:border-r lg:border-b-0 lg:p-12">
        {/* Capas atmosféricas (HyperFrames Creative House Style: profundidad con acento Jade) */}
        <div
          className="pointer-events-none absolute -top-28 -left-24 h-96 w-96 rounded-full bg-brand/12 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute right-6 bottom-10 select-none font-mono text-[6.5rem] leading-none font-bold tracking-tighter text-foreground/[0.03]"
          aria-hidden="true"
        >
          15:00
        </div>

        <div className="relative z-10 space-y-8">
          {/* Cabecera con retorno inmediato al Marketplace como Invitado */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-5">
            <div className="flex items-center gap-3">
              <Logo role="buyer" />
              <span className="rounded-full border border-brand/30 bg-brand/10 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-brand uppercase">
                Compradores
              </span>
            </div>
            <Link
              to="/buyer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-brand/40 bg-brand/10 px-3.5 py-1.5 text-xs font-semibold text-brand transition-colors hover:bg-brand hover:text-primary-foreground"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>Seguir viendo la tienda →</span>
            </Link>
          </div>

          {/* Titular Editorial de Alto Contraste */}
          <div className="max-w-xl space-y-3.5">
            <div className="font-mono text-xs font-semibold tracking-[0.14em] text-brand uppercase">
              TU COMPRA, GARANTIZADA DE PRINCIPIO A FIN
            </div>
            <h1 className="font-sans text-3xl leading-[1.08] font-bold tracking-tight text-foreground sm:text-4xl lg:text-[2.5rem]">
              Tus compras tecnológicas con stock reservado y envío directo.
            </h1>
            <p className="text-sm leading-relaxed text-foreground-muted sm:text-base">
              Navega y arma tu carrito libremente como invitado. Solo necesitas tu cuenta al
              momento de pagar, elegir tu domicilio de entrega o hacer seguimiento de tus paquetes.
            </p>
          </div>

          {/* Jerarquía Asimétrica de Beneficios del Comprador (1 Hero Card + 2 Soportes) */}
          <div className="max-w-xl space-y-3.5">
            {/* Tarjeta Principal: Reserva de Stock 15 min */}
            <div className="rounded-2xl border border-brand/35 bg-surface/95 p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/15 text-brand">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="font-sans text-sm font-bold text-foreground">
                      Reserva de Stock por 15 Minutos al Pagar
                    </h2>
                    <p className="font-mono text-[11px] text-brand">
                      Disponibilidad física garantizada en bodega
                    </p>
                  </div>
                </div>
                <span className="rounded-lg border border-warning/40 bg-warning/10 px-2.5 py-1 font-mono text-xs font-bold text-warning tabular-nums">
                  15:00 MIN
                </span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-foreground-muted">
                Cuando pasas a pagar, apartamos tus unidades para que confirmes tu dirección de
                envío y método de pago con total tranquilidad. Mientras exista stock, nunca pierdes
                tu pedido.
              </p>
            </div>

            {/* Dos tarjetas secundarias complementarias */}
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div className="surface-hairline rounded-xl bg-surface/80 p-4 space-y-1.5">
                <div className="flex items-center gap-2 font-sans text-xs font-bold text-foreground">
                  <Truck className="h-4 w-4 text-brand" />
                  <span>Despacho Rastreable</span>
                </div>
                <p className="text-xs leading-relaxed text-foreground-muted">
                  Modifica tu dirección en el checkout y consulta el estado de tu guía desde la
                  bodega hasta tu puerta.
                </p>
              </div>

              <div className="surface-hairline rounded-xl bg-surface/80 p-4 space-y-1.5">
                <div className="flex items-center gap-2 font-sans text-xs font-bold text-foreground">
                  <RotateCcw className="h-4 w-4 text-brand" />
                  <span>Devolución Protegida</span>
                </div>
                <p className="text-xs leading-relaxed text-foreground-muted">
                  Tu dinero está protegido con garantía directa y reembolso asistido si el producto
                  no cumple lo prometido.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Pie del escenario izquierdo */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-t border-border/80 pt-5 text-xs text-foreground-muted">
          <div className="inline-flex items-center gap-2 font-mono text-[11px]">
            <ShieldCheck className="h-4 w-4 text-brand" />
            <span>COMPRA 100% PROTEGIDA · ESTATUTO DEL CONSUMIDOR</span>
          </div>
          <span className="font-mono text-[11px] text-foreground-subtle">
            <Lock className="mr-1 inline h-3 w-3 text-brand" />
            PAGO SEGURO TLS
          </span>
        </div>
      </div>

      {/* ── Escenario Derecho: Formulario Limpio de Comprador (46%) ────────── */}
      <div className="flex flex-1 items-center justify-center bg-surface p-6 sm:p-10 lg:p-12">
        <div className="w-full max-w-md space-y-5">
          <div className="space-y-1.5">
            <span className="font-mono text-xs font-semibold tracking-wider text-brand uppercase">
              CUENTA DE COMPRADOR
            </span>
            <h2 className="font-sans text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Ingresa a tu cuenta
            </h2>
            <p className="text-sm text-foreground-muted">
              Continúa con tu compra, administra tu dirección de entrega o revisa el estado de tus
              pedidos.
            </p>
          </div>

          {guestItemCount > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-brand/35 bg-brand/10 px-4 py-3 text-xs">
              <div className="flex items-center gap-2.5 text-foreground">
                <ShoppingBag className="h-4 w-4 text-brand shrink-0" />
                <span>
                  Tu carrito tiene <strong>{guestItemCount}</strong> producto(s) listos para pagar.
                </span>
              </div>
              <Link
                to="/buyer/cart"
                className="font-mono font-semibold text-brand hover:underline shrink-0"
              >
                Ver carrito
              </Link>
            </div>
          )}

          {renderAviso()}

          {submitError && (
            <Alert variant="destructive" className="mb-4" role="alert">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No pudimos iniciar sesión</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="font-mono text-xs font-medium tracking-wider text-foreground-muted uppercase"
              >
                Correo Electrónico
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="tu-correo@ejemplo.com"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) {
                    setFieldErrors((prev) => ({ ...prev, email: undefined }));
                  }
                }}
                disabled={loginMutation.isPending}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                className="border-border bg-surface font-mono text-sm text-foreground focus:border-brand"
              />
              {fieldErrors.email && (
                <p id="email-error" className="text-xs text-red-400">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="font-mono text-xs font-medium tracking-wider text-foreground-muted uppercase"
              >
                Contraseña
              </Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) {
                    setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }
                }}
                disabled={loginMutation.isPending}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                className="border-border bg-surface font-mono text-sm text-foreground focus:border-brand pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                disabled={loginMutation.isPending}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={showPassword}
                className="absolute right-1 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted transition-all hover:text-brand hover:bg-brand/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 transition-transform duration-200 scale-110" />
                ) : (
                  <Eye className="h-4 w-4 transition-transform duration-200" />
                )}
              </button>
            </div>
              {fieldErrors.password && (
                <p id="password-error" className="text-xs text-red-400">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Casillas de Aceptación Legal del Consumidor */}
            <div className="space-y-2 rounded-xl border border-border bg-surface-muted/50 p-3.5 text-xs">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => {
                    setAcceptTerms(e.target.checked);
                    if (fieldErrors.legal) {
                      setFieldErrors((prev) => ({ ...prev, legal: undefined }));
                    }
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-border accent-brand"
                />
                <span className="text-foreground-muted leading-relaxed">
                  Acepto los{' '}
                  <Link to="/terms" className="font-medium text-brand hover:underline">
                    Términos y Condiciones de Compra
                  </Link>{' '}
                  y el{' '}
                  <Link to="/legal" className="font-medium text-brand hover:underline">
                    Estatuto del Consumidor (Ley 1480)
                  </Link>
                  .
                </span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={acceptPrivacy}
                  onChange={(e) => {
                    setAcceptPrivacy(e.target.checked);
                    if (fieldErrors.legal) {
                      setFieldErrors((prev) => ({ ...prev, legal: undefined }));
                    }
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-border accent-brand"
                />
                <span className="text-foreground-muted leading-relaxed">
                  Autorizo la{' '}
                  <Link to="/privacy" className="font-medium text-brand hover:underline">
                    Política de Privacidad (Ley 1581)
                  </Link>{' '}
                  y el uso de{' '}
                  <Link to="/cookies" className="font-medium text-brand hover:underline">
                    Cookies Esenciales
                  </Link>
                  .
                </span>
              </label>

              {fieldErrors.legal && (
                <p className="text-xs font-medium text-danger pt-1">{fieldErrors.legal}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full bg-brand py-2.5 font-semibold text-primary-foreground shadow-lg shadow-brand/20 transition-colors hover:bg-brand/90"
            >
              {loginMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Ingresando a tu cuenta...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Continuar
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          {/* UNA sola acción de demostración clara para el Comprador */}
          <div className="rounded-xl border border-border bg-surface-muted/40 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs">
                <LogoMark role="buyer" className="size-4 shrink-0" />
                <div>
                  <div className="font-sans font-semibold text-foreground">
                    ¿Quieres probar el flujo de compra rápido?
                  </div>
                  <div className="font-mono text-[11px] text-foreground-muted">
                    {BUYER_DEMO_IDENTITY.email}
                  </div>
                </div>
              </div>
              <button
                type="button"
                disabled={loginMutation.isPending}
                onClick={() => void handleQuickBuyerDemo()}
                className="shrink-0 rounded-lg border border-brand/40 bg-brand/10 px-3 py-1.5 font-mono text-xs font-semibold text-brand transition-colors hover:bg-brand hover:text-primary-foreground disabled:opacity-50"
              >
                Usar Cuenta Demo
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-3 border-t border-border/80 pt-4 text-xs text-foreground-muted sm:flex-row">
            <div>
              ¿Eres nuevo en Zentric?{' '}
              <Link
                to="/register"
                className="font-semibold text-brand transition-colors hover:underline"
              >
                Crear cuenta gratis
              </Link>
            </div>
            <Link
              to="/acceso-corporativo"
              className="font-mono text-[11px] text-foreground-muted transition-colors hover:text-brand"
            >
              Portal Vendedores y Operación →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
