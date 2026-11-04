import * as React from "react"
import { cn } from "../lib/cn"
import { Label as LabelPrimitive } from "radix-ui"

export interface LabelProps
  extends React.ComponentProps<typeof LabelPrimitive.Root> {
  required?: boolean
  optional?: boolean
  optionalText?: string
}

function Label({
  className,
  children,
  required = false,
  optional = false,
  optionalText = "(Opcional)",
  ...props
}: LabelProps) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-1.5 text-sm leading-none font-medium text-foreground select-none cursor-pointer group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
      {required && (
        <span
          data-slot="label-required"
          className="text-danger font-bold ml-0.5"
          aria-hidden="true"
        >
          *
        </span>
      )}
      {optional && (
        <span
          data-slot="label-optional"
          className="text-caption font-normal text-foreground-muted ml-1"
          aria-hidden="true"
        >
          {optionalText}
        </span>
      )}
    </LabelPrimitive.Root>
  )
}

export { Label }
