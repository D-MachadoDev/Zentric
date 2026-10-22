import type { Meta, StoryObj } from '@storybook/react';
import { Label } from './Label';
import { Input } from './Input';

/**
 * Catalogo de la primitiva `Label` (Frontend-Design-System 5.2).
 *
 * Etiqueta de formulario asociada por `htmlFor`; su peso 500 pertenece a la
 * Voz 2 (prosa operativa y controles) de la escala tipografica (4.1).
 */
const meta = {
  title: 'Design System/Primitives/Label',
  component: Label,
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
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Etiqueta simple enlazada a su control. */
export const Default: Story = {
  args: {},
  render: () => (
    <div className="flex w-[20rem] flex-col gap-2">
      <Label htmlFor="etiqueta-simple">Nombre comercial</Label>
      <Input id="etiqueta-simple" placeholder="Teclado mecanico 87 teclas" />
    </div>
  ),
};

/** Campo obligatorio: el asterisco acompana al rotulo (nunca solo al color). */
export const Required: Story = {
  args: {},
  render: () => (
    <div className="flex w-[20rem] flex-col gap-2">
      <Label htmlFor="etiqueta-obligatoria">
        SKU del producto
        <span aria-hidden="true" className="text-danger">
          *
        </span>
      </Label>
      <Input id="etiqueta-obligatoria" required aria-required="true" placeholder="TEC-MEC-87" />
    </div>
  ),
};

/** Etiqueta deshabilitada: hereda el estado apagado de su control (`peer`). */
export const Disabled: Story = {
  args: {},
  render: () => (
    <div className="flex w-[20rem] flex-col gap-2">
      <Label htmlFor="etiqueta-deshabilitada">Direccion de despacho</Label>
      <Input id="etiqueta-deshabilitada" disabled defaultValue="Calle 100 # 20-30, Bogota" />
    </div>
  ),
};

/** Etiqueta en modo mono-caps para datos del dominio (SKU, guia, documento). */
export const MonoCaps: Story = {
  args: {},
  render: () => (
    <Label
      htmlFor="etiqueta-mono"
      className="font-mono text-xs tracking-wider text-foreground-muted uppercase"
    >
      Numero de guia
      <Input id="etiqueta-mono" className="font-mono" placeholder="ZEN-2024-004182" />
    </Label>
  ),
};
