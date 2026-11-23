import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../lib/cn';
import { LogoMark, type BrandRole, normalizeRole } from './LogoMark';
import { LogoWordmark } from './LogoWordmark';

/**
 * Logo oficial Zentric: marca puramente tipográfica "zentric." con acento en el punto,
 * sin el isotipo PNG en la cabecera. Soporta showMark opcional para retrocompatibilidad.
 */
export const Logo = forwardRef<HTMLSpanElement, LogoProps>(function Logo(
  { className, showTagline = false, showMark = false, role, ...props },
  ref,
) {
  const normalizedRole = role ? normalizeRole(role) : undefined;
  return (
    <span
      ref={ref}
      data-role={normalizedRole && normalizedRole !== 'buyer' ? normalizedRole : undefined}
      className={cn('inline-flex items-center text-foreground', className)}
      data-testid="logo"
      {...props}
    >
      {showMark ? <LogoMark role={role} className="size-7 shrink-0 mr-2" /> : null}
      <span className="flex flex-col leading-none">
        <LogoWordmark className="text-2xl sm:text-[1.75rem]" />
        {showTagline ? (
          <span className="mt-1 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-foreground/55">
            Sistema Operativo para Comercio
          </span>
        ) : null}
      </span>
    </span>
  );
});

export interface LogoProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'role'> {
  /** Muestra el tagline debajo del nombre de marca. */
  showTagline?: boolean;
  /** Muestra el isotipo PNG opcional para contextos operativos legacy. Por defecto false. */
  showMark?: boolean;
  /** Selecciona la variante de imagen y el acento visual del rol. */
  role?: BrandRole | string;
}
