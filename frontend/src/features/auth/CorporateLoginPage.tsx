import { useState, type FormEvent } from 'react';
import { useNavigate, useSearch, Link } from '@tanstack/react-router';
import { useLoginMutation, LoginSchema, UserRole, mensajeDeError } from '../../core';
import { sanitizeRedirect } from './LoginPage';
import { getRoleHomePath } from '../../app/guards/routeGuards';
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
  LogoMark,
  type BrandRole,
} from '@zentric/ui';
import {
  ArrowRight,
  AlertCircle,
  Lock,
} from 'lucide-react';

interface CorporateRoleIdentity {
  role: Exclude<BrandRole, 'buyer'>;
  label: string;
  stationTitle: string;
  description: string;
  email: string;
  route: string;
  legalNotice: string;
}

const CORPORATE_ROLE_IDENTITIES: CorporateRoleIdentity[] = [
  {
    role: 'seller',
    label: 'Vendedor',
    stationTitle: 'Consola de Socios · Seller Central',
    description: 'Estación de gestión de catálogo, órdenes de venta y liquidaciones comerciales.',
    email: 'seller@zentric.local',
    route: '/seller',
    legalNotice: 'Acuerdo de Operación Comercial y Nivel de Servicio',
  },
  {
    role: 'logistics',
    label: 'Logística',
    stationTitle: 'Muelle & Centro de Operaciones',
    description: 'Control de recepción, trazabilidad de despachos e inspección física de retornos.',
    email: 'logistics@zentric.local',
    route: '/logistics/fulfillments',
    legalNotice: 'Protocolo de Custodia de Mercancía y Operación de Muelle',
  },
  {
    role: 'supervisor',
    label: 'Supervisión',
    stationTitle: 'Fiscalización & Auditoría 360°',
    description: 'Inspección operativa y conciliación tributaria sin exposición de PII.',
    email: 'supervisor@zentric.local',
    route: '/supervisor',
    legalNotice: 'Protocolo de Auditoría Interna y Protección de Datos',
  },
  {
    role: 'admin',
    label: 'Admin',
    stationTitle: 'Gobierno Corporativo & RBAC',
    description: 'Administración global de políticas de acceso, infraestructura y tesorería.',
    email: 'admin@zentric.local',
    route: '/admin',
    legalNotice: 'Políticas de Gobierno Corporativo y Cumplimiento Financiero',
  },
];

export function CorporateLoginPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as {
    aviso?: string;
    redirect?: string;
  };

  const loginMutation = useLoginMutation();

  const [activeRole, setActiveRole] = useState<Exclude<BrandRole, 'buyer'>>('seller');
  const [email, setEmail] = useState(import.meta.env.DEV ? CORPORATE_ROLE_IDENTITIES[0]!.email : '');
  const [password, setPassword] = useState('');
  const [interceptedBuyerNotice, setInterceptedBuyerNotice] = useState(false);
  const [acceptCorporateTerms, setAcceptCorporateTerms] = useState(true);
  const [acceptDataCompliance, setAcceptDataCompliance] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    legal?: string;
  }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedIdentity =
    CORPORATE_ROLE_IDENTITIES.find((item) => item.role === activeRole) ??
    CORPORATE_ROLE_IDENTITIES[0]!;

  const selectRoleStation = (identity: CorporateRoleIdentity) => {
    setActiveRole(identity.role);
    if (import.meta.env.DEV) {
      setEmail(identity.email);
    }
    setFieldErrors({});
    setSubmitError(null);
    setInterceptedBuyerNotice(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setInterceptedBuyerNotice(false);

    if (!acceptCorporateTerms || !acceptDataCompliance) {
      setFieldErrors((prev) => ({
        ...prev,
        legal:
          'Debe aceptar los Términos de Operación y la Política de Confidencialidad para acceder a la estación.',
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

      // Boundary Enforcement: Si la cuenta pertenece a un Comprador B2C, bloqueamos el acceso corporativo
      if (result.role === UserRole.Buyer) {
        setInterceptedBuyerNotice(true);
        return;
      }

      const safeRedirect = sanitizeRedirect(search.redirect);
      const targetPath = safeRedirect ?? getRoleHomePath(result.role);
      navigate({ to: targetPath });
    } catch (err: unknown) {
      setSubmitError(mensajeDeError(err, { enAcceso: true }));
    }
  };

  return (
    <div data-role={activeRole} className="w-full max-w-[460px] mx-auto py-2 sm:py-3">
      <Card
        surface="secondary"
        className="p-6 sm:p-7 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs gap-0"
      >
        <CardHeader className="p-0 pb-4 space-y-3">
          {/* Selector segmentado superior de estaciones RBAC */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
              <span className="uppercase tracking-wider font-semibold">Estación Operativa</span>
              <span className="font-medium text-teal-600 dark:text-teal-400">RBAC: {selectedIdentity.label}</span>
            </div>
            <div
              className="grid grid-cols-4 gap-1 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60"
              role="tablist"
              aria-label="Estaciones operativas"
            >
              {CORPORATE_ROLE_IDENTITIES.map((item) => {
                const isSelected = activeRole === item.role;
                return (
                  <button
                    key={item.role}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    data-role={item.role}
                    onClick={() => selectRoleStation(item)}
                    className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 px-2 text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs font-semibold'
                        : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                    }`}
                  >
                    <LogoMark role={item.role} className="size-3.5 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Título de la Estación Activa + Descripción Institucional */}
          <div className="space-y-1 pt-1">
            <CardTitle className="p-0">
              <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-tight">
                {selectedIdentity.stationTitle}
              </h1>
            </CardTitle>
            <CardDescription className="text-xs text-foreground-muted leading-relaxed min-h-[32px] sm:min-h-[36px]">
              {selectedIdentity.description}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0 flex flex-col gap-3.5">
          {/* Boundary Enforcement: Intercepción si entra un Comprador B2C */}
          {interceptedBuyerNotice && (
            <BoundaryNoticeCard
              targetPortal="buyer"
              onJump={() => navigate({ to: '/login' })}
              onDismiss={() => setInterceptedBuyerNotice(false)}
            />
          )}

          {/* Error de Envío / Autenticación */}
          {submitError && (
            <div
              role="alert"
              className="flex items-center gap-2.5 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-xs text-destructive dark:text-red-400"
            >
              <AlertCircle className="size-4 shrink-0" />
              <span className="leading-snug">{submitError}</span>
            </div>
          )}

          {/* Formulario de Acceso Corporativo */}
          <form onSubmit={handleSubmit} className="space-y-3.5" noValidate aria-busy={loginMutation.isPending}>
            {/* Correo Institucional */}
            <div className="space-y-1.5">
              <Label
                htmlFor="corp-email"
                className="text-xs font-medium text-foreground tracking-wide"
              >
                Correo Institucional de {selectedIdentity.label}
              </Label>
              <Input
                id="corp-email"
                name="email"
                type="email"
                placeholder={import.meta.env.DEV ? selectedIdentity.email : 'usuario@empresa.com'}
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  const nextEmail = e.target.value;
                  setEmail(nextEmail);
                  const matched = CORPORATE_ROLE_IDENTITIES.find((r) =>
                    nextEmail.toLowerCase().startsWith(r.role),
                  );
                  if (matched) setActiveRole(matched.role);
                  if (fieldErrors.email) {
                    setFieldErrors((prev) => ({ ...prev, email: undefined }));
                  }
                }}
                disabled={loginMutation.isPending}
                aria-invalid={Boolean(fieldErrors.email)}
                className="h-10 text-sm font-mono"
              />
              {fieldErrors.email && (
                <p className="text-xs text-destructive">{fieldErrors.email}</p>
              )}
            </div>

            {/* Contraseña con Toggle Accesible (PasswordInput) */}
            <div className="space-y-1.5">
              <Label
                htmlFor="corp-password"
                className="text-xs font-medium text-foreground tracking-wide"
              >
                Contraseña
              </Label>
              <PasswordInput
                id="corp-password"
                name="password"
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
                hasError={Boolean(fieldErrors.password)}
                aria-invalid={Boolean(fieldErrors.password)}
              />
              {fieldErrors.password && (
                <p className="text-xs text-destructive">{fieldErrors.password}</p>
              )}
              <div className="flex justify-end">
                <Link
                  to="/recuperar-contrasena"
                  className="text-xs font-medium text-teal-600 underline-offset-2 hover:underline dark:text-teal-400"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>

            {/* Checkboxes de Términos Operativos y Confidencialidad */}
            <div className="space-y-1.5 rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-900/50 p-2.5 text-xs text-zinc-600 dark:text-zinc-400">
              <label className="flex cursor-pointer select-none items-start gap-2">
                <input
                  type="checkbox"
                  checked={acceptCorporateTerms}
                  onChange={(e) => {
                    setAcceptCorporateTerms(e.target.checked);
                    if (fieldErrors.legal) {
                      setFieldErrors((prev) => ({ ...prev, legal: undefined }));
                    }
                  }}
                  className="mt-0.5 size-3.5 rounded border-zinc-300 dark:border-zinc-700 accent-teal-600"
                />
                <span className="leading-snug">
                  Acepto los{' '}
                  <Link
                    to="/terminos-y-condiciones"
                    className="font-medium text-zinc-900 dark:text-zinc-200 underline underline-offset-2 hover:text-teal-600 dark:hover:text-teal-400"
                  >
                    Términos de Operación ({selectedIdentity.label})
                  </Link>{' '}
                  y{' '}
                  <Link
                    to="/politica-de-privacidad"
                    className="font-medium text-zinc-900 dark:text-zinc-200 underline underline-offset-2 hover:text-teal-600 dark:hover:text-teal-400"
                  >
                    Privacidad
                  </Link>
                  .
                </span>
              </label>

              <label className="flex cursor-pointer select-none items-start gap-2">
                <input
                  type="checkbox"
                  checked={acceptDataCompliance}
                  onChange={(e) => {
                    setAcceptDataCompliance(e.target.checked);
                    if (fieldErrors.legal) {
                      setFieldErrors((prev) => ({ ...prev, legal: undefined }));
                    }
                  }}
                  className="mt-0.5 size-3.5 rounded border-zinc-300 dark:border-zinc-700 accent-teal-600"
                />
                <span className="leading-snug">
                  Cumplo la{' '}
                  <Link
                    to="/cookies"
                    className="font-medium text-zinc-900 dark:text-zinc-200 underline underline-offset-2 hover:text-teal-600 dark:hover:text-teal-400"
                  >
                    Política de Confidencialidad y Tratamiento de Datos
                  </Link>
                  .
                </span>
              </label>

              {fieldErrors.legal && (
                <p className="pt-0.5 text-xs font-medium text-destructive">{fieldErrors.legal}</p>
              )}
            </div>

            {/* Botón Principal de Envío */}
            <Button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full h-10 font-semibold bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white rounded-lg transition-colors shadow-xs"
            >
              {loginMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Abriendo estación como {selectedIdentity.label}...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Entrar como {selectedIdentity.label}
                  <ArrowRight className="size-4" />
                </span>
              )}
            </Button>
          </form>

          {/* Pie de Auditoría por IP y Enlace a Compradores */}
          <div className="flex items-center justify-between pt-1 border-t border-zinc-200/80 dark:border-zinc-800/80 text-[11px] text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center gap-1.5">
              <Lock className="size-3 text-teal-600 dark:text-teal-400 shrink-0" />
              <span>TLS 1.3 · Acceso auditado por IP</span>
            </div>
            <Link
              to="/login"
              className="font-medium text-zinc-700 dark:text-zinc-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
            >
              Acceso Compradores →
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
