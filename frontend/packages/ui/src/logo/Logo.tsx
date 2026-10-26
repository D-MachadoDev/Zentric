import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../lib/cn';
import { LogoMark, type BrandRole, normalizeRole } from './LogoMark';
import { LogoWordmark } from './LogoWordmark';

/**
 * Logo completo: imagen del isotipo (`/brandkit/logo/zentric-icon-{role}.png`) +
 * marca tipográfica, con tagline y rol opcional.
 */
export const Logo = forwardRef<HTMLSpanElement, LogoProps>(function Logo(
  { className, showTagline = false, role, ...props },
  ref,
) {
  const normalizedRole = role ? normalizeRole(role) : undefined;
  return (
    <span
      ref={ref}
      data-role={normalizedRole && normalizedRole !== 'buyer' ? normalizedRole : undefined}
      className={cn('inline-flex items-center gap-2 text-brand', className)}
      data-testid="logo"
      {...props}
    >
      <LogoMark role={role} className="size-8 shrink-0" />
      <span className="flex flex-col leading-none">
        <LogoWordmark className="text-xl" />
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
  /** Muestra el tagline debajo del wordmark. */
  showTagline?: boolean;
  /** Rol opcional para seleccionar la imagen `/brandkit/logo/zentric-icon-{role}.png` y el color `--brand`. */
  role?: BrandRole | string;
}
