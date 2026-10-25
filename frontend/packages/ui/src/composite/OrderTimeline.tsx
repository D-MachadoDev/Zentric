import * as React from 'react';
import { Ban, Check } from 'lucide-react';
import { cn } from '../lib/cn';

/**
 * Línea de tiempo secuencial del ciclo de vida de un pedido o despacho (Frontend-Design-System §5.3).
 *
 * Flujo canónico de la Ley (ZENTRIC.md Dominio 6 y Dominio 8):
 * Creado (o Pendiente de Pago) -> Pagado -> Despachado -> Entregado.
 * Maneja además cancelaciones y estados de error terminales.
 */
export type StepStatus = 'completed' | 'current' | 'upcoming' | 'cancelled';

export interface OrderTimelineStep {
  id: string;
  label: string;
  description?: string;
  timestamp?: string | Date;
  status: StepStatus;
}

export interface OrderTimelineProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Pasos explícitos de la línea de tiempo. */
  steps?: OrderTimelineStep[];
  /** Estado canónico del pedido (ej. "Cart", "PendingPayment", "Paid", "Dispatched", "Delivered", "Cancelled"). */
  currentStatus?: string;
  /** Orientación de la línea: horizontal (escritorio) o vertical (móvil / panel lateral). */
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

const CANONICAL_STAGES = [
  { id: 'created', label: 'Creado', match: ['cart', 'pendingpayment', 'creado', 'pendiente de pago'] },
  { id: 'paid', label: 'Pagado', match: ['paid', 'pagado'] },
  { id: 'dispatched', label: 'Despachado', match: ['dispatched', 'packed', 'despachado', 'empacado'] },
  { id: 'delivered', label: 'Entregado', match: ['delivered', 'entregado'] },
];

function deriveStepsFromStatus(currentStatus?: string): OrderTimelineStep[] {
  if (!currentStatus) {
    return CANONICAL_STAGES.map((stage, idx) => ({
      id: stage.id,
      label: stage.label,
      status: idx === 0 ? 'current' : 'upcoming',
    }));
  }

  const normalized = currentStatus.trim().toLowerCase();
  const isCancelled = normalized.includes('cancel');

  if (isCancelled) {
    return [
      { id: 'created', label: 'Creado', status: 'completed' },
      { id: 'cancelled', label: 'Cancelado', status: 'cancelled', description: 'Pedido cancelado' },
    ];
  }

  // Encontrar el índice canónico alcanzado
  let activeIndex = 0;
  if (normalized === 'delivered' || normalized === 'entregado') {
    activeIndex = 3;
  } else if (normalized === 'dispatched' || normalized === 'despachado' || normalized === 'packed') {
    activeIndex = 2;
  } else if (normalized === 'paid' || normalized === 'pagado') {
    activeIndex = 1;
  } else {
    activeIndex = 0;
  }

  return CANONICAL_STAGES.map((stage, index) => {
    let status: StepStatus = 'upcoming';
    if (index < activeIndex) {
      status = 'completed';
    } else if (index === activeIndex) {
      // Si llegó al último estado, se considera completado
      status = index === CANONICAL_STAGES.length - 1 ? 'completed' : 'current';
    }
    return {
      id: stage.id,
      label: stage.label,
      status,
    };
  });
}

function OrderTimeline({
  steps,
  currentStatus,
  orientation = 'horizontal',
  className,
  ...props
}: OrderTimelineProps) {
  const resolvedSteps = steps && steps.length > 0 ? steps : deriveStepsFromStatus(currentStatus);
  const isHorizontal = orientation === 'horizontal';

  return (
    <div
      data-slot="order-timeline"
      data-orientation={orientation}
      className={cn('w-full', className)}
      {...props}
    >
      <ol
        role="list"
        aria-label="Línea de tiempo del pedido"
        className={cn(
          'flex w-full',
          isHorizontal
            ? 'flex-row items-center justify-between gap-2 overflow-x-auto py-2'
            : 'flex-col gap-6 py-2'
        )}
      >
        {resolvedSteps.map((step, index) => {
          const isLast = index === resolvedSteps.length - 1;
          const isCompleted = step.status === 'completed';
          const isCurrent = step.status === 'current';
          const isCancelled = step.status === 'cancelled';
          const isUpcoming = step.status === 'upcoming';

          return (
            <li
              key={step.id}
              role="listitem"
              aria-current={isCurrent ? 'step' : undefined}
              className={cn(
                'relative flex items-center',
                isHorizontal ? 'flex-1 last:flex-none' : 'w-full'
              )}
            >
              <div
                className={cn(
                  'flex items-center gap-3',
                  isHorizontal ? 'flex-col text-center sm:flex-row sm:text-left' : 'flex-row'
                )}
              >
                {/* Indicador cromático del nodo */}
                <div
                  data-slot="timeline-dot"
                  data-status={step.status}
                  className={cn(
                    'relative flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-mono font-medium transition-colors shadow-xs',
                    isCompleted &&
                      'border-primary bg-primary text-primary-foreground',
                    isCurrent &&
                      'border-primary bg-primary/20 text-primary ring-4 ring-primary/20',
                    isCancelled &&
                      'border-destructive bg-destructive/20 text-destructive',
                    isUpcoming &&
                      'border-border/80 bg-surface-muted text-muted-foreground'
                  )}
                >
                  {isCompleted && <Check className="size-4 stroke-[2.5]" />}
                  {isCurrent && <span className="size-2 rounded-full bg-primary" />}
                  {isCancelled && <Ban className="size-4 stroke-[2.5]" />}
                  {isUpcoming && <span>{index + 1}</span>}
                </div>

                {/* Textos del nodo: Rótulo + Descripción/Fecha */}
                <div className="flex flex-col gap-0.5 min-w-[80px]">
                  <span
                    className={cn(
                      'font-sans text-xs font-medium tracking-tight',
                      isCompleted && 'text-foreground',
                      isCurrent && 'font-semibold text-primary',
                      isCancelled && 'font-semibold text-destructive',
                      isUpcoming && 'text-muted-foreground'
                    )}
                  >
                    {step.label}
                  </span>
                  {step.description && (
                    <span className="text-[11px] text-muted-foreground">
                      {step.description}
                    </span>
                  )}
                  {step.timestamp && (
                    <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                      {step.timestamp instanceof Date
                        ? step.timestamp.toLocaleDateString('es-CO', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : String(step.timestamp)}
                    </span>
                  )}
                </div>
              </div>

              {/* Conector estructural entre nodos */}
              {!isLast && (
                <div
                  aria-hidden="true"
                  className={cn(
                    isHorizontal
                      ? 'hidden h-0.5 flex-1 sm:block mx-3'
                      : 'absolute left-4 top-8 -bottom-6 w-0.5',
                    isCompleted ? 'bg-primary' : 'bg-border/70'
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export { OrderTimeline };
