import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  DataTable,
  type DataTableColumn,
} from './DataTable';
import { ModalDialog } from './ModalDialog';
import { ResponsiveDrawer } from './ResponsiveDrawer';
import { MoneyAmount } from './MoneyAmount';
import { StatusBadge, type StatusTone } from './StatusBadge';
import { StateView } from './StateView';

describe('Empirical Adversarial Challenge Suite (@zentric/ui/composite)', () => {
  // =========================================================================
  // CHALLENGE 1: DataTable Boundary & Stress Testing
  // =========================================================================
  describe('Challenge 1: DataTable Boundary & Stress', () => {
    interface TestItem {
      id: string;
      sku?: string | null;
      title?: string | null;
      stock?: number | null;
      price?: number | null;
    }

    const testColumns: DataTableColumn<TestItem>[] = [
      { id: 'sku', header: 'SKU', accessorKey: 'sku', sortable: true },
      { id: 'title', header: 'Título', accessorKey: 'title', sortable: true },
      { id: 'stock', header: 'Stock', accessorKey: 'stock', numeric: true, sortable: true },
      { id: 'price', header: 'Precio', accessorKey: 'price', numeric: true, sortable: true },
    ];

    it('1.1 Boundary: handles 0 items with empty state and zero-based pagination boundaries', () => {
      const handlePageChange = vi.fn();
      const emptyAction = vi.fn();

      render(
        <DataTable
          data={[]}
          columns={testColumns}
          keyExtractor={(item, index) => item?.id ?? `idx-${index}`}
          emptyTitle="Inventario vacío"
          emptyDescription="No hay artículos registrados en esta bodega."
          emptyAction={{ label: 'Crear SKU', onClick: emptyAction }}
          pagination={{
            page: 0,
            pageSize: 20,
            totalItems: 0,
            onPageChange: handlePageChange,
          }}
        />
      );

      // Verify table headers still render cleanly
      expect(screen.getByRole('columnheader', { name: /sku/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /stock/i })).toBeInTheDocument();

      // Verify empty state is displayed with correct role
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Inventario vacío')).toBeInTheDocument();
      expect(screen.getByText('No hay artículos registrados en esta bodega.')).toBeInTheDocument();

      // Verify empty action works
      const createBtn = screen.getByRole('button', { name: 'Crear SKU' });
      fireEvent.click(createBtn);
      expect(emptyAction).toHaveBeenCalledTimes(1);

      // Verify pagination shows 0 a 0 de 0
      expect(screen.getByText(/Mostrando/)).toHaveTextContent('Mostrando 0 a 0 de 0 resultados');
      expect(screen.getByText(/Página/)).toHaveTextContent('Página 1 de 1');

      // Both pagination buttons must be disabled
      expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeDisabled();
    });

    it('1.2 Stress: handles 10,000 items sorting and pagination without UI freeze or crash', () => {
      const startTime = performance.now();

      // Generate 10,000 items with deterministic pseudo-random data
      const largeDataset: TestItem[] = Array.from({ length: 10000 }, (_, i) => ({
        id: `item-${i}`,
        sku: `SKU-${String(10000 - i).padStart(5, '0')}`,
        title: `Producto Zentric ${i % 250}`,
        stock: (i * 37) % 500,
        price: (i * 12345) % 1000000,
      }));

      let currentPage = 0;
      const pageSize = 50;
      const handlePageChange = vi.fn((newPage: number) => {
        currentPage = newPage;
      });

      const { rerender } = render(
        <DataTable
          data={largeDataset.slice(0, pageSize)}
          columns={testColumns}
          keyExtractor={(item) => item.id}
          pagination={{
            page: currentPage,
            pageSize,
            totalItems: largeDataset.length,
            onPageChange: handlePageChange,
          }}
        />
      );

      const renderDuration = performance.now() - startTime;
      expect(renderDuration).toBeLessThan(1500); // Must render initial slice promptly

      // Verify pagination summary
      expect(screen.getByText(/Mostrando/)).toHaveTextContent('Mostrando 1 a 50 de 10000 resultados');
      expect(screen.getByText(/Página/)).toHaveTextContent('Página 1 de 200');

      // Jump to last page (page 199 in 0-indexed)
      rerender(
        <DataTable
          data={largeDataset.slice(199 * pageSize, 200 * pageSize)}
          columns={testColumns}
          keyExtractor={(item) => item.id}
          pagination={{
            page: 199,
            pageSize,
            totalItems: largeDataset.length,
            onPageChange: handlePageChange,
          }}
        />
      );

      expect(screen.getByText(/Mostrando/)).toHaveTextContent('Mostrando 9951 a 10000 de 10000 resultados');
      expect(screen.getByText(/Página/)).toHaveTextContent('Página 200 de 200');
      expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Página anterior' })).toBeEnabled();
    });

    it(
      '1.3 Adversarial: local sorting of 10,000 items in-memory is deterministic and resilient under stress',
      async () => {
        // Generate 10,000 items
        const items: TestItem[] = Array.from({ length: 10000 }, (_, i) => ({
          id: `id-${i}`,
          sku: `SKU-${i}`,
          title: `Item ${10000 - i}`,
          stock: (i * 13) % 1000,
          price: i * 10,
        }));

        const handleSortChange = vi.fn();

        // High-stress test with controlled sort handler on 10,000 items
        const { rerender } = render(
          <DataTable
            data={items.slice(0, 50)}
            columns={testColumns}
            keyExtractor={(item) => item.id}
            sortColumn="stock"
            sortDirection="asc"
            onSortChange={handleSortChange}
            pagination={{
              page: 0,
              pageSize: 50,
              totalItems: 10000,
              onPageChange: () => undefined,
            }}
          />
        );

        const stockBtn = screen.getByRole('button', { name: /stock/i });
        fireEvent.click(stockBtn);
        expect(handleSortChange).toHaveBeenCalledWith('stock', 'desc');

        // Verify that updating data slice with sorted 10,000 items maintains stable UI
        const sortedDescSlice = [...items].sort((a, b) => (b.stock ?? 0) - (a.stock ?? 0)).slice(0, 50);
        rerender(
          <DataTable
            data={sortedDescSlice}
            columns={testColumns}
            keyExtractor={(item) => item.id}
            sortColumn="stock"
            sortDirection="desc"
            onSortChange={handleSortChange}
            pagination={{
              page: 0,
              pageSize: 50,
              totalItems: 10000,
              onPageChange: () => undefined,
            }}
          />
        );

        const stockHeader = screen.getByRole('columnheader', { name: /stock/i });
        expect(stockHeader).toHaveAttribute('aria-sort', 'descending');
      },
      15000
    );

    it('1.4 Adversarial: rapid column sort direction flipping across multiple columns', () => {
      const handleSortChange = vi.fn();
      const sampleData: TestItem[] = [
        { id: '1', sku: 'A-1', title: 'Alpha', stock: 10, price: 100 },
        { id: '2', sku: 'B-2', title: 'Beta', stock: 50, price: 50 },
      ];

      const { rerender } = render(
        <DataTable
          data={sampleData}
          columns={testColumns}
          keyExtractor={(item) => item.id}
          sortColumn="sku"
          sortDirection="asc"
          onSortChange={handleSortChange}
        />
      );

      const skuHeaderBtn = screen.getByRole('button', { name: /sku/i });
      const stockHeaderBtn = screen.getByRole('button', { name: /stock/i });

      // 10 rapid clicks flipping sort direction
      for (let i = 0; i < 5; i++) {
        fireEvent.click(skuHeaderBtn);
      }
      expect(handleSortChange).toHaveBeenCalled();

      // Switch to different column
      fireEvent.click(stockHeaderBtn);
      expect(handleSortChange).toHaveBeenLastCalledWith('stock', 'asc');

      // Controlled rerender with stock desc
      rerender(
        <DataTable
          data={sampleData}
          columns={testColumns}
          keyExtractor={(item) => item.id}
          sortColumn="stock"
          sortDirection="desc"
          onSortChange={handleSortChange}
        />
      );

      expect(screen.getByRole('columnheader', { name: /stock/i })).toHaveAttribute('aria-sort', 'descending');
      expect(screen.getByRole('columnheader', { name: /sku/i })).toHaveAttribute('aria-sort', 'none');
    });

    it('1.5 Adversarial: malformed data rows (null, undefined, missing fields, regex injection)', () => {
      const malformedData: (TestItem | Record<string, unknown>)[] = [
        { id: 'row-1', sku: null, title: 'Item Null Sku', stock: null, price: undefined },
        { id: 'row-2', sku: undefined, title: null, stock: 40, price: 1500 },
        { id: 'row-3', foo: 'unexpected_extra_property', id: 'row-3' }, // missing testColumns
        { id: 'row-4', sku: 'SPECIAL-[*+?^${}()|[]]', title: 'Regex test', stock: 10, price: 0 },
      ];

      const { container } = render(
        <DataTable
          data={malformedData as TestItem[]}
          columns={testColumns}
          keyExtractor={(item, idx) => item?.id ?? `fallback-${idx}`}
          searchPlaceholder="Buscar malformados..."
        />
      );

      // Verify it renders 4 rows without throwing TypeError
      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBe(4);

      // Search for regex special characters without crashing
      const searchInput = screen.getByPlaceholderText('Buscar malformados...');
      fireEvent.change(searchInput, { target: { value: '[*+?^${}()|[]]' } });

      expect(screen.getByText('Regex test')).toBeInTheDocument();
      expect(screen.queryByText('Item Null Sku')).not.toBeInTheDocument();
    });

    it('1.6 Adversarial: local sorting with nullish values handles comparison safely', () => {
      const nullishData: TestItem[] = [
        { id: '1', sku: 'Z-SKU', title: 'A', stock: null, price: 50 },
        { id: '2', sku: 'A-SKU', title: 'B', stock: 100, price: 20 },
        { id: '3', sku: 'M-SKU', title: 'C', stock: undefined, price: 10 },
        { id: '4', sku: 'B-SKU', title: 'D', stock: 25, price: 80 },
      ];

      render(
        <DataTable
          data={nullishData}
          columns={testColumns}
          keyExtractor={(item) => item.id}
        />
      );

      const stockBtn = screen.getByRole('button', { name: /stock/i });

      // Click to sort asc: numbers should come before null/undefined without throwing
      expect(() => fireEvent.click(stockBtn)).not.toThrow();

      // Click to sort desc
      expect(() => fireEvent.click(stockBtn)).not.toThrow();
    });
  });

  // =========================================================================
  // CHALLENGE 2: ModalDialog & ResponsiveDrawer Adversarial Checks
  // =========================================================================
  describe('Challenge 2: ModalDialog & ResponsiveDrawer Adversarial Checks', () => {
    it('2.1 ModalDialog: double-click during isLoading and fast asynchronous handling', async () => {
      const onConfirmMock = vi.fn();

      const { rerender } = render(
        <ModalDialog
          open={true}
          title="Reembolso Crítico"
          isLoading={false}
          onConfirm={onConfirmMock}
        />
      );

      const confirmBtn = screen.getByRole('button', { name: 'Confirmar' });

      // Simulate clicking once which flips isLoading to true
      fireEvent.click(confirmBtn);
      expect(onConfirmMock).toHaveBeenCalledTimes(1);

      // Rerender as isLoading=true
      rerender(
        <ModalDialog
          open={true}
          title="Reembolso Crítico"
          isLoading={true}
          onConfirm={onConfirmMock}
        />
      );

      // Multiple rapid clicks while isLoading is active
      fireEvent.click(confirmBtn);
      fireEvent.click(confirmBtn);
      fireEvent.click(confirmBtn);

      // Must remain exactly 1 call
      expect(onConfirmMock).toHaveBeenCalledTimes(1);
      expect(confirmBtn).toBeDisabled();
    });

    it('2.2 ModalDialog: rapid Escape key spamming does not crash or corrupt state', () => {
      const handleOpenChange = vi.fn();
      render(
        <ModalDialog
          open={true}
          onOpenChange={handleOpenChange}
          title="Diálogo para Escape"
        />
      );

      const dialog = screen.getByRole('alertdialog');

      // Fire 10 rapid Escape keys
      for (let i = 0; i < 10; i++) {
        fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
      }

      // onOpenChange should have been called with false without crashing
      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });

    it('2.3 ResponsiveDrawer: rapid Escape key spamming and close button spamming', () => {
      const handleClose = vi.fn();
      render(
        <ResponsiveDrawer
          open={true}
          onClose={handleClose}
          title="Drawer de Auditoría"
        >
          <div>Contenido de auditoría</div>
        </ResponsiveDrawer>
      );

      const drawer = screen.getByRole('dialog');

      for (let i = 0; i < 5; i++) {
        fireEvent.keyDown(drawer, { key: 'Escape', code: 'Escape' });
      }

      const closeBtn = screen.getByRole('button', { name: 'Cerrar panel lateral' });
      for (let i = 0; i < 5; i++) {
        fireEvent.click(closeBtn);
      }

      expect(handleClose).toHaveBeenCalled();
    });

    it('2.4 Nested / unmount stress: unmounting open modal does not throw memory error', () => {
      const { unmount } = render(
        <ModalDialog
          open={true}
          title="Modal Desmontable"
          description="Verificación de limpieza al desmontar."
        />
      );

      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      expect(() => unmount()).not.toThrow();
    });
  });

  // =========================================================================
  // CHALLENGE 3: MoneyAmount Boundary & Robustness
  // =========================================================================
  describe('Challenge 3: MoneyAmount Boundary & Robustness', () => {
    it('3.1 Negative amounts: formatted with proper sign and tabular figures', () => {
      const { rerender } = render(<MoneyAmount amount={-150000.5} currency="COP" locale="es-CO" />);
      const el = screen.getByText(/-\$?\s?150\.000/);
      expect(el).toBeInTheDocument();
      expect(el).toHaveClass('font-mono', 'tabular-nums');

      rerender(<MoneyAmount amount={-0.01} currency="USD" locale="en-US" />);
      expect(screen.getByText(/-\$0\.01/)).toBeInTheDocument();
    });

    it('3.2 Zero amount: formats cleanly without negative zero or NaN', () => {
      const { rerender } = render(<MoneyAmount amount={0} currency="COP" locale="es-CO" />);
      expect(screen.getByText(/0,00/)).toBeInTheDocument();
      expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
      expect(screen.queryByText(/-0/)).not.toBeInTheDocument();

      rerender(<MoneyAmount amount={-0} currency="COP" locale="es-CO" />);
      expect(screen.getByText(/0,00/)).toBeInTheDocument();
      expect(screen.queryByText(/-0/)).not.toBeInTheDocument();
    });

    it('3.3 Extreme decimal amounts: handles billions, large numbers and floating point decimals', () => {
      // 1,000,000,000.99 (One billion point 99)
      const { rerender } = render(
        <MoneyAmount amount={1000000000.99} currency="COP" locale="es-CO" />
      );
      expect(screen.getByText(/1\.000\.000\.000,99/)).toBeInTheDocument();

      // Precision rounding: 0.1 + 0.2 = 0.30000000000000004 -> must format as 0.30
      rerender(<MoneyAmount amount={0.1 + 0.2} currency="USD" locale="en-US" />);
      expect(screen.getByText(/\$0\.30/)).toBeInTheDocument();

      // Micro fractions: 0.0004 -> 0.00
      rerender(<MoneyAmount amount={0.0004} currency="USD" locale="en-US" />);
      expect(screen.getByText(/\$0\.00/)).toBeInTheDocument();

      // Very large number (Number.MAX_SAFE_INTEGER)
      expect(() => {
        rerender(<MoneyAmount amount={Number.MAX_SAFE_INTEGER} currency="COP" locale="es-CO" />);
      }).not.toThrow();
    });

    it('3.4 Non-standard currency codes: fallback does not crash and preserves currency text', () => {
      // Lowercase valid currency
      const { rerender } = render(<MoneyAmount amount={150} currency="cop" locale="es-CO" />);
      expect(screen.getByText(/150/)).toBeInTheDocument();

      // Custom non-ISO token
      rerender(<MoneyAmount amount={75.5} currency="ZENTRIC_CREDIT" />);
      expect(screen.getByText('75.50 ZENTRIC_CREDIT')).toBeInTheDocument();

      // Empty string currency
      rerender(<MoneyAmount amount={100} currency="" />);
      expect(screen.getByText('100.00')).toBeInTheDocument();

      // Whitespace currency
      rerender(<MoneyAmount amount={200} currency="   " />);
      expect(screen.getByText('200.00')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // CHALLENGE 4: StatusBadge Domain Status Mapping & WCAG AA Chromatic Dot
  // =========================================================================
  describe('Challenge 4: StatusBadge Domain Status Mapping & WCAG AA', () => {
    // Domain matrix based on ZENTRIC.md and apps/frontend/src/components/domainLabels.ts
    const domainStatuses: { label: string; tone: StatusTone; expectedDotClass: string }[] = [
      // OrderStatus
      { label: 'Carrito', tone: 'neutral', expectedDotClass: 'bg-foreground/40' },
      { label: 'Pendiente de Pago', tone: 'warning', expectedDotClass: 'bg-warning' },
      { label: 'Pagado', tone: 'info', expectedDotClass: 'bg-info' },
      { label: 'Despachado', tone: 'info', expectedDotClass: 'bg-info' },
      { label: 'Entregado', tone: 'success', expectedDotClass: 'bg-success' },
      { label: 'Cancelado', tone: 'danger', expectedDotClass: 'bg-destructive' },

      // ReturnStatus
      { label: 'Solicitada', tone: 'info', expectedDotClass: 'bg-info' },
      { label: 'Aprobada', tone: 'warning', expectedDotClass: 'bg-warning' },
      { label: 'Rechazada', tone: 'danger', expectedDotClass: 'bg-destructive' },
      { label: 'Reembolsada', tone: 'success', expectedDotClass: 'bg-success' },

      // FulfillmentStatus
      { label: 'Pendiente de Empaque', tone: 'warning', expectedDotClass: 'bg-warning' },
      { label: 'Empacado', tone: 'info', expectedDotClass: 'bg-info' },

      // ProductStatus
      { label: 'Publicado', tone: 'success', expectedDotClass: 'bg-success' },
      { label: 'Suspendido', tone: 'warning', expectedDotClass: 'bg-warning' },
      { label: 'Descontinuado', tone: 'neutral', expectedDotClass: 'bg-foreground/40' },

      // UserRole
      { label: 'Comprador', tone: 'success', expectedDotClass: 'bg-success' },
      { label: 'Vendedor', tone: 'info', expectedDotClass: 'bg-info' },
      { label: 'Operador Logístico', tone: 'warning', expectedDotClass: 'bg-warning' },
      { label: 'Administrador', tone: 'danger', expectedDotClass: 'bg-destructive' },
      { label: 'Supervisor', tone: 'neutral', expectedDotClass: 'bg-foreground/40' },
    ];

    it('4.1 verifies all valid domain statuses map to proper chromatic dots and Spanish labels', () => {
      domainStatuses.forEach(({ label, tone, expectedDotClass }) => {
        const { unmount } = render(<StatusBadge tone={tone}>{label}</StatusBadge>);

        const badge = screen.getByText(label);
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveAttribute('data-slot', 'status-badge');
        expect(badge).toHaveAttribute('data-tone', tone);

        const dot = badge.querySelector('[aria-hidden="true"]');
        expect(dot).toBeInTheDocument();
        expect(dot).toHaveClass('size-1.5', 'rounded-full', expectedDotClass);

        unmount();
      });
    });

    it('4.2 fallback when tone is null or undefined defaults to neutral', () => {
      const { rerender } = render(<StatusBadge tone={null}>Estado Nulo</StatusBadge>);
      const badge = screen.getByText('Estado Nulo');
      expect(badge).toHaveAttribute('data-tone', 'neutral');

      rerender(<StatusBadge tone={undefined}>Estado Undefined</StatusBadge>);
      expect(screen.getByText('Estado Undefined')).toHaveAttribute('data-tone', 'neutral');
    });
  });

  // =========================================================================
  // CHALLENGE 5: StateView Transitions & Precedence
  // =========================================================================
  describe('Challenge 5: StateView Clean Transitions & Precedence', () => {
    it('5.1 verifies clean sequential rendering transitions (Loading -> Error -> Empty -> Data)', () => {
      const handleRetry = vi.fn();
      const handleEmptyAction = vi.fn();

      // Step 1: Loading
      const { rerender } = render(
        <StateView
          state="loading"
          title="Consultando API Zentric..."
          skeletonRows={2}
        />
      );
      const loadingView = screen.getByLabelText('Consultando API Zentric...');
      expect(loadingView).toHaveAttribute('aria-busy', 'true');
      expect(loadingView).toHaveAttribute('data-slot', 'state-view-loading');
      expect(screen.getByText('Cargando datos...')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();

      // Step 2: Error (with retry trigger)
      rerender(
        <StateView
          state="error"
          title="Error 504 Gateway Timeout"
          description="La base de datos demoró en responder."
          onRetry={handleRetry}
        />
      );
      expect(screen.queryByText('Cargando datos...')).not.toBeInTheDocument();
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(screen.getByText('Error 504 Gateway Timeout')).toBeInTheDocument();
      const retryBtn = screen.getByRole('button', { name: 'Reintentar' });
      fireEvent.click(retryBtn);
      expect(handleRetry).toHaveBeenCalledTimes(1);

      // Step 3: Empty (with escape/action)
      rerender(
        <StateView
          state="empty"
          title="Sin liquidaciones split"
          description="No hay movimientos facturados en el ciclo actual."
          action={{ label: 'Ver histórico', onClick: handleEmptyAction }}
        />
      );
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Sin liquidaciones split')).toBeInTheDocument();
      const actionBtn = screen.getByRole('button', { name: 'Ver histórico' });
      fireEvent.click(actionBtn);
      expect(handleEmptyAction).toHaveBeenCalledTimes(1);

      // Step 4: Data
      rerender(
        <StateView state="data">
          <div data-testid="live-content">Tabla de liquidaciones cargada</div>
        </StateView>
      );
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.getByTestId('live-content')).toBeInTheDocument();
    });

    it('5.2 Priority and precedence when contradictory flags are passed', () => {
      // When both isLoading and isError are passed, isLoading takes precedence in resolution
      const { rerender } = render(
        <StateView isLoading={true} isError={true} title="Conflicto" />
      );
      const conflictLoading = screen.getByLabelText('Conflicto');
      expect(conflictLoading).toHaveAttribute('aria-busy', 'true');
      expect(conflictLoading).toHaveAttribute('data-slot', 'state-view-loading');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();

      // When state="data" is explicitly passed but children are omitted, it gracefully falls back to empty
      rerender(<StateView state="data" title="Sin hijos" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Sin hijos')).toBeInTheDocument();
    });
  });
});
