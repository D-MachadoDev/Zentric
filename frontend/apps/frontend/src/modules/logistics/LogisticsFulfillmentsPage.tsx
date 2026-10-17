import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  Truck,
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  PackageCheck,
  ArrowUpRight,
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
  useFulfillmentsQuery,
  useCreateFulfillmentMutation,
} from '../../application/services';
import { CreateFulfillmentSchema } from '../../application/schemas';
import { NOMBRES_DE_ESTADO_DE_DESPACHO } from '../../components/domainLabels';
import type { CreateFulfillmentInput, FulfillmentOrder } from '../../domain';
import { FulfillmentStatus } from '../../domain';

export function LogisticsFulfillmentsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Formulario nuevo despacho
  const [formData, setFormData] = useState<CreateFulfillmentInput>({
    customerOrderId: '',
    vendorId: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  const parsedStatus = statusFilter === 'All' ? undefined : (statusFilter as FulfillmentStatus);

  const {
    data: fulfillments = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useFulfillmentsQuery(parsedStatus);

  const createMutation = useCreateFulfillmentMutation();

  const filteredFulfillments = fulfillments.filter((ful: FulfillmentOrder) => {
    const matchesSearch =
      !searchTerm.trim() ||
      ful.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ful.customerOrderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ful.vendorId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'All' || ful.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);
    setFormErrors({});

    const validation = CreateFulfillmentSchema.safeParse(formData);
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
      setCreateSuccess(`Orden de despacho creada con ID #${newId.substring(0, 8)}...`);
      setFormData({ customerOrderId: '', vendorId: '' });
      refetch();
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : 'Error al registrar orden de despacho.'
      );
    }
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
          <AlertTitle>Error al cargar despachos</AlertTitle>
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
              Cola de Despachos y Operaciones Logísticas
            </h1>
            <Badge variant="outline" className="border-[#1F293D] text-[#00D4AA] font-mono text-xs">
              {fulfillments.length} Envíos
            </Badge>
          </div>
          <p className="text-sm text-[#94A3B8]">
            Monitoreo y ejecución de empaque, despacho y entrega de paquetes en la red logística.
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

      {/* ── Split-Frame (70% / 30%) ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Lado Izquierdo (70%): Tabla de Despachos ─────────────────────── */}
        <section className="lg:col-span-8 space-y-6">
          {/* Controles de Búsqueda y Pestañas de Estado */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B]" />
              <Input
                type="text"
                placeholder="Buscar por ID despacho, pedido o vendedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-[#111827] border-[#1F293D] text-white placeholder:text-[#64748B] focus:border-[#00D4AA]"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filtrar por estado de despacho"
              className="bg-[#111827] border border-[#1F293D] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#00D4AA]"
            >
              <option value="All">Todos los Estados</option>
              <option value={FulfillmentStatus.PendingPack}>Por Empacar (PendingPack)</option>
              <option value={FulfillmentStatus.Packed}>Empacado (Packed)</option>
              <option value={FulfillmentStatus.Dispatched}>En Tránsito (Dispatched)</option>
              <option value={FulfillmentStatus.Delivered}>Entregado (Delivered)</option>
              <option value={FulfillmentStatus.Cancelled}>Cancelado (Cancelled)</option>
            </select>
          </div>

          {filteredFulfillments.length === 0 ? (
            <div className="rounded-2xl border border-[#1F293D] bg-[#111827] p-12 text-center">
              <Truck className="h-10 w-10 text-[#64748B] mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-white">No se encontraron despachos</h3>
              <p className="text-xs text-[#94A3B8] mt-1">
                No hay órdenes de envío que coincidan con los filtros seleccionados.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#1F293D] bg-[#111827] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#1F293D] text-[#94A3B8] uppercase tracking-wider font-sans bg-[#161F30]/40">
                      <th className="py-3 px-4">Despacho</th>
                      <th className="py-3 px-4">Pedido Original</th>
                      <th className="py-3 px-4">Vendedor</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F293D]/60">
                    {filteredFulfillments.map((ful: FulfillmentOrder) => {
                      const statusName = NOMBRES_DE_ESTADO_DE_DESPACHO[ful.status] ?? ful.status;
                      const isSellerSeed = ful.vendorId === '0b01129d-c0a9-4325-8394-4b9e636a4e88';
                      const vendorLabel = isSellerSeed ? 'Valeria Mendoza (Vendedor)' : `Vendedor #${ful.vendorId.substring(0, 8)}`;
                      const vendorSub = isSellerSeed ? 'seller@zentric.local' : ful.vendorId;

                      return (
                        <tr key={ful.id} className="hover:bg-[#161F30]/40 transition-colors">
                          <td className="py-4 px-4 font-mono font-semibold text-white">
                            <div>#{ful.id.substring(0, 8)}</div>
                            <div className="text-[10px] text-[#64748B] font-mono">Despacho</div>
                          </td>
                          <td className="py-4 px-4 font-mono text-[#E2E8F0]">
                            <div>#{ful.customerOrderId.substring(0, 8)}</div>
                            <div className="text-[10px] text-[#64748B] font-sans">Pedido Comercial</div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-semibold text-white text-xs">{vendorLabel}</div>
                            <div className="text-[11px] font-mono text-[#94A3B8]">{vendorSub}</div>
                          </td>
                          <td className="py-4 px-4">
                            <Badge
                              variant="outline"
                              className={`text-[11px] font-mono ${
                                ful.status === FulfillmentStatus.PendingPack
                                  ? 'border-[#FFB800]/40 text-[#FFB800] bg-[#FFB800]/10'
                                  : ful.status === FulfillmentStatus.Packed || ful.status === FulfillmentStatus.Dispatched
                                  ? 'border-[#00D4AA]/40 text-[#00D4AA] bg-[#00D4AA]/10'
                                  : ful.status === FulfillmentStatus.Delivered
                                  ? 'border-emerald-400/40 text-emerald-300 bg-emerald-500/10'
                                  : 'border-red-400/40 text-red-400 bg-red-400/10'
                              }`}
                            >
                              {statusName}
                            </Badge>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <Link
                              to="/logistics/fulfillments/$id"
                              params={{ id: ful.id }}
                              className="inline-flex items-center gap-1 text-[#00D4AA] hover:text-[#00D4AA]/80 font-semibold"
                            >
                              Operar <ArrowUpRight className="h-3.5 w-3.5" />
                            </Link>
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

        {/* Lado Derecho (30%): Alta Manual de Despacho ──────────────────── */}
        <section className="lg:col-span-4 space-y-6">
          <div className="rounded-2xl border border-[#1F293D] bg-[#111827] p-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white font-sans flex items-center gap-2">
              <Plus className="h-4 w-4 text-[#00D4AA]" />
              Crear Orden de Despacho
            </h3>

            {createSuccess && (
              <Alert className="border-[#00D4AA]/40 bg-[#00D4AA]/10 text-[#00D4AA]">
                <CheckCircle className="h-4 w-4 text-[#00D4AA]" />
                <AlertDescription className="text-xs">{createSuccess}</AlertDescription>
              </Alert>
            )}

            {createError && (
              <Alert variant="destructive" className="border-red-900 bg-red-950/40 text-red-200">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-xs">{createError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-[#E2E8F0] block mb-1">ID del Pedido Pagado (UUID)</label>
                <Input
                  type="text"
                  placeholder="UUID del pedido a despachar"
                  value={formData.customerOrderId}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, customerOrderId: e.target.value }))
                  }
                  className="bg-[#161F30] border-[#1F293D] text-white font-mono text-xs focus:border-[#00D4AA]"
                />
                {formErrors.customerOrderId && (
                  <p className="text-[11px] text-red-400 mt-1">{formErrors.customerOrderId}</p>
                )}
              </div>

              <div>
                <label className="text-[#E2E8F0] block mb-1">ID del Vendedor Titular (UUID)</label>
                <Input
                  type="text"
                  placeholder="UUID del vendedor dueño del stock"
                  value={formData.vendorId}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, vendorId: e.target.value }))
                  }
                  className="bg-[#161F30] border-[#1F293D] text-white font-mono text-xs focus:border-[#00D4AA]"
                />
                {formErrors.vendorId && (
                  <p className="text-[11px] text-red-400 mt-1">{formErrors.vendorId}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full bg-[#00D4AA] text-[#0B0F19] hover:bg-[#00D4AA]/90 font-semibold text-xs mt-2"
              >
                {createMutation.isPending ? 'Creando...' : 'Crear Despacho'}
              </Button>
            </form>
          </div>

          <div className="rounded-2xl border border-[#1F293D] bg-[#111827] p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#00D4AA]">
              <PackageCheck className="h-4 w-4" />
              <span>Flujo Logístico Canónico</span>
            </div>
            <p className="text-[11px] text-[#94A3B8] leading-relaxed">
              Las órdenes de despacho avanzan secuencialmente: `PendingPack` $\rightarrow$ `Packed` $\rightarrow$ `Dispatched` $\rightarrow$ `Delivered`. La certificación de entrega es potestad exclusiva del Operador Logístico.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
