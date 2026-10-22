import { describe, expect, it } from 'vitest';
import { ProductStatus, ProductType } from '../../domain';
import type { Product } from '../../domain';
import { HttpClient } from '../http/HttpClient';
import { MemorySessionAdapter } from '../session/MemorySessionAdapter';
import { MockZentricApiAdapter } from '../mocks/MockZentricApiAdapter';

/** Producto mínimo para sembrar el adaptador simulado. */
function producto(props: Partial<Product>): Product {
  return {
    id: 'prod-base',
    name: 'Producto Base',
    description: 'Descripción base',
    price: 100,
    currency: 'COP',
    vendorId: 'vendor-1',
    type: ProductType.Physical,
    status: ProductStatus.Published,
    variants: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    ...props,
  };
}

describe('Capa de datos del catálogo (S1/S2/S3) — transporte HttpClient', () => {
  const BASE_URL = 'http://api.zentric.test';

  function createClient() {
    const session = new MemorySessionAdapter();
    session.setAccessToken('token');

    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetchImpl = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      if (url.includes('categories')) return new Response(JSON.stringify([]), { status: 200 });
      if (url.includes('hero')) return new Response(JSON.stringify([]), { status: 200 });
      return new Response(
        JSON.stringify({ items: [], page: 0, size: 10, totalItems: 0, totalPages: 0 }),
        { status: 200 },
      );
    }) as typeof fetch;

    return { client: new HttpClient({ session, baseUrl: BASE_URL, fetchImpl }), calls };
  }

  it('serializa search, sort y type sólo cuando están definidos', async () => {
    const { client, calls } = createClient();

    await client.listProductsPaged({ page: 1, size: 12, category: 'laptops' });
    expect(calls[0]!.url).toBe(`${BASE_URL}/api/Catalog/products/paged?page=1&size=12&category=laptops`);

    await client.listProductsPaged({
      search: 'teclado',
      sort: 'price-asc',
      type: ProductType.Digital,
    });
    expect(calls[1]!.url).toBe(
      `${BASE_URL}/api/Catalog/products/paged?search=teclado&sort=price-asc&type=Digital`,
    );
  });

  it('emite los tres valores de sort con la ortografía exacta del contrato', async () => {
    const { client, calls } = createClient();

    await client.listProductsPaged({ sort: 'relevance' });
    await client.listProductsPaged({ sort: 'price-asc' });
    await client.listProductsPaged({ sort: 'price-desc' });

    expect(calls[0]!.url).toContain('sort=relevance');
    expect(calls[1]!.url).toContain('sort=price-asc');
    expect(calls[2]!.url).toContain('sort=price-desc');
  });

  it('omite search vacío para no alterar la petición previa al bloque', async () => {
    const { client, calls } = createClient();

    await client.listProductsPaged({ search: '' });

    expect(calls[0]!.url).toBe(`${BASE_URL}/api/Catalog/products/paged`);
  });

  it('consume categorías y hero en sus endpoints canónicos', async () => {
    const { client, calls } = createClient();

    await client.listCategories();
    await client.listHeroProducts();
    await client.listHeroProducts(6);

    expect(calls[0]!.url).toBe(`${BASE_URL}/api/Catalog/categories`);
    expect(calls[1]!.url).toBe(`${BASE_URL}/api/Catalog/products/hero`);
    expect(calls[2]!.url).toBe(`${BASE_URL}/api/Catalog/products/hero?count=6`);
  });
});

describe('Capa de datos del catálogo (S1/S2/S3) — MockZentricApiAdapter', () => {
  function seed(): MockZentricApiAdapter {
    const mock = new MockZentricApiAdapter();
    mock.products = [
      producto({
        id: 'p1',
        name: 'Laptop Pro',
        description: 'Portátil de desarrollo',
        price: 1500,
        category: 'computacion',
      }),
      producto({
        id: 'p2',
        name: 'Mouse Gamer',
        description: 'Periférico de precisión',
        price: 50,
        category: 'perifericos',
      }),
      producto({
        id: 'p3',
        name: 'Teclado Mecánico',
        description: 'Periférico inalámbrico',
        price: 120,
        type: ProductType.Digital,
        category: 'perifericos',
      }),
      producto({
        id: 'p4',
        name: 'Curso Avanzado',
        description: 'Formación asíncrona',
        price: 200,
        status: ProductStatus.Suspended,
        category: 'educacion',
      }),
    ];
    return mock;
  }

  it('busca por Name OR Description ignorando mayúsculas', async () => {
    const mock = seed();

    const result = await mock.listProductsPaged({ search: 'PERIFÉRICO', size: 10 });

    expect(result.items.map((p) => p.id)).toEqual(['p2', 'p3']);
  });

  it('ordena por precio ascendente y descendente sin mutar el arreglo origen', async () => {
    const mock = seed();

    const asc = await mock.listProductsPaged({ sort: 'price-asc', size: 10 });
    expect(asc.items.map((p) => p.price)).toEqual([50, 120, 200, 1500]);

    const desc = await mock.listProductsPaged({ sort: 'price-desc', size: 10 });
    expect(desc.items.map((p) => p.price)).toEqual([1500, 200, 120, 50]);

    expect(mock.products.map((p) => p.id)).toEqual(['p1', 'p2', 'p3', 'p4']);
  });

  it('filtra por tipo de producto', async () => {
    const mock = seed();

    const digital = await mock.listProductsPaged({ type: ProductType.Digital, size: 10 });

    expect(digital.items.map((p) => p.id)).toEqual(['p3']);
  });

  it('expone sólo categorías con productos publicados, ordenadas por productCount desc', async () => {
    const mock = seed();

    const categories = await mock.listCategories();

    expect(categories).toEqual([
      { id: 'perifericos', name: 'perifericos', productCount: 2 },
      { id: 'computacion', name: 'computacion', productCount: 1 },
    ]);
  });

  it('limita el hero a `count` productos publicados y usa 6 por defecto', async () => {
    const mock = seed();

    const hero = await mock.listHeroProducts(2);
    expect(hero.map((p) => p.id)).toEqual(['p1', 'p2']);

    expect((await mock.listHeroProducts()).length).toBe(3);
  });
});
