import type { Meta, StoryObj } from '@storybook/react';
import { StateView } from './state-view';

/**
 * Catalogo del componente shadcn `StateView` (Frontend-Design-System 4).
 *
 * `tone="empty"` se anuncia con `role="status"` y `tone="error"` con
 * `role="alert"`: ninguna vista de la consola queda muda.
 */
const meta = {
  title: 'Design System/Components/StateView',
  component: StateView,
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
    tone: { control: 'inline-radio', options: ['empty', 'error'] },
  },
} satisfies Meta<typeof StateView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Estado vacio con la siguiente accion util. */
export const Empty: Story = {
  args: {
    tone: 'empty',
    title: 'No se encontraron pedidos',
    description: 'Aun no has confirmado ningun pedido. Explora el catalogo para comenzar.',
    action: { label: 'Explorar catalogo', onClick: () => {} },
  },
};

/** Estado de error con reintento en linea. */
export const Error: Story = {
  args: {
    tone: 'error',
    title: 'No se pudo completar la operacion',
    description:
      'Ocurrio un error al procesar la solicitud. Comprueba la conexion o intenta nuevamente.',
    action: { label: 'Reintentar', onClick: () => {} },
  },
};

/** Estado vacio sin accion: el titulo explica por que no hay datos. */
export const EmptyWithoutAction: Story = {
  args: {
    tone: 'empty',
    title: 'Sin ventas registradas recientemente',
    description: 'Cuando un comprador confirme un pedido, aparecera aqui.',
  },
};
