import type { Meta, StoryObj } from '@storybook/react';
import { StateView } from './StateView';

/**
 * Catalogo del compuesto `StateView` (Frontend-Design-System 5.3).
 *
 * Vista unificada para los cuatro estados canonicos: `loading`, `empty`,
 * `error` y `data`. Ninguna vista queda muda: cada estado comunica su causa
 * y ofrece un camino de recuperacion.
 */
const meta = {
  title: 'Design System/Composite/StateView',
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
    state: { control: 'inline-radio', options: ['loading', 'empty', 'error', 'data'] },
    skeletonRows: { control: 'number' },
  },
} satisfies Meta<typeof StateView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Estado de carga: esqueletos con `aria-busy="true"`. */
export const Loading: Story = {
  args: { state: 'loading', title: 'Cargando pedidos...', skeletonRows: 4 },
};

/** Estado vacio con accion de iniciacion. */
export const Empty: Story = {
  args: {
    state: 'empty',
    title: 'No se encontraron pedidos',
    description: 'Aun no has confirmado ningun pedido. Explora el catalogo para comenzar.',
    action: { label: 'Explorar catalogo', onClick: () => {} },
  },
};

/** Estado de error con reintento en linea. */
export const Error: Story = {
  args: {
    state: 'error',
    title: 'No se pudo completar la operacion',
    description:
      'Ocurrio un error al procesar la solicitud. Comprueba la conexion o intenta nuevamente.',
    onRetry: () => {},
  },
};

/** Proyeccion normal de datos: los hijos se renderizan tal cual. */
export const Data: Story = {
  args: {
    state: 'data',
    children: (
      <div className="flex w-[24rem] flex-col gap-2">
        <p className="text-sm font-semibold text-foreground">Pedido #A1B2C3D4</p>
        <p className="text-xs text-foreground-muted">Despachado · 3 articulos · $2.180.000 COP</p>
      </div>
    ),
  },
};

/** Estado vacio sin accion: el titulo basta para explicar la ausencia de datos. */
export const EmptyWithoutAction: Story = {
  args: {
    state: 'empty',
    title: 'Sin ventas registradas recientemente',
    description: 'Cuando un comprador confirme un pedido, aparecera aqui.',
  },
};
