import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';
import { ArrowRight, Trash2 } from 'lucide-react';

/**
 * Catalogo de la primitiva `Button` (Frontend-Design-System 5.2).
 *
 * `isLoading` inyecta `aria-busy="true"`, deshabilita el control e impide el
 * doble envio: es el comportamiento exigido para operaciones financieras.
 */
const meta = {
  title: 'Design System/Primitives/Button',
  component: Button,
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
      options: ['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'],
    },
    size: {
      control: 'select',
      options: ['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg'],
    },
    isLoading: { control: 'boolean', description: 'Bloquea el control e inyecta aria-busy.' },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Accion principal del sistema: relleno de acento del rol. */
export const Default: Story = {
  args: { variant: 'default', children: 'Confirmar pedido' },
};

/** Todas las variantes semanticas en una sola rejilla. */
export const AllVariants: Story = {
  args: {},
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="default">Principal</Button>
      <Button variant="secondary">Secundaria</Button>
      <Button variant="outline">Contorno</Button>
      <Button variant="ghost">Fantasma</Button>
      <Button variant="destructive">Destructiva</Button>
      <Button variant="link">Enlace</Button>
    </div>
  ),
};

/** Escala completa de tamanos, incluidos los iconos. */
export const AllSizes: Story = {
  args: {},
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="xs">Extra small</Button>
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="icon-xs" aria-label="Anadir">
        <span aria-hidden="true">+</span>
      </Button>
      <Button size="icon-sm" aria-label="Editar">
        <span aria-hidden="true">E</span>
      </Button>
      <Button size="icon" aria-label="Eliminar">
        <Trash2 />
      </Button>
      <Button size="icon-lg" aria-label="Continuar">
        <ArrowRight />
      </Button>
    </div>
  ),
};

/** Control deshabilitado: no admite foco ni activacion. */
export const Disabled: Story = {
  args: { disabled: true, children: 'Pagar pedido' },
};

/** Estado de carga: `aria-busy="true"` y control bloqueado (5.2). */
export const Loading: Story = {
  args: { isLoading: true, children: 'Procesando pago' },
};

/** Anillo de foco visible: `focus-visible` sobre el anillo del rol. */
export const FocusVisible: Story = {
  args: {
    children: 'Continuar',
    // `autoFocus` replica el estado de foco sin depender del addon de interacciones.
    autoFocus: true,
  },
};

/** Accion destructiva con icono explicito. */
export const DestructiveWithIcon: Story = {
  args: {},
  render: () => (
    <Button variant="destructive">
      <Trash2 />
      Anular factura
    </Button>
  ),
};
