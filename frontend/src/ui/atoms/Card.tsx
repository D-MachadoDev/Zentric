import * as React from "react"
import { cn } from "../lib/cn"

export interface CardProps extends React.ComponentProps<"div"> {
  size?: "default" | "sm"
  /**
   * Surface tint variant inspired by Wonder Theme Interior:
   * - default: Crisp gallery canvas/surface (#FFFFFF / #1A1917)
   * - muted: Warm Ecru / Linen Sand teaser (#F4EEDA / #26231F)
   * - secondary: Putty Sand (#F0EEEB / #171614)
   * @default "default"
   */
  surface?: "default" | "muted" | "secondary"
}

const surfaceClasses: Record<"default" | "muted" | "secondary", string> = {
  default: "bg-surface",
  muted: "bg-surface-muted",
  secondary: "bg-surface-secondary",
}

function Card({
  className,
  size = "default",
  surface = "default",
  ...props
}: CardProps) {
  return (
    <div
      data-slot="card"
      data-size={size}
      data-surface={surface}
      className={cn(
        "group/card relative flex flex-col gap-(--card-spacing) overflow-hidden rounded-none border border-border/80 py-(--card-spacing) text-sm text-foreground shadow-xs [--card-spacing:--spacing(6)] has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(4)] *:[img:first-child]:rounded-none *:[img:last-child]:rounded-none",
        surfaceClasses[surface],
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-none px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-heading text-base leading-normal font-semibold text-foreground group-data-[size=sm]/card:text-sm",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("flex flex-col gap-3 px-(--card-spacing)", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-none px-(--card-spacing) [.border-t]:pt-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}

