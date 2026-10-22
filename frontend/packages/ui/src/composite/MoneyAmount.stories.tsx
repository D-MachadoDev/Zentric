import type { Meta, StoryObj } from '@storybook/react';
import { MoneyAmount } from './MoneyAmount';

/**
 * Catalogo del compuesto `MoneyAmount` (Frontend-Design-System 5.3).
 *
 * El servidor es la unica autoridad financiera: el componente solo formatea
 * `{ amount, currency }` con cifras tabulares y versalitas para el ISO (4.2).
 */
const meta = {
  title: 'Design System/Composite/MoneyAmount',
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
    locale: { control: 'text' },
  },
} satisfies Meta<typeof MoneyAmount>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Importe en pesos colombianos, la moneda operativa del marketplace. */
export const Default: Story = {
  args: { amount: 4_850_000, currency: 'COP' },
};

/** Escala de importes para verificar el ancho de la cifra tabular. */
export const AmountScale: Story = {
  args: { amount: 150000, currency: 'COP' },
  render: () => (
    <div className="flex flex-col items-end gap-3">
      <MoneyAmount amount={0} currency="COP" />
      <MoneyAmount amount={12_500} currency="COP" />
      <MoneyAmount amount={4_850_000} currency="COP" />
      <MoneyAmount amount={1_284_950_000} currency="COP" />
    </div>
  ),
};

/** Divisas adicionales: la moneda la decide el backend, no el cliente. */
export const OtherCurrencies: Story = {
  args: { amount: 150000, currency: 'COP' },
  render: () => (
    <div className="flex flex-col items-end gap-3">
      <MoneyAmount amount={1499.5} currency="USD" />
      <MoneyAmount amount={249.9} currency="EUR" />
    </div>
  ),
};

/** Locale explicito para presentations con formato distinto. */
export const WithLocale: Story = {
  args: { amount: 4_850_000, currency: 'COP', locale: 'es-CO' },
};
