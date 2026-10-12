import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/cn';

/**
 * Insignia de estado de dominio (Frontend-Design-System §3).
 *
 * El tono se elige con `tone`, nunca con el texto: así una misma entidad
 * (pedido, despacho, devolución, factura) se pinta igual en todas las pantallas.
 *
 * §5 es tajante: **el color no puede ser el único portador de significado**, de
 * ahí que el texto sea obligatorio y el punto sea sólo un refuerzo visual.
 */
const statusBadgeVariants = cva(
  'inline-flex h-5.5 w-fit shrink-0 items-center gap-1.5 overflow-hidden rounded-full border px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap shadow-xs transition-colors',
  {
    variants: {
      tone: {
        neutral: 'border-border/80 bg-surface-muted text-foreground/80',
        info: 'border-info/30 bg-info/15 text-info',
        warning: 'border-warning/30 bg-warning/15 text-warning',
        success: 'border-success/30 bg-success/15 text-success',
        danger: 'border-destructive/30 bg-destructive/15 text-destructive',
      },
    },
    defaultVariants: {
      tone: 'neutral',
    },
  },
);

/** El punto repite el tono; se declara aparte porque `cva` sólo estila el envoltorio. */
const dotByTone: Record<NonNullable<StatusTone>, string> = {
  neutral: 'bg-foreground/40',
  info: 'bg-info',
  warning: 'bg-warning',
  success: 'bg-success',
  danger: 'bg-destructive',
};

type StatusTone = VariantProps<typeof statusBadgeVariants>['tone'];

export interface StatusBadgeProps extends VariantProps<typeof statusBadgeVariants> {
  children: string;
  className?: string;
}

function StatusBadge({ tone = 'neutral', children, className }: StatusBadgeProps) {
  // `tone` puede llegar `null` (lo permite el tipo de `cva`), y `dotByTone` es un
  // `Record` sin la clave `null`: se normaliza para que el índice sea válido.
  const tono = tone ?? 'neutral';
  return (
    <span
      data-slot="status-badge"
      data-tone={tono}
      className={cn(statusBadgeVariants({ tone: tono }), className)}
    >
      <span aria-hidden="true" className={cn('size-1.5 shrink-0 rounded-full', dotByTone[tono])} />
      {children}
    </span>
  );
}

export { StatusBadge, statusBadgeVariants };
