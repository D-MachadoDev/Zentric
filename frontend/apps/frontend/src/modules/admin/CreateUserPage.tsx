import React, { useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  UserPlus,
  ArrowLeft,
  Shield,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Lock,
  Mail,
  User as UserIcon,
  FileText,
} from 'lucide-react';
import {
  Button,
  Badge,
  Input,
  Alert,
  AlertTitle,
  AlertDescription,
} from '@zentric/ui';
import { useCreateUserMutation } from '../../application/services';
import { CreateUserSchema } from '../../application/schemas';
import { UserRole } from '../../domain';
import type { CreateUserInput } from '../../domain';

export function CreateUserPage() {
  const [formData, setFormData] = useState<CreateUserInput>({
    identityDocument: '',
    fullName: '',
    email: '',
    password: '',
    role: UserRole.Seller,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [successUserId, setSuccessUserId] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const createMutation = useCreateUserMutation();

  const handleChange = (field: keyof CreateUserInput, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => {
      const copy = { ...prev };
      delete copy[field];
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setFormErrors({});

    const validation = CreateUserSchema.safeParse(formData);
    if (!validation.success) {
      const errMap: Record<string, string> = {};
      for (const err of validation.error.issues) {
        if (err.path[0]) {
          errMap[err.path[0] as string] = err.message;
        }
      }
      setFormErrors(errMap);
      return;
    }

    try {
      const newId = await createMutation.mutateAsync(validation.data);
      setSuccessUserId(newId);
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : 'Error al dar de alta el usuario.'
      );
    }
  };

  const handleReset = () => {
    setFormData({
      identityDocument: '',
      fullName: '',
      email: '',
      password: '',
      role: UserRole.Seller,
    });
    setSuccessUserId(null);
    setServerError(null);
    setFormErrors({});
  };

  return (
    <div className="space-y-8 p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full">
      {/* ── Encabezado ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              to="/admin/users"
              className="text-foreground-muted hover:text-foreground transition-colors mr-1"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
              Alta de Usuario en Plataforma
            </h1>
            <Badge variant="outline" className="border-border text-brand font-mono text-xs">
              Root Authority
            </Badge>
          </div>
          <p className="text-sm text-foreground-muted">
            Incorporación controlada de roles de negocio (Vendedor, Operador Logístico, Supervisor o Administrador).
          </p>
        </div>
      </div>

      {/* ── Split-Frame (60% / 40%) ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Lado Izquierdo (60%): Formulario ─────────────────────────────── */}
        <section className="lg:col-span-7 space-y-6">
          {successUserId ? (
            <div className="rounded-2xl border border-brand/40 bg-surface p-8 space-y-6">
              <div className="flex items-center gap-3 text-brand">
                <CheckCircle className="h-7 w-7" />
                <h3 className="text-lg font-bold text-foreground font-sans">
                  ¡Usuario Registrado Exitosamente!
                </h3>
              </div>

              <p className="text-xs text-foreground-muted leading-relaxed">
                El usuario ha sido aprovisionado en la base de datos central con el rol asignado. Puede iniciar sesión de inmediato con sus credenciales.
              </p>

              <div className="p-4 rounded-xl bg-surface-muted border border-border space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-foreground-muted">UUID Asignado:</span>
                  <span className="text-foreground">{successUserId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-muted">Nombre:</span>
                  <span className="text-foreground">{formData.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-muted">Correo:</span>
                  <span className="text-foreground">{formData.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-muted">Rol:</span>
                  <span className="text-brand">{formData.role}</span>
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="flex-1 border-border text-foreground-muted hover:text-foreground"
                >
                  Registrar Otro Usuario
                </Button>
                <Link to="/admin/users" className="flex-1">
                  <Button className="w-full bg-brand text-primary-foreground hover:bg-brand/90 font-semibold">
                    Ir al Directorio
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 space-y-6">
              {serverError && (
                <Alert variant="destructive" className="border-red-900 bg-red-950/40 text-red-200">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <AlertTitle>Error al registrar usuario</AlertTitle>
                  <AlertDescription>{serverError}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Documento de Identidad */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-border flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-brand" />
                    Documento de Identidad (Cédula / NIT / Pasaporte)
                  </label>
                  <Input
                    type="text"
                    placeholder="Ej. 1020304050"
                    value={formData.identityDocument}
                    onChange={(e) => handleChange('identityDocument', e.target.value)}
                    className="bg-surface-muted border-border text-foreground font-mono text-sm placeholder:text-foreground-muted focus:border-brand"
                  />
                  {formErrors.identityDocument && (
                    <p className="text-[11px] text-red-400">{formErrors.identityDocument}</p>
                  )}
                </div>

                {/* Nombre Completo */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-border flex items-center gap-1.5">
                    <UserIcon className="h-3.5 w-3.5 text-brand" />
                    Nombre Completo o Razón Social
                  </label>
                  <Input
                    type="text"
                    placeholder="Ej. Carlos Vendedor o Distribuciones SAS"
                    value={formData.fullName}
                    onChange={(e) => handleChange('fullName', e.target.value)}
                    className="bg-surface-muted border-border text-foreground text-sm placeholder:text-foreground-muted focus:border-brand"
                  />
                  {formErrors.fullName && (
                    <p className="text-[11px] text-red-400">{formErrors.fullName}</p>
                  )}
                </div>

                {/* Correo Electrónico */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-border flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-brand" />
                    Correo Electrónico Institucional
                  </label>
                  <Input
                    type="email"
                    placeholder="usuario@empresa.com"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="bg-surface-muted border-border text-foreground text-sm placeholder:text-foreground-muted focus:border-brand"
                  />
                  {formErrors.email && (
                    <p className="text-[11px] text-red-400">{formErrors.email}</p>
                  )}
                </div>

                {/* Contraseña */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-border flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-brand" />
                    Contraseña Inicial
                  </label>
                  <Input
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    className="bg-surface-muted border-border text-foreground text-sm placeholder:text-foreground-muted focus:border-brand"
                  />
                  {formErrors.password && (
                    <p className="text-[11px] text-red-400">{formErrors.password}</p>
                  )}
                </div>

                {/* Rol de Usuario */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-border flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-brand" />
                    Rol en la Plataforma
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => handleChange('role', e.target.value as UserRole)}
                    aria-label="Seleccionar rol de usuario"
                    className="w-full bg-surface-muted border border-border text-foreground text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-brand"
                  >
                    <option value={UserRole.Seller}>Vendedor (Seller)</option>
                    <option value={UserRole.LogisticsOperator}>Operador Logístico</option>
                    <option value={UserRole.Supervisor}>Supervisor de Auditoría</option>
                    <option value={UserRole.Administrator}>Administrador de Plataforma</option>
                    <option value={UserRole.Buyer}>Comprador (Buyer)</option>
                  </select>
                  {formErrors.role && (
                    <p className="text-[11px] text-red-400">{formErrors.role}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="w-full bg-brand text-primary-foreground hover:bg-brand/90 font-semibold"
                >
                  {createMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Creando Usuario...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" /> Crear Usuario
                    </>
                  )}
                </Button>
              </form>
            </div>
          )}
        </section>

        {/* Lado Derecho (40%): Políticas RBAC y Garantías ──────────────── */}
        <section className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl border border-border bg-surface p-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand font-sans flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Invariante de Sesión Activa (INV-APP-01)
            </h3>
            <p className="text-xs text-foreground-muted leading-relaxed">
              La creación de usuarios por parte de un Administrador NO altera ni reemplaza la sesión activa en memoria RAM del operador actual. Las credenciales registradas quedan listas para su uso independiente.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground font-sans">
              Matriz Canónica de Roles Zentric
            </h3>
            <div className="space-y-3 text-xs text-foreground-muted">
              <div>
                <span className="font-semibold text-foreground block">Vendedor (Seller):</span>
                Catálogo propio, variantes físicas, existencias por bodega y aprobación de devoluciones.
              </div>
              <div>
                <span className="font-semibold text-foreground block">Operador Logístico:</span>
                Empaque, despacho y certificación exclusiva de entrega (`Delivered`), más inspección física.
              </div>
              <div>
                <span className="font-semibold text-foreground block">Supervisor:</span>
                Auditoría transversal 360° en modo sólo lectura y ajuste por conteo físico (ADR-0021).
              </div>
              <div>
                <span className="font-semibold text-foreground block">Administrador:</span>
                Control total RBAC, bodegas físicas, facturación split y acreditación de reembolsos.
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
