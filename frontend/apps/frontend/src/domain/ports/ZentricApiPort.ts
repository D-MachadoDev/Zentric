import type {
  AddCartItemInput,
  AddStockInput,
  AdjustInventoryInput,
  AdjustInventoryResult,
  AnnulInvoiceInput,
  AuthToken,
  CancelGhostStockInput,
  Category,
  CreateFulfillmentInput,
  CreateProductInput,
  CreateProductVariantInput,
  CreateUserInput,
  CreateWarehouseInput,
  UpdateProductInput,
  UpdateWarehouseInput,
  CreatedProduct,
  CurrentUser,
  FulfillmentOrder,
  HealthStatus,
  InspectReturnInput,
  Invoice,
  Inventory,
  ListInventoriesPagedParams,
  ListInvoicesPagedParams,
  ListProductsPagedParams,
  ListWarehousesPagedParams,
  LoginInput,
  Order,
  OrderListItem,
  PagedResult,
  Product,
  RequestReturnInput,
  ReturnRequest,
  SellerOrderView,
  User,
  UserProfile,
  UpdateUserProfileInput,
  Warehouse,
} from '../models';
import type { FulfillmentStatus, OrderStatus, ReturnStatus, UserRole } from '../enums';

/** Parámetros para listado paginado de pedidos. */
export interface ListOrdersPagedParams {
  status?: OrderStatus | string;
  page?: number;
  size?: number;
}

/** Parámetros para listado paginado de usuarios. */
export interface ListUsersPagedParams {
  role?: UserRole;
  page?: number;
  size?: number;
}


/** Par�metros para listado paginado de despachos. */
export interface ListFulfillmentsPagedParams {
  status?: FulfillmentStatus | string;
  page?: number;
  size?: number;
}

/** Parámetros para listado paginado de devoluciones. */
export interface ListReturnsPagedParams {
  status?: ReturnStatus | string;
  page?: number;
  size?: number;
}

/**
 * Puerto de salida unificado hacia la API de Zentric (Frontend-Architecture sección 5.1).
 *
 * Contiene los métodos canónicos en inglés (Decision A2) que orquestan los endpoints
 * REST de negocio de backendSDD/Presentation/01-endpoints.md + 1 sonda /health.
 *
 * Se proporcionan alias compatibles para firmas previas (ej. `getUser` para `getUserById`).
 */
export interface ZentricApiPort {
  // ── Módulo 9: Sonda de Disponibilidad (/health) ─────────────────────────
  getHealth(): Promise<HealthStatus>;

  // ── Módulo 0: Autenticación e Identidad (/api/auth) ─────────────────────
  login(input: LoginInput): Promise<AuthToken>;
  getCurrentUser(signal?: AbortSignal): Promise<CurrentUser>;
  /** Alias compatible para getCurrentUser */
  currentUser(): Promise<CurrentUser>;

  // ── Módulo 1: Usuarios y Gestión de Acceso (/api/users) ─────────────────
  createUser(input: CreateUserInput): Promise<string>;
  listUsers(role?: UserRole): Promise<User[]>;
  /** Listado paginado de usuarios (backend: GET /api/Users?role&page&size). */
  listUsersPaged(params?: ListUsersPagedParams): Promise<PagedResult<User>>;
  getUserById(id: string): Promise<User>;
  /** Alias compatible para getUserById */
  getUser(id: string): Promise<User>;
  blockUser(id: string): Promise<void>;
  activateUser(id: string): Promise<void>;
  getUserProfile(): Promise<UserProfile>;
  updateUserProfile(input: UpdateUserProfileInput): Promise<UserProfile>;

  // ── Módulo 2: Bodegas Físicas (/api/warehouses) ─────────────────────────
  createWarehouse(input: CreateWarehouseInput): Promise<string>;
  updateWarehouse(id: string, input: UpdateWarehouseInput): Promise<void>;
  listWarehouses(vendorId?: string): Promise<Warehouse[]>;
  getWarehouseById(id: string): Promise<Warehouse>;

  /** Listado paginado de bodegas (backend: GET /api/Warehouses?vendorId&page&size). */
  listWarehousesPaged(params?: ListWarehousesPagedParams): Promise<PagedResult<Warehouse>>;
  // ── Módulo 3: Inventarios y Control de Stock (/api/inventories) ─────────
  addStock(input: AddStockInput): Promise<string>;
  listInventories(): Promise<Inventory[]>;
  /** Listado paginado de inventarios (backend: GET /api/Inventories?page&size). */
  listInventoriesPaged(params?: ListInventoriesPagedParams): Promise<PagedResult<Inventory>>;
  listInventoryByVariant(variantId: string): Promise<Inventory[]>;
  adjustInventory(id: string, input: AdjustInventoryInput): Promise<AdjustInventoryResult>;

  // ── Módulo 4: Catálogo de Productos (/api/catalog) ──────────────────────
  createProduct(input: CreateProductInput): Promise<CreatedProduct>;
  addProductVariant(productId: string, input: CreateProductVariantInput): Promise<string>;
  publishProduct(productId: string): Promise<void>;
  updateProduct(productId: string, input: UpdateProductInput): Promise<void>;

  suspendProduct(productId: string): Promise<void>;
  listProductsPaged(params?: ListProductsPagedParams, signal?: AbortSignal): Promise<PagedResult<Product>>;
  getProductById(id: string): Promise<Product>;
  /** Alias compatible para getProductById */
  getProduct(id: string): Promise<Product>;
  /**
   * Categorías del marketplace (S1: sólo las que tienen >= 1 producto publicado).
   *
   * Es la ÚNICA fuente de categorías del buyer: chips del catálogo, atajos del
   * header y enlaces del footer salen de aquí, nunca de una lista hardcodeada.
   */
  listCategories(signal?: AbortSignal): Promise<Category[]>;
  /**
   * Productos destacados para el mosaico del hero (S2).
   * Backend: GET /api/Catalog/products/hero
   */
  listHeroProducts(count?: number): Promise<Product[]>;
  /**
   * Productos vistos recientemente por el usuario autenticado (máx 20).
   * Backend: GET /api/Catalog/products/recently-viewed?maxItems=20
   * Requiere autenticación (token JWT).
   */
  getRecentlyViewed(maxItems?: number): Promise<Product[]>;

  /**
   * Registra la visualización de un producto (backend: POST /api/Catalog/products/{id}/track-view).
   * Solo para usuarios autenticados.
   */
  trackProductView(productId: string): Promise<void>;

  // ── Módulo 5: Carrito y Pedidos (/api/orders) ───────────────────────────
  createCart(): Promise<string>;
  addCartItem(input: AddCartItemInput): Promise<void>;
  removeCartItem(orderId: string, variantId: string): Promise<void>;
  updateCartItemQuantity(orderId: string, variantId: string, quantity: number): Promise<void>;
  checkoutOrder(orderId: string): Promise<void>;
  cancelOrder?(orderId: string): Promise<void>;
  payOrder(orderId: string): Promise<void>;
  listOrders(status?: OrderStatus | string, signal?: AbortSignal): Promise<OrderListItem[]>;
  /** Listado paginado de pedidos (backend: GET /api/Orders?status&page&size). */
  listOrdersPaged(params?: ListOrdersPagedParams, signal?: AbortSignal): Promise<PagedResult<OrderListItem>>;
  getOrderById(id: string, signal?: AbortSignal): Promise<Order | SellerOrderView>;
  /** Alias compatible para getOrderById */
  getOrder(id: string): Promise<Order | SellerOrderView>;

  // ── Módulo 6: Logística y Despacho (/api/logistics) ─────────────────────
  createFulfillment(input: CreateFulfillmentInput): Promise<string>;
  packFulfillment(id: string): Promise<void>;
  dispatchFulfillment(id: string): Promise<void>;
  deliverFulfillment(id: string): Promise<void>;
  cancelGhostStock(input: CancelGhostStockInput): Promise<boolean>;
  listFulfillments(status?: FulfillmentStatus | string): Promise<FulfillmentOrder[]>;
  /** Listado paginado de despachos (backend: GET /api/Logistics/fulfillments?status&page&size). */
  listFulfillmentsPaged(params?: ListFulfillmentsPagedParams): Promise<PagedResult<FulfillmentOrder>>;
  getFulfillmentById(id: string): Promise<FulfillmentOrder>;
  /** Alias compatible para getFulfillmentById */
  getFulfillment(id: string): Promise<FulfillmentOrder>;

  // ── Módulo 7: Devoluciones y Garantías (/api/returns) ───────────────────
  requestReturn(input: RequestReturnInput): Promise<string>;
  inspectReturn(id: string, input: InspectReturnInput): Promise<void>;
  approveReturn(id: string): Promise<void>;
  rejectReturn(id: string): Promise<void>;
  refundReturn(id: string): Promise<void>;
  listReturns(status?: ReturnStatus | string): Promise<ReturnRequest[]>;  /** Listado paginado de devoluciones (backend: GET /api/Returns?status&page&size). */  listReturnsPaged(params?: ListReturnsPagedParams): Promise<PagedResult<ReturnRequest>>;  getReturnById(id: string): Promise<ReturnRequest>;
  /** Alias compatible para getReturnById */
  getReturn(id: string): Promise<ReturnRequest>;

  // ── Módulo 8: Facturación Split (/api/billing) ──────────────────────────
  generateInvoices(orderId: string): Promise<boolean>;
  annulInvoices(orderId: string, input: AnnulInvoiceInput): Promise<void>;
  listInvoices(): Promise<Invoice[]>;
  /** Listado paginado de facturas (backend: GET /api/Billing/invoices?page&size). */
  listInvoicesPaged(params?: ListInvoicesPagedParams): Promise<PagedResult<Invoice>>;
  getInvoicesByOrder(orderId: string): Promise<Invoice[]>;
}




