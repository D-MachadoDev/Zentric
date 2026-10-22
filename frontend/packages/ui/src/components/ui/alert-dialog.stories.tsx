import type { Meta, StoryObj } from '@storybook/react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './alert-dialog';
import { TriangleAlert } from 'lucide-react';

/**
 * Catalogo del componente shadcn `AlertDialog` (Frontend-Design-System 5.2).
 *
 * Confirmacion critica con `role="alertdialog"`: el foco queda atrapado y la
 * accion destructiva nunca es la opcion por defecto.
 */
const meta = {
  title: 'Design System/Components/AlertDialog',
  component: AlertDialog,
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
} satisfies Meta<typeof AlertDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Dialog abierto: estructura completa con accion destructiva. */
export const Open: Story = {
  args: {
    open: true,
    children: (
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="border-destructive/40 bg-destructive/10 text-destructive">
            <TriangleAlert aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle>Anular factura maestra</AlertDialogTitle>
          <AlertDialogDescription>
            La anulacion revoca el split de comision entre vendedores y no admite reversion.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Conservar</AlertDialogCancel>
          <AlertDialogAction variant="destructive">Anular factura</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    ),
  },
};

/** Dialog disparado por un control: el patron habitual de la consola. */
export const WithTrigger: Story = {
  args: {},
  render: () => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          className="rounded-md border border-destructive/30 bg-destructive/15 px-3 py-1.5 text-sm font-medium text-destructive"
        >
          Reportar quiebre de stock
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar quiebre de stock</AlertDialogTitle>
          <AlertDialogDescription>
            Se cancelara la reserva de las unidades afectadas y se notificara a los compradores.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction>Confirmar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};
