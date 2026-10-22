import type { Meta, StoryObj } from '@storybook/react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from './table';
import { StatusBadge } from './status-badge';

/**
 * Catalogo del componente shadcn `Table` (Frontend-Design-System 5.2).
 *
 * Tabla densa con cabecera en `--surface-muted` y celdas numericas alineadas
 * a la derecha en Geist Mono con cifras tabulares (5.3).
 */
const meta = {
  title: 'Design System/Components/Table',
  component: Table,
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
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Inventario por bodega: la tabla densa de la consola. */
export const Default: Story = {
  args: {},
  render: () => (
    <div className="w-[52rem] rounded-xl border border-border/80 bg-surface">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>SKU</TableHead>
            <TableHead>Producto</TableHead>
            <TableHead>Bodega</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Disponible</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="font-mono text-xs">TEC-MEC-87</TableCell>
            <TableCell>Teclado mecanico 87 teclas</TableCell>
            <TableCell>Bodega Norte</TableCell>
            <TableCell>
              <StatusBadge tone="success">Confirmado</StatusBadge>
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums">128</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono text-xs">MON-GAM-27</TableCell>
            <TableCell>Monitor gaming 27 pulgadas</TableCell>
            <TableCell>Bodega Sur</TableCell>
            <TableCell>
              <StatusBadge tone="warning">Pendiente de pago</StatusBadge>
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums">12</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono text-xs">LIC-CLD-24M</TableCell>
            <TableCell>Licencia cloud 24 meses</TableCell>
            <TableCell>Digital</TableCell>
            <TableCell>
              <StatusBadge tone="info">En transito</StatusBadge>
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums">999</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  ),
};

/** Tabla con pie de totales: el bloque que cierra una lectura de inventario. */
export const WithFooter: Story = {
  args: {},
  render: () => (
    <div className="w-[40rem] rounded-xl border border-border/80 bg-surface">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Concepto</TableHead>
            <TableHead className="text-right">Valor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Subtotal vendedor</TableCell>
            <TableCell className="text-right font-mono tabular-nums">$2.180.000</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Comision de la plataforma (5%)</TableCell>
            <TableCell className="text-right font-mono tabular-nums">$109.000</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>Total facturado al comprador</TableCell>
            <TableCell className="text-right font-mono tabular-nums">$2.180.000</TableCell>
          </TableRow>
        </TableFooter>
        <TableCaption>Corte del dia a las 06:00 (hora de Bogota).</TableCaption>
      </Table>
    </div>
  ),
};

/** Tabla sin datos: el cuerpo vacio debe invite a la accion, no a la confusion. */
export const EmptyTable: Story = {
  args: {},
  render: () => (
    <div className="w-[40rem] rounded-xl border border-border/80 bg-surface">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>SKU</TableHead>
            <TableHead>Producto</TableHead>
            <TableHead className="text-right">Disponible</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell colSpan={3} className="h-24 text-center text-foreground-muted">
              Todavia no hay productos registrados en esta bodega.
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  ),
};
