import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from '@tanstack/react-router';
import { useCreateUserMutation } from '../../application/services/identity';
import { UserRole } from '../../domain';
import { z } from 'zod';
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
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  ShoppingBag,
  Sparkles,
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
 * Pantalla de Registro de Comprador (Frontend SDD C4-4 §2 y Frontend-Role-Modules §2.1).
 * Alta pública que envía `role: "Buyer"` a POST /api/users.
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

  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof RegisterBuyerFormData, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleChange = (field: keyof RegisterBuyerFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

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
    <div className="w-full max-w-5xl rounded-2xl border border-[#1F293D] bg-[#0B0F19] overflow-hidden flex flex-col lg:flex-row shadow-2xl my-4 text-foreground">
      {/* ── Zona Izquierda: Split-Frame Editorial (55%) ─────────────────────── */}
      <div className="relative flex flex-col justify-between p-8 sm:p-10 lg:w-[55%] lg:p-12 border-b lg:border-b-0 lg:border-r border-[#1F293D] overflow-hidden bg-[#0D1322]/80">
        <div
          className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-[#00D4AA]/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative z-10 space-y-8">
          <div className="flex items-center gap-3">
            <Logo />
            <Badge variant="outline" className="border-[#1F293D] text-[#00D4AA] font-mono text-xs">
              PORTAL COMPRADOR
            </Badge>
          </div>

          <div className="space-y-4 max-w-xl">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white font-sans">
              Compre con garantía de inventario y trazabilidad física.
            </h1>
            <p className="text-base sm:text-lg text-[#94A3B8] leading-relaxed">
              Únase como Comprador para acceder al catálogo unificado de productos físicos y
              digitales, checkout con reserva atómica y seguimiento en tiempo real.
            </p>
          </div>

          {/* Beneficios del Comprador */}
          <div className="space-y-4 max-w-lg pt-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#1F293D] bg-[#111827] text-[#00D4AA]">
                <ShoppingBag className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">Catálogo Heterogéneo Verificado</h3>
                <p className="text-xs text-[#94A3B8]">
                  Productos con especificaciones técnicas reales y variantes con inventario existente en bodegas.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#1F293D] bg-[#111827] text-[#00D4AA]">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">Checkout Atómico sin Sobreventa</h3>
                <p className="text-xs text-[#94A3B8]">
                  Al iniciar el pago sus existencias quedan reservadas por 15 minutos exclusivamente para usted.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#1F293D] bg-[#111827] text-[#00D4AA]">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">Facturación Maestra Clara</h3>
                <p className="text-xs text-[#94A3B8]">
                  Un único comprobante fiscal consolidado para sus pedidos, incluso si provienen de múltiples vendedores.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-10">
          <p className="text-xs text-[#64748B]">
            ¿Dudas o requerimientos especiales? Consulte el{' '}
            <Link to="/health" className="text-[#00D4AA] hover:underline">
              monitor de disponibilidad pública
            </Link>
            .
          </p>
        </div>
      </div>

      {/* ── Zona Derecha: Formulario de Alta Pública (45%) ─────────────────── */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-12 lg:p-16 bg-[#0B0F19]">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
              Registro de Comprador
            </h2>
            <p className="text-sm text-[#94A3B8]">
              Complete sus datos para crear su cuenta de cliente en segundos.
            </p>
          </div>

          {submitError && (
            <Alert variant="destructive" className="mb-6" role="alert">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Fallo en el Registro</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="identityDocument" className="text-xs font-medium uppercase tracking-wider text-[#94A3B8]">
                Documento de Identidad (DNI / Cédula)
              </Label>
              <Input
                id="identityDocument"
                name="identityDocument"
                type="text"
                placeholder="1029384756"
                value={formData.identityDocument}
                onChange={(e) => handleChange('identityDocument', e.target.value)}
                disabled={createUserMutation.isPending}
                aria-invalid={Boolean(fieldErrors.identityDocument)}
                className="bg-[#111827] border-[#1F293D] focus:border-[#00D4AA] text-white"
              />
              {fieldErrors.identityDocument && (
                <p className="text-xs text-red-400">{fieldErrors.identityDocument}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fullName" className="text-xs font-medium uppercase tracking-wider text-[#94A3B8]">
                Nombre y Apellidos
              </Label>
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
                className="bg-[#111827] border-[#1F293D] focus:border-[#00D4AA] text-white"
              />
              {fieldErrors.fullName && (
                <p className="text-xs text-red-400">{fieldErrors.fullName}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-[#94A3B8]">
                Correo Electrónico
              </Label>
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
                className="bg-[#111827] border-[#1F293D] focus:border-[#00D4AA] text-white"
              />
              {fieldErrors.email && (
                <p className="text-xs text-red-400">{fieldErrors.email}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-[#94A3B8]">
                  Contraseña
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••••••"
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  disabled={createUserMutation.isPending}
                  aria-invalid={Boolean(fieldErrors.password)}
                  className="bg-[#111827] border-[#1F293D] focus:border-[#00D4AA] text-white"
                />
                {fieldErrors.password && (
                  <p className="text-xs text-red-400">{fieldErrors.password}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-xs font-medium uppercase tracking-wider text-[#94A3B8]">
                  Confirmar
                </Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••••••"
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  disabled={createUserMutation.isPending}
                  aria-invalid={Boolean(fieldErrors.confirmPassword)}
                  className="bg-[#111827] border-[#1F293D] focus:border-[#00D4AA] text-white"
                />
                {fieldErrors.confirmPassword && (
                  <p className="text-xs text-red-400">{fieldErrors.confirmPassword}</p>
                )}
              </div>
            </div>

            <Button
              type="submit"
              disabled={createUserMutation.isPending}
              className="w-full bg-[#00D4AA] hover:bg-[#00D4AA]/90 text-[#0B0F19] font-semibold py-2.5 transition-colors shadow-lg shadow-[#00D4AA]/20 mt-2"
            >
              {createUserMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0B0F19] border-t-transparent" />
                  Creando cuenta...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Crear Cuenta de Comprador
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          <div className="pt-4 border-t border-[#1F293D]/80 text-center text-xs text-[#94A3B8]">
            ¿Ya tiene una cuenta registrada?{' '}
            <Link to="/login" className="font-medium text-[#00D4AA] hover:underline transition-colors">
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
