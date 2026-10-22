import type { Meta, StoryObj } from '@storybook/react';
import { BuyerOrdersPage } from './BuyerOrdersPage';
import { createRoleStory } from '../storybookSupport';
import { UserRole } from '../../domain';

/**
 * Historial de pedidos del Comprador (Frontend-Role-Modules 2.4).
 *
 * Hero KPI Strip + listado filtrable con acceso al pago atomico de 15 minutos
 * y al detalle del despacho. Los datos provienen del adaptador simulado con
 * pedidos reales del dominio (estados, importes en COP y variantes con SKU).
 */
const { Wrapper } = createRoleStory({
  path: '/buyer/orders',
  role: UserRole.Buyer,
  user: {
    userId: '00000000-0000-0000-0000-000000000003',
    email: 'comprador@zentric.co',
    fullName: 'Comprador Demo',
  },
});

const meta: Meta<typeof BuyerOrdersPage> = {
  title: 'Modules/Buyer/Orders',
  component: BuyerOrdersPage,
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

/** Listado con pedidos pagados, despachados y pendientes de pago. */
export const Default: Story = {};

/** Vista movil: el listado colapsa a una sola columna. */
export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

/** Vista de tablet. */
export const Tablet: Story = {
  parameters: { viewport: { defaultViewport: 'tablet' } },
};
