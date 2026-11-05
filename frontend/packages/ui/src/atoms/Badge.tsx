import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../lib/cn"
import { Slot } from "radix-ui"

export const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden border border-transparent font-medium whitespace-nowrap shadow-xs transition-all focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground font-semibold [a]:hover:brightness-105",
        brand:
          "border-brand/30 bg-brand/15 text-brand [a]:hover:bg-brand/25",
        success:
          "border-success/30 bg-success/15 text-success [a]:hover:bg-success/25",
        warning:
          "border-warning/30 bg-warning/15 text-warning [a]:hover:bg-warning/25",
        danger:
          "border-danger/30 bg-danger/15 text-danger focus-visible:ring-danger/20 [a]:hover:bg-danger/25",
        destructive:
          "border-destructive/30 bg-destructive/15 text-destructive focus-visible:ring-destructive/20 [a]:hover:bg-destructive/25",
        info:
          "border-info/30 bg-info/15 text-info [a]:hover:bg-info/25",
        secondary:
          "border-border/80 bg-surface-muted text-foreground/90 [a]:hover:bg-surface-muted/80",
        neutral:
          "border-border/80 bg-surface-muted text-foreground/90 [a]:hover:bg-surface-muted/80",
        outline:
          "border-border/80 bg-surface/80 text-foreground [a]:hover:bg-surface-muted",
        ghost:
          "hover:bg-surface-muted hover:text-foreground",
        link:
          "text-primary underline-offset-4 hover:underline",

        // Role-Specific Accents (Multi-Tenant Marketplace Governance)
        seller:
          "border-purple-500/30 bg-purple-500/15 text-purple-700 dark:border-purple-400/30 dark:bg-purple-400/15 dark:text-purple-300",
        admin:
          "border-indigo-500/30 bg-indigo-500/15 text-indigo-700 dark:border-indigo-400/30 dark:bg-indigo-400/15 dark:text-indigo-300",
        logistics:
          "border-cyan-500/30 bg-cyan-500/15 text-cyan-700 dark:border-cyan-400/30 dark:bg-cyan-400/15 dark:text-cyan-300",
        supervisor:
          "border-fuchsia-500/30 bg-fuchsia-500/15 text-fuchsia-700 dark:border-fuchsia-400/30 dark:bg-fuchsia-400/15 dark:text-fuchsia-300",
      },
      size: {
        caption: "h-5.5 px-2.5 py-0.5", // 11px font height profile (half-step padding)
        "2xs": "h-4.5 px-2 py-0.5",       // 10px font height profile
        xs: "h-6 px-3 py-1",               // 12px font height profile
      },
      shape: {
        pill: "rounded-full",
        tag: "rounded-sm", // 6px border radius from radii.sm
      },
    },
    defaultVariants: {
      variant: "default",
      size: "caption",
      shape: "pill",
    },
  }
)

export interface BadgeProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {
  asChild?: boolean
}

const fontClassesBySize: Record<string, string> = {
  caption: "text-caption",
  "2xs": "text-2xs",
  xs: "text-xs",
}

function Badge({
  className,
  variant = "default",
  size = "caption",
  shape = "pill",
  asChild = false,
  ...props
}: BadgeProps) {
  const Comp = asChild ? Slot.Root : "span"
  const fontClass = fontClassesBySize[size ?? "caption"] ?? "text-caption"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      data-size={size}
      data-shape={shape}
      className={`${cn(badgeVariants({ variant, size, shape }), className)} ${fontClass}`}
      {...props}
    />
  )
}

export { Badge }
