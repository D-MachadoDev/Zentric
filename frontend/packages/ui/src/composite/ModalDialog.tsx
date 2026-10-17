import * as React from 'react';
import { AlertDialog as AlertDialogPrimitive } from 'radix-ui';
import { Button } from '../primitives/Button';
import { cn } from '../lib/cn';

/**
 * Diálogo modal de confirmación crítica y alerta (Frontend-Design-System §5.3).
 *
 * Implementa role="alertdialog" con trampa de foco accesible, cierre con la
 * tecla Escape, botón de cancelación por defecto y botón de acción con soporte
 * destructivo y estado de carga (isLoading) para prevenir doble envío en
 * operaciones financieras o irreversibles (reembolsos, anulación de facturas,
 * quiebre de stock).
 */
export interface ModalDialogProps {
  /** Control de visibilidad del modal. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Título normativo del diálogo. */
  title: string;
  /** Descripción o advertencia técnica de la acción a ejecutar. */
  description?: React.ReactNode;
  /** Rótulo del botón de confirmación (por defecto: "Confirmar"). */
  confirmLabel?: string;
  /** Rótulo del botón de cancelación (por defecto: "Cancelar"). */
  cancelLabel?: string;
  /** Variante semántica de la acción principal. */
  variant?: 'default' | 'destructive' | 'warning';
  /** Callback invocado al confirmar. Puede ser asíncrono. */
  onConfirm?: () => void | Promise<void>;
  /** Callback invocado al cancelar o cerrar el diálogo. */
  onCancel?: () => void;
  /** Indica si la confirmación está en progreso (bloquea controles). */
  isLoading?: boolean;
  /** Disparador opcional (botón o elemento que abre el modal). */
  trigger?: React.ReactNode;
  /** Contenido adicional inyectado dentro del cuerpo del diálogo. */
  children?: React.ReactNode;
  className?: string;
}

function ModalDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  onConfirm,
  onCancel,
  isLoading = false,
  trigger,
  children,
  className,
}: ModalDialogProps) {
  const isDestructive = variant === 'destructive';

  const handleConfirm = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (isLoading) return;
    if (onConfirm) {
      await onConfirm();
    }
    if (onOpenChange) {
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    if (isLoading) return;
    if (onCancel) {
      onCancel();
    }
    if (onOpenChange) {
      onOpenChange(false);
    }
  };

  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger && (
        <AlertDialogPrimitive.Trigger asChild>
          {trigger}
        </AlertDialogPrimitive.Trigger>
      )}

      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay
          data-slot="modal-dialog-overlay"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
        />

        <AlertDialogPrimitive.Content
          data-slot="modal-dialog"
          role="alertdialog"
          className={cn(
            'fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-6 rounded-xl border border-border/90 bg-surface p-6 text-sm text-foreground shadow-2xl duration-150 outline-none sm:max-w-md data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
            className
          )}
        >
          <div className="flex flex-col gap-2">
            <AlertDialogPrimitive.Title
              data-slot="modal-dialog-title"
              className="font-heading text-lg font-semibold leading-tight text-foreground"
            >
              {title}
            </AlertDialogPrimitive.Title>

            {description && (
              <AlertDialogPrimitive.Description
                data-slot="modal-dialog-description"
                className="text-sm text-muted-foreground leading-relaxed"
              >
                {description}
              </AlertDialogPrimitive.Description>
            )}
          </div>

          {children && <div className="py-1">{children}</div>}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={handleCancel}
              className="border-border/80 hover:bg-surface-muted"
            >
              {cancelLabel}
            </Button>

            <Button
              type="button"
              variant={isDestructive ? 'destructive' : 'default'}
              disabled={isLoading}
              isLoading={isLoading}
              onClick={handleConfirm}
              className={cn(
                variant === 'warning' &&
                  'bg-warning hover:bg-warning/90 text-background font-semibold'
              )}
            >
              {confirmLabel}
            </Button>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}

export { ModalDialog };
