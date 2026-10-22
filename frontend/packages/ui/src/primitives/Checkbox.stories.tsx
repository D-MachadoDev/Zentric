import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Checkbox } from './Checkbox';
import { Label } from './Label';

/**
 * Catalogo de la primitiva `Checkbox` (Frontend-Design-System 5.2).
 *
 * Control de seleccion accesible: expone `checked` / `onCheckedChange` y
 * hereda los estados `disabled` e `aria-invalid` del contrato de Radix.
 */
const meta = {
  title: 'Design System/Primitives/Checkbox',
  component: Checkbox,
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
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
  },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Checkbox controlado.
 *
 * Va en un componente con nombre propio: la regla de hooks prohibe llamar a
 * `useState` dentro de una funcion anonima en minusculas (el `render` de
 * Storybook no es un componente React).
 */
function ControlledCheckbox() {
  const [checked, setChecked] = useState(true);

  return (
    <div className="flex items-center gap-3">
      <Checkbox
        id="marcada"
        checked={checked}
        onCheckedChange={(value) => setChecked(value === true)}
      />
      <Label htmlFor="marcada">Marcada (controlada)</Label>
    </div>
  );
}

/** Casilla sin marcar, asociada a su etiqueta. */
export const Default: Story = {
  args: {},
  render: () => (
    <div className="flex items-center gap-3">
      <Checkbox id="acepto" />
      <Label htmlFor="acepto">Acepto los terminos y condiciones</Label>
    </div>
  ),
};

/** Estados de la casilla: marcado, indeterminate, deshabilitado e invalido. */
export const AllStates: Story = {
  args: {},
  render: () => (
    <div className="flex flex-col gap-4">
      <ControlledCheckbox />
      <div className="flex items-center gap-3">
        <Checkbox id="indeterminada" checked="indeterminate" />
        <Label htmlFor="indeterminada">Estado indeterminado</Label>
      </div>
      <div className="flex items-center gap-3">
        <Checkbox id="deshabilitada" disabled />
        <Label htmlFor="deshabilitada">Deshabilitada</Label>
      </div>
      <div className="flex items-center gap-3">
        <Checkbox id="invalida" aria-invalid />
        <Label htmlFor="invalida">Requerida para continuar</Label>
      </div>
    </div>
  ),
};

/** Anillo de foco visible al tabular por el formulario. */
export const FocusVisible: Story = {
  args: {},
  render: () => (
    <div className="flex items-center gap-3">
      <Checkbox id="foco" autoFocus />
      <Label htmlFor="foco">Recordar mi direccion de despacho</Label>
    </div>
  ),
};
