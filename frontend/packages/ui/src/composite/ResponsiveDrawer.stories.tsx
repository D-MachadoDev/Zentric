import type { Meta, StoryObj } from '@storybook/react';
import { ResponsiveDrawer } from './ResponsiveDrawer';
import { Button } from '../primitives/Button';
import { StatusBadge } from './StatusBadge';

/**
 * Catalogo del compuesto `ResponsiveDrawer` (Frontend-Design-System 5.3).
 *
 * Panel lateral de inspeccion rapida: 35% del ancho en escritorio, pantalla
 * completa en movil, con la curva `--ease-out-expo` y cierre por `Escape`.
 */
const meta = {
  title: 'Design System/Composite/ResponsiveDrawer',
  component: ResponsiveDrawer,
  parameters: {
    layout: 'fullscreen',
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
    side: { control: 'inline-radio', options: ['right', 'left'] },
    widthClassName: { control: 'text' },
  },
} satisfies Meta<typeof ResponsiveDrawer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Panel derecho abierto: zona secundaria del Split-Frame. */
export const Default: Story = {
  args: {
    open: true,
    title: 'Pedido #A1B2C3D4',
    description: 'Tres articulos de dos vendedores, en despacho desde Bodega Sur.',
    children: (
      <div className="flex flex-col gap-4">
        <StatusBadge tone="info">Despachado</StatusBadge>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <dt className="text-foreground-muted">Guia</dt>
          <dd className="font-mono tabular-nums">ZEN-2024-004182</dd>
          <dt className="text-foreground-muted">Bodega</dt>
          <dd className="font-mono">Bodega Sur</dd>
          <dt className="text-foreground-muted">Total</dt>
          <dd className="font-mono tabular-nums">$2.180.000 COP</dd>
        </dl>
      </div>
    ),
  },
};

/** Panel izquierdo: variante para el shell de Logistics. */
export const LeftSide: Story = {
  args: {
    open: true,
    side: 'left',
    title: 'Cola de empaque',
    description: 'Once despachos pendientes de empacar en la turno de manana.',
    children: <p className="text-sm text-foreground-muted">Contenido del panel lateral.</p>,
  },
};

/** Panel con pie de acciones. */
export const WithFooter: Story = {
  args: {
    open: true,
    title: 'Inspeccion de devolucion',
    description: 'Dictamen tecnico del Operador logistico (ADR-0018).',
    children: (
      <p className="text-sm text-foreground-muted">
        Revise el estado fisico del articulo y registre el dictamen antes de cerrar.
      </p>
    ),
    footer: (
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm">
          Rechazar
        </Button>
        <Button size="sm">Aprobar devolucion</Button>
      </div>
    ),
  },
};

/** Panel disparado por un control dentro de una tabla. */
export const WithTrigger: Story = {
  args: { title: 'Panel', children: 'Contenido del panel' },
  render: () => (
    <ResponsiveDrawer
      title="Detalle del vendedor"
      description="Datos fiscales y estado de la cuenta del vendedor."
      trigger={<Button variant="outline">Ver vendedor</Button>}
    >
      <p className="text-sm text-foreground-muted">
        El panel se abre sobre la zona secundaria sin perder el contexto de la lista.
      </p>
    </ResponsiveDrawer>
  ),
};
