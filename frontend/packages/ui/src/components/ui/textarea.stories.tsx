import type { Meta, StoryObj } from '@storybook/react';
import { Textarea } from './textarea';
import { Label } from './label';

/**
 * Catalogo del componente shadcn `Textarea` (Frontend-Design-System 5.2).
 *
 * Campo de texto multilinea con el mismo contrato accesible que `Input`:
 * `aria-invalid` + `aria-describedby` hacia el mensaje de validacion.
 */
const meta = {
  title: 'Design System/Components/Textarea',
  component: Textarea,
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
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Campo multilinea con etiqueta y contador de caracteres. */
export const Default: Story = {
  args: {},
  render: () => (
    <div className="flex w-[24rem] flex-col gap-2">
      <Label htmlFor="descripcion-producto">Descripcion del producto</Label>
      <Textarea
        id="descripcion-producto"
        rows={4}
        defaultValue="Portatil de 14 pulgadas con 16 nucleos, 32 GB de RAM y SSD de 1 TB. Facturacion electronica con IVA incluido."
      />
      <span className="text-xs text-foreground-muted">0 / 500 caracteres</span>
    </div>
  ),
};

/** Estado de error: borde destructivo y mensaje enlazado. */
export const ErrorState: Story = {
  args: {},
  render: () => (
    <div className="flex w-[24rem] flex-col gap-2">
      <Label htmlFor="descripcion-error">Descripcion del producto</Label>
      <Textarea id="descripcion-error" rows={3} defaultValue="teclado" aria-invalid aria-describedby="descripcion-error-mensaje" />
      <p id="descripcion-error-mensaje" className="text-xs text-danger">
        La descripcion debe tener al menos 40 caracteres.
      </p>
    </div>
  ),
};

/** Control deshabilitado: no admite edicion. */
export const Disabled: Story = {
  args: {},
  render: () => (
    <div className="flex w-[24rem] flex-col gap-2">
      <Label htmlFor="descripcion-deshabilitada">Descripcion del producto</Label>
      <Textarea
        id="descripcion-deshabilitada"
        rows={3}
        defaultValue="Descripcion cargada automaticamente por el ERP del vendedor."
        disabled
      />
    </div>
  ),
};

/** Anillo de foco visible al tabular por el formulario. */
export const FocusVisible: Story = {
  args: {},
  render: () => (
    <div className="flex w-[24rem] flex-col gap-2">
      <Label htmlFor="descripcion-foco">Notas del despacho</Label>
      <Textarea id="descripcion-foco" rows={3} placeholder="Entregar en recepcion..." autoFocus />
    </div>
  ),
};
