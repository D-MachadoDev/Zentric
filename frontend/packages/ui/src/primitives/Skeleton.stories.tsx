import type { Meta, StoryObj } from '@storybook/react';
import { Skeleton } from './Skeleton';

/**
 * Catalogo de la primitiva `Skeleton` (Frontend-Design-System 5.2).
 *
 * Bloque de carga que respeta las dimensiones exactas de la fila o tarjeta
 * final, con `role="status"` y `aria-live="polite"`.
 */
const meta = {
  title: 'Design System/Primitives/Skeleton',
  component: Skeleton,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#0C0F16' },
        { name: 'light', value: '#F5F6F8' },
      ],
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Bloque base de una linea de texto. */
export const Default: Story = {
  args: { className: 'h-4 w-48' },
};

/** Esqueleto de tarjeta de producto: replica la retícula del catalogo. */
export const ProductCard: Story = {
  args: {},
  render: () => (
    <div className="flex w-[18rem] flex-col gap-3 rounded-xl border border-border/70 bg-surface p-4">
      <Skeleton className="h-32 w-full rounded-lg bg-surface-muted" />
      <Skeleton className="h-4 w-3/4 bg-surface-muted" />
      <Skeleton className="h-3 w-1/2 bg-surface-muted/70" />
      <Skeleton className="h-5 w-24 bg-surface-muted/60" />
    </div>
  ),
};

/** Esqueleto de fila tabular: la altura replica la fila final (40 px). */
export const TableRow: Story = {
  args: {},
  render: () => (
    <div className="flex w-[32rem] flex-col gap-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex items-center gap-4">
          <Skeleton className="h-4 w-40 bg-surface-muted" />
          <Skeleton className="h-4 w-24 bg-surface-muted" />
          <Skeleton className="h-4 flex-1 bg-surface-muted/70" />
        </div>
      ))}
    </div>
  ),
};

/** Esqueleto de KPI: replica el tamano de la cifra de `StatCard` (hero). */
export const StatCard: Story = {
  args: {},
  render: () => (
    <div className="flex w-[18rem] flex-col gap-3 rounded-xl border border-border/70 bg-surface p-5">
      <Skeleton className="h-3 w-24 bg-surface-muted" />
      <Skeleton className="h-9 w-32 bg-surface-muted" />
      <Skeleton className="h-2 w-full rounded-full bg-surface-muted/60" />
    </div>
  ),
};
