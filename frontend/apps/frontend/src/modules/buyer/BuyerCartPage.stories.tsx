import type { Meta, StoryObj } from '@storybook/react';
import { BuyerCartPage } from './BuyerCartPage';
import { createRoleStory } from '../storybookSupport';
import { UserRole } from '../../domain';

/**
 * Carrito del Comprador (Frontend-Role-Modules 2.4).
 *
 * El carrito es la etapa previa al checkout atomico de 15 minutos: las lineas
 * se identifican por VARIANTE (riesgo FR-03), no por producto.
 */
const { Wrapper } = createRoleStory({
  path: '/buyer/cart',
  role: UserRole.Buyer,
  user: {
    userId: '00000000-0000-0000-0000-000000000003',
    email: 'comprador@zentric.co',
    fullName: 'Comprador Demo',
  },
});

const meta: Meta<typeof BuyerCartPage> = {
  title: 'Modules/Buyer/Cart',
  component: BuyerCartPage,
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

/** Carrito con una linea de licencia cloud lista para el checkout. */
export const Default: Story = {};

/** Vista movil del carrito. */
export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile' } },
};
