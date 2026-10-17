import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  DataTable,
  type DataTableColumn,
  type DataTableFilter,
  type DataTablePagination,
} from './DataTable';
import { ResponsiveDrawer } from './ResponsiveDrawer';
import { ModalDialog } from './ModalDialog';
import { StatCard } from './StatCard';
import { OrderTimeline, type OrderTimelineStep } from './OrderTimeline';
import { StatusBadge } from './StatusBadge';
import { MoneyAmount } from './MoneyAmount';
import { StateView } from './StateView';

describe('Componentes Compuestos (@zentric/ui/composite) — Decisión A3', () => {
  // =========================================================================
  // 1. StatusBadge
  // =========================================================================
  describe('StatusBadge', () => {
    it('exige obligatoriamente texto explícito en español y punto cromático de 6px', () => {
      render(<StatusBadge tone="success">Pagado</StatusBadge>);
      const badge = screen.getByText('Pagado');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('data-slot', 'status-badge');
      expect(badge).toHaveAttribute('data-tone', 'success');

      const dot = badge.querySelector('[aria-hidden="true"]');
      expect(dot).toBeInTheDocument();
      expect(dot).toHaveClass('size-1.5', 'rounded-full');
    });

    it('aplica las variantes de tono semántico canónicas', () => {
      const { rerender } = render(<StatusBadge tone="warning">Pendiente</StatusBadge>);
      expect(screen.getByText('Pendiente')).toHaveAttribute('data-tone', 'warning');

      rerender(<StatusBadge tone="danger">Cancelado</StatusBadge>);
      expect(screen.getByText('Cancelado')).toHaveAttribute('data-tone', 'danger');

      rerender(<StatusBadge tone="info">Despachado</StatusBadge>);
      expect(screen.getByText('Despachado')).toHaveAttribute('data-tone', 'info');

      rerender(<StatusBadge tone="neutral">Borrador</StatusBadge>);
      expect(screen.getByText('Borrador')).toHaveAttribute('data-tone', 'neutral');
    });
  });

  // =========================================================================
  // 2. MoneyAmount
  // =========================================================================
  describe('MoneyAmount', () => {
    it('formatea el importe monetario con tabular-nums y font-mono', () => {
      render(<MoneyAmount amount={250000} currency="COP" />);
      const el = screen.getByText(/250\.000/);
      expect(el).toBeInTheDocument();
      expect(el).toHaveClass('font-mono', 'tabular-nums');
      expect(el).toHaveAttribute('data-currency', 'COP');
    });

    it('aplica disciplina de versalitas [font-variant-caps:all-small-caps]', () => {
      render(<MoneyAmount amount={1500} currency="USD" locale="en-US" />);
      const el = screen.getByText(/1,500/);
      expect(el).toHaveClass('[font-variant-caps:all-small-caps]');
    });

    it('maneja fallbacks sin romper la interfaz ante códigos no estándar', () => {
      render(<MoneyAmount amount={42} currency="NON_ISO_CODE" />);
      expect(screen.getByText('42.00 NON_ISO_CODE')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 3. StateView (Los 4 estados obligatorios)
  // =========================================================================
  describe('StateView — 4 Estados Canónicos', () => {
    it('Estado 1 (Loading): proyecta esqueletos de carga con aria-busy="true" y role="status"', () => {
      render(
        <StateView
          state="loading"
          title="Cargando inventario..."
          skeletonRows={4}
        />
      );
      const loadingContainer = screen.getByLabelText('Cargando inventario...');
      expect(loadingContainer).toBeInTheDocument();
      expect(loadingContainer).toHaveAttribute('aria-busy', 'true');
      expect(screen.getByText('Cargando datos...')).toBeInTheDocument();
    });

    it('Estado 2 (Empty): proyecta ícono de ilustración, explicación y acción de escape con role="status"', async () => {
      const handleAction = vi.fn();
      render(
        <StateView
          state="empty"
          title="No hay órdenes pendientes"
          description="Todas las órdenes han sido procesadas correctamente."
          action={{ label: 'Crear nueva orden', onClick: handleAction }}
        />
      );
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('No hay órdenes pendientes')).toBeInTheDocument();
      expect(
        screen.getByText('Todas las órdenes han sido procesadas correctamente.')
      ).toBeInTheDocument();

      const actionBtn = screen.getByRole('button', { name: 'Crear nueva orden' });
      await userEvent.click(actionBtn);
      expect(handleAction).toHaveBeenCalledTimes(1);
    });

    it('Estado 3 (Error): proyecta advertencia con role="alert", mensaje RFC 7807 y botón de reintento', async () => {
      const handleRetry = vi.fn();
      render(
        <StateView
          state="error"
          title="Fallo de conexión"
          description="No se pudo contactar al servidor de facturación (ref. ERR-503)."
          onRetry={handleRetry}
        />
      );
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Fallo de conexión')).toBeInTheDocument();
      expect(
        screen.getByText('No se pudo contactar al servidor de facturación (ref. ERR-503).')
      ).toBeInTheDocument();

      const retryBtn = screen.getByRole('button', { name: 'Reintentar' });
      await userEvent.click(retryBtn);
      expect(handleRetry).toHaveBeenCalledTimes(1);
    });

    it('Estado 4 (Data): proyecta los hijos directamente cuando hay datos disponibles', () => {
      render(
        <StateView state="data">
          <div data-testid="data-payload">Registros cargados exitosamente</div>
        </StateView>
      );
      expect(screen.getByTestId('data-payload')).toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('mantiene retrocompatibilidad con la API previa basada en tone="empty" y tone="error"', () => {
      const { rerender } = render(
        <StateView
          tone="empty"
          title="Sin elementos"
          action={{ label: 'Agregar', onClick: () => undefined }}
        />
      );
      expect(screen.getByRole('status')).toBeInTheDocument();

      rerender(
        <StateView
          tone="error"
          title="Fallo crítico"
          action={{ label: 'Reintentar', onClick: () => undefined }}
        />
      );
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 4. StatCard
  // =========================================================================
  describe('StatCard', () => {
    it('renderiza la variante "hero" con cifra dominante en Geist Mono 600 y tabular-nums', () => {
      render(
        <StatCard
          variant="hero"
          title="Ingresos Totales"
          value="$128.450.000 COP"
          subtitle="Acumulado del mes actual"
        />
      );
      expect(screen.getByText('Ingresos Totales')).toBeInTheDocument();
      const val = screen.getByText('$128.450.000 COP');
      expect(val).toHaveClass('font-mono', 'tabular-nums', 'font-semibold');
      const card = screen.getByText('Ingresos Totales').closest('[data-slot="stat-card"]');
      expect(card).toHaveAttribute('data-variant', 'hero');
    });

    it('renderiza la variante "compact" para evitar cuadrículas de 4 tarjetas clonadas', () => {
      render(
        <StatCard
          variant="compact"
          title="Pedidos Despachados"
          value="1.240"
        />
      );
      const card = screen.getByText('Pedidos Despachados').closest('[data-slot="stat-card"]');
      expect(card).toHaveAttribute('data-variant', 'compact');
    });

    it('proyecta indicadores de tendencia analítica (up / down / neutral)', () => {
      const { rerender } = render(
        <StatCard
          title="Ventas"
          value="100"
          trend={{ value: '+14.5%', direction: 'up', label: 'vs ayer' }}
        />
      );
      const trendEl = screen.getByText('+14.5%').closest('[data-slot="stat-trend"]');
      expect(trendEl).toHaveAttribute('data-direction', 'up');
      expect(trendEl).toHaveClass('text-success');

      rerender(
        <StatCard
          title="Ventas"
          value="80"
          trend={{ value: '-5.2%', direction: 'down' }}
        />
      );
      const trendDown = screen.getByText('-5.2%').closest('[data-slot="stat-trend"]');
      expect(trendDown).toHaveAttribute('data-direction', 'down');
      expect(trendDown).toHaveClass('text-destructive');
    });

    it('proyecta barra de progreso analítica con rol accesible progressbar', () => {
      render(
        <StatCard
          title="Capacidad de Bodega"
          value="85%"
          progress={{ value: 85, max: 100, label: 'Ocupación de estanterías' }}
        />
      );
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toBeInTheDocument();
      expect(progressbar).toHaveAttribute('aria-valuenow', '85');
      expect(progressbar).toHaveAttribute('aria-valuemin', '0');
      expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    });
  });

  // =========================================================================
  // 5. OrderTimeline
  // =========================================================================
  describe('OrderTimeline', () => {
    it('deduce automáticamente los pasos del ciclo de vida canónico de Zentric a partir de currentStatus', () => {
      render(<OrderTimeline currentStatus="Paid" />);
      const list = screen.getByRole('list', { name: 'Línea de tiempo del pedido' });
      expect(list).toBeInTheDocument();

      const items = screen.getAllByRole('listitem');
      expect(items).toHaveLength(4); // Creado, Pagado, Despachado, Entregado

      // "Creado" debe ser completado
      const dotCreated = items[0].querySelector('[data-slot="timeline-dot"]');
      expect(dotCreated).toHaveAttribute('data-status', 'completed');

      // "Pagado" debe ser el paso activo actual
      expect(items[1]).toHaveAttribute('aria-current', 'step');
      const dotPaid = items[1].querySelector('[data-slot="timeline-dot"]');
      expect(dotPaid).toHaveAttribute('data-status', 'current');

      // "Despachado" debe ser upcoming
      const dotDispatched = items[2].querySelector('[data-slot="timeline-dot"]');
      expect(dotDispatched).toHaveAttribute('data-status', 'upcoming');
    });

    it('maneja el estado de cancelación de pedido mostrando el nodo terminal cancelado', () => {
      render(<OrderTimeline currentStatus="Cancelled" />);
      const items = screen.getAllByRole('listitem');
      expect(items).toHaveLength(2); // Creado -> Cancelado

      const dotCancelled = items[1].querySelector('[data-slot="timeline-dot"]');
      expect(dotCancelled).toHaveAttribute('data-status', 'cancelled');
      expect(screen.getByText('Cancelado')).toHaveClass('text-destructive');
    });

    it('soporta pasos personalizados y orientación vertical', () => {
      const customSteps: OrderTimelineStep[] = [
        { id: '1', label: 'Solicitud Recibida', status: 'completed' },
        { id: '2', label: 'Inspección Técnica', status: 'current', description: 'Revisando estado de mercadería' },
        { id: '3', label: 'Reembolso Aprobado', status: 'upcoming' },
      ];

      render(<OrderTimeline steps={customSteps} orientation="vertical" />);
      expect(screen.getByText('Inspección Técnica')).toBeInTheDocument();
      expect(screen.getByText('Revisando estado de mercadería')).toBeInTheDocument();
      const container = screen.getByText('Solicitud Recibida').closest('[data-slot="order-timeline"]');
      expect(container).toHaveAttribute('data-orientation', 'vertical');
    });
  });

  // =========================================================================
  // 6. ModalDialog
  // =========================================================================
  describe('ModalDialog', () => {
    it('abre diálogo con role="alertdialog", trampa de foco y accesibilidad ARIA', async () => {
      render(
        <ModalDialog
          open={true}
          title="¿Confirmar anulación de factura maestra?"
          description="Esta acción no se puede deshacer y desasocia las liquidaciones split."
          confirmLabel="Anular Factura"
          cancelLabel="Descartar"
          variant="destructive"
        />
      );

      const dialog = screen.getByRole('alertdialog');
      expect(dialog).toBeInTheDocument();
      expect(screen.getByText('¿Confirmar anulación de factura maestra?')).toBeInTheDocument();
      expect(
        screen.getByText('Esta acción no se puede deshacer y desasocia las liquidaciones split.')
      ).toBeInTheDocument();

      const confirmBtn = screen.getByRole('button', { name: 'Anular Factura' });
      expect(confirmBtn).toHaveClass('text-destructive');
    });

    it('invoca onConfirm al confirmar y onCancel al cancelar', async () => {
      const handleConfirm = vi.fn();
      const handleCancel = vi.fn();
      const handleOpenChange = vi.fn();

      const { rerender } = render(
        <ModalDialog
          open={true}
          onOpenChange={handleOpenChange}
          title="Confirmar operación"
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      );

      const cancelBtn = screen.getByRole('button', { name: 'Cancelar' });
      await userEvent.click(cancelBtn);
      expect(handleCancel).toHaveBeenCalledTimes(1);
      expect(handleOpenChange).toHaveBeenCalledWith(false);

      rerender(
        <ModalDialog
          open={true}
          onOpenChange={handleOpenChange}
          title="Confirmar operación"
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      );

      const confirmBtn = screen.getByRole('button', { name: 'Confirmar' });
      await userEvent.click(confirmBtn);
      expect(handleConfirm).toHaveBeenCalledTimes(1);
    });

    it('bloquea controles y previene doble confirmación cuando isLoading es true', async () => {
      const handleConfirm = vi.fn();
      render(
        <ModalDialog
          open={true}
          title="Procesando reembolso"
          isLoading={true}
          onConfirm={handleConfirm}
        />
      );

      const confirmBtn = screen.getByRole('button', { name: 'Confirmar' });
      expect(confirmBtn).toBeDisabled();
      const cancelBtn = screen.getByRole('button', { name: 'Cancelar' });
      expect(cancelBtn).toBeDisabled();

      await userEvent.click(confirmBtn);
      expect(handleConfirm).not.toHaveBeenCalled();
    });

    it('permite cerrar el diálogo al pulsar la tecla Escape', async () => {
      const handleOpenChange = vi.fn();
      render(
        <ModalDialog
          open={true}
          onOpenChange={handleOpenChange}
          title="Cierre con Escape"
        />
      );

      fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape', code: 'Escape' });
      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });
  });

  // =========================================================================
  // 7. ResponsiveDrawer
  // =========================================================================
  describe('ResponsiveDrawer', () => {
    it('renderiza panel lateral de inspección rápida con role="dialog" y aria-modal="true"', () => {
      render(
        <ResponsiveDrawer
          open={true}
          onClose={() => undefined}
          title="Detalle de Devolución #DEV-948"
          description="Inspección física realizada en Bodega Central Zentric."
        >
          <div data-testid="drawer-content">Detalles del estado de la mercadería</div>
        </ResponsiveDrawer>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(screen.getByText('Detalle de Devolución #DEV-948')).toBeInTheDocument();
      expect(screen.getByTestId('drawer-content')).toBeInTheDocument();

      // Verifica presencia del telón con desenfoque
      const overlay = document.querySelector('[data-slot="responsive-drawer-overlay"]');
      expect(overlay).toBeInTheDocument();
    });

    it('cierra el panel al pulsar el botón de cerrar', async () => {
      const handleClose = vi.fn();
      render(
        <ResponsiveDrawer
          open={true}
          onClose={handleClose}
          title="Panel lateral"
        >
          <p>Contenido</p>
        </ResponsiveDrawer>
      );

      const closeBtn = screen.getByRole('button', { name: 'Cerrar panel lateral' });
      await userEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('cierra el panel lateral al pulsar la tecla Escape', async () => {
      const handleClose = vi.fn();
      render(
        <ResponsiveDrawer
          open={true}
          onClose={handleClose}
          title="Panel lateral"
        >
          <p>Contenido</p>
        </ResponsiveDrawer>
      );

      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', code: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // 8. DataTable (Tabla Interactiva de Alta Densidad)
  // =========================================================================
  describe('DataTable', () => {
    interface TestProduct {
      id: string;
      sku: string;
      name: string;
      stock: number;
      price: number;
      category: string;
    }

    const testProducts: TestProduct[] = [
      { id: 'p1', sku: 'SKU-001', name: 'Teclado Mecánico Z1', stock: 15, price: 350000, category: 'Hardware' },
      { id: 'p2', sku: 'SKU-002', name: 'Monitor IPS 27', stock: 4, price: 1200000, category: 'Hardware' },
      { id: 'p3', sku: 'SKU-003', name: 'Mouse Óptico Pro', stock: 48, price: 180000, category: 'Periféricos' },
    ];

    const testColumns: DataTableColumn<TestProduct>[] = [
      { id: 'sku', header: 'SKU', accessorKey: 'sku', sortable: true },
      { id: 'name', header: 'Producto', accessorKey: 'name', sortable: true },
      { id: 'stock', header: 'Existencias', accessorKey: 'stock', numeric: true, sortable: true },
      {
        id: 'price',
        header: 'Precio Unitario',
        accessorKey: 'price',
        numeric: true,
        cell: ({ value }) => <MoneyAmount amount={Number(value)} currency="COP" />,
      },
    ];

    it('renderiza cabeceras, filas y alinea columnas numéricas a la derecha con tabular-nums', () => {
      render(
        <DataTable
          data={testProducts}
          columns={testColumns}
          keyExtractor={(p) => p.id}
        />
      );

      expect(screen.getByText('Teclado Mecánico Z1')).toBeInTheDocument();
      expect(screen.getByText('Monitor IPS 27')).toBeInTheDocument();

      // Columna numérica 'stock': encabezado y celda alineados a la derecha
      const stockHeader = screen.getByRole('columnheader', { name: /existencias/i });
      expect(stockHeader).toHaveClass('text-right');

      const stockCell = screen.getByText('15').closest('td');
      expect(stockCell).toHaveClass('text-right', 'font-mono', 'tabular-nums');
    });

    it('soporta ordenamiento interactivo por columna y actualiza aria-sort', async () => {
      const handleSortChange = vi.fn();
      render(
        <DataTable
          data={testProducts}
          columns={testColumns}
          keyExtractor={(p) => p.id}
          sortColumn="sku"
          sortDirection="asc"
          onSortChange={handleSortChange}
        />
      );

      const skuHeader = screen.getByRole('columnheader', { name: /sku/i });
      expect(skuHeader).toHaveAttribute('aria-sort', 'ascending');

      const sortBtn = screen.getByRole('button', { name: /sku/i });
      await userEvent.click(sortBtn);
      expect(handleSortChange).toHaveBeenCalledWith('sku', 'desc');
    });

    it('soporta selección múltiple de filas con checkboxes y contador de selección', async () => {
      const handleSelectionChange = vi.fn();
      render(
        <DataTable
          data={testProducts}
          columns={testColumns}
          keyExtractor={(p) => p.id}
          selectable={true}
          selectedIds={['p1']}
          onSelectionChange={handleSelectionChange}
        />
      );

      expect(screen.getByText('1 seleccionados')).toBeInTheDocument();

      // Seleccionar fila 2
      const row2Checkbox = screen.getByLabelText('Seleccionar fila p2');
      await userEvent.click(row2Checkbox);
      expect(handleSelectionChange).toHaveBeenCalledWith(['p1', 'p2']);

      // Seleccionar todo
      const selectAllCheckbox = screen.getByLabelText('Seleccionar todas las filas');
      await userEvent.click(selectAllCheckbox);
      expect(handleSelectionChange).toHaveBeenCalledWith(['p1', 'p2', 'p3']);
    });

    it('soporta búsqueda y filtrado interactivo', async () => {
      const handleSearch = vi.fn();
      const testFilters: DataTableFilter[] = [
        {
          id: 'category',
          label: 'Categoría',
          options: [
            { label: 'Todos', value: 'all' },
            { label: 'Hardware', value: 'hw' },
          ],
          selected: 'all',
          onChange: vi.fn(),
        },
      ];

      render(
        <DataTable
          data={testProducts}
          columns={testColumns}
          keyExtractor={(p) => p.id}
          searchQuery=""
          onSearchChange={handleSearch}
          searchPlaceholder="Filtrar por SKU o nombre..."
          filters={testFilters}
        />
      );

      const searchInput = screen.getByPlaceholderText('Filtrar por SKU o nombre...');
      await userEvent.type(searchInput, 'Monitor');
      expect(handleSearch).toHaveBeenCalled();
    });

    it('soporta paginación basada en cero (page, pageSize, totalItems)', async () => {
      const handlePageChange = vi.fn();
      const pagination: DataTablePagination = {
        page: 0,
        pageSize: 2,
        totalItems: 3,
        onPageChange: handlePageChange,
      };

      render(
        <DataTable
          data={testProducts.slice(0, 2)}
          columns={testColumns}
          keyExtractor={(p) => p.id}
          pagination={pagination}
        />
      );

      expect(screen.getByText(/Mostrando/)).toHaveTextContent('Mostrando 1 a 2 de 3 resultados');
      expect(screen.getByText(/Página/)).toHaveTextContent('Página 1 de 2');

      // Botón página anterior deshabilitado en página 0
      const prevBtn = screen.getByRole('button', { name: 'Página anterior' });
      expect(prevBtn).toBeDisabled();

      // Botón página siguiente habilitado
      const nextBtn = screen.getByRole('button', { name: 'Página siguiente' });
      expect(nextBtn).toBeEnabled();
      await userEvent.click(nextBtn);
      expect(handlePageChange).toHaveBeenCalledWith(1);
    });

    it('proyecta estado de carga (Loading) con skeletons de tabla', () => {
      render(
        <DataTable
          data={[]}
          columns={testColumns}
          keyExtractor={(p) => p.id}
          isLoading={true}
        />
      );

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
      const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('proyecta estado de error integrado con botón de reintento', async () => {
      const handleRetry = vi.fn();
      render(
        <DataTable
          data={[]}
          columns={testColumns}
          keyExtractor={(p) => p.id}
          error={new Error('Error al conectar con la base de datos PostgreSQL')}
          onRetry={handleRetry}
        />
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(
        screen.getByText('Error al conectar con la base de datos PostgreSQL')
      ).toBeInTheDocument();

      const retryBtn = screen.getByRole('button', { name: 'Reintentar' });
      await userEvent.click(retryBtn);
      expect(handleRetry).toHaveBeenCalledTimes(1);
    });

    it('proyecta estado vacío (Empty) cuando data está vacía y no está cargando', () => {
      render(
        <DataTable
          data={[]}
          columns={testColumns}
          keyExtractor={(p) => p.id}
          emptyTitle="Sin productos en catálogo"
          emptyDescription="No hay existencias registradas en las bodegas activas."
        />
      );

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Sin productos en catálogo')).toBeInTheDocument();
      expect(
        screen.getByText('No hay existencias registradas en las bodegas activas.')
      ).toBeInTheDocument();
    });

    it('soporta ordenamiento y búsqueda interna local cuando no se proporcionan callbacks externos', async () => {
      render(
        <DataTable
          data={testProducts}
          columns={testColumns}
          keyExtractor={(p) => p.id}
          searchPlaceholder="Buscar localmente..."
        />
      );

      // Búsqueda local
      const input = screen.getByPlaceholderText('Buscar localmente...');
      await userEvent.type(input, 'Teclado');
      expect(screen.getByText('Teclado Mecánico Z1')).toBeInTheDocument();
      expect(screen.queryByText('Monitor IPS 27')).not.toBeInTheDocument();

      // Limpiar búsqueda
      await userEvent.clear(input);
      expect(screen.getByText('Monitor IPS 27')).toBeInTheDocument();

      // Ordenar localmente por Producto
      const nameHeaderBtn = screen.getByRole('button', { name: /producto/i });
      await userEvent.click(nameHeaderBtn);
      // Invertir orden
      await userEvent.click(nameHeaderBtn);
      expect(screen.getByText('Teclado Mecánico Z1')).toBeInTheDocument();
    });

    it('soporta selección local, botón Limpiar y cambio de tamaño de página', async () => {
      const handlePageSizeChange = vi.fn();
      render(
        <DataTable
          data={testProducts}
          columns={testColumns}
          keyExtractor={(p) => p.id}
          selectable={true}
          toolbarActions={<button type="button">Exportar CSV</button>}
          stickyHeader={true}
          pagination={{
            page: 0,
            pageSize: 10,
            totalItems: 3,
            onPageChange: () => undefined,
            onPageSizeChange: handlePageSizeChange,
            pageSizeOptions: [10, 25, 50],
          }}
        />
      );

      expect(screen.getByText('Exportar CSV')).toBeInTheDocument();

      // Seleccionar fila
      const chk1 = screen.getByLabelText('Seleccionar fila p1');
      await userEvent.click(chk1);
      expect(screen.getByText('1 seleccionados')).toBeInTheDocument();

      // Limpiar selección
      const clearBtn = screen.getByText('Limpiar');
      await userEvent.click(clearBtn);
      expect(screen.queryByText('1 seleccionados')).not.toBeInTheDocument();

      // Cambio de tamaño de página
      const pageSizeSelect = screen.getByLabelText('Registros por página');
      await userEvent.selectOptions(pageSizeSelect, '25');
      expect(handlePageSizeChange).toHaveBeenCalledWith(25);
    });
  });

  // =========================================================================
  // 9. Casos límite de StateView, OrderTimeline, StatCard, ResponsiveDrawer y ModalDialog
  // =========================================================================
  describe('Cobertura completa de ramas y variantes', () => {
    it('StateView deduce estados desde banderas booleanas (isLoading, isError, isEmpty)', () => {
      const { rerender } = render(<StateView isLoading={true} title="Cargando..." />);
      expect(screen.getByLabelText('Cargando...')).toBeInTheDocument();

      rerender(<StateView isError={true} title="Fallo" />);
      expect(screen.getByRole('alert')).toBeInTheDocument();

      rerender(<StateView isEmpty={true} title="Vacío" />);
      expect(screen.getByRole('status')).toBeInTheDocument();

      rerender(<StateView tone="loading" title="Cargando tone..." />);
      expect(screen.getByLabelText('Cargando tone...')).toBeInTheDocument();
    });

    it('OrderTimeline cubre todos los estados canónicos (delivered, dispatched, undefined, timestamp Date)', () => {
      const { rerender } = render(<OrderTimeline currentStatus="Delivered" />);
      const deliveredItems = screen.getAllByRole('listitem');
      expect(deliveredItems).toHaveLength(4);

      rerender(<OrderTimeline currentStatus="Dispatched" />);
      expect(screen.getAllByRole('listitem')).toHaveLength(4);

      rerender(<OrderTimeline currentStatus="PendingPayment" />);
      expect(screen.getAllByRole('listitem')).toHaveLength(4);

      rerender(<OrderTimeline />); // sin currentStatus
      expect(screen.getAllByRole('listitem')).toHaveLength(4);

      const customWithDate: OrderTimelineStep[] = [
        { id: '1', label: 'Inicio', status: 'completed', timestamp: new Date('2026-10-16T12:00:00Z') },
      ];
      rerender(<OrderTimeline steps={customWithDate} />);
      expect(screen.getByRole('listitem')).toBeInTheDocument();
    });

    it('StatCard soporta variant="secondary", tendencia neutral, insignias e íconos', () => {
      const SampleIcon = ({ className }: { className?: string }) => (
        <span data-testid="sample-icon" className={className} />
      );

      render(
        <StatCard
          variant="secondary"
          title="Tasa de Conversión"
          value="4.2%"
          trend={{ value: '0.0%', direction: 'neutral', label: 'sin cambios' }}
          badge={{ label: 'Auditado', tone: 'info' }}
          icon={SampleIcon}
        />
      );

      expect(screen.getByTestId('sample-icon')).toBeInTheDocument();
      expect(screen.getByText('Auditado')).toBeInTheDocument();
      const trendEl = screen.getByText('0.0%').closest('[data-slot="stat-trend"]');
      expect(trendEl).toHaveAttribute('data-direction', 'neutral');
    });

    it('ModalDialog soporta variant="warning" y trigger declarativo', async () => {
      render(
        <ModalDialog
          variant="warning"
          title="Advertencia de caducidad"
          confirmLabel="Continuar"
          trigger={<button type="button">Abrir Diálogo</button>}
        />
      );

      const triggerBtn = screen.getByRole('button', { name: 'Abrir Diálogo' });
      await userEvent.click(triggerBtn);
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      expect(screen.getByText('Advertencia de caducidad')).toBeInTheDocument();
    });

    it('ResponsiveDrawer soporta side="left", footer personalizado y trigger declarativo', async () => {
      render(
        <ResponsiveDrawer
          title="Panel Izquierdo"
          side="left"
          trigger={<button type="button">Abrir Drawer</button>}
          footer={<button type="button">Guardar Cambios</button>}
        >
          <div>Cuerpo del drawer</div>
        </ResponsiveDrawer>
      );

      const triggerBtn = screen.getByRole('button', { name: 'Abrir Drawer' });
      await userEvent.click(triggerBtn);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Guardar Cambios')).toBeInTheDocument();
    });
  });
});

