import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './Input';
import { Label } from './Label';

/**
 * Catalogo de la primitiva `Input` (Frontend-Design-System 5.2).
 *
 * El contrato accesible exige `aria-invalid` + `aria-describedby` apuntando al
 * mensaje de error de validacion (5.2).
 */
const meta = {
  title: 'Design System/Primitives/Input',
  component: Input,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#0C0F16' },
        { name: 'light', value: '#F5F6F8' },
      ],
    },
  },
  tags: ['autodocs'],
  argTypes: {
    type: { control: 'select', options: ['text', 'email', 'password', 'number', 'search', 'tel'] },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Campo de texto con etiqueta asociada. */
export const Default: Story = {
  args: {},
  render: () => (
    <div className="flex w-[20rem] flex-col gap-2">
      <Label htmlFor="correo">Correo electronico</Label>
      <Input id="correo" type="email" placeholder="comprador@zentric.co" />
    </div>
  ),
};

/** Tipos de dato admitidos por la primitiva. */
export const AllTypes: Story = {
  args: {},
  render: () => (
    <div className="flex w-[20rem] flex-col gap-4">
      <Input placeholder="Nombre del producto" aria-label="Nombre del producto" />
      <Input type="email" placeholder="vendedor@zentric.co" aria-label="Correo del vendedor" />
      <Input type="number" placeholder="Cantidad" aria-label="Cantidad" defaultValue={3} />
      <Input type="search" placeholder="Buscar por SKU" aria-label="Buscar por SKU" />
      <Input type="password" placeholder="Contrasena" aria-label="Contrasena" />
    </div>
  ),
};

/** Estado de error: borde destructivo y mensaje enlazado por `aria-describedby`. */
export const ErrorState: Story = {
  args: {},
  render: () => (
    <div className="flex w-[20rem] flex-col gap-2">
      <Label htmlFor="correo-error">Correo electronico</Label>
      <Input
        id="correo-error"
        type="email"
        defaultValue="comprador@zentric"
        aria-invalid
        aria-describedby="correo-error-mensaje"
      />
      <p id="correo-error-mensaje" className="text-xs text-danger">
        El correo debe incluir el dominio completo (por ejemplo, @zentric.co).
      </p>
    </div>
  ),
};

/** Control deshabilitado: no admite foco ni edicion. */
export const Disabled: Story = {
  args: {},
  render: () => (
    <div className="flex w-[20rem] flex-col gap-2">
      <Label htmlFor="correo-deshabilitado">Correo electronico</Label>
      <Input id="correo-deshabilitado" type="email" defaultValue="comprador@zentric.co" disabled />
    </div>
  ),
};

/** Anillo de foco visible al tabular por el formulario. */
export const FocusVisible: Story = {
  args: {},
  render: () => (
    <div className="flex w-[20rem] flex-col gap-2">
      <Label htmlFor="correo-foco">Correo electronico</Label>
      <Input id="correo-foco" type="email" placeholder="comprador@zentric.co" autoFocus />
    </div>
  ),
};
