import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SellerInventoryPage } from '../SellerInventoryPage';
import { appServices } from '../../../app/providers/appServices';
import { WarehouseType, type Inventory, type Warehouse } from '../../../domain';

vi.mock('@tanstack/react-router', () => ({
  useSearch: () => ({}),
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
});
