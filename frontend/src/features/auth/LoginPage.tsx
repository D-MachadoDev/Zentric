import { useState, type FormEvent } from 'react';
import { useNavigate, useSearch, Link } from '@tanstack/react-router';
import { useLoginMutation } from '../../core';
import { LoginSchema } from '../../core';
import { getRoleHomePath } from '../../app/guards/routeGuards';
import { appServices } from '../../app/providers/appServices';
import { UserRole } from '../../core';
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
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Mail,
  Eye,
  EyeOff,
  X,
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
 * Rediseño minimalista premium: jerarquía clara, espacio negativo generoso,
 * acento teal solo en elementos importantes, sin sombras exageradas ni
 * ilustraciones decorativas. Toda la lógica de autenticación se preserva.
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
        <Alert variant="brand" className="mb-6">
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
        <Alert variant="brand" className="mb-6">
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
        <Alert variant="brand" className="mb-6">
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
      className="flex min-h-screen flex-col bg-background text-foreground"
    >
      {/* ── Encabezado: compacto, limpio, fondo blanco, borde inferior sutil ── */}
      <header className="relative z-20 flex min-h-14 items-center justify-between border-b border-border bg-surface/95 px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 backdrop-blur-md transition-colors">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-90" aria-label="Zentric - Inicio">
            <Logo className="h-7 sm:h-8" />
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Navegación secundaria desktop */}
          <nav className="hidden sm:flex items-center gap-2 sm:gap-3 rounded-full border border-border/80 bg-background/80 px-2 py-1.5 backdrop-blur-xs shadow-xs">
            <Link
              to="/buyer"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium leading-normal transition-all text-foreground-muted hover:text-foreground hover:bg-surface-muted"
            >
              <Mail className="size-3 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">Tienda Compradores</span>
            </Link>
            <Link
              to="/acceso-corporativo"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium leading-normal transition-all text-foreground-muted hover:text-foreground hover:bg-surface-muted"
            >
              <ArrowUpRight className="size-3 shrink-0" aria-hidden="true" />
              <span className="hidden md:inline">Acceso Vendedores</span>
              <span className="md:hidden">Vendedores</span>
            </Link>
            <Link
              to="/health"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium leading-normal transition-all text-foreground-muted hover:text-foreground hover:bg-surface-muted"
            >
              <ActivityIconSmall className="size-3 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">Estado del Sistema</span>
              <span className="sm:hidden">Estado</span>
            </Link>
          </nav>

          {/* Selector de tema */}
          <ThemeToggleButton />

          {/* Menú móvil */}
          <button
            type="button"
            className="lg:hidden inline-flex items-center justify-center h-10 w-10 rounded-full text-foreground-muted hover:text-foreground hover:bg-surface-muted transition-colors"
            onClick={() => setMobileMenuOpen((p) => !p)}
            aria-label="Menú"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <MenuIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      </header>

      {/* Menú móvil desplegable */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col bg-surface border-b border-border">
          <div className="flex items-center justify-between border-b border-border/80 bg-surface px-4 py-3">
            <div className="flex items-center gap-2">
              <Logo className="h-6" />
            </div>
            <button
              type="button"
              className="inline-flex items-center justify-center h-10 w-10 rounded-full text-foreground-muted hover:text-foreground hover:bg-surface-muted transition-colors"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Cerrar menú"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
            <Link
              to="/buyer"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted hover:text-brand"
            >
              <Mail className="size-4 shrink-0" aria-hidden="true" />
              Tienda Compradores
            </Link>
            <Link
              to="/acceso-corporativo"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted hover:text-brand"
            >
              <ArrowUpRight className="size-4 shrink-0" aria-hidden="true" />
              Acceso Vendedores
            </Link>
            <Link
              to="/health"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted hover:text-brand"
            >
              <ActivityIconSmall className="size-4 shrink-0" aria-hidden="true" />
              Estado del Sistema
            </Link>
          </nav>
          <div className="border-t border-border/80 pt-4 px-4">
            <ThemeToggleButton className="w-full justify-between px-0" />
          </div>
        </div>
      )}

      <main className="flex-1">
        {/* ── Cuerpo: dos columnas en desktop, una en mobile ── */}
        <div
          className="mx-auto max-w-6xl w-full p-4 sm:p-6 lg:p-0 flex lg:flex-row"
        >
          {/* ── Panel Izquierdo: confianza y propuesta de valor ── */}
          <section
            className="hidden lg:block lg:w-[44%] flex flex-col"
          >
            <div className="relative h-full p-8 sm:p-10">
              {/* Decoración atmosférica sutil */}
              <div
                className="pointer-events-none absolute -top-32 -left-20 h-80 w-80 rounded-full bg-brand/10 blur-[120px]"
                aria-hidden="true"
              />

              <div className="relative z-10 space-y-8">
                {/* Encabezado del panel */}
                <div className="flex items-center gap-2.5">
                  <LogoMark role="buyer" className="size-6 shrink-0" />
                  <span className="rounded-full border border-brand/20 bg-brand/5 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-brand uppercase">
                    Compradores
                  </span>
                </div>

                <Link
                  to="/buyer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-brand/20 bg-brand/5 px-3 py-1.5 text-xs font-semibold text-brand transition-colors hover:bg-brand hover:text-primary-foreground hover:border-brand"
                >
                  <ArrowUpRight className="h-3 w-3" />
                  <span>Seguir viendo la tienda</span>
                </Link>

                {/* Propuesta de valor */}
                <div className="space-y-4">
                  <span className="font-mono text-xs font-semibold tracking-wider text-brand uppercase">
                    Tu compra, garantizada
                  </span>
                  <h1 className="font-sans text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight">
                    Tus compras tecnológicas con stock reservado y envío directo.
                  </h1>
                  <p className="text-sm sm:text-base text-foreground-muted leading-relaxed">
                    Compra con tranquilidad. Reserva tu inventario, realiza tu pedido y sigue cada
                    etapa de la entrega desde un solo lugar.
                  </p>
                </div>

                {/* Beneficios */}
                <div className="space-y-3">
                  <BenefitItem
                    icon={<Clock className="h-4 w-4" />}
                    title="Reserva de Stock por 15 Minutos al Pagar"
                    description="15 minutos de inventario reservado durante el checkout."
                  />
                  <div className="h-px w-full bg-border-subtle" />
                  <BenefitItem
                    icon={<TruckIconSmall className="h-4 w-4" />}
                    title="Despacho Rastreable"
                    description="Seguimiento de tu pedido desde bodega hasta tu puerta."
                  />
                  <div className="h-px w-full bg-border-subtle" />
                  <BenefitItem
                    icon={<ShieldCheck className="h-4 w-4" />}
                    title="Devolución Protegida"
                    description="Procesos claros y respaldo de ZENTRIC."
                  />
                </div>
              </div>

              {/* Pie del panel */}
              <div className="mt-auto pt-6 border-t border-border/60 flex items-center gap-3 text-xs text-foreground-muted">
                <ShieldCheck className="h-3.5 w-3.5 text-brand shrink-0" />
                <span>Compra 100% protegida · Estatuto del Consumidor</span>
              </div>
            </div>
          </section>

          {/* ── Panel Derecho: Formulario ── */}
          <section className="flex flex-1 items-center justify-center bg-surface p-4 sm:p-6 lg:p-0">
            <div className="w-full max-w-sm space-y-6">
              <div className="space-y-2">
                <span className="font-mono text-[11px] font-semibold tracking-wider text-brand uppercase">
                  Cuenta de comprador
                </span>
                <h2 className="font-sans text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-snug">
                  Ingresa a tu cuenta
                </h2>
                <p className="text-sm text-foreground-muted leading-relaxed">
                  Ingresa para continuar con tus compras y administrar tus pedidos.
                </p>
              </div>

              {guestItemCount > 0 && (
                <div className="flex items-center justify-between rounded-lg border border-border bg-surface/50 px-3 py-2 text-xs">
                  <div className="flex items-center gap-2 text-foreground">
                    <Mail className="h-3.5 w-3.5 text-brand shrink-0" />
                    <span>
                      Tu carrito tiene{' '}
                      <strong className="font-semibold">{guestItemCount}</strong>{' '}
                      producto(s) listos para pagar.
                    </span>
                  </div>
                  <Link
                    to="/buyer/cart"
                    className="font-mono font-semibold text-brand hover:underline shrink-0"
                  >
                    Ver carrito →
                  </Link>
                </div>
              )}

              {renderAviso()}

              {submitError && (
                <Alert variant="danger" className="mb-2" role="alert">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No pudimos iniciar sesión</AlertTitle>
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="email"
                    className="font-mono text-[11px] font-medium tracking-wider text-foreground-muted uppercase"
                  >
                    Correo electrónico
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted pointer-events-none" />
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
                      className="pl-10 border-border bg-surface text-sm text-foreground focus:border-brand"
                    />
                  </div>
                  {fieldErrors.email && (
                    <p id="email-error" className="text-[11px] text-destructive">
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="password"
                    className="font-mono text-[11px] font-medium tracking-wider text-foreground-muted uppercase"
                  >
                    Contraseña
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
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
                      className="border-border bg-surface pr-12 text-sm text-foreground focus:border-brand"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      disabled={loginMutation.isPending}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      aria-pressed={showPassword}
                      className="absolute right-3 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center text-foreground-muted transition-colors hover:text-brand hover:bg-brand/10 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20 disabled:pointer-events-none disabled:opacity-50"
                    >
                      {showPassword ? (
                        <EyeOff className="h-3.5 w-3.5 transition-transform duration-200" />
                      ) : (
                        <Eye className="h-3.5 w-3.5 transition-transform duration-200" />
                      )}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p id="password-error" className="text-[11px] text-destructive">
                      {fieldErrors.password}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => {
                      setAcceptTerms(e.target.checked);
                      if (fieldErrors.legal) {
                        setFieldErrors((prev) => ({ ...prev, legal: undefined }));
                      }
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-border accent-brand shrink-0"
                  />
                  <span className="text-[11px] text-foreground-muted leading-relaxed">
                    Recordarme
                  </span>
                  <span
                    className="ml-auto text-[11px] font-medium text-brand transition-colors hover:underline"
                  >
                    ¿Olvidaste tu contraseña?</span>
                </div>

                <div className="space-y-2">
                  <label className="flex items-start gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(e) => {
                        setAcceptTerms(e.target.checked);
                        if (fieldErrors.legal) {
                          setFieldErrors((prev) => ({ ...prev, legal: undefined }));
                        }
                      }}
                      className="mt-0.5 h-4 w-4 rounded border-border accent-brand shrink-0"
                    />
                    <span className="text-[11px] text-foreground-muted leading-relaxed">
                      Acepto los{' '}
                      <Link to="/terms" className="font-medium text-brand hover:underline">
                        Términos y Condiciones
                      </Link>{' '}
                      y el{' '}
                      <Link to="/legal" className="font-medium text-brand hover:underline">
                        Estatuto del Consumidor
                      </Link>
                      .
                    </span>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={acceptPrivacy}
                      onChange={(e) => {
                        setAcceptPrivacy(e.target.checked);
                        if (fieldErrors.legal) {
                          setFieldErrors((prev) => ({ ...prev, legal: undefined }));
                        }
                      }}
                      className="mt-0.5 h-4 w-4 rounded border-border accent-brand shrink-0"
                    />
                    <span className="text-[11px] text-foreground-muted leading-relaxed">
                      Autorizo la{' '}
                      <Link to="/privacy" className="font-medium text-brand hover:underline">
                        Política de Privacidad
                      </Link>{' '}
                      y el uso de{' '}
                      <Link to="/cookies" className="font-medium text-brand hover:underline">
                        Cookies Esenciales
                      </Link>
                      .
                    </span>
                  </label>

                  {fieldErrors.legal && (
                    <p className="text-[11px] font-medium text-danger pt-1">
                      {fieldErrors.legal}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={loginMutation.isPending}
                  size="lg"
                  className="w-full bg-brand font-semibold text-primary-foreground shadow-xs transition-all hover:bg-brand-strong active:scale-[0.98]"
                >
                  {loginMutation.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      Ingresando a tu cuenta…
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Continuar
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </form>

              {/* Sección secundaria discreta */}
              <div className="space-y-3 border-t border-border/60 pt-5">
                <div className="flex items-center justify-between text-[11px] font-medium text-foreground-muted">
                  <span>¿Nuevo en ZENTRIC?</span>
                  <Link
                    to="/register"
                    className="text-brand underline-offset-2 hover:underline transition-colors"
                  >
                    Crear cuenta gratis
                  </Link>
                </div>

                {/* Acceso demo: menor jerarquía, sin credenciales visibles en producción */}
                <button
                  type="button"
                  disabled={loginMutation.isPending}
                  onClick={() => void handleQuickBuyerDemo()}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-brand/30 bg-brand/5 px-3 py-2 text-xs font-semibold text-brand transition-colors hover:bg-brand/10 disabled:opacity-50"
                >
                  <LogoMark role="buyer" className="size-3.5 shrink-0" />
                  <span>Usar Cuenta Demo</span>
                </button>

                <div className="flex items-center justify-between text-[10px] text-foreground-muted">
                  <span>¿Eres vendedor?</span>
                  <Link
                    to="/acceso-corporativo"
                    className="text-foreground hover:text-brand transition-colors underline-offset-2 hover:underline"
                  >
                    Portal de vendedores →
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
/** Icono de actividad pequeño (estado del sistema) */
function ActivityIconSmall({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    </svg>
  );
}

/** Icono de camión pequeño (despacho) */
function TruckIconSmall({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 3v2m6-2v2M9 19v2m6-2v2M5 17H3m2 12h10a2 2 0 002-2V9m-2-5H7m0 0L5 9m0 0l2 2m-2 2h10a2 2 0 002-2V9m-2-5L9 9m11 11v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h12a2 2 0 002-2z"
      />
    </svg>
  );
}

/** Iconos de Lucide re-exportados localmente para evitar imports faltantes */
const MenuIcon = (props: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);



/** Botón de conmutador de tema reutilizable (header y menú móvil) */
function ThemeToggleButton({ className }: { className?: string }) {
  // Usar el contexto de tema real a través de una consulta simple al DOM
  const isDark = document.documentElement.classList.contains('dark');
  return (
    <button
      type="button"
      onClick={() => {
        document.documentElement.classList.toggle('dark');
        localStorage.setItem('zentric-theme', isDark ? 'light' : 'dark');
      }}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className={`
        inline-flex items-center justify-center h-9 w-9 rounded-full text-foreground-muted
        transition-colors hover:text-foreground hover:bg-surface-muted
        ${className ?? ''}
      `}
    >
      {isDark ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}

/** Ítem de beneficio con icono lineal pequeño */
function BenefitItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactElement;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/5 text-brand shrink-0">
        {icon}
      </div>
      <div className="space-y-0.5">
        <span className="font-sans text-sm font-semibold text-foreground">
          {title}
        </span>
        <p className="text-xs text-foreground-muted leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}
