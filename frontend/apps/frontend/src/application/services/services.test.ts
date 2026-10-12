import { describe, expect, it, vi } from 'vitest';
import { ProductType, UserRole } from '../../domain';
import type { CreateProductInput, SessionPort, UserRole as UserRoleType, ZentricApiPort } from '../../domain';
import {
  AbrirCarritoService,
  CerrarSesionService,
  ConsultarBodegasService,
  ConsultarCatalogoService,
  ConsultarDevolucionesService,
  ExportarService,
  IniciarSesionService,
  ReembolsarDevolucionService,
  RegistrarBodegaService,
  RegistrarProductoService,
  RegistrarUsuarioService,
  RestaurarSesionService,
} from './index';

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
