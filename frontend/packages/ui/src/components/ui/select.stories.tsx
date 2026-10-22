import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './select';
import { Label } from './label';

/**
 * Catalogo del componente shadcn `Select` (Frontend-Design-System 5.2).
 *
 * Lista desplegable accesible construida sobre Radix: navegacion por teclado,
 * `aria-label` en el disparador y estado `disabled`.
 */
const meta = {
  title: 'Design System/Components/Select',
  component: Select,
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
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Selector de estado de pedido.
 *
 * Va en un componente con nombre propio: la regla de hooks prohibe llamar a
 * `useState` dentro de la funcion anonima `render` de Storybook.
 */
function OrderStatusSelect() {
  const [value, setValue] = useState('paid');

  return (
    <div className="flex w-[20rem] flex-col gap-2">
      <Label htmlFor="estado-pedido">Estado del pedido</Label>
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger id="estado-pedido" aria-label="Estado del pedido">
          <SelectValue placeholder="Seleccione un estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="pending">Pendiente de pago</SelectItem>
          <SelectItem value="paid">Pagado</SelectItem>
          <SelectItem value="dispatched">Despachado</SelectItem>
          <SelectItem value="delivered">Entregado</SelectItem>
          <SelectItem value="cancelled">Cancelado</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

/** Selector de tipo de bodega con grupos y separadores. */
function WarehouseTypeSelect() {
  const [value, setValue] = useState('marketplace');

  return (
    <div className="flex w-[20rem] flex-col gap-2">
      <Label htmlFor="tipo-bodega">Tipo de bodega</Label>
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger id="tipo-bodega" aria-label="Tipo de bodega">
          <SelectValue placeholder="Seleccione" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Plataforma</SelectLabel>
            <SelectItem value="marketplace">Marketplace</SelectItem>
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>Vendedor</SelectLabel>
            <SelectItem value="vendor">Bodega del vendedor</SelectItem>
            <SelectItem value="vendor-disabled" disabled>
              Bodega del vendedor (sin cupo)
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

/** Selector de estado de pedido con etiqueta asociada. */
export const Default: Story = {
  args: {},
  render: () => <OrderStatusSelect />,
};

/** Selector con grupos y separadores: catalogos largos de la consola. */
export const WithGroups: Story = {
  args: {},
  render: () => <WarehouseTypeSelect />,
};

/** Estado sin valor: el placeholder anuncia que falta la seleccion. */
export const Placeholder: Story = {
  args: {},
  render: () => (
    <div className="flex w-[20rem] flex-col gap-2">
      <Label htmlFor="vendedor">Vendedor</Label>
      <Select>
        <SelectTrigger id="vendedor" aria-label="Vendedor">
          <SelectValue placeholder="Seleccione un vendedor" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="uno">Distribuidora Andina</SelectItem>
          <SelectItem value="dos">Comercial Caribe</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};

/** Control deshabilitado: no admite apertura ni seleccion. */
export const Disabled: Story = {
  args: {},
  render: () => (
    <div className="flex w-[20rem] flex-col gap-2">
      <Label htmlFor="vendedor-deshabilitado">Vendedor</Label>
      <Select disabled>
        <SelectTrigger id="vendedor-deshabilitado" aria-label="Vendedor">
          <SelectValue placeholder="No disponible" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="uno">Distribuidora Andina</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};
