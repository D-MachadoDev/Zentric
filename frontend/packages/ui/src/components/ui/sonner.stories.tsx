import type { Meta, StoryObj } from '@storybook/react';
import { Toaster, toast } from './sonner';
import { Button } from './button';

/**
 * Catalogo del componente shadcn `Toaster` / `sonner` (Frontend-Adapters 5).
 *
 * Los avisos flotantes se tematizan con los tokens del design system: misma
 * superficie, mismo radio y misma tipografia que el resto de la consola. El
 * paquete de diseno es el dueno del aviso y reexporta `toast`.
 */
const meta = {
  title: 'Design System/Components/Toaster',
  component: Toaster,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#0C0F16' },
        { name: 'light', value: '#F5F6F8' },
      ],
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Toaster>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Aviso de confirmacion: el tono por defecto de la consola. */
export const Default: Story = {
  args: {},
  render: () => (
    <div className="flex flex-col items-start gap-3">
      <Button onClick={() => toast('Pedido actualizado correctamente')}>Emitir aviso</Button>
      <Toaster />
    </div>
  ),
};

/** Avisos con descripcion: el aviso no bloquea la lectura (7). */
export const WithDescription: Story = {
  args: {},
  render: () => (
    <div className="flex flex-col items-start gap-3">
      <Button
        onClick={() =>
          toast.success('Pago confirmado', {
            description: 'La reserva atomica quedo cerrada por $2.180.000 COP.',
          })
        }
      >
        Emitir aviso con descripcion
      </Button>
      <Toaster />
    </div>
  ),
};

/** Aviso de error con accion de reintento. */
export const ErrorWithAction: Story = {
  args: {},
  render: () => (
    <div className="flex flex-col items-start gap-3">
      <Button
        variant="destructive"
        onClick={() =>
          toast.error('No se pudo procesar el pago', {
            description: 'La pasarela no respondio. Intente nuevamente.',
            action: { label: 'Reintentar', onClick: () => {} },
          })
        }
      >
        Emitir aviso de error
      </Button>
      <Toaster />
    </div>
  ),
};
