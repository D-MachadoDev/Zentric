import type {
  AddCartItemInput,
  AddStockInput,
  AuthToken,
  CancelGhostStockInput,
  CreateFulfillmentInput,
  CreateProductInput,
  CreateUserInput,
  CreateWarehouseInput,
  CreatedProduct,
  CurrentUser,
  FulfillmentOrder,
  HealthStatus,
  InspectReturnInput,
  Invoice,
  Inventory,
  LoginInput,
  Order,
  OrderListItem,
  Product,
  RequestReturnInput,
  ReturnRequest,
  User,
  Warehouse,
} from '../models';

/**
 * Puerto de salida hacia la API de Zentric (Frontend-Architecture §4).
 *
 * Define QUÉ necesita el cliente, nunca CÓMO se obtiene. Es la única abstracción
 * que conocen los servicios de aplicación; el adaptador HTTP de `adapters/http/`
 * es quien lo implementa.
 *
 * Los `*Input` omiten deliberadamente cualquier identidad del llamante
 * (`BuyerId`, `CallerId`, `CallerRole`, `vendorId` cuando aplica): Q-21b dicta
 * que "la identidad la fija el token, no el cuerpo", y el backend la sobreescribe
 * antes del caso de uso. Enviarla sería ruido que se descarta.
 */
export interface ZentricApiPort {
  // ── Transversal ────────────────────────────────────────────────
  getHealth(): Promise<HealthStatus>;

  // ── Identidad y acceso (§2.1) ──────────────────────────────────
  login(input: LoginInput): Promise<AuthToken>;
  currentUser(): Promise<CurrentUser>;
  listUsers(): Promise<User[]>;
  createUser(input: CreateUserInput): Promise<string>;

  // ── Catálogo (§2.2) ────────────────────────────────────────────
  listProducts(vendorId?: string): Promise<Product[]>;
  getProduct(id: string): Promise<Product>;
  createProduct(input: CreateProductInput): Promise<CreatedProduct>;
  publishProduct(productId: string): Promise<void>;
  /** `POST /api/catalog/products/{id}/suspend` — saca el producto del catálogo comercial (Q-27). Sólo Vendedor. */
  suspendProduct(productId: string): Promise<void>;

  // ── Inventario (§2.3) ──────────────────────────────────────────
  addStock(input: AddStockInput): Promise<string>;
  listInventoryByVariant(variantId: string): Promise<Inventory[]>;

  // ── Bodegas ────────────────────────────────────────────────────
  listWarehouses(): Promise<Warehouse[]>;
  createWarehouse(input: CreateWarehouseInput): Promise<string>;

  // ── Carrito y pedidos (§2.4) ───────────────────────────────────
  /** Sin cuerpo: el backend fija el comprador desde el token (Q-21b). */
  createCart(): Promise<string>;
  addCartItem(input: AddCartItemInput): Promise<void>;
  getOrder(id: string): Promise<Order>;
  /**
   * `GET /api/Orders` — listado de pedidos visibles para el llamante (ADR-0017).
   * El Comprador ve los suyos; status es filtro opcional (ADR-0012).
   */
  listOrders(status?: string): Promise<OrderListItem[]>;
  /** `200 OK` **sin cuerpo** (verificado en `OrdersController.Checkout`). */
  checkoutOrder(orderId: string): Promise<void>;
  /** `200 OK` **sin cuerpo**. No cobra: el backend no tiene pasarela (ADR-0009). */
  payOrder(orderId: string): Promise<void>;

  // ── Facturación (§2.5) ─────────────────────────────────────────
  generateInvoices(orderId: string): Promise<boolean>;
  getInvoicesByOrder(orderId: string): Promise<Invoice[]>;

  // ── Logística (§2.6) ───────────────────────────────────────────
  createFulfillment(input: CreateFulfillmentInput): Promise<string>;
  /**
   * `GET /api/Logistics/fulfillments` — cola de despachos visibles (`ADR-0017`).
   * Operador, Administrador y Supervisor ven la cola completa; status es filtro opcional.
   */
  listFulfillments(status?: string): Promise<FulfillmentOrder[]>;
  /** `GET /api/Logistics/fulfillment/{id}` — detalle de despacho. */
  getFulfillment(id: string): Promise<FulfillmentOrder>;
  /**
   * Ciclo de vida del despacho (`backendSDD/Domain/07-lifecycle.md`): nace en
   * `PendingPack`, hay que empacar **antes** de despachar y sólo el Operador
   * Logístico cierra la entrega (Q-23). Los tres devuelven `200 OK` sin cuerpo.
   */
  packFulfillment(id: string): Promise<void>;
  dispatchFulfillment(id: string): Promise<void>;
  deliverFulfillment(id: string): Promise<void>;
  cancelGhostStock(input: CancelGhostStockInput): Promise<boolean>;

  // ── Devoluciones (§2.7) ────────────────────────────────────────
  requestReturn(input: RequestReturnInput): Promise<string>;
  inspectReturn(id: string, input: InspectReturnInput): Promise<void>;
  approveReturn(returnRequestId: string): Promise<void>;
  /**
   * `GET /api/Returns` — bandeja propia (`ADR-0017`, sin paginación aún).
   *
   * El reparto por rol lo hace el SERVIDOR: el Comprador ve las de sus pedidos,
   * el Vendedor las de sus productos, y el Operador, el Administrador y el
   * Supervisor leen sin filtro de dueño. Status es filtro opcional (ADR-0012).
   */
  listReturns(status?: string): Promise<ReturnRequest[]>;
  /** `GET /api/Returns/{id}` — detalle y dictamen de una solicitud. */
  getReturn(id: string): Promise<ReturnRequest>;
  /**
   * `POST /api/Returns/{id}/refund` — **sólo Administrador** (Q-24).
   *
   * Acredita el dinero al comprador y sólo cabe sobre una devolución ya
   * aprobada. Devuelve `200 OK` sin cuerpo.
   */
  refundReturn(id: string): Promise<void>;
}
