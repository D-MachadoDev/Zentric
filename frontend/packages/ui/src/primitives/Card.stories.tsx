import type { Meta, StoryObj } from '@storybook/react';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './Card';
import { MoreHorizontal } from 'lucide-react';

/**
 * Catalogo de la primitiva `Card` (Frontend-Design-System 5.2).
 *
 * Contenedor estructural con borde de 1px. La composicion en slot
 * (`card-header`, `card-content`, `card-footer`) define la retícula interna.
 */
const meta = {
  title: 'Design System/Primitives/Card',
  component: Card,
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
  argTypes: {
    size: { control: 'select', options: ['default', 'sm'] },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Tarjeta completa: cabecera, contenido y pie. */
export const Default: Story = {
  args: {},
  render: () => (
    <Card className="w-[22rem]">
      <CardHeader>
        <CardTitle>Notebook profesional 14"</CardTitle>
        <CardDescription>
          SKU NT-14-PRO-16 · Bodega Norte · 12 unidades disponibles
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-foreground-muted">
          Procesador de 16 nucleos, 32 GB de memoria y SSD de 1 TB. Facturacion electronica
          con IVA incluido.
        </p>
      </CardContent>
      <CardFooter className="justify-between border-t">
        <span className="font-mono text-sm tabular-nums">$4.850.000</span>
        <span className="text-xs text-foreground-muted">COP</span>
      </CardFooter>
    </Card>
  ),
};

/** Variante compacta: menos padding, misma retícula semantica. */
export const Small: Story = {
  args: {},
  render: () => (
    <Card size="sm" className="w-[22rem]">
      <CardHeader>
        <CardTitle>Pedido #A1B2C3D4</CardTitle>
        <CardDescription>Despachado desde Bodega Sur</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="font-mono text-xs tabular-nums text-foreground-muted">
          Guia ZEN-2024-004182 · 3 articulos
        </p>
      </CardContent>
    </Card>
  ),
};

/** Cabecera con accion secundaria a la derecha (slot `card-action`). */
export const WithHeaderAction: Story = {
  args: {},
  render: () => (
    <Card className="w-[22rem]">
      <CardHeader>
        <CardTitle>Inventario por bodega</CardTitle>
        <CardDescription>Corte del dia a las 06:00</CardDescription>
        <CardAction>
          <button
            type="button"
            aria-label="Mas opciones de inventario"
            className="rounded-md p-1.5 text-foreground-muted hover:bg-surface-muted hover:text-foreground"
          >
            <MoreHorizontal className="size-4" />
          </button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-foreground-muted">
          4.820 unidades disponibles en 3 bodegas verificadas.
        </p>
      </CardContent>
    </Card>
  ),
};
