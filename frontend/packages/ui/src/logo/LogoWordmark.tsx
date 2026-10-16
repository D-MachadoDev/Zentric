import type { HTMLAttributes } from 'react';
import { cn } from '../lib/cn';

/**
 * LogoWordmark: sólo la marca tipográfica "Zentric", sin símbolo.
 *
 * Es texto HTML y no SVG para que la fuente venga del bundle (@fontsource,
 * sin CDN remota) y para que el lector de pantalla lo pronuncie.
 */
export function LogoWordmark({ className, ...props }: LogoWordmarkProps) {
  return (
    <span
      className={cn('font-semibold tracking-[-0.02em] text-foreground', className)}
      data-testid="logo-wordmark"
      {...props}
    >
      Zentric
    </span>
  );
}

export type LogoWordmarkProps = HTMLAttributes<HTMLSpanElement>;
