import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../lib/cn"
import { Slot } from "radix-ui"

const badgeVariants = cva(
  "group/badge inline-flex h-5.5 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full border border-transparent px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap shadow-xs transition-all focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground font-semibold [a]:hover:brightness-105",
        secondary:
          "border-border/80 bg-surface-muted text-foreground/90 [a]:hover:bg-surface-muted/80",
        neutral:
          "border-border/80 bg-surface-muted text-foreground/90 [a]:hover:bg-surface-muted/80",
        destructive:
          "border-destructive/30 bg-destructive/15 text-destructive focus-visible:ring-destructive/20 [a]:hover:bg-destructive/25",
        danger:
          "border-destructive/30 bg-destructive/15 text-destructive focus-visible:ring-destructive/20 [a]:hover:bg-destructive/25",
        warning:
          "border-warning/30 bg-warning/15 text-warning [a]:hover:bg-warning/25",
        success:
          "border-success/30 bg-success/15 text-success [a]:hover:bg-success/25",
        info: "border-info/30 bg-info/15 text-info [a]:hover:bg-info/25",
        outline:
          "border-border/80 bg-surface/80 text-foreground [a]:hover:bg-surface-muted",
        ghost:
          "hover:bg-surface-muted hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {
  asChild?: boolean
}

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: BadgeProps) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
