import type { Meta, StoryObj } from '@storybook/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './Dialog';
import { Button } from './Button';

/**
 * Catalogo de la primitiva `Dialog` (Frontend-Design-System 5.2).
 *
 * Modal accesible con trampa de foco, cierre por `Escape` y boton de cierre
 * opcional. Se documenta abierto (`open`) para poder inspeccionarlo sin
 * depender del addon de interacciones.
 */
const meta = {
  title: 'Design System/Primitives/Dialog',
  component: Dialog,
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
    open: { control: 'boolean', description: 'Controla la visibilidad del modal.' },
  },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Dialog abierto: estructura de cabecera, cuerpo y pie. */
export const Open: Story = {
  args: {
    open: true,
    children: (
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Anular factura maestra</DialogTitle>
          <DialogDescription>
            La anulacion es irreversible y deja sin efecto el split de comision entre
            vendedores. Confirme para continuar.
          </DialogDescription>
        </DialogHeader>
        <div className="font-mono text-sm tabular-nums text-foreground-muted">
          Factura FV-2024-000182 · $12.450.000 COP
        </div>
        <DialogFooter>
          <Button variant="outline">Cancelar</Button>
          <Button variant="destructive">Anular factura</Button>
        </DialogFooter>
      </DialogContent>
    ),
  },
};

/** Dialog disparado por un control: el patron habitual de la consola. */
export const WithTrigger: Story = {
  args: {},
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Ver detalle del pedido</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pedido #A1B2C3D4</DialogTitle>
          <DialogDescription>
            Tres articulos de dos vendedores, en despacho desde Bodega Sur.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="secondary">Cerrar</Button>
          <Button>Pagar pedido</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};
