import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../lib/cn"

export const inputVariants = cva(
  "w-full min-w-0 rounded-md border border-border/90 bg-surface/90 text-foreground transition-colors duration-200 outline-none shadow-xs file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-foreground-muted hover:border-foreground-muted/50 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-surface-muted/60 disabled:border-border/60 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/30 md:text-sm",
  {
    variants: {
      density: {
        comfortable: "h-11 px-3.5 py-2 text-sm",
        compact: "h-[34px] px-2.5 py-1 text-xs md:text-sm",
      },
      pill: {
        true: "rounded-full px-5",
        false: "rounded-md",
      },
    },
    defaultVariants: {
      density: "comfortable",
      pill: false,
    },
  }
)

export interface InputProps
  extends Omit<React.ComponentProps<"input">, "size">,
    VariantProps<typeof inputVariants> {
  hasError?: boolean
  pill?: boolean
}

function Input({
  className,
  type,
  density = "comfortable",
  pill = false,
  hasError = false,
  "aria-invalid": ariaInvalid,
  ...props
}: InputProps) {
  const isInvalid = ariaInvalid === true || ariaInvalid === "true" || hasError

  return (
    <input
      type={type}
      data-slot="input"
      data-density={density}
      data-pill={pill ? "true" : undefined}
      aria-invalid={isInvalid ? "true" : undefined}
      className={cn(inputVariants({ density, pill }), className)}
      {...props}
    />
  )
}

export { Input }
