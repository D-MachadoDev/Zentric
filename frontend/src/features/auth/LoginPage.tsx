import { useState, type FormEvent } from 'react';
import { useNavigate, useSearch, Link } from '@tanstack/react-router';
import { useLoginMutation, LoginSchema, UserRole, mensajeDeError } from '../../core';
import { getRoleHomePath } from '../../app/guards/routeGuards';
import { appServices } from '../../app/providers/appServices';
import {
  consumePendingGuestCheckout,
  hasPendingGuestCheckout,
  getGuestCartCount,
  syncGuestCartToBackend,
} from '../buyer/guestCart';
import { syncGuestFavoritesToBackend } from '../buyer/favoritesSync';
import {
  Button,
  Input,
  PasswordInput,
  BoundaryNoticeCard,
  Label,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Checkbox,
  Spinner,
} from '@zentric/ui';
import {
  ArrowRight,
  Store,
  CheckCircle2,
  AlertCircle,
  Clock,
  Mail,
  ShoppingBag,
} from 'lucide-react';

/**
 * Sanitiza rutas de redirección bloqueando open redirect y protocolos externos (CWE-601).
 * Solo admite rutas relativas que inicien con un único '/' y descarta barras dobles ('//'),
 * secuencias de escape con backslash ('\') y esquemas de protocolo.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function sanitizeRedirect(rawRedirect: string | undefined | null): string | null {
  if (!rawRedirect || typeof rawRedirect !== 'string') return null;
  const trimmed = rawRedirect.trim();
  if (
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('/\\') ||
    trimmed.includes('\\') ||
    trimmed.includes('://')
  ) {
    return null;
  }
  return trimmed;
}

function getRoleSpanishLabel(role: UserRole): string {
  switch (role) {
    case UserRole.Seller:
      return 'Vendedor';
    case UserRole.Administrator:
      return 'Administrador';
    case UserRole.LogisticsOperator:
      return 'Logística';
    case UserRole.Supervisor:
      return 'Supervisión';
    default:
      return 'Operaciones';
  }
}

export function LoginPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as {
    aviso?: string;
    redirect?: string;
  };

  const loginMutation = useLoginMutation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [interceptedBoundary, setInterceptedBoundary] = useState<{
    role: UserRole;
    roleName: string;
  } | null>(null);
  const guestItemCount = getGuestCartCount();

  const completePostLoginNavigation = async (role: UserRole) => {
    if (role === UserRole.Buyer) {
      const hadPendingCheckout = hasPendingGuestCheckout();
      try {
        await syncGuestCartToBackend(appServices.api);
        consumePendingGuestCheckout();
      } catch (syncError) {
        // Blocker D1: Si falla la sincronización con el backend, no abortamos el login.
        // Se preserva la sesión y se mantiene el flag en almacenamiento para reintento.
        console.warn('Fallo no bloqueante al sincronizar carrito de invitado tras login:', syncError);
      }

      try {
        await syncGuestFavoritesToBackend(appServices.api);
      } catch (syncError) {
        // No bloqueante: la migración de favoritos ya ignora errores por ítem,
        // este catch solo protege el flujo ante cualquier excepción inesperada.
        console.warn('Fallo no bloqueante al sincronizar favoritos de invitado tras login:', syncError);
      }

      // Blocker D2: Si el usuario tenía un checkout pendiente, se prioriza ir a /buyer/cart
      if (hadPendingCheckout) {
        navigate({ to: '/buyer/cart' });
        return;
      }
    }
    const safeRedirect = sanitizeRedirect(search.redirect);
    const targetPath = safeRedirect ?? getRoleHomePath(role);
    navigate({ to: targetPath });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setInterceptedBoundary(null);

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

      // Boundary Enforcement: El portal de login (/login) es exclusivo para Compradores.
      // Si se detecta un rol corporativo, interceptamos el flujo y presentamos BoundaryNoticeCard.
      if (result.role !== UserRole.Buyer) {
        setInterceptedBoundary({
          role: result.role,
          roleName: getRoleSpanishLabel(result.role),
        });
        return;
      }

      await completePostLoginNavigation(result.role);
    } catch (err: unknown) {
      setSubmitError(mensajeDeError(err, { enAcceso: true }));
    }
  };

  const renderAviso = () => {
    if (search.aviso === 'sin-sesion') {
      return (
        <div className="flex items-center gap-2.5 rounded-lg border border-teal-500/25 bg-teal-500/10 px-3 py-2 text-xs text-teal-800 dark:text-teal-300">
          <AlertCircle className="size-4 shrink-0 text-teal-600 dark:text-teal-400" />
          <div className="leading-snug">
            <span className="font-semibold">Sesión Requerida. </span>
            <span>Ingresa con tu cuenta para consultar tus pedidos y direcciones.</span>
          </div>
        </div>
      );
    }
    if (search.aviso === 'expirada') {
      return (
        <div className="flex items-center gap-2.5 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
          <Clock className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="leading-snug">
            <span className="font-semibold">Sesión Expirada. </span>
            <span>Por tu seguridad la sesión ha caducado. Ingresa nuevamente tus datos.</span>
          </div>
        </div>
      );
    }
    if (search.aviso === 'cuenta-creada') {
      return (
        <div className="flex items-center gap-2.5 rounded-lg border border-teal-500/25 bg-teal-500/10 px-3 py-2 text-xs text-teal-800 dark:text-teal-300">
          <CheckCircle2 className="size-4 shrink-0 text-teal-600 dark:text-teal-400" />
          <div className="leading-snug">
            <span className="font-semibold">Cuenta Creada Exitosamente. </span>
            <span>Inicia sesión para continuar con tu compra.</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div data-role="buyer" className="w-full max-w-[420px] mx-auto py-2 sm:py-3">
      <Card surface="secondary" className="p-6 sm:p-7 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs gap-0">
        <CardHeader className="p-0 pb-4 space-y-1.5">
          {guestItemCount > 0 && (
            <div className="mb-2">
              <Link
                to="/buyer/cart"
                className="inline-flex items-center gap-1.5 rounded-lg border border-teal-500/30 bg-teal-500/5 px-2.5 py-1 text-xs font-medium text-teal-600 dark:text-teal-400 hover:border-teal-500/50 transition-colors"
              >
                <ShoppingBag className="size-3.5 text-teal-600 dark:text-teal-400" />
                <span>{guestItemCount} ítem(s) en tu carrito</span>
              </Link>
            </div>
          )}

          <CardTitle className="p-0">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground leading-tight">
              Iniciar sesión
            </h1>
          </CardTitle>
          <CardDescription className="text-sm text-foreground-muted leading-relaxed pt-0.5">
            Ingresa a tu cuenta para gestionar tus compras y pedidos.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0 flex flex-col gap-3.5">
          {interceptedBoundary && (
            <BoundaryNoticeCard
              targetPortal="corporate"
              detectedRoleName={interceptedBoundary.roleName}
              onJump={() => navigate({ to: '/acceso-corporativo' })}
              onDismiss={() => setInterceptedBoundary(null)}
            />
          )}

          {renderAviso()}

          {submitError && (
            <div
              role="alert"
              className="flex items-center gap-2.5 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-xs text-destructive dark:text-red-400"
            >
              <AlertCircle className="size-4 shrink-0" />
              <span className="leading-snug">{submitError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5" noValidate aria-busy={loginMutation.isPending}>
            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-xs font-medium text-foreground tracking-wide"
              >
                Correo electrónico
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted pointer-events-none" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="tu@correo.com"
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
                  className="pl-10 h-10 rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-foreground-muted transition-colors focus:border-teal-600 dark:focus:border-teal-400 focus:ring-1 focus:ring-teal-500/20 focus:outline-none"
                />
              </div>
              {fieldErrors.email && (
                <p id="email-error" className="text-[11px] font-medium text-destructive">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-xs font-medium text-foreground tracking-wide"
              >
                Contraseña
              </Label>
              <PasswordInput
                id="password"
                name="password"
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
                hasError={Boolean(fieldErrors.password)}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? 'password-error' : undefined}
              />
              {fieldErrors.password && (
                <p id="password-error" className="text-[11px] font-medium text-destructive">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <div className="inline-flex items-center gap-2">
                <Checkbox
                  id="rememberMe"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                />
                <Label
                  htmlFor="rememberMe"
                  className="text-xs text-foreground-muted cursor-pointer select-none hover:text-foreground"
                >
                  Recordarme
                </Label>
              </div>

              <button
                type="button"
                onClick={() => navigate({ to: '/recuperar-contrasena' })}
                className="text-xs font-medium text-foreground-muted hover:text-teal-600 dark:hover:text-teal-400 hover:underline cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30 rounded-xs"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <Button
              type="submit"
              disabled={loginMutation.isPending}
              size="lg"
              className="w-full h-10 rounded-lg bg-zinc-900 hover:bg-black text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 font-semibold text-sm transition-colors cursor-pointer shadow-xs active:scale-[0.99] mt-1.5 focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2"
            >
              {loginMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner size="sm" className="text-current" />
                  Iniciando sesión…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Continuar
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>

            <div className="flex flex-wrap items-center justify-center gap-1.5 text-center text-[11px] text-foreground-muted pt-1 [text-wrap:balance]">
              <span>Al continuar, aceptas nuestros</span>
              <Link
                to="/terms"
                className="font-medium text-foreground underline underline-offset-2 hover:text-teal-600 transition-colors"
              >
                Términos de Servicio
              </Link>
              <span className="text-border" aria-hidden="true">·</span>
              <Link
                to="/privacy"
                className="font-medium text-foreground underline underline-offset-2 hover:text-teal-600 transition-colors"
              >
                Política de Privacidad
              </Link>
              <span>.</span>
            </div>
          </form>

          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
          </div>

          <div className="text-center text-xs text-foreground-muted">
            <span>¿No tienes cuenta? </span>
            <Link
              to="/register"
              className="font-semibold text-foreground hover:underline transition-colors"
            >
              Regístrate gratis
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="mt-3 flex items-center justify-center gap-2 text-center text-xs text-foreground-muted">
        <Store className="size-3.5 text-foreground-muted shrink-0" />
        <span>¿Eres vendedor? </span>
        <Link
          to="/acceso-corporativo"
          className="font-medium text-foreground hover:underline transition-colors"
        >
          Portal Corporativo →
        </Link>
      </div>
    </div>
  );
}
