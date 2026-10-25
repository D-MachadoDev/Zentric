import * as React from 'react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { X } from 'lucide-react';
import { Button } from '../primitives/Button';
import { cn } from '../lib/cn';

/**
 * Panel lateral deslizante de inspección rápida (Frontend-Design-System §2.1 y §5.3).
 *
 * Ocupa la zona secundaria del Split-Frame Layout (30%-35% en escritorio, pantalla completa en móvil).
 * Utiliza la curva de desaceleración exponencial canónica:
 * cubic-bezier(0.16, 1, 0.3, 1) (--ease-out-expo).
 *
 * Accesibilidad WAI-ARIA:
 * - role="dialog", aria-modal="true"
 * - Trampa de foco activa mientras permanece abierto
 * - Cierre accesible con tecla Escape y clic en el telón de fondo
 */
export interface ResponsiveDrawerProps {
  /** Estado de apertura del panel. */
  open?: boolean;
  defaultOpen?: boolean;
  /** Callback de cierre invocado al pulsar Escape, backdrop o botón de cierre. */
  onClose?: () => void;
  /** Título principal de la cabecera. */
  title: string;
  /** Descripción contextual del panel. */
  description?: React.ReactNode;
  /** Lado de anclaje: right (por defecto) o left. */
  side?: 'right' | 'left';
  /** Ancho personalizado en escritorio (por defecto: 35%). */
  widthClassName?: string;
  /** Contenido principal del panel con scroll automático. */
  children: React.ReactNode;
  /** Pie de panel opcional para acciones de cierre o guardado. */
  footer?: React.ReactNode;
  /** Disparador opcional. */
  trigger?: React.ReactNode;
  className?: string;
}

function ResponsiveDrawer({
  open,
  defaultOpen,
  onClose,
  title,
  description,
  side = 'right',
  widthClassName = 'lg:w-[35%]',
  children,
  footer,
  trigger,
  className,
}: ResponsiveDrawerProps) {
  const isRight = side === 'right';

  return (
    <DialogPrimitive.Root
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={(isOpen) => {
        if (!isOpen && onClose) {
          onClose();
        }
      }}
    >
      {trigger && <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>}

      <DialogPrimitive.Portal>
        {/* Telón de fondo con desenfoque */}
        <DialogPrimitive.Overlay
          data-slot="responsive-drawer-overlay"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
        />

        {/* Panel lateral con curva --ease-out-expo */}
        <DialogPrimitive.Content
          data-slot="responsive-drawer"
          role="dialog"
          aria-modal="true"
          className={cn(
            'fixed inset-y-0 z-50 flex h-full w-full flex-col bg-surface border-border/90 shadow-2xl duration-300 outline-none ease-[cubic-bezier(0.16,1,0.3,1)]',
            isRight
              ? 'right-0 border-l data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right'
              : 'left-0 border-r data-open:animate-in data-open:slide-in-from-left data-closed:animate-out data-closed:slide-out-to-left',
            'sm:max-w-md lg:max-w-xl',
            widthClassName,
            className
          )}
        >
          {/* Cabecera del panel */}
          <div className="flex items-start justify-between border-b border-border/80 p-5 md:p-6">
            <div className="flex flex-col gap-1 pr-6">
              <DialogPrimitive.Title
                data-slot="responsive-drawer-title"
                className="font-heading text-lg font-semibold tracking-tight text-foreground"
              >
                {title}
              </DialogPrimitive.Title>

              {description && (
                <DialogPrimitive.Description
                  data-slot="responsive-drawer-description"
                  className="text-xs text-muted-foreground leading-relaxed"
                >
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>

            <DialogPrimitive.Close asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Cerrar panel lateral"
                className="size-8 rounded-lg text-muted-foreground hover:bg-surface-muted hover:text-foreground"
              >
                <X className="size-4" />
              </Button>
            </DialogPrimitive.Close>
          </div>

          {/* Cuerpo deslizable del panel */}
          <div className="flex-1 overflow-y-auto p-5 md:p-6 text-sm text-foreground">
            {children}
          </div>

          {/* Pie del panel opcional */}
          {footer && (
            <div className="border-t border-border/80 bg-surface-muted/30 p-4 md:p-5">
              {footer}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export { ResponsiveDrawer };
