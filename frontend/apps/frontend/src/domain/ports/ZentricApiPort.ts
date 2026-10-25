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
  CreateUserInput,
  CreateWarehouseInput,
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

/** ParÃ¡metros para listado paginado de pedidos. */
export interface ListOrdersPagedParams {
  status?: OrderStatus | string;
  page?: number;
  size?: number;
}\r\n\r\n/** Parámetros para listado paginado de usuarios. */\r\nexport interface ListUsersPagedParams {\r\n  role?: UserRole;\r\n  page?: number;\r\n  size?: number;\r\n}\r\n\r\n/**\r\n * Puerto de salida unificado hacia la API de Zentric (Frontend-Architecture Â§5.1).
 *
 * Contiene los mÃ©todos canÃ³nicos en inglÃ©s (Decision A2) que orquestan los endpoints
 * REST de negocio de backendSDD/Presentation/01-endpoints.md + 1 sonda /health.
 *
 * Se proporcionan alias compatibles para firmas previas (ej. `getUser` para `getUserById`).
 */
export interface ZentricApiPort {
  // ââ MÃ³dulo 9: Sonda de Disponibilidad (/health) âââââââââââââââââââââââââ
  getHealth(): Promise<HealthStatus>;

  // ââ MÃ³dulo 0: AutenticaciÃ³n e Identidad (/api/auth) âââââââââââââââââââââ
  login(input: LoginInput): Promise<AuthToken>;
  getCurrentUser(): Promise<CurrentUser>;
  /** Alias compatible para getCurrentUser */
  currentUser(): Promise<CurrentUser>;

  // ââ MÃ³dulo 1: Usuarios y GestiÃ³n de Acceso (/api/users) âââââââââââââââââ
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

  // ââ MÃ³dulo 2: Bodegas FÃ­sicas (/api/warehouses) âââââââââââââââââââââââââ
  createWarehouse(input: CreateWarehouseInput): Promise<string>;
  updateWarehouse(id: string, input: UpdateWarehouseInput): Promise<void>;
  listWarehouses(vendorId?: string): Promise<Warehouse[]>;
  getWarehouseById(id: string): Promise<Warehouse>;

  /** Listado paginado de bodegas (backend: GET /api/Warehouses?vendorId&page&size). */
  listWarehousesPaged(params?: ListWarehousesPagedParams): Promise<PagedResult<Warehouse>>;
  // ââ MÃ³dulo 3: Inventarios y Control de Stock (/api/inventories) âââââââââ
  addStock(input: AddStockInput): Promise<string>;
  listInventories(): Promise<Inventory[]>;
  /** Listado paginado de inventarios (backend: GET /api/Inventories?page&size). */
  listInventoriesPaged(params?: ListInventoriesPagedParams): Promise<PagedResult<Inventory>>;
  listInventoryByVariant(variantId: string): Promise<Inventory[]>;
  adjustInventory(id: string, input: AdjustInventoryInput): Promise<AdjustInventoryResult>;

  // ââ MÃ³dulo 4: CatÃ¡logo de Productos (/api/catalog) ââââââââââââââââââââââ
  createProduct(input: CreateProductInput): Promise<CreatedProduct>;
  publishProduct(productId: string): Promise<void>;
  suspendProduct(productId: string): Promise<void>;
  listProductsPaged(params?: ListProductsPagedParams): Promise<PagedResult<Product>>;
  getProductById(id: string): Promise<Product>;
  /** Alias compatible para getProductById */
  getProduct(id: string): Promise<Product>;
  /**
   * CategorÃ­as del marketplace (S1: sÃ³lo las que tienen >= 1 producto publicado).
   *
   * Es la ÃNICA fuente de categorÃ­as del buyer: chips del catÃ¡logo, atajos del
   * header y enlaces del footer salen de aquÃ­, nunca de una lista hardcodeada.
   */
  listCategories(): Promise<Category[]>;
  /**
   * Productos destacados para el hero/mosaico (S2).
   *
   * El backend devuelve productos publicados en orden aleatorio y sin repetir;
   * el hero no debe depender de un rubro fijo.
   * @param count Cantidad solicitada (por defecto 6 en el backend).
   */
  listHeroProducts(count?: number): Promise<Product[]>;

  // ââ MÃ³dulo 5: Carrito y Pedidos (/api/orders) âââââââââââââââââââââââââââ
  createCart(): Promise<string>;
  addCartItem(input: AddCartItemInput): Promise<void>;
  removeCartItem(orderId: string, variantId: string): Promise<void>;
  updateCartItemQuantity(orderId: string, variantId: string, quantity: number): Promise<void>;
  checkoutOrder(orderId: string): Promise<void>;
  cancelOrder?(orderId: string): Promise<void>;
  payOrder(orderId: string): Promise<void>;
  listOrders(status?: OrderStatus | string): Promise<OrderListItem[]>;
  /** Listado paginado de pedidos (backend: GET /api/Orders?status&page&size). */
  listOrdersPaged(params?: ListOrdersPagedParams): Promise<PagedResult<OrderListItem>>;
  getOrderById(id: string): Promise<Order | SellerOrderView>;
  /** Alias compatible para getOrderById */
  getOrder(id: string): Promise<Order | SellerOrderView>;

  // ââ MÃ³dulo 6: LogÃ­stica y Despacho (/api/logistics) âââââââââââââââââââââ
  createFulfillment(input: CreateFulfillmentInput): Promise<string>;
  packFulfillment(id: string): Promise<void>;
  dispatchFulfillment(id: string): Promise<void>;
  deliverFulfillment(id: string): Promise<void>;
  cancelGhostStock(input: CancelGhostStockInput): Promise<boolean>;
  listFulfillments(status?: FulfillmentStatus | string): Promise<FulfillmentOrder[]>;
  getFulfillmentById(id: string): Promise<FulfillmentOrder>;
  /** Alias compatible para getFulfillmentById */
  getFulfillment(id: string): Promise<FulfillmentOrder>;

  // ââ MÃ³dulo 7: Devoluciones y GarantÃ­as (/api/returns) âââââââââââââââââââ
  requestReturn(input: RequestReturnInput): Promise<string>;
  inspectReturn(id: string, input: InspectReturnInput): Promise<void>;
  approveReturn(id: string): Promise<void>;
  rejectReturn(id: string): Promise<void>;
  refundReturn(id: string): Promise<void>;
  listReturns(status?: ReturnStatus | string): Promise<ReturnRequest[]>;
  getReturnById(id: string): Promise<ReturnRequest>;
  /** Alias compatible para getReturnById */
  getReturn(id: string): Promise<ReturnRequest>;

  // ââ MÃ³dulo 8: FacturaciÃ³n Split (/api/billing) ââââââââââââââââââââââââââ
  generateInvoices(orderId: string): Promise<boolean>;
  annulInvoices(orderId: string, input: AnnulInvoiceInput): Promise<void>;
  listInvoices(): Promise<Invoice[]>;
  /** Listado paginado de facturas (backend: GET /api/Billing/invoices?page&size). */
  listInvoicesPaged(params?: ListInvoicesPagedParams): Promise<PagedResult<Invoice>>;
  getInvoicesByOrder(orderId: string): Promise<Invoice[]>;
}

