import type { Meta, StoryObj } from '@storybook/react';
import { Alert, AlertAction, AlertDescription, AlertTitle } from './Alert';
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react';

/**
 * Catalogo de la primitiva `Alert` (Frontend-Design-System 5.2).
 *
 * El tono semantico (`variant`) nunca actua como unico portador de
 * significado: cada aviso lleva icono, titulo y descripcion (5).
 */
const meta = {
  title: 'Design System/Primitives/Alert',
  component: Alert,
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
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'danger', 'warning', 'info', 'success'],
      description: 'Tono semantico del aviso.',
    },
  },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Variante por defecto: aviso informativo neutro. */
export const Default: Story = {
  args: {
    variant: 'default',
    children: (
      <>
        <Info aria-hidden="true" />
        <AlertTitle>Informacion de la plataforma</AlertTitle>
        <AlertDescription>
          El catalogo se sincroniza cada 15 minutos con las bodegas fisicas.
        </AlertDescription>
      </>
    ),
  },
};

/** Todos los tonos semanticos en una sola rejilla de inspeccion. */
export const AllVariants: Story = {
  args: {},
  render: () => (
    <div className="flex w-[36rem] flex-col gap-3">
      <Alert variant="default">
        <Info aria-hidden="true" />
        <AlertTitle>Estado del sistema</AlertTitle>
        <AlertDescription>Todos los servicios operando con normalidad.</AlertDescription>
      </Alert>
      <Alert variant="info">
        <Info aria-hidden="true" />
        <AlertTitle>Pedido en transito</AlertTitle>
        <AlertDescription>El despacho viaja desde la bodega de Medellin.</AlertDescription>
      </Alert>
      <Alert variant="success">
        <CheckCircle2 aria-hidden="true" />
        <AlertTitle>Pago confirmado</AlertTitle>
        <AlertDescription>La reserva de existencias quedo confirmada.</AlertDescription>
      </Alert>
      <Alert variant="warning">
        <TriangleAlert aria-hidden="true" />
        <AlertTitle>Checkout en 15 minutos</AlertTitle>
        <AlertDescription>La reserva atomica caduca a las 14:35.</AlertDescription>
      </Alert>
      <Alert variant="destructive">
        <AlertCircle aria-hidden="true" />
        <AlertTitle>Quiebre de stock</AlertTitle>
        <AlertDescription>No fue posible reservar la variante seleccionada.</AlertDescription>
      </Alert>
    </div>
  ),
};

/** Aviso con accion de recuperacion en la esquina (contrato `AlertAction`). */
export const WithAction: Story = {
  args: {},
  render: () => (
    <Alert variant="warning" className="w-[36rem]">
      <TriangleAlert aria-hidden="true" />
      <AlertTitle>Stock por agotarse</AlertTitle>
      <AlertDescription>
        Quedan 3 unidades disponibles de la variante seleccionada.
      </AlertDescription>
      <AlertAction>
        <button
          type="button"
          className="rounded-md border border-warning/40 px-2.5 py-1 text-xs font-medium text-warning hover:bg-warning/10"
        >
          Reponer
        </button>
      </AlertAction>
    </Alert>
  ),
};

/** Estado accesible de error: `role="alert"` lo announce el lector de pantalla. */
export const ErrorState: Story = {
  args: {
    variant: 'destructive',
    children: (
      <>
        <AlertCircle aria-hidden="true" />
        <AlertTitle>Error al cargar el historial de pedidos</AlertTitle>
        <AlertDescription>
          No fue posible consultar sus compras. Intente nuevamente en unos segundos.
        </AlertDescription>
      </>
    ),
  },
};
