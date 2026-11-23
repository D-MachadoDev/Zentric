import * as React from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { Input, type InputProps } from '../atoms/Input';
import { cn } from '../lib/cn';

export interface PasswordInputProps extends Omit<InputProps, 'type'> {
  /** Label accesible dinámico para el toggle (personalizable si se requiere i18n) */
  showPasswordLabel?: string;
  hidePasswordLabel?: string;
  /** Mostrar icono de candado al inicio del input */
  showLeadingIcon?: boolean;
}

/**
 * Molécula accesible de campo de contraseña con alternancia táctil (WCAG 2.2 AA).
 * - Touch-target de botón toggle: mínimo 44x44px (Target Size 2.5.8 / 2.5.5).
 * - Iconos Eye / EyeOff de lucide-react.
 * - Atributos aria-label y aria-pressed dinámicos.
 * - Foco visible de alta resolución y micro-transición suave.
 */
export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      className,
      showPasswordLabel = 'Mostrar contraseña',
      hidePasswordLabel = 'Ocultar contraseña',
      showLeadingIcon = true,
      disabled,
      hasError,
      density = 'comfortable',
      ...props
    },
    ref
  ) => {
    const [isVisible, setIsVisible] = React.useState(false);

    const toggleVisibility = React.useCallback(() => {
      setIsVisible((prev) => !prev);
    }, []);

    const toggleAriaLabel = isVisible ? hidePasswordLabel : showPasswordLabel;

    return (
      <div className="relative flex items-center w-full">
        {showLeadingIcon && (
          <span
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-muted select-none flex items-center justify-center z-10"
            aria-hidden="true"
          >
            <Lock className="size-4 shrink-0" />
          </span>
        )}

        <Input
          ref={ref}
          type={isVisible ? 'text' : 'password'}
          disabled={disabled}
          hasError={hasError}
          density={density}
          className={cn(
            showLeadingIcon ? 'pl-10' : 'pl-3.5',
            'pr-12 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
            className
          )}
          {...props}
        />

        {/* 
          Botón Toggle Táctil Accesible (WCAG 2.2 AA Target Size >= 44x44px) 
          El contenedor absoluto de 44x44px garantiza el touch-target físico exacto 
          manteniendo el icono SVG perfectamente proporcionado (16px).
        */}
        <button
          type="button"
          onClick={toggleVisibility}
          disabled={disabled}
          aria-label={toggleAriaLabel}
          aria-pressed={isVisible}
          tabIndex={0}
          className={cn(
            'absolute right-1 top-1/2 -translate-y-1/2 z-10',
            'flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center',
            'rounded-md text-foreground-muted hover:text-foreground',
            'transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1',
            'disabled:pointer-events-none disabled:opacity-40 cursor-pointer'
          )}
        >
          {isVisible ? (
            <EyeOff className="size-4 transition-transform duration-150" aria-hidden="true" />
          ) : (
            <Eye className="size-4 transition-transform duration-150" aria-hidden="true" />
          )}
        </button>
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';
