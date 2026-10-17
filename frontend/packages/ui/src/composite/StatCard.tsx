import * as React from 'react';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '../lib/cn';
import { StatusBadge, type StatusTone } from './StatusBadge';

/**
 * Tarjeta analítica de métricas KPI (Frontend-Design-System §2.1 y §5.3).
 *
 * Implementa la banda asimétrica de indicadores (KPI Strip):
 * - Variante "hero": Métrica primaria dominante en Geist Mono 600 con tabular-nums.
 * - Variante "compact": Contador secundario en línea para erradicar las grillas de 4 tarjetas clonadas.
 *
 * Doctrina visual Anti-IA: Cero texto en degradado, cero border-l-4 de colores chillones y
 * cero negro absoluto (#000000).
 */
export type StatCardVariant = 'hero' | 'compact' | 'secondary';

export interface StatCardTrend {
  value: number | string;
  direction: 'up' | 'down' | 'neutral';
  label?: string;
}

export interface StatCardProgress {
  value: number;
  max?: number;
  label?: string;
}

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Título descriptivo de la métrica en Geist Sans (peso 500). */
  title: string;
  /** Cifra principal en Geist Mono (peso 600 con tabular-nums). */
  value: React.ReactNode;
  /** Variante compositiva: hero (dominante) o compact / secondary (en línea). */
  variant?: StatCardVariant;
  /** Subtítulo o período de referencia ("vs. mes anterior", "en tiempo real"). */
  subtitle?: string;
  /** Indicador de tendencia analítica. */
  trend?: StatCardTrend;
  /** Barra de progreso con rol accesible. */
  progress?: StatCardProgress;
  /** Insignia semántica de contexto opcional. */
  badge?: { label: string; tone?: StatusTone };
  /** Ícono temático SVG sin color saturado. */
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}

function StatCard({
  title,
  value,
  variant = 'compact',
  subtitle,
  trend,
  progress,
  badge,
  icon: Icon,
  className,
  ...props
}: StatCardProps) {
  const isHero = variant === 'hero';

  // Cálculo de progreso porcentual acotado [0, 100]
  const progressPercent = progress
    ? Math.min(100, Math.max(0, (progress.value / (progress.max ?? 100)) * 100))
    : null;

  return (
    <div
      data-slot="stat-card"
      data-variant={variant}
      className={cn(
        'group relative flex flex-col justify-between overflow-hidden rounded-xl border bg-surface transition-all duration-150',
        isHero
          ? 'border-border/90 bg-surface/95 p-6 shadow-md md:p-7'
          : 'border-border/70 bg-surface/80 p-4 shadow-xs md:p-5',
        className
      )}
      {...props}
    >
      {/* Cabecera de la métrica: Título + Ícono / Badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="font-sans text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {title}
          </p>
          {subtitle && (
            <span className="text-[11px] text-muted-foreground/80">
              {subtitle}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {badge && (
            <StatusBadge tone={badge.tone ?? 'neutral'}>
              {badge.label}
            </StatusBadge>
          )}
          {Icon && (
            <div className="flex size-8 items-center justify-center rounded-lg border border-border/80 bg-surface-muted/60 text-muted-foreground">
              <Icon className="size-4" />
            </div>
          )}
        </div>
      </div>

      {/* Cifra principal en Geist Mono con tabular-nums */}
      <div className="mt-4 flex items-baseline justify-between gap-3">
        <div
          data-slot="stat-value"
          className={cn(
            'font-mono font-semibold tracking-tight text-foreground tabular-nums',
            isHero ? 'text-3xl md:text-4xl' : 'text-2xl'
          )}
        >
          {value}
        </div>

        {/* Indicador de tendencia */}
        {trend && (
          <div
            data-slot="stat-trend"
            data-direction={trend.direction}
            className={cn(
              'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-xs font-medium tabular-nums',
              trend.direction === 'up' &&
                'border-success/30 bg-success/15 text-success',
              trend.direction === 'down' &&
                'border-destructive/30 bg-destructive/15 text-destructive',
              trend.direction === 'neutral' &&
                'border-border/80 bg-surface-muted text-muted-foreground'
            )}
          >
            {trend.direction === 'up' && <TrendingUp className="size-3" />}
            {trend.direction === 'down' && <TrendingDown className="size-3" />}
            {trend.direction === 'neutral' && <Minus className="size-3" />}
            <span>{trend.value}</span>
            {trend.label && (
              <span className="text-[10px] text-muted-foreground">
                {trend.label}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Barra de progreso analítica opcional */}
      {progress && progressPercent !== null && (
        <div className="mt-4 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{progress.label ?? 'Meta'}</span>
            <span className="font-mono tabular-nums">
              {Math.round(progressPercent)}%
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={progress.value}
            aria-valuemin={0}
            aria-valuemax={progress.max ?? 100}
            aria-label={progress.label ?? title}
            className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted"
          >
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export { StatCard };
