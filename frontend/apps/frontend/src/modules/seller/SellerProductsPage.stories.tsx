import type { Meta, StoryObj } from '@storybook/react';
import { SellerProductsPage } from './SellerProductsPage';
import { createRoleStory } from '../storybookSupport';
import { UserRole } from '../../domain';

/**
 * Catalogo del Vendedor (Frontend-Role-Modules 2.3).
 *
 * Rejilla de productos propios con publicacion y suspension (CAT-01). Los
 * productos con `canBeSold: false` no pueden venderse aunque esten publicados.
 */
const { Wrapper } = createRoleStory({
  path: '/seller/products',
  role: UserRole.Seller,
  user: {
    userId: '00000000-0000-0000-0000-000000000002',
    email: 'vendedor@zentric.co',
    fullName: 'Distribuidora Andina',
  },
});

const meta: Meta<typeof SellerProductsPage> = {
  title: 'Modules/Seller/Products',
  component: SellerProductsPage,
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

/** Catalogo con productos publicados, suspendidos y una variante no vendible. */
export const Default: Story = {};

/** Vista movil: la rejilla colapsa a una columna. */
export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile' } },
};
