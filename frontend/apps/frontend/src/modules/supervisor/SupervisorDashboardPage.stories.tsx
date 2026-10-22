import type { Meta, StoryObj } from '@storybook/react';
import { SupervisorDashboardPage } from './SupervisorDashboardPage';
import { createRoleStory } from '../storybookSupport';
import { UserRole } from '../../domain';

/**
 * Sala de Libros del Supervisor de Auditoria (Frontend-Role-Modules 2.7).
 *
 * El Supervisor lee el libro mayor: pedidos, despachos, devoluciones, facturas
 * y telemetria de plataforma. Su identidad es fucsia forense y su contenido se
 * presenta como hoja continua, no como tarjetas (9.6).
 */
const { Wrapper } = createRoleStory({
  path: '/supervisor',
  role: UserRole.Supervisor,
  user: {
    userId: '00000000-0000-0000-0000-000000000005',
    email: 'supervisor@zentric.co',
    fullName: 'Supervisor de Auditoria',
  },
});

const meta: Meta<typeof SupervisorDashboardPage> = {
  title: 'Modules/Supervisor/Dashboard',
  component: SupervisorDashboardPage,
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

/** Libro mayor con los cinco estados de la plataforma en un solo vistazo. */
export const Default: Story = {};

/** Vista de tablet: el indice forense se apila sobre el contenido. */
export const Tablet: Story = {
  parameters: { viewport: { defaultViewport: 'tablet' } },
};
