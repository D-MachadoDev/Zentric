import * as React from "react"
import { cn } from "../lib/cn"

export type TableDensity = "comfortable" | "compact"

export const TableDensityContext = React.createContext<TableDensity>("comfortable")

export interface TableProps extends React.ComponentProps<"table"> {
  density?: TableDensity
}

function Table({
  className,
  density = "comfortable",
  children,
  ...props
}: TableProps) {
  return (
    <TableDensityContext.Provider value={density}>
      <div
        data-slot="table-container"
        className="relative w-full overflow-x-auto"
      >
        <table
          data-slot="table"
          data-density={density}
          className={cn("w-full caption-bottom text-sm", className)}
          {...props}
        >
          {children}
        </table>
      </div>
    </TableDensityContext.Provider>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b [&_tr]:border-border bg-surface-muted/60", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0 divide-y divide-border-subtle", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t border-border bg-surface-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b border-border-subtle transition-colors hover:bg-surface-muted/40 has-aria-expanded:bg-surface-muted/50 data-[state=selected]:bg-surface-muted/60",
        className
      )}
      {...props}
    />
  )
}

export interface TableHeadProps extends React.ComponentProps<"th"> {
  density?: TableDensity
}

function TableHead({
  className,
  density: propDensity,
  scope = "col",
  ...props
}: TableHeadProps) {
  const contextDensity = React.useContext(TableDensityContext)
  const density = propDensity ?? contextDensity

  return (
    <th
      data-slot="table-head"
      data-density={density}
      scope={scope}
      className={cn(
        "text-left align-middle text-caption font-semibold uppercase tracking-wider text-foreground-muted whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        density === "compact" ? "h-8 px-3 py-1.5" : "h-10 px-4 py-2.5",
        className
      )}
      {...props}
    />
  )
}

export interface TableCellProps extends React.ComponentProps<"td"> {
  density?: TableDensity
  numeric?: boolean
}

function TableCell({
  className,
  density: propDensity,
  numeric = false,
  ...props
}: TableCellProps) {
  const contextDensity = React.useContext(TableDensityContext)
  const density = propDensity ?? contextDensity

  return (
    <td
      data-slot="table-cell"
      data-density={density}
      className={cn(
        "align-middle whitespace-nowrap text-sm text-foreground [&:has([role=checkbox])]:pr-0",
        density === "compact" ? "px-3 py-1.5" : "px-4 py-2.5",
        numeric && "text-right tabular-nums font-mono",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-caption text-foreground-subtle", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
