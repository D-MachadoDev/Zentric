import { useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Ban,
} from 'lucide-react';
import {
  Button,
  Badge,
  Input,
  Alert,
  AlertTitle,
  AlertDescription,
} from '@zentric/ui';
import { useCancelGhostStockMutation } from '../../application/services';
import { CancelGhostStockSchema } from '../../application/schemas';
import type { CancelGhostStockInput } from '../../domain';

interface GhostStockReportPageProps {
  fulfillmentId?: string;
}

export function GhostStockReportPage({ fulfillmentId }: GhostStockReportPageProps) {
  const params = useParams({ strict: false });
  const id = fulfillmentId ?? (params as Record<string, string>)?.id ?? '';

  const [formData, setFormData] = useState<CancelGhostStockInput>({
    fulfillmentOrderId: id,
    variantId: '',
    warehouseId: '',
    quantityToCancel: 1,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const cancelGhostMutation = useCancelGhostStockMutation();

  const handleFieldChange = (
    field: keyof CancelGhostStockInput,
    value: string | number
  ) => {
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

    const payload = {
      ...formData,
      fulfillmentOrderId: id || formData.fulfillmentOrderId,
    };

    const validation = CancelGhostStockSchema.safeParse(payload);
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
      await cancelGhostMutation.mutateAsync(validation.data);
      setSuccess(true);
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : 'Error al reportar el quiebre por stock fantasma.'
      );
    }
  };

  return (
    <div className="space-y-8 w-full max-w-full">
      {/* ── Encabezado ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              to={id ? '/logistics/fulfillments/$id' : '/logistics/fulfillments'}
              params={id ? { id } : undefined}
              className="text-foreground-muted hover:text-foreground transition-colors mr-1"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
              Reporte de Stock Fantasma
            </h1>
            <Badge variant="outline" className="border-red-900/60 text-red-400 font-mono text-xs">
              ADR-0014 / ADR-0022
            </Badge>
          </div>
          <p className="text-sm text-foreground-muted">
            Notificación de discrepancia física en bodega: cancela el despacho y revierte fondos al comprador.
          </p>
        </div>
      </div>

      {success ? (
        <div className="rounded-2xl border border-brand/40 bg-surface p-8 space-y-6 text-center">
          <CheckCircle className="h-10 w-10 text-brand mx-auto" />
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-foreground font-sans">
              Quiebre por Stock Fantasma Notificado
            </h3>
            <p className="text-xs text-foreground-muted max-w-md mx-auto leading-relaxed">
              La orden de despacho #{id.substring(0, 8)} ha sido cancelada. Las unidades no existentes han sido ajustadas en la bodega física y el pedido pasará a liquidación de saldo para el comprador.
            </p>
          </div>

          <Link to="/logistics/fulfillments">
            <Button className="bg-brand text-primary-foreground hover:bg-brand/90 font-semibold text-xs">
              Volver a la Cola de Despachos
            </Button>
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-red-900/50 bg-surface p-6 sm:p-8 space-y-6">
          <Alert variant="destructive" className="border-red-900 bg-red-950/40 text-red-200">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <AlertTitle>Acción Crítica e Irreversible</AlertTitle>
            <AlertDescription className="text-xs">
              Al reportar este quiebre, se cancelará inmediatamente el despacho físico y se desencadenará la anulación de comprobantes y devolución de dinero al cliente (ADR-0022).
            </AlertDescription>
          </Alert>

          {serverError && (
            <Alert variant="destructive" className="border-red-900 bg-red-950/40 text-red-200">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertTitle>Error en el reporte</AlertTitle>
              <AlertDescription className="text-xs">{serverError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* ID de Despacho */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground-muted">
                ID de la Orden de Despacho (UUID)
              </label>
              <Input
                type="text"
                placeholder="UUID del despacho"
                value={formData.fulfillmentOrderId}
                onChange={(e) => handleFieldChange('fulfillmentOrderId', e.target.value)}
                className="bg-surface-muted border-border text-foreground font-mono text-xs focus:border-red-500"
              />
              {formErrors.fulfillmentOrderId && (
                <p className="text-[11px] text-red-400">{formErrors.fulfillmentOrderId}</p>
              )}
            </div>

            {/* Variante */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground-muted">
                ID de la Variante con Quiebre Físico (UUID)
              </label>
              <Input
                type="text"
                placeholder="UUID de la variante que no se encuentra en bodega"
                value={formData.variantId}
                onChange={(e) => handleFieldChange('variantId', e.target.value)}
                className="bg-surface-muted border-border text-foreground font-mono text-xs focus:border-red-500"
              />
              {formErrors.variantId && (
                <p className="text-[11px] text-red-400">{formErrors.variantId}</p>
              )}
            </div>

            {/* Bodega */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground-muted">
                ID de la Bodega Física del Quiebre (UUID)
              </label>
              <Input
                type="text"
                placeholder="UUID de la bodega donde ocurrió el faltante"
                value={formData.warehouseId}
                onChange={(e) => handleFieldChange('warehouseId', e.target.value)}
                className="bg-surface-muted border-border text-foreground font-mono text-xs focus:border-red-500"
              />
              {formErrors.warehouseId && (
                <p className="text-[11px] text-red-400">{formErrors.warehouseId}</p>
              )}
            </div>

            {/* Cantidad */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground-muted">
                Cantidad Faltante a Cancelar
              </label>
              <Input
                type="number"
                min={1}
                value={formData.quantityToCancel}
                onChange={(e) =>
                  handleFieldChange('quantityToCancel', parseInt(e.target.value, 10) || 0)
                }
                className="bg-surface-muted border-border text-foreground font-mono text-sm focus:border-red-500"
              />
              {formErrors.quantityToCancel && (
                <p className="text-[11px] text-red-400">{formErrors.quantityToCancel}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={cancelGhostMutation.isPending}
              className="w-full bg-red-600 hover:bg-red-700 text-foreground font-semibold text-xs mt-2 transition-all active:scale-[0.98]"
            >
              {cancelGhostMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Cancelando Despacho...
                </>
              ) : (
                <>
                  <Ban className="h-4 w-4 mr-2" /> Confirmar Quiebre y Cancelar Despacho
                </>
              )}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
