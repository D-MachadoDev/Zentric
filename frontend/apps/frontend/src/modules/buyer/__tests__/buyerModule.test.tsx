import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as BuyerExports from '../index';
import {
  BuyerCatalogPage,
  BuyerProductDetailPage,
  BuyerCartPage,
  BuyerOrdersPage,
  BuyerOrderDetailPage,
  BuyerOrderPaymentPage,
  RequestReturnPage,
  BuyerProfilePage,
} from '../index';
import { appServices } from '../../../app/providers/appServices';
import { AuthContext, type AuthValue } from '../../../app/providers/authContext';
import {
  OrderStatus,
  ProductType,
  ProductStatus,
  InvoiceType,
  FulfillmentStatus,
  WarehouseType,
  UserRole,
  type Category,
  type Product,
  type Order,
  type OrderListItem,
  type Invoice,
  type FulfillmentOrder,
  type UserProfile,
} from '../../../domain';

// Mock de TanStack Router
const mockNavigate = vi.fn();
let mockSearch: Record<string, unknown> = {};
let mockParams: Record<string, string> = {};

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useSearch: () => mockSearch,
  useParams: () => mockParams,
  Link: ({ children, to, params, search }: { children: React.ReactNode; to: string; params?: Record<string, string>; search?: Record<string, string> }) => (
    <a href={to} data-testid={`link-to-${to}`} data-params={JSON.stringify(params)} data-search={JSON.stringify(search)}>
      {children}
    </a>
  ),
}));

const defaultAuthValue: AuthValue = {
  session: appServices.session,
  api: appServices.api,
  user: {
    userId: 'buyer-1',
    email: 'comprador@zentric.co',
    fullName: 'Comprador Demo',
    role: UserRole.Buyer,
  },
  accessToken: 'mock-token',
  role: UserRole.Buyer,
  expiredNotice: null,
  login: vi.fn(),
  logout: vi.fn(),
  clearExpiredNotice: vi.fn(),
};

function renderWithClient(ui: React.ReactElement, authOverride?: Partial<AuthValue>) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={{ ...defaultAuthValue, ...authOverride }}>
        {ui}
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

const mockPhysicalProduct: Product = {
  id: 'prod-1111-1111',
  name: 'Teclado Mecánico Ergonómico',
  description: 'Teclado para desarrolladores con switches silenciosos.',
  price: 150000,
  currency: 'COP',
  vendorId: 'vendor-1',
  type: ProductType.Physical,
  status: ProductStatus.Published,
  variants: [
    { id: 'var-1111-1111', sku: 'KB-ERG-01', canBeSold: true },
    { id: 'var-1111-2222', sku: 'KB-ERG-02', canBeSold: false },
  ],
  createdAt: new Date().toISOString(),
};

const mockDigitalProduct: Product = {
  id: 'prod-2222-2222',
  name: 'Licencia Software Cloud',
  description: 'Suscripción anual a plataforma de computación distribuida.',
  price: 320000,
  currency: 'COP',
  vendorId: 'vendor-2',
  type: ProductType.Digital,
  status: ProductStatus.Published,
  variants: [{ id: 'var-2222-1111', sku: 'LIC-CLOUD-01', canBeSold: true }],
  createdAt: new Date().toISOString(),
};

/** Categorías reales que expone `GET api/catalog/categories` (S1). */
const mockCategories: Category[] = [
  { id: 'perifericos', name: 'Periféricos & Teclados', productCount: 8 },
  { id: 'software', name: 'Software & Licencias Cloud', productCount: 3 },
];

/**
 * Destacados del hero (S2) con nombres propios: así una aserción de texto en el
 * mosaico nunca se confunde con la grilla del catálogo.
 */
const mockHeroProducts: Product[] = Array.from({ length: 6 }).map((_, index) => ({
  ...mockPhysicalProduct,
  id: `hero-prod-${index + 1}`,
  name: `Destacado Alfa ${index + 1}`,
  price: 1200000 + index,
}));

/** Chrome del catálogo (categorías + hero) servido por el adaptador real. */
function mockCatalogChrome() {
  vi.spyOn(appServices.api, 'listCategories').mockResolvedValue(mockCategories);
  vi.spyOn(appServices.api, 'listHeroProducts').mockResolvedValue(mockHeroProducts);
}

/**
 * Adaptador paginado que respeta los parámetros del servidor.
 *
 * S3: `search`, `type` y `category` se resuelven sobre el catálogo COMPLETO,
 * nunca sobre la página activa en el cliente.
 */
function mockPagedFromFixtures(fixtures: Product[]) {
  return vi.spyOn(appServices.api, 'listProductsPaged').mockImplementation(async (params) => {
    const term = params?.search?.trim().toLowerCase() ?? '';
    const matches = fixtures.filter((product) => {
      if (params?.type && product.type !== params.type) return false;
      if (params?.category && product.category?.toLowerCase() !== params.category.toLowerCase()) {
        return false;
      }
      if (term !== '') {
        const inName = product.name.toLowerCase().includes(term);
        const inDescription = (product.description ?? '').toLowerCase().includes(term);
        if (!inName && !inDescription) return false;
      }
      return true;
    });

    const page = params?.page ?? 1;
    const size = params?.size ?? 12;
    const start = (page - 1) * size;
    const items = matches.slice(start, start + size);
    const totalPages = Math.ceil(matches.length / size) || 1;

    return {
      items,
      page,
      size,
      totalItems: matches.length,
      totalPages,
    };
  });
}

const mockCartOrder: OrderListItem = {
  id: 'cart-order-1',
  status: OrderStatus.Cart,
  currency: 'COP',
  totalAmount: 150000,
  itemCount: 1,
  items: [
    {
      id: 'item-1',
      variantId: 'var-1111-1111',
      quantity: 1,
      unitPrice: 150000,
      totalPrice: 150000,
    },
  ],
  buyerId: 'buyer-1',
  createdAt: new Date().toISOString(),
};

const mockDeliveredOrder: Order = {
  id: 'order-del-1',
  buyerId: 'buyer-1',
  status: OrderStatus.Delivered,
  totalAmount: 300000,
  currency: 'COP',
  items: [
    {
      id: 'item-del-1',
      variantId: 'var-1111-1111',
      quantity: 2,
      unitPrice: 150000,
      totalPrice: 300000,
    },
  ],
  createdAt: new Date().toISOString(),
};

const mockPendingPaymentOrder: OrderListItem = {
  id: 'order-pending-1',
  status: OrderStatus.PendingPayment,
  currency: 'COP',
  totalAmount: 150000,
  itemCount: 1,
  items: [
    {
      id: 'item-pen-1',
      variantId: 'var-1111-1111',
      quantity: 1,
      unitPrice: 150000,
      totalPrice: 150000,
    },
  ],
  buyerId: 'buyer-1',
  createdAt: new Date().toISOString(),
};

const mockSnapshotOrder: Order = {
  id: 'order-snap-100',
  buyerId: 'buyer-1',
  status: OrderStatus.PendingPayment,
  totalAmount: 450000,
  currency: 'COP',
  expiresAt: new Date(Date.now() + 300 * 1000).toISOString(),
  items: [
    {
      id: 'item-snap-1',
      variantId: 'var-snap-1111',
      quantity: 1,
      unitPrice: 450000,
      totalPrice: 450000,
      productName: 'Monitor Gamer 27" Curvo 165Hz',
      sku: 'MON-GM-27-165',
      imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500',
      vendorName: 'TechStore Colombia',
    },
  ],
  createdAt: new Date().toISOString(),
};

const mockSnapshotOrderListItem: OrderListItem = {
  id: 'order-snap-100',
  buyerId: 'buyer-1',
  status: OrderStatus.PendingPayment,
  totalAmount: 450000,
  currency: 'COP',
  itemCount: 1,
  expiresAt: new Date(Date.now() + 300 * 1000).toISOString(),
  items: mockSnapshotOrder.items,
  createdAt: new Date().toISOString(),
};

describe('Módulo del Comprador (W4-S02-buyer-module)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearch = {};
    mockParams = {};
  });

  it('exporta todos los componentes requeridos desde el barril index', () => {
    expect(BuyerExports.BuyerCatalogPage).toBeDefined();
    expect(BuyerExports.BuyerProductDetailPage).toBeDefined();
    expect(BuyerExports.BuyerCartPage).toBeDefined();
    expect(BuyerExports.BuyerOrdersPage).toBeDefined();
    expect(BuyerExports.BuyerOrderDetailPage).toBeDefined();
    expect(BuyerExports.BuyerOrderPaymentPage).toBeDefined();
    expect(BuyerExports.RequestReturnPage).toBeDefined();
    expect(BuyerExports.BuyerProfilePage).toBeDefined();
  });

  // ==========================================================================
  // 1. BuyerCatalogPage
  // ==========================================================================
  describe('BuyerCatalogPage', () => {
    beforeEach(() => {
      // El catálogo lee categorías reales y destacados reales en cada render.
      mockCatalogChrome();
    });

    it('renderiza el catálogo de productos con paginación y filtros', async () => {
      vi.spyOn(appServices.api, 'listProductsPaged').mockResolvedValue({
        items: [mockPhysicalProduct, mockDigitalProduct],
        page: 1,
        size: 12,
        totalItems: 2,
        totalPages: 1,
      });

      renderWithClient(<BuyerCatalogPage />);

      expect(await screen.findByText('Teclado Mecánico Ergonómico')).toBeInTheDocument();
      expect(screen.getByText('Catálogo de Productos')).toBeInTheDocument();
      expect(screen.getByText('Licencia Software Cloud')).toBeInTheDocument();
      expect(screen.getByText('Físico')).toBeInTheDocument();
      expect(screen.getByText('Digital')).toBeInTheDocument();
    });

    it('envía la búsqueda y el tipo al backend y refleja el resultado real (S3)', async () => {
      const listSpy = mockPagedFromFixtures([mockPhysicalProduct, mockDigitalProduct]);

      renderWithClient(<BuyerCatalogPage />);
      await screen.findByText('Teclado Mecánico Ergonómico');

      // La búsqueda viaja al servidor (con debounce) y la grilla pinta lo que devuelve
      const searchInput = screen.getByPlaceholderText(/Buscar por nombre/i);
      fireEvent.change(searchInput, { target: { value: 'Licencia' } });

      await waitFor(() => {
        expect(listSpy).toHaveBeenCalledWith(
          expect.objectContaining({ search: 'Licencia', page: 1 }),
        );
      });
      await waitFor(() => {
        expect(screen.queryByText('Teclado Mecánico Ergonómico')).not.toBeInTheDocument();
      });
      expect(screen.getByText('Licencia Software Cloud')).toBeInTheDocument();

      // Filtrar por Físicos
      fireEvent.change(searchInput, { target: { value: '' } });
      fireEvent.click(screen.getByRole('button', { name: 'Físicos' }));

      await waitFor(() => {
        expect(listSpy).toHaveBeenCalledWith(
          expect.objectContaining({ type: ProductType.Physical, page: 1 }),
        );
      });
      await waitFor(() => {
        expect(screen.getByText('Teclado Mecánico Ergonómico')).toBeInTheDocument();
      });
      expect(screen.queryByText('Licencia Software Cloud')).not.toBeInTheDocument();

      // Filtrar por Digitales
      fireEvent.click(screen.getByRole('button', { name: 'Digitales' }));
      await waitFor(() => {
        expect(listSpy).toHaveBeenCalledWith(
          expect.objectContaining({ type: ProductType.Digital }),
        );
      });
      await waitFor(() => {
        expect(screen.queryByText('Teclado Mecánico Ergonómico')).not.toBeInTheDocument();
      });
      expect(screen.getByText('Licencia Software Cloud')).toBeInTheDocument();

      // Filtrar por Todos (sin filtro de tipo)
      fireEvent.click(screen.getByRole('button', { name: 'Todos' }));
      await waitFor(() => {
        expect(listSpy).toHaveBeenCalledWith(expect.objectContaining({ type: undefined }));
      });
      await waitFor(() => {
        expect(screen.getByText('Teclado Mecánico Ergonómico')).toBeInTheDocument();
      });
      expect(screen.getByText('Licencia Software Cloud')).toBeInTheDocument();
    });

    it('muestra estado vacío si no hay productos y permite limpiar filtros', async () => {
      vi.spyOn(appServices.api, 'listProductsPaged').mockResolvedValue({
        items: [],
        page: 1,
        size: 12,
        totalItems: 0,
        totalPages: 0,
      });

      renderWithClient(<BuyerCatalogPage />);

      expect(await screen.findByText(/No se encontraron productos/i)).toBeInTheDocument();

      // Escribir en búsqueda para probar botón de limpiar filtros
      const searchInput = screen.getByPlaceholderText(/Buscar por nombre/i);
      fireEvent.change(searchInput, { target: { value: 'algo_que_no_existe' } });

      const clearBtn = await screen.findByRole('button', { name: /Limpiar filtros/i });
      fireEvent.click(clearBtn);
      expect(searchInput).toHaveValue('');
    });

    it('muestra alerta de error si falla la consulta y permite refrescar', async () => {
      const listSpy = vi.spyOn(appServices.api, 'listProductsPaged').mockRejectedValue(new Error('Fallo de red en catálogo'));

      renderWithClient(<BuyerCatalogPage />);

      expect(await screen.findByText('Error al cargar el catálogo')).toBeInTheDocument();
      expect(screen.getByText(/Fallo de red en catálogo/i)).toBeInTheDocument();

      // Probar botón de refrescar
      listSpy.mockResolvedValueOnce({
        items: [mockPhysicalProduct],
        page: 1,
        size: 12,
        totalItems: 1,
        totalPages: 1,
      });

      const refreshBtn = screen.getByRole('button', { name: /Refrescar/i });
      fireEvent.click(refreshBtn);
    });

    it('permite paginar hacia adelante y hacia atrás cuando totalPages > 1', async () => {
      vi.spyOn(appServices.api, 'listProductsPaged').mockResolvedValue({
        items: [mockPhysicalProduct],
        page: 1,
        size: 12,
        totalItems: 25,
        totalPages: 3,
      });

      renderWithClient(<BuyerCatalogPage />);
      expect(await screen.findByText('Teclado Mecánico Ergonómico')).toBeInTheDocument();

      const nextBtn = screen.getByRole('button', { name: /Siguiente/i });
      expect(nextBtn).toBeEnabled();
      fireEvent.click(nextBtn);

      const prevBtn = await screen.findByRole('button', { name: /Anterior/i });
      expect(prevBtn).toBeEnabled();
      fireEvent.click(prevBtn);
    });

    it('renderiza los chips de categoría desde el backend con su conteo (S1)', async () => {
      mockPagedFromFixtures([mockPhysicalProduct]);

      renderWithClient(<BuyerCatalogPage />);

      // Esperar a que las categorías terminen de cargar (aria-busy=false)
      const chipGroup = await screen.findByRole('group', { name: 'Categorías de productos' });
      await waitFor(() => expect(chipGroup).not.toHaveAttribute('aria-busy', 'true'));

      // Los botones incluyen el conteo: "Periféricos & Teclados, 8 productos"
      expect(
        within(chipGroup).getByRole('button', { name: /Periféricos & Teclados, 8 productos/ }),
      ).toBeInTheDocument();
      expect(
        within(chipGroup).getByRole('button', { name: /Software & Licencias Cloud, 3 productos/ }),
      ).toBeInTheDocument();
      expect(
        within(chipGroup).getByRole('button', { name: 'Todas las categorías' }),
      ).toBeInTheDocument();
      // Nunca se inventan categorías fuera del backend
      expect(within(chipGroup).queryAllByRole('button')).toHaveLength(3);
    });

    it('no inventa categorías cuando el backend no devuelve ninguna (S1)', async () => {
      vi.spyOn(appServices.api, 'listCategories').mockResolvedValue([]);
      mockPagedFromFixtures([mockPhysicalProduct]);

      renderWithClient(<BuyerCatalogPage />);

      const chipGroup = await screen.findByRole('group', { name: 'Categorías de productos' });
      await waitFor(() => {
        expect(within(chipGroup).queryAllByRole('button')).toHaveLength(1);
      });

      expect(
        within(chipGroup).getByRole('button', { name: 'Todas las categorías' }),
      ).toBeInTheDocument();
      expect(screen.getByText(/Aún no hay categorías publicadas/i)).toBeInTheDocument();
    });

    it('informa el error de categorías y permite reintentar (S1)', async () => {
      const categoriesSpy = vi
        .spyOn(appServices.api, 'listCategories')
        .mockRejectedValue(new Error('Catálogo de categorías no disponible'));
      mockPagedFromFixtures([mockPhysicalProduct]);

      renderWithClient(<BuyerCatalogPage />);

      expect(await screen.findByText('No pudimos cargar las categorías')).toBeInTheDocument();

      categoriesSpy.mockResolvedValueOnce(mockCategories);
      fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

      const chipGroup = screen.getByRole('group', { name: 'Categorías de productos' });
      await waitFor(() => {
        expect(
          within(chipGroup).getByRole('button', { name: /Periféricos & Teclados, 8 productos/ }),
        ).toBeInTheDocument();
      });
      expect(screen.queryByText('No pudimos cargar las categorías')).not.toBeInTheDocument();
    });

    it('filtra productos por la categoría real elegida en el chip (S1)', async () => {
      const listSpy = mockPagedFromFixtures([mockPhysicalProduct]);

      renderWithClient(<BuyerCatalogPage />);
      expect(await screen.findByText('Teclado Mecánico Ergonómico')).toBeInTheDocument();
      expect(listSpy).toHaveBeenCalledWith(expect.objectContaining({ category: undefined }));

      fireEvent.click(screen.getByRole('button', { name: /Periféricos & Teclados, 8 productos/ }));

      await waitFor(() => {
        expect(listSpy).toHaveBeenCalledWith(
          expect.objectContaining({ category: 'perifericos', page: 1 }),
        );
      });
      expect(mockNavigate).toHaveBeenLastCalledWith({ search: { cat: 'perifericos' } });

      // Volver a "Todas las categorías"
      fireEvent.click(screen.getByRole('button', { name: 'Todas las categorías' }));

      await waitFor(() => {
        expect(listSpy).toHaveBeenCalledWith(
          expect.objectContaining({ category: undefined, page: 1 }),
        );
      });
      expect(mockNavigate).toHaveBeenLastCalledWith({ search: {} });
    });

    it('envía el orden elegido al backend y reinicia la página (S3)', async () => {
      const listSpy = mockPagedFromFixtures([mockPhysicalProduct, mockDigitalProduct]);

      renderWithClient(<BuyerCatalogPage />);
      await screen.findByText('Teclado Mecánico Ergonómico');

      fireEvent.change(screen.getByLabelText('Ordenar por'), { target: { value: 'price-asc' } });
      await waitFor(() => {
        expect(listSpy).toHaveBeenCalledWith(
          expect.objectContaining({ sort: 'price-asc', page: 1 }),
        );
      });

      fireEvent.change(screen.getByLabelText('Ordenar por'), { target: { value: 'price-desc' } });
      await waitFor(() => {
        expect(listSpy).toHaveBeenCalledWith(
          expect.objectContaining({ sort: 'price-desc', page: 1 }),
        );
      });
    });

    it('sincroniza la página elegida con el URL (?page=) y la pide al backend (S3)', async () => {
      // Crear 25 productos fixture para tener 3 páginas (pageSize=12)
      const manyProducts = Array.from({ length: 25 }, (_, i) => ({
        ...mockPhysicalProduct,
        id: `prod-${i + 1}`,
        name: `Producto ${i + 1}`,
      }));
      mockCatalogChrome();
      const listSpy = mockPagedFromFixtures(manyProducts);

      renderWithClient(<BuyerCatalogPage />);

      // Esperar a que la paginación se renderice (confirma que la query respondió con totalPages > 1)
      await screen.findByRole('navigation', { name: 'Paginación del catálogo' });

      // Verificar que los botones de paginación existen en la renderización inicial
      expect(screen.getByRole('button', { name: 'Ir a la página 1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Ir a la página 2' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Ir a la página 3' })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Ir a la página 3' }));

      await waitFor(() => {
        expect(listSpy).toHaveBeenCalledWith(expect.objectContaining({ page: 3 }));
        expect(mockNavigate).toHaveBeenLastCalledWith({ search: { page: 3 } });
      });

      // Esperar a que el botón de página 3 tenga aria-current="page" (re-render completado)
      await screen.findByRole('button', { name: 'Ir a la página 3' });
      expect(screen.getByRole('button', { name: 'Ir a la página 3' })).toHaveAttribute(
        'aria-current',
        'page',
      );
      expect(screen.getByRole('navigation', { name: 'Paginación del catálogo' })).toBeInTheDocument();

      // Volver a la primera página limpia el parámetro del URL
      fireEvent.click(screen.getByRole('button', { name: 'Ir a la página 1' }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenLastCalledWith({ search: {} });
        expect(listSpy).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }));
      });
    });

    it('compone el hero con productos reales y enlaza a su ficha (S2)', async () => {
      mockPagedFromFixtures([mockPhysicalProduct]);

      renderWithClient(<BuyerCatalogPage />);

      expect(await screen.findByText('Destacado Alfa 1')).toBeInTheDocument();
      expect(screen.getByRole('img', { name: 'Destacado Alfa 1' })).toBeInTheDocument();

      // El precio del destacado es el real del backend, en cifras mono
      const heroLink = screen.getByRole('link', { name: /Destacado Alfa 1/ });
      expect(heroLink).toHaveAttribute(
        'data-params',
        JSON.stringify({ productId: 'hero-prod-1' }),
      );
      expect(heroLink).toHaveTextContent(/1[.,]200[.,]000/);
      // No hay ninguna URL de imagen cableada: la foto sale del producto real
      expect(screen.getByRole('img', { name: 'Destacado Alfa 1' })).toHaveAttribute(
        'src',
        expect.stringContaining('http'),
      );
    });

    it('no muestra imágenes inventadas si fallan los destacados del hero (S2)', async () => {
      vi.spyOn(appServices.api, 'listHeroProducts').mockRejectedValue(
        new Error('Destacados no disponibles'),
      );
      mockPagedFromFixtures([mockPhysicalProduct]);

      renderWithClient(<BuyerCatalogPage />);

      expect(await screen.findByText('No pudimos cargar los productos destacados')).toBeInTheDocument();
      expect(screen.queryByAltText(/Destacado Alfa/)).not.toBeInTheDocument();
      // El catálogo completo sigue disponible para el comprador
      expect(await screen.findByText('Teclado Mecánico Ergonómico')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // 2. BuyerProductDetailPage
  // ==========================================================================
  describe('BuyerProductDetailPage', () => {
    it('renderiza la ficha técnica con Split-Frame 60%/40% y selector de variantes', async () => {
      mockParams = { productId: mockPhysicalProduct.id };
      vi.spyOn(appServices.api, 'getProductById').mockResolvedValue(mockPhysicalProduct);
      vi.spyOn(appServices.api, 'listOrders').mockResolvedValue([]);

      renderWithClient(<BuyerProductDetailPage />);

      expect(await screen.findByText('Teclado Mecánico Ergonómico')).toBeInTheDocument();
      expect(screen.getByText(/Switches silenciosos/i)).toBeInTheDocument();
      expect(screen.getByText('SKU: KB-ERG-01')).toBeInTheDocument();
      expect(screen.getByText('SKU: KB-ERG-02')).toBeInTheDocument();
      expect(screen.getByText('Disponible')).toBeInTheDocument();
      expect(screen.getByText('Agotado')).toBeInTheDocument();
    });

    it('permite incrementar y decrementar la cantidad a comprar', async () => {
      mockParams = { productId: mockPhysicalProduct.id };
      vi.spyOn(appServices.api, 'getProductById').mockResolvedValue(mockPhysicalProduct);
      vi.spyOn(appServices.api, 'listOrders').mockResolvedValue([]);

      renderWithClient(<BuyerProductDetailPage />);
      await screen.findByText('Teclado Mecánico Ergonómico');

      const incBtn = screen.getByRole('button', { name: '+' });
      fireEvent.click(incBtn);
      expect(screen.getByText('2')).toBeInTheDocument();

      const decBtn = screen.getByRole('button', { name: '-' });
      fireEvent.click(decBtn);
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('crea un nuevo carrito si no existe y agrega el ítem', async () => {
      mockParams = { productId: mockPhysicalProduct.id };
      vi.spyOn(appServices.api, 'getProductById').mockResolvedValue(mockPhysicalProduct);
      vi.spyOn(appServices.api, 'listOrders').mockResolvedValue([]);
      const createCartSpy = vi.spyOn(appServices.api, 'createCart').mockResolvedValue('new-cart-id');
      const addCartItemSpy = vi.spyOn(appServices.api, 'addCartItem').mockResolvedValue();

      renderWithClient(<BuyerProductDetailPage />);
      await screen.findByText('Teclado Mecánico Ergonómico');

      const addButton = screen.getByRole('button', { name: /Agregar al Carrito/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(createCartSpy).toHaveBeenCalled();
        expect(addCartItemSpy).toHaveBeenCalledWith({
          orderId: 'new-cart-id',
          variantId: 'var-1111-1111',
          quantity: 1,
        });
      });
    });

    it('agrega al carrito existente con reserva de stock al presionar el botón primario', async () => {
      mockParams = { productId: mockPhysicalProduct.id };
      vi.spyOn(appServices.api, 'getProductById').mockResolvedValue(mockPhysicalProduct);
      vi.spyOn(appServices.api, 'listOrders').mockResolvedValue([mockCartOrder]);
      const addCartItemSpy = vi.spyOn(appServices.api, 'addCartItem').mockResolvedValue();

      renderWithClient(<BuyerProductDetailPage />);
      await screen.findByText('Teclado Mecánico Ergonómico');

      const addButton = screen.getByRole('button', { name: /Agregar al Carrito/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(addCartItemSpy).toHaveBeenCalledWith({
          orderId: mockCartOrder.id,
          variantId: 'var-1111-1111',
          quantity: 1,
        });
      });

      expect(await screen.findByText(/agregada\(s\) al carrito con reserva de stock/i)).toBeInTheDocument();
    });

    it('muestra mensaje de error si falla la adición al carrito', async () => {
      mockParams = { productId: mockPhysicalProduct.id };
      vi.spyOn(appServices.api, 'getProductById').mockResolvedValue(mockPhysicalProduct);
      vi.spyOn(appServices.api, 'listOrders').mockResolvedValue([mockCartOrder]);
      vi.spyOn(appServices.api, 'addCartItem').mockRejectedValue(new Error('Inventario agotado en bodega'));

      renderWithClient(<BuyerProductDetailPage />);
      await screen.findByText('Teclado Mecánico Ergonómico');

      const addButton = screen.getByRole('button', { name: /Agregar al Carrito/i });
      fireEvent.click(addButton);

      expect(await screen.findByText(/Inventario agotado en bodega/i)).toBeInTheDocument();
    });

    it('deshabilita la compra si se selecciona una variante agotada (canBeSold=false)', async () => {
      mockParams = { productId: mockPhysicalProduct.id };
      vi.spyOn(appServices.api, 'getProductById').mockResolvedValue(mockPhysicalProduct);
      vi.spyOn(appServices.api, 'listOrders').mockResolvedValue([]);

      renderWithClient(<BuyerProductDetailPage />);
      await screen.findByText('Teclado Mecánico Ergonómico');

      // Seleccionar la segunda variante que está agotada
      const soldOutVariantRow = screen.getByText('SKU: KB-ERG-02');
      fireEvent.click(soldOutVariantRow);

      expect(screen.getByRole('button', { name: /Variante sin existencias/i })).toBeDisabled();
    });

    it('muestra alerta de error si el producto no existe o falla la consulta y soporta producto Digital sin descripción', async () => {
      mockParams = { productId: 'invalid-id' };
      vi.spyOn(appServices.api, 'getProductById').mockRejectedValueOnce(new Error('Producto no encontrado'));

      const { unmount } = renderWithClient(<BuyerProductDetailPage />);

      expect(await screen.findByText('Error al cargar el producto')).toBeInTheDocument();
      expect(screen.getByText(/Producto no encontrado/i)).toBeInTheDocument();

      unmount();
      vi.spyOn(appServices.api, 'getProductById').mockResolvedValueOnce({
        ...mockPhysicalProduct,
        type: ProductType.Digital,
        description: '',
      });
      renderWithClient(<BuyerProductDetailPage />);
      expect(await screen.findByText('Producto Digital')).toBeInTheDocument();
      expect(
        screen.getByText('Sin descripción detallada provista por el vendedor.'),
      ).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // 3. BuyerCartPage
  // ==========================================================================
  describe('BuyerCartPage', () => {
    it('muestra estado vacío cuando el carrito no tiene líneas', async () => {
      vi.spyOn(appServices.api, 'listOrders').mockResolvedValue([]);

      renderWithClient(<BuyerCartPage />);

      expect(await screen.findByText(/Tu carrito está vacío/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Explorar Catálogo/i })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Explorar Catálogo/i }));
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/buyer/catalog' });
    });

    it('muestra error si falla la consulta del carrito y permite reintentar', async () => {
      const listSpy = vi.spyOn(appServices.api, 'listOrders').mockRejectedValue(new Error('Fallo de conexión'));

      renderWithClient(<BuyerCartPage />);

      expect(await screen.findByText('Error al cargar el carrito')).toBeInTheDocument();
      expect(screen.getByText(/Fallo de conexión/i)).toBeInTheDocument();

      listSpy.mockResolvedValueOnce([mockCartOrder]);
      fireEvent.click(screen.getByRole('button', { name: /Reintentar/i }));
    });

    it('renderiza líneas del carrito, precios congelados y dispara checkout de 15 min', async () => {
      vi.spyOn(appServices.api, 'listOrders').mockResolvedValue([
        {
          ...mockCartOrder,
          items: [
            ...mockCartOrder.items,
            {
              id: 'item-2222',
              variantId: 'var-2222-2222',
              quantity: 1,
              unitPrice: 50000,
              totalPrice: 50000,
            },
          ],
        },
      ]);
      const checkoutSpy = vi.spyOn(appServices.api, 'checkoutOrder').mockResolvedValue();

      renderWithClient(<BuyerCartPage />);

      expect(await screen.findByText(/Carrito de Compras/i)).toBeInTheDocument();
      expect(screen.getByText('2 líneas')).toBeInTheDocument();
      expect(screen.getByText(/Variante SKU: var-1111/i)).toBeInTheDocument();
      expect(screen.getByText('Confirmar Checkout (Reserva 15 min)')).toBeInTheDocument();

      // Confirmar checkout
      const checkoutBtn = screen.getByRole('button', { name: /Confirmar Checkout/i });
      fireEvent.click(checkoutBtn);

      await waitFor(() => {
        expect(checkoutSpy).toHaveBeenCalledWith(mockCartOrder.id);
        expect(mockNavigate).toHaveBeenCalledWith({
          to: '/buyer/orders/$orderId/pay',
          params: { orderId: mockCartOrder.id },
        });
      });
    });

    it('muestra alerta de error si falla la mutación de checkout', async () => {
      vi.spyOn(appServices.api, 'listOrders').mockResolvedValue([mockCartOrder]);
      vi.spyOn(appServices.api, 'checkoutOrder').mockRejectedValue(new Error('Reserva bloqueada'));

      renderWithClient(<BuyerCartPage />);
      expect(await screen.findByText(/Carrito de Compras/i)).toBeInTheDocument();
      expect(screen.getByText('1 línea')).toBeInTheDocument();

      const checkoutBtn = screen.getByRole('button', { name: /Confirmar Checkout/i });
      fireEvent.click(checkoutBtn);

      expect(await screen.findByText(/Reserva bloqueada/i)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // 4. BuyerOrdersPage
  // ==========================================================================
  describe('BuyerOrdersPage', () => {
    it('renderiza Hero KPI Strip con contadores y listado filtrable de pedidos', async () => {
      vi.spyOn(appServices.api, 'listOrders').mockResolvedValue([
        mockCartOrder,
        mockPendingPaymentOrder,
        {
          ...mockDeliveredOrder,
          itemCount: 2,
        } as unknown as OrderListItem,
      ]);

      renderWithClient(<BuyerOrdersPage />);

      expect(await screen.findByText('Mis Pedidos')).toBeInTheDocument();
      expect(screen.getByText('Pendientes de Pago (15 min)')).toBeInTheDocument();
      expect(screen.getByText('En Proceso y Despacho')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Entregados' })).toBeInTheDocument();

      // Pedido pendiente de pago muestra botón de pagar
      expect(screen.getByRole('button', { name: /Pagar Pedido/i })).toBeInTheDocument();
    });

    it('permite filtrar por estado del pedido', async () => {
      vi.spyOn(appServices.api, 'listOrders').mockResolvedValue([
        mockPendingPaymentOrder,
        {
          ...mockDeliveredOrder,
          itemCount: 2,
        } as unknown as OrderListItem,
      ]);

      renderWithClient(<BuyerOrdersPage />);
      await screen.findByText('Mis Pedidos');

      // Filtrar sólo Entregados
      const deliveredFilterBtn = screen.getByRole('button', { name: 'Entregados' });
      fireEvent.click(deliveredFilterBtn);

      expect(screen.queryByText(/order-pending-1/i)).not.toBeInTheDocument();
      expect(screen.getByText(/Pedido #order-de/i)).toBeInTheDocument();

      // Filtrar por Cancelados (estado vacío filtrado)
      const cancelledFilterBtn = screen.getByRole('button', { name: 'Cancelados' });
      fireEvent.click(cancelledFilterBtn);
      expect(screen.getByText(/No se encontraron pedidos/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Mostrar todos/i })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Mostrar todos/i }));
    });

    it('muestra alerta de error si falla la consulta y permite reintentar', async () => {
      const listSpy = vi.spyOn(appServices.api, 'listOrders').mockRejectedValue(new Error('Fallo de órdenes'));

      renderWithClient(<BuyerOrdersPage />);

      expect(await screen.findByText('Error al cargar el historial de pedidos')).toBeInTheDocument();
      expect(screen.getByText(/Fallo de órdenes/i)).toBeInTheDocument();

      listSpy.mockResolvedValueOnce([mockPendingPaymentOrder]);
      fireEvent.click(screen.getByRole('button', { name: /Reintentar/i }));
    });

    it('renderiza metadatos de snapshot (nombre real, SKU, miniatura y vendedor) en las líneas del pedido (Slice 1)', async () => {
      vi.spyOn(appServices.api, 'listOrders').mockResolvedValue([mockSnapshotOrderListItem]);

      renderWithClient(<BuyerOrdersPage />);

      expect(await screen.findByText('Mis Pedidos')).toBeInTheDocument();
      expect(screen.getByText('Monitor Gamer 27" Curvo 165Hz')).toBeInTheDocument();
      expect(screen.getByText(/SKU: MON-GM-27-165/i)).toBeInTheDocument();
      expect(screen.getByText('TechStore Colombia')).toBeInTheDocument();

      const img = screen.getByAltText('Monitor Gamer 27" Curvo 165Hz');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500');
    });
  });

  // ==========================================================================
  // 5. BuyerOrderDetailPage
  // ==========================================================================
  describe('BuyerOrderDetailPage', () => {
    it('renderiza desglose de líneas, guías de despacho, Factura Maestra y OrderTimeline', async () => {
      mockParams = { orderId: mockDeliveredOrder.id };
      vi.spyOn(appServices.api, 'getOrderById').mockResolvedValue(mockDeliveredOrder);

      const mockFulfillment: FulfillmentOrder = {
        id: 'ful-1111-1111',
        customerOrderId: mockDeliveredOrder.id,
        vendorId: 'vendor-1',
        status: FulfillmentStatus.Delivered,
        cancellationReason: null,
        shipments: [
          {
            id: 'ship-1',
            warehouseId: 'wh-1',
            trackingNumber: 'TRK-ZENTRIC-9988',
          },
        ],
        createdAt: new Date().toISOString(),
      };
      vi.spyOn(appServices.api, 'listFulfillments').mockResolvedValue([mockFulfillment]);

      const mockInvoice: Invoice = {
        id: 'inv-1111-1111',
        customerOrderId: mockDeliveredOrder.id,
        vendorId: null,
        type: InvoiceType.Master,
        totalAmount: 300000,
        currency: 'COP',
        issuedAt: new Date().toISOString(),
      };
      vi.spyOn(appServices.api, 'getInvoicesByOrder').mockResolvedValue([mockInvoice]);

      renderWithClient(<BuyerOrderDetailPage />);

      expect(await screen.findByText(/Pedido #order-de/i)).toBeInTheDocument();
      expect(screen.getByText(/TRK-ZENTRIC-9988/i)).toBeInTheDocument();
      expect(screen.getByText(/Factura #inv-1111/i)).toBeInTheDocument();
      expect(screen.getByText(/Solicitar Devolución/i)).toBeInTheDocument();
    });

    it('muestra botón de pagar si el pedido está en PendingPayment y mensajes de espera', async () => {
      mockParams = { orderId: mockPendingPaymentOrder.id };
      vi.spyOn(appServices.api, 'getOrderById').mockResolvedValue({
        id: mockPendingPaymentOrder.id,
        buyerId: 'buyer-1',
        status: OrderStatus.PendingPayment,
        totalAmount: 150000,
        currency: 'COP',
        items: mockPendingPaymentOrder.items,
        createdAt: new Date().toISOString(),
      });
      vi.spyOn(appServices.api, 'listFulfillments').mockResolvedValue([]);
      vi.spyOn(appServices.api, 'getInvoicesByOrder').mockResolvedValue([]);

      renderWithClient(<BuyerOrderDetailPage />);

      expect(await screen.findByText(/Pagar Pedido \(15 min\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Las guías y paquetes de despacho se generan automáticamente/i)).toBeInTheDocument();
      expect(screen.getByText(/La Factura Maestra se emitirá automáticamente/i)).toBeInTheDocument();
    });

    it('muestra alerta si el pedido no existe o falla la consulta', async () => {
      mockParams = { orderId: 'invalid-id' };
      vi.spyOn(appServices.api, 'getOrderById').mockRejectedValue(new Error('Pedido no encontrado'));

      renderWithClient(<BuyerOrderDetailPage />);

      expect(await screen.findByText('Error al cargar el pedido')).toBeInTheDocument();
    });

    it('renderiza metadatos de snapshot enriquecidos (nombre, SKU badge, vendedor badge y miniatura) en el expediente (Slice 1)', async () => {
      mockParams = { orderId: mockSnapshotOrder.id };
      vi.spyOn(appServices.api, 'getOrderById').mockResolvedValue(mockSnapshotOrder);
      vi.spyOn(appServices.api, 'listFulfillments').mockResolvedValue([]);
      vi.spyOn(appServices.api, 'getInvoicesByOrder').mockResolvedValue([]);

      renderWithClient(<BuyerOrderDetailPage />);

      expect(await screen.findByText('Monitor Gamer 27" Curvo 165Hz')).toBeInTheDocument();
      expect(screen.getByText('SKU: MON-GM-27-165')).toBeInTheDocument();
      expect(screen.getByText('Vendedor: TechStore Colombia')).toBeInTheDocument();

      const img = screen.getByAltText('Monitor Gamer 27" Curvo 165Hz');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500');
    });
  });

  // ==========================================================================
  // 6. BuyerOrderPaymentPage
  // ==========================================================================
  describe('BuyerOrderPaymentPage', () => {
    it('renderiza temporizador de 15 min, campos de tarjeta y procesa el pago atómico', async () => {
      mockParams = { orderId: mockPendingPaymentOrder.id };
      vi.spyOn(appServices.api, 'getOrderById').mockResolvedValue({
        id: mockPendingPaymentOrder.id,
        buyerId: 'buyer-1',
        status: OrderStatus.PendingPayment,
        totalAmount: 150000,
        currency: 'COP',
        items: mockPendingPaymentOrder.items,
        createdAt: new Date().toISOString(),
      });
      const paySpy = vi.spyOn(appServices.api, 'payOrder').mockResolvedValue();

      renderWithClient(<BuyerOrderPaymentPage />);

      expect(await screen.findByText('Pasarela de Pago')).toBeInTheDocument();
      expect(screen.getByText(/Tiempo Restante de Reserva Atómica/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue(/4532 •••• •••• 8821/i)).toBeInTheDocument();

      // Modificar datos de la tarjeta
      fireEvent.change(screen.getByDisplayValue(/COMPRADOR ZENTRIC/i), { target: { value: 'NUEVO TITULAR' } });
      fireEvent.change(screen.getByDisplayValue(/12\/28/i), { target: { value: '11/29' } });
      fireEvent.change(screen.getByDisplayValue(/742/i), { target: { value: '999' } });

      const payBtn = screen.getByRole('button', { name: /Confirmar y Pagar Pedido/i });
      fireEvent.click(payBtn);

      await waitFor(() => {
        expect(paySpy).toHaveBeenCalledWith(mockPendingPaymentOrder.id);
        expect(mockNavigate).toHaveBeenCalledWith({
          to: '/buyer/orders/$orderId',
          params: { orderId: mockPendingPaymentOrder.id },
        });
      });
    });

    it('informa si el pedido ya fue pagado previamente', async () => {
      mockParams = { orderId: mockDeliveredOrder.id };
      vi.spyOn(appServices.api, 'getOrderById').mockResolvedValue(mockDeliveredOrder);

      renderWithClient(<BuyerOrderPaymentPage />);

      expect(await screen.findByText('Este pedido ya fue procesado')).toBeInTheDocument();
      expect(screen.getByText(/Ver Expediente de Pedido/i)).toBeInTheDocument();
    });

    it('muestra error si falla el pago y si falla la consulta del pedido', async () => {
      mockParams = { orderId: mockPendingPaymentOrder.id };
      vi.spyOn(appServices.api, 'getOrderById').mockResolvedValue({
        id: mockPendingPaymentOrder.id,
        buyerId: 'buyer-1',
        status: OrderStatus.PendingPayment,
        totalAmount: 150000,
        currency: 'COP',
        items: mockPendingPaymentOrder.items,
        createdAt: new Date().toISOString(),
      });
      vi.spyOn(appServices.api, 'payOrder').mockRejectedValue(new Error('Fondos insuficientes'));

      renderWithClient(<BuyerOrderPaymentPage />);
      expect(await screen.findByText('Pasarela de Pago')).toBeInTheDocument();

      const payBtn = screen.getByRole('button', { name: /Confirmar y Pagar Pedido/i });
      fireEvent.click(payBtn);

      expect(await screen.findByText('Fallo en la transacción')).toBeInTheDocument();
      expect(screen.getByText(/Fondos insuficientes/i)).toBeInTheDocument();
    });

    it('muestra alerta si no se puede cargar el pedido para pago', async () => {
      mockParams = { orderId: 'bad-id' };
      vi.spyOn(appServices.api, 'getOrderById').mockRejectedValue(new Error('Pedido inexistente'));

      renderWithClient(<BuyerOrderPaymentPage />);

      expect(await screen.findByText('Error al consultar el pedido para pago')).toBeInTheDocument();
    });

    it('transiciona a estado urgente (<= 180s) y expirado (00:00) con el temporizador de 15 minutos', async () => {
      let intervalCallback: (() => void) | null = null;
      const origSetInterval = globalThis.setInterval;
      const setIntervalSpy = vi
        .spyOn(globalThis, 'setInterval')
        .mockImplementation(((cb: TimerHandler, ms?: number, ...args: unknown[]) => {
          if (ms === 1000 && typeof cb === 'function') {
            intervalCallback = cb as () => void;
          }
          return origSetInterval(cb, ms, ...args);
        }) as typeof setInterval);

      try {
        mockParams = { orderId: mockPendingPaymentOrder.id };
        vi.spyOn(appServices.api, 'getOrderById').mockResolvedValue({
          id: mockPendingPaymentOrder.id,
          buyerId: 'buyer-1',
          status: OrderStatus.PendingPayment,
          totalAmount: 150000,
          currency: 'COP',
          items: mockPendingPaymentOrder.items,
          createdAt: new Date().toISOString(),
        });

        renderWithClient(<BuyerOrderPaymentPage />);
        expect(await screen.findByText('Pasarela de Pago')).toBeInTheDocument();

        fireEvent.change(screen.getByDisplayValue(/4532 •••• •••• 8821/i), {
          target: { value: '4111 2222 3333 4444' },
        });

        act(() => {
          for (let i = 0; i < 730; i += 1) {
            intervalCallback?.();
          }
        });
        expect(screen.getByText(/¡Últimos minutos!/i)).toBeInTheDocument();

        act(() => {
          for (let i = 0; i < 175; i += 1) {
            intervalCallback?.();
          }
        });
        expect(screen.getByText('Reserva Expirada')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Tiempo de reserva agotado/i })).toBeDisabled();
      } finally {
        setIntervalSpy.mockRestore();
      }
    });

    it('sincroniza el temporizador de cuenta regresiva dinámicamente con order.expiresAt del servidor (Slice 2)', async () => {
      mockParams = { orderId: mockSnapshotOrder.id };
      // expiresAt configurado exactamente a 300 segundos en el futuro
      const futureOrder: Order = {
        ...mockSnapshotOrder,
        expiresAt: new Date(Date.now() + 300 * 1000).toISOString(),
      };
      vi.spyOn(appServices.api, 'getOrderById').mockResolvedValue(futureOrder);

      renderWithClient(<BuyerOrderPaymentPage />);

      expect(await screen.findByText('Pasarela de Pago')).toBeInTheDocument();
      // Debe mostrar ~05:00 o 04:59, nunca el valor hardcodeado por defecto de 15:00
      expect(screen.getByText(/0[45]:[0-5][0-9]/)).toBeInTheDocument();
      expect(screen.queryByText('15:00')).not.toBeInTheDocument();
    });

    it('informa inmediatamente que la reserva expiró si order.expiresAt está en el pasado (Slice 2)', async () => {
      mockParams = { orderId: mockSnapshotOrder.id };
      const expiredOrder: Order = {
        ...mockSnapshotOrder,
        expiresAt: new Date(Date.now() - 60 * 1000).toISOString(),
      };
      vi.spyOn(appServices.api, 'getOrderById').mockResolvedValue(expiredOrder);

      renderWithClient(<BuyerOrderPaymentPage />);

      expect(await screen.findByText('Pasarela de Pago')).toBeInTheDocument();
      expect(screen.getByText('Reserva Expirada')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Tiempo de reserva agotado/i })).toBeDisabled();
    });
  });

  // ==========================================================================
  // 7. RequestReturnPage
  // ==========================================================================
  describe('RequestReturnPage', () => {
    it('permite registrar la solicitud de devolución sobre un pedido entregado', async () => {
      mockSearch = { orderId: mockDeliveredOrder.id };
      vi.spyOn(appServices.api, 'listOrders').mockResolvedValue([
        {
          ...mockDeliveredOrder,
          itemCount: 2,
        } as unknown as OrderListItem,
      ]);
      vi.spyOn(appServices.api, 'getOrderById').mockResolvedValue(mockDeliveredOrder);
      vi.spyOn(appServices.api, 'listWarehouses').mockResolvedValue([
        {
          id: 'wh-1',
          name: 'Bodega Central Bogotá',
          location: 'Bogotá D.C.',
          capacity: 500,
          type: WarehouseType.Marketplace,
          isActive: true,
          vendorId: null,
          createdAt: new Date().toISOString(),
        },
      ]);
      vi.spyOn(appServices.api, 'listFulfillments').mockResolvedValue([]);
      const requestReturnSpy = vi.spyOn(appServices.api, 'requestReturn').mockResolvedValue('ret-1');

      renderWithClient(<RequestReturnPage />);

      expect(await screen.findByText('Solicitud de Devolución')).toBeInTheDocument();
      expect(screen.getByText(/Variante SKU: var-1111/i)).toBeInTheDocument();

      // Seleccionar variante
      const variantCard = screen.getByText(/Variante SKU: var-1111/i);
      fireEvent.click(variantCard);

      // Cambiar cantidad, bodega y motivo
      const reasonInput = screen.getByPlaceholderText(/Describa el motivo técnico/i);
      fireEvent.change(reasonInput, { target: { value: 'Producto con empaque golpeado' } });

      const warehouseSelect = screen.getByDisplayValue(/Bodega por defecto/i);
      fireEvent.change(warehouseSelect, { target: { value: 'wh-1' } });

      // Enviar formulario
      const submitBtn = screen.getByRole('button', { name: /Enviar Solicitud de Devolución/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(requestReturnSpy).toHaveBeenCalledWith({
          customerOrderId: mockDeliveredOrder.id,
          variantId: 'var-1111-1111',
          warehouseId: 'wh-1',
          quantity: 1,
        });
      });

      expect(await screen.findByText(/Solicitud de devolución registrada exitosamente/i)).toBeInTheDocument();
    });

    it('valida campos obligatorios y muestra error si falla la mutación', async () => {
      mockSearch = {};
      vi.spyOn(appServices.api, 'listOrders').mockResolvedValue([
        {
          ...mockDeliveredOrder,
          itemCount: 2,
        } as unknown as OrderListItem,
      ]);
      vi.spyOn(appServices.api, 'getOrderById').mockResolvedValue(mockDeliveredOrder);
      vi.spyOn(appServices.api, 'listWarehouses').mockResolvedValue([]);
      vi.spyOn(appServices.api, 'listFulfillments').mockResolvedValue([]);
      vi.spyOn(appServices.api, 'requestReturn').mockRejectedValue(new Error('Rechazo de devolución en servidor'));

      const { container } = renderWithClient(<RequestReturnPage />);
      expect(await screen.findByText('Solicitud de Devolución')).toBeInTheDocument();

      // Submit sin pedido seleccionado
      const form = container.querySelector('form');
      if (form) fireEvent.submit(form);
      expect(await screen.findByText(/Debe seleccionar un pedido entregado y una variante/i)).toBeInTheDocument();

      // Seleccionar pedido desde dropdown
      const orderSelect = screen.getByRole('combobox');
      fireEvent.change(orderSelect, { target: { value: mockDeliveredOrder.id } });

      expect(await screen.findByText(/Variante SKU: var-1111/i)).toBeInTheDocument();
      fireEvent.click(screen.getByText(/Variante SKU: var-1111/i));

      // Configurar cantidad inválida
      const quantityInput = screen.getByDisplayValue('1');
      fireEvent.change(quantityInput, { target: { value: '0' } });

      const submitBtn = screen.getByRole('button', { name: /Enviar Solicitud de Devolución/i });
      fireEvent.click(submitBtn);

      expect(await screen.findByText(/La cantidad debe ser mayor a cero/i)).toBeInTheDocument();

      // Configurar cantidad válida y disparar fallo del servidor
      fireEvent.change(quantityInput, { target: { value: '1' } });
      fireEvent.click(submitBtn);
      expect(await screen.findByText(/Rechazo de devolución en servidor/i)).toBeInTheDocument();
    });

    it('muestra aviso cuando no hay pedidos entregados elegibles', async () => {
      mockSearch = {};
      vi.spyOn(appServices.api, 'listOrders').mockResolvedValue([]);
      vi.spyOn(appServices.api, 'listWarehouses').mockResolvedValue([]);
      vi.spyOn(appServices.api, 'listFulfillments').mockResolvedValue([]);

      renderWithClient(<RequestReturnPage />);
      expect(
        await screen.findByText(/No cuenta con pedidos en estado Entregado/i),
      ).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // 8. BuyerProfilePage (Slice 3: Perfil Persistente de Comprador)
  // ==========================================================================
  describe('BuyerProfilePage (Slice 3: Perfil Persistente)', () => {
    const mockProfileData: UserProfile = {
      id: 'usr-buyer-001',
      email: 'comprador@zentric.co',
      fullName: 'Carlos Comprador SDD',
      documentNumber: '1098765432',
      role: 'Buyer',
      phone: '+57 300 123 4567',
      address: {
        street: 'Carrera 7 # 71-21, Oficina 802',
        city: 'Bogotá D.C.',
        state: 'Cundinamarca',
        zipCode: '110221',
        country: 'Colombia',
      },
    };

    it('carga y renderiza los datos del perfil desde la API (GET /api/users/profile) sin usar localStorage', async () => {
      const getSpy = vi.spyOn(appServices.api, 'getUserProfile').mockResolvedValue(mockProfileData);
      vi.spyOn(appServices.api, 'listOrders').mockResolvedValue([]);
      const localGetSpy = vi.spyOn(Storage.prototype, 'getItem');

      renderWithClient(<BuyerProfilePage />);

      expect(await screen.findByDisplayValue('Carlos Comprador SDD')).toBeInTheDocument();
      expect(screen.getByDisplayValue('comprador@zentric.co')).toBeInTheDocument();
      expect(screen.getByDisplayValue('+57 300 123 4567')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1098765432')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Carrera 7 # 71-21, Oficina 802')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Bogotá D.C.')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Cundinamarca')).toBeInTheDocument();
      expect(screen.getByDisplayValue('110221')).toBeInTheDocument();

      expect(getSpy).toHaveBeenCalled();
      // Invariante de diseño: Prohibido usar localStorage para el perfil del comprador
      expect(localGetSpy).not.toHaveBeenCalledWith('zentric_buyer_profile');
      expect(localGetSpy).not.toHaveBeenCalledWith('buyer_profile');
    });

    it('actualiza el perfil invocando PUT /api/users/profile y muestra confirmación de éxito', async () => {
      vi.spyOn(appServices.api, 'getUserProfile').mockResolvedValue(mockProfileData);
      vi.spyOn(appServices.api, 'listOrders').mockResolvedValue([]);
      const updateSpy = vi.spyOn(appServices.api, 'updateUserProfile').mockResolvedValue({
        ...mockProfileData,
        fullName: 'Carlos Actualizado',
        phone: '+57 311 999 8888',
      });
      const localSetSpy = vi.spyOn(Storage.prototype, 'setItem');

      renderWithClient(<BuyerProfilePage />);

      expect(await screen.findByDisplayValue('Carlos Comprador SDD')).toBeInTheDocument();

      // Modificar datos en el formulario
      fireEvent.change(screen.getByDisplayValue('Carlos Comprador SDD'), {
        target: { value: 'Carlos Actualizado' },
      });
      fireEvent.change(screen.getByDisplayValue('+57 300 123 4567'), {
        target: { value: '+57 311 999 8888' },
      });

      // Enviar formulario
      const submitBtn = screen.getByRole('button', { name: /Guardar Cambios de Perfil/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(updateSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            fullName: 'Carlos Actualizado',
            phone: '+57 311 999 8888',
            documentNumber: '1098765432',
            address: expect.objectContaining({
              street: 'Carrera 7 # 71-21, Oficina 802',
              city: 'Bogotá D.C.',
              state: 'Cundinamarca',
              zipCode: '110221',
              country: 'Colombia',
            }),
          })
        );
      });

      expect(
        await screen.findByText(/Tus datos de perfil y preferencias de despacho fueron actualizados correctamente/i)
      ).toBeInTheDocument();

      // Cero escritura a localStorage
      expect(localSetSpy).not.toHaveBeenCalledWith('zentric_buyer_profile', expect.anything());
    });

    it('muestra alerta descriptiva cuando la actualización del perfil falla en la API', async () => {
      vi.spyOn(appServices.api, 'getUserProfile').mockResolvedValue(mockProfileData);
      vi.spyOn(appServices.api, 'listOrders').mockResolvedValue([]);
      vi.spyOn(appServices.api, 'updateUserProfile').mockRejectedValue(
        new Error('Dirección de despacho no válida para la zona de cobertura')
      );

      renderWithClient(<BuyerProfilePage />);

      expect(await screen.findByDisplayValue('Carlos Comprador SDD')).toBeInTheDocument();

      const submitBtn = screen.getByRole('button', { name: /Guardar Cambios de Perfil/i });
      fireEvent.click(submitBtn);

      expect(
        await screen.findByText(/Dirección de despacho no válida para la zona de cobertura/i)
      ).toBeInTheDocument();
    });
  });
});


