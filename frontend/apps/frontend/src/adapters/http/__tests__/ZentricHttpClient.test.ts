import { describe, expect, it } from 'vitest';
import { isApiError } from '../../../domain';
import type { ApiError, SessionPort, UserRole } from '../../../domain';
import { ZentricHttpClient } from '../ZentricHttpClient';

const BASE_URL = 'http://api.test';

interface Registro {
  url: string;
  init: RequestInit;
}

/** Sesión de prueba: sólo el token importa para el adaptador. */
function sesionCon(token: string | null): SessionPort {
  let role: UserRole | null = null;
  let userId: string | null = null;

  return {
    getAccessToken: () => token,
    setAccessToken: () => {},
    clear: () => {},
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

/**
 * `fetch` de prueba que además registra cada petición: no depende del tipo
 * interno de los mocks de Vitest y da un fallo explícito si no hubo llamadas.
 */
function crearFetch(responder: (registro: Registro) => Response | Promise<Response>): {
  impl: typeof fetch;
  llamadas: Registro[];
} {
  const llamadas: Registro[] = [];

  const impl = (async (url: string, init: RequestInit) => {
    const registro = { url, init };
    llamadas.push(registro);
    return responder(registro);
  }) as typeof fetch;

  return { impl, llamadas };
}

function clienteCon(impl: typeof fetch, token: string | null = 'tok-1'): ZentricHttpClient {
  return new ZentricHttpClient({ session: sesionCon(token), baseUrl: BASE_URL, fetchImpl: impl });
}

function primera(llamadas: Registro[]): Registro {
  const registro = llamadas[0];
  if (registro === undefined) throw new Error('El adaptador no llegó a hacer ninguna petición.');
  return registro;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe('ZentricHttpClient — cabeceras (§1)', () => {
  it('adjunta Authorization: Bearer cuando hay token en memoria', async () => {
    const { impl, llamadas } = crearFetch(() => json([]));

    await clienteCon(impl).listUsers();

    expect(new Headers(primera(llamadas).init.headers).get('Authorization')).toBe('Bearer tok-1');
  });

  it('login no lleva Authorization, ni siquiera con un token viejo en memoria', async () => {
    const { impl, llamadas } = crearFetch(() =>
      json({ token: 'nuevo', expiresAt: 'x', userId: 'u', email: 'e', fullName: 'f', role: 'Buyer' }),
    );

    await clienteCon(impl, 'token-caducado').login({ email: 'a', password: 'b' });

    expect(new Headers(primera(llamadas).init.headers).get('Authorization')).toBeNull();
  });

  it('sin token no envía la cabecera en vez de mandarla vacía', async () => {
    const { impl, llamadas } = crearFetch(() => json([]));

    await clienteCon(impl, null).listUsers();

    expect(new Headers(primera(llamadas).init.headers).get('Authorization')).toBeNull();
  });

  it('fija Accept siempre y Content-Type sólo cuando hay cuerpo', async () => {
    const { impl, llamadas } = crearFetch(() => json('id'));

    await clienteCon(impl).createCart();

    const headers = new Headers(primera(llamadas).init.headers);
    expect(headers.get('Accept')).toBe('application/json');
    expect(headers.get('Content-Type')).toBeNull();
  });

  it('pasa el vendorId opcional como query string', async () => {
    const { impl, llamadas } = crearFetch(() => json([]));

    await clienteCon(impl).listProducts('vendedor 1');

    expect(primera(llamadas).url).toBe(`${BASE_URL}/api/Catalog/products?vendorId=vendedor%201`);
  });
});

describe('ZentricHttpClient — desenvoltura de respuestas (§3.1, CAT-01)', () => {
  it('desenvuelve el Guid serializado como cadena en los endpoints de creación', async () => {
    const { impl } = crearFetch(() => json('3de3d5d4-0000-0000-0000-000000000000'));

    await expect(clienteCon(impl).createCart()).resolves.toBe('3de3d5d4-0000-0000-0000-000000000000');
  });

  it('createProduct desenvuelve el objeto, no un Guid crudo (CAT-01)', async () => {
    const { impl } = crearFetch(() => json({ productId: 'p-1', variantIds: ['v-1', 'v-2'] }));

    const creado = await clienteCon(impl).createProduct({
      name: 'Cafetera',
      description: 'Prensa',
      priceAmount: 49.9,
      priceCurrency: 'USD',
      type: 'Physical',
    });

    expect(creado).toEqual({ productId: 'p-1', variantIds: ['v-1', 'v-2'] });
  });

  it('approveReturn envía el id también en el cuerpo (ApproveReturnCommand)', async () => {
    const { impl, llamadas } = crearFetch(() => new Response(null, { status: 204 }));

    await clienteCon(impl).approveReturn('r-1');

    const registro = primera(llamadas);
    expect(registro.url).toBe(`${BASE_URL}/api/Returns/r-1/approve`);
    expect(registro.init.body).toBe(JSON.stringify({ returnRequestId: 'r-1' }));
  });

  it('un 204 sin cuerpo produce undefined en vez de fallar al parsear', async () => {
    const { impl } = crearFetch(() => new Response(null, { status: 204 }));

    await expect(clienteCon(impl).publishProduct('p-1')).resolves.toBeUndefined();
  });
});

describe('ZentricHttpClient — política de reintentos (§1)', () => {
  it('un 4xx es definitivo: no se reintenta', async () => {
    let peticiones = 0;
    const { impl } = crearFetch(() => {
      peticiones += 1;
      return json({ status: 404, detail: 'No existe.' }, 404);
    });

    const error = await clienteCon(impl).getOrder('x').catch((caught: unknown) => caught);

    expect(isApiError(error)).toBe(true);
    expect((error as ApiError).status).toBe(404);
    expect(peticiones).toBe(1);
  });

  it('un 5xx se reintenta una sola vez y luego propaga el error', async () => {
    let peticiones = 0;
    const { impl } = crearFetch(() => {
      peticiones += 1;
      return json({ status: 500, detail: 'Fallo.' }, 500);
    });

    await expect(clienteCon(impl).getOrder('x')).rejects.toMatchObject({ status: 500 });
    expect(peticiones).toBe(2);
  });

  it('un 5xx transitorio se recupera con el reintento', async () => {
    let peticiones = 0;
    const { impl } = crearFetch(() => {
      peticiones += 1;
      return peticiones === 1 ? json(null, 503) : json([]);
    });

    await expect(clienteCon(impl).listUsers()).resolves.toEqual([]);
    expect(peticiones).toBe(2);
  });

  it('un error de red se traduce a ApiError con estado 0 tras reintentar', async () => {
    let peticiones = 0;
    const { impl } = crearFetch(() => {
      peticiones += 1;
      throw new TypeError('Failed to fetch');
    });

    const error = await clienteCon(impl).listUsers().catch((caught: unknown) => caught);

    expect(isApiError(error)).toBe(true);
    expect((error as ApiError).status).toBe(0);
    expect(peticiones).toBe(2);
  });
});
