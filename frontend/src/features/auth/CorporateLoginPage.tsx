import { useState, type FormEvent } from 'react';
import { useNavigate, useSearch, Link } from '@tanstack/react-router';
import { useLoginMutation } from '../../core';
import { LoginSchema } from '../../core';
import { getRoleHomePath } from '../../app/guards/routeGuards';
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
  AlertCircle,
  Lock,
  ShoppingBag,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';

interface OperationalFocusItem {
  title: string;
  badge: string;
  description: string;
}

interface CorporateRoleIdentity {
  role: Exclude<BrandRole, 'buyer'>;
  label: string;
  stationTitle: string;
  headline: string;
  subtitle: string;
  email: string;
  password: string;
  route: string;
  legalNotice: string;
  focusItems: [OperationalFocusItem, OperationalFocusItem, OperationalFocusItem];
}

const CORPORATE_ROLE_IDENTITIES: CorporateRoleIdentity[] = [
  {
    role: 'seller',
    label: 'Vendedor',
    stationTitle: 'Seller Central · Socios Comerciales',
    headline: 'Publica tus variantes, gestiona tus bodegas y recibe el 95% de cada venta.',
    subtitle:
      'Tu centro comercial para administrar catálogo con vista previa del Buy Box, inventario por bodega, alistamiento de pedidos y liquidaciones netas.',
    email: 'seller@zentric.local',
    password: 'SellerLocal12345',
    route: '/seller',
    legalNotice: 'Acuerdo de Socio Comercial (Comisión 5% / Liquidación 95%) y SLA de Despacho',
    focusItems: [
      {
        title: 'Liquidación Directa del 95%',
        badge: 'SPLIT 95/5',
        description:
          'Cada venta confirmada genera automáticamente tu liquidación por el 95% del valor bruto mientras Zentric emite la Factura Maestra.',
      },
      {
        title: 'Catálogo con Variantes y Buy Box',
        badge: 'CATÁLOGO',
        description:
          'Configura atributos como Color, Capacidad o Memoria RAM con previsualización en vivo de cómo comprará tu cliente.',
      },
      {
        title: 'Stock por Bodega y Alistamiento',
        badge: 'DESPACHO',
        description:
          'Asigna existencias en bodegas propias o centrales, empaca órdenes pagadas y gestiona garantías postventa.',
      },
    ],
  },
  {
    role: 'logistics',
    label: 'Logística',
    stationTitle: 'Centro de Operaciones y Muelle',
    headline: 'Ejecución de muelle, trazabilidad de guías e inspección física de retornos.',
    subtitle:
      'Estación operativa para equipos de bodega y transporte: certifica empaque, salida a ruta, entregas en destino y control de inventario físico.',
    email: 'logistics@zentric.local',
    password: 'LogisticsLocal12345',
    route: '/logistics/fulfillments',
    legalNotice: 'Protocolo de Trazabilidad de Muelle, Custodia de Mercancía e Inspección Física',
    focusItems: [
      {
        title: 'Certificación de Despacho y Entrega',
        badge: 'MUELLE',
        description:
          'Procesa la cola de órdenes por bodega desde el empaque hasta la confirmación de entrega final al comprador.',
      },
      {
        title: 'Inspección Física de Devoluciones',
        badge: 'POSTVENTA',
        description:
          'Verifica el estado físico del producto devuelto en muelle para reintegrar stock automáticamente o registrar merma.',
      },
      {
        title: 'Control de Stock Fantasma',
        badge: 'INVENTARIO',
        description:
          'Reporta quiebres físicos durante el picking para liberar compromisos y proteger el nivel de servicio.',
      },
    ],
  },
  {
    role: 'admin',
    label: 'Admin',
    stationTitle: 'Consola de Gobierno & RBAC',
    headline: 'Gobernanza integral de usuarios, red de bodegas y tesorería del marketplace.',
    subtitle:
      'Control centralizado de las 21 políticas RBAC, alta de cuentas operativas, habilitación de centros logísticos y ejecución de reembolsos.',
    email: 'admin@zentric.local',
    password: 'AdminLocal12345',
    route: '/admin',
    legalNotice: 'Políticas de Gobierno Corporativo, Seguridad RBAC y Cumplimiento Financiero',
    focusItems: [
      {
        title: 'Gobierno de Usuarios y 21 Políticas RBAC',
        badge: 'RBAC',
        description:
          'Administra accesos por rol con aislamiento estricto de permisos entre operación, comercio y auditoría.',
      },
      {
        title: 'Red de Bodegas y Ajustes de Stock',
        badge: 'INFRAESTRUCTURA',
        description:
          'Habilita nuevas bodegas físicas, supervisa capacidad instalada y autoriza ajustes manuales auditados.',
      },
      {
        title: 'Tesorería Split 5/95 y Reembolsos',
        badge: 'FINANZAS',
        description:
          'Monitorea la emisión de Facturas Maestras, liquidaciones a vendedores y desembolso de reembolsos aprobados.',
      },
    ],
  },
  {
    role: 'supervisor',
    label: 'Supervisor',
    stationTitle: 'Fiscalización & Auditoría 360°',
    headline: 'Auditoría operativa 360° sin exposición de PII y arqueo físico idempotente.',
    subtitle:
      'Entorno de solo lectura y fiscalización física: concilia el split tributario 5/95, audita tiempos de despacho y ejecuta conteos de bodega.',
    email: 'supervisor@zentric.local',
    password: 'SupervisorLocal12345',
    route: '/supervisor',
    legalNotice: 'Normativa de Auditoría Interna ADR-0021 y Protección de Datos sin PII',
    focusItems: [
      {
        title: 'Trazabilidad 360° sin Exposición de PII',
        badge: 'PRIVACIDAD',
        description:
          'Audita el ciclo completo de cada pedido, guía y devolución manteniendo anonimizados los datos personales del cliente.',
      },
      {
        title: 'Conciliación Tributaria 5/95',
        badge: 'AUDITORÍA',
        description:
          'Verifica la exactitud matemática entre el 100% facturado al comprador, el 95% del vendedor y el 5% de plataforma.',
      },
      {
        title: 'Arqueo Físico Idempotente (ADR-0021)',
        badge: 'CONTEO FÍSICO',
        description:
          'Ejecuta conteos ciegos por bodega con llave de idempotencia y cálculo inmediato de varianza de inventario.',
      },
    ],
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
  const [password, setPassword] = useState(import.meta.env.DEV ? CORPORATE_ROLE_IDENTITIES[0]!.password : '');
  const [showPassword, setShowPassword] = useState(false);
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
      setPassword(identity.password);
    }
    setFieldErrors({});
    setSubmitError(null);
  };

  const handleQuickRoleDemo = async () => {
    if (!acceptCorporateTerms || !acceptDataCompliance) {
      setFieldErrors({
        legal:
          'Debe aceptar los Términos Operativos y la Política de Confidencialidad para ingresar.',
      });
      return;
    }
    setEmail(selectedIdentity.email);
    setPassword(selectedIdentity.password);
    setFieldErrors({});
    setSubmitError(null);
    try {
      const result = await loginMutation.mutateAsync({
        email: selectedIdentity.email,
        password: selectedIdentity.password,
      });
      const targetPath = search.redirect || getRoleHomePath(result.role);
      navigate({ to: targetPath });
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : 'Error de autenticación corporativa. Verifique sus credenciales.';
      setSubmitError(errorMsg);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!acceptCorporateTerms || !acceptDataCompliance) {
      setFieldErrors((prev) => ({
        ...prev,
        legal:
          'Debe aceptar los Términos Operativos y la Política de Confidencialidad y Tratamiento de Datos.',
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

      const targetPath = search.redirect || getRoleHomePath(result.role);
      navigate({ to: targetPath });
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : 'Error de autenticación corporativa. Verifique sus credenciales.';
      setSubmitError(errorMsg);
    }
  };

  return (
    <div
      data-role={activeRole}
      className="surface-hairline my-4 flex w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border bg-surface text-foreground shadow-2xl transition-colors lg:flex-row"
    >
      {/* ── Escenario Izquierdo: Identidad del Rol (40%) ── */}
      <div className="relative flex flex-col justify-between overflow-hidden border-b border-border/80 bg-surface-muted/50 p-8 sm:p-10 lg:w-[40%] lg:border-r lg:border-b-0 lg:p-12">
        <div className="relative z-10 space-y-6">
          {/* Cabecera: Logo del Rol + retorno a tienda */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
            <div className="flex items-center gap-2">
              <Logo role={activeRole} />
              <span className="font-mono text-[10px] font-semibold tracking-tighter text-brand uppercase">
                {selectedIdentity.stationTitle}
              </span>
            </div>
            <Link
              to="/buyer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:border-brand/50 hover:text-foreground"
            >
              <ShoppingBag className="h-3.5 w-3.5 text-brand" />
              <span>Ir al Marketplace</span>
            </Link>
          </div>

          {/* Selector compacto de rol: tabs horizontales */}
          <div className="space-y-3">
            <span className="font-mono text-[10px] font-semibold tracking-wider text-foreground-muted uppercase">
              Estacion operativa
            </span>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {CORPORATE_ROLE_IDENTITIES.map((item) => {
                const isSelected = activeRole === item.role;
                return (
                  <button
                    key={item.role}
                    type="button"
                    data-role={item.role}
                    onClick={() => selectRoleStation(item)}
                    className={`flex items-center gap-2 rounded-xl border p-2.5 text-left transition-all ${
                      isSelected
                        ? 'border-brand bg-brand/12 shadow-sm'
                        : 'border-border/60 bg-surface hover:border-brand/50 hover:bg-surface-muted/40'
                    }`}
                  >
                    <LogoMark role={item.role} className="size-4 shrink-0 text-brand" />
                    <div className="min-w-0">
                      <div className="truncate font-sans text-xs font-bold text-foreground">
                        {item.label}
                      </div>
                      <div className="truncate font-mono text-[9px] text-foreground-muted">
                        {isSelected ? 'Activo' : 'Seleccionar'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Propuesta de valor del rol (breve) */}
          <div className="max-w-sm space-y-2.5">
            <div className="font-mono text-xs font-semibold tracking-[0.14em] text-brand uppercase">
              ESTACION DEDICADA · {selectedIdentity.label.toUpperCase()}
            </div>
            <h1 className="font-sans text-xl leading-[1.15] font-bold tracking-tight text-foreground sm:text-2xl lg:text-[1.5rem]">
              {selectedIdentity.headline}
            </h1>
            <p className="text-xs leading-relaxed text-foreground-muted">
              {selectedIdentity.subtitle}
            </p>
          </div>

          {/* 3 capacidades del rol (resumidas) */}
          <div className="max-w-sm space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-brand shrink-0" />
                <span className="font-sans text-xs font-bold text-foreground">
                  {selectedIdentity.focusItems[0].title}
                </span>
              </div>
              <span className="rounded-md border border-brand/30 bg-brand/10 px-2 py-0.5 font-mono text-[9px] font-bold text-brand">
                {selectedIdentity.focusItems[0].badge}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {selectedIdentity.focusItems.slice(1).map((item) => (
                <div key={item.badge} className="surface-hairline rounded-xl bg-surface/80 p-2 space-y-0.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-sans text-[10px] font-bold text-foreground">
                      {item.title}
                    </span>
                    <span className="font-mono text-[8px] font-semibold text-brand">
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-[10px] leading-tight text-foreground-muted">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Pie tecnico */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-4">
            <div className="inline-flex items-center gap-1.5 font-mono text-[10px] text-foreground-muted">
              <Lock className="h-3 w-3 text-brand" />
              <span>SESION AISLADA POR ROL · JWT RBAC</span>
            </div>
            <span className="font-mono text-[9px] text-brand font-semibold">
              {selectedIdentity.stationTitle.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* ── Escenario Derecho: Formulario de credenciales (60%) ── */}
      <div className="flex flex-1 items-center justify-center bg-surface p-6 sm:p-10 lg:p-12">
        <div className="w-full max-w-md space-y-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 font-mono text-[10px] font-semibold text-brand">
              <LogoMark role={selectedIdentity.role} className="size-3.5" />
              <span>ACCESO {selectedIdentity.label.toUpperCase()}</span>
            </div>
            <h2 className="font-sans text-2xl font-bold tracking-tight text-foreground sm:text-3xl pt-1">
              Iniciar sesión corporativa
            </h2>
            <p className="text-sm text-foreground-muted">
              Ingresa tus credenciales para abrir{' '}
              <strong className="text-foreground">{selectedIdentity.stationTitle}</strong>.
            </p>
          </div>

          {submitError && (
            <Alert variant="destructive" className="mb-4" role="alert">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Acceso denegado</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label
                htmlFor="corp-email"
                className="font-mono text-[10px] font-medium tracking-wider text-foreground-muted uppercase"
              >
                Correo de {selectedIdentity.label}
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
                className="border-border bg-surface font-mono text-sm text-foreground focus:border-brand"
              />
              {fieldErrors.email && (
                <p className="text-xs text-destructive">{fieldErrors.email}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="corp-password"
                className="font-mono text-[10px] font-medium tracking-wider text-foreground-muted uppercase"
              >
                Contraseña de estacion
              </Label>
              <div className="relative">
                <Input
                  id="corp-password"
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
                  className="border-border bg-surface font-mono text-sm text-foreground focus:border-brand pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  disabled={loginMutation.isPending}
                  aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
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
                <p className="text-xs text-destructive">{fieldErrors.password}</p>
              )}
            </div>

            {/* Casillas legales en una sola linea compacta */}
            <div className="space-y-2 rounded-xl border border-border bg-surface-muted/40 p-3 text-xs">
              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={acceptCorporateTerms}
                  onChange={(e) => {
                    setAcceptCorporateTerms(e.target.checked);
                    if (fieldErrors.legal) {
                      setFieldErrors((prev) => ({ ...prev, legal: undefined }));
                    }
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-border accent-brand"
                />
                <span className="text-foreground-muted leading-relaxed">
                  Acepto los{' '}
                  <Link to="/terms" className="font-medium text-brand hover:underline">
                    Términos de Operación ({selectedIdentity.legalNotice})
                  </Link>{' '}
                  y{' '}
                  <Link to="/privacy" className="font-medium text-brand hover:underline">
                    Política de Privacidad (Ley 1581)
                  </Link>
                  .
                </span>
              </label>

              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={acceptDataCompliance}
                  onChange={(e) => {
                    setAcceptDataCompliance(e.target.checked);
                    if (fieldErrors.legal) {
                      setFieldErrors((prev) => ({ ...prev, legal: undefined }));
                    }
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-border accent-brand"
                />
                <span className="text-foreground-muted leading-relaxed">
                  Cumplo la{' '}
                  <Link to="/cookies" className="font-medium text-brand hover:underline">
                    Política de Cookies de Sesión
                  </Link>
                  .
                </span>
              </label>

              {fieldErrors.legal && (
                <p className="text-xs font-medium text-destructive pt-1">{fieldErrors.legal}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full bg-brand py-2.5 font-semibold text-primary-foreground shadow-lg shadow-brand/20 transition-colors hover:bg-brand-strong"
            >
              {loginMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Abriendo estacion {selectedIdentity.label}...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Entrar a {selectedIdentity.stationTitle}
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          {/* Demo 1-clic (solo desarrollo) */}
          {import.meta.env.DEV && (
            <div className="rounded-xl border border-brand/30 bg-brand/8 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <ShieldCheck className="h-3.5 w-3.5 text-brand shrink-0" />
                  <div className="min-w-0">
                    <div className="truncate font-sans text-xs font-bold text-foreground">
                      Cuenta Demo · {selectedIdentity.label}
                    </div>
                    <div className="truncate font-mono text-[10px] text-foreground-muted">
                      {selectedIdentity.email}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={loginMutation.isPending}
                  onClick={() => void handleQuickRoleDemo()}
                  className="shrink-0 rounded-lg bg-brand px-3 py-1.5 font-mono text-xs font-semibold text-primary-foreground transition-colors hover:bg-brand-strong disabled:opacity-50"
                >
                  Acceso Demo 1-Clic
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col items-center justify-between gap-2 border-t border-border/60 pt-3 text-[10px] text-foreground-muted sm:flex-row">
            <div>
              ¿Vienes a comprar?{' '}
              <Link
                to="/buyer"
                className="font-semibold text-brand transition-colors hover:underline"
              >
                Ir a la Tienda como Invitado
              </Link>
            </div>
            <Link
              to="/login"
              className="font-mono text-foreground-muted transition-colors hover:text-brand"
            >
              Login de Comprador →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
