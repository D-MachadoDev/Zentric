import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

/**
 * Insignia de estado semántico del dominio (Frontend-Design-System §3 y §5.3).
 *
 * El color jamás actúa como único portador de significado (WCAG AA). Por ello,
 * exige obligatoriamente punto cromático (6px) como refuerzo visual y rótulo
 * textual explícito en español.
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

export type StatusTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger';

const dotByTone: Record<StatusTone, string> = {
  neutral: 'bg-foreground/40',
  info: 'bg-info',
  warning: 'bg-warning',
  success: 'bg-success',
  danger: 'bg-destructive',
};

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof statusBadgeVariants> {
  tone?: StatusTone | null;
  children: React.ReactNode;
  className?: string;
}

function StatusBadge({ tone = 'neutral', children, className, ...props }: StatusBadgeProps) {
  const activeTone: StatusTone = tone ?? 'neutral';

  return (
    <span
      data-slot="status-badge"
      data-tone={activeTone}
      className={cn(statusBadgeVariants({ tone: activeTone }), className)}
      {...props}
    >
      <span aria-hidden="true" className={cn('size-1.5 shrink-0 rounded-full', dotByTone[activeTone])} />
      {children}
    </span>
  );
}

export { StatusBadge, statusBadgeVariants };
