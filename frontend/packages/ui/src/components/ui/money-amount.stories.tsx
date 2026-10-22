import type { Meta, StoryObj } from '@storybook/react';
import { MoneyAmount } from './money-amount';

/**
 * Catalogo del componente shadcn `MoneyAmount` (Frontend-Design-System 3).
 *
 * El servidor decide la moneda y el total; el componente solo formatea. La
 * cifra se compone en Geist Mono con `tabular-nums` (4.2).
 */
const meta = {
  title: 'Design System/Components/MoneyAmount',
  component: MoneyAmount,
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
    amount: { control: 'number' },
    currency: { control: 'text' },
  },
} satisfies Meta<typeof MoneyAmount>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Importe en pesos colombianos delivered por el backend. */
export const Default: Story = {
  args: { amount: 2_180_000, currency: 'COP' },
};

/** Escala de importes para verificar la alineacion de las cifras. */
export const AmountScale: Story = {
  args: { amount: 150000, currency: 'COP' },
  render: () => (
    <div className="flex flex-col items-end gap-3">
      <MoneyAmount amount={15_000} currency="COP" />
      <MoneyAmount amount={2_180_000} currency="COP" />
      <MoneyAmount amount={48_320_000} currency="COP" />
      <MoneyAmount amount={1499.5} currency="USD" />
    </div>
  ),
};

/** Codigo de moneda inesperado: la interfaz muestra el par crudo y no se cae. */
export const UnknownCurrency: Story = {
  args: { amount: 1200, currency: 'XXX' },
};
