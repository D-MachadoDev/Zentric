import { ApiError } from '../../domain';
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
  SessionPort,
  User,
  Warehouse,
  ZentricApiPort,
} from '../../domain';
import { toApiError } from './problemDetails';

const DEFAULT_BASE_URL = 'http://localhost:5076';
const TIMEOUT_MS = 15_000;

export interface ZentricHttpClientOptions {
  /** Provee y guarda el access token; es la única fuente de autenticación. */
  session: SessionPort;
  /** Por defecto `VITE_API_BASE_URL`, y en su defecto el puerto de desarrollo. */
  baseUrl?: string;
  /** Sustituible en pruebas. */
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

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
 * Adaptador HTTP: único punto de contacto con la red (Frontend-Adapters §1–§3.4).
 *
 * Implementa los 30 métodos de `ZentricApiPort` traduciendo rutas, cabeceras y
 * envoltorios de error. Ninguna capa superior conoce `fetch`, la URL base ni
 * `ProblemDetails`.
 */
export class ZentricHttpClient implements ZentricApiPort {
  readonly #baseUrl: string;
  readonly #session: SessionPort;
  readonly #fetchImpl: typeof fetch;
  readonly #timeoutMs: number;

  constructor(options: ZentricHttpClientOptions) {
    this.#baseUrl = (options.baseUrl ?? readBaseUrlFromEnv()).replace(/\/+$/u, '');
    this.#session = options.session;
    this.#fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.#timeoutMs = options.timeoutMs ?? TIMEOUT_MS;
  }

  // ── Núcleo de peticiones ───────────────────────────────────────────────────

  /**
   * Envía una petición con la política de §1: 15 s de tiempo máximo y **un**
   * reintento ante `5xx` o error de red, nunca ante un `4xx`.
   *
   * Reintentar un `5xx` no duplica efectos: cada caso de uso del backend corre
   * dentro de una transacción, así que un fallo que llegó a `5xx` ya revirtió
   * sus escrituras.
   */
  async #send(path: string, init: RequestInit = {}, withAuth = true): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    if (init.body !== undefined) headers.set('Content-Type', 'application/json');

    if (withAuth) {
      // `login` y `health` no llevan token (§1); el resto, sí cuando lo hay.
      const token = this.#session.getAccessToken();
      if (token !== null) headers.set('Authorization', `Bearer ${token}`);
    }

    const url = `${this.#baseUrl}${path}`;
    let retriesLeft = 1;

    for (;;) {
      try {
        const response = await this.#fetchImpl(url, {
          ...init,
          headers,
          signal: AbortSignal.timeout(this.#timeoutMs),
        });

        if (!response.ok) {
          // §4: un `401` (token caducado o sesión vacía) limpia la sesión. Sólo
          // aplica a quien llevaba token — un `401` de un `login` fallido no es
          // una sesión que se haya perdido, es una credencial que no valía.
          if (response.status === 401 && withAuth && this.#session.getAccessToken() !== null) {
            this.#session.clear();
          }

          const error = toApiError(response.status, await response.text());
          if (response.status >= 500 && retriesLeft > 0) {
            retriesLeft -= 1;
            continue;
          }
          throw error;
        }

        return response;
      } catch (error) {
        if (error instanceof ApiError) throw error;

        // Error de red o tiempo agotado: queda el único reintento permitido.
        if (retriesLeft > 0) {
          retriesLeft -= 1;
          continue;
        }
        // Estado 0 = nunca hubo respuesta del servidor; la presentación lo
        // distingue de un error HTTP para ofrecer reintento (§5).
        throw new ApiError(0, 'No se pudo contactar con el servidor.');
      }
    }
  }

  /** Devuelve el cuerpo ya interpretado; un `204` produce `undefined`. */
  async #json<T>(path: string, init: RequestInit = {}, withAuth = true): Promise<T> {
    const response = await this.#send(path, init, withAuth);
    const text = await response.text();
    return (text === '' ? undefined : JSON.parse(text)) as T;
  }

  /** §3.1: los endpoints de creación devuelven el Guid serializado como cadena. */
  async #guid(path: string, init: RequestInit = {}): Promise<string> {
    const response = await this.#send(path, init);
    return JSON.parse(await response.text()) as string;
  }

  #post(body?: unknown): RequestInit {
    return body === undefined ? { method: 'POST' } : { method: 'POST', body: JSON.stringify(body) };
  }

  // ── Transversal ────────────────────────────────────────────────────────────

  getHealth(): Promise<HealthStatus> {
    return this.#json<HealthStatus>('/health', { method: 'GET' }, false);
  }

  // ── Identidad y acceso ─────────────────────────────────────────────────────

  login(input: LoginInput): Promise<AuthToken> {
    return this.#json<AuthToken>('/api/auth/login', this.#post(input), false);
  }

  currentUser(): Promise<CurrentUser> {
    return this.#json<CurrentUser>('/api/auth/me', { method: 'GET' });
  }

  listUsers(): Promise<User[]> {
    return this.#json<User[]>('/api/Users', { method: 'GET' });
  }

  createUser(input: CreateUserInput): Promise<string> {
    return this.#guid('/api/Users', this.#post(input));
  }

  // ── Catálogo ───────────────────────────────────────────────────────────────

  listProducts(vendorId?: string): Promise<Product[]> {
    const query = vendorId === undefined ? '' : `?vendorId=${encodeURIComponent(vendorId)}`;
    return this.#json<Product[]>(`/api/Catalog/products${query}`, { method: 'GET' });
  }

  getProduct(id: string): Promise<Product> {
    return this.#json<Product>(`/api/Catalog/products/${encodeURIComponent(id)}`, { method: 'GET' });
  }

  /**
   * CAT-01: devuelve `{ productId, variantIds }`, no un Guid crudo, así que no
   * pasa por `#guid`. `variantIds` puede venir vacío cuando el producto es
   * `Digital` (ADR-0003).
   */
  createProduct(input: CreateProductInput): Promise<CreatedProduct> {
    return this.#json<CreatedProduct>('/api/Catalog/products', this.#post(input));
  }

  publishProduct(productId: string): Promise<void> {
    return this.#json<void>(`/api/Catalog/products/${encodeURIComponent(productId)}/publish`, this.#post());
  }

  /** `200 OK` sin cuerpo: la ruta refleja el estado al releer el producto. */
  suspendProduct(productId: string): Promise<void> {
    return this.#json<void>(`/api/Catalog/products/${encodeURIComponent(productId)}/suspend`, this.#post());
  }

  // ── Inventario ─────────────────────────────────────────────────────────────

  addStock(input: AddStockInput): Promise<string> {
    return this.#guid('/api/Inventories/stock', this.#post(input));
  }

  listInventoryByVariant(variantId: string): Promise<Inventory[]> {
    return this.#json<Inventory[]>(`/api/Inventories/${encodeURIComponent(variantId)}`, { method: 'GET' });
  }

  // ── Bodegas ────────────────────────────────────────────────────────────────

  listWarehouses(): Promise<Warehouse[]> {
    return this.#json<Warehouse[]>('/api/Warehouses', { method: 'GET' });
  }

  createWarehouse(input: CreateWarehouseInput): Promise<string> {
    return this.#guid('/api/Warehouses', this.#post(input));
  }

  // ── Carrito y pedidos ──────────────────────────────────────────────────────

  /** Sin cuerpo: el backend fija el comprador desde el token (Q-21b). */
  createCart(): Promise<string> {
    return this.#guid('/api/Orders/cart', this.#post());
  }

  addCartItem(input: AddCartItemInput): Promise<void> {
    return this.#json<void>('/api/Orders/cart/items', this.#post(input));
  }

  getOrder(id: string): Promise<Order> {
    return this.#json<Order>(`/api/Orders/${encodeURIComponent(id)}`, { method: 'GET' });
  }

  listOrders(status?: string): Promise<OrderListItem[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.#json<OrderListItem[]>(`/api/Orders${query}`, { method: 'GET' });
  }

  /** `200 OK` **sin cuerpo**: el backend no devuelve el nuevo estado. */
  checkoutOrder(orderId: string): Promise<void> {
    return this.#json<void>(`/api/Orders/${encodeURIComponent(orderId)}/checkout`, this.#post());
  }

  /** `200 OK` **sin cuerpo**. No cobra: el backend no tiene pasarela (ADR-0009). */
  payOrder(orderId: string): Promise<void> {
    return this.#json<void>(`/api/Orders/${encodeURIComponent(orderId)}/pay`, this.#post());
  }

  // ── Facturación ────────────────────────────────────────────────────────────

  generateInvoices(orderId: string): Promise<boolean> {
    return this.#json<boolean>(`/api/Billing/invoices/generate/${encodeURIComponent(orderId)}`, this.#post());
  }

  getInvoicesByOrder(orderId: string): Promise<Invoice[]> {
    return this.#json<Invoice[]>(`/api/Billing/invoices/order/${encodeURIComponent(orderId)}`, { method: 'GET' });
  }

  // ── Logística ──────────────────────────────────────────────────────────────

  createFulfillment(input: CreateFulfillmentInput): Promise<string> {
    return this.#guid('/api/Logistics/fulfillment', this.#post(input));
  }

  listFulfillments(status?: string): Promise<FulfillmentOrder[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.#json<FulfillmentOrder[]>(`/api/Logistics/fulfillments${query}`, { method: 'GET' });
  }

  getFulfillment(id: string): Promise<FulfillmentOrder> {
    return this.#json<FulfillmentOrder>(`/api/Logistics/fulfillment/${encodeURIComponent(id)}`, { method: 'GET' });
  }

  /** `PendingPack` → `Packed` (ADDENDUM Dominio 8). Requisito previo al despacho. */
  packFulfillment(id: string): Promise<void> {
    return this.#json<void>(`/api/Logistics/fulfillment/${encodeURIComponent(id)}/pack`, this.#post());
  }

  /** `Packed` → `Dispatched`; descuenta formalmente el stock reservado. */
  dispatchFulfillment(id: string): Promise<void> {
    return this.#json<void>(`/api/Logistics/fulfillment/${encodeURIComponent(id)}/dispatch`, this.#post());
  }

  /** `Dispatched` → `Delivered`. Sólo lo cierra el Operador Logístico (Q-23). */
  deliverFulfillment(id: string): Promise<void> {
    return this.#json<void>(`/api/Logistics/fulfillment/${encodeURIComponent(id)}/deliver`, this.#post());
  }

  cancelGhostStock(input: CancelGhostStockInput): Promise<boolean> {
    return this.#json<boolean>('/api/Logistics/fulfillment/cancel-ghost-stock', this.#post(input));
  }

  // ── Devoluciones ───────────────────────────────────────────────────────────

  requestReturn(input: RequestReturnInput): Promise<string> {
    return this.#guid('/api/Returns/request', this.#post(input));
  }

  inspectReturn(id: string, input: InspectReturnInput): Promise<void> {
    return this.#json<void>(`/api/Returns/${encodeURIComponent(id)}/inspect`, this.#post(input));
  }

  /**
   * `POST /api/returns/{id}/approve` exige el identificador **también** en el
   * cuerpo (`ApproveReturnCommand: { returnRequestId }`, verificado en
   * `backendSDD/Presentation/01-endpoints.md:277`). Aquí los dos valores salen
   * del mismo argumento, así que coinciden por construcción.
   */
  approveReturn(returnRequestId: string): Promise<void> {
    return this.#json<void>(
      `/api/Returns/${encodeURIComponent(returnRequestId)}/approve`,
      this.#post({ returnRequestId }),
    );
  }

  /** `GET /api/returns`: la bandeja que el servidor reparte según el rol del token. */
  listReturns(status?: string): Promise<ReturnRequest[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.#json<ReturnRequest[]>(`/api/Returns${query}`, { method: 'GET' });
  }

  getReturn(id: string): Promise<ReturnRequest> {
    return this.#json<ReturnRequest>(`/api/Returns/${encodeURIComponent(id)}`, { method: 'GET' });
  }

  /**
   * `POST /api/returns/{id}/refund` (Q-24). A diferencia de `approve`, el
   * comando **no** lleva cuerpo: el handler recibe `userId` y `role` del token.
   */
  refundReturn(id: string): Promise<void> {
    return this.#json<void>(`/api/Returns/${encodeURIComponent(id)}/refund`, this.#post());
  }
}
