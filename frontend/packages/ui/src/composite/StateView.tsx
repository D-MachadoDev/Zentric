import * as React from 'react';
import { Ban, Inbox, RotateCcw } from 'lucide-react';
import { Button } from '../primitives/Button';
import { Skeleton } from '../primitives/Skeleton';
import { cn } from '../lib/cn';

/**
 * Contenedor unificado para los 4 estados canónicos de una vista (Frontend-Design-System §5.3):
 * 1. Loading: Esqueletos de carga con aria-busy="true".
 * 2. Empty: Ilustración/ícono + título explicativo + acción de escape/creación.
 * 3. Error: Ícono de alerta + mensaje RFC 7807 + botón de reintento en línea.
 * 4. Data: Proyección normal de los hijos (children).
 *
 * Ninguna vista de la consola queda muda: cada estado comunica su causa
 * y ofrece un camino de recuperación accionable.
 */
export type StateViewKind = 'loading' | 'empty' | 'error' | 'data';

export interface StateViewAction {
  label: string;
  onClick: () => void;
}

export interface StateViewProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Tipo de estado activo. Si se omite, se deduce de las banderas booleanas o de los hijos. */
  state?: StateViewKind;
  /** Compatibilidad hacia atrás con el parámetro `tone` de la especificación inicial. */
  tone?: 'empty' | 'error' | 'loading';
  isLoading?: boolean;
  isError?: boolean;
  isEmpty?: boolean;
  title?: string;
  description?: string;
  /** Acción primaria (crear, navegar o reintentar). */
  action?: StateViewAction;
  /** Callback explícito de reintento en fallo. Si se define, genera un botón de reintento. */
  onRetry?: () => void;
  /** Cantidad de filas de skeleton a renderizar en estado de carga (por defecto: 3). */
  skeletonRows?: number;
  children?: React.ReactNode;
  className?: string;
}

function StateView({
  state,
  tone,
  isLoading = false,
  isError = false,
  isEmpty = false,
  title,
  description,
  action,
  onRetry,
  skeletonRows = 3,
  children,
  className,
  ...props
}: StateViewProps) {
  // 1. Determinar el estado canónico activo
  let resolvedState: StateViewKind = 'data';

  if (state) {
    resolvedState = state;
  } else if (tone) {
    resolvedState = tone === 'loading' ? 'loading' : tone === 'error' ? 'error' : 'empty';
  } else if (isLoading) {
    resolvedState = 'loading';
  } else if (isError) {
    resolvedState = 'error';
  } else if (isEmpty) {
    resolvedState = 'empty';
  } else if (!children) {
    resolvedState = 'empty';
  }

  // Si el estado es 'data' y hay hijos, se renderizan directamente
  if (resolvedState === 'data' && children) {
    return <>{children}</>;
  }

  // 2. Estado de carga: Skeletons proporcionales
  if (resolvedState === 'loading') {
    return (
      <div
        data-slot="state-view-loading"
        role="status"
        aria-busy="true"
        aria-label={title ?? 'Cargando información...'}
        className={cn(
          'flex flex-col gap-4 w-full rounded-xl border border-border/70 bg-surface/40 p-6 md:p-8',
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-lg bg-surface-muted" />
          <div className="flex flex-col gap-2 flex-1">
            <Skeleton className="h-4 w-1/3 bg-surface-muted" />
            <Skeleton className="h-3 w-1/2 bg-surface-muted/70" />
          </div>
        </div>
        <div className="flex flex-col gap-2.5 pt-2">
          {Array.from({ length: skeletonRows }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-10 w-full rounded-md bg-surface-muted/60"
            />
          ))}
        </div>
        <span className="sr-only">Cargando datos...</span>
      </div>
    );
  }

  // 3. Estado de error: Alerta con reintento
  if (resolvedState === 'error') {
    const errorTitle = title ?? 'No se pudo completar la operación';
    const errorDescription =
      description ?? 'Ocurrió un error al procesar la solicitud. Comprueba la conexión o intenta nuevamente.';
    const retryHandler = onRetry ?? action?.onClick;
    const retryLabel = action?.label ?? 'Reintentar';

    return (
      <div
        data-slot="state-view"
        data-tone="error"
        role="alert"
        className={cn(
          'flex flex-col items-center justify-center text-center gap-4 rounded-xl border border-destructive/30 bg-surface/50 p-8 shadow-xs md:p-12',
          className
        )}
        {...props}
      >
        <div className="flex size-12 items-center justify-center rounded-xl border border-destructive/40 bg-destructive/10 text-destructive shadow-xs">
          <Ban aria-hidden="true" className="size-5" />
        </div>

        <div className="flex flex-col gap-1.5 max-w-md">
          <p className="text-base font-semibold tracking-tight text-destructive">
            {errorTitle}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {errorDescription}
          </p>
        </div>

        {retryHandler && (
          <Button
            variant="outline"
            size="sm"
            onClick={retryHandler}
            className="mt-1 shadow-xs active:scale-[0.98] border-border/80 hover:bg-surface-muted"
          >
            <RotateCcw aria-hidden="true" className="size-3.5 mr-1.5" />
            {retryLabel}
          </Button>
        )}
      </div>
    );
  }

  // 4. Estado vacío: Guía e iniciación
  const emptyTitle = title ?? 'No se encontraron registros';
  const emptyAction = action;

  return (
    <div
      data-slot="state-view"
      data-tone="empty"
      role="status"
      className={cn(
        'flex flex-col items-center justify-center text-center gap-4 rounded-xl border border-border/70 bg-surface/50 p-8 shadow-xs md:p-12',
        className
      )}
      {...props}
    >
      <div className="flex size-12 items-center justify-center rounded-xl border border-border/80 bg-surface-muted/60 text-muted-foreground shadow-xs">
        <Inbox aria-hidden="true" className="size-5" />
      </div>

      <div className="flex flex-col gap-1.5 max-w-md">
        <p className="text-base font-semibold tracking-tight text-foreground">
          {emptyTitle}
        </p>
        {description && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {emptyAction && (
        <Button
          variant="outline"
          size="sm"
          onClick={emptyAction.onClick}
          className="mt-1 shadow-xs active:scale-[0.98]"
        >
          {emptyAction.label}
        </Button>
      )}
    </div>
  );
}

export { StateView };
