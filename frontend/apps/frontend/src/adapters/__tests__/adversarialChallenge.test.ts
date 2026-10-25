import { describe, expect, it, vi } from 'vitest';
import { MemorySessionAdapter } from '../session/MemorySessionAdapter';
import { HttpClient } from '../http/HttpClient';
import { MockZentricApiAdapter } from '../mocks/MockZentricApiAdapter';
import {
  AddCartItemSchema,
  AddStockSchema,
  AdjustInventorySchema,
  AnnulInvoiceSchema,
  CancelGhostStockSchema,
  CreateFulfillmentSchema,
  CreateProductSchema,
  CreateUserSchema,
  CreateWarehouseSchema,
  InspectReturnSchema,
  LoginSchema,
  RequestReturnSchema,
} from '../../application/schemas';
import { ProblemDetailsError, ProductType, UserRole, WarehouseType } from '../../domain';
import type { CurrentUser, Order } from '../../domain';

describe('ADVERSARIAL CHALLENGE SUITE (W2-S01)', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // 1. MemorySessionAdapter Storage Isolation & Volatility
  // ═══════════════════════════════════════════════════════════════════════════
  describe('1. MemorySessionAdapter Persistence & Purge ([ADDENDUM OWNER] ADR-0009)', () => {
    it('STRICT ASSERTION: localStorage persists session across reloads and purges on clear()', async () => {
      const session = new MemorySessionAdapter();
      const testUser: CurrentUser = {
        userId: 'sec-user-1',
        email: 'security@zentric.test',
        fullName: 'Security Tester',
        role: UserRole.Administrator,
      };

      // Perform all mutations and state accesses
      session.setAccessToken('super-secret-jwt-token');
      expect(session.getAccessToken()).toBe('super-secret-jwt-token');
      expect(window.localStorage.getItem('zentric.auth.token')).toBe('super-secret-jwt-token');

      session.setUser(testUser);
      expect(session.getUser()).toEqual(testUser);
      expect(session.getRole()).toBe(UserRole.Administrator);
      expect(session.getUserId()).toBe('sec-user-1');

      session.setRole(UserRole.Buyer);
      expect(session.getRole()).toBe(UserRole.Buyer);

      session.setUserId('sec-user-2');
      expect(session.getUserId()).toBe('sec-user-2');

      // Hydrate a second instance (simulating F5 page reload)
      const reloaded = new MemorySessionAdapter();
      expect(reloaded.getAccessToken()).toBe('super-secret-jwt-token');
      expect(reloaded.getRole()).toBe(UserRole.Buyer);
      expect(reloaded.getUserId()).toBe('sec-user-2');

      const subscriber = vi.fn();
      const unsub = session.subscribe(subscriber);
      session.setAccessToken('token-2');
      expect(subscriber).toHaveBeenCalledTimes(1);
      unsub();

      session.clear();
      expect(session.getAccessToken()).toBeNull();
      expect(session.getUser()).toBeNull();
      expect(window.localStorage.getItem('zentric.auth.token')).toBeNull();
      expect(window.localStorage.getItem('zentric.auth.user')).toBeNull();
    });

    it('asserts private fields are not enumerable or leachable via Object reflection', () => {
      const session = new MemorySessionAdapter();
      session.setAccessToken('secret-token');

      const keys = Object.keys(session);
      const ownProps = Object.getOwnPropertyNames(session);
      const ownSymbols = Object.getOwnPropertySymbols(session);

      expect(keys).not.toContain('#accessToken');
      expect(keys).not.toContain('accessToken');
      expect(ownProps).not.toContain('#accessToken');
      expect(ownProps).not.toContain('accessToken');
      expect(ownSymbols).toHaveLength(0);

      // JSON stringify should not leak private fields
      const json = JSON.stringify(session);
      expect(json).not.toContain('secret-token');
    });

    it('survives throwing subscribers without poisoning subsequent listeners or state', () => {
      const session = new MemorySessionAdapter();
      const badListener = vi.fn().mockImplementation(() => {
        throw new Error('Exploding subscriber');
      });
      const goodListener = vi.fn();

      session.subscribe(badListener);
      session.subscribe(goodListener);

      expect(() => session.setAccessToken('token-x')).not.toThrow();
      expect(badListener).toHaveBeenCalledTimes(1);
      expect(goodListener).toHaveBeenCalledTimes(1);
      expect(session.getAccessToken()).toBe('token-x');
    });

    it('strict fail-closed behavior on restore() error', async () => {
      const session = new MemorySessionAdapter();
      session.setAccessToken('leaked-or-invalid-token');
      session.bindIdentityLoader(() => Promise.reject(new Error('Network / Token Expired')));

      const restored = await session.restore();
      expect(restored).toBe(false);
      expect(session.getAccessToken()).toBeNull();
      expect(session.getUser()).toBeNull();
      expect(session.getRole()).toBeNull();
      expect(session.getUserId()).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. HttpClient Adversarial RFC 7807/9457 & Error Handling
  // ═══════════════════════════════════════════════════════════════════════════
  describe('2. HttpClient RFC 7807 / RFC 9457 Adversarial Error Handling', () => {
    function createMockClient(responder: (url: string, init: RequestInit) => Response | Promise<Response>, initialToken = 'active-jwt') {
      const session = new MemorySessionAdapter();
      if (initialToken) session.setAccessToken(initialToken);

      const capturedRequests: Array<{ url: string; init: RequestInit }> = [];
      const fetchImpl = (async (url: string, init: RequestInit) => {
        capturedRequests.push({ url, init });
        return responder(url, init);
      }) as typeof fetch;

      const client = new HttpClient({
        session,
        baseUrl: 'http://api.zentric.test',
        fetchImpl,
        timeoutMs: 3000,
      });

      return { client, session, capturedRequests };
    }

    it('400 Validation Error: parses validation dictionary and sets error metadata', async () => {
      const rfc7807Payload = {
        type: 'https://tools.ietf.org/html/rfc9110#section-15.5.1',
        title: 'One or more validation errors occurred.',
        status: 400,
        traceId: '00-trace-12345',
        errors: {
          Email: ['Email is required.', 'Email format is invalid.'],
          Password: ['Password must be at least 8 characters long.'],
        },
      };

      const { client } = createMockClient(() =>
        new Response(JSON.stringify(rfc7807Payload), {
          status: 400,
          headers: { 'Content-Type': 'application/problem+json' },
        }),
      );

      let caughtError: ProblemDetailsError | null = null;
      try {
        await client.createUser({
          identityDocument: '123',
          fullName: 'Test',
          email: 'invalid',
          password: '123',
          role: UserRole.Buyer,
        });
      } catch (err) {
        if (err instanceof ProblemDetailsError) caughtError = err;
      }

      expect(caughtError).not.toBeNull();
      expect(caughtError!.status).toBe(400);
      expect(caughtError!.traceId).toBe('00-trace-12345');
      expect(caughtError!.errors).toBeDefined();
      expect(caughtError!.errors!['Email']).toContain('Email is required.');
      expect(caughtError!.errors!['Password']).toContain('Password must be at least 8 characters long.');
    });

    it('401 Unauthorized WITH token: triggers fail-closed session wipe', async () => {
      const { client, session } = createMockClient(() =>
        new Response(JSON.stringify({ status: 401, title: 'Unauthorized', detail: 'Token has expired.' }), {
          status: 401,
          headers: { 'Content-Type': 'application/problem+json' },
        }),
      );

      expect(session.getAccessToken()).toBe('active-jwt');
      await expect(client.getCurrentUser()).rejects.toThrow(ProblemDetailsError);
      expect(session.getAccessToken()).toBeNull();
    });

    it('401 Unauthorized on unauthenticated request (e.g. login): throws without modifying empty session', async () => {
      const { client, session } = createMockClient(
        () =>
          new Response(JSON.stringify({ status: 401, title: 'Unauthorized', detail: 'Bad credentials.' }), {
            status: 401,
          }),
        '', // No initial token
      );

      await expect(client.login({ email: 'fake@zentric.test', password: 'wrong' })).rejects.toThrow(ProblemDetailsError);
      expect(session.getAccessToken()).toBeNull();
    });

    it('403 Forbidden: preserves session, does not retry, throws ProblemDetailsError(403)', async () => {
      let attempts = 0;
      const { client, session } = createMockClient(() => {
        attempts += 1;
        return new Response(JSON.stringify({ status: 403, title: 'Forbidden', detail: 'Role Buyer lacks LogisticsDeliver.' }), {
          status: 403,
        });
      });

      await expect(client.deliverFulfillment('ful-1')).rejects.toThrow(ProblemDetailsError);
      expect(attempts).toBe(1); // Zero retries
      expect(session.getAccessToken()).toBe('active-jwt'); // Session intact
    });

    it('404 Not Found: does not retry, throws ProblemDetailsError(404)', async () => {
      let attempts = 0;
      const { client } = createMockClient(() => {
        attempts += 1;
        return new Response(JSON.stringify({ status: 404, title: 'Not Found', detail: 'Product does not exist.' }), {
          status: 404,
        });
      });

      await expect(client.getProductById('p-missing')).rejects.toThrow(ProblemDetailsError);
      expect(attempts).toBe(1);
    });

    it('409 Conflict: does not retry, throws ProblemDetailsError(409)', async () => {
      let attempts = 0;
      const { client } = createMockClient(() => {
        attempts += 1;
        return new Response(JSON.stringify({ status: 409, title: 'Conflict', detail: 'Stock concurrency quiebre.' }), {
          status: 409,
        });
      });

      await expect(client.checkoutOrder('ord-1')).rejects.toThrow(ProblemDetailsError);
      expect(attempts).toBe(1);
    });

    it('500 Server Error: retries ONCE on GET, zero retries on POST', async () => {
      let getAttempts = 0;
      const { client: getClient } = createMockClient(() => {
        getAttempts += 1;
        return new Response(JSON.stringify({ status: 500, detail: 'Internal DB crash' }), { status: 500 });
      });

      await expect(getClient.getOrderById('o-1')).rejects.toThrow(ProblemDetailsError);
      expect(getAttempts).toBe(2); // 1 initial + 1 retry

      let postAttempts = 0;
      const { client: postClient } = createMockClient(() => {
        postAttempts += 1;
        return new Response(JSON.stringify({ status: 500, detail: 'Internal DB crash' }), { status: 500 });
      });

      await expect(postClient.payOrder('o-1')).rejects.toThrow(ProblemDetailsError);
      expect(postAttempts).toBe(1); // Exactly 1 attempt on POST mutation
    });

    it('Degrades gracefully on hostile responses (HTML, malformed JSON, empty body)', async () => {
      // Case A: 502 Bad Gateway with raw HTML
      const { client: clientA } = createMockClient(() => new Response('<html>502 Bad Gateway</html>', { status: 502 }));
      const errA = await clientA.getOrderById('o-1').catch((e) => e);
      expect(errA).toBeInstanceOf(ProblemDetailsError);
      expect(errA.status).toBe(502);

      // Case B: 500 with truncated malformed JSON
      const { client: clientB } = createMockClient(() => new Response('{"title": "incomp...', { status: 500 }));
      const errB = await clientB.getOrderById('o-1').catch((e) => e);
      expect(errB).toBeInstanceOf(ProblemDetailsError);
      expect(errB.status).toBe(500);

      // Case C: Network exception (fetch throws TypeError)
      const session = new MemorySessionAdapter();
      const failClient = new HttpClient({
        session,
        baseUrl: 'http://api.zentric.test',
        fetchImpl: async () => {
          throw new TypeError('Failed to fetch');
        },
        timeoutMs: 1000,
      });
      const errC = await failClient.getOrderById('o-1').catch((e) => e);
      expect(errC).toBeInstanceOf(ProblemDetailsError);
      expect(errC.status).toBe(0);
      expect(errC.title).toBe('Error de conexión');
    });

    it('Eradicates forged client identity headers regardless of casing', async () => {
      const { client, capturedRequests } = createMockClient(() => new Response(JSON.stringify([]), { status: 200 }));

      // Call an endpoint
      await client.listUsers();

      expect(capturedRequests).toHaveLength(1);
      const headers = new Headers(capturedRequests[0]!.init.headers);

      expect(headers.get('x-buyer-id')).toBeNull();
      expect(headers.get('X-Buyer-Id')).toBeNull();
      expect(headers.get('x-user-id')).toBeNull();
      expect(headers.get('X-User-Id')).toBeNull();
      expect(headers.get('x-role')).toBeNull();
      expect(headers.get('X-Role')).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Zod Schemas Validation Boundaries & Hostile Payloads
  // ═══════════════════════════════════════════════════════════════════════════
  describe('3. Zod Validation Boundaries (Hostile Payloads)', () => {
    describe('LoginSchema', () => {
      it('rejects empty or whitespace-only inputs', () => {
        expect(LoginSchema.safeParse({ email: '', password: 'pwd' }).success).toBe(false);
        expect(LoginSchema.safeParse({ email: '   ', password: 'pwd' }).success).toBe(false);
        expect(LoginSchema.safeParse({ email: 'user@test.com', password: '' }).success).toBe(false);
        expect(LoginSchema.safeParse({}).success).toBe(false);
      });
    });

    describe('CreateUserSchema', () => {
      it('rejects missing mandatory fields or invalid enum roles', () => {
        expect(
          CreateUserSchema.safeParse({
            identityDocument: '',
            fullName: 'User',
            email: 'user@test.com',
            password: 'pwd',
            role: UserRole.Buyer,
          }).success,
        ).toBe(false);

        expect(
          CreateUserSchema.safeParse({
            identityDocument: '123',
            fullName: '',
            email: 'user@test.com',
            password: 'pwd',
            role: UserRole.Buyer,
          }).success,
        ).toBe(false);

        expect(
          CreateUserSchema.safeParse({
            identityDocument: '123',
            fullName: 'User',
            email: 'user@test.com',
            password: 'pwd',
            role: 'SuperHackerRole' as unknown as UserRole,
          }).success,
        ).toBe(false);

        expect(
          CreateUserSchema.safeParse({
            identityDocument: '123',
            fullName: 'User',
            email: 'a', // < 3 characters
            password: 'pwd',
            role: UserRole.Buyer,
          }).success,
        ).toBe(false);
      });
    });

    describe('CreateWarehouseSchema', () => {
      it('rejects negative capacity and fractional numbers', () => {
        expect(
          CreateWarehouseSchema.safeParse({
            name: 'Bodega',
            location: 'Bogotá',
            capacity: -1,
            type: WarehouseType.Marketplace,
            vendorId: null,
          }).success,
        ).toBe(false);

        expect(
          CreateWarehouseSchema.safeParse({
            name: 'Bodega',
            location: 'Bogotá',
            capacity: 10.5,
            type: WarehouseType.Marketplace,
            vendorId: null,
          }).success,
        ).toBe(false);
      });

      it('strictly enforces vendorId rules based on WarehouseType', () => {
        // Marketplace warehouse with non-null vendorId MUST fail
        expect(
          CreateWarehouseSchema.safeParse({
            name: 'Bodega',
            location: 'Bogotá',
            capacity: 100,
            type: WarehouseType.Marketplace,
            vendorId: 'vendor-id-should-not-be-here',
          }).success,
        ).toBe(false);

        // Vendor warehouse with null vendorId MUST fail
        expect(
          CreateWarehouseSchema.safeParse({
            name: 'Bodega',
            location: 'Bogotá',
            capacity: 100,
            type: WarehouseType.Vendor,
            vendorId: null,
          }).success,
        ).toBe(false);

        // Vendor warehouse with empty or whitespace vendorId MUST fail
        expect(
          CreateWarehouseSchema.safeParse({
            name: 'Bodega',
            location: 'Bogotá',
            capacity: 100,
            type: WarehouseType.Vendor,
            vendorId: '   ',
          }).success,
        ).toBe(false);
      });
    });

    describe('AddStockSchema & AdjustInventorySchema', () => {
      it('AddStock strictly rejects quantity <= 0 and floating quantities', () => {
        expect(AddStockSchema.safeParse({ variantId: 'v1', warehouseId: 'w1', quantity: 0 }).success).toBe(false);
        expect(AddStockSchema.safeParse({ variantId: 'v1', warehouseId: 'w1', quantity: -50 }).success).toBe(false);
        expect(AddStockSchema.safeParse({ variantId: 'v1', warehouseId: 'w1', quantity: 2.75 }).success).toBe(false);
        expect(AddStockSchema.safeParse({ variantId: '', warehouseId: 'w1', quantity: 10 }).success).toBe(false);
      });

      it('AdjustInventory strictly rejects negative countedQuantity and empty reason', () => {
        expect(AdjustInventorySchema.safeParse({ countedQuantity: -1, reason: 'Physical recount' }).success).toBe(false);
        expect(AdjustInventorySchema.safeParse({ countedQuantity: 10.5, reason: 'Physical recount' }).success).toBe(false);
        expect(AdjustInventorySchema.safeParse({ countedQuantity: 10, reason: '' }).success).toBe(false);
        expect(AdjustInventorySchema.safeParse({ countedQuantity: 10, reason: '    ' }).success).toBe(false);
      });
    });

    describe('CreateProductSchema', () => {
      it('rejects non-positive price, non-3-char currency, and physical products with no variants', () => {
        const base = {
          name: 'Producto Test',
          description: 'Desc',
          priceAmount: 100,
          priceCurrency: 'COP',
          type: ProductType.Physical,
          variants: [{ sku: 'SKU-1', attributes: [{ name: 'Color', value: 'Azul' }] }],
        };

        expect(CreateProductSchema.safeParse({ ...base, priceAmount: 0 }).success).toBe(false);
        expect(CreateProductSchema.safeParse({ ...base, priceAmount: -10 }).success).toBe(false);
        expect(CreateProductSchema.safeParse({ ...base, priceCurrency: 'US' }).success).toBe(false);
        expect(CreateProductSchema.safeParse({ ...base, priceCurrency: 'USDD' }).success).toBe(false);
        expect(CreateProductSchema.safeParse({ ...base, type: ProductType.Physical, variants: [] }).success).toBe(false);
        expect(CreateProductSchema.safeParse({ ...base, type: ProductType.Physical, variants: undefined }).success).toBe(false);

        // Description exceeding 2000 chars must fail
        expect(CreateProductSchema.safeParse({ ...base, description: 'a'.repeat(2001) }).success).toBe(false);
      });
    });

    describe('Contract Parity Empirical Audit (Zod vs Backend FluentValidation)', () => {
      it('EMPIRICAL AUDIT: identifies permissive email and password boundaries in CreateUserSchema', () => {
        // Backend CreateUserCommandValidator requires .EmailAddress() and .MinimumLength(8).
        // Frontend CreateUserSchema currently only enforces .min(3) on email and .min(1) on password.
        const nonEmailPayload = {
          identityDocument: '12345678',
          fullName: 'Test User',
          email: 'not-an-email',
          password: 'pwd', // only 3 chars (backend requires 8..128)
          role: UserRole.Buyer,
        };

        const result = CreateUserSchema.safeParse(nonEmailPayload);
        // We empirically document that CreateUserSchema currently permits this payload
        expect(result.success).toBe(true);
      });

      it('EMPIRICAL AUDIT: identifies missing .email() check in LoginSchema', () => {
        // Backend LoginCommandValidator requires .EmailAddress().
        // Frontend LoginSchema currently only checks .min(1).
        const nonEmailLogin = {
          email: 'not-an-email',
          password: 'some-password',
        };

        const result = LoginSchema.safeParse(nonEmailLogin);
        // We empirically document that LoginSchema accepts non-email strings
        expect(result.success).toBe(true);
      });

      it('EMPIRICAL AUDIT: identifies missing .min(1) on description and missing .max(200) on name in CreateProductSchema', () => {
        // Backend CreateProductCommandValidator requires:
        // - Name: NotEmpty, MaximumLength(200)
        // - Description: NotEmpty, MaximumLength(2000)
        const emptyDescPayload = {
          name: 'a'.repeat(250), // exceeds backend 200 limit
          description: '', // backend has NotEmpty()
          priceAmount: 50,
          priceCurrency: 'USD',
          type: ProductType.Physical,
          variants: [{ sku: 'SKU-1', attributes: [{ name: 'Color', value: 'Black' }] }],
        };

        const result = CreateProductSchema.safeParse(emptyDescPayload);
        // We empirically document that frontend schema does not reject 250-char name or empty description
        expect(result.success).toBe(true);
      });
    });

    describe('Operational schemas: AddCartItem, CancelGhostStock, RequestReturn, AnnulInvoice', () => {
      it('rejects invalid quantities or blank mandatory fields', () => {
        expect(AddCartItemSchema.safeParse({ orderId: '', variantId: 'v1', quantity: 1 }).success).toBe(false);
        expect(AddCartItemSchema.safeParse({ orderId: 'o1', variantId: '', quantity: 1 }).success).toBe(false);
        expect(AddCartItemSchema.safeParse({ orderId: 'o1', variantId: 'v1', quantity: 0 }).success).toBe(false);

        expect(CreateFulfillmentSchema.safeParse({ customerOrderId: '', vendorId: 'v1' }).success).toBe(false);
        expect(CreateFulfillmentSchema.safeParse({ customerOrderId: 'o1', vendorId: '' }).success).toBe(false);

        expect(CancelGhostStockSchema.safeParse({ fulfillmentOrderId: 'f1', variantId: 'v1', warehouseId: 'w1', quantityToCancel: 0 }).success).toBe(false);
        expect(CancelGhostStockSchema.safeParse({ fulfillmentOrderId: 'f1', variantId: 'v1', warehouseId: 'w1', quantityToCancel: -1 }).success).toBe(false);

        expect(RequestReturnSchema.safeParse({ customerOrderId: 'o1', variantId: 'v1', warehouseId: 'w1', quantity: 0 }).success).toBe(false);

        expect(InspectReturnSchema.safeParse({ isGoodCondition: 'true' as unknown as boolean }).success).toBe(false);
        expect(InspectReturnSchema.safeParse({ isGoodCondition: null as unknown as boolean }).success).toBe(false);

        expect(AnnulInvoiceSchema.safeParse({ reason: '' }).success).toBe(false);
        expect(AnnulInvoiceSchema.safeParse({ reason: '    ' }).success).toBe(false);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. MockZentricApiAdapter Concurrency & Edge Cases
  // ═══════════════════════════════════════════════════════════════════════════
  describe('4. MockZentricApiAdapter Concurrency & Edge Cases', () => {
    it('handles concurrent addStock without lost updates or corruption', async () => {
      const mock = new MockZentricApiAdapter();
      const variantId = 'var-stress-1';
      const warehouseId = 'wh-stress-1';

      // 50 concurrent stock additions of 5 units each
      const promises: Promise<string>[] = [];
      for (let i = 0; i < 50; i++) {
        promises.push(mock.addStock({ variantId, warehouseId, quantity: 5 }));
      }

      await Promise.all(promises);

      const inventories = await mock.listInventoryByVariant(variantId);
      expect(inventories).toHaveLength(1);
      expect(inventories[0]!.availableQuantity).toBe(250); // 50 * 5 = 250
    });

    it('handles concurrent cart item additions and accurately calculates totalAmount', async () => {
      const mock = new MockZentricApiAdapter();
      const orderId = await mock.createCart();

      // 20 concurrent cart item additions of 2 units each
      const promises: Promise<void>[] = [];
      for (let i = 0; i < 20; i++) {
        promises.push(mock.addCartItem({ orderId, variantId: `var-${i}`, quantity: 2 }));
      }

      await Promise.all(promises);

      const order = (await mock.getOrderById(orderId)) as Order;
      expect(order.items).toHaveLength(20);
      expect(order.totalAmount).toBe(20 * (100 * 2)); // 4000
    });

    it('returns 404 ProblemDetailsError for non-existent entities across all bounded contexts', async () => {
      const mock = new MockZentricApiAdapter();

      await expect(mock.getUserById('non-existent')).rejects.toThrow(ProblemDetailsError);
      await expect(mock.getWarehouseById('non-existent')).rejects.toThrow(ProblemDetailsError);
      await expect(mock.adjustInventory('non-existent', { countedQuantity: 10, reason: 'test' })).rejects.toThrow(ProblemDetailsError);
      await expect(mock.getProductById('non-existent')).rejects.toThrow(ProblemDetailsError);
      await expect(mock.getOrderById('non-existent')).rejects.toThrow(ProblemDetailsError);
      await expect(mock.getFulfillmentById('non-existent')).rejects.toThrow(ProblemDetailsError);
      await expect(mock.getReturnById('non-existent')).rejects.toThrow(ProblemDetailsError);
      await expect(mock.annulInvoices('non-existent', { reason: 'test' })).rejects.toThrow(ProblemDetailsError);
    });

    it('rejects invalid login credentials with 401 ProblemDetailsError', async () => {
      const mock = new MockZentricApiAdapter();

      await expect(mock.login({ email: 'admin@zentric.test', password: 'bad-password' })).rejects.toThrow(ProblemDetailsError);
      await expect(mock.login({ email: 'unknown@zentric.test', password: 'any' })).rejects.toThrow(ProblemDetailsError);
    });

    it('handles listProductsPaged boundary parameters (empty pages, pagination limits)', async () => {
      const mock = new MockZentricApiAdapter();

      const paged = await mock.listProductsPaged({ page: 999, size: 10 });
      expect(paged.items).toHaveLength(0);
      expect(paged.hasNext).toBe(false);
      expect(paged.hasPrevious).toBe(true);
    });

    it('EMPIRICAL AUDIT: Mock adapter allows cancelling ghost stock on delivered orders', async () => {
      const mock = new MockZentricApiAdapter();
      const fulId = await mock.createFulfillment({
        customerOrderId: 'ord-delivered',
        vendorId: 'ven-1',
      });
      await mock.packFulfillment(fulId);
      await mock.dispatchFulfillment(fulId);
      await mock.deliverFulfillment(fulId);

      const fulBefore = await mock.getFulfillmentById(fulId);
      expect(fulBefore.status).toBe('Delivered');

      // Attempt cancel ghost stock on a delivered fulfillment
      const cancelResult = await mock.cancelGhostStock({
        fulfillmentOrderId: fulId,
        variantId: 'v1',
        warehouseId: 'w1',
        quantityToCancel: 1,
      });

      expect(cancelResult).toBe(true);
      const fulAfter = await mock.getFulfillmentById(fulId);
      // In Mock adapter, it overwrites status to 'Cancelled' instead of rejecting
      expect(fulAfter.status).toBe('Cancelled');
    });

    it('covers all MockZentricApiAdapter lifecycle operations, filters, aliases, and mutation 404 guards', async () => {
      const mock = new MockZentricApiAdapter();

      expect((await mock.getHealth()).status).toBe('healthy');
      expect((await mock.currentUser()).email).toBe('admin@zentric.test');

      const existingUserId = mock.users[0]!.id;
      expect((await mock.getUser(existingUserId)).id).toBe(existingUserId);
      await mock.blockUser(existingUserId);
      expect((await mock.getUserById(existingUserId)).isActive).toBe(false);
      await mock.activateUser(existingUserId);
      expect((await mock.getUserById(existingUserId)).isActive).toBe(true);
      expect(await mock.listUsers('Seller' as UserRole)).toHaveLength(1);

      const whId = await mock.createWarehouse({
        name: 'Bodega Seller',
        location: 'Medellín',
        capacity: 500,
        type: WarehouseType.Vendor,
        vendorId: 'ven-1',
      });
      expect(await mock.listWarehouses('ven-1')).toHaveLength(1);
      expect(await mock.listWarehouses()).toHaveLength(2);

      // Existing inventory increment vs new inventory record
      const existingInv = mock.inventories[0]!;
      await mock.addStock({
        variantId: existingInv.variantId,
        warehouseId: existingInv.warehouseId,
        quantity: 5,
      });
      await mock.addStock({
        variantId: 'var-new',
        warehouseId: whId,
        quantity: 12,
      });
      expect((await mock.listInventories()).length).toBeGreaterThanOrEqual(2);
      expect(await mock.listInventoryByVariant('var-new')).toHaveLength(1);
      const adj = await mock.adjustInventory(existingInv.id, {
        countedQuantity: 80,
        reason: 'Conteo físico',
      });
      expect(adj.newAvailableQuantity).toBe(80);

      // Product lifecycle & filters
      const createdProd = await mock.createProduct({
        name: 'Monitor 4K',
        description: 'IPS',
        priceAmount: 400,
        priceCurrency: 'USD',
        type: ProductType.Physical,
        variants: [{ sku: 'MON-4K', attributes: [{ name: 'size', value: '27' }] }],
      });
      await expect(mock.suspendProduct(createdProd.productId)).resolves.toBeUndefined();
      await expect(mock.publishProduct(createdProd.productId)).resolves.toBeUndefined();
      expect((await mock.getProduct(createdProd.productId)).status).toBe('Published');
      expect((await mock.listProducts(mock.currentUserData.userId)).length).toBeGreaterThanOrEqual(1);
      expect((await mock.listProducts()).length).toBeGreaterThanOrEqual(2);
      expect((await mock.listProductsPaged()).items.length).toBeGreaterThanOrEqual(1);
      expect(
        (await mock.listProductsPaged({ vendorId: mock.currentUserData.userId })).items.length,
      ).toBeGreaterThanOrEqual(1);

      // Order, Fulfillment, Return, Billing lifecycles & aliases
      const cartId = await mock.createCart();
      await mock.addCartItem({ orderId: cartId, variantId: 'var-new', quantity: 1 });
      await mock.checkoutOrder(cartId);
      await mock.payOrder(cartId);
      expect((await mock.getOrder(cartId)).status).toBe('Paid');
      expect((await mock.listOrders('Paid')).length).toBeGreaterThanOrEqual(1);
      expect((await mock.listOrders()).length).toBeGreaterThanOrEqual(1);

      const fulId = await mock.createFulfillment({ customerOrderId: cartId, vendorId: 'ven-1' });
      expect((await mock.getFulfillment(fulId)).id).toBe(fulId);
      expect((await mock.listFulfillments('PendingPack')).length).toBeGreaterThanOrEqual(1);
      expect((await mock.listFulfillments()).length).toBeGreaterThanOrEqual(1);

      const retId = await mock.requestReturn({
        customerOrderId: cartId,
        variantId: 'var-new',
        warehouseId: whId,
        quantity: 1,
      });
      await mock.inspectReturn(retId, { isGoodCondition: true });
      await mock.approveReturn(retId);
      await mock.refundReturn(retId);
      expect((await mock.getReturn(retId)).status).toBe('Refunded');

      const retId2 = await mock.requestReturn({
        customerOrderId: cartId,
        variantId: 'var-new',
        warehouseId: whId,
        quantity: 1,
      });
      await mock.rejectReturn(retId2);
      expect((await mock.listReturns('Rejected')).length).toBeGreaterThanOrEqual(1);
      expect((await mock.listReturns()).length).toBeGreaterThanOrEqual(2);

      await mock.generateInvoices(cartId);
      expect((await mock.listInvoices()).length).toBeGreaterThanOrEqual(1);
      expect((await mock.getInvoicesByOrder(cartId)).length).toBeGreaterThanOrEqual(1);
      await expect(mock.annulInvoices(cartId, { reason: 'Error en cobro' })).resolves.toBeUndefined();

      // Mutation 404 guards
      await expect(mock.blockUser('missing')).rejects.toThrow(ProblemDetailsError);
      await expect(mock.activateUser('missing')).rejects.toThrow(ProblemDetailsError);
      await expect(
        mock.addCartItem({ orderId: 'missing', variantId: 'v', quantity: 1 }),
      ).rejects.toThrow(ProblemDetailsError);
      await expect(mock.checkoutOrder('missing')).rejects.toThrow(ProblemDetailsError);
      await expect(mock.payOrder('missing')).rejects.toThrow(ProblemDetailsError);
      await expect(mock.packFulfillment('missing')).rejects.toThrow(ProblemDetailsError);
      await expect(mock.dispatchFulfillment('missing')).rejects.toThrow(ProblemDetailsError);
      await expect(mock.deliverFulfillment('missing')).rejects.toThrow(ProblemDetailsError);
      await expect(mock.inspectReturn('missing', { isGoodCondition: false })).rejects.toThrow(
        ProblemDetailsError,
      );
      await expect(mock.approveReturn('missing')).rejects.toThrow(ProblemDetailsError);
      await expect(mock.rejectReturn('missing')).rejects.toThrow(ProblemDetailsError);
      await expect(mock.refundReturn('missing')).rejects.toThrow(ProblemDetailsError);
    });
  });
});
