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

  return (
    <div className="w-full max-w-5xl rounded-2xl border border-[#1F293D] bg-[#0B0F19] overflow-hidden flex flex-col lg:flex-row shadow-2xl my-4 text-foreground">
      {/* ── Zona Izquierda: Split-Frame Asimétrico Editorial (55%) ─────────── */}
      <div className="relative flex flex-col justify-between p-8 sm:p-10 lg:w-[55%] lg:p-12 border-b lg:border-b-0 lg:border-r border-[#1F293D] overflow-hidden bg-[#0D1322]/80">
        {/* Glow sutil de fondo */}
        <div
          className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-[#00D4AA]/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative z-10 space-y-8">
          <div className="flex items-center gap-3">
            <Logo />
            <Badge variant="outline" className="border-[#1F293D] text-[#00D4AA] font-mono text-xs">
              v1.1.0
            </Badge>
          </div>

          <div className="space-y-4 max-w-xl">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white font-sans">
              Control centralizado y transaccionalidad sin fricción.
            </h1>
            <p className="text-base sm:text-lg text-[#94A3B8] leading-relaxed">
              Marketplace multi-vendedor con inventarios distribuidos, checkout atómico con reserva
              de 15 minutos y trazabilidad estricta bajo arquitectura hexagonal.
            </p>
          </div>

          {/* Pilares normativos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl pt-4">
            <div className="rounded-xl border border-[#1F293D] bg-[#111827]/70 p-4 space-y-2">
              <div className="flex items-center gap-2 text-[#00D4AA]">
                <Clock className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider font-mono">
                  Checkout Atómico
                </span>
              </div>
              <p className="text-xs text-[#94A3B8]">
                Reserva exclusiva de existencias por 15 minutos que previene el sobregiro de stock.
              </p>
            </div>

            <div className="rounded-xl border border-[#1F293D] bg-[#111827]/70 p-4 space-y-2">
              <div className="flex items-center gap-2 text-[#00D4AA]">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider font-mono">
                  Seguridad RG-01/02
                </span>
              </div>
              <p className="text-xs text-[#94A3B8]">
                Sesión en memoria RAM, rol único y 21 políticas estrictas de autorización.
              </p>
            </div>

            <div className="rounded-xl border border-[#1F293D] bg-[#111827]/70 p-4 space-y-2">
              <div className="flex items-center gap-2 text-[#00D4AA]">
                <Layers className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider font-mono">
                  Facturación Split
                </span>
              </div>
              <p className="text-xs text-[#94A3B8]">
                Factura Maestra para el comprador y liquidación individual confidencial por vendedor.
              </p>
            </div>

            <div className="rounded-xl border border-[#1F293D] bg-[#111827]/70 p-4 space-y-2">
              <div className="flex items-center gap-2 text-[#00D4AA]">
                <Activity className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider font-mono">
                  Logística Real
                </span>
              </div>
              <p className="text-xs text-[#94A3B8]">
                Inspección técnica en bodega y certificación de entrega con cadena de custodia.
              </p>
            </div>
          </div>
        </div>

        {/* Telemetría en vivo */}
        <div className="relative z-10 pt-10">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-[#1F293D] bg-[#111827]/90 px-4 py-2 text-xs font-mono text-[#94A3B8]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00D4AA] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00D4AA]" />
            </span>
            <span className="tabular-nums">RED CENTRAL EN LÍNEA · POSTGRESQL CONECTADO</span>
          </div>
        </div>
      </div>

      {/* ── Zona Derecha: Formulario de Autenticación (45%) ─────────────────── */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-12 lg:p-16 bg-[#0B0F19]">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
              Entrar a la consola
            </h2>
            <p className="text-sm text-[#94A3B8]">
              Ingrese sus credenciales corporativas o de cliente para acceder a su rol.
            </p>
          </div>

          {renderAviso()}

          {submitError && (
            <Alert variant="destructive" className="mb-6" role="alert">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Acceso Denegado</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-[#94A3B8]">
                Correo Electrónico
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="usuario@zentric.me"
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
                  className="bg-[#111827] border-[#1F293D] focus:border-[#00D4AA] text-white"
                />
              </div>
              {fieldErrors.email && (
                <p id="email-error" className="text-xs text-red-400">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-[#94A3B8]">
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
                  className="bg-[#111827] border-[#1F293D] focus:border-[#00D4AA] text-white"
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
              className="w-full bg-[#00D4AA] hover:bg-[#00D4AA]/90 text-[#0B0F19] font-semibold py-2.5 transition-colors shadow-lg shadow-[#00D4AA]/20"
            >
              {loginMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0B0F19] border-t-transparent" />
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

          <div className="pt-4 border-t border-[#1F293D]/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#94A3B8]">
            <div>
              ¿Eres nuevo comprador?{' '}
              <Link
                to="/register"
                className="font-medium text-[#00D4AA] hover:underline transition-colors"
              >
                Crea tu cuenta aquí
              </Link>
            </div>
            <Link
              to="/health"
              className="font-mono text-xs text-[#64748B] hover:text-[#94A3B8] transition-colors"
            >
              Telemetría y Estado →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
