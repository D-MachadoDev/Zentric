import type { Meta, StoryObj } from '@storybook/react';
import { ModalDialog } from './ModalDialog';
import { Button } from '../primitives/Button';

/**
 * Catalogo del compuesto `ModalDialog` (Frontend-Design-System 5.3).
 *
 * Confirmacion critica con `role="alertdialog"`, cancelacion por defecto y
 * estado de carga que bloquea el doble envio en operaciones financieras.
 */
const meta = {
  title: 'Design System/Composite/ModalDialog',
  component: ModalDialog,
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
  argTypes: {
    variant: { control: 'select', options: ['default', 'destructive', 'warning'] },
    confirmLabel: { control: 'text' },
    cancelLabel: { control: 'text' },
    isLoading: { control: 'boolean' },
  },
} satisfies Meta<typeof ModalDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Confirmacion simple de una operacion reversible. */
export const Default: Story = {
  args: {
    open: true,
    title: 'Confirmar salida de bodega',
    description:
      'El despacho ZEN-2024-004182 saldra de Bodega Sur. Tras la salida no podra editarse su contenido.',
    confirmLabel: 'Confirmar salida',
    cancelLabel: 'Volver',
  },
};

/** Accion destructiva: la confirmacion usa el tono `destructive`. */
export const Destructive: Story = {
  args: {
    open: true,
    variant: 'destructive',
    title: 'Anular factura maestra',
    description:
      'La anulacion revoca el split de comision entre vendedores y no admite reversion.',
    confirmLabel: 'Anular factura',
    cancelLabel: 'Conservar',
  },
};

/** Advertencia operativa: tono ambar sin destructividad. */
export const Warning: Story = {
  args: {
    open: true,
    variant: 'warning',
    title: 'Reportar quiebre de stock',
    description:
      'Se notificara a los compradores afectados y se cancelara la reserva de existencias.',
    confirmLabel: 'Reportar quiebre',
  },
};

/** Estado de carga: la accion principal se bloquea mientras se procesa. */
export const Loading: Story = {
  args: {
    open: true,
    isLoading: true,
    title: 'Procesando reembolso',
    description: 'El reembolso se esta applying contra la pasarela de pagos.',
    confirmLabel: 'Reembolsar',
  },
};

/** Dialog disparado por un control, patron habitual de la consola. */
export const WithTrigger: Story = {
  args: { title: 'Confirmar accion' },
  render: () => (
    <ModalDialog
      title="Bloquear usuario"
      description="El usuario perdera el acceso hasta que un administrador lo reactive."
      confirmLabel="Bloquear acceso"
      cancelLabel="Cancelar"
      variant="destructive"
      trigger={<Button variant="destructive">Bloquear usuario</Button>}
    >
      <p className="font-mono text-xs tabular-nums text-foreground-muted">
        usuario: comprador@zentric.co · documento: 100000003
      </p>
    </ModalDialog>
  ),
};
