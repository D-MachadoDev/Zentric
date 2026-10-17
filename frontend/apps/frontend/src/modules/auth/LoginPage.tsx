import { useState, type FormEvent } from 'react';
import { useNavigate, useSearch, Link } from '@tanstack/react-router';
import { useLoginMutation } from '../../application/services/identity';
import { LoginSchema } from '../../application/schemas';
import { getRoleHomePath } from '../../app/guards/routeGuards';
import {
  Button,
  Input,
  Label,
  Alert,
  AlertTitle,
  AlertDescription,
  Badge,
  Logo,
} from '@zentric/ui';
import {
  ArrowRight,
  ShieldCheck,
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
} from 'lucide-react';

/**
 * Pantalla de Inicio de Sesión (Frontend SDD C4-4 §2 y Frontend-Role-Modules §2.1).
 * Implementa el patrón Split-Frame Asimétrico (55% / 45%) y la doctrina visual anti-IA genérica.
 */
export function LoginPage() {
  const navigate = useNavigate();
  // Validamos búsqueda opcional de parámetros (ej. aviso de sesión o redirección previa)
  const search = useSearch({ strict: false }) as {
    aviso?: string;
    redirect?: string;
  };

  const loginMutation = useLoginMutation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showDemoSelector, setShowDemoSelector] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Validación en cliente con Zod schema
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

      // Navegación determinista según rol autenticado o redirección original solicitada
      const targetPath = search.redirect || getRoleHomePath(result.role);
      navigate({ to: targetPath });
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Error de autenticación. Verifique sus credenciales.';
      setSubmitError(errorMsg);
    }
  };

  // Mensaje informativo contextual según search.aviso
  const renderAviso = () => {
    if (search.aviso === 'sin-sesion') {
      return (
        <Alert variant="info" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Sesión Requerida</AlertTitle>
          <AlertDescription>
            Debe iniciar sesión para acceder a las consolas protegidas del sistema.
          </AlertDescription>
        </Alert>
      );
    }
    if (search.aviso === 'expirada') {
      return (
        <Alert variant="warning" className="mb-6">
          <Clock className="h-4 w-4" />
          <AlertTitle>Sesión Expirada</AlertTitle>
          <AlertDescription>
            Su sesión en memoria ha caducado. Ingrese nuevamente sus credenciales.
          </AlertDescription>
        </Alert>
      );
    }
    if (search.aviso === 'cuenta-creada') {
      return (
        <Alert variant="success" className="mb-6">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Cuenta Creada Exitosamente</AlertTitle>
          <AlertDescription>
            Su cuenta de Comprador ha sido registrada. Inicie sesión para continuar.
          </AlertDescription>
        </Alert>
      );
    }
    return null;
  };

  const applyDemoCredentials = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setFieldErrors({});
    setSubmitError(null);
  };

  return (
    <div className="surface-hairline my-4 flex w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border bg-surface text-foreground shadow-2xl lg:flex-row">
      {/* ── Zona Izquierda: Split-Frame Asimétrico Editorial (55%) ─────────── */}
      <div className="relative flex flex-col justify-between overflow-hidden border-b border-border bg-surface-muted/90 p-8 sm:p-10 lg:w-[55%] lg:border-r lg:border-b-0 lg:p-12">
        {/* Glow focal y retícula sutil */}
        <div
          className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-brand/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative z-10 space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-5">
            <div className="flex items-center gap-3">
              <Logo />
              <Badge variant="outline" className="border-border font-mono text-xs text-brand">
                v1.1.0
              </Badge>
            </div>
            <span className="kicker-spike">ARQUITECTURA HEXAGONAL · DDD</span>
          </div>

          <div className="max-w-xl space-y-4">
            <div className="font-mono text-xs font-semibold tracking-[0.14em] text-brand uppercase">
              01 // PLATAFORMA MULTI-VENDEDOR
            </div>
            <h1 className="font-sans text-3xl leading-[1.08] font-bold tracking-tight text-foreground sm:text-4xl lg:text-[2.65rem]">
              Control centralizado y transaccionalidad sin fricción.
            </h1>
            <p className="text-base leading-relaxed text-foreground-muted">
              Marketplace multi-vendedor con inventarios distribuidos por bodega física, checkout
              atómico con reserva de 15 minutos, liquidación fiscal split y auditoría 360°.
            </p>
          </div>

          {/* Pilares normativos en retícula ortogonal suiza */}
          <div className="grid max-w-xl grid-cols-1 gap-3.5 pt-2 sm:grid-cols-2">
            <div className="surface-hairline space-y-2 rounded-xl p-4">
              <div className="flex items-center justify-between text-brand">
                <span className="flex items-center gap-2 font-mono text-xs font-semibold tracking-wider uppercase">
                  <Clock className="h-3.5 w-3.5 text-warning" />
                  Checkout Atómico
                </span>
                <span className="font-mono text-[11px] font-bold text-warning tabular-nums">15:00m</span>
              </div>
              <p className="text-xs leading-relaxed text-foreground-muted">
                Reserva exclusiva de existencias por 15 minutos que previene el sobregiro de stock.
              </p>
            </div>

            <div className="surface-hairline space-y-2 rounded-xl p-4">
              <div className="flex items-center justify-between text-brand">
                <span className="flex items-center gap-2 font-mono text-xs font-semibold tracking-wider uppercase">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Seguridad RG-01/02
                </span>
                <span className="font-mono text-[11px] font-bold text-brand tabular-nums">21 RBAC</span>
              </div>
              <p className="text-xs leading-relaxed text-foreground-muted">
                Sesión persistente en localStorage validada por JWT, rol único y 21 políticas de autorización.
              </p>
            </div>

            <div className="surface-hairline space-y-2 rounded-xl p-4">
              <div className="flex items-center justify-between text-brand">
                <span className="flex items-center gap-2 font-mono text-xs font-semibold tracking-wider uppercase">
                  <Layers className="h-3.5 w-3.5" />
                  Facturación Split
                </span>
                <span className="font-mono text-[11px] font-bold text-foreground tabular-nums">95% / 5%</span>
              </div>
              <p className="text-xs leading-relaxed text-foreground-muted">
                Factura Maestra para el comprador y liquidación individual confidencial por vendedor.
              </p>
            </div>

            <div className="surface-hairline space-y-2 rounded-xl p-4">
              <div className="flex items-center justify-between text-brand">
                <span className="flex items-center gap-2 font-mono text-xs font-semibold tracking-wider uppercase">
                  <Activity className="h-3.5 w-3.5" />
                  Logística Real
                </span>
                <span className="font-mono text-[11px] font-bold text-foreground tabular-nums">14 DbSets</span>
              </div>
              <p className="text-xs leading-relaxed text-foreground-muted">
                Inspección técnica en bodega y certificación de entrega con cadena de custodia.
              </p>
            </div>
          </div>
        </div>

        {/* Telemetría en vivo */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-t border-border/80 pt-6">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-border bg-surface px-3.5 py-1.5 font-mono text-xs text-foreground-muted">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
            </span>
            <span className="tabular-nums">RED CENTRAL EN LÍNEA · POSTGRESQL 16</span>
          </div>
          <span className="font-mono text-[11px] text-foreground-subtle tabular-nums">
            PORT 5076 · JWT HS256
          </span>
        </div>
      </div>

      {/* ── Zona Derecha: Formulario de Autenticación (45%) ─────────────────── */}
      <div className="flex flex-1 items-center justify-center bg-surface p-6 sm:p-10 lg:p-12">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-1.5">
            <span className="kicker-spike">ACCESO IDENTIFICADO · RG-01</span>
            <h2 className="font-sans text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Entrar a la consola
            </h2>
            <p className="text-sm text-foreground-muted">
              Ingrese sus credenciales o seleccione un perfil operativo de prueba abajo.
            </p>
          </div>

          {renderAviso()}

          {submitError && (
            <Alert variant="destructive" className="mb-4" role="alert">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Acceso Denegado</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="font-mono text-xs font-medium tracking-wider text-foreground-muted uppercase">
                Correo Electrónico
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="usuario@zentric.local"
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
              </div>
              {fieldErrors.email && (
                <p id="email-error" className="text-xs text-red-400">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="font-mono text-xs font-medium tracking-wider text-foreground-muted uppercase">
                  Contraseña
                </Label>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type="password"
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
                  className="border-border bg-surface font-mono text-sm text-foreground focus:border-brand"
                />
              </div>
              {fieldErrors.password && (
                <p id="password-error" className="text-xs text-red-400">
                  {fieldErrors.password}
                </p>
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
                  Verificando credenciales...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Acceder a la Consola
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          {/* Conmutador discreto Modo Demo / QA (ADR-0012 & design.md) */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowDemoSelector((v) => !v)}
              className="flex items-center gap-1.5 text-[11px] font-mono text-foreground-muted hover:text-brand transition-colors"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>{showDemoSelector ? 'Ocultar Cuentas Demo' : 'Acceso Rápido Demo / QA (5 Roles)'}</span>
              <span className="text-[10px] text-foreground-muted">{showDemoSelector ? '▲' : '▼'}</span>
            </button>

            {showDemoSelector && (
              <div className="mt-2.5 rounded-xl border border-border bg-surface/90 p-3.5 space-y-2.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-semibold tracking-wider text-foreground-muted uppercase">
                    ✱ Autocompletar Rol Demo
                  </span>
                  <span className="font-mono text-[10px] text-foreground-subtle">1-clic</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => applyDemoCredentials('admin@zentric.local', 'AdminLocal12345')}
                    className="rounded-lg border border-border bg-surface-muted/80 px-2.5 py-1.5 text-left font-mono text-[11px] text-foreground transition-colors hover:border-brand/60 hover:text-brand"
                  >
                    <div className="font-semibold">Admin</div>
                    <div className="truncate text-[10px] text-foreground-muted">admin@zentric.local</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDemoCredentials('seller@zentric.local', 'SellerLocal12345')}
                    className="rounded-lg border border-border bg-surface-muted/80 px-2.5 py-1.5 text-left font-mono text-[11px] text-foreground transition-colors hover:border-brand/60 hover:text-brand"
                  >
                    <div className="font-semibold">Seller</div>
                    <div className="truncate text-[10px] text-foreground-muted">seller@zentric.local</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDemoCredentials('buyer@zentric.local', 'BuyerLocal12345')}
                    className="rounded-lg border border-border bg-surface-muted/80 px-2.5 py-1.5 text-left font-mono text-[11px] text-foreground transition-colors hover:border-brand/60 hover:text-brand"
                  >
                    <div className="font-semibold">Buyer</div>
                    <div className="truncate text-[10px] text-foreground-muted">buyer@zentric.local</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDemoCredentials('logistics@zentric.local', 'LogisticsLocal12345')}
                    className="rounded-lg border border-border bg-surface-muted/80 px-2.5 py-1.5 text-left font-mono text-[11px] text-foreground transition-colors hover:border-brand/60 hover:text-brand"
                  >
                    <div className="font-semibold">Logistics</div>
                    <div className="truncate text-[10px] text-foreground-muted">logistics@zentric.local</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDemoCredentials('supervisor@zentric.local', 'SupervisorLocal12345')}
                    className="col-span-2 rounded-lg border border-border bg-surface-muted/80 px-2.5 py-1.5 text-left font-mono text-[11px] text-foreground transition-colors hover:border-brand/60 hover:text-brand sm:col-span-1"
                  >
                    <div className="font-semibold">Supervisor</div>
                    <div className="truncate text-[10px] text-foreground-muted">supervisor@zentric.local</div>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center justify-between gap-3 border-t border-border/80 pt-4 text-xs text-foreground-muted sm:flex-row">
            <div>
              ¿Eres nuevo comprador?{' '}
              <Link
                to="/register"
                className="font-medium text-brand transition-colors hover:underline"
              >
                Crea tu cuenta aquí
              </Link>
            </div>
            <Link
              to="/health"
              className="font-mono text-xs text-foreground-muted transition-colors hover:text-foreground-muted"
            >
              Telemetría y Estado →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
