import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from '@tanstack/react-router';
import { useCreateUserMutation, UserRole } from '../../core';
import { z } from 'zod';
import {
  Button,
  Input,
  PasswordInput,
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
  AlertCircle,
  Mail,
  User,
  CreditCard,
} from 'lucide-react';

const RegisterBuyerSchema = z
  .object({
    identityDocument: z.string().trim().min(1, 'El documento de identidad es obligatorio'),
    fullName: z.string().trim().min(1, 'El nombre completo es obligatorio'),
    email: z.string().trim().email('Ingrese un correo electrónico válido'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
    confirmPassword: z.string().min(1, 'Debe confirmar su contraseña'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

type RegisterBuyerFormData = z.infer<typeof RegisterBuyerSchema>;

/**
 * Pantalla de Registro de Comprador (Frontend SDD C4-4 sección 2 y Frontend-Role-Modules sección 2.1).
 * Alta pública que envía `role: "Buyer"` a POST /api/users.
 * Homologada bajo la doctrina de los 5 Átomos Congelados (Card max-w-[420px], rounded-xl, Shopify Polaris / Retail).
 */
export function RegisterBuyerPage() {
  const navigate = useNavigate();
  const createUserMutation = useCreateUserMutation();

  const [formData, setFormData] = useState<RegisterBuyerFormData>({
    identityDocument: '',
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof RegisterBuyerFormData | 'legal', string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(true);

  const handleChange = (field: keyof RegisterBuyerFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!acceptTerms) {
      setFieldErrors((prev) => ({
        ...prev,
        legal: 'Debes aceptar los Términos y Condiciones para crear tu cuenta.',
      }));
      return;
    }

    const validation = RegisterBuyerSchema.safeParse(formData);
    if (!validation.success) {
      const formatted = validation.error.format();
      setFieldErrors({
        identityDocument: formatted.identityDocument?._errors[0],
        fullName: formatted.fullName?._errors[0],
        email: formatted.email?._errors[0],
        password: formatted.password?._errors[0],
        confirmPassword: formatted.confirmPassword?._errors[0],
      });
      return;
    }

    setFieldErrors({});

    try {
      await createUserMutation.mutateAsync({
        identityDocument: validation.data.identityDocument,
        fullName: validation.data.fullName,
        email: validation.data.email,
        password: validation.data.password,
        role: UserRole.Buyer,
      });

      // Redirigir a login con aviso de cuenta creada
      navigate({
        to: '/login',
        search: { aviso: 'cuenta-creada' },
      });
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Error al registrar la cuenta. Intente nuevamente.';
      setSubmitError(errorMsg);
    }
  };

  return (
    <div data-role="buyer" className="w-full max-w-[420px] mx-auto py-2 sm:py-3">
      <Card
        surface="secondary"
        className="p-6 sm:p-7 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs gap-0"
      >
        <CardHeader className="p-0 pb-3 space-y-1">
          <CardTitle className="p-0">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground leading-tight">
              Registro de Comprador
            </h1>
          </CardTitle>
          <CardDescription className="text-xs text-foreground-muted leading-relaxed pt-0.5">
            Compre con garantía de inventario y trazabilidad física. Crea tu cuenta en segundos.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0 flex flex-col gap-3.5">
          {submitError && (
            <div
              role="alert"
              className="flex items-center gap-2.5 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-xs text-destructive dark:text-red-400"
            >
              <AlertCircle className="size-4 shrink-0" />
              <span className="leading-snug">{submitError}</span>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-3"
            noValidate
            aria-busy={createUserMutation.isPending}
          >
            {/* Documento de Identidad */}
            <div className="space-y-1.5">
              <Label
                htmlFor="identityDocument"
                className="text-xs font-medium text-foreground tracking-wide"
              >
                Documento de Identidad (DNI / Cédula)
              </Label>
              <div className="relative">
                <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted pointer-events-none" />
                <Input
                  id="identityDocument"
                  name="identityDocument"
                  type="text"
                  placeholder="1029384756"
                  value={formData.identityDocument}
                  onChange={(e) => handleChange('identityDocument', e.target.value)}
                  disabled={createUserMutation.isPending}
                  aria-invalid={Boolean(fieldErrors.identityDocument)}
                  aria-describedby={fieldErrors.identityDocument ? 'doc-error' : undefined}
                  className="pl-10 h-10 rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-foreground-muted transition-colors focus:border-teal-600 dark:focus:border-teal-400 focus:ring-1 focus:ring-teal-500/20 focus:outline-none"
                />
              </div>
              {fieldErrors.identityDocument && (
                <p id="doc-error" className="text-[11px] font-medium text-destructive">
                  {fieldErrors.identityDocument}
                </p>
              )}
            </div>

            {/* Nombre y Apellidos */}
            <div className="space-y-1.5">
              <Label
                htmlFor="fullName"
                className="text-xs font-medium text-foreground tracking-wide"
              >
                Nombre y Apellidos
              </Label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted pointer-events-none" />
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="María González"
                  autoComplete="name"
                  value={formData.fullName}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  disabled={createUserMutation.isPending}
                  aria-invalid={Boolean(fieldErrors.fullName)}
                  aria-describedby={fieldErrors.fullName ? 'name-error' : undefined}
                  className="pl-10 h-10 rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-foreground-muted transition-colors focus:border-teal-600 dark:focus:border-teal-400 focus:ring-1 focus:ring-teal-500/20 focus:outline-none"
                />
              </div>
              {fieldErrors.fullName && (
                <p id="name-error" className="text-[11px] font-medium text-destructive">
                  {fieldErrors.fullName}
                </p>
              )}
            </div>

            {/* Correo Electrónico */}
            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-xs font-medium text-foreground tracking-wide"
              >
                Correo Electrónico
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted pointer-events-none" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="comprador@ejemplo.com"
                  autoComplete="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  disabled={createUserMutation.isPending}
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

            {/* Contraseña y Confirmación en Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  disabled={createUserMutation.isPending}
                  hasError={Boolean(fieldErrors.password)}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? 'pwd-error' : undefined}
                />
                {fieldErrors.password && (
                  <p id="pwd-error" className="text-[11px] font-medium text-destructive">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="confirmPassword"
                  className="text-xs font-medium text-foreground tracking-wide"
                >
                  Confirmar
                </Label>
                <PasswordInput
                  id="confirmPassword"
                  name="confirmPassword"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  disabled={createUserMutation.isPending}
                  hasError={Boolean(fieldErrors.confirmPassword)}
                  aria-invalid={Boolean(fieldErrors.confirmPassword)}
                  aria-describedby={fieldErrors.confirmPassword ? 'cpwd-error' : undefined}
                />
                {fieldErrors.confirmPassword && (
                  <p id="cpwd-error" className="text-[11px] font-medium text-destructive">
                    {fieldErrors.confirmPassword}
                  </p>
                )}
              </div>
            </div>

            {/* Checkbox Accesible de Términos y Condiciones */}
            <div className="pt-1 space-y-1">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="acceptTerms"
                  checked={acceptTerms}
                  onCheckedChange={(checked) => {
                    setAcceptTerms(checked === true);
                    if (fieldErrors.legal) {
                      setFieldErrors((prev) => ({ ...prev, legal: undefined }));
                    }
                  }}
                  className="mt-0.5 shrink-0"
                />
                <label
                  htmlFor="acceptTerms"
                  className="text-xs text-foreground-muted leading-relaxed cursor-pointer select-none"
                >
                  Acepto los{' '}
                  <Link
                    to="/terms"
                    className="font-medium text-foreground underline underline-offset-2 hover:text-teal-600 transition-colors"
                  >
                    Términos y Condiciones
                  </Link>{' '}
                  y la{' '}
                  <Link
                    to="/privacy"
                    className="font-medium text-foreground underline underline-offset-2 hover:text-teal-600 transition-colors"
                  >
                    Política de Privacidad
                  </Link>
                  .
                </label>
              </div>
              {fieldErrors.legal && (
                <p className="text-[11px] font-medium text-destructive">{fieldErrors.legal}</p>
              )}
            </div>

            {/* Botón CTA */}
            <Button
              type="submit"
              disabled={createUserMutation.isPending}
              size="lg"
              className="w-full h-10 rounded-lg bg-zinc-900 hover:bg-black text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 font-semibold text-sm transition-colors cursor-pointer shadow-xs active:scale-[0.99] mt-2 focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2"
            >
              {createUserMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner size="sm" className="text-current" />
                  Creando cuenta…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Crear Cuenta de Comprador
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          {/* Separador */}
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
          </div>

          {/* Footer Simétrico con text-wrap: balance */}
          <div className="text-center text-xs text-foreground-muted [text-wrap:balance]">
            <span>¿Ya tienes cuenta? </span>
            <Link
              to="/login"
              className="font-semibold text-foreground hover:underline transition-colors"
            >
              Inicia sesión aquí
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Riel Corporativo de Vendedor */}
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
