import { useState } from 'react';
import {
  Warehouse as WarehouseIcon,
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Layers,
  MapPin,
  Building2,
  Edit2,
  X,
  User as UserIcon,
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
  useWarehousesQuery,
  useCreateWarehouseMutation,
  useUpdateWarehouseMutation,
  useUsersQuery,
} from '../../application/services';
import { CreateWarehouseSchema, UpdateWarehouseSchema } from '../../application/schemas';
import type { CreateWarehouseInput, UpdateWarehouseInput, Warehouse, User } from '../../domain';
import { WarehouseType } from '../../domain';

export function WarehouseListPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('All');

  const [formData, setFormData] = useState<CreateWarehouseInput>({
    name: '',
    location: '',
    capacity: 1000,
    type: WarehouseType.Marketplace,
    vendorId: null,
  });

  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [editFormData, setEditFormData] = useState<UpdateWarehouseInput>({
    name: '',
    location: '',
    capacity: 1000,
    isActive: true,
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editError, setEditError] = useState<string | null>(null);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data: warehouses = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useWarehousesQuery();

  const { data: users = [] } = useUsersQuery();

  const createMutation = useCreateWarehouseMutation();
  const updateMutation = useUpdateWarehouseMutation();

  const filteredWarehouses = warehouses.filter((w: Warehouse) => {
    const matchesSearch =
      !searchTerm.trim() ||
      w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType =
      typeFilter === 'All' || w.type === typeFilter;

    return matchesSearch && matchesType;
  });

  const handleFieldChange = (
    field: keyof CreateWarehouseInput,
    value: string | number | null
  ) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'type' && value === WarehouseType.Marketplace) {
        next.vendorId = null;
      }
      return next;
    });

    setFormErrors((prev) => {
      const copy = { ...prev };
      delete copy[field];
      return copy;
    });
  };

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);
    setFormErrors({});

    const validation = CreateWarehouseSchema.safeParse(formData);
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
      setActionSuccess(`Bodega creada exitosamente con ID: ${newId.substring(0, 8)}...`);
      setFormData({
        name: '',
        location: '',
        capacity: 1000,
        type: WarehouseType.Marketplace,
        vendorId: null,
      });
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Error al crear la bodega física.'
      );
    }
  };

  const handleStartEdit = (w: Warehouse) => {
    setEditingWarehouse(w);
    setEditFormData({
      name: w.name,
      location: w.location,
      capacity: w.capacity,
      isActive: w.isActive,
    });
    setEditErrors({});
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWarehouse) return;
    setEditError(null);
    setEditErrors({});

    const validation = UpdateWarehouseSchema.safeParse(editFormData);
    if (!validation.success) {
      const errMap: Record<string, string> = {};
      for (const err of validation.error.issues) {
        if (err.path[0]) {
          errMap[err.path[0] as string] = err.message;
        }
      }
      setEditErrors(errMap);
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: editingWarehouse.id,
        input: validation.data,
      });
      setActionSuccess(`Bodega "${validation.data.name}" actualizada con éxito.`);
      setEditingWarehouse(null);
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : 'Error al actualizar la bodega física.'
      );
    }
  };

  const getWarehouseOwnerLabel = (w: Warehouse) => {
    if (w.type === WarehouseType.Marketplace) {
      return {
        title: 'Zentric Marketplace',
        subtitle: 'Fulfillment Central',
        isCentral: true,
      };
    }
    const owner = users.find((u: User) => u.id === w.vendorId);
    if (owner) {
      return {
        title: owner.name,
        subtitle: owner.email,
        isCentral: false,
      };
    }
    return {
      title: 'Vendedor Titular',
      subtitle: w.vendorId ? `ID: ${w.vendorId.substring(0, 8)}...` : 'Sin asignar',
      isCentral: false,
    };
  };

  if (isLoading) {
    return (
      <div className="space-y-8 p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full">
        <Skeleton className="h-10 w-64 bg-[#111827]" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <Skeleton className="lg:col-span-8 h-96 rounded-2xl bg-[#111827]" />
          <Skeleton className="lg:col-span-4 h-96 rounded-2xl bg-[#111827]" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6 p-6 sm:p-10 max-w-4xl mx-auto w-full">
        <Alert variant="destructive" className="border-red-900 bg-red-950/40 text-red-200">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <AlertTitle>Error al cargar la red de bodegas</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Ocurrió un error inesperado.'}
          </AlertDescription>
        </Alert>
        <Button
          onClick={() => refetch()}
          variant="outline"
          className="border-[#1F293D] text-white hover:bg-[#1F293D]"
        >
          <RefreshCw className="h-4 w-4 mr-2" /> Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full">
      {/* ── Encabezado ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#1F293D]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
              Red de Bodegas Físicas
            </h1>
            <Badge variant="outline" className="border-[#1F293D] text-[#00D4AA] font-mono text-xs">
              {warehouses.length} Nodos
            </Badge>
          </div>
          <p className="text-sm text-[#94A3B8]">
            Supervisión y aprovisionamiento de centros de distribución Centrales Zentric y bodegas propias de vendedores.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="border-[#1F293D] text-[#94A3B8] hover:text-white"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Refrescar
        </Button>
      </div>

      {/* ── Split-Frame (65% / 35%) ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Lado Izquierdo (65%): Tabla de Bodegas ───────────────────────── */}
        <section className="lg:col-span-8 space-y-6">
          {/* Controles de Búsqueda y Filtro */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B]" />
              <Input
                type="text"
                placeholder="Buscar por nombre, ubicación o ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-[#111827] border-[#1F293D] text-white placeholder:text-[#64748B] focus:border-[#00D4AA]"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label="Filtrar por tipo de bodega"
              className="bg-[#111827] border border-[#1F293D] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#00D4AA]"
            >
              <option value="All">Todos los Tipos</option>
              <option value={WarehouseType.Marketplace}>Central Marketplace</option>
              <option value={WarehouseType.Vendor}>Bodega de Vendedor</option>
            </select>
          </div>

          {filteredWarehouses.length === 0 ? (
            <div className="rounded-2xl border border-[#1F293D] bg-[#111827] p-12 text-center">
              <WarehouseIcon className="h-10 w-10 text-[#64748B] mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-white">No se encontraron bodegas</h3>
              <p className="text-xs text-[#94A3B8] mt-1">
                Ajuste los criterios de búsqueda o registre una nueva bodega física.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#1F293D] bg-[#111827] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#1F293D] text-[#94A3B8] uppercase tracking-wider font-sans bg-[#161F30]/40">
                      <th className="py-3 px-4">Bodega</th>
                      <th className="py-3 px-4">Ubicación</th>
                      <th className="py-3 px-4 text-right">Capacidad</th>
                      <th className="py-3 px-4">Titular / Propietario</th>
                      <th className="py-3 px-4">Tipo</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F293D]/60">
                    {filteredWarehouses.map((w: Warehouse) => {
                      const owner = getWarehouseOwnerLabel(w);
                      return (
                        <tr key={w.id} className="hover:bg-[#161F30]/40 transition-colors">
                          <td className="py-4 px-4">
                            <div className="font-semibold text-white flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-[#00D4AA]" />
                              {w.name}
                            </div>
                            <div className="text-[11px] font-mono text-[#64748B] mt-0.5">
                              ID: {w.id}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-[#E2E8F0] font-sans">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 text-[#94A3B8]" />
                              {w.location}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-right font-mono font-semibold text-white tabular-nums">
                            {w.capacity.toLocaleString('es-CO')}{' '}
                            <span className="text-[10px] text-[#94A3B8] uppercase">m³</span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="space-y-0.5">
                              <div className="font-semibold text-white flex items-center gap-1.5">
                                <UserIcon
                                  className={`h-3.5 w-3.5 ${
                                    owner.isCentral ? 'text-[#00D4AA]' : 'text-[#FFB800]'
                                  }`}
                                />
                                <span>{owner.title}</span>
                              </div>
                              <div className="text-[11px] font-mono text-[#94A3B8]">
                                {owner.subtitle}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            {w.type === WarehouseType.Marketplace ? (
                              <Badge
                                variant="outline"
                                className="border-[#00D4AA]/40 text-[#00D4AA] text-[11px] font-mono"
                              >
                                Central Marketplace
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="border-[#FFB800]/40 text-[#FFB800] text-[11px] font-mono"
                              >
                                Vendedor
                              </Badge>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            {w.isActive ? (
                              <span className="inline-flex items-center gap-1.5 text-xs text-[#00D4AA]">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#00D4AA]" />
                                Activa
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs text-[#64748B]">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#64748B]" />
                                Inactiva
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleStartEdit(w)}
                              className="border-[#1F293D] hover:border-[#00D4AA] text-[#E2E8F0] hover:text-[#00D4AA] text-xs h-7 px-2.5 transition-colors"
                            >
                              <Edit2 className="h-3 w-3 mr-1" /> Editar
                            </Button>
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

        {/* Lado Derecho (35%): Formulario de Registro de Bodega ─────────── */}
        <section className="lg:col-span-4 space-y-6">
          <div className="rounded-2xl border border-[#1F293D] bg-[#111827] p-6 space-y-5">
            <div className="border-b border-[#1F293D] pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Plus className="h-4 w-4 text-[#00D4AA]" />
                Registrar Bodega Física
              </h3>
              <p className="text-[11px] text-[#94A3B8] mt-1">
                Alta de nuevo nodo logístico central o delegado.
              </p>
            </div>

            {actionSuccess && (
              <Alert className="border-[#00D4AA]/40 bg-[#00D4AA]/10 text-[#00D4AA]">
                <CheckCircle className="h-4 w-4 text-[#00D4AA]" />
                <AlertTitle>Operación Exitosa</AlertTitle>
                <AlertDescription className="text-xs">{actionSuccess}</AlertDescription>
              </Alert>
            )}

            {actionError && (
              <Alert variant="destructive" className="border-red-900 bg-red-950/40 text-red-200">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertTitle>Error al crear</AlertTitle>
                <AlertDescription className="text-xs">{actionError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleCreateWarehouse} className="space-y-4 text-xs">
              {/* Nombre */}
              <div className="space-y-1">
                <label className="text-[#E2E8F0] font-semibold">Nombre de la Bodega</label>
                <Input
                  type="text"
                  placeholder="Ej. Bodega Central Fontibón"
                  value={formData.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  className="bg-[#161F30] border-[#1F293D] text-white text-xs focus:border-[#00D4AA]"
                />
                {formErrors.name && (
                  <p className="text-[11px] text-red-400">{formErrors.name}</p>
                )}
              </div>

              {/* Ubicación */}
              <div className="space-y-1">
                <label className="text-[#E2E8F0] font-semibold">Ubicación / Dirección</label>
                <Input
                  type="text"
                  placeholder="Ej. Calle 26 # 92-32, Bogotá"
                  value={formData.location}
                  onChange={(e) => handleFieldChange('location', e.target.value)}
                  className="bg-[#161F30] border-[#1F293D] text-white text-xs focus:border-[#00D4AA]"
                />
                {formErrors.location && (
                  <p className="text-[11px] text-red-400">{formErrors.location}</p>
                )}
              </div>

              {/* Capacidad */}
              <div className="space-y-1">
                <label className="text-[#E2E8F0] font-semibold">Capacidad Volumétrica (m³)</label>
                <Input
                  type="number"
                  min={0}
                  value={formData.capacity}
                  onChange={(e) =>
                    handleFieldChange('capacity', parseInt(e.target.value, 10) || 0)
                  }
                  className="bg-[#161F30] border-[#1F293D] text-white font-mono text-xs focus:border-[#00D4AA]"
                />
                {formErrors.capacity && (
                  <p className="text-[11px] text-red-400">{formErrors.capacity}</p>
                )}
              </div>

              {/* Tipo */}
              <div className="space-y-1">
                <label className="text-[#E2E8F0] font-semibold">Tipo Canónico de Bodega</label>
                <select
                  value={formData.type}
                  onChange={(e) => handleFieldChange('type', e.target.value as WarehouseType)}
                  aria-label="Seleccionar tipo de bodega"
                  className="w-full bg-[#161F30] border border-[#1F293D] text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-[#00D4AA]"
                >
                  <option value={WarehouseType.Marketplace}>Marketplace (Central Zentric)</option>
                  <option value={WarehouseType.Vendor}>Vendor (Bodega Propia de Vendedor)</option>
                </select>
              </div>

              {/* Vendedor Dueño (sólo si Vendor) */}
              {formData.type === WarehouseType.Vendor && (
                <div className="space-y-1">
                  <label className="text-[#E2E8F0] font-semibold">
                    ID del Vendedor Dueño (UUID)
                  </label>
                  <Input
                    type="text"
                    placeholder="UUID del vendedor titular"
                    value={formData.vendorId ?? ''}
                    onChange={(e) => handleFieldChange('vendorId', e.target.value)}
                    className="bg-[#161F30] border-[#1F293D] text-white font-mono text-xs focus:border-[#00D4AA]"
                  />
                  {formErrors.vendorId && (
                    <p className="text-[11px] text-red-400">{formErrors.vendorId}</p>
                  )}
                </div>
              )}

              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full bg-[#00D4AA] text-[#0B0F19] hover:bg-[#00D4AA]/90 font-semibold text-xs mt-2"
              >
                {createMutation.isPending ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" /> Registrando Bodega...
                  </>
                ) : (
                  <>
                    <WarehouseIcon className="h-3.5 w-3.5 mr-2" /> Guardar Bodega
                  </>
                )}
              </Button>
            </form>
          </div>

          <div className="rounded-2xl border border-[#1F293D] bg-[#111827] p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#00D4AA]">
              <Layers className="h-4 w-4" />
              <span>Regla Canónica de Bodegas</span>
            </div>
            <p className="text-[11px] text-[#94A3B8] leading-relaxed">
              Las bodegas Marketplace pertenecen a la infraestructura central de Zentric y no tienen dueño asignado (`null`). Las bodegas Vendor pertenecen a un vendedor específico para operaciones de almacenamiento propio.
            </p>
          </div>
        </section>
      </div>

      {/* ── Modal de Edición de Bodega ───────────────────────────────────── */}
      {editingWarehouse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111827] border border-[#1F293D] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#1F293D] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-[#00D4AA]/10 text-[#00D4AA]">
                  <Edit2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Editar Bodega Física</h3>
                  <p className="text-[11px] font-mono text-[#94A3B8]">ID: {editingWarehouse.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingWarehouse(null)}
                className="text-[#94A3B8] hover:text-white p-1 rounded-lg hover:bg-[#161F30] transition-colors"
                aria-label="Cerrar modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {editError && (
              <Alert variant="destructive" className="border-red-900 bg-red-950/40 text-red-200">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertTitle>Error al actualizar</AlertTitle>
                <AlertDescription className="text-xs">{editError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[#E2E8F0] font-semibold">Nombre de la Bodega</label>
                <Input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) =>
                    setEditFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="bg-[#161F30] border-[#1F293D] text-white text-xs focus:border-[#00D4AA]"
                />
                {editErrors.name && (
                  <p className="text-[11px] text-red-400">{editErrors.name}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[#E2E8F0] font-semibold">Ubicación</label>
                <Input
                  type="text"
                  value={editFormData.location}
                  onChange={(e) =>
                    setEditFormData((prev) => ({ ...prev, location: e.target.value }))
                  }
                  className="bg-[#161F30] border-[#1F293D] text-white text-xs focus:border-[#00D4AA]"
                />
                {editErrors.location && (
                  <p className="text-[11px] text-red-400">{editErrors.location}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[#E2E8F0] font-semibold">Capacidad de Almacenamiento (m³)</label>
                <Input
                  type="number"
                  min={0}
                  value={editFormData.capacity}
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      capacity: Number(e.target.value),
                    }))
                  }
                  className="bg-[#161F30] border-[#1F293D] text-white font-mono text-xs focus:border-[#00D4AA]"
                />
                {editErrors.capacity && (
                  <p className="text-[11px] text-red-400">{editErrors.capacity}</p>
                )}
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#161F30] border border-[#1F293D]">
                <div>
                  <div className="text-xs font-semibold text-[#E2E8F0]">Estado Operativo</div>
                  <div className="text-[11px] text-[#94A3B8]">
                    {editFormData.isActive
                      ? 'Bodega activa para recepción de stock y despachos'
                      : 'Bodega inactiva temporalmente'}
                  </div>
                </div>
                <input
                  type="checkbox"
                  id="warehouse-active-toggle"
                  checked={editFormData.isActive}
                  onChange={(e) =>
                    setEditFormData((prev) => ({ ...prev, isActive: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-[#1F293D] text-[#00D4AA] focus:ring-[#00D4AA] focus:ring-offset-0 bg-[#111827] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1F293D]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingWarehouse(null)}
                  className="border-[#1F293D] text-white hover:bg-[#161F30] text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="bg-[#00D4AA] text-[#0B0F19] hover:bg-[#00D4AA]/90 font-semibold text-xs"
                >
                  {updateMutation.isPending ? (
                    <>
                      <RefreshCw className="h-3 w-3 mr-1.5 animate-spin" /> Guardando...
                    </>
                  ) : (
                    'Guardar Cambios'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
