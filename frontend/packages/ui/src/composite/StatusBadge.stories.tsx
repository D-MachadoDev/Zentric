import type { Meta, StoryObj } from '@storybook/react';
import { StatusBadge } from './StatusBadge';

/**
 * Catalogo del compuesto `StatusBadge` (Frontend-Design-System 5.3).
 *
 * Insignia de estado del dominio: punto cromatico + rotulo textual en
 * espanol. El color nunca actua como unico portador de significado (5).
 */
const meta = {
  title: 'Design System/Composite/StatusBadge',
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
    tone: {
      control: 'select',
      options: ['neutral', 'info', 'warning', 'success', 'danger'],
    },
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

/** Tonos de estado de pedido tal como los rotula la Ley. */
export const OrderStates: Story = {
  args: { children: 'Etiqueta' },
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <StatusBadge tone="warning">Pendiente de pago</StatusBadge>
      <StatusBadge tone="info">Pagado</StatusBadge>
      <StatusBadge tone="info">Despachado</StatusBadge>
      <StatusBadge tone="success">Entregado</StatusBadge>
      <StatusBadge tone="danger">Cancelado</StatusBadge>
    </div>
  ),
};

/** Tonos de estado de devolucion (ADR-0018). */
export const ReturnStates: Story = {
  args: { children: 'Etiqueta' },
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <StatusBadge tone="info">Solicitada</StatusBadge>
      <StatusBadge tone="warning">Aprobada</StatusBadge>
      <StatusBadge tone="danger">Rechazada</StatusBadge>
      <StatusBadge tone="success">Reembolsada</StatusBadge>
    </div>
  ),
};
