import { useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Input,
  Skeleton,
} from '@zentric/ui';
import {
  useAdjustInventoryMutation,
  useInventoriesQuery,
} from '../../application/services';
import { AdjustInventorySchema } from '../../application/schemas';
import type { AdjustInventoryResult, Inventory } from '../../domain';

/**
 * Estación de Auditoría Física de Existencias (/supervisor/inventory-audit).
 *
 * Frontend-Role-Modules.md §2.6 y ADR-0021:
 * ÚNICA acción de mutación autorizada para el rol Supervisor (`InventoryAdjust`).
 * Registra ajustes verificados por conteo físico con motivo obligatorio y ventana
 * de idempotencia de 5 minutos, mostrando `AdjustInventoryResult` en `Geist Mono`.
 */
export function SupervisorInventoryAuditPage() {
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
      setServerError('Debe seleccionar o especificar la posición de inventario a auditar.');
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
      void refetch();
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : 'Error al registrar el ajuste de auditoría física.'
      );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8 p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full">
        <Skeleton className="h-10 w-64 bg-surface" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <Skeleton className="lg:col-span-7 h-96 rounded-2xl bg-surface" />
          <Skeleton className="lg:col-span-5 h-96 rounded-2xl bg-surface" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6 p-6 sm:p-10 max-w-4xl mx-auto w-full">
        <Alert variant="destructive" className="border-red-900 bg-red-950/40 text-red-200">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <AlertTitle>Error al cargar posiciones de inventario</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Ocurrió un error inesperado al consultar el inventario.'}
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
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
              Estación de Auditoría de Stock por Conteo Físico
            </h1>
            <Badge variant="outline" className="border-border text-warning font-mono text-xs">
              ADR-0021
            </Badge>
            <Badge variant="outline" className="border-border text-brand font-mono text-xs">
              Política InventoryAdjust
            </Badge>
          </div>
          <p className="text-sm text-foreground-muted">
            Única mutación autorizada al Supervisor: registro de discrepancias verificadas por conteo físico con motivo obligatorio e idempotencia de 5 minutos.
          </p>
        </div>

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
      </div>

      {/* ── Split-Frame (65% / 35%) ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Lado Izquierdo (65%): Formulario de Ajuste y Resultado ───────── */}
        <section className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 space-y-6">
            <h2 className="text-base font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Sliders className="h-4 w-4 text-warning" />
              Acta de Conteo Físico en Bodega
            </h2>

            {serverError && (
              <Alert variant="destructive" className="border-red-900 bg-red-950/40 text-red-200">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertTitle>Error en el ajuste de auditoría</AlertTitle>
                <AlertDescription className="text-xs">{serverError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleAdjustSubmit} className="space-y-5">
              {/* Posición de Inventario */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-border">
                  Posición de Inventario Auditada (ID de Registro)
                </label>
                <Input
                  type="text"
                  placeholder="UUID del inventario o seleccione de la lista derecha"
                  value={targetInventoryId}
                  onChange={(e) => setTargetInventoryId(e.target.value)}
                  className="bg-surface-muted border-border text-foreground font-mono text-xs focus:border-warning"
                />
              </div>

              {selectedInventory && (
                <div className="p-3.5 rounded-xl bg-surface-muted/60 border border-border grid grid-cols-4 gap-2 text-center text-xs">
                  <div>
                    <span className="text-foreground-muted block text-[10px] uppercase">Disponible</span>
                    <span className="font-mono font-bold text-foreground tabular-nums">
                      {selectedInventory.availableQuantity}
                    </span>
                  </div>
                  <div>
                    <span className="text-foreground-muted block text-[10px] uppercase">Reservado</span>
                    <span className="font-mono font-bold text-warning tabular-nums">
                      {selectedInventory.reservedQuantity}
                    </span>
                  </div>
                  <div>
                    <span className="text-foreground-muted block text-[10px] uppercase">Usado</span>
                    <span className="font-mono font-bold text-foreground-muted tabular-nums">
                      {selectedInventory.usedQuantity}
                    </span>
                  </div>
                  <div>
                    <span className="text-foreground-muted block text-[10px] uppercase">Dañado</span>
                    <span className="font-mono font-bold text-red-400 tabular-nums">
                      {selectedInventory.damagedQuantity}
                    </span>
                  </div>
                </div>
              )}

              {/* Cantidad Física Contada */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-border">
                  Cantidad Física Verificada en Bodega (Mayor o igual a 0)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={countedQuantity}
                  onChange={(e) => setCountedQuantity(parseInt(e.target.value, 10) || 0)}
                  className="bg-surface-muted border-border text-foreground font-mono text-sm focus:border-warning"
                />
                {formErrors.countedQuantity && (
                  <p data-testid="counted-quantity-error" className="text-[11px] text-red-400">
                    {formErrors.countedQuantity}
                  </p>
                )}
              </div>

              {/* Motivo Obligatorio */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-border">
                  Motivo Obligatorio del Conteo Físico
                </label>
                <Input
                  type="text"
                  placeholder="Ej. Disminución verificada en arqueo físico de pasillo B"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="bg-surface-muted border-border text-foreground text-xs placeholder:text-foreground-muted focus:border-warning"
                />
                {formErrors.reason && (
                  <p data-testid="reason-error" className="text-[11px] text-red-400">
                    {formErrors.reason}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={adjustMutation.isPending}
                className="w-full bg-warning text-primary-foreground hover:bg-warning/90 font-semibold text-xs"
              >
                {adjustMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Procesando Acta...
                  </>
                ) : (
                  <>
                    <Sliders className="h-4 w-4 mr-2" /> Registrar Conteo Físico
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Resultado Idempotente del Ajuste */}
          {adjustmentResult && (
            <div className="rounded-2xl border border-brand/40 bg-surface p-6 space-y-4">
              <div className="flex items-center gap-2 text-brand">
                <CheckCircle className="h-5 w-5" />
                <h3 className="text-sm font-bold text-foreground font-sans">
                  Resultado del Ajuste de Auditoría (ADR-0021)
                </h3>
              </div>

              <div className="p-4 rounded-xl bg-surface-muted border border-border space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-foreground-muted">ID de Ajuste:</span>
                  <span className="text-foreground">{adjustmentResult.adjustmentId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-muted">Stock Anterior:</span>
                  <span className="text-foreground tabular-nums">
                    {adjustmentResult.previousAvailableQuantity} unidades
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-muted">Nuevo Stock Disponible:</span>
                  <span className="text-brand font-bold tabular-nums">
                    {adjustmentResult.newAvailableQuantity} unidades
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-muted">Variación Neta:</span>
                  <span className="text-warning tabular-nums">
                    {adjustmentResult.adjustedQuantity}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-muted">Motivo:</span>
                  <span className="text-foreground">{adjustmentResult.reason}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-muted">Fecha Conteo:</span>
                  <span className="text-foreground">{adjustmentResult.countedAt}</span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Lado Derecho (35%): Selector de Posiciones de Inventario ─────── */}
        <section className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl border border-border bg-surface p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground font-sans">
                Posiciones de Inventario Auditables
              </h3>
              <span className="text-xs font-mono text-foreground-muted">
                {inventories.length} registros
              </span>
            </div>

            {inventories.length === 0 ? (
              <p className="text-xs text-foreground-muted py-6 text-center">
                No hay posiciones de inventario cargadas en la red.
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {inventories.map((inv: Inventory) => {
                  const isSelected = targetInventoryId === inv.id;
                  return (
                    <div
                      key={inv.id}
                      onClick={() => handleSelectInventory(inv)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-warning bg-surface-muted'
                          : 'border-border bg-surface-muted/40 hover:bg-surface-muted'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-mono text-brand">
                          Var: {inv.variantId.substring(0, 8)}...
                        </span>
                        <span className="font-mono text-foreground tabular-nums font-semibold">
                          {inv.availableQuantity} Disp.
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-foreground-muted flex justify-between">
                        <span>Bod: #{inv.warehouseId.substring(0, 8)}</span>
                        <span>ID: #{inv.id.substring(0, 8)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-warning">
              <Clock className="h-4 w-4" />
              <span>Ventana de Idempotencia de 5 Minutos (ADR-0021)</span>
            </div>
            <p className="text-xs text-foreground-muted leading-relaxed">
              Los ajustes por conteo físico registrados por el Supervisor se procesan de manera idempotente en bloques de 5 minutos para prevenir duplicidades por reintentos de red durante el arqueo en almacén.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
