import type { Meta, StoryObj } from '@storybook/react';
import { StatusBadge } from './status-badge';

/**
 * Catalogo del componente shadcn `StatusBadge` (Frontend-Design-System 3).
 *
 * El tono se elige con `tone`, nunca con el texto, y el rotulo siempre
 * acompana al punto cromatico (WCAG AA, 5).
 */
const meta = {
  title: 'Design System/Components/StatusBadge',
  component: StatusBadge,
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
    tone: { control: 'select', options: ['neutral', 'info', 'warning', 'success', 'danger'] },
  },
} satisfies Meta<typeof StatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Tono neutro por defecto. */
export const Default: Story = {
  args: { tone: 'neutral', children: 'Sin asignar' },
};

/** Todos los tonos con el rotulo canonico del dominio. */
export const AllTones: Story = {
  args: { children: 'Etiqueta' },
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <StatusBadge tone="neutral">Borrador</StatusBadge>
      <StatusBadge tone="info">En transito</StatusBadge>
      <StatusBadge tone="warning">Pendiente de pago</StatusBadge>
      <StatusBadge tone="success">Confirmado</StatusBadge>
      <StatusBadge tone="danger">Cancelado</StatusBadge>
    </div>
  ),
};

/** Estados de un despacho logistico. */
export const FulfillmentStates: Story = {
  args: { children: 'Etiqueta' },
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <StatusBadge tone="warning">Pendiente de empaque</StatusBadge>
      <StatusBadge tone="info">Empacado</StatusBadge>
      <StatusBadge tone="info">Despachado</StatusBadge>
      <StatusBadge tone="success">Entregado</StatusBadge>
      <StatusBadge tone="danger">Cancelado por quiebre</StatusBadge>
    </div>
  ),
};
