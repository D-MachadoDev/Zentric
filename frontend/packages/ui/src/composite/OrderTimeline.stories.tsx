import type { Meta, StoryObj } from '@storybook/react';
import { OrderTimeline } from './OrderTimeline';

/**
 * Catalogo del compuesto `OrderTimeline` (Frontend-Design-System 5.3).
 *
 * Representa las transiciones auditadas del ciclo de vida de un pedido:
 * Creado -> Pagado -> Despachado -> Entregado, mas cancelaciones.
 */
const meta = {
  title: 'Design System/Composite/OrderTimeline',
  component: OrderTimeline,
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
    orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
    currentStatus: { control: 'text' },
  },
} satisfies Meta<typeof OrderTimeline>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Pedido en despacho: los pasos se derivan del estado canonico. */
export const Default: Story = {
  args: { currentStatus: 'Dispatched' },
};

/** Pedido pagado, a punto de salir de bodega. */
export const Paid: Story = {
  args: { currentStatus: 'Paid' },
};

/** Pedido entregado: la linea de tiempo se cierra completa. */
export const Delivered: Story = {
  args: { currentStatus: 'Delivered' },
};

/** Pedido cancelado: el estado terminal se marca explicitamente. */
export const Cancelled: Story = {
  args: { currentStatus: 'Cancelled' },
};

/** Pasos explicitos con marca de tiempo y descripcion operatoria. */
export const ExplicitSteps: Story = {
  args: {
    orientation: 'horizontal',
    steps: [
      {
        id: 'created',
        label: 'Creado',
        description: 'Reserva atomica de 15 minutos',
        timestamp: '2024-05-02 09:14',
        status: 'completed',
      },
      {
        id: 'paid',
        label: 'Pagado',
        description: 'Pago confirmado por pasarela',
        timestamp: '2024-05-02 09:21',
        status: 'completed',
      },
      {
        id: 'dispatched',
        label: 'Despachado',
        description: 'Guia ZEN-2024-004182',
        timestamp: '2024-05-02 14:40',
        status: 'current',
      },
      { id: 'delivered', label: 'Entregado', description: 'Pendiente', status: 'upcoming' },
    ],
  },
};

/** Orientacion vertical: la variante de panel lateral y movil. */
export const Vertical: Story = {
  args: {
    orientation: 'vertical',
    steps: [
      { id: 'created', label: 'Creado', status: 'completed' },
      { id: 'paid', label: 'Pagado', status: 'completed' },
      { id: 'dispatched', label: 'Despachado', status: 'current' },
      { id: 'delivered', label: 'Entregado', status: 'upcoming' },
    ],
  },
};
