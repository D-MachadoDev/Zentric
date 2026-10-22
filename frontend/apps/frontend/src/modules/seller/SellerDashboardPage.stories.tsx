import type { Meta, StoryObj } from '@storybook/react';
import { SellerDashboardPage } from './SellerDashboardPage';
import { createRoleStory } from '../storybookSupport';
import { UserRole } from '../../domain';

/**
 * Consola del Vendedor (Frontend-Role-Modules 2.3).
 *
 * Hero KPI Strip asimetrico + Split-Frame (65% pedidos recientes / 35% cola
 * operativa). La identidad del rol es violeta estudio y el shell tiene sidebar
 * persistente (9.6).
 */
const { Wrapper } = createRoleStory({
  path: '/seller',
  role: UserRole.Seller,
  user: {
    userId: '00000000-0000-0000-0000-000000000002',
    email: 'vendedor@zentric.co',
    fullName: 'Distribuidora Andina',
  },
});

const meta: Meta<typeof SellerDashboardPage> = {
  title: 'Modules/Seller/Dashboard',
  component: SellerDashboardPage,
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

/** Panel con catalogo, liquidacion y cola de empaque. */
export const Default: Story = {};

/** Vista de tablet: el Split-Frame se apila en una sola columna. */
export const Tablet: Story = {
  parameters: { viewport: { defaultViewport: 'tablet' } },
};
