import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SellerExports from '../index';
import {
  SellerDashboardPage,
  SellerProductsPage,
  CreateProductPage,
  SellerProductDetailPage,
  SellerInventoryPage,
  SellerOrdersPage,
  SellerFulfillmentsPage,
  SellerReturnsPage,
} from '../index';
import { appServices } from '../../../app/providers/appServices';
import {
  OrderStatus,
  ProductType,
  ProductStatus,
  InvoiceType,
  FulfillmentStatus,
  ReturnStatus,
  WarehouseType,
  type Product,
  type OrderListItem,
  type SellerOrderView,
  type Invoice,
  type FulfillmentOrder,
  type ReturnRequest,
  type Inventory,
  type Warehouse,
} from '../../../domain';

// Mock de TanStack Router
const mockNavigate = vi.fn();
let mockSearch: Record<string, unknown> = {};
let mockParams: Record<string, string> = {};

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useSearch: () => mockSearch,
  useParams: () => mockParams,
  Link: ({
    children,
    to,
    params,
    search,
  }: {
    children: React.ReactNode;
    to: string;
    params?: Record<string, string>;
    search?: Record<string, string>;
  }) => (
    <a
      href={to}
      data-testid={`link-to-${to}`}
      data-params={JSON.stringify(params)}
      data-search={JSON.stringify(search)}
    >
      {children}
    </a>
  ),
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const mockProduct1: Product = {
  id: 'prod-1111-1111',
  name: 'Teclado Mecánico RGB',
  description: 'Teclado gamer con switches ópticos.',
  price: 250000,
  currency: 'COP',
  vendorId: 'vendor-1',
  type: ProductType.Physical,
  status: ProductStatus.Published,
  variants: [
    { id: 'var-1111-1111', sku: 'KB-RGB-01', canBeSold: true },
    { id: 'var-1111-2222', sku: 'KB-RGB-02', canBeSold: false },
  ],
  createdAt: new Date().toISOString(),
};

const mockProduct2: Product = {
  id: 'prod-2222-2222',
  name: 'Mouse Inalámbrico Pro',
  description: 'Mouse ultraligero 26000 DPI.',
  price: 180000,
  currency: 'COP',
  vendorId: 'vendor-1',
  type: ProductType.Physical,
  status: ProductStatus.Suspended,
  variants: [{ id: 'var-2222-1111', sku: 'MO-PRO-01', canBeSold: true }],
  createdAt: new Date().toISOString(),
};

const mockWarehouse1: Warehouse = {
  id: 'wh-1111-1111',
  name: 'Bodega Central Fontibón',
  location: 'Bodega Central Fontibón',
  capacity: 5000,
  type: WarehouseType.Marketplace,
  isActive: true,
  vendorId: null,
  createdAt: new Date().toISOString(),
};

const mockWarehouse2: Warehouse = {
  id: 'wh-2222-2222',
  name: 'Bodega Vendedor Chapinero',
  location: 'Bodega Vendedor Chapinero',
  capacity: 1200,
  type: WarehouseType.Vendor,
  isActive: true,
  vendorId: 'vendor-1',
  createdAt: new Date().toISOString(),
};

const mockInventory1: Inventory = {
  id: 'inv-1111-1111',
  variantId: 'var-1111-1111',
  warehouseId: 'wh-1111-1111',
  availableQuantity: 45,
  reservedQuantity: 5,
  usedQuantity: 2,
  damagedQuantity: 0,
};

const mockOrderListItem: OrderListItem = {
  id: 'order-1111-1111',
  status: OrderStatus.Paid,
  currency: 'COP',
  totalAmount: 500000,
  itemCount: 2,
  buyerId: null,
  items: [
    {
      id: 'item-1',
      variantId: 'var-1111-1111',
      quantity: 2,
      unitPrice: 250000,
      totalPrice: 500000,
    },
  ],
  createdAt: new Date().toISOString(),
};

const mockOrderListItem2: OrderListItem = {
  id: 'order-2222-2222',
  status: OrderStatus.Dispatched,
  currency: 'COP',
  totalAmount: 180000,
  itemCount: 1,
  buyerId: null,
  items: [],
  createdAt: new Date().toISOString(),
};

const mockSellerOrderView: SellerOrderView = {
  id: 'order-1111-1111',
  status: OrderStatus.Paid,
  currency: 'COP',
  items: [
    {
      id: 'item-1',
      variantId: 'var-1111-1111',
      quantity: 2,
      unitPrice: 250000,
      totalPrice: 500000,
    },
  ],
  vendorSubtotal: 500000,
  createdAt: new Date().toISOString(),
};

const mockFulfillment1: FulfillmentOrder = {
  id: 'ful-1111-1111',
  customerOrderId: 'order-1111-1111',
  vendorId: 'vendor-1',
  status: FulfillmentStatus.PendingPack,
  cancellationReason: null,
  shipments: [
    {
      id: 'ship-1',
      warehouseId: 'wh-1111-1111',
      trackingNumber: 'TRK-987654321',
    },
  ],
  createdAt: new Date().toISOString(),
};

const mockFulfillment2: FulfillmentOrder = {
  id: 'ful-2222-2222',
  customerOrderId: 'order-2222-2222',
  vendorId: 'vendor-1',
  status: FulfillmentStatus.Packed,
  cancellationReason: null,
  shipments: [],
  createdAt: new Date().toISOString(),
};

const mockFulfillment3: FulfillmentOrder = {
  id: 'ful-3333-3333',
  customerOrderId: 'order-3333-3333',
  vendorId: 'vendor-1',
  status: FulfillmentStatus.Dispatched,
  cancellationReason: null,
  shipments: [],
  createdAt: new Date().toISOString(),
};

const mockFulfillment4: FulfillmentOrder = {
  id: 'ful-4444-4444',
  customerOrderId: 'order-4444-4444',
  vendorId: 'vendor-1',
  status: FulfillmentStatus.Delivered,
  cancellationReason: null,
  shipments: [],
  createdAt: new Date().toISOString(),
};

const mockFulfillment5: FulfillmentOrder = {
  id: 'ful-5555-5555',
  customerOrderId: 'order-5555-5555',
  vendorId: 'vendor-1',
  status: FulfillmentStatus.Cancelled,
  cancellationReason: 'Quiebre de inventario reportado',
  shipments: [],
  createdAt: new Date().toISOString(),
};

const mockReturn1: ReturnRequest = {
  id: 'ret-1111-1111',
  customerOrderId: 'order-1111-1111',
  variantId: 'var-1111-1111',
  warehouseId: 'wh-1111-1111',
  quantity: 1,
  status: ReturnStatus.Requested,
  isGoodCondition: true,
  vendorApproved: false,
  createdAt: new Date().toISOString(),
};

const mockReturn2: ReturnRequest = {
  id: 'ret-2222-2222',
  customerOrderId: 'order-2222-2222',
  variantId: 'var-2222-1111',
  warehouseId: 'wh-2222-2222',
  quantity: 1,
  status: ReturnStatus.Requested,
  isGoodCondition: false,
  vendorApproved: false,
  createdAt: new Date().toISOString(),
};

const mockReturnApproved: ReturnRequest = {
  id: 'ret-3333-3333',
  customerOrderId: 'order-3333-3333',
  variantId: 'var-1111-1111',
  warehouseId: 'wh-1111-1111',
  quantity: 1,
  status: ReturnStatus.Approved,
  isGoodCondition: true,
  vendorApproved: true,
  createdAt: new Date().toISOString(),
};

const mockReturnRefunded: ReturnRequest = {
  id: 'ret-4444-4444',
  customerOrderId: 'order-4444-4444',
  variantId: 'var-1111-1111',
  warehouseId: 'wh-1111-1111',
  quantity: 1,
  status: ReturnStatus.Refunded,
  isGoodCondition: true,
  vendorApproved: true,
  createdAt: new Date().toISOString(),
};

const mockReturnRejected: ReturnRequest = {
  id: 'ret-5555-5555',
  customerOrderId: 'order-5555-5555',
  variantId: 'var-1111-1111',
  warehouseId: 'wh-1111-1111',
  quantity: 1,
  status: ReturnStatus.Rejected,
  isGoodCondition: false,
  vendorApproved: false,
  createdAt: new Date().toISOString(),
};

const mockVendorInvoice: Invoice = {
  id: 'inv-bill-1',
  customerOrderId: 'order-1111-1111',
  vendorId: 'vendor-1',
  type: InvoiceType.VendorDetail,
  totalAmount: 475000,
  currency: 'COP',
  issuedAt: new Date().toISOString(),
};

describe('Módulo del Vendedor (Seller Module - W4-S03)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearch = {};
    mockParams = {};

    // Defaults en appServices.api
    vi.spyOn(appServices.api, 'listProducts').mockResolvedValue([mockProduct1, mockProduct2]);
    vi.spyOn(appServices.api, 'getProductById').mockResolvedValue(mockProduct1);
    vi.spyOn(appServices.api, 'listWarehouses').mockResolvedValue([mockWarehouse1, mockWarehouse2]);
    vi.spyOn(appServices.api, 'listInventories').mockResolvedValue([mockInventory1]);
    vi.spyOn(appServices.api, 'listOrders').mockResolvedValue([mockOrderListItem, mockOrderListItem2]);
    vi.spyOn(appServices.api, 'getOrderById').mockResolvedValue(mockSellerOrderView);
    vi.spyOn(appServices.api, 'listFulfillments').mockResolvedValue([
      mockFulfillment1,
      mockFulfillment2,
      mockFulfillment3,
      mockFulfillment4,
      mockFulfillment5,
    ]);
    vi.spyOn(appServices.api, 'listReturns').mockResolvedValue([
      mockReturn1,
      mockReturn2,
      mockReturnApproved,
      mockReturnRefunded,
      mockReturnRejected,
    ]);
    vi.spyOn(appServices.api, 'listInvoices').mockResolvedValue([mockVendorInvoice]);
  });

  // ── 1. Exportaciones canónicas de index.ts ─────────────────────────────
  it('exporta las 8 páginas requeridas en index.ts', () => {
    expect(SellerExports.SellerDashboardPage).toBeDefined();
    expect(SellerExports.SellerProductsPage).toBeDefined();
    expect(SellerExports.CreateProductPage).toBeDefined();
    expect(SellerExports.SellerProductDetailPage).toBeDefined();
    expect(SellerExports.SellerInventoryPage).toBeDefined();
    expect(SellerExports.SellerOrdersPage).toBeDefined();
    expect(SellerExports.SellerFulfillmentsPage).toBeDefined();
    expect(SellerExports.SellerReturnsPage).toBeDefined();
  });

  // ── 2. SellerDashboardPage ───────────────────────────────────────────
  describe('SellerDashboardPage', () => {
    it('renderiza el panel con KPIs de productos, liquidación y órdenes recientes', async () => {
      renderWithClient(<SellerDashboardPage />);

      expect(await screen.findByText('Consola del Vendedor')).toBeInTheDocument();
      expect(screen.getByText('Portal Comercial')).toBeInTheDocument();

      // Métricas
      expect(screen.getByText('Productos Publicados')).toBeInTheDocument();
      expect(screen.getByText('Despachos por Empacar')).toBeInTheDocument();

      // Pedidos recientes
      expect(screen.getByText('Pedidos Recientes de mis Productos')).toBeInTheDocument();
      expect(screen.getByText(/#order-11/i)).toBeInTheDocument();
    });

    it('renderiza el estado de error al fallar los servicios', async () => {
      vi.spyOn(appServices.api, 'listProducts').mockRejectedValue(new Error('Fallo de red'));
      renderWithClient(<SellerDashboardPage />);

      expect(await screen.findByText('Aviso del Catálogo')).toBeInTheDocument();
    });

    it('renderiza mensaje cuando no hay ventas recientes', async () => {
      vi.spyOn(appServices.api, 'listOrders').mockResolvedValue([]);
      renderWithClient(<SellerDashboardPage />);

      expect(
        await screen.findByText('Sin ventas registradas recientemente en su cuenta de vendedor.')
      ).toBeInTheDocument();
    });
  });

  // ── 3. SellerProductsPage ────────────────────────────────────────────
  describe('SellerProductsPage', () => {
    it('renderiza productos en estado Published y Suspended con acciones de alternancia', async () => {
      const suspendSpy = vi.spyOn(appServices.api, 'suspendProduct').mockResolvedValue(undefined);
      const publishSpy = vi.spyOn(appServices.api, 'publishProduct').mockResolvedValue(undefined);

      renderWithClient(<SellerProductsPage />);

      expect(await screen.findByText('Mis Productos')).toBeInTheDocument();
      expect(screen.getByText('Teclado Mecánico RGB')).toBeInTheDocument();
      expect(screen.getByText('Mouse Inalámbrico Pro')).toBeInTheDocument();

      // Botón suspender en el producto publicado
      const suspendButton = screen.getByRole('button', { name: /Suspender/i });
      fireEvent.click(suspendButton);
      await waitFor(() => {
        expect(suspendSpy).toHaveBeenCalledWith('prod-1111-1111');
      });

      // Botón publicar en el producto suspendido
      const publishButton = screen.getByRole('button', { name: /Publicar/i });
      fireEvent.click(publishButton);
      await waitFor(() => {
        expect(publishSpy).toHaveBeenCalledWith('prod-2222-2222');
      });
    });

    it('permite filtrar por estado en pestañas y buscar por texto', async () => {
      renderWithClient(<SellerProductsPage />);

      expect(await screen.findByText('Teclado Mecánico RGB')).toBeInTheDocument();

      // Filtrar por tab "Suspendidos"
      const suspendedTab = screen.getByRole('button', { name: 'Suspendidos' });
      fireEvent.click(suspendedTab);

      expect(screen.queryByText('Teclado Mecánico RGB')).not.toBeInTheDocument();
      expect(screen.getByText('Mouse Inalámbrico Pro')).toBeInTheDocument();

      // Filtrar por tab "Publicados"
      const publishedTab = screen.getByRole('button', { name: 'Publicados' });
      fireEvent.click(publishedTab);

      expect(screen.getByText('Teclado Mecánico RGB')).toBeInTheDocument();
      expect(screen.queryByText('Mouse Inalámbrico Pro')).not.toBeInTheDocument();

      // Volver a "Todos"
      const allTab = screen.getByRole('button', { name: 'Todos' });
      fireEvent.click(allTab);

      const searchInput = screen.getByPlaceholderText(/Buscar por nombre o descripción/i);
      fireEvent.change(searchInput, { target: { value: 'Mouse' } });

      expect(screen.queryByText('Teclado Mecánico RGB')).not.toBeInTheDocument();
      expect(screen.getByText('Mouse Inalámbrico Pro')).toBeInTheDocument();
    });

    it('renderiza estado vacío cuando no hay coincidencias y permite limpiar filtros', async () => {
      renderWithClient(<SellerProductsPage />);

      expect(await screen.findByText('Teclado Mecánico RGB')).toBeInTheDocument();

      const searchInput = screen.getByPlaceholderText(/Buscar por nombre o descripción/i);
      fireEvent.change(searchInput, { target: { value: 'InexistenteXYZ' } });

      expect(screen.getByText('No se encontraron productos')).toBeInTheDocument();

      const clearBtn = screen.getByRole('button', { name: 'Limpiar filtros' });
      fireEvent.click(clearBtn);

      expect(screen.getByText('Teclado Mecánico RGB')).toBeInTheDocument();
    });

    it('muestra error y permite reintentar cuando falla la carga', async () => {
      vi.spyOn(appServices.api, 'listProducts').mockRejectedValue(new Error('Fallo de catálogo'));
      renderWithClient(<SellerProductsPage />);

      expect(await screen.findByText('Error al cargar catálogo propio')).toBeInTheDocument();
      expect(screen.getByText('Fallo de catálogo')).toBeInTheDocument();
      const retryBtn = screen.getByRole('button', { name: /Reintentar/i });
      expect(retryBtn).toBeInTheDocument();
    });

  });


  // ── 4. CreateProductPage ─────────────────────────────────────────────
  describe('CreateProductPage', () => {
    it('valida campos obligatorios y la regla ADR-0003 (al menos una variante para productos físicos)', async () => {
      renderWithClient(<CreateProductPage />);

      expect(screen.getByText('Dar de Alta Nuevo Producto')).toBeInTheDocument();

      // Enviar sin nombre ni precio
      const submitBtn = screen.getByRole('button', { name: /Publicar en Catálogo del Vendedor/i });
      fireEvent.click(submitBtn);

      expect(await screen.findByText('El nombre del producto es obligatorio.')).toBeInTheDocument();

      // Completar nombre
      const nameInput = screen.getByPlaceholderText(/Ej\. Monitor Curvo/i);
      fireEvent.change(nameInput, { target: { value: 'Monitor 4K HDR' } });
      fireEvent.click(submitBtn);

      expect(await screen.findByText('El precio base debe ser un valor positivo.')).toBeInTheDocument();

      // Completar precio pero sin SKU en la variante
      const priceInput = screen.getByPlaceholderText('0.00');
      fireEvent.change(priceInput, { target: { value: '1500000' } });
      fireEvent.click(submitBtn);

      expect(
        await screen.findByText(/Los productos físicos deben contener al menos una variante con SKU/i)
      ).toBeInTheDocument();
    });

    it('permite añadir variantes dinámicas, cambiar atributos y eliminar variantes adicionales', async () => {
      renderWithClient(<CreateProductPage />);

      const addVarBtn = screen.getByRole('button', { name: /Añadir Variante/i });
      fireEvent.click(addVarBtn);

      expect(screen.getByText('Variante #2')).toBeInTheDocument();

      // Modificar la variante 2
      const attrNameInputs = screen.getAllByPlaceholderText('Nombre');
      const attrValueInputs = screen.getAllByPlaceholderText('Valor');
      fireEvent.change(attrNameInputs[1]!, { target: { value: 'Resolución' } });
      fireEvent.change(attrValueInputs[1]!, { target: { value: '3840x2160' } });

      // Eliminar la variante 2
      const removeButtons = screen.getAllByRole('button').filter((b) => b.querySelector('svg.lucide-trash-2'));
      if (removeButtons.length > 0 && removeButtons[0]) {
        fireEvent.click(removeButtons[0]);
      }
      expect(screen.queryByText('Variante #2')).not.toBeInTheDocument();
    });

    it('crea exitosamente un producto físico con variantes válidas', async () => {
      const createSpy = vi.spyOn(appServices.api, 'createProduct').mockResolvedValue({
        productId: 'prod-9999-9999',
        variantIds: ['var-9999-1111'],
      });

      renderWithClient(<CreateProductPage />);

      fireEvent.change(screen.getByPlaceholderText(/Ej\. Monitor Curvo/i), {
        target: { value: 'Monitor 4K HDR' },
      });
      fireEvent.change(screen.getByPlaceholderText('0.00'), {
        target: { value: '1500000' },
      });
      fireEvent.change(screen.getByPlaceholderText('SKU-REF-01'), {
        target: { value: 'MON-4K-01' },
      });

      const submitBtn = screen.getByRole('button', { name: /Publicar en Catálogo del Vendedor/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(createSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Monitor 4K HDR',
            priceAmount: 1500000,
            type: ProductType.Physical,
          })
        );
      });

      expect(await screen.findByText('¡Producto Registrado con Éxito!')).toBeInTheDocument();
      expect(screen.getByText(/prod-9999-9999/)).toBeInTheDocument();
    });

    it('permite crear productos de tipo digital', async () => {
      const createSpy = vi.spyOn(appServices.api, 'createProduct').mockResolvedValue({
        productId: 'prod-dig-1111',
        variantIds: [],
      });

      renderWithClient(<CreateProductPage />);

      // Seleccionar tipo digital
      const digitalCard = screen.getByText('Digital');
      fireEvent.click(digitalCard);

      fireEvent.change(screen.getByPlaceholderText(/Ej\. Monitor Curvo/i), {
        target: { value: 'Licencia Software Pro' },
      });
      fireEvent.change(screen.getByPlaceholderText('0.00'), {
        target: { value: '250000' },
      });

      const submitBtn = screen.getByRole('button', { name: /Publicar en Catálogo del Vendedor/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(createSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Licencia Software Pro',
            type: ProductType.Digital,
          })
        );
      });

      expect(await screen.findByText('¡Producto Registrado con Éxito!')).toBeInTheDocument();
    });

    it('muestra alerta cuando la mutación createProduct falla', async () => {
      vi.spyOn(appServices.api, 'createProduct').mockRejectedValue(new Error('SKU duplicado en base de datos'));
      renderWithClient(<CreateProductPage />);

      fireEvent.change(screen.getByPlaceholderText(/Ej\. Monitor Curvo/i), {
        target: { value: 'Monitor 4K HDR' },
      });
      fireEvent.change(screen.getByPlaceholderText('0.00'), {
        target: { value: '1500000' },
      });
      fireEvent.change(screen.getByPlaceholderText('SKU-REF-01'), {
        target: { value: 'MON-4K-01' },
      });

      const submitBtn = screen.getByRole('button', { name: /Publicar en Catálogo del Vendedor/i });
      fireEvent.click(submitBtn);

      expect(await screen.findByText('SKU duplicado en base de datos')).toBeInTheDocument();
    });
  });


  // ── 5. SellerProductDetailPage ───────────────────────────────────────
  describe('SellerProductDetailPage', () => {
    it('muestra ficha técnica y tabla de variantes del producto', async () => {
      mockParams = { productId: 'prod-1111-1111' };
      renderWithClient(<SellerProductDetailPage />);

      expect(await screen.findByText('Teclado Mecánico RGB')).toBeInTheDocument();
      expect(screen.getByText(/KB-RGB-01/i)).toBeInTheDocument();
      expect(screen.getByText(/KB-RGB-02/i)).toBeInTheDocument();

      const toggleBtn = screen.getByRole('button', { name: /Suspender Venta/i });
      expect(toggleBtn).toBeInTheDocument();
    });

    it('permite alternar producto de suspendido a publicado', async () => {
      mockParams = { productId: 'prod-2222-2222' };
      vi.spyOn(appServices.api, 'getProductById').mockResolvedValue(mockProduct2);
      const publishSpy = vi.spyOn(appServices.api, 'publishProduct').mockResolvedValue(undefined);

      renderWithClient(<SellerProductDetailPage />);

      expect(await screen.findByText('Mouse Inalámbrico Pro')).toBeInTheDocument();

      const toggleBtn = screen.getByRole('button', { name: /Publicar Producto/i });
      fireEvent.click(toggleBtn);


      await waitFor(() => {
        expect(publishSpy).toHaveBeenCalledWith('prod-2222-2222');
      });
    });

    it('muestra alerta de error si el producto no se encuentra', async () => {
      mockParams = { productId: 'prod-inexistente' };
      vi.spyOn(appServices.api, 'getProductById').mockRejectedValue(new Error('No encontrado'));

      renderWithClient(<SellerProductDetailPage />);

      expect(await screen.findByText('Error al cargar el producto')).toBeInTheDocument();
      expect(screen.getByText('No encontrado')).toBeInTheDocument();
    });
  });

  // ── 6. SellerInventoryPage ───────────────────────────────────────────
  describe('SellerInventoryPage', () => {
    it('muestra posiciones de existencias y formulario para ingresar stock', async () => {
      renderWithClient(<SellerInventoryPage />);

      expect(await screen.findByText('Existencias y Abastecimiento')).toBeInTheDocument();
      expect(screen.getByText('Bodega Central Fontibón')).toBeInTheDocument();
      expect(screen.getByText('45')).toBeInTheDocument(); // disponible
      expect(screen.getByText('5')).toBeInTheDocument(); // reservado

      expect(screen.getByText('Ingreso de Stock')).toBeInTheDocument();
    });

    it('permite filtrar por bodega física y buscar por SKU', async () => {
      renderWithClient(<SellerInventoryPage />);

      expect(await screen.findByText('Existencias y Abastecimiento')).toBeInTheDocument();

      const warehouseSelect = screen.getByLabelText(/Filtrar por bodega/i);
      fireEvent.change(warehouseSelect, { target: { value: 'wh-2222-2222' } });

      expect(screen.getByText('No hay existencias registradas')).toBeInTheDocument();
    });

    it('permite abastecer stock en bodega validando cantidad mayor a cero', async () => {
      const addStockSpy = vi.spyOn(appServices.api, 'addStock').mockResolvedValue('inv-new');
      renderWithClient(<SellerInventoryPage />);

      expect(await screen.findByText('Ingreso de Stock')).toBeInTheDocument();

      // Completar formulario
      const variantSelect = screen.getByLabelText(/Seleccionar variante de producto/i);
      fireEvent.change(variantSelect, { target: { value: 'var-1111-1111' } });

      const warehouseSelect = screen.getByLabelText(/Seleccionar bodega/i);
      fireEvent.change(warehouseSelect, { target: { value: 'wh-1111-1111' } });

      const quantityInput = screen.getByDisplayValue('1');
      fireEvent.change(quantityInput, { target: { value: '25' } });

      const submitBtn = screen.getByRole('button', { name: /Ingresar Existencias/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(addStockSpy).toHaveBeenCalledWith({
          variantId: 'var-1111-1111',
          warehouseId: 'wh-1111-1111',
          quantity: 25,
        });
      });

      expect(await screen.findByText(/Ingreso de 25 unidades registrado/i)).toBeInTheDocument();
    });

    it('filtra inventario por término de búsqueda y bodega, y permite refrescar', async () => {
      renderWithClient(<SellerInventoryPage />);

      expect(await screen.findByText('Existencias y Abastecimiento')).toBeInTheDocument();

      // Buscar por texto
      const searchInput = screen.getByPlaceholderText(/Buscar por SKU/i);
      fireEvent.change(searchInput, { target: { value: 'KB-RGB-01' } });
      expect(screen.getAllByText(/KB-RGB-01/i).length).toBeGreaterThanOrEqual(1);

      // Filtrar por bodega
      const whFilter = screen.getByLabelText(/Filtrar por bodega/i);
      fireEvent.change(whFilter, { target: { value: 'wh-1111-1111' } });
      expect(screen.getAllByText(/KB-RGB-01/i).length).toBeGreaterThanOrEqual(1);

      // Botón refrescar
      const refreshBtn = screen.getByRole('button', { name: /Refrescar/i });
      fireEvent.click(refreshBtn);
    });

    it('muestra error de validación cuando falta variante, bodega o cantidad es inválida', async () => {
      renderWithClient(<SellerInventoryPage />);

      const submitBtn = await screen.findByRole('button', { name: /Ingresar Existencias/i });

      // 1. Sin variante
      fireEvent.click(submitBtn);
      expect(
        await screen.findByText('Debe especificar el identificador de la variante.')
      ).toBeInTheDocument();

      // 2. Con variante pero sin bodega
      const customVariantInput = screen.getByPlaceholderText('ID de Variante (UUID)');
      fireEvent.change(customVariantInput, { target: { value: 'var-9999-9999' } });
      fireEvent.click(submitBtn);
      expect(
        await screen.findByText('Debe seleccionar una bodega de destino.')
      ).toBeInTheDocument();

      // 3. Con bodega pero cantidad menor o igual a cero
      const warehouseSelect = screen.getByLabelText(/Seleccionar bodega/i);
      fireEvent.change(warehouseSelect, { target: { value: 'wh-1111-1111' } });

      const qtyInput = screen.getByDisplayValue('1');
      fireEvent.change(qtyInput, { target: { value: '0' } });
      fireEvent.click(submitBtn);
      expect(
        await screen.findByText('La cantidad a ingresar debe ser mayor que cero (INV-01).')
      ).toBeInTheDocument();
    });

    it('muestra error y permite reintentar cuando falla la carga', async () => {
      vi.spyOn(appServices.api, 'listInventories').mockRejectedValue(new Error('Fallo de inventario'));
      renderWithClient(<SellerInventoryPage />);

      expect(await screen.findByText('Error al cargar el inventario')).toBeInTheDocument();
      expect(screen.getByText('Fallo de inventario')).toBeInTheDocument();
      const retryBtn = screen.getByRole('button', { name: /Reintentar/i });
      expect(retryBtn).toBeInTheDocument();
    });

    it('muestra alerta cuando la mutación addStock falla', async () => {
      vi.spyOn(appServices.api, 'addStock').mockRejectedValue(new Error('Capacidad excedida en bodega'));
      renderWithClient(<SellerInventoryPage />);

      const variantSelect = await screen.findByLabelText(/Seleccionar variante de producto/i);
      fireEvent.change(variantSelect, { target: { value: 'var-1111-1111' } });

      const warehouseSelect = screen.getByLabelText(/Seleccionar bodega/i);
      fireEvent.change(warehouseSelect, { target: { value: 'wh-1111-1111' } });

      const submitBtn = screen.getByRole('button', { name: /Ingresar Existencias/i });
      fireEvent.click(submitBtn);

      expect(await screen.findByText('Capacidad excedida en bodega')).toBeInTheDocument();
    });
  });


  // ── 7. SellerOrdersPage ──────────────────────────────────────────────
  describe('SellerOrdersPage', () => {
    it('muestra pedidos con SellerOrderView sin PII del comprador (ADR-0013)', async () => {
      renderWithClient(<SellerOrdersPage />);

      expect(await screen.findByText('Pedidos Recibidos')).toBeInTheDocument();
      expect(screen.getByText(/#order-11/i)).toBeInTheDocument();

      // Ficha de liquidación en el frame derecho
      expect(screen.getByText('Detalle de Liquidación')).toBeInTheDocument();
      expect(screen.getByText('Subtotal Vendedor')).toBeInTheDocument();
      expect(screen.getAllByText(/ADR-0013/i).length).toBeGreaterThanOrEqual(1);
    });

    it('permite seleccionar otro pedido del listado', async () => {
      renderWithClient(<SellerOrdersPage />);

      expect(await screen.findByText('Pedidos Recibidos')).toBeInTheDocument();

      const secondOrderCard = screen.getByText(/#order-22/i);
      fireEvent.click(secondOrderCard);

      expect(secondOrderCard).toBeInTheDocument();
    });

    it('permite filtrar pedidos por estado', async () => {
      renderWithClient(<SellerOrdersPage />);

      expect(await screen.findByText('Pedidos Recibidos')).toBeInTheDocument();

      const filterSelect = screen.getByLabelText(/Filtrar por estado del pedido/i);
      fireEvent.change(filterSelect, { target: { value: OrderStatus.Cancelled } });

      expect(screen.getByText('No hay pedidos registrados')).toBeInTheDocument();
    });

    it('muestra error y permite reintentar cuando falla la carga', async () => {
      vi.spyOn(appServices.api, 'listOrders').mockRejectedValue(new Error('Fallo de pedidos'));
      renderWithClient(<SellerOrdersPage />);

      expect(await screen.findByText('Error al cargar pedidos')).toBeInTheDocument();
      expect(screen.getByText('Fallo de pedidos')).toBeInTheDocument();
      const retryBtn = screen.getByRole('button', { name: /Reintentar/i });
      expect(retryBtn).toBeInTheDocument();
    });
  });


  // ── 8. SellerFulfillmentsPage ────────────────────────────────────────
  describe('SellerFulfillmentsPage', () => {
    it('muestra cola de despachos, permite empacar y despachar, y oculta la entrega', async () => {
      const packSpy = vi.spyOn(appServices.api, 'packFulfillment').mockResolvedValue(undefined);
      const dispatchSpy = vi.spyOn(appServices.api, 'dispatchFulfillment').mockResolvedValue(undefined);

      renderWithClient(<SellerFulfillmentsPage />);

      expect(await screen.findByText('Cola de Despachos Propios')).toBeInTheDocument();

      // Primer despacho en PendingPack
      const packBtn = screen.getByRole('button', { name: /Registrar Empaque/i });
      expect(packBtn).toBeInTheDocument();
      fireEvent.click(packBtn);
      await waitFor(() => {
        expect(packSpy).toHaveBeenCalledWith('ful-1111-1111');
      });

      // Segundo despacho en Packed
      const packedOrder = screen.getByText(/Despacho #ful-2222/i);
      fireEvent.click(packedOrder);

      const dispatchBtn = await screen.findByRole('button', { name: /Despachar Paquete/i });
      fireEvent.click(dispatchBtn);
      await waitFor(() => {
        expect(dispatchSpy).toHaveBeenCalledWith('ful-2222-2222');
      });

      // Tercer despacho en Dispatched
      const dispatchedOrder = screen.getByText(/Despacho #ful-3333/i);
      fireEvent.click(dispatchedOrder);

      expect(await screen.findByText('En Tránsito hacia el Comprador')).toBeInTheDocument();

      // Cuarto despacho en Delivered
      const deliveredOrder = screen.getByText(/Despacho #ful-4444/i);
      fireEvent.click(deliveredOrder);
      expect(await screen.findByText('Entrega Certificada')).toBeInTheDocument();

      // Quinto despacho en Cancelled
      const cancelledOrder = screen.getByText(/Despacho #ful-5555/i);
      fireEvent.click(cancelledOrder);
      expect(await screen.findByText('Despacho Cancelado')).toBeInTheDocument();

      // Invariante de seguridad: NO debe existir botón para certificar entrega
      expect(screen.queryByRole('button', { name: /Entregar/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Certificar Entrega/i })).not.toBeInTheDocument();
    });

    it('permite reportar quiebre por stock fantasma (cancel-ghost-stock)', async () => {
      const ghostSpy = vi.spyOn(appServices.api, 'cancelGhostStock').mockResolvedValue(true);
      renderWithClient(<SellerFulfillmentsPage />);

      expect(await screen.findByText('Cola de Despachos Propios')).toBeInTheDocument();

      const openGhostBtn = screen.getByRole('button', { name: /Reportar Quiebre de Stock Fantasma/i });
      fireEvent.click(openGhostBtn);

      expect(screen.getByText('Reporte de Stock Fantasma')).toBeInTheDocument();

      // Completar formulario de quiebre
      const variantInput = screen.getByPlaceholderText(/UUID de la variante/i);
      fireEvent.change(variantInput, { target: { value: 'var-1111-1111' } });

      const warehouseSelect = screen.getByLabelText(/Seleccionar bodega física del quiebre/i);
      fireEvent.change(warehouseSelect, { target: { value: 'wh-1111-1111' } });

      const confirmBtn = screen.getByRole('button', { name: /Confirmar Quiebre/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(ghostSpy).toHaveBeenCalledWith({
          fulfillmentOrderId: 'ful-1111-1111',
          variantId: 'var-1111-1111',
          warehouseId: 'wh-1111-1111',
          quantityToCancel: 1,
        });
      });

      expect(await screen.findByText(/Quiebre de stock fantasma reportado/i)).toBeInTheDocument();
    });

    it('valida campos obligatorios y permite cancelar el modal de stock fantasma', async () => {
      renderWithClient(<SellerFulfillmentsPage />);

      expect(await screen.findByText('Cola de Despachos Propios')).toBeInTheDocument();

      // Abrir modal
      const openGhostBtn = screen.getByRole('button', { name: /Reportar Quiebre de Stock Fantasma/i });
      fireEvent.click(openGhostBtn);
      expect(screen.getByText('Reporte de Stock Fantasma')).toBeInTheDocument();

      // Click botón 'Cancelar'
      const cancelBtn = screen.getByRole('button', { name: 'Cancelar' });
      fireEvent.click(cancelBtn);
      expect(screen.queryByText('Reporte de Stock Fantasma')).not.toBeInTheDocument();

      // Volver a abrir y probar la '✕'
      fireEvent.click(screen.getByRole('button', { name: /Reportar Quiebre de Stock Fantasma/i }));
      const closeBtn = screen.getByRole('button', { name: '✕' });
      fireEvent.click(closeBtn);
      expect(screen.queryByText('Reporte de Stock Fantasma')).not.toBeInTheDocument();

      // Abrir de nuevo y enviar sin variante
      fireEvent.click(screen.getByRole('button', { name: /Reportar Quiebre de Stock Fantasma/i }));
      const confirmBtn = screen.getByRole('button', { name: /Confirmar Quiebre/i });
      fireEvent.click(confirmBtn);
      expect(
        await screen.findByText('Debe especificar la variante que presenta quiebre de stock.')
      ).toBeInTheDocument();

      // Completar variante pero sin bodega
      const variantInput = screen.getByPlaceholderText(/UUID de la variante/i);
      fireEvent.change(variantInput, { target: { value: 'var-1111-1111' } });
      fireEvent.click(confirmBtn);
      expect(
        await screen.findByText('Debe especificar la bodega física del quiebre.')
      ).toBeInTheDocument();

      // Modificar cantidad a través del input
      const qtyInput = screen.getByDisplayValue('1');
      fireEvent.change(qtyInput, { target: { value: '3' } });
      expect(screen.getByDisplayValue('3')).toBeInTheDocument();
    });

    it('maneja error cuando la API falla al reportar stock fantasma', async () => {
      vi.spyOn(appServices.api, 'cancelGhostStock').mockRejectedValue(new Error('Fallo al cancelar por quiebre'));
      renderWithClient(<SellerFulfillmentsPage />);

      const openGhostBtn = await screen.findByRole('button', { name: /Reportar Quiebre de Stock Fantasma/i });
      fireEvent.click(openGhostBtn);

      const variantInput = screen.getByPlaceholderText(/UUID de la variante/i);
      fireEvent.change(variantInput, { target: { value: 'var-1111-1111' } });

      const warehouseSelect = screen.getByLabelText(/Seleccionar bodega física del quiebre/i);
      fireEvent.change(warehouseSelect, { target: { value: 'wh-1111-1111' } });

      const confirmBtn = screen.getByRole('button', { name: /Confirmar Quiebre/i });
      fireEvent.click(confirmBtn);

      expect(await screen.findByText('Fallo al cancelar por quiebre')).toBeInTheDocument();
    });

    it('muestra error y permite reintentar cuando falla la carga', async () => {
      vi.spyOn(appServices.api, 'listFulfillments').mockRejectedValue(new Error('Fallo de logística'));
      renderWithClient(<SellerFulfillmentsPage />);

      expect(await screen.findByText('Error al cargar despachos')).toBeInTheDocument();
      expect(screen.getByText('Fallo de logística')).toBeInTheDocument();
      const retryBtn = screen.getByRole('button', { name: /Reintentar/i });
      expect(retryBtn).toBeInTheDocument();
    });
  });


  // ── 9. SellerReturnsPage ─────────────────────────────────────────────
  describe('SellerReturnsPage', () => {
    it('muestra devoluciones con dictamen físico y permite aprobar (ADR-0006) o rechazar', async () => {
      const approveSpy = vi.spyOn(appServices.api, 'approveReturn').mockResolvedValue(undefined);
      renderWithClient(<SellerReturnsPage />);

      expect(await screen.findByText('Resolución de Devoluciones')).toBeInTheDocument();
      expect(screen.getByText('Dictamen Favorable')).toBeInTheDocument();
      expect(screen.getAllByText(/ADR-0006/i).length).toBeGreaterThanOrEqual(1);

      // Botón aprobar
      const approveBtn = screen.getByRole('button', { name: /Aprobar Devolución/i });
      fireEvent.click(approveBtn);

      await waitFor(() => {
        expect(approveSpy).toHaveBeenCalledWith('ret-1111-1111');
      });

      expect(await screen.findByText(/Devolución aprobada exitosamente/i)).toBeInTheDocument();
    });

    it('permite seleccionar una devolución con dictamen desfavorable y rechazarla comercialmente', async () => {
      const rejectSpy = vi.spyOn(appServices.api, 'rejectReturn').mockResolvedValue(undefined);
      renderWithClient(<SellerReturnsPage />);

      expect(await screen.findByText('Resolución de Devoluciones')).toBeInTheDocument();

      // Seleccionar la segunda devolución
      const secondReturnCard = screen.getByText(/Devolución #ret-2222/i);
      fireEvent.click(secondReturnCard);

      expect(await screen.findByText('Dictamen Desfavorable')).toBeInTheDocument();

      const rejectBtn = screen.getByRole('button', { name: /Rechazar Devolución/i });
      fireEvent.click(rejectBtn);

      await waitFor(() => {
        expect(rejectSpy).toHaveBeenCalledWith('ret-2222-2222');
      });

      expect(await screen.findByText(/Solicitud de devolución rechazada comercialmente/i)).toBeInTheDocument();
    });

    it('exhibe estados aprobados, reembolsados y rechazados en el panel de detalle', async () => {
      renderWithClient(<SellerReturnsPage />);

      expect(await screen.findByText('Resolución de Devoluciones')).toBeInTheDocument();

      // Tercera devolución: Approved
      const approvedCard = screen.getByText(/Devolución #ret-3333/i);
      fireEvent.click(approvedCard);
      expect(await screen.findByText('Devolución Aprobada')).toBeInTheDocument();

      // Cuarta devolución: Refunded
      const refundedCard = screen.getByText(/Devolución #ret-4444/i);
      fireEvent.click(refundedCard);
      expect(await screen.findByText('Reembolsada al Comprador')).toBeInTheDocument();

      // Quinta devolución: Rejected
      const rejectedCard = screen.getByText(/Devolución #ret-5555/i);
      fireEvent.click(rejectedCard);
      expect(await screen.findByText('Devolución Rechazada')).toBeInTheDocument();
    });

    it('muestra error y permite reintentar cuando falla la carga', async () => {
      vi.spyOn(appServices.api, 'listReturns').mockRejectedValue(new Error('Fallo de devoluciones'));
      renderWithClient(<SellerReturnsPage />);

      expect(await screen.findByText('Error al cargar devoluciones')).toBeInTheDocument();
      expect(screen.getByText('Fallo de devoluciones')).toBeInTheDocument();
      const retryBtn = screen.getByRole('button', { name: /Reintentar/i });
      expect(retryBtn).toBeInTheDocument();
    });
  });
});

