import { useState } from 'react';
import {
  Sliders,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Clock,
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
  useInventoriesQuery,
  useAdjustInventoryMutation,
} from '../../application/services';
import { AdjustInventorySchema } from '../../application/schemas';
import type { AdjustInventoryResult, Inventory } from '../../domain';

export function InventoryAdjustPage() {
  const [targetInventoryId, setTargetInventoryId] = useState('');
  const [countedQuantity, setCountedQuantity] = useState<number>(0);
  const [reason, setReason] = useState('');

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [adjustmentResult, setAdjustmentResult] = useState<AdjustInventoryResult | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    data: inventories = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useInventoriesQuery();

  const adjustMutation = useAdjustInventoryMutation();

  const selectedInventory = inventories.find((inv: Inventory) => inv.id === targetInventoryId);

  const handleSelectInventory = (inv: Inventory) => {
    setTargetInventoryId(inv.id);
    setCountedQuantity(inv.availableQuantity);
    setAdjustmentResult(null);
    setServerError(null);
    setFormErrors({});
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setFormErrors({});
    setAdjustmentResult(null);

    if (!targetInventoryId.trim()) {
      setServerError('Debe seleccionar o especificar la posición de inventario a ajustar.');
      return;
    }

    const validation = AdjustInventorySchema.safeParse({
      countedQuantity,
      reason,
    });

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
      const res = await adjustMutation.mutateAsync({
        id: targetInventoryId.trim(),
        input: validation.data,
      });

      setAdjustmentResult(res);
      refetch();
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : 'Error al registrar el ajuste físico de inventario.'
      );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8 p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full">
        <Skeleton className="h-10 w-64 bg-[#111827]" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <Skeleton className="lg:col-span-7 h-96 rounded-2xl bg-[#111827]" />
          <Skeleton className="lg:col-span-5 h-96 rounded-2xl bg-[#111827]" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6 p-6 sm:p-10 max-w-4xl mx-auto w-full">
        <Alert variant="destructive" className="border-red-900 bg-red-950/40 text-red-200">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <AlertTitle>Error al cargar inventarios</AlertTitle>
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
              Ajuste de Inventario por Conteo Físico
            </h1>
            <Badge variant="outline" className="border-[#1F293D] text-[#FFB800] font-mono text-xs">
              ADR-0021
            </Badge>
          </div>
          <p className="text-sm text-[#94A3B8]">
            Conciliación atómica de existencias físicas en bodega con ventana de idempotencia de 5 minutos y motivo obligatorio.
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
        {/* Lado Izquierdo (65%): Formulario de Ajuste y Resultado ───────── */}
        <section className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl border border-[#1F293D] bg-[#111827] p-6 sm:p-8 space-y-6">
            <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sliders className="h-4 w-4 text-[#FFB800]" />
              Formulario de Conciliación Física
            </h3>

            {serverError && (
              <Alert variant="destructive" className="border-red-900 bg-red-950/40 text-red-200">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertTitle>Error en el ajuste</AlertTitle>
                <AlertDescription className="text-xs">{serverError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleAdjustSubmit} className="space-y-5">
              {/* Posición de Inventario */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#E2E8F0]">
                  Posición de Inventario (ID de Registro)
                </label>
                <Input
                  type="text"
                  placeholder="UUID del inventario o seleccione de la lista derecha"
                  value={targetInventoryId}
                  onChange={(e) => setTargetInventoryId(e.target.value)}
                  className="bg-[#161F30] border-[#1F293D] text-white font-mono text-xs focus:border-[#FFB800]"
                />
              </div>

              {selectedInventory && (
                <div className="p-3.5 rounded-xl bg-[#161F30]/60 border border-[#1F293D] grid grid-cols-4 gap-2 text-center text-xs">
                  <div>
                    <span className="text-[#94A3B8] block text-[10px] uppercase">Disponible</span>
                    <span className="font-mono font-bold text-white tabular-nums">
                      {selectedInventory.availableQuantity}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#94A3B8] block text-[10px] uppercase">Reservado</span>
                    <span className="font-mono font-bold text-[#FFB800] tabular-nums">
                      {selectedInventory.reservedQuantity}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#94A3B8] block text-[10px] uppercase">Usado</span>
                    <span className="font-mono font-bold text-[#94A3B8] tabular-nums">
                      {selectedInventory.usedQuantity}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#94A3B8] block text-[10px] uppercase">Dañado</span>
                    <span className="font-mono font-bold text-red-400 tabular-nums">
                      {selectedInventory.damagedQuantity}
                    </span>
                  </div>
                </div>
              )}

              {/* Cantidad Física Contada */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#E2E8F0]">
                  Cantidad Física Contada en Bodega (Mayor o igual a 0)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={countedQuantity}
                  onChange={(e) => setCountedQuantity(parseInt(e.target.value, 10) || 0)}
                  className="bg-[#161F30] border-[#1F293D] text-white font-mono text-sm focus:border-[#FFB800]"
                />
                {formErrors.countedQuantity && (
                  <p className="text-[11px] text-red-400">{formErrors.countedQuantity}</p>
                )}
                <p className="text-[11px] text-[#64748B]">
                  Corresponde al número real de unidades verificadas físicamente en el almacén.
                </p>
              </div>

              {/* Motivo Obligatorio */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#E2E8F0]">
                  Motivo Justificado del Ajuste (Auditoría)
                </label>
                <Input
                  type="text"
                  placeholder="Ej. Conteo físico trimestral / Merma por rotura / Corrección de ingreso"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="bg-[#161F30] border-[#1F293D] text-white text-xs placeholder:text-[#64748B] focus:border-[#FFB800]"
                />
                {formErrors.reason && (
                  <p className="text-[11px] text-red-400">{formErrors.reason}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={adjustMutation.isPending}
                className="w-full bg-[#FFB800] text-[#0B0F19] hover:bg-[#FFB800]/90 font-semibold text-xs"
              >
                {adjustMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Procesando Ajuste...
                  </>
                ) : (
                  <>
                    <Sliders className="h-4 w-4 mr-2" /> Registrar Ajuste Físico
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Resultado Idempotente del Ajuste */}
          {adjustmentResult && (
            <div className="rounded-2xl border border-[#00D4AA]/40 bg-[#111827] p-6 space-y-4">
              <div className="flex items-center gap-2 text-[#00D4AA]">
                <CheckCircle className="h-5 w-5" />
                <h4 className="text-sm font-bold text-white font-sans">
                  Resultado del Ajuste (ADR-0021)
                </h4>
              </div>

              <div className="p-4 rounded-xl bg-[#161F30] border border-[#1F293D] space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-[#94A3B8]">ID de Ajuste:</span>
                  <span className="text-white">{adjustmentResult.adjustmentId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94A3B8]">Stock Anterior:</span>
                  <span className="text-white tabular-nums">
                    {adjustmentResult.previousAvailableQuantity} unidades
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94A3B8]">Nuevo Stock Disponible:</span>
                  <span className="text-[#00D4AA] font-bold tabular-nums">
                    {adjustmentResult.newAvailableQuantity} unidades
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94A3B8]">Variación Neta:</span>
                  <span className="text-[#FFB800] tabular-nums">
                    {adjustmentResult.adjustedQuantity}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94A3B8]">Motivo:</span>
                  <span className="text-white">{adjustmentResult.reason}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94A3B8]">Fecha Conteo:</span>
                  <span className="text-white">{adjustmentResult.countedAt}</span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Lado Derecho (35%): Selector de Inventarios y Reglas ─────────── */}
        <section className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl border border-[#1F293D] bg-[#111827] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1F293D] pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white font-sans">
                Posiciones de Inventario en Red
              </h3>
              <span className="text-xs font-mono text-[#94A3B8]">
                {inventories.length} registros
              </span>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {inventories.map((inv: Inventory) => {
                const isSelected = targetInventoryId === inv.id;
                return (
                  <div
                    key={inv.id}
                    onClick={() => handleSelectInventory(inv)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-[#FFB800] bg-[#161F30]'
                        : 'border-[#1F293D] bg-[#161F30]/40 hover:bg-[#161F30]'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-mono text-[#00D4AA]">
                        Var: {inv.variantId.substring(0, 8)}...
                      </span>
                      <span className="font-mono text-white tabular-nums font-semibold">
                        {inv.availableQuantity} Disp.
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-[#64748B] flex justify-between">
                      <span>Bod: #{inv.warehouseId.substring(0, 8)}</span>
                      <span>ID: #{inv.id.substring(0, 8)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-[#1F293D] bg-[#111827] p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#FFB800]">
              <Clock className="h-4 w-4" />
              <span>Garantía de Idempotencia (ADR-0021)</span>
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              El ajuste físico utiliza una clave de idempotencia temporal calculada a partir del `inventoryId` y la ventana de 5 minutos. Conteo duplicado dentro del umbral devuelve la respuesta registrada sin generar desfasajes dobles en la base de datos.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
