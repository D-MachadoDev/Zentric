import type { Meta, StoryObj } from '@storybook/react';
import { SupervisorOrdersPage } from './SupervisorOrdersPage';
import { createRoleStory } from '../storybookSupport';
import { UserRole } from '../../domain';

/**
 * Auditoria de pedidos del Supervisor (Frontend-Role-Modules 2.7).
 *
 * Lectura forense del libro mayor de pedidos con filtro por estado. El
 * Supervisor no opera: fiscaliza, por eso la vista no ofrece mutaciones.
 */
const { Wrapper } = createRoleStory({
  path: '/supervisor/orders',
  role: UserRole.Supervisor,
  user: {
    userId: '00000000-0000-0000-0000-000000000005',
    email: 'supervisor@zentric.co',
    fullName: 'Supervisor de Auditoria',
  },
});

const meta: Meta<typeof SupervisorOrdersPage> = {
  title: 'Modules/Supervisor/Orders',
  component: SupervisorOrdersPage,
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

/** Expediente de pedidos con estados pagados, despachados y entregados. */
export const Default: Story = {};

/** Vista movil del expediente. */
export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile' } },
};
