import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../lib/cn"

export const textareaVariants = cva(
  "flex w-full field-sizing-content rounded-md border border-border/90 bg-surface/90 text-foreground transition-all outline-none shadow-inner placeholder:text-foreground-muted hover:border-foreground-muted/50 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-surface-muted/60 disabled:border-border/60 aria-invalid:border-destructive aria-invalid:border-danger aria-invalid:ring-2 aria-invalid:ring-destructive/30 aria-invalid:ring-danger/30 md:text-sm",
  {
    variants: {
      density: {
        comfortable: "min-h-24 p-3 text-sm leading-relaxed",
        compact: "min-h-16 p-2 text-xs md:text-sm leading-normal",
      },
    },
    defaultVariants: {
      density: "comfortable",
    },
  }
)

export interface TextareaProps
  extends React.ComponentProps<"textarea">,
    VariantProps<typeof textareaVariants> {
  hasError?: boolean
}

function Textarea({
  className,
  density = "comfortable",
  hasError = false,
  "aria-invalid": ariaInvalid,
  ...props
}: TextareaProps) {
  const isInvalid = ariaInvalid === true || ariaInvalid === "true" || hasError

  return (
    <textarea
      data-slot="textarea"
      data-density={density}
      aria-invalid={isInvalid ? "true" : undefined}
      className={cn(textareaVariants({ density }), className)}
      {...props}
    />
  )
}

export { Textarea }
