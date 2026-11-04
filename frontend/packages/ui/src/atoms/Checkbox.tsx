import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"
import { CheckIcon, MinusIcon } from "lucide-react"
import { cn } from "../lib/cn"

export interface CheckboxProps
  extends React.ComponentProps<typeof CheckboxPrimitive.Root> {
  hasError?: boolean
}

function Checkbox({
  className,
  hasError = false,
  "aria-invalid": ariaInvalid,
  ...props
}: CheckboxProps) {
  const isInvalid = ariaInvalid === true || ariaInvalid === "true" || hasError

  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      aria-invalid={isInvalid ? "true" : undefined}
      className={cn(
        "group/checkbox peer relative flex size-4 shrink-0 items-center justify-center rounded-xs border border-border bg-surface text-foreground shadow-xs transition-all outline-none hover:border-foreground-muted/60 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-surface-muted/60 disabled:border-border/60 aria-invalid:border-destructive aria-invalid:border-danger aria-invalid:ring-2 aria-invalid:ring-destructive/30 aria-invalid:ring-danger/30 data-[state=checked]:bg-brand data-[state=checked]:border-brand data-[state=checked]:text-primary-foreground data-[state=indeterminate]:bg-brand data-[state=indeterminate]:border-brand data-[state=indeterminate]:text-primary-foreground data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none [&>svg]:size-3.5"
      >
        <CheckIcon
          data-slot="checkbox-check-icon"
          className="block group-data-[state=indeterminate]/checkbox:hidden size-3.5 stroke-[2.5]"
        />
        <MinusIcon
          data-slot="checkbox-minus-icon"
          className="hidden group-data-[state=indeterminate]/checkbox:block size-3.5 stroke-[2.5]"
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
