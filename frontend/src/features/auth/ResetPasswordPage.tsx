import { useState, type FormEvent } from 'react';
import { useNavigate, useSearch, Link } from '@tanstack/react-router';
import { z } from 'zod';
import {
  Button,
  Input,
  Label,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Spinner,
} from '@zentric/ui';
import {
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  KeyRound,
} from 'lucide-react';
import { resetPassword } from '../../core/api/authApi';

const ResetPasswordSchema = z
  .object({
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
    confirmPassword: z.string().min(1, 'Debes confirmar tu nueva contraseña'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof ResetPasswordSchema>;

export interface ResetPasswordPageProps {
  /** Callback opcional para conectar con mutación de backend en TDD */
  onSubmitReset?: (data: { token?: string; password: string }) => Promise<void>;
}

/**
 * Pantalla de Restablecimiento de Contraseña con Token.
 * Diseñada bajo la doctrina de los 5 Átomos Congelados (Card 420px, rounded-xl, Shopify Polaris / Retail).
 * Redirige a /login con aviso contextual '?aviso=clave-actualizada' al completarse.
 */
export function ResetPasswordPage({ onSubmitReset }: ResetPasswordPageProps) {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { token?: string; email?: string };

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ResetPasswordFormData, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const validation = ResetPasswordSchema.safeParse({ password, confirmPassword });
    if (!validation.success) {
      const formatted = validation.error.format();
      setFieldErrors({
        password: formatted.password?._errors[0],
        confirmPassword: formatted.confirmPassword?._errors[0],
      });
      return;
    }

    setFieldErrors({});
    setIsPending(true);

    try {
      if (onSubmitReset) {
        await onSubmitReset({
          token: search.token,
          password: validation.data.password,
        });
      } else {
        await resetPassword({
          token: search.token,
          password: validation.data.password,
        });
      }

      // Redirigir a login con aviso de contraseña actualizada
      navigate({
        to: '/login',
        search: { aviso: 'clave-actualizada' } as never,
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'El enlace de recuperación es inválido o ha expirado. Solicita uno nuevo.';
      setSubmitError(msg);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div data-role="auth-reset" className="w-full max-w-[420px] mx-auto py-2 sm:py-3">
      <Card
        surface="secondary"
        className="p-6 sm:p-7 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs gap-0"
      >
        <CardHeader className="p-0 pb-3 space-y-1">
          <div className="mb-1">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-teal-500/30 bg-teal-500/5 px-2.5 py-1 text-xs font-medium text-teal-600 dark:text-teal-400">
              <KeyRound className="size-3.5 text-teal-600 dark:text-teal-400" />
              <span>Seguridad de la Cuenta</span>
            </span>
          </div>

          <CardTitle className="p-0">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground leading-tight">
              Nueva contraseña
            </h1>
          </CardTitle>
          <CardDescription className="text-xs text-foreground-muted leading-relaxed pt-0.5">
            {search.email
              ? `Establece una nueva clave de acceso para ${search.email}.`
              : 'Elige una contraseña segura que no hayas utilizado previamente.'}
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

          <form onSubmit={handleSubmit} className="space-y-3.5" noValidate aria-busy={isPending}>
            {/* Nueva Contraseña */}
            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-xs font-medium text-foreground tracking-wide"
              >
                Nueva contraseña
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted pointer-events-none" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) {
                      setFieldErrors((prev) => ({ ...prev, password: undefined }));
                    }
                  }}
                  disabled={isPending}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                  className="pl-10 pr-11 h-10 rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-foreground-muted transition-colors focus:border-teal-600 dark:focus:border-teal-400 focus:ring-1 focus:ring-teal-500/20 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  disabled={isPending}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={showPassword}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center text-foreground-muted hover:text-foreground rounded-md transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground disabled:pointer-events-none disabled:opacity-50"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p id="password-error" className="text-[11px] font-medium text-destructive">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Confirmar Nueva Contraseña */}
            <div className="space-y-1.5">
              <Label
                htmlFor="confirmPassword"
                className="text-xs font-medium text-foreground tracking-wide"
              >
                Confirmar nueva contraseña
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted pointer-events-none" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword) {
                      setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                    }
                  }}
                  disabled={isPending}
                  aria-invalid={Boolean(fieldErrors.confirmPassword)}
                  aria-describedby={fieldErrors.confirmPassword ? 'confirm-error' : undefined}
                  className="pl-10 pr-11 h-10 rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-foreground-muted transition-colors focus:border-teal-600 dark:focus:border-teal-400 focus:ring-1 focus:ring-teal-500/20 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  disabled={isPending}
                  aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={showConfirmPassword}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center text-foreground-muted hover:text-foreground rounded-md transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground disabled:pointer-events-none disabled:opacity-50"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p id="confirm-error" className="text-[11px] font-medium text-destructive">
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>

            {/* Botón CTA */}
            <Button
              type="submit"
              disabled={isPending}
              size="lg"
              className="w-full h-10 rounded-lg bg-zinc-900 hover:bg-black text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 font-semibold text-sm transition-colors cursor-pointer shadow-xs active:scale-[0.99] mt-2 focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2"
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner size="sm" className="text-current" />
                  Guardando contraseña…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Guardar nueva contraseña
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
            <span>¿Recordaste tu contraseña? </span>
            <Link
              to="/login"
              className="font-semibold text-foreground hover:underline transition-colors"
            >
              Inicia sesión aquí
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
