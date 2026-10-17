import { describe, expect, it, vi } from 'vitest';
import { ProductType, UserRole } from '../../domain';
import type { CreateProductInput, SessionPort, UserRole as UserRoleType, ZentricApiPort } from '../../domain';
import {
  AbrirCarritoService,
  AgregarLineaCarritoService,
  AprobarDevolucionService,
  CancelarPorStockFantasmaService,
  CerrarSesionService,
  ConsultarBodegasService,
  ConsultarCatalogoService,
  ConsultarDespachoService,
  ConsultarDespachosService,
  ConsultarDevolucionService,
  ConsultarDevolucionesService,
  ConsultarFacturasPorPedidoService,
  ConsultarPedidoService,
  ConsultarProductoService,
  ConsultarStockPorVarianteService,
  ConsultarUsuariosService,
  CrearDespachoService,
  DespacharDespachoService,
  EmpacarDespachoService,
  EntregarDespachoService,
  ExportarService,
  IngresarStockService,
  IniciarSesionService,
  InspeccionarDevolucionService,
  ListarPedidosService,
  PagarPedidoService,
  PublicarProductoService,
  ReembolsarDevolucionService,
  RegistrarBodegaService,
  RegistrarProductoService,
  RegistrarUsuarioService,
  RestaurarSesionService,
  SolicitarDevolucionService,
  SuspenderProductoService,
  VerificarEstadoServidorService,
  getDefaultApi,
  getDefaultSession,
  resolveApi,
  resolveSession,
  setDefaultApi,
  setDefaultSession,
} from './index';
import { queryKeys } from './queryKeys';

/** Sesión en memoria real: el access token vive sólo ahí (ADR-0009). */
function crearSesion(): SessionPort {
  let token: string | null = null;
  let role: UserRoleType | null = null;
  let userId: string | null = null;

  return {
    getAccessToken: () => token,
    setAccessToken: (value) => {
      token = value;
    },
    clear: () => {
      token = null;
      role = null;
      userId = null;
    },
    restore: async () => token !== null,
    getRole: () => role,
    setRole: (value) => {
      role = value;
    },
    getUserId: () => userId,
    setUserId: (value) => {
      userId = value;
    },
  };
}

/** Doble de puerto: sólo se declara el método que el caso de uso ejercita. */
function crearApi(metodos: Record<string, unknown>): ZentricApiPort {
  return metodos as unknown as ZentricApiPort;
}

function entradaProducto(): CreateProductInput {
  return {
    name: 'Cafetera',
    description: 'Prensa francesa',
    priceAmount: 49.9,
    priceCurrency: 'USD',
    type: ProductType.Physical,
  };
}

describe('IniciarSesionService (§2.1)', () => {
  it('guarda el token en memoria y devuelve la identidad sin exponerlo', async () => {
    const sesion = crearSesion();
    const api = crearApi({
      login: vi.fn().mockResolvedValue({
        token: 'tok-123',
        expiresAt: '2026-01-01T00:00:00Z',
        userId: 'u-1',
        email: 'ana@zentric.dev',
        fullName: 'Ana',
        role: UserRole.Buyer,
      }),
    });

    const identidad = await new IniciarSesionService(api, sesion).ejecutar({
      email: 'ana@zentric.dev',
      password: 'secret',
    });

    expect(sesion.getAccessToken()).toBe('tok-123');
    expect(sesion.getRole()).toBe(UserRole.Buyer);
    expect(sesion.getUserId()).toBe('u-1');
    expect(identidad).toEqual({
      userId: 'u-1',
      email: 'ana@zentric.dev',
      fullName: 'Ana',
      role: UserRole.Buyer,
    });
    // Quien llama no debe manejar el token: la identidad no lo transporta.
    expect(identidad).not.toHaveProperty('token');
  });
});

describe('RestaurarSesionService (§2.1, ADR-0009)', () => {
  it('sin token no restaura nada y ni siquiera consulta al servidor', async () => {
    const currentUser = vi.fn();
    const resultado = await new RestaurarSesionService(crearApi({ currentUser }), crearSesion()).ejecutar();

    expect(resultado).toBeNull();
    expect(currentUser).not.toHaveBeenCalled();
  });

  it('con token reconstruye la identidad desde el servidor', async () => {
    const sesion = crearSesion();
    sesion.setAccessToken('tok-123');
    const api = crearApi({
      currentUser: vi.fn().mockResolvedValue({
        userId: 'u-1',
        email: 'ana@zentric.dev',
        fullName: 'Ana',
        role: UserRole.Seller,
      }),
    });

    const resultado = await new RestaurarSesionService(api, sesion).ejecutar();

    expect(resultado?.userId).toBe('u-1');
    expect(sesion.getRole()).toBe(UserRole.Seller);
    expect(sesion.getUserId()).toBe('u-1');
  });
});

describe('CerrarSesionService (§2.1)', () => {
  it('limpia el token en memoria y vuelve al estado inicial', () => {
    const sesion = crearSesion();
    sesion.setAccessToken('tok-123');

    new CerrarSesionService(sesion).ejecutar();

    expect(sesion.getAccessToken()).toBeNull();
  });
});

describe('RegistrarProductoService (§2.2, FR-03)', () => {
  it('toma el variantId del propio alta en vez de depender del releer', async () => {
    const getProduct = vi.fn().mockResolvedValue({
      id: 'p-1',
      variants: [{ id: 'v-1', sku: 'CAF-01', canBeSold: true }],
    });
    const api = crearApi({
      createProduct: vi.fn().mockResolvedValue({ productId: 'p-1', variantIds: ['v-1', 'v-2'] }),
      getProduct,
    });

    const registrado = await new RegistrarProductoService(api).ejecutar(entradaProducto());

    expect(registrado).toEqual({ productId: 'p-1', variantId: 'v-1', sku: 'CAF-01' });
  });

  it('un producto Digital sin variantes devuelve nulos sin llegar a releer', async () => {
    const getProduct = vi.fn();
    const api = crearApi({
      createProduct: vi.fn().mockResolvedValue({ productId: 'p-2', variantIds: [] }),
      getProduct,
    });

    const registrado = await new RegistrarProductoService(api).ejecutar({
      ...entradaProducto(),
      type: ProductType.Digital,
    });

    expect(registrado).toEqual({ productId: 'p-2', variantId: null, sku: null });
    expect(getProduct).not.toHaveBeenCalled();
  });
});

describe('Casos de uso que no deben llevar identidad (Q-21b)', () => {
  it('abrir el carrito no envía ningún identificador: la fija el token', async () => {
    const createCart = vi.fn().mockResolvedValue('o-1');

    await new AbrirCarritoService(crearApi({ createCart })).ejecutar();

    expect(createCart).toHaveBeenCalledWith();
  });
});

describe('ConsultarCatalogoService (§2.2, Q-27)', () => {
  it('con vendorId consulta la vista de gestión del dueño', async () => {
    const listProducts = vi.fn().mockResolvedValue([]);

    await new ConsultarCatalogoService(crearApi({ listProducts })).ejecutar('vendedor-1');

    expect(listProducts).toHaveBeenCalledWith('vendedor-1');
  });

  it('sin vendorId es el catálogo comercial', async () => {
    const listProducts = vi.fn().mockResolvedValue([]);

    await new ConsultarCatalogoService(crearApi({ listProducts })).ejecutar();

    expect(listProducts).toHaveBeenCalledWith(undefined);
  });
});

describe('RegistrarUsuarioService (§2.1)', () => {
  it('devuelve el id creado SIN tocar la sesión del llamante', async () => {
    // Regresión: el servicio sobreescribía el `userId` de la sesión con el id del
    // usuario creado. Un Administrador que daba de alta un Vendedor quedaba
    // creyéndose ese Vendedor, porque la sesión es del LLAMANTE, no del creado.
    const sesion = crearSesion();
    sesion.setAccessToken('tok-admin');
    sesion.setUserId('admin-1');

    const api = crearApi({ createUser: vi.fn().mockResolvedValue('vendedor-9') });

    const id = await new RegistrarUsuarioService(api).ejecutar({
      identityDocument: '123',
      fullName: 'Vera',
      email: 'vera@zentric.dev',
      password: 'secret',
      role: UserRole.Seller,
    });

    expect(id).toBe('vendedor-9');
    expect(sesion.getUserId()).toBe('admin-1');
  });
});

describe('Bodegas (§2.8)', () => {
  it('ConsultarBodegasService delega el listado completo al servidor', async () => {
    const listWarehouses = vi.fn().mockResolvedValue([]);

    await new ConsultarBodegasService(crearApi({ listWarehouses })).ejecutar();

    expect(listWarehouses).toHaveBeenCalledWith();
  });

  it('RegistrarBodegaService envía la bodega tal cual, sin identidad (Q-21b)', async () => {
    const createWarehouse = vi.fn().mockResolvedValue('b-1');

    await new RegistrarBodegaService(crearApi({ createWarehouse })).ejecutar({
      name: 'Principal',
      location: 'Bogotá',
      capacity: 120,
      type: 'Marketplace',
      vendorId: null,
    });

    expect(createWarehouse).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Principal', vendorId: null }),
    );
  });
});

describe('Devoluciones (§2.7)', () => {
  it('ConsultarDevolucionesService pide la bandeja sin filtros de dueño', async () => {
    const listReturns = vi.fn().mockResolvedValue([]);

    await new ConsultarDevolucionesService(crearApi({ listReturns })).ejecutar();

    // El reparto por rol es del servidor; el cliente no filtra ni pide ajenas.
    expect(listReturns).toHaveBeenCalledWith();
  });

  it('ReembolsarDevolucionService sólo envía el identificador (Q-24)', async () => {
    const refundReturn = vi.fn().mockResolvedValue(undefined);

    await new ReembolsarDevolucionService(crearApi({ refundReturn })).ejecutar('dev-7');

    // Sin cuerpo: el handler recibe `userId` y `role` del token.
    expect(refundReturn).toHaveBeenCalledWith('dev-7');
  });
});

describe('ExportarService (§3)', () => {
  it('escapa comillas y comas según RFC 4180', () => {
    const csv = new ExportarService().ejecutar([{ nombre: 'Café, con leche', total: 10 }]);

    expect(csv).toBe('nombre,total\r\n"Café, con leche",10');
  });

  it('una lista vacía produce un CSV vacío', () => {
    expect(new ExportarService().ejecutar([])).toBe('');
  });
});

describe('Servicios de dominio complementarios y apiContext', () => {
  it('ejercita los servicios de catálogo, inventario, pedidos, logística, devoluciones, facturación y salud', async () => {
    const api = crearApi({
      getProductById: vi.fn().mockResolvedValue({ id: 'p-1', variants: [{ id: 'v-1', sku: 'SKU-1' }] }),
      createProduct: vi.fn().mockResolvedValue({ productId: 'p-1', variantIds: ['v-1'] }),
      publishProduct: vi.fn().mockResolvedValue(undefined),
      suspendProduct: vi.fn().mockResolvedValue(undefined),
      addStock: vi.fn().mockResolvedValue('inv-1'),
      listInventoryByVariant: vi.fn().mockResolvedValue([]),
      addCartItem: vi.fn().mockResolvedValue(undefined),
      getOrderById: vi.fn().mockResolvedValue({ id: 'o-1' }),
      listOrders: vi.fn().mockResolvedValue([]),
      payOrder: vi.fn().mockResolvedValue(undefined),
      createFulfillment: vi.fn().mockResolvedValue('f-1'),
      listFulfillments: vi.fn().mockResolvedValue([]),
      getFulfillmentById: vi.fn().mockResolvedValue({ id: 'f-1' }),
      packFulfillment: vi.fn().mockResolvedValue(undefined),
      dispatchFulfillment: vi.fn().mockResolvedValue(undefined),
      deliverFulfillment: vi.fn().mockResolvedValue(undefined),
      cancelGhostStock: vi.fn().mockResolvedValue(true),
      requestReturn: vi.fn().mockResolvedValue('r-1'),
      inspectReturn: vi.fn().mockResolvedValue(undefined),
      approveReturn: vi.fn().mockResolvedValue(undefined),
      getReturnById: vi.fn().mockResolvedValue({ id: 'r-1' }),
      listReturns: vi.fn().mockResolvedValue([]),
      getInvoicesByOrder: vi.fn().mockResolvedValue([]),
      listUsers: vi.fn().mockResolvedValue([]),
      getHealth: vi.fn().mockResolvedValue({ status: 'healthy', database: 'up', timestamp: 'now' }),
    });

    await expect(new ConsultarProductoService(api).ejecutar('p-1')).resolves.toMatchObject({ id: 'p-1' });
    await expect(new RegistrarProductoService(api).ejecutar(entradaProducto())).resolves.toEqual({
      productId: 'p-1',
      variantId: 'v-1',
      sku: 'SKU-1',
    });
    await expect(new PublicarProductoService(api).ejecutar('p-1')).resolves.toBeUndefined();
    await expect(new SuspenderProductoService(api).ejecutar('p-1')).resolves.toBeUndefined();

    await expect(
      new IngresarStockService(api).ejecutar({ variantId: 'v-1', warehouseId: 'w-1', quantity: 5 }),
    ).resolves.toBe('inv-1');
    await expect(new ConsultarStockPorVarianteService(api).ejecutar('v-1')).resolves.toEqual([]);

    await expect(
      new AgregarLineaCarritoService(api).ejecutar({ orderId: 'o-1', variantId: 'v-1', quantity: 2 }),
    ).resolves.toBeUndefined();
    await expect(new ConsultarPedidoService(api).ejecutar('o-1')).resolves.toEqual({ id: 'o-1' });
    await expect(new ListarPedidosService(api).ejecutar('Paid')).resolves.toEqual([]);
    await expect(new PagarPedidoService(api).ejecutar('o-1')).resolves.toBeUndefined();

    await expect(
      new CrearDespachoService(api).ejecutar({ customerOrderId: 'o-1', vendorId: 'v-1' }),
    ).resolves.toBe('f-1');
    await expect(new ConsultarDespachosService(api).ejecutar('Packed')).resolves.toEqual([]);
    await expect(new ConsultarDespachoService(api).ejecutar('f-1')).resolves.toEqual({ id: 'f-1' });
    await expect(new EmpacarDespachoService(api).ejecutar('f-1')).resolves.toBeUndefined();
    await expect(new DespacharDespachoService(api).ejecutar('f-1')).resolves.toBeUndefined();
    await expect(new EntregarDespachoService(api).ejecutar('f-1')).resolves.toBeUndefined();
    await expect(
      new CancelarPorStockFantasmaService(api).ejecutar({
        fulfillmentOrderId: 'f-1',
        variantId: 'v-1',
        warehouseId: 'w-1',
        quantityToCancel: 1,
      }),
    ).resolves.toBe(true);

    await expect(
      new SolicitarDevolucionService(api).ejecutar({
        customerOrderId: 'o-1',
        variantId: 'v-1',
        warehouseId: 'w-1',
        quantity: 1,
      }),
    ).resolves.toBe('r-1');
    await expect(
      new InspeccionarDevolucionService(api).ejecutar('r-1', { isGoodCondition: true }),
    ).resolves.toBeUndefined();
    await expect(new AprobarDevolucionService(api).ejecutar('r-1')).resolves.toBeUndefined();
    await expect(new ConsultarDevolucionService(api).ejecutar('r-1')).resolves.toEqual({ id: 'r-1' });
    await expect(new ConsultarDevolucionesService(api).ejecutar('Requested')).resolves.toEqual([]);

    await expect(new ConsultarFacturasPorPedidoService(api).ejecutar('o-1')).resolves.toEqual([]);
    await expect(new ConsultarUsuariosService(api).ejecutar()).resolves.toEqual([]);
    await expect(new VerificarEstadoServidorService(api).ejecutar()).resolves.toMatchObject({
      status: 'healthy',
    });
  });

  it('apiContext gestiona y resuelve instancias por defecto o explícitas', () => {
    const api = crearApi({});
    const sesion = crearSesion();

    setDefaultApi(api);
    setDefaultSession(sesion);

    expect(getDefaultApi()).toBe(api);
    expect(getDefaultSession()).toBe(sesion);
    expect(resolveApi()).toBe(api);
    expect(resolveSession()).toBe(sesion);
    expect(resolveApi(api)).toBe(api);
    expect(resolveSession(sesion)).toBe(sesion);
  });

  it('queryKeys genera claves deterministas con y sin filtros opcionales', () => {
    expect(queryKeys.health.all).toEqual(['health']);
    expect(queryKeys.auth.me()).toEqual(['auth', 'me']);
    expect(queryKeys.users.list()).toEqual(['users', 'list', {}]);
    expect(queryKeys.users.list({ role: UserRole.Administrator })).toEqual(['users', 'list', { role: UserRole.Administrator }]);
    expect(queryKeys.users.detail('u-1')).toEqual(['users', 'detail', 'u-1']);
    expect(queryKeys.warehouses.list()).toEqual(['warehouses', 'list', {}]);
    expect(queryKeys.warehouses.list({ vendorId: 'v-1' })).toEqual(['warehouses', 'list', { vendorId: 'v-1' }]);
    expect(queryKeys.warehouses.detail('w-1')).toEqual(['warehouses', 'detail', 'w-1']);
    expect(queryKeys.inventories.list()).toEqual(['inventories', 'list']);
    expect(queryKeys.inventories.variant('var-1')).toEqual(['inventories', 'variant', 'var-1']);
    expect(queryKeys.products.list()).toEqual(['products', 'list', {}]);
    expect(queryKeys.products.list({ vendorId: 'v-1' })).toEqual(['products', 'list', { vendorId: 'v-1' }]);
    expect(queryKeys.products.paged()).toEqual(['products', 'paged', {}]);
    expect(queryKeys.products.paged({ page: 1, size: 10 })).toEqual(['products', 'paged', { page: 1, size: 10 }]);
    expect(queryKeys.products.detail('p-1')).toEqual(['products', 'detail', 'p-1']);
    expect(queryKeys.orders.list()).toEqual(['orders', 'list', {}]);
    expect(queryKeys.orders.list({ status: 'Paid' })).toEqual(['orders', 'list', { status: 'Paid' }]);
    expect(queryKeys.orders.detail('o-1')).toEqual(['orders', 'detail', 'o-1']);
    expect(queryKeys.fulfillments.list()).toEqual(['fulfillments', 'list', {}]);
    expect(queryKeys.fulfillments.list({ status: 'Packed' })).toEqual(['fulfillments', 'list', { status: 'Packed' }]);
    expect(queryKeys.fulfillments.detail('f-1')).toEqual(['fulfillments', 'detail', 'f-1']);
    expect(queryKeys.returns.list()).toEqual(['returns', 'list', {}]);
    expect(queryKeys.returns.list({ status: 'Requested' })).toEqual(['returns', 'list', { status: 'Requested' }]);
    expect(queryKeys.returns.detail('r-1')).toEqual(['returns', 'detail', 'r-1']);
    expect(queryKeys.invoices.list()).toEqual(['invoices', 'list']);
    expect(queryKeys.invoices.order('o-1')).toEqual(['invoices', 'order', 'o-1']);
  });
});

