import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  Users,
  Search,
  UserPlus,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import {
  Button,
  Badge,
  Input,
  Skeleton,
  Alert,
  AlertTitle,
  AlertDescription,
} from '@zentric/ui';
import {
  useUsersQuery,
  useBlockUserMutation,
  useActivateUserMutation,
} from '../../application/services';
import type { User } from '../../domain';
import { UserRole } from '../../domain';

export function UserListPage() {
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const parsedRole = roleFilter === 'All' ? undefined : (roleFilter as UserRole);

  const {
    data: users = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useUsersQuery(parsedRole);

  const blockMutation = useBlockUserMutation();
  const activateMutation = useActivateUserMutation();

  const filteredUsers = users.filter((u: User) => {
    const matchesSearch =
      !searchTerm.trim() ||
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.identityDocument.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Active' && u.isActive) ||
      (statusFilter === 'Blocked' && !u.isActive);

    return matchesSearch && matchesStatus;
  });

  const selectedUser =
    users.find((u: User) => u.id === selectedUserId) ?? filteredUsers[0] ?? null;

  const handleBlock = async (id: string) => {
    setActionError(null);
    setActionSuccess(null);
    try {
      await blockMutation.mutateAsync(id);
      setActionSuccess('Usuario bloqueado exitosamente.');
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Error al bloquear el usuario.'
      );
    }
  };

  const handleActivate = async (id: string) => {
    setActionError(null);
    setActionSuccess(null);
    try {
      await activateMutation.mutateAsync(id);
      setActionSuccess('Usuario reactivado exitosamente.');
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Error al reactivar el usuario.'
      );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8 p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full">
        <Skeleton className="h-10 w-64 bg-surface" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <Skeleton className="lg:col-span-8 h-96 rounded-2xl bg-surface" />
          <Skeleton className="lg:col-span-4 h-96 rounded-2xl bg-surface" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6 p-6 sm:p-10 max-w-4xl mx-auto w-full">
        <Alert variant="destructive" className="border-red-900 bg-red-950/40 text-red-200">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <AlertTitle>Error al consultar el directorio</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Ocurrió un error inesperado.'}
          </AlertDescription>
        </Alert>
        <Button
          onClick={() => refetch()}
          variant="outline"
          className="border-border text-foreground hover:bg-border"
        >
          <RefreshCw className="h-4 w-4 mr-2" /> Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full">
      {/* ── Encabezado ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
              Directorio de Usuarios y Acceso RBAC
            </h1>
            <Badge variant="outline" className="border-border text-brand font-mono text-xs">
              {users.length} Registros
            </Badge>
          </div>
          <p className="text-sm text-foreground-muted">
            Administración centralizada de cuentas de Compradores, Vendedores, Operadores Logísticos y Supervisores.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="border-border text-foreground-muted hover:text-foreground"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Refrescar
          </Button>
          <Link to="/admin/users/new">
            <Button size="sm" className="bg-brand text-primary-foreground hover:bg-brand/90 font-semibold">
              <UserPlus className="h-4 w-4 mr-2" />
              Alta de Usuario
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Feedback de Acciones ────────────────────────────────────────── */}
      {actionSuccess && (
        <Alert className="border-brand/40 bg-brand/10 text-brand">
          <CheckCircle className="h-4 w-4 text-brand" />
          <AlertTitle>Operación Exitosa</AlertTitle>
          <AlertDescription>{actionSuccess}</AlertDescription>
        </Alert>
      )}

      {actionError && (
        <Alert variant="destructive" className="border-red-900 bg-red-950/40 text-red-200">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertTitle>Error Operativo</AlertTitle>
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      {/* ── Split-Frame (70% / 30%) ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Lado Izquierdo (70%): Tabla de Usuarios y Filtros ────────────── */}
        <section className="lg:col-span-8 space-y-6">
          {/* Barra de Filtros */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
              <Input
                type="text"
                placeholder="Buscar por nombre, correo o documento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-surface border-border text-foreground placeholder:text-foreground-muted focus:border-brand"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              aria-label="Filtrar por rol de usuario"
              className="bg-surface border border-border text-foreground text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-brand"
            >
              <option value="All">Todos los Roles</option>
              <option value={UserRole.Buyer}>Comprador (Buyer)</option>
              <option value={UserRole.Seller}>Vendedor (Seller)</option>
              <option value={UserRole.LogisticsOperator}>Operador Logístico</option>
              <option value={UserRole.Supervisor}>Supervisor</option>
              <option value={UserRole.Administrator}>Administrador</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filtrar por estado de usuario"
              className="bg-surface border border-border text-foreground text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-brand"
            >
              <option value="All">Todos los Estados</option>
              <option value="Active">Activos</option>
              <option value="Blocked">Bloqueados</option>
            </select>
          </div>

          {/* Tabla de Usuarios */}
          {filteredUsers.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface p-12 text-center">
              <Users className="h-10 w-10 text-foreground-muted mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-foreground">No se encontraron usuarios</h3>
              <p className="text-xs text-foreground-muted mt-1">
                No hay cuentas que coincidan con los filtros aplicados.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-surface overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-foreground-muted uppercase tracking-wider font-sans bg-surface-muted/40">
                      <th className="py-3 px-4">Usuario</th>
                      <th className="py-3 px-4">Documento</th>
                      <th className="py-3 px-4">Rol</th>
                      <th className="py-3 px-4">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredUsers.map((u: User) => {
                      const isSelected = selectedUser?.id === u.id;
                      return (
                        <tr
                          key={u.id}
                          onClick={() => setSelectedUserId(u.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-surface-muted border-l-2 border-l-brand'
                              : 'hover:bg-surface-muted/40'
                          }`}
                        >
                          <td className="py-4 px-4">
                            <div className="font-medium text-foreground">{u.name}</div>
                            <div className="text-[11px] text-foreground-muted font-mono">{u.email}</div>
                          </td>
                          <td className="py-4 px-4 font-mono text-border">
                            {u.identityDocument}
                          </td>
                          <td className="py-4 px-4">
                            <Badge
                              variant="outline"
                              className="text-[11px] border-border text-brand font-mono"
                            >
                              {u.role}
                            </Badge>
                          </td>
                          <td className="py-4 px-4">
                            {u.isActive ? (
                              <span className="inline-flex items-center gap-1.5 text-xs text-brand">
                                <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                                Activo
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs text-red-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                                Bloqueado
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* Lado Derecho (30%): Ficha Lateral y Acciones ───────────────────── */}
        <section className="lg:col-span-4 space-y-6">
          {selectedUser ? (
            <div className="rounded-2xl border border-border bg-surface p-6 space-y-6">
              <div className="border-b border-border pb-4">
                <span className="text-[11px] font-mono text-foreground-muted block">
                  EXPEDIENTE DE IDENTIDAD
                </span>
                <h3 className="text-lg font-bold text-foreground mt-1">
                  {selectedUser.name}
                </h3>
                <span className="text-xs font-mono text-brand">
                  {selectedUser.role}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-foreground-muted block text-[11px]">Correo Electrónico</label>
                  <p className="font-mono text-foreground mt-0.5">{selectedUser.email}</p>
                </div>

                <div>
                  <label className="text-foreground-muted block text-[11px]">Documento de Identidad</label>
                  <p className="font-mono text-foreground mt-0.5">{selectedUser.identityDocument}</p>
                </div>

                <div>
                  <label className="text-foreground-muted block text-[11px]">Identificador Único (UUID)</label>
                  <p className="font-mono text-[11px] text-foreground-muted break-all mt-0.5">
                    {selectedUser.id}
                  </p>
                </div>

                <div>
                  <label className="text-foreground-muted block text-[11px]">Estado de la Cuenta</label>
                  <p className="mt-0.5 font-semibold">
                    {selectedUser.isActive ? (
                      <span className="text-brand">Habilitado para operar</span>
                    ) : (
                      <span className="text-red-400">Acceso bloqueado en plataforma</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Botón de Acción Bloquear / Reactivar */}
              <div className="pt-2 border-t border-border">
                {selectedUser.isActive ? (
                  <Button
                    variant="outline"
                    onClick={() => handleBlock(selectedUser.id)}
                    disabled={blockMutation.isPending}
                    className="w-full border-red-900/60 text-red-400 hover:bg-red-950/40 hover:text-red-300 text-xs"
                  >
                    <ShieldAlert className="h-4 w-4 mr-2" />
                    {blockMutation.isPending ? 'Bloqueando...' : 'Bloquear Acceso'}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => handleActivate(selectedUser.id)}
                    disabled={activateMutation.isPending}
                    className="w-full border-brand/60 text-brand hover:bg-brand/10 text-xs"
                  >
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    {activateMutation.isPending ? 'Reactivando...' : 'Reactivar Acceso'}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-surface p-8 text-center text-xs text-foreground-muted">
              Seleccione un usuario de la lista para ver su expediente y gestionar permisos.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
