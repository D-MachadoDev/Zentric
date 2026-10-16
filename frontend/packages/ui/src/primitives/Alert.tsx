import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../lib/cn"

const alertVariants = cva(
  "group/alert relative grid w-full gap-0.5 rounded-xl border px-4 py-3.5 text-left text-sm shadow-sm has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-3 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4.5",
  {
    variants: {
      variant: {
        default: "border-border/80 bg-surface/90 text-foreground",
        destructive:
          "border-destructive/40 bg-destructive/10 text-destructive *:data-[slot=alert-description]:text-destructive/90 *:[svg]:text-current",
        danger:
          "border-destructive/40 bg-destructive/10 text-destructive *:data-[slot=alert-description]:text-destructive/90 *:[svg]:text-current",
        warning:
          "border-warning/40 bg-warning/10 text-warning *:data-[slot=alert-description]:text-warning/90",
        info: "border-info/40 bg-info/10 text-info *:data-[slot=alert-description]:text-info/90",
        success:
          "border-success/40 bg-success/10 text-success *:data-[slot=alert-description]:text-success/90",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface AlertProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof alertVariants> {}

function Alert({
  className,
  variant,
  ...props
}: AlertProps) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "font-semibold text-foreground group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-sm text-balance text-muted-foreground md:text-pretty [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4",
        className
      )}
      {...props}
    />
  )
}

function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-action"
      className={cn("absolute top-2.5 right-3", className)}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription, AlertAction, alertVariants }
