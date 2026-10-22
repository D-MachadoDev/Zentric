import type { Meta, StoryObj } from '@storybook/react';
import { LoginPage } from './LoginPage';
import { createRoleStory } from '../storybookSupport';
import { UserRole } from '../../domain';

/**
 * Portal de acceso publico (Frontend SDD C4-4 2 y Frontend-Role-Modules 2.1).
 *
 * Split-Frame asimetrico (55% editorial / 45% formulario) con los pilares
 * comerciales de la Ley. No requiere sesion: es la unica pagina publica con
 * `data-role` de Comprador por defecto (9.2).
 */
const { Wrapper } = createRoleStory({
  path: '/login',
  role: UserRole.Buyer,
  user: {
    userId: '00000000-0000-0000-0000-000000000003',
    email: 'comprador@zentric.co',
    fullName: 'Comprador Demo',
  },
});

const meta: Meta<typeof LoginPage> = {
  title: 'Modules/Auth/Login',
  component: LoginPage,
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

/** Formulario de acceso con los pilares comerciales de la plataforma. */
export const Default: Story = {};

/** Vista movil: el bloque editorial colapsa sobre el formulario. */
export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile' } },
};
