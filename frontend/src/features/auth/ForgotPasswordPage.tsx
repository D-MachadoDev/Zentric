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
  Mail,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  MailCheck,
  Store,
} from 'lucide-react';
import { requestPasswordReset } from '../../core/api/authApi';

const ForgotPasswordSchema = z.object({
  email: z.string().trim().email('Ingresa un correo electrónico válido'),
});

export interface ForgotPasswordPageProps {
  /** Callback opcional para conectar con mutación de backend en TDD */
  onSubmitRequest?: (email: string) => Promise<void>;
}

/**
 * Pantalla de Solicitud de Recuperación de Contraseña.
 * Diseñada bajo la doctrina de los 5 Átomos Congelados (Card 420px, rounded-xl, Shopify Polaris / Retail).
 * Soporta parametrización de portal comprador y corporativo (?portal=seller).
 */
export function ForgotPasswordPage({ onSubmitRequest }: ForgotPasswordPageProps) {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { portal?: string };
  const isSellerPortal = search?.portal === 'seller';
  const loginPath = isSellerPortal ? '/acceso-corporativo' : '/login';

  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const validation = ForgotPasswordSchema.safeParse({ email });
    if (!validation.success) {
      setFieldError(validation.error.format().email?._errors[0] ?? 'Correo inválido');
      return;
    }

    setFieldError(null);
    setIsPending(true);

    try {
      if (onSubmitRequest) {
        await onSubmitRequest(validation.data.email);
      } else {
        await requestPasswordReset(validation.data.email);
      }
      setIsSubmitted(true);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'No pudimos procesar la solicitud en este momento. Inténtalo más tarde.';
      setSubmitError(msg);
    } finally {
      setIsPending(false);
    }
  };

  const handleResetForm = () => {
    setIsSubmitted(false);
    setEmail('');
    setFieldError(null);
    setSubmitError(null);
  };

  return (
    <div
      data-role={isSellerPortal ? 'seller' : 'buyer'}
      className="w-full max-w-[420px] mx-auto py-2 sm:py-3"
    >
      <Card
        surface="secondary"
        className="p-6 sm:p-7 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs gap-0"
      >
        {!isSubmitted ? (
          <>
            <CardHeader className="p-0 pb-3 space-y-1">
              {isSellerPortal && (
                <div className="mb-1">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-teal-500/30 bg-teal-500/5 px-2.5 py-1 text-xs font-medium text-teal-600 dark:text-teal-400">
                    <Store className="size-3.5 text-teal-600 dark:text-teal-400" />
                    <span>Acceso Corporativo</span>
                  </span>
                </div>
              )}
              <CardTitle className="p-0">
                <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground leading-tight">
                  Recuperar contraseña
                </h1>
              </CardTitle>
              <CardDescription className="text-xs text-foreground-muted leading-relaxed pt-0.5">
                Ingresa tu correo electrónico registrado y te enviaremos las instrucciones para restablecer tu acceso.
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
                      placeholder={isSellerPortal ? 'vendedor@empresa.com' : 'comprador@ejemplo.com'}
                      autoComplete="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (fieldError) setFieldError(null);
                      }}
                      disabled={isPending}
                      aria-invalid={Boolean(fieldError)}
                      aria-describedby={fieldError ? 'email-error' : undefined}
                      className="pl-10 h-10 rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-foreground-muted transition-colors focus:border-teal-600 dark:focus:border-teal-400 focus:ring-1 focus:ring-teal-500/20 focus:outline-none"
                    />
                  </div>
                  {fieldError && (
                    <p id="email-error" className="text-[11px] font-medium text-destructive">
                      {fieldError}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isPending}
                  size="lg"
                  className="w-full h-10 rounded-lg bg-zinc-900 hover:bg-black text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 font-semibold text-sm transition-colors cursor-pointer shadow-xs active:scale-[0.99] mt-1.5 focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2"
                >
                  {isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <Spinner size="sm" className="text-current" />
                      Enviando instrucciones…
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Enviar instrucciones
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </form>

              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
              </div>

              <div className="text-center text-xs text-foreground-muted [text-wrap:balance]">
                <span>¿Recordaste tu contraseña? </span>
                <Link
                  to={loginPath}
                  className="font-semibold text-foreground hover:underline transition-colors"
                >
                  Inicia sesión aquí
                </Link>
              </div>
            </CardContent>
          </>
        ) : (
          /* Estado Enviado / Confirmación de Envío */
          <div className="text-center py-2 space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/25">
              <MailCheck className="h-6 w-6" aria-hidden="true" />
            </div>

            <div className="space-y-1.5">
              <h2 className="font-heading text-xl font-bold tracking-tight text-foreground">
                Revisa tu bandeja de entrada
              </h2>
              <p className="text-xs text-foreground-muted leading-relaxed max-w-xs mx-auto [text-wrap:balance]">
                Hemos enviado las instrucciones para restablecer tu contraseña a{' '}
                <strong className="text-foreground font-semibold">{email}</strong>.
              </p>
            </div>

            <div className="rounded-lg bg-surface border border-border p-3 text-xs text-foreground-muted text-left">
              <p className="leading-snug">
                Si no encuentras el correo en los próximos minutos, revisa tu carpeta de spam o correo no deseado.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <Button
                type="button"
                onClick={() => navigate({ to: loginPath })}
                size="lg"
                className="w-full h-10 rounded-lg bg-zinc-900 hover:bg-black text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 font-semibold text-sm transition-colors cursor-pointer shadow-xs active:scale-[0.99]"
              >
                <span className="flex items-center justify-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Volver a iniciar sesión
                </span>
              </Button>

              <button
                type="button"
                onClick={handleResetForm}
                className="text-xs font-medium text-foreground-muted hover:text-teal-600 dark:hover:text-teal-400 hover:underline cursor-pointer transition-colors pt-1"
              >
                ¿No recibiste el correo? Intentar con otra dirección
              </button>
            </div>
          </div>
        )}
      </Card>

      {!isSellerPortal && (
        <div className="mt-3 flex items-center justify-center gap-2 text-center text-xs text-foreground-muted">
          <Store className="size-3.5 text-foreground-muted shrink-0" />
          <span>¿Eres vendedor? </span>
          <Link
            to={'/recuperar-contrasena' as never}
            search={{ portal: 'seller' } as never}
            className="font-medium text-foreground hover:underline transition-colors"
          >
            Recuperar acceso corporativo →
          </Link>
        </div>
      )}
    </div>
  );
}
