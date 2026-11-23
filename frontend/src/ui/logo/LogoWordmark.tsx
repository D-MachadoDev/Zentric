import type { HTMLAttributes } from 'react';
import { cn } from '../lib/cn';

/**
 * LogoWordmark: marca oficial tipográfica "zentric.", en minúsculas
 * con punto final en acento vibrante teal.
 */
export function LogoWordmark({ className, ...props }: LogoWordmarkProps) {
  return (
    <span
      className={cn('font-bold tracking-tight text-foreground select-none inline-flex items-baseline', className)}
      data-testid="logo-wordmark"
      {...props}
    >
      <span>zentric</span>
      <span className="text-teal-600 dark:text-teal-400 font-extrabold" aria-hidden="true">.</span>
    </span>
  );
}

export type LogoWordmarkProps = HTMLAttributes<HTMLSpanElement>;
