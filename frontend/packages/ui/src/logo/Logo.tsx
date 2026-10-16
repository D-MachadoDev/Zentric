import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../lib/cn';
import { LogoMark } from './LogoMark';
import { LogoWordmark } from './LogoWordmark';

/**
 * Logo completo: símbolo + marca tipográfica, con tagline opcional.
 *
 * El símbolo es decorativo aquí porque el wordmark ya nombra a la marca; por
 * eso no recibe `title` y el <svg> sale con aria-hidden.
 */
export const Logo = forwardRef<HTMLSpanElement, LogoProps>(function Logo(
  { className, showTagline = false, ...props },
  ref,
) {
  return (
    <span
      ref={ref}
      className={cn('inline-flex items-center gap-2 text-brand', className)}
      data-testid="logo"
      {...props}
    >
      <LogoMark className="size-8 shrink-0" />
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

export interface LogoProps extends HTMLAttributes<HTMLSpanElement> {
  /** Muestra el tagline de Q1 debajo del wordmark. */
  showTagline?: boolean;
}
