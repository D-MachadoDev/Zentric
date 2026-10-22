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
  ListProductsPagedParams,
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

/**
 * Puerto de salida unificado hacia la API de Zentric (Frontend-Architecture §5.1).
 *
 * Contiene los 47 métodos canónicos en inglés (Decision A2) que orquestan los 46 endpoints
 * REST de negocio de backendSDD/Presentation/01-endpoints.md + 1 sonda /health.
 *
 * Se proporcionan alias compatibles para firmas previas (ej. `getUser` para `getUserById`).
 */
export interface ZentricApiPort {
  // ── Módulo 9: Sonda de Disponibilidad (/health) ─────────────────────────
  getHealth(): Promise<HealthStatus>;

  // ── Módulo 0: Autenticación e Identidad (/api/auth) ─────────────────────
  login(input: LoginInput): Promise<AuthToken>;
  getCurrentUser(): Promise<CurrentUser>;
  /** Alias compatible para getCurrentUser */
  currentUser(): Promise<CurrentUser>;

  // ── Módulo 1: Usuarios y Gestión de Acceso (/api/users) ─────────────────
  createUser(input: CreateUserInput): Promise<string>;
  listUsers(role?: UserRole): Promise<User[]>;
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

  // ── Módulo 3: Inventarios y Control de Stock (/api/inventories) ─────────
  addStock(input: AddStockInput): Promise<string>;
  listInventories(): Promise<Inventory[]>;
  listInventoryByVariant(variantId: string): Promise<Inventory[]>;
  adjustInventory(id: string, input: AdjustInventoryInput): Promise<AdjustInventoryResult>;

  // ── Módulo 4: Catálogo de Productos (/api/catalog) ──────────────────────
  createProduct(input: CreateProductInput): Promise<CreatedProduct>;
  publishProduct(productId: string): Promise<void>;
  suspendProduct(productId: string): Promise<void>;
  listProducts(vendorId?: string): Promise<Product[]>;
  listProductsPaged(params?: ListProductsPagedParams): Promise<PagedResult<Product>>;
  getProductById(id: string): Promise<Product>;
  /** Alias compatible para getProductById */
  getProduct(id: string): Promise<Product>;
  /**
   * Categorías del marketplace (S1: sólo las que tienen >= 1 producto publicado).
   *
   * Es la ÚNICA fuente de categorías del buyer: chips del catálogo, atajos del
   * header y enlaces del footer salen de aquí, nunca de una lista hardcodeada.
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

  // ── Módulo 5: Carrito y Pedidos (/api/orders) ───────────────────────────
  createCart(): Promise<string>;
  addCartItem(input: AddCartItemInput): Promise<void>;
  removeCartItem(orderId: string, variantId: string): Promise<void>;
  updateCartItemQuantity(orderId: string, variantId: string, quantity: number): Promise<void>;
  checkoutOrder(orderId: string): Promise<void>;
  payOrder(orderId: string): Promise<void>;
  listOrders(status?: OrderStatus | string): Promise<OrderListItem[]>;
  getOrderById(id: string): Promise<Order | SellerOrderView>;
  /** Alias compatible para getOrderById */
  getOrder(id: string): Promise<Order | SellerOrderView>;

  // ── Módulo 6: Logística y Despacho (/api/logistics) ─────────────────────
  createFulfillment(input: CreateFulfillmentInput): Promise<string>;
  packFulfillment(id: string): Promise<void>;
  dispatchFulfillment(id: string): Promise<void>;
  deliverFulfillment(id: string): Promise<void>;
  cancelGhostStock(input: CancelGhostStockInput): Promise<boolean>;
  listFulfillments(status?: FulfillmentStatus | string): Promise<FulfillmentOrder[]>;
  getFulfillmentById(id: string): Promise<FulfillmentOrder>;
  /** Alias compatible para getFulfillmentById */
  getFulfillment(id: string): Promise<FulfillmentOrder>;

  // ── Módulo 7: Devoluciones y Garantías (/api/returns) ───────────────────
  requestReturn(input: RequestReturnInput): Promise<string>;
  inspectReturn(id: string, input: InspectReturnInput): Promise<void>;
  approveReturn(id: string): Promise<void>;
  rejectReturn(id: string): Promise<void>;
  refundReturn(id: string): Promise<void>;
  listReturns(status?: ReturnStatus | string): Promise<ReturnRequest[]>;
  getReturnById(id: string): Promise<ReturnRequest>;
  /** Alias compatible para getReturnById */
  getReturn(id: string): Promise<ReturnRequest>;

  // ── Módulo 8: Facturación Split (/api/billing) ──────────────────────────
  generateInvoices(orderId: string): Promise<boolean>;
  annulInvoices(orderId: string, input: AnnulInvoiceInput): Promise<void>;
  listInvoices(): Promise<Invoice[]>;
  getInvoicesByOrder(orderId: string): Promise<Invoice[]>;
}
