import * as React from "react"
import { cn } from "../lib/cn"

export type SkeletonProps = React.ComponentProps<"div">

function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      data-slot="skeleton"
      role="status"
      aria-live="polite"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
