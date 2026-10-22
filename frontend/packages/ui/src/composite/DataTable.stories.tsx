import type { Meta, StoryObj } from '@storybook/react';

import { DataTable, type DataTableColumn } from './DataTable';
import { StatusBadge } from './StatusBadge';

/**
 * Catalogo del compuesto `DataTable` (Frontend-Design-System 5.3).
 *
 * Contrato real de columnas: `id`, `header`, `accessorKey`, `numeric`,
 * `sortable` y `cell({ row, value, index })`. Las celdas numericas se alinean
 * a la derecha en Geist Mono con cifras tabulares (5.3).
 */
interface PedidoRow {
  id: string;
  referencia: string;
  comprador: string;
  estado: string;
  total: number;
  articulos: number;
}

const columnas: DataTableColumn<PedidoRow>[] = [
  { id: 'referencia', header: 'Pedido', accessorKey: 'referencia', sortable: true },
  { id: 'comprador', header: 'Comprador', accessorKey: 'comprador', sortable: true },
  {
    id: 'estado',
    header: 'Estado',
    accessorKey: 'estado',
    cell: ({ value }: { value: unknown; row: PedidoRow; index: number }) => (
      <StatusBadge
        tone={value === 'Cancelado' ? 'danger' : value === 'Entregado' ? 'success' : 'info'}
      >
        {String(value)}
      </StatusBadge>
    ),
  },
  { id: 'articulos', header: 'Articulos', accessorKey: 'articulos', numeric: true, sortable: true },
  {
    id: 'total',
    header: 'Total (COP)',
    accessorKey: 'total',
    numeric: true,
    cell: ({ value }: { value: unknown; row: PedidoRow; index: number }) =>
      `$${Number(value).toLocaleString('es-CO')}`,
  },
];

const pedidos: PedidoRow[] = [
  {
    id: 'a1b2c3d4-0001',
    referencia: 'Pedido #A1B2C3D4',
    comprador: 'comprador@zentric.co',
    estado: 'Pendiente de pago',
    total: 2_180_000,
    articulos: 3,
  },
  {
    id: 'b2c3d4e5-0002',
    referencia: 'Pedido #B2C3D4E5',
    comprador: 'compras@andina.co',
    estado: 'Despachado',
    total: 12_450_000,
    articulos: 7,
  },
  {
    id: 'c3d4e5f6-0003',
    referencia: 'Pedido #C3D4E5F6',
    comprador: 'logistica@andina.co',
    estado: 'Entregado',
    total: 890_000,
    articulos: 1,
  },
  {
    id: 'd4e5f6a7-0004',
    referencia: 'Pedido #D4E5F6A7',
    comprador: 'compras@caribe.co',
    estado: 'Cancelado',
    total: 4_320_000,
    articulos: 2,
  },
];

/**
 * Instanciacion concreta: Storybook necesita el tipo ya cerrado, porque
 * `Meta<typeof DataTable>` deja el parametro generico en `unknown` y las
 * columnas tipadas no encajan.
 */
const PedidoDataTable = DataTable<PedidoRow>;

const meta = {
  title: 'Design System/Composite/DataTable',
  component: PedidoDataTable,
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
} satisfies Meta<typeof PedidoDataTable>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Tabla de pedidos con el contrato real de columnas. */
export const Default: Story = {
  args: {
    data: pedidos,
    columns: columnas,
    keyExtractor: (row: PedidoRow) => row.id,
  },
};

/** Con paginacion basada en el total de items del servidor (base cero). */
export const WithPagination: Story = {
  args: {
    data: pedidos,
    columns: columnas,
    keyExtractor: (row: PedidoRow) => row.id,
    pagination: { page: 1, pageSize: 2, totalItems: 10, onPageChange: () => {} },
  },
};

/** Con busqueda y seleccion multiple habilitadas. */
export const WithSearchAndSelection: Story = {
  args: {
    data: pedidos,
    columns: columnas,
    keyExtractor: (row: PedidoRow) => row.id,
    searchPlaceholder: 'Buscar por referencia o comprador...',
    selectable: true,
    onSelectionChange: () => {},
  },
};

/** Tabla sin datos: la vista debe explicar la ausencia, no quedar muda. */
export const EmptyData: Story = {
  args: {
    data: [],
    columns: columnas,
    keyExtractor: (row: PedidoRow) => row.id,
    emptyTitle: 'Sin pedidos en el rango',
    emptyDescription: 'No hay pedidos que coincidan con los criterios actuales.',
  },
};

/** Estado de carga: esqueletos con la dimension de la fila final. */
export const Loading: Story = {
  args: {
    data: [],
    columns: columnas,
    keyExtractor: (row: PedidoRow) => row.id,
    isLoading: true,
  },
};

/** Estado de error con accion de reintento. */
export const WithError: Story = {
  args: {
    data: [],
    columns: columnas,
    keyExtractor: (row: PedidoRow) => row.id,
    error: new Error('Error al conectar con la base de datos PostgreSQL'),
    onRetry: () => {},
  },
};
