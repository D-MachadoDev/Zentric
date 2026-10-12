import { Ban, RotateCcw } from 'lucide-react';
import { Button } from './button';
import { cn } from '../../lib/cn';

/**
 * Estado vacío y estado de error con una sola pieza (Frontend-Design-System §4).
 *
 * §4 exige que **ninguna vista quede muda**: un vacío explica y ofrece la
 * siguiente acción útil; un error dice qué pasó y permite reintentar. Pintarlos
 * con el mismo componente evita que cada módulo reinvente el tono y el roles
 * accesibles:
 *
 * - `tone="empty"` → `role="status"` (anuncio, no urgencia)
 * - `tone="error"` → `role="alert"` (anuncio inmediato, §5)
 */
export interface StateViewProps {
  tone?: 'empty' | 'error';
  title: string;
  description?: string;
  /** Acción sugerida: registrar la primera entidad, reintentar, volver. */
  action?: { label: string; onClick: () => void };
  className?: string;
}

function StateView({ tone = 'empty', title, description, action, className }: StateViewProps) {
  const esError = tone === 'error';
  const Icono = esError ? Ban : RotateCcw;

  return (
    <div
      data-slot="state-view"
      data-tone={tone}
      role={esError ? 'alert' : 'status'}
      className={cn(
        'flex flex-col items-center justify-center text-center gap-4 rounded-xl border border-border/70 bg-surface/50 p-8 shadow-xs md:p-12',
        className
      )}
    >
      <div
        className={cn(
          'flex size-12 items-center justify-center rounded-xl border shadow-xs',
          esError
            ? 'border-destructive/40 bg-destructive/10 text-destructive'
            : 'border-border/80 bg-surface-muted/60 text-muted-foreground'
        )}
      >
        <Icono
          aria-hidden="true"
          className="size-5"
        />
      </div>

      <div className="flex flex-col gap-1.5 max-w-md">
        <p className={cn('text-base font-semibold tracking-tight text-foreground', esError && 'text-destructive')}>
          {title}
        </p>
        {description !== undefined && (
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        )}
      </div>

      {action !== undefined && (
        <Button variant="outline" size="sm" onClick={action.onClick} className="mt-1 shadow-xs active:scale-[0.98]">
          {action.label}
        </Button>
      )}
    </div>
  );
}

export { StateView };
