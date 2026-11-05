import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SellerInventoryPage } from '../SellerInventoryPage';
import { appServices } from '../../../app/providers/appServices';
import { alertAdapter } from '../../../app/providers/alertAdapter';
import { WarehouseType, type Inventory, type Warehouse } from '../../../core';

let mockSearchValue: { variantId?: string } = {};

vi.mock('@tanstack/react-router', () => ({
  useSearch: () => mockSearchValue,
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const inventory: Inventory = {
  id: 'inv-1111',
  variantId: 'var-1111',
  warehouseId: 'wh-1111',
  availableQuantity: 7,
  reservedQuantity: 0,
  usedQuantity: 0,
  damagedQuantity: 0,
  productName: 'Teclado Mecánico RGB',
  sku: 'KB-RGB-01',
};

const warehouse: Warehouse = {
  id: 'wh-1111',
  name: 'Bodega Central',
  location: 'Bogotá',
  capacity: 5000,
  type: WarehouseType.Vendor,
  isActive: true,
  vendorId: null,
  createdAt: new Date().toISOString(),
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <SellerInventoryPage />
    </QueryClientProvider>,
  );
}

describe('SellerInventoryPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockSearchValue = {};
    vi.spyOn(appServices.api, 'listWarehouses').mockResolvedValue([warehouse]);
    vi.spyOn(appServices.api, 'listProductsPaged').mockResolvedValue({
      items: [],
      page: 0,
      size: 20,
      totalItems: 0,
      totalPages: 0,
    });
  });

  it('pide la primera pagina 1-based y deja filtrar y paginar al servidor', async () => {
    const paged = vi.spyOn(appServices.api, 'listInventoriesPaged').mockResolvedValue({
      items: [inventory],
      page: 1,
      size: 20,
      totalItems: 37,
      totalPages: 2,
    });

    renderPage();

    await waitFor(() => expect(paged).toHaveBeenCalled());
    // El backend recibe `page` 1-based: mandar 0 repetiria la primera pagina.
    expect(paged.mock.calls[0]?.[0]).toEqual({
      page: 1,
      size: 20,
      warehouseId: undefined,
      search: undefined,
    });
  });

  it('muestra nombre y SKU del producto en vez del UUID de la variante', async () => {
    vi.spyOn(appServices.api, 'listInventoriesPaged').mockResolvedValue({
      items: [inventory],
      page: 1,
      size: 20,
      totalItems: 1,
      totalPages: 1,
    });

    renderPage();

    expect(await screen.findByText('Teclado Mecánico RGB')).toBeInTheDocument();
    expect(screen.getByText('SKU: KB-RGB-01')).toBeInTheDocument();
    expect(screen.queryByText(inventory.variantId)).not.toBeInTheDocument();
  });

  it('cuenta el total del servidor y no habla de soft delete', async () => {
    vi.spyOn(appServices.api, 'listInventoriesPaged').mockResolvedValue({
      items: [inventory],
      page: 1,
      size: 20,
      totalItems: 37,
      totalPages: 2,
    });

    renderPage();

    expect(await screen.findByText('37 Posiciones')).toBeInTheDocument();
    expect(screen.queryByText(/soft delete/i)).not.toBeInTheDocument();
  });

  it('permite limpiar el formulario sin quedar atrapado en el variantId de la URL (deep-link)', async () => {
    mockSearchValue = { variantId: 'var-deep-123' };
    vi.spyOn(appServices.api, 'listInventoriesPaged').mockResolvedValue({
      items: [inventory],
      page: 1,
      size: 20,
      totalItems: 1,
      totalPages: 1,
    });

    renderPage();

    const variantInput = await screen.findByLabelText(/o ingresa el id si no aparece en el listado/i);
    expect(variantInput).toHaveValue('var-deep-123');

    // Pulsar botón Limpiar
    const clearBtn = screen.getByRole('button', { name: /limpiar/i });
    fireEvent.click(clearBtn);

    // Debe quedar completamente vacío y no revertir a var-deep-123
    expect(variantInput).toHaveValue('');

    // Permite escribir otra variante y volver a borrarla sin re-atrapar
    fireEvent.change(variantInput, { target: { value: 'var-custom-999' } });
    expect(variantInput).toHaveValue('var-custom-999');

    fireEvent.change(variantInput, { target: { value: '' } });
    expect(variantInput).toHaveValue('');
  });

  it('muestra errores de eliminacion en el contexto de la tabla y no en el formulario de abastecimiento', async () => {
    const zeroStockInv: Inventory = {
      ...inventory,
      id: 'inv-zero',
      availableQuantity: 0,
      reservedQuantity: 0,
      usedQuantity: 0,
      damagedQuantity: 0,
    };

    vi.spyOn(appServices.api, 'listInventoriesPaged').mockResolvedValue({
      items: [zeroStockInv],
      page: 1,
      size: 20,
      totalItems: 1,
      totalPages: 1,
    });

    vi.spyOn(alertAdapter, 'confirm').mockResolvedValue(true);
    vi.spyOn(appServices.api, 'deleteInventory').mockRejectedValue(new Error('Fallo al conectar con el servidor'));

    renderPage();

    const deleteBtn = await screen.findByRole('button', { name: /eliminar inventario de/i });
    expect(deleteBtn).not.toBeDisabled();
    fireEvent.click(deleteBtn);

    // El mensaje de error debe renderizarse en el contexto de la tabla
    const errorAlert = await screen.findByText(/No se pudo completar la operación/i);
    expect(errorAlert).toBeInTheDocument();

    // Debe estar en la sección principal de la tabla (no en el aside del formulario de abastecer)
    const asideForm = screen.getByText('Ingreso de Stock').closest('aside');
    expect(asideForm).not.toBeNull();
    expect(within(asideForm!).queryByText(/No se pudo completar la operación/i)).not.toBeInTheDocument();
  });

  it('deshabilita la eliminacion de registros con existencias fisicas y previene el error 400', async () => {
    const stockInv: Inventory = {
      ...inventory,
      id: 'inv-with-stock',
      availableQuantity: 10,
      reservedQuantity: 2,
      usedQuantity: 0,
      damagedQuantity: 1,
    };

    vi.spyOn(appServices.api, 'listInventoriesPaged').mockResolvedValue({
      items: [stockInv],
      page: 1,
      size: 20,
      totalItems: 1,
      totalPages: 1,
    });

    const deleteSpy = vi.spyOn(appServices.api, 'deleteInventory');

    renderPage();

    const deleteBtn = await screen.findByRole('button', { name: /eliminar inventario de/i });
    expect(deleteBtn).toBeDisabled();
    expect(deleteBtn).toHaveAttribute(
      'title',
      expect.stringContaining('el registro tiene existencias físicas activas'),
    );

    fireEvent.click(deleteBtn);
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it('valida estrictamente la cantidad de unidades rechazando decimales, vacio y no positivos', async () => {
    vi.spyOn(appServices.api, 'listInventoriesPaged').mockResolvedValue({
      items: [inventory],
      page: 1,
      size: 20,
      totalItems: 1,
      totalPages: 1,
    });

    const addStockSpy = vi.spyOn(appServices.api, 'addStock');

    renderPage();

    const variantInput = await screen.findByLabelText(/o ingresa el id si no aparece en el listado/i);
    const quantityInput = screen.getByLabelText(/cantidad de unidades/i);
    const submitBtn = screen.getByRole('button', { name: /ingresar existencias/i });

    // Configurar variante válida
    fireEvent.change(variantInput, { target: { value: 'var-1111' } });
    expect(quantityInput).toHaveAttribute('step', '1');

    // 1. Campo vacío
    fireEvent.change(quantityInput, { target: { value: '   ' } });
    fireEvent.click(submitBtn);
    expect(await screen.findByText('Debe ingresar la cantidad de unidades.')).toBeInTheDocument();
    expect(addStockSpy).not.toHaveBeenCalled();

    // 2. Número decimal
    fireEvent.change(quantityInput, { target: { value: '15.5' } });
    fireEvent.click(submitBtn);
    expect(await screen.findByText('La cantidad debe ser un número entero sin decimales.')).toBeInTheDocument();
    expect(addStockSpy).not.toHaveBeenCalled();

    // 3. Cantidad cero o no positiva
    fireEvent.change(quantityInput, { target: { value: '0' } });
    fireEvent.click(submitBtn);
    expect(await screen.findByText('La cantidad a ingresar debe ser mayor que cero (INV-01).')).toBeInTheDocument();
    expect(addStockSpy).not.toHaveBeenCalled();
  });

  it('permite la navegacion y seleccion de variantes en filas mediante el teclado (Enter y Espacio)', async () => {
    vi.spyOn(appServices.api, 'listInventoriesPaged').mockResolvedValue({
      items: [inventory],
      page: 1,
      size: 20,
      totalItems: 1,
      totalPages: 1,
    });

    renderPage();

    const row = await screen.findByRole('row', { name: /teclado mecánico rgb/i });
    expect(row).toHaveAttribute('tabIndex', '0');

    const variantInput = screen.getByLabelText(/o ingresa el id si no aparece en el listado/i);

    // Presionar Enter en la fila
    fireEvent.keyDown(row, { key: 'Enter', code: 'Enter' });
    expect(variantInput).toHaveValue('var-1111');

    // Limpiar y probar con Espacio
    fireEvent.click(screen.getByRole('button', { name: /limpiar/i }));
    expect(variantInput).toHaveValue('');

    fireEvent.keyDown(row, { key: ' ', code: 'Space' });
    expect(variantInput).toHaveValue('var-1111');
  });

  it('cumple con las asociaciones de etiquetas WCAG y semantica de tabla', async () => {
    vi.spyOn(appServices.api, 'listInventoriesPaged').mockResolvedValue({
      items: [inventory],
      page: 1,
      size: 20,
      totalItems: 1,
      totalPages: 1,
    });

    renderPage();

    // Comprobar etiquetas htmlFor vinculadas a id
    expect(await screen.findByLabelText('Variante a Abastecer')).toHaveAttribute('id', 'target-variant-select');
    expect(screen.getByLabelText(/o ingresa el id si no aparece en el listado/i)).toHaveAttribute('id', 'target-variant-id');
    expect(screen.getByLabelText(/bodega de recepción/i)).toHaveAttribute('id', 'target-warehouse-select');
    expect(screen.getByLabelText(/cantidad de unidades/i)).toHaveAttribute('id', 'stock-quantity');

    // Input de búsqueda con aria-label
    expect(screen.getByLabelText('Buscar por producto o SKU')).toBeInTheDocument();

    // Tabla con nombre accesible y columnas con scope="col"
    const table = screen.getByRole('table', { name: 'Inventario de productos por almacén' });
    expect(table).toBeInTheDocument();

    const headers = screen.getAllByRole('columnheader');
    expect(headers).toHaveLength(7);
    headers.forEach((th) => expect(th).toHaveAttribute('scope', 'col'));

    // StatusBadge accesible
    expect(screen.getByText('En Stock')).toBeInTheDocument();
  });
});
