import type {
  FulfillmentStatus,
  ListProductsPagedParams,
  OrderStatus,
  ReturnStatus,
  UserRole,
} from '../../domain';

/**
 * Jerarquía centralizada de claves de consulta de TanStack Query.
 *
 * Garantiza invalidaciones deterministas tras cada mutación y tipado estricto en
 * las operaciones de caché.
 */
export const queryKeys = {
  health: {
    all: ['health'] as const,
  },
  auth: {
    all: ['auth'] as const,
    me: () => ['auth', 'me'] as const,
  },
  users: {
    all: ['users'] as const,
    list: (filters?: { role?: UserRole }) => ['users', 'list', filters ?? {}] as const,
    detail: (id: string) => ['users', 'detail', id] as const,
    profile: () => ['users', 'profile'] as const,
  },
  warehouses: {
    all: ['warehouses'] as const,
    list: (filters?: { vendorId?: string }) => ['warehouses', 'list', filters ?? {}] as const,
    detail: (id: string) => ['warehouses', 'detail', id] as const,
  },
  inventories: {
    all: ['inventories'] as const,
    list: () => ['inventories', 'list'] as const,
    variant: (variantId: string) => ['inventories', 'variant', variantId] as const,
  },
  products: {
    all: ['products'] as const,
    list: (filters?: { vendorId?: string }) => ['products', 'list', filters ?? {}] as const,
    paged: (params?: ListProductsPagedParams) => ['products', 'paged', params ?? {}] as const,
    detail: (id: string) => ['products', 'detail', id] as const,
  },
  /**
   * Categorías reales del marketplace (S1). Clave única por recurso: la lista
   * completa llega del backend, por lo que no admite filtros de cliente.
   */
  categories: {
    all: ['categories'] as const,
    list: () => ['categories', 'list'] as const,
  },
  /** Productos destacados del hero (S2); el `count` solicitado forma la clave. */
  heroProducts: {
    all: ['heroProducts'] as const,
    list: (count: number) => ['heroProducts', 'list', count] as const,
  },
  orders: {
    all: ['orders'] as const,
    list: (filters?: { status?: OrderStatus | string }) => ['orders', 'list', filters ?? {}] as const,
    detail: (id: string) => ['orders', 'detail', id] as const,
  },
  fulfillments: {
    all: ['fulfillments'] as const,
    list: (filters?: { status?: FulfillmentStatus | string }) =>
      ['fulfillments', 'list', filters ?? {}] as const,
    detail: (id: string) => ['fulfillments', 'detail', id] as const,
  },
  returns: {
    all: ['returns'] as const,
    list: (filters?: { status?: ReturnStatus | string }) => ['returns', 'list', filters ?? {}] as const,
    detail: (id: string) => ['returns', 'detail', id] as const,
  },
  invoices: {
    all: ['invoices'] as const,
    list: () => ['invoices', 'list'] as const,
    order: (orderId: string) => ['invoices', 'order', orderId] as const,
  },
} as const;
