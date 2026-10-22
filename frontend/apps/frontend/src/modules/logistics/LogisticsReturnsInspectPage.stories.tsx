import type { Meta, StoryObj } from '@storybook/react';
import { LogisticsReturnsInspectPage } from './LogisticsReturnsInspectPage';
import { createRoleStory } from '../storybookSupport';
import { UserRole } from '../../domain';

/**
 * Inspeccion de devoluciones del Operador Logistico (Frontend-Role-Modules 2.6).
 *
 * El Operador dictamina la condicion tecnica del articulo devuelto
 * (ADR-0018); el Vendedor aprueba y el Administrador reembolsa.
 */
const { Wrapper } = createRoleStory({
  path: '/logistics/returns',
  role: UserRole.LogisticsOperator,
  user: {
    userId: '00000000-0000-0000-0000-000000000004',
    email: 'logistica@zentric.co',
    fullName: 'Operador Logistico',
  },
});

const meta: Meta<typeof LogisticsReturnsInspectPage> = {
  title: 'Modules/Logistics/Returns',
  component: LogisticsReturnsInspectPage,
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

/** Bandeja con devoluciones solicitadas y aprobadas. */
export const Default: Story = {};

/** Vista movil de la bandeja de inspeccion. */
export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile' } },
};
