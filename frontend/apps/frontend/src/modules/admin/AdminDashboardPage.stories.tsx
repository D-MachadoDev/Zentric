import type { Meta, StoryObj } from '@storybook/react';
import { AdminDashboardPage } from './AdminDashboardPage';
import { createRoleStory } from '../storybookSupport';
import { UserRole } from '../../domain';

/**
 * Centro de Mando del Administrador (Frontend-Role-Modules 2.5).
 *
 * Governing band + KPIs de gobernanza (usuarios, bodegas, pedidos, facturas y
 * telemetria). La identidad del rol es indigo de mando con shell de sidebar
 * persistente (9.6).
 */
const { Wrapper } = createRoleStory({
  path: '/admin',
  role: UserRole.Administrator,
  user: {
    userId: '00000000-0000-0000-0000-000000000001',
    email: 'admin@zentric.co',
    fullName: 'Admin Zentric',
  },
});

const meta: Meta<typeof AdminDashboardPage> = {
  title: 'Modules/Admin/Dashboard',
  component: AdminDashboardPage,
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

/** Panel de mando con usuarios, bodegas, pedidos y facturas. */
export const Default: Story = {};

/** Vista de tablet: el bloque de KPIs se reorganiza en dos columnas. */
export const Tablet: Story = {
  parameters: { viewport: { defaultViewport: 'tablet' } },
};
