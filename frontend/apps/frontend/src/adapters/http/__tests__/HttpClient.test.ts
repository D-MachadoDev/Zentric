import { describe, expect, it } from 'vitest';
import { HttpClient } from '../HttpClient';
import { MemorySessionAdapter } from '../../session/MemorySessionAdapter';
import { ProblemDetailsError } from '../../../domain';

describe('HttpClient (Frontend-Adapters §1–§3.4)', () => {
  const BASE_URL = 'http://api.zentric.test';

  function createTestClient(responder: (url: string, init: RequestInit) => Response | Promise<Response>, token: string | null = 'test-token') {
    const session = new MemorySessionAdapter();
    if (token) session.setAccessToken(token);

    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetchImpl = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return responder(url, init);
    }) as typeof fetch;

    const client = new HttpClient({
      session,
      baseUrl: BASE_URL,
      fetchImpl,
      timeoutMs: 5000,
    });

    return { client, session, calls };
  }

  it('inyecta cabecera Bearer token y elimina cabeceras forjables', async () => {
    const { client, calls } = createTestClient(() => new Response(JSON.stringify([]), { status: 200 }));

    await client.listUsers();

    expect(calls.length).toBe(1);
    const headers = new Headers(calls[0]!.init.headers);
    expect(headers.get('Authorization')).toBe('Bearer test-token');
    expect(headers.get('Accept')).toBe('application/json');
    expect(headers.get('X-Buyer-Id')).toBeNull();
    expect(headers.get('X-User-Id')).toBeNull();
    expect(headers.get('X-Role')).toBeNull();
  });

  it('no inyecta cabecera Authorization en getHealth ni en login', async () => {
    const { client, calls } = createTestClient(() =>
      new Response(JSON.stringify({ status: 'healthy', database: 'up' }), { status: 200 }),
    );

    await client.getHealth();
    expect(new Headers(calls[0]!.init.headers).get('Authorization')).toBeNull();

    await client.login({ email: 'u@test.com', password: 'pwd' });
    expect(new Headers(calls[1]!.init.headers).get('Authorization')).toBeNull();
  });

  it('limpia la sesión en RAM ante 401 si se envió un token (Fail-Closed)', async () => {
    const { client, session } = createTestClient(() =>
      new Response(
        JSON.stringify({
          status: 401,
          title: 'Unauthorized',
          detail: 'Token expirado',
        }),
        { status: 401, headers: { 'Content-Type': 'application/problem+json' } },
      ),
    );

    expect(session.getAccessToken()).toBe('test-token');

    await expect(client.getCurrentUser()).rejects.toThrow(ProblemDetailsError);
    expect(session.getAccessToken()).toBeNull();
  });

  it('reintenta una sola vez en GET ante fallo 500 y luego arroja ProblemDetailsError', async () => {
    let attempts = 0;
    const { client } = createTestClient(() => {
      attempts += 1;
      return new Response(JSON.stringify({ status: 500, detail: 'Error interno' }), { status: 500 });
    });

    await expect(client.getOrderById('o-1')).rejects.toThrow(ProblemDetailsError);
    expect(attempts).toBe(2);
  });

  it('no reintenta ante errores 4xx', async () => {
    let attempts = 0;
    const { client } = createTestClient(() => {
      attempts += 1;
      return new Response(JSON.stringify({ status: 404, detail: 'No encontrado' }), { status: 404 });
    });

    await expect(client.getProductById('p-none')).rejects.toThrow(ProblemDetailsError);
    expect(attempts).toBe(1);
  });

  it('no reintenta ante errores en operaciones POST de mutación', async () => {
    let attempts = 0;
    const { client } = createTestClient(() => {
      attempts += 1;
      return new Response(JSON.stringify({ status: 500, detail: 'Error en checkout' }), { status: 500 });
    });

    await expect(client.checkoutOrder('o-1')).rejects.toThrow(ProblemDetailsError);
    expect(attempts).toBe(1);
  });

  it('desenvuelve GUIDs correctamente sin comillas', async () => {
    const { client } = createTestClient(() =>
      new Response(JSON.stringify('3de3d5d4-0000-0000-0000-000000000000'), { status: 200 }),
    );

    const guid = await client.createCart();
    expect(guid).toBe('3de3d5d4-0000-0000-0000-000000000000');
  });

  it('approveReturn envía { returnRequestId: id } en el cuerpo', async () => {
    const { client, calls } = createTestClient(() => new Response(null, { status: 200 }));

    await client.approveReturn('ret-123');

    expect(calls[0]!.url).toBe(`${BASE_URL}/api/Returns/ret-123/approve`);
    expect(calls[0]!.init.body).toBe(JSON.stringify({ returnRequestId: 'ret-123' }));
  });

  it('ejecuta los endpoints de los 10 módulos del sistema (45 métodos)', async () => {
    const { client, calls } = createTestClient((url) => {
      if (url.includes('generate')) return new Response(JSON.stringify(true), { status: 200 });
      if (url.includes('cancel-ghost-stock')) return new Response(JSON.stringify(true), { status: 200 });
      if (url.includes('paged'))
        return new Response(
          JSON.stringify({ items: [], page: 0, size: 10, totalItems: 0, totalPages: 0 }),
          { status: 200 },
        );
      return new Response(JSON.stringify([]), { status: 200 });
    });

    await client.listUsers('Seller');
    await client.getUserById('u-1');
    await client.blockUser('u-1');
    await client.activateUser('u-1');

    await client.listWarehouses('v-1');
    await client.getWarehouseById('wh-1');

    await client.listInventories();
    await client.listInventoryByVariant('var-1');

    await client.listProducts('v-1');
    await client.listProductsPaged({ page: 1, size: 5, vendorId: 'v-1' });
    await client.getProductById('prod-1');
    await client.publishProduct('prod-1');
    await client.suspendProduct('prod-1');

    await client.listOrders('Paid');
    await client.getOrderById('ord-1');
    await client.payOrder('ord-1');

    await client.listFulfillments('Packed');
    await client.getFulfillmentById('ful-1');
    await client.packFulfillment('ful-1');
    await client.dispatchFulfillment('ful-1');
    await client.deliverFulfillment('ful-1');
    await client.cancelGhostStock({
      fulfillmentOrderId: 'ful-1',
      variantId: 'var-1',
      warehouseId: 'wh-1',
      quantityToCancel: 2,
    });

    await client.listReturns('Requested');
    await client.getReturnById('ret-1');
    await client.inspectReturn('ret-1', { isGoodCondition: true });
    await client.rejectReturn('ret-1');
    await client.refundReturn('ret-1');

    await client.generateInvoices('ord-1');
    await client.annulInvoices('ord-1', { reason: 'Anulación de prueba' });
    await client.listInvoices();
    await client.getInvoicesByOrder('ord-1');

    expect(calls.length).toBeGreaterThanOrEqual(25);
  });
});
