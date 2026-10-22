import type { Meta, StoryObj } from '@storybook/react';
import { LogisticsFulfillmentsPage } from './LogisticsFulfillmentsPage';
import { createRoleStory } from '../storybookSupport';
import { UserRole } from '../../domain';

/**
 * Tablero de colas del Operador Logistico (Frontend-Role-Modules 2.6).
 *
 * Cola de despachos por estado: `PendingPack`, `Packed`, `Dispatched`,
 * `Delivered` y `Cancelled`. La identidad del rol es cian operativo con
 * cabecera compacta de terminal (9.6).
 */
const { Wrapper } = createRoleStory({
  path: '/logistics/fulfillments',
  role: UserRole.LogisticsOperator,
  user: {
    userId: '00000000-0000-0000-0000-000000000004',
    email: 'logistica@zentric.co',
    fullName: 'Operador Logistico',
  },
});

const meta: Meta<typeof LogisticsFulfillmentsPage> = {
  title: 'Modules/Logistics/Fulfillments',
  component: LogisticsFulfillmentsPage,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#0C0F16' },
        { name: 'light', value: '#F5F6F8' },
      ],
    },
    viewport: { defaultViewport: 'desktop' },
  },
  tags: ['autodocs'],
  decorators: [(Story) => <Wrapper><Story /></Wrapper>],
};

export default meta;
type Story = StoryObj<typeof meta>;

/** Cola con despachos pendientes, en camino y entregados. */
export const Default: Story = {};

/** Vista de tablet: la franja de colas mantiene la densidad terminal. */
export const Tablet: Story = {
  parameters: { viewport: { defaultViewport: 'tablet' } },
};
