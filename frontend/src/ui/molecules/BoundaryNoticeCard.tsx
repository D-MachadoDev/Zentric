import * as React from 'react';
import { ArrowRight, Building2, ShoppingBag, X } from 'lucide-react';
import { cn } from '../lib/cn';

export type BoundaryPortalTarget = 'corporate' | 'buyer';

export interface BoundaryNoticeCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Rol o portal detectado */
  targetPortal: BoundaryPortalTarget;
  /** Nombre del rol detectado (ej. 'Vendedor', 'Logística', 'Supervisión', 'Administrador', 'Comprador') */
  detectedRoleName?: string;
  /** Callback o URL para el salto en 1 clic */
  onJump?: () => void;
  jumpUrl?: string;
  jumpLabel?: string;
  /** Permitir cerrar o descartar el aviso */
  onDismiss?: () => void;
  /** Título y mensaje personalizados opcionales */
  title?: string;
  description?: string;
}

/**
 * Tarjeta de Aviso de Frontera (Boundary Enforcement UX).
 * Se presenta con una micro-animación fluida cuando un usuario intenta acceder por el portal equivocado,
 * ofreciendo un salto directo en 1 clic hacia la estación correspondiente sin frustración.
 */
export function BoundaryNoticeCard({
  targetPortal,
  detectedRoleName,
  onJump,
  jumpUrl,
  jumpLabel,
  onDismiss,
  title,
  description,
  className,
  ...props
}: BoundaryNoticeCardProps) {
  const isCorporateTarget = targetPortal === 'corporate';

  // Configuración predeterminada según la dirección del cruce de frontera
  const defaultTitle = isCorporateTarget
    ? `Cuenta de ${detectedRoleName || 'Operaciones'} detectada`
    : 'Cuenta de Comprador detectada';

  const defaultDescription = isCorporateTarget
    ? `Tus credenciales pertenecen a la estación corporativa de Zentric. Para gestionar inventario, muelle o gobernanza, ingresa por la Consola de Operaciones.`
    : 'Tus credenciales están registradas para compras en el Marketplace. Para ver tu carrito, pedidos y catálogo, ingresa por el Portal de Compradores.';

  const defaultJumpLabel = isCorporateTarget
    ? 'Ir a la Consola Corporativa'
    : 'Ir al Portal de Compradores';

  const resolvedTitle = title || defaultTitle;
  const resolvedDescription = description || defaultDescription;
  const resolvedJumpLabel = jumpLabel || defaultJumpLabel;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'relative overflow-hidden rounded-xl border p-4 sm:p-5 transition-all duration-200 shadow-xs',
        isCorporateTarget
          ? 'border-indigo-200/90 dark:border-indigo-900/60 bg-indigo-50/70 dark:bg-indigo-950/25 text-indigo-950 dark:text-indigo-100'
          : 'border-teal-200/90 dark:border-teal-900/60 bg-teal-50/70 dark:bg-teal-950/25 text-teal-950 dark:text-teal-100',
        className
      )}
      {...props}
    >
      <div className="flex items-start gap-3.5">
        <div
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-lg shadow-2xs',
            isCorporateTarget
              ? 'bg-indigo-600 text-white dark:bg-indigo-500'
              : 'bg-teal-600 text-white dark:bg-teal-500'
          )}
          aria-hidden="true"
        >
          {isCorporateTarget ? (
            <Building2 className="size-4.5" />
          ) : (
            <ShoppingBag className="size-4.5" />
          )}
        </div>

        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                isCorporateTarget
                  ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300'
                  : 'bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300'
              )}
            >
              Frontera de Acceso
            </span>
            <span className="text-xs text-foreground-muted font-mono">
              {isCorporateTarget ? 'PORTAL-B2B' : 'PORTAL-B2C'}
            </span>
          </div>

          <h4 className="mt-1.5 text-sm font-semibold tracking-tight text-foreground">
            {resolvedTitle}
          </h4>

          <p className="mt-1 text-xs sm:text-[13px] leading-relaxed text-foreground-muted">
            {resolvedDescription}
          </p>

          <div className="mt-3.5 flex items-center gap-3">
            {jumpUrl ? (
              <a
                href={jumpUrl}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-transform active:scale-[0.98] cursor-pointer',
                  isCorporateTarget
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-500 dark:hover:bg-indigo-600'
                    : 'bg-teal-600 hover:bg-teal-700 text-white dark:bg-teal-500 dark:hover:bg-teal-600'
                )}
              >
                <span>{resolvedJumpLabel}</span>
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </a>
            ) : onJump ? (
              <button
                type="button"
                onClick={onJump}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-transform active:scale-[0.98] cursor-pointer',
                  isCorporateTarget
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-500 dark:hover:bg-indigo-600'
                    : 'bg-teal-600 hover:bg-teal-700 text-white dark:bg-teal-500 dark:hover:bg-teal-600'
                )}
              >
                <span>{resolvedJumpLabel}</span>
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Cerrar aviso de frontera"
            className="absolute right-2.5 top-2.5 p-1 rounded-md text-foreground-muted hover:text-foreground hover:bg-surface/50 transition-colors cursor-pointer"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
