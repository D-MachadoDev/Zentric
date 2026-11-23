import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

const spinnerVariants = cva(
  'inline-block shrink-0 motion-safe:animate-spin select-none pointer-events-none',
  {
    variants: {
      size: {
        sm: 'size-3.5',       // 14px
        md: 'size-[18px]',    // 18px
        lg: 'size-6',         // 24px
      },
      variant: {
        current: 'text-current',
        brand: 'text-brand',
        muted: 'text-foreground-muted',
        white: 'text-white',
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'current',
    },
  }
);

export type SpinnerSize = 'sm' | 'md' | 'lg';
export type SpinnerVariant = 'current' | 'brand' | 'muted' | 'white';

export interface SpinnerProps
  extends React.SVGAttributes<SVGSVGElement>,
    VariantProps<typeof spinnerVariants> {
  /**
   * Sizing scale: sm (14px), md (18px), lg (24px).
   * @default 'md'
   */
  size?: SpinnerSize;
  /**
   * Color token: current (inherits text color), brand, muted, white.
   * @default 'current'
   */
  variant?: SpinnerVariant;
  /**
   * Accessible text label announced to screen readers.
   * @default 'Loading'
   */
  label?: string;
  /**
   * Additional Tailwind class names.
   */
  className?: string;
}

export const Spinner = React.forwardRef<SVGSVGElement, SpinnerProps>(
  (
    {
      size = 'md',
      variant = 'current',
      label = 'Loading',
      className,
      'aria-hidden': ariaHidden,
      ...props
    },
    ref
  ) => {
    const isAriaHidden = ariaHidden === true || ariaHidden === 'true';

    return (
      <svg
        ref={ref}
        data-slot="spinner"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role={isAriaHidden ? undefined : 'status'}
        aria-label={isAriaHidden ? undefined : label}
        aria-hidden={ariaHidden}
        className={cn(spinnerVariants({ size, variant }), className)}
        {...props}
      >
        {!isAriaHidden && <title>{label}</title>}
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3.5"
          className="opacity-25"
        />
        <path
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          fill="currentColor"
          className="opacity-75"
        />
      </svg>
    );
  }
);

Spinner.displayName = 'Spinner';
export { spinnerVariants };
