import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../lib/cn"

export const skeletonVariants = cva(
  "animate-pulse bg-surface-muted",
  {
    variants: {
      radius: {
        none: "rounded-none",
        xs: "rounded-xs",
        sm: "rounded-sm",
        md: "rounded-md",
        lg: "rounded-lg",
        xl: "rounded-xl",
        full: "rounded-full",
      },
    },
    defaultVariants: {
      radius: "md",
    },
  }
)

export interface SkeletonProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof skeletonVariants> {
  srText?: string
}

function Skeleton({
  className,
  radius = "md",
  srText = "Cargando contenido...",
  children,
  ...props
}: SkeletonProps) {
  return (
    <div
      data-slot="skeleton"
      data-radius={radius}
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`${cn(skeletonVariants({ radius }), className)} bg-muted`}
      {...props}
    >
      {children}
      <span className="sr-only">{srText}</span>
    </div>
  )
}

export { Skeleton }
