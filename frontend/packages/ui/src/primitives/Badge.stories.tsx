import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './Badge';

/**
 * Catalogo de la primitiva `Badge` (Frontend-Design-System 5.2).
 *
 * Etiqueta atomica con variantes semanticas (`neutral`, `info`, `warning`,
 * `success`, `danger`). El rotulo textual siempre acompana al color.
 */
const meta = {
  title: 'Design System/Primitives/Badge',
  component: Badge,
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
      options: [
        'default',
        'secondary',
        'neutral',
        'destructive',
        'danger',
        'warning',
        'success',
        'info',
        'outline',
        'ghost',
        'link',
      ],
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Variante por defecto: insignia de marca (jade del rol Comprador). */
export const Default: Story = {
  args: { variant: 'default', children: 'Publicado' },
};

/** Todos los tonos semanticos admitidos por la primitiva. */
export const AllVariants: Story = {
  args: {},
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Badge variant="default">Publicado</Badge>
      <Badge variant="secondary">Marketplace</Badge>
      <Badge variant="neutral">Suspendido</Badge>
      <Badge variant="info">En transito</Badge>
      <Badge variant="success">Confirmado</Badge>
      <Badge variant="warning">Pendiente</Badge>
      <Badge variant="destructive">Cancelado</Badge>
      <Badge variant="outline">Bodega Norte</Badge>
      <Badge variant="ghost">SKU-8831</Badge>
      <Badge variant="link">Ver detalle</Badge>
    </div>
  ),
};

/** Insignia de estado de pedido, con el mono para el dato tabular. */
export const DomainStatus: Story = {
  args: {},
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Badge variant="warning">Pendiente de pago</Badge>
      <Badge variant="info">Despachado</Badge>
      <Badge variant="success">Entregado</Badge>
      <Badge variant="destructive">Cancelado</Badge>
    </div>
  ),
};

/** `asChild` delega el estilo al hijo: util para enlaces de navegacion. */
export const AsChildLink: Story = {
  args: {},
  render: () => (
    <Badge variant="outline" asChild>
      <a href="#catalogo" className="hover:bg-surface-muted">
        Ver catalogo
      </a>
    </Badge>
  ),
};
