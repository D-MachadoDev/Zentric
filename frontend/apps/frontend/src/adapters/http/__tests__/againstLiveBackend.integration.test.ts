import { beforeAll, describe, expect, it } from 'vitest';
import { WarehouseType, isApiError } from '../../../domain';
import type { ApiError, CurrentUser } from '../../../domain';
import { createApiClient } from '../../index';

/**
 * Verificación del adaptador contra el backend REAL (no un `fetch` falso).
 *
 * Ejecuta el flujo de negocio completo con el `ZentricHttpClient` de producción
 * y afirma que cada uno de los 26 métodos habla la ruta, el desenvolvimiento de
 * respuestas y el formato de error que declaran las specs.
 *
 * Se omite automáticamente si la API no responde en `VITE_API_BASE_URL`, así que
 * `pnpm test` sigue funcionando sin infraestructura levantada.
 */
const BASE_URL = 'http://localhost:15433';

const { session, api } = createApiClient({ baseUrl: BASE_URL });

const ADMIN = { email: 'admin@zentric.local', password: 'AdminLocal12345' };
const sufijo = Date.now().toString(36);

interface Flujo {
  sellerId: string;
  buyerId: string;
  operadorId: string;
  warehouseId: string;
  productId: string;
  variantId: string;
  orderId: string;
  fulfillmentId: string;
  returnId: string;
  invoiceCount: number;
  inventarioDisponible: number;
}

const estado = {} as Flujo;

async function backendDisponible(): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(2000) });
    return response.ok;
  } catch {
    return false;
  }
}

const disponible = await backendDisponible();

/** Enriquece el fallo con el estado HTTP y el detalle del servidor. */
function detalleDe(error: unknown): string {
  if (isApiError(error)) return `HTTP ${(error as ApiError).status} — ${error.detail}`;
  return String(error);
}

/** Ejecuta un paso y, si falla, dice cuál era y qué respondió el servidor. */
async function paso<T>(descripcion: string, accion: () => Promise<T>): Promise<T> {
  try {
    return await accion();
  } catch (error) {
    // `cause` conserva el error original: sin él, el `detalleDe` ya extraído del
    // servidor es lo único que queda y se pierde si resulta inesperado.
    throw new Error(`${descripcion}: ${detalleDe(error)}`, { cause: error });
  }
}

async function loginComo(email: string, password: string): Promise<string> {
  const auth = await api.login({ email, password });
  session.setAccessToken(auth.token);
  return auth.userId;
}

// Solo se ejecuta si se define explicitamente RUN_LIVE_BACKEND_TESTS=true para no mutar ni ensuciar la base de datos de desarrollo
const shouldRunLive = disponible && process.env.RUN_LIVE_BACKEND_TESTS === 'true';

describe.skipIf(!shouldRunLive)('ZentricHttpClient contra el backend real', () => {
  beforeAll(async () => {
    session.setAccessToken((await api.login(ADMIN)).token);
  });

  it('getHealth: responde estado del proceso y de la base', async () => {
    const health = await api.getHealth();

    expect(health.status).toBe('healthy');
    expect(health.database).toBe('up');
  });

  it('login y currentUser devuelven la misma identidad', async () => {
    const adminId = await loginComo(ADMIN.email, ADMIN.password);
    const identity: CurrentUser = await api.currentUser();

    expect(identity.userId).toBe(adminId);
    expect(identity.role).toBe('Administrator');
  });

  it('listUsers: el Administrador ve el listado', async () => {
    const users = await api.listUsers();

    expect(users.some((user) => user.email === ADMIN.email)).toBe(true);
  });

  it('createUser: los tres roles secundarios del flujo', async () => {
    estado.sellerId = await paso('createUser Seller', () =>
      api.createUser({
        identityDocument: `90000${sufijo}`,
        fullName: 'Vendedor Verificación',
        email: `seller-${sufijo}@zentric.local`,
        password: 'Vendedor12345',
        role: 'Seller',
      }),
    );
    estado.buyerId = await paso('createUser Buyer', () =>
      api.createUser({
        identityDocument: `90001${sufijo}`,
        fullName: 'Comprador Verificación',
        email: `buyer-${sufijo}@zentric.local`,
        password: 'Comprador12345',
        role: 'Buyer',
      }),
    );
    estado.operadorId = await paso('createUser LogisticsOperator', () =>
      api.createUser({
        identityDocument: `90002${sufijo}`,
        fullName: 'Operador Verificación',
        email: `ops-${sufijo}@zentric.local`,
        password: 'Operador12345',
        role: 'LogisticsOperator',
      }),
    );

    // readGuid (§3.1): son GUID serializados, no objetos.
    expect(estado.sellerId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(estado.buyerId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(estado.operadorId).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it('listWarehouses y createWarehouse (Administrador)', async () => {
    await paso('listWarehouses', () => api.listWarehouses());

    estado.warehouseId = await paso('createWarehouse', () =>
      api.createWarehouse({
        name: 'Bodega verificación',
        location: 'Bogotá',
        capacity: 1000,
        type: WarehouseType.Vendor,
        vendorId: estado.sellerId,
      }),
    );

    expect(estado.warehouseId).toMatch(/^[0-9a-f-]{36}$/i);
  });

  describe('catálogo e inventario (Vendedor)', () => {
    beforeAll(async () => {
      await loginComo(`seller-${sufijo}@zentric.local`, 'Vendedor12345');
    });

    it('createProduct devuelve CreatedProduct, no un Guid crudo (CAT-01)', async () => {
      const created = await paso('createProduct', () =>
        api.createProduct({
          name: 'Cafetera de verificación',
          description: 'Prensa francesa',
          priceAmount: 49.9,
          priceCurrency: 'COP',
          type: 'Physical',
          variants: [{ sku: `SKU-${sufijo}`, attributes: [{ name: 'Color', value: 'Negro' }] }],
        }),
      );

      estado.productId = created.productId;
      estado.variantId = created.variantIds[0] ?? '';

      expect(created.productId).toMatch(/^[0-9a-f-]{36}$/i);
      expect(created.variantIds).toHaveLength(1);
    });

    it('getProduct devuelve la variante creada y su estado inicial', async () => {
      const product = await paso('getProduct', () => api.getProduct(estado.productId));

      expect(product.variants.map((variant) => variant.id)).toContain(estado.variantId);
      // El alta deja el producto ya Publicado; volver a publicar es un 400.
      expect(product.status).toBe('Published');
    });

    it('listProducts con vendorId es la vista de gestión del dueño (Q-27)', async () => {
      const own = await paso('listProducts(vendorId)', () => api.listProducts(estado.sellerId));

      expect(own.some((product) => product.id === estado.productId)).toBe(true);
    });

    it('publishProduct llega a su endpoint: un producto ya publicado recibe 400', async () => {
      const error = await api
        .publishProduct(estado.productId)
        .then(() => null, (caught: unknown) => caught);

      expect(isApiError(error)).toBe(true);
      expect((error as ApiError).status).toBe(400);
    });

    it('addStock devuelve el inventario creado y el listado lo refleja', async () => {
      const inventoryId = await paso('addStock', () =>
        api.addStock({ variantId: estado.variantId, warehouseId: estado.warehouseId, quantity: 10 }),
      );
      expect(inventoryId).toMatch(/^[0-9a-f-]{36}$/i);

      const rows = await paso('listInventoryByVariant', () => api.listInventoryByVariant(estado.variantId));
      estado.inventarioDisponible = rows.reduce((total, row) => total + row.availableQuantity, 0);

      expect(estado.inventarioDisponible).toBeGreaterThan(0);
    });

    it('listWarehouses como Vendedor sólo ve las suyas', async () => {
      const warehouses = await api.listWarehouses();

      expect(warehouses.some((warehouse) => warehouse.id === estado.warehouseId)).toBe(true);
    });
  });

  describe('carrito, checkout y pago (Comprador)', () => {
    beforeAll(async () => {
      await loginComo(`buyer-${sufijo}@zentric.local`, 'Comprador12345');
    });

    it('createCart no envía cuerpo: la identidad la fija el token (Q-21b)', async () => {
      estado.orderId = await paso('createCart', () => api.createCart());

      expect(estado.orderId).toMatch(/^[0-9a-f-]{36}$/i);
    });

    it('addCartItem y getOrder reflejan la línea añadida', async () => {
      await paso('addCartItem', () =>
        api.addCartItem({ orderId: estado.orderId, variantId: estado.variantId, quantity: 1 }),
      );

      const order = await paso('getOrder', () => api.getOrder(estado.orderId));
      expect(order.items).toHaveLength(1);
    });

    it('checkoutOrder pasa a Pendiente de Pago (200 sin cuerpo)', async () => {
      await expect(paso('checkout', () => api.checkoutOrder(estado.orderId))).resolves.toBeUndefined();

      const order = await api.getOrder(estado.orderId);
      expect(order.status).toBe('PendingPayment');
    });

    it('payOrder pasa a Pagado (200 sin cuerpo)', async () => {
      await expect(paso('pay', () => api.payOrder(estado.orderId))).resolves.toBeUndefined();

      const order = await api.getOrder(estado.orderId);
      expect(order.status).toBe('Paid');
    });
  });

  describe('facturación (Administrador)', () => {
    beforeAll(async () => {
      await loginComo(ADMIN.email, ADMIN.password);
    });

    it('generateInvoices emite y getInvoicesByOrder las devuelve', async () => {
      await expect(paso('generateInvoices', () => api.generateInvoices(estado.orderId))).resolves.toBe(true);

      const invoices = await paso('getInvoicesByOrder', () => api.getInvoicesByOrder(estado.orderId));
      estado.invoiceCount = invoices.length;

      // Factura Maestra + Detalle Zentric (Q-18): una por cada rol que factura.
      expect(invoices.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('logística: ciclo de vida del despacho', () => {
    it('createFulfillment nace en PendingPack (Vendedor)', async () => {
      await loginComo(`seller-${sufijo}@zentric.local`, 'Vendedor12345');

      estado.fulfillmentId = await paso('createFulfillment', () =>
        api.createFulfillment({ customerOrderId: estado.orderId, vendorId: estado.sellerId }),
      );

      expect(estado.fulfillmentId).toMatch(/^[0-9a-f-]{36}$/i);
    });

    it('packFulfillment empaca, requisito previo de todo despacho (Vendedor)', async () => {
      await expect(paso('pack', () => api.packFulfillment(estado.fulfillmentId))).resolves.toBeUndefined();
    });

    it('dispatchFulfillment entrega a la transportadora (Vendedor)', async () => {
      await expect(paso('dispatch', () => api.dispatchFulfillment(estado.fulfillmentId))).resolves.toBeUndefined();
    });

    it('deliverFulfillment cierra la entrega, sólo para Operador logístico (Q-23)', async () => {
      await loginComo(`ops-${sufijo}@zentric.local`, 'Operador12345');

      await expect(paso('deliver', () => api.deliverFulfillment(estado.fulfillmentId))).resolves.toBeUndefined();
    });

    it('cancelGhostStock rechaza cancelar un despacho ya entregado', async () => {
      await loginComo(`seller-${sufijo}@zentric.local`, 'Vendedor12345');

      const error = await api
        .cancelGhostStock({
          fulfillmentOrderId: estado.fulfillmentId,
          variantId: estado.variantId,
          warehouseId: estado.warehouseId,
          quantityToCancel: 1,
        })
        .then(() => null, (caught: unknown) => caught);

      // El rechazo lo emite el dominio, no el enrutador: eso prueba que la ruta existe.
      expect(isApiError(error)).toBe(true);
      expect((error as ApiError).status).toBe(400);
      expect((error as ApiError).detail.length).toBeGreaterThan(0);
    });
  });

  describe('devoluciones (Comprador → Operador → Vendedor)', () => {
    it('requestReturn devuelve la solicitud creada (Comprador)', async () => {
      await loginComo(`buyer-${sufijo}@zentric.local`, 'Comprador12345');

      estado.returnId = await paso('requestReturn', () =>
        api.requestReturn({
          customerOrderId: estado.orderId,
          variantId: estado.variantId,
          warehouseId: estado.warehouseId,
          quantity: 1,
        }),
      );

      expect(estado.returnId).toMatch(/^[0-9a-f-]{36}$/i);
    });

    it('inspectReturn la dictamina (Operador logístico)', async () => {
      await loginComo(`ops-${sufijo}@zentric.local`, 'Operador12345');

      await expect(
        paso('inspect', () => api.inspectReturn(estado.returnId, { isGoodCondition: true })),
      ).resolves.toBeUndefined();
    });

    it('approveReturn la aprueba (Vendedor)', async () => {
      await loginComo(`seller-${sufijo}@zentric.local`, 'Vendedor12345');

      await expect(paso('approve', () => api.approveReturn(estado.returnId))).resolves.toBeUndefined();
    });
  });
});
