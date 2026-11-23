import * as React from 'react';
import { Star } from 'lucide-react';
import { cn } from '../lib/cn';

export interface RatingStarsProps {
  /**
   * Valor numérico actual de la calificación (0 a max).
   */
  value: number;
  /**
   * Callback invocado cuando el usuario selecciona una nueva calificación.
   */
  onChange?: (val: number) => void;
  /**
   * Número máximo de estrellas (por defecto 5).
   */
  max?: number;
  /**
   * Tamaño visual del control y de las estrellas.
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Si es true, el control es de solo lectura y no reacciona a interacciones.
   */
  readOnly?: boolean;
  /**
   * Si es true, el control se deshabilita para accesibilidad e interacciones.
   */
  disabled?: boolean;
  /**
   * Identificador único para el control o formulario.
   */
  id?: string;
  /**
   * Nombre para integración con formularios HTML estándar.
   */
  name?: string;
  /**
   * Etiqueta accesible para tecnologías de asistencia (WCAG 2.2).
   */
  'aria-label'?: string;
  /**
   * Clases CSS opcionales adicionales.
   */
  className?: string;
}

const STAR_SIZES = {
  sm: 'size-4',
  md: 'size-6',
  lg: 'size-8',
};

const BUTTON_PADDING = {
  sm: 'p-1',
  md: 'p-1.5',
  lg: 'p-2',
};

/**
 * RatingStars — Molécula de selección de calificación accesible de 1 a 5 estrellas.
 * Cumple con el estándar WAI-ARIA Slider / Rating y directivas de diseño de Verónica.
 */
export const RatingStars = React.forwardRef<HTMLDivElement, RatingStarsProps>(
  (
    {
      value,
      onChange,
      max = 5,
      size = 'md',
      readOnly = false,
      disabled = false,
      id,
      name,
      'aria-label': ariaLabel = 'Calificación de producto',
      className,
    },
    ref
  ) => {
    const [hoverValue, setHoverValue] = React.useState<number | null>(null);

    const isInteractive = !readOnly && !disabled;
    const activeValue = hoverValue !== null ? hoverValue : value;

    const handleSelect = (starIndex: number) => {
      if (!isInteractive || !onChange) return;
      onChange(starIndex);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!isInteractive || !onChange) return;

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowUp':
          e.preventDefault();
          onChange(Math.min(max, (value || 0) + 1));
          break;
        case 'ArrowLeft':
        case 'ArrowDown':
          e.preventDefault();
          onChange(Math.max(1, value - 1));
          break;
        case 'Home':
          e.preventDefault();
          onChange(1);
          break;
        case 'End':
          e.preventDefault();
          onChange(max);
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (hoverValue !== null) {
            onChange(hoverValue);
          } else if (value === 0) {
            onChange(1);
          }
          break;
        default:
          break;
      }
    };

    return (
      <div
        ref={ref}
        id={id}
        role="slider"
        tabIndex={isInteractive ? 0 : -1}
        aria-label={ariaLabel}
        aria-valuenow={value}
        aria-valuemin={1}
        aria-valuemax={max}
        aria-valuetext={`${value} de ${max} estrellas`}
        aria-disabled={disabled || undefined}
        aria-readonly={readOnly || undefined}
        onKeyDown={handleKeyDown}
        onMouseLeave={() => isInteractive && setHoverValue(null)}
        className={cn(
          'inline-flex items-center gap-1 select-none outline-none transition-all',
          isInteractive &&
            'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md',
          disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
          readOnly && 'cursor-default',
          className
        )}
      >
        {name && (
          <input
            type="hidden"
            name={name}
            value={value}
            disabled={disabled}
          />
        )}
        {Array.from({ length: max }, (_, index) => {
          const starNumber = index + 1;
          const isFilled = starNumber <= activeValue;

          return (
            <button
              key={starNumber}
              type="button"
              tabIndex={-1}
              disabled={!isInteractive}
              aria-label={`${starNumber} ${starNumber === 1 ? 'estrella' : 'estrellas'}`}
              onMouseEnter={() => isInteractive && setHoverValue(starNumber)}
              onClick={() => handleSelect(starNumber)}
              className={cn(
                'inline-flex items-center justify-center rounded-sm transition-transform duration-150',
                BUTTON_PADDING[size],
                isInteractive && 'hover:scale-115 active:scale-95 cursor-pointer',
                !isInteractive && 'cursor-default'
              )}
            >
              <Star
                className={cn(
                  STAR_SIZES[size],
                  'transition-colors duration-150 stroke-[1.5]',
                  isFilled
                    ? 'text-accent-gold fill-accent-gold drop-shadow-xs'
                    : 'text-foreground-muted/30 fill-transparent hover:text-accent-gold/50'
                )}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>
    );
  }
);

RatingStars.displayName = 'RatingStars';
