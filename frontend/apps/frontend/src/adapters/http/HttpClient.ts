import { ProblemDetailsError } from '../../domain';
import type {
  AddCartItemInput,
  AddStockInput,
  AdjustInventoryInput,
  AdjustInventoryResult,
  AnnulInvoiceInput,
  AuthToken,
  CancelGhostStockInput,
  CreateFulfillmentInput,
  CreateProductInput,
  CreateUserInput,
  CreateWarehouseInput,
  UpdateWarehouseInput,
  CreatedProduct,
  CurrentUser,
  FulfillmentOrder,
  FulfillmentStatus,
  HealthStatus,
  InspectReturnInput,
  Inventory,
  Invoice,
  ListProductsPagedParams,
  LoginInput,
  Order,
  OrderListItem,
  OrderStatus,
  PagedResult,
  Product,
  RequestReturnInput,
  ReturnRequest,
  ReturnStatus,
  SellerOrderView,
  SessionPort,
  User,
  UserProfile,
  UpdateUserProfileInput,
  UserRole,
  Warehouse,
  ZentricApiPort,
} from '../../domain';
import { toApiError } from './problemDetails';

const DEFAULT_BASE_URL = 'http://localhost:15433';
const TIMEOUT_MS = 15_000;

export interface HttpClientOptions {
  /** Provee y guarda el access token; es la única fuente de autenticación. */
  session: SessionPort;
  /** Por defecto `VITE_API_BASE_URL`, y en su defecto el puerto de desarrollo. */
  baseUrl?: string;
  /** Sustituible en pruebas. */
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export type ZentricHttpClientOptions = HttpClientOptions;

function readBaseUrlFromEnv(): string {
  if (
    typeof window !== 'undefined' &&
    typeof (window as unknown as { __ZENTRIC_API_BASE_URL__?: string }).__ZENTRIC_API_BASE_URL__ === 'string'
  ) {
    return (window as unknown as { __ZENTRIC_API_BASE_URL__: string }).__ZENTRIC_API_BASE_URL__;
  }
  const env = (import.meta as { env?: Record<string, string | undefined> }).env;
  return env?.VITE_API_BASE_URL ?? DEFAULT_BASE_URL;
}

/**
 * Adaptador HTTP con monopolio de red (Frontend-Adapters §1–§3.4).
 *
 * Implementa los 45 métodos canónicos de `ZentricApiPort` en inglés (Decision A2)
 * traduciendo rutas, cabeceras estándar, inyección síncrona de Bearer JWT,
 * abortos por timeout (15 s) y mapeo defensivo de errores RFC 7807/9457.
 */
export class HttpClient implements ZentricApiPort {
  readonly #baseUrl: string;
  readonly #session: SessionPort;
  readonly #fetchImpl: typeof fetch;
  readonly #timeoutMs: number;

  constructor(options: HttpClientOptions) {
    this.#baseUrl = (options.baseUrl ?? readBaseUrlFromEnv()).replace(/\/+$/u, '');
    this.#session = options.session;
    this.#fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.#timeoutMs = options.timeoutMs ?? TIMEOUT_MS;
  }

  // ── Núcleo de peticiones ───────────────────────────────────────────────────

  /**
   * Envía una petición con la política de transporte de §1:
   * - Cabeceras estándar Accept y Content-Type
   * - Inyección de Bearer token desde SessionPort
   * - Prohibición de cabeceras forjables (X-Buyer-Id, X-User-Id, X-Role)
   * - Timeout de 15 segundos con AbortSignal.timeout
   * - Máximo 1 reintento sólo en peticiones GET ante fallos de red o 502/503/504
   * - Cero reintentos en POST/mutaciones o respuestas 4xx
   * - Traducción estandarizada de errores RFC 7807/9457
   * - Limpieza de sesión en memoria ante 401 si se envió token (Fail-Closed)
   */
  async #send(path: string, init: RequestInit = {}, withAuth = true): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    if (init.body !== undefined) headers.set('Content-Type', 'application/json');

    // Erradicación de cabeceras forjables (Frontend-Adapters §1)
    headers.delete('X-Buyer-Id');
    headers.delete('X-User-Id');
    headers.delete('X-Role');

    if (withAuth) {
      const token = this.#session.getAccessToken();
      if (token !== null) headers.set('Authorization', `Bearer ${token}`);
    }

    const url = `${this.#baseUrl}${path}`;
    const method = (init.method ?? 'GET').toUpperCase();
    const canRetry = method === 'GET';
    let retriesLeft = canRetry ? 1 : 0;

    for (;;) {
      try {
        const response = await this.#fetchImpl(url, {
          ...init,
          headers,
          signal: AbortSignal.timeout(this.#timeoutMs),
        });

        if (!response.ok) {
          // 401 Unauthorized limpia la sesión en RAM si se había enviado un token previo
          if (response.status === 401 && withAuth && this.#session.getAccessToken() !== null) {
            this.#session.clear();
          }

          const errorText = await response.text();
          const error = toApiError(response.status, errorText);

          // Reintento único solo en GET para respuestas 5xx
          if (canRetry && response.status >= 500 && retriesLeft > 0) {
            retriesLeft -= 1;
            continue;
          }

          throw error;
        }

        return response;
      } catch (error) {
        if (error instanceof ProblemDetailsError) throw error;

        // Error transitorio de red o timeout
        if (canRetry && retriesLeft > 0) {
          retriesLeft -= 1;
          continue;
        }

        throw new ProblemDetailsError({
          status: 0,
          title: 'Error de conexión',
          detail: 'No se pudo contactar con el servidor.',
        });
      }
    }
  }

  /** Devuelve el cuerpo JSON interpretado; un 204 o texto vacío produce undefined */
  async #json<T>(path: string, init: RequestInit = {}, withAuth = true): Promise<T> {
    const response = await this.#send(path, init, withAuth);
    const text = await response.text();
    return (text === '' ? undefined : JSON.parse(text)) as T;
  }

  /** Desenvuelve cadenas GUID retornadas por endpoints de creación */
  async #guid(path: string, init: RequestInit = {}): Promise<string> {
    const response = await this.#send(path, init);
    const text = await response.text();
    try {
      const parsed = JSON.parse(text);
      return typeof parsed === 'string' ? parsed : String(parsed);
    } catch {
      return text.replace(/^"|"$/g, '');
    }
  }

  #post(body?: unknown): RequestInit {
    return body === undefined ? { method: 'POST' } : { method: 'POST', body: JSON.stringify(body) };
  }

  #put(body?: unknown): RequestInit {
    return body === undefined ? { method: 'PUT' } : { method: 'PUT', body: JSON.stringify(body) };
  }

  // ── Módulo 9: Sonda de Disponibilidad (/health) ─────────────────────────

  getHealth(): Promise<HealthStatus> {
    return this.#json<HealthStatus>('/health', { method: 'GET' }, false);
  }

  // ── Módulo 0: Autenticación e Identidad (/api/auth) ─────────────────────

  login(input: LoginInput): Promise<AuthToken> {
    return this.#json<AuthToken>('/api/auth/login', this.#post(input), false);
  }

  getCurrentUser(): Promise<CurrentUser> {
    return this.#json<CurrentUser>('/api/auth/me', { method: 'GET' });
  }

  currentUser(): Promise<CurrentUser> {
    return this.getCurrentUser();
  }

  // ── Módulo 1: Usuarios y Gestión de Acceso (/api/Users) ─────────────────

  createUser(input: CreateUserInput): Promise<string> {
    return this.#guid('/api/Users', this.#post(input));
  }

  listUsers(role?: UserRole): Promise<User[]> {
    const query = role ? `?role=${encodeURIComponent(role)}` : '';
    return this.#json<User[]>(`/api/Users${query}`, { method: 'GET' });
  }

  getUserById(id: string): Promise<User> {
    return this.#json<User>(`/api/Users/${encodeURIComponent(id)}`, { method: 'GET' });
  }

  getUser(id: string): Promise<User> {
    return this.getUserById(id);
  }

  blockUser(id: string): Promise<void> {
    return this.#json<void>(`/api/Users/${encodeURIComponent(id)}/block`, this.#post());
  }

  activateUser(id: string): Promise<void> {
    return this.#json<void>(`/api/Users/${encodeURIComponent(id)}/activate`, this.#post());
  }

  getUserProfile(): Promise<UserProfile> {
    return this.#json<UserProfile>('/api/users/profile', { method: 'GET' });
  }

  updateUserProfile(input: UpdateUserProfileInput): Promise<UserProfile> {
    return this.#json<UserProfile>('/api/users/profile', this.#put(input));
  }

  // ── Módulo 2: Bodegas Físicas (/api/Warehouses) ─────────────────────────

  createWarehouse(input: CreateWarehouseInput): Promise<string> {
    return this.#guid('/api/Warehouses', this.#post(input));
  }

  updateWarehouse(id: string, input: UpdateWarehouseInput): Promise<void> {
    return this.#json<void>(`/api/Warehouses/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  }

  listWarehouses(vendorId?: string): Promise<Warehouse[]> {
    const query = vendorId ? `?vendorId=${encodeURIComponent(vendorId)}` : '';
    return this.#json<Warehouse[]>(`/api/Warehouses${query}`, { method: 'GET' });
  }

  getWarehouseById(id: string): Promise<Warehouse> {
    return this.#json<Warehouse>(`/api/Warehouses/${encodeURIComponent(id)}`, { method: 'GET' });
  }

  // ── Módulo 3: Inventarios y Control de Stock (/api/Inventories) ─────────

  addStock(input: AddStockInput): Promise<string> {
    return this.#guid('/api/Inventories/stock', this.#post(input));
  }

  listInventories(): Promise<Inventory[]> {
    return this.#json<Inventory[]>('/api/Inventories', { method: 'GET' });
  }

  listInventoryByVariant(variantId: string): Promise<Inventory[]> {
    return this.#json<Inventory[]>(`/api/Inventories/${encodeURIComponent(variantId)}`, { method: 'GET' });
  }

  adjustInventory(id: string, input: AdjustInventoryInput): Promise<AdjustInventoryResult> {
    return this.#json<AdjustInventoryResult>(
      `/api/Inventories/${encodeURIComponent(id)}/adjust`,
      this.#post(input),
    );
  }

  // ── Módulo 4: Catálogo de Productos (/api/Catalog) ──────────────────────

  createProduct(input: CreateProductInput): Promise<CreatedProduct> {
    return this.#json<CreatedProduct>('/api/Catalog/products', this.#post(input));
  }

  publishProduct(productId: string): Promise<void> {
    return this.#json<void>(
      `/api/Catalog/products/${encodeURIComponent(productId)}/publish`,
      this.#post(),
    );
  }

  suspendProduct(productId: string): Promise<void> {
    return this.#json<void>(
      `/api/Catalog/products/${encodeURIComponent(productId)}/suspend`,
      this.#post(),
    );
  }

  listProducts(vendorId?: string): Promise<Product[]> {
    const query = vendorId ? `?vendorId=${encodeURIComponent(vendorId)}` : '';
    return this.#json<Product[]>(`/api/Catalog/products${query}`, { method: 'GET' });
  }

  listProductsPaged(params?: ListProductsPagedParams): Promise<PagedResult<Product>> {
    const queryParams = new URLSearchParams();
    if (params?.vendorId) queryParams.set('vendorId', params.vendorId);
    if (params?.page !== undefined) queryParams.set('page', String(params.page));
    if (params?.size !== undefined) queryParams.set('size', String(params.size));
    if (params?.category) queryParams.set('category', params.category);
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.#json<PagedResult<Product>>(`/api/Catalog/products/paged${query}`, { method: 'GET' });
  }

  getProductById(id: string): Promise<Product> {
    return this.#json<Product>(`/api/Catalog/products/${encodeURIComponent(id)}`, { method: 'GET' });
  }

  getProduct(id: string): Promise<Product> {
    return this.getProductById(id);
  }

  // ── Módulo 5: Carrito y Pedidos (/api/Orders) ───────────────────────────

  createCart(): Promise<string> {
    return this.#guid('/api/Orders/cart', this.#post());
  }

  addCartItem(input: AddCartItemInput): Promise<void> {
    return this.#json<void>('/api/Orders/cart/items', this.#post(input));
  }

  checkoutOrder(orderId: string): Promise<void> {
    return this.#json<void>(`/api/Orders/${encodeURIComponent(orderId)}/checkout`, this.#post());
  }

  payOrder(orderId: string): Promise<void> {
    return this.#json<void>(`/api/Orders/${encodeURIComponent(orderId)}/pay`, this.#post());
  }

  listOrders(status?: OrderStatus | string): Promise<OrderListItem[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.#json<OrderListItem[]>(`/api/Orders${query}`, { method: 'GET' });
  }

  getOrderById(id: string): Promise<Order | SellerOrderView> {
    return this.#json<Order | SellerOrderView>(`/api/Orders/${encodeURIComponent(id)}`, { method: 'GET' });
  }

  getOrder(id: string): Promise<Order | SellerOrderView> {
    return this.getOrderById(id);
  }

  // ── Módulo 6: Logística y Despacho (/api/Logistics) ─────────────────────

  createFulfillment(input: CreateFulfillmentInput): Promise<string> {
    return this.#guid('/api/Logistics/fulfillment', this.#post(input));
  }

  packFulfillment(id: string): Promise<void> {
    return this.#json<void>(`/api/Logistics/fulfillment/${encodeURIComponent(id)}/pack`, this.#post());
  }

  dispatchFulfillment(id: string): Promise<void> {
    return this.#json<void>(`/api/Logistics/fulfillment/${encodeURIComponent(id)}/dispatch`, this.#post());
  }

  deliverFulfillment(id: string): Promise<void> {
    return this.#json<void>(`/api/Logistics/fulfillment/${encodeURIComponent(id)}/deliver`, this.#post());
  }

  cancelGhostStock(input: CancelGhostStockInput): Promise<boolean> {
    return this.#json<boolean>('/api/Logistics/fulfillment/cancel-ghost-stock', this.#post(input));
  }

  listFulfillments(status?: FulfillmentStatus | string): Promise<FulfillmentOrder[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.#json<FulfillmentOrder[]>(`/api/Logistics/fulfillments${query}`, { method: 'GET' });
  }

  getFulfillmentById(id: string): Promise<FulfillmentOrder> {
    return this.#json<FulfillmentOrder>(`/api/Logistics/fulfillment/${encodeURIComponent(id)}`, { method: 'GET' });
  }

  getFulfillment(id: string): Promise<FulfillmentOrder> {
    return this.getFulfillmentById(id);
  }

  // ── Módulo 7: Devoluciones y Garantías (/api/Returns) ───────────────────

  requestReturn(input: RequestReturnInput): Promise<string> {
    return this.#guid('/api/Returns/request', this.#post(input));
  }

  inspectReturn(id: string, input: InspectReturnInput): Promise<void> {
    return this.#json<void>(`/api/Returns/${encodeURIComponent(id)}/inspect`, this.#post(input));
  }

  /**
   * POST /api/Returns/{id}/approve exige { returnRequestId: id } en el body
   * según ReturnsController.cs:95-97 y Frontend-Adapters §3.4.
   */
  approveReturn(id: string): Promise<void> {
    return this.#json<void>(
      `/api/Returns/${encodeURIComponent(id)}/approve`,
      this.#post({ returnRequestId: id }),
    );
  }

  rejectReturn(id: string): Promise<void> {
    return this.#json<void>(`/api/Returns/${encodeURIComponent(id)}/reject`, this.#post());
  }

  refundReturn(id: string): Promise<void> {
    return this.#json<void>(`/api/Returns/${encodeURIComponent(id)}/refund`, this.#post());
  }

  listReturns(status?: ReturnStatus | string): Promise<ReturnRequest[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.#json<ReturnRequest[]>(`/api/Returns${query}`, { method: 'GET' });
  }

  getReturnById(id: string): Promise<ReturnRequest> {
    return this.#json<ReturnRequest>(`/api/Returns/${encodeURIComponent(id)}`, { method: 'GET' });
  }

  getReturn(id: string): Promise<ReturnRequest> {
    return this.getReturnById(id);
  }

  // ── Módulo 8: Facturación Split (/api/Billing) ──────────────────────────

  generateInvoices(orderId: string): Promise<boolean> {
    return this.#json<boolean>(
      `/api/Billing/invoices/generate/${encodeURIComponent(orderId)}`,
      this.#post(),
    );
  }

  annulInvoices(orderId: string, input: AnnulInvoiceInput): Promise<void> {
    return this.#json<void>(
      `/api/Billing/invoices/annul/${encodeURIComponent(orderId)}`,
      this.#post(input),
    );
  }

  listInvoices(): Promise<Invoice[]> {
    return this.#json<Invoice[]>('/api/Billing/invoices', { method: 'GET' });
  }

  getInvoicesByOrder(orderId: string): Promise<Invoice[]> {
    return this.#json<Invoice[]>(
      `/api/Billing/invoices/order/${encodeURIComponent(orderId)}`,
      { method: 'GET' },
    );
  }

}

/** Alias para compatibilidad con código existente */
export { HttpClient as ZentricHttpClient };
