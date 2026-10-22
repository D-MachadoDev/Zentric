import type { FC, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, createRouter, RouterContextProvider } from '@tanstack/react-router';
import { AuthContext, type AuthValue } from '../app/providers/authContext';
import { appServices } from '../app/providers/appServices';
import { routerOptions } from '../app/routes/routerOptions';
import { MockZentricApiAdapter } from '../adapters/mocks/MockZentricApiAdapter';
import { setDefaultApi } from '../application';
import {
  FulfillmentStatus,
  InvoiceType,
  OrderStatus,
  ProductStatus,
  ProductType,
  ReturnStatus,
  UserRole,
  WarehouseType,
  type FulfillmentOrder,
  type Inventory,
  type Invoice,
  type Order,
  type Product,
  type ReturnRequest,
  type User,
  type Warehouse,
} from '../domain';

/**
 * Sustrato comun de las historias de modulo por rol (Frontend-Role-Modules).
 *
 * Una pantalla de rol no es solo un componente: es el shell, el router con sus
 * guardas, la sesion en memoria y el cache de consultas. Este modulo reproduce
 * ese entorno con datos deterministas del dominio Zentric, de modo que la
 * historia muestre la consola real y no un esqueleto vacio.
 *
 * - `createRoleStory` deja el router en memoria sobre la ruta del modulo, con
 *   la sesion ya autenticada para que las guardas de `beforeLoad` dejen pasar.
 * - `createStoryApi` inyecta el adaptador simulado con datos de Zentric
 *   (productos con `vendorId` y variantes con `sku`, pedidos con estado,
 *   despachos, facturas, devoluciones, usuarios y bodegas).
 */

// ─────────────────────────────────────────────────────────────────────────────
// Datos deterministas del dominio
// ─────────────────────────────────────────────────────────────────────────────

const VENDOR_ID = '00000000-0000-0000-0000-000000000002';
const BUYER_ID = '00000000-0000-0000-0000-000000000003';

const STORY_PRODUCTS: Product[] = [
  {
    id: '44444444-4444-4444-4444-444444444441',
    name: 'Notebook profesional 14"',
    description:
      'Portatil de 14 pulgadas con 16 nucleos, 32 GB de RAM y SSD de 1 TB. Facturacion electronica con IVA incluido.',
    price: 4_850_000,
    currency: 'COP',
    vendorId: VENDOR_ID,
    type: ProductType.Physical,
    status: ProductStatus.Published,
    variants: [
      {
        id: '55555555-5555-5555-5555-555555555551',
        sku: 'NB-PRO-14-16-32',
        canBeSold: true,
        availableStock: 24,
      },
      {
        id: '55555555-5555-5555-5555-555555555552',
        sku: 'NB-PRO-14-32-64',
        canBeSold: true,
        availableStock: 6,
      },
    ],
    createdAt: '2026-03-11T09:00:00Z',
    imageUrl: null,
    category: 'Computadores',
  },
  {
    id: '44444444-4444-4444-4444-444444444442',
    name: 'Teclado mecanico 87 teclas',
    description: 'Switches lineales,ilightacion RGB y carcasa aluminum con conexion USB-C.',
    price: 389_000,
    currency: 'COP',
    vendorId: VENDOR_ID,
    type: ProductType.Physical,
    status: ProductStatus.Published,
    variants: [
      {
        id: '55555555-5555-5555-5555-555555555553',
        sku: 'TEC-MEC-87-RGB',
        canBeSold: true,
        availableStock: 128,
      },
    ],
    createdAt: '2026-03-14T11:20:00Z',
    imageUrl: null,
    category: 'Perifericos',
  },
  {
    id: '44444444-4444-4444-4444-444444444443',
    name: 'Licencia cloud 24 meses',
    description: 'Suscripcion empresarial de ofimatica en la nube con soporte prioritario.',
    price: 720_000,
    currency: 'COP',
    vendorId: VENDOR_ID,
    type: ProductType.Digital,
    status: ProductStatus.Published,
    variants: [
      {
        id: '55555555-5555-5555-5555-555555555554',
        sku: 'LIC-CLD-24M',
        canBeSold: true,
        availableStock: 999,
      },
    ],
    createdAt: '2026-03-18T08:45:00Z',
    imageUrl: null,
    category: 'Software',
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    name: 'Monitor gaming 27 pulgadas',
    description: 'Panel 144 Hz con resolucion QHD y tiempo de respuesta de 1 ms.',
    price: 1_780_000,
    currency: 'COP',
    vendorId: VENDOR_ID,
    type: ProductType.Physical,
    status: ProductStatus.Suspended,
    variants: [
      {
        id: '55555555-5555-5555-5555-555555555555',
        sku: 'MON-GAM-27-QHD',
        canBeSold: false,
        availableStock: 0,
      },
    ],
    createdAt: '2026-02-02T15:30:00Z',
    imageUrl: null,
    category: 'Perifericos',
  },
];

const STORY_ORDERS: Order[] = [
  {
    id: 'a1b2c3d4-0000-4000-8000-000000000001',
    buyerId: BUYER_ID,
    status: OrderStatus.PendingPayment,
    totalAmount: 2_180_000,
    currency: 'COP',
    items: [
      {
        id: 'cccccccc-0000-4000-8000-000000000001',
        variantId: '55555555-5555-5555-5555-555555555551',
        quantity: 2,
        unitPrice: 890_000,
        totalPrice: 1_780_000,
        productName: 'Notebook profesional 14"',
        sku: 'NB-PRO-14-16-32',
        vendorName: 'Distribuidora Andina',
      },
      {
        id: 'cccccccc-0000-4000-8000-000000000002',
        variantId: '55555555-5555-5555-5555-555555555553',
        quantity: 1,
        unitPrice: 389_000,
        totalPrice: 389_000,
        productName: 'Teclado mecanico 87 teclas',
        sku: 'TEC-MEC-87-RGB',
        vendorName: 'Distribuidora Andina',
      },
    ],
    createdAt: '2026-04-18T14:02:00Z',
    expiresAt: '2026-04-18T14:17:00Z',
  },
  {
    id: 'b2c3d4e5-0000-4000-8000-000000000002',
    buyerId: BUYER_ID,
    status: OrderStatus.Dispatched,
    totalAmount: 12_450_000,
    currency: 'COP',
    items: [
      {
        id: 'cccccccc-0000-4000-8000-000000000003',
        variantId: '55555555-5555-5555-5555-555555555552',
        quantity: 3,
        unitPrice: 4_850_000,
        totalPrice: 14_550_000,
        productName: 'Notebook profesional 14"',
        sku: 'NB-PRO-14-32-64',
        vendorName: 'Distribuidora Andina',
      },
    ],
    createdAt: '2026-04-15T09:41:00Z',
  },
  {
    id: 'c3d4e5f6-0000-4000-8000-000000000003',
    buyerId: BUYER_ID,
    status: OrderStatus.Delivered,
    totalAmount: 890_000,
    currency: 'COP',
    items: [
      {
        id: 'cccccccc-0000-4000-8000-000000000004',
        variantId: '55555555-5555-5555-5555-555555555553',
        quantity: 1,
        unitPrice: 389_000,
        totalPrice: 389_000,
        productName: 'Teclado mecanico 87 teclas',
        sku: 'TEC-MEC-87-RGB',
        vendorName: 'Comercial Caribe',
      },
    ],
    createdAt: '2026-04-02T16:20:00Z',
  },
  {
    id: 'd4e5f6a7-0000-4000-8000-000000000004',
    buyerId: BUYER_ID,
    status: OrderStatus.Cart,
    totalAmount: 1_780_000,
    currency: 'COP',
    items: [
      {
        id: 'cccccccc-0000-4000-8000-000000000005',
        variantId: '55555555-5555-5555-5555-555555555554',
        quantity: 1,
        unitPrice: 720_000,
        totalPrice: 720_000,
        productName: 'Licencia cloud 24 meses',
        sku: 'LIC-CLD-24M',
        vendorName: 'Distribuidora Andina',
      },
    ],
    createdAt: '2026-04-18T13:55:00Z',
  },
];

const STORY_FULFILLMENTS: FulfillmentOrder[] = [
  {
    id: 'e5f6a7b8-0000-4000-8000-000000000001',
    customerOrderId: 'b2c3d4e5-0000-4000-8000-000000000002',
    vendorId: VENDOR_ID,
    status: FulfillmentStatus.Dispatched,
    cancellationReason: null,
    shipments: [
      {
        id: 'f6a7b8c9-0000-4000-8000-000000000001',
        warehouseId: '11111111-1111-1111-1111-111111111111',
        trackingNumber: 'ZEN-2026-004182',
      },
    ],
    createdAt: '2026-04-16T08:10:00Z',
  },
  {
    id: 'e5f6a7b8-0000-4000-8000-000000000002',
    customerOrderId: 'a1b2c3d4-0000-4000-8000-000000000001',
    vendorId: VENDOR_ID,
    status: FulfillmentStatus.PendingPack,
    cancellationReason: null,
    shipments: [],
    createdAt: '2026-04-18T14:05:00Z',
  },
  {
    id: 'e5f6a7b8-0000-4000-8000-000000000003',
    customerOrderId: 'c3d4e5f6-0000-4000-8000-000000000003',
    vendorId: VENDOR_ID,
    status: FulfillmentStatus.Delivered,
    cancellationReason: null,
    shipments: [
      {
        id: 'f6a7b8c9-0000-4000-8000-000000000002',
        warehouseId: '11111111-1111-1111-1111-111111111111',
        trackingNumber: 'ZEN-2026-003977',
      },
    ],
    createdAt: '2026-04-03T07:30:00Z',
  },
];

const STORY_INVOICES: Invoice[] = [
  {
    id: 'a7b8c9d0-0000-4000-8000-000000000001',
    customerOrderId: 'b2c3d4e5-0000-4000-8000-000000000002',
    vendorId: null,
    type: InvoiceType.Master,
    totalAmount: 12_450_000,
    currency: 'COP',
    issuedAt: '2026-04-16T10:00:00Z',
  },
  {
    id: 'a7b8c9d0-0000-4000-8000-000000000002',
    customerOrderId: 'b2c3d4e5-0000-4000-8000-000000000002',
    vendorId: null,
    type: InvoiceType.ZentricDetail,
    totalAmount: 622_500,
    currency: 'COP',
    issuedAt: '2026-04-16T10:00:00Z',
  },
  {
    id: 'a7b8c9d0-0000-4000-8000-000000000003',
    customerOrderId: 'b2c3d4e5-0000-4000-8000-000000000002',
    vendorId: VENDOR_ID,
    type: InvoiceType.VendorDetail,
    totalAmount: 11_827_500,
    currency: 'COP',
    issuedAt: '2026-04-16T10:00:00Z',
  },
];

const STORY_RETURNS: ReturnRequest[] = [
  {
    id: 'b8c9d0e1-0000-4000-8000-000000000001',
    customerOrderId: 'c3d4e5f6-0000-4000-8000-000000000003',
    variantId: '55555555-5555-5555-5555-555555555553',
    warehouseId: '11111111-1111-1111-1111-111111111111',
    quantity: 1,
    status: ReturnStatus.Requested,
    isGoodCondition: false,
    vendorApproved: false,
    createdAt: '2026-04-06T12:00:00Z',
  },
  {
    id: 'b8c9d0e1-0000-4000-8000-000000000002',
    customerOrderId: 'c3d4e5f6-0000-4000-8000-000000000003',
    variantId: '55555555-5555-5555-5555-555555555551',
    warehouseId: '11111111-1111-1111-1111-111111111111',
    quantity: 1,
    status: ReturnStatus.Approved,
    isGoodCondition: true,
    vendorApproved: true,
    createdAt: '2026-04-07T09:15:00Z',
  },
];

const STORY_USERS: User[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Admin Zentric',
    email: 'admin@zentric.co',
    role: UserRole.Administrator,
    identityDocument: '100000001',
    isActive: true,
    createdAt: '2026-01-04T09:00:00Z',
  },
  {
    id: VENDOR_ID,
    name: 'Distribuidora Andina',
    email: 'vendedor@zentric.co',
    role: UserRole.Seller,
    identityDocument: '100000002',
    isActive: true,
    createdAt: '2026-01-06T09:00:00Z',
  },
  {
    id: BUYER_ID,
    name: 'Comprador Demo',
    email: 'comprador@zentric.co',
    role: UserRole.Buyer,
    identityDocument: '100000003',
    isActive: true,
    createdAt: '2026-02-10T09:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    name: 'Operador Logistico',
    email: 'logistica@zentric.co',
    role: UserRole.LogisticsOperator,
    identityDocument: '100000004',
    isActive: true,
    createdAt: '2026-02-14T09:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000005',
    name: 'Supervisor de Auditoria',
    email: 'supervisor@zentric.co',
    role: UserRole.Supervisor,
    identityDocument: '100000005',
    isActive: false,
    createdAt: '2026-02-20T09:00:00Z',
  },
];

const STORY_WAREHOUSES: Warehouse[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Bodega Central Zentric',
    location: 'Bogota D.C., Colombia',
    capacity: 5000,
    type: WarehouseType.Marketplace,
    vendorId: null,
    isActive: true,
    createdAt: '2026-01-02T09:00:00Z',
  },
  {
    id: '11111111-1111-1111-1111-111111111112',
    name: 'Bodega Sur Andina',
    location: 'Medellin, Antioquia',
    capacity: 1200,
    type: WarehouseType.Vendor,
    vendorId: VENDOR_ID,
    isActive: true,
    createdAt: '2026-01-09T09:00:00Z',
  },
];

const STORY_INVENTORIES: Inventory[] = [
  {
    id: '22222222-2222-2222-2222-222222222221',
    variantId: '55555555-5555-5555-5555-555555555551',
    warehouseId: '11111111-1111-1111-1111-111111111111',
    availableQuantity: 120,
    reservedQuantity: 18,
    usedQuantity: 4,
    damagedQuantity: 2,
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    variantId: '55555555-5555-5555-5555-555555555553',
    warehouseId: '11111111-1111-1111-1111-111111111112',
    availableQuantity: 480,
    reservedQuantity: 64,
    usedQuantity: 0,
    damagedQuantity: 3,
  },
];

/**
 * Adaptador simulado con datos del dominio: los hooks de consulta de las
 * pantallas leen del puerto por defecto, asi que basta con inyectarlo.
 */
export function createStoryApi(): MockZentricApiAdapter {
  const api = new MockZentricApiAdapter();
  api.products = STORY_PRODUCTS;
  api.orders = STORY_ORDERS;
  api.fulfillments = STORY_FULFILLMENTS;
  api.invoices = STORY_INVOICES;
  api.returns = STORY_RETURNS;
  api.users = STORY_USERS;
  api.warehouses = STORY_WAREHOUSES;
  api.inventories = STORY_INVENTORIES;
  api.currentUserData = {
    userId: BUYER_ID,
    email: 'comprador@zentric.co',
    fullName: 'Comprador Demo',
    role: UserRole.Buyer,
  };
  return api;
}

export interface RoleStoryOptions {
  /** Ruta inicial del router en memoria: la pagina del modulo que se muestra. */
  path: string;
  /** Rol con el que se autentica la sesion de la historia. */
  role: UserRole;
  /** Identidad del usuario de la historia. */
  user: { userId: string; email: string; fullName: string };
}

export interface RoleStorySupport {
  /** Envoltura que provee sesion, router en memoria y cache de consultas. */
  Wrapper: FC<{ children: ReactNode }>;
}

/**
 * Prepara el entorno completo de una consola de rol para las historias.
 */
export function createRoleStory(options: RoleStoryOptions): RoleStorySupport {
  const { path, role, user } = options;

  // Sesion en memoria: las guardas de `beforeLoad` exigen token y rol validos.
  appServices.session.setAccessToken('storybook-access-token');
  appServices.session.setUser({
    userId: user.userId,
    email: user.email,
    fullName: user.fullName,
    role,
  });

  // Puerto de API con datos deterministas del dominio Zentric.
  const api = createStoryApi();
  setDefaultApi(api);

  const router = createRouter({
    ...routerOptions,
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  // El router resuelve sus rutas sin I/O: la carga es inmediata y sin efectos.
  void router.load();

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  const currentUser = {
    userId: user.userId,
    email: user.email,
    fullName: user.fullName,
    role,
  };

  const authValue: AuthValue = {
    session: appServices.session,
    api,
    user: currentUser,
    accessToken: 'storybook-access-token',
    role,
    expiredNotice: null,
    login: async () => currentUser,
    logout: () => {},
    clearExpiredNotice: () => {},
  };

  const Wrapper: FC<{ children: ReactNode }> = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <RouterContextProvider router={router}>{children}</RouterContextProvider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );

  return { Wrapper };
}
