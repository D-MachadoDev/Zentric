import type { Meta, StoryObj } from '@storybook/react';
import { UserListPage } from './UserListPage';
import { createRoleStory } from '../storybookSupport';
import { UserRole } from '../../domain';

/**
 * Directorio de usuarios del Administrador (Frontend-Role-Modules 2.5).
 *
 * Listado de los cinco roles de la Ley con las acciones de bloqueo y
 * activacion. El documento del usuario es el identificador fiscal del dominio.
 */
const { Wrapper } = createRoleStory({
  path: '/admin/users',
  role: UserRole.Administrator,
  user: {
    userId: '00000000-0000-0000-0000-000000000001',
    email: 'admin@zentric.co',
    fullName: 'Admin Zentric',
  },
});

const meta: Meta<typeof UserListPage> = {
  title: 'Modules/Admin/Users',
  component: UserListPage,
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

/** Directorio con un usuario bloqueado y cuatro activos. */
export const Default: Story = {};

/** Vista movil del directorio. */
export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile' } },
};
