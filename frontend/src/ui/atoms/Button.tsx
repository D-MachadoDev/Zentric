import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import { cn } from '../lib/cn';
import { Spinner, type SpinnerSize } from './Spinner';

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:not-aria-[haspopup]:translate-y-px active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed aria-invalid:border-destructive aria-invalid:border-danger aria-invalid:ring-2 aria-invalid:ring-destructive/30 aria-invalid:ring-danger/30 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground font-semibold shadow-xs hover:bg-brand-strong hover:brightness-105 active:scale-[0.98]",
        default:
          "bg-primary text-primary-foreground font-semibold shadow-xs hover:bg-brand-strong hover:brightness-105 active:scale-[0.98]",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-surface-muted/90 active:scale-[0.98]",
        outline:
          "border border-border/80 bg-surface text-foreground shadow-xs hover:bg-surface-muted hover:border-border hover:text-foreground active:scale-[0.98]",
        ghost:
          "hover:bg-surface-muted hover:text-foreground active:scale-[0.98]",
        danger:
          "bg-destructive/15 text-destructive border border-destructive/30 shadow-xs hover:bg-destructive/25 active:scale-[0.98]",
        destructive:
          "bg-destructive/15 text-destructive border border-destructive/30 shadow-xs hover:bg-destructive/25 active:scale-[0.98]",
        subtle:
          "bg-brand/10 text-brand border border-brand/20 shadow-xs hover:bg-brand/20 active:scale-[0.98]",
        link:
          "text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 gap-1.5 px-3 text-xs in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        md: "h-10 gap-2 px-4 text-sm in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        lg: "h-11 gap-2.5 px-5 text-base has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-10",
        // Backward-compatibility aliases
        default: "h-9 gap-1.5 px-3 text-sm in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-xs px-2 text-xs in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        "icon-xs": "size-6 rounded-xs in-data-[slot=button-group]:rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 in-data-[slot=button-group]:rounded-md",
        "icon-lg": "size-11",
      },
      density: {
        comfortable: "",
        compact: "",
      },
    },
    compoundVariants: [
      // Compact density overrides
      { density: "compact", size: "sm", className: "h-7 gap-1 px-2.5 text-2xs" },
      { density: "compact", size: "md", className: "h-8 gap-1.5 px-3 text-xs" },
      { density: "compact", size: "default", className: "h-8 gap-1.5 px-3 text-xs" },
      { density: "compact", size: "lg", className: "h-9 gap-2 px-3.5 text-sm" },
      { density: "compact", size: "icon", className: "size-8" },
      { density: "compact", size: "icon-sm", className: "size-7" },
      { density: "compact", size: "icon-lg", className: "size-9" },
    ],
    defaultVariants: {
      variant: "primary",
      size: "md",
      density: "comfortable",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /**
   * Delegates rendering to a child element (e.g. Radix Slot / Link).
   * @default false
   */
  asChild?: boolean;
  /**
   * Renders the button in a loading state with an accessible Spinner and sets aria-busy="true".
   * Automatically disables interaction.
   * @default false
   */
  isLoading?: boolean;
  /**
   * Renders the button in an error state with aria-invalid="true" and danger focus ring.
   * @default false
   */
  isError?: boolean;
  /**
   * Explicit flag indicating an empty placeholder state.
   * @default false
   */
  isEmpty?: boolean;
  /**
   * Visual density mode for comfortable consumer vs compact backoffice UI.
   * @default 'comfortable'
   */
  density?: 'comfortable' | 'compact';
}

function resolveSpinnerSize(size: ButtonProps['size']): SpinnerSize {
  if (size === 'sm' || size === 'xs' || size === 'icon-xs') {
    return 'sm';
  }
  return 'md';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      density = 'comfortable',
      asChild = false,
      isLoading = false,
      isError = false,
      isEmpty = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot.Root : 'button';
    const isDisabled = disabled || isLoading;
    const spinnerSize = resolveSpinnerSize(size);

    const isNonIconEmpty =
      isEmpty ||
      (!children &&
        size !== 'icon' &&
        size !== 'icon-xs' &&
        size !== 'icon-sm' &&
        size !== 'icon-lg');

    const stateAttribute = isLoading
      ? 'loading'
      : isError || props['aria-invalid']
      ? 'error'
      : isNonIconEmpty
      ? 'empty'
      : undefined;

    return (
      <Comp
        ref={ref}
        data-slot="button"
        data-variant={variant}
        data-size={size}
        data-density={density}
        data-state={stateAttribute}
        disabled={isDisabled}
        aria-busy={isLoading ? 'true' : undefined}
        aria-invalid={isError ? 'true' : props['aria-invalid']}
        className={cn(buttonVariants({ variant, size, density, className }))}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {isLoading && (
              <Spinner
                size={spinnerSize}
                variant="current"
                data-slot="button-spinner"
                aria-hidden="true"
              />
            )}
            {children}
          </>
        )}
      </Comp>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
