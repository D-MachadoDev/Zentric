import type { Product } from '../../core';
import { ProductType } from '../../core';

/**
 * Fotografía curada de demostración por categoría del marketplace.
 *
 * Es un `fallback` de catálogo sembrado: cuando el vendedor todavía no cargó
 * fotos propias, la ficha muestra estas imágenes para no quedar en blanco.
 * Un producto con `imageUrls` o `imageUrl` del vendedor NUNCA usa este set.
 */
const CURATED_CATEGORY_PHOTOS = {
  cafetera: [
    'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=900&q=80',
  ],
  freidora: [
    'https://images.unsplash.com/photo-1585515320310-259814833e62?auto=format&fit=crop&w=900&q=80',
  ],
  aspiradora: [
    'https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&w=900&q=80',
  ],
  tenis: [
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80',
  ],
  morral: [
    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80',
  ],
  cafe: [
    'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=900&q=80',
  ],
  aceite: [
    'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=900&q=80',
  ],
  mancuerna: [
    'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=900&q=80',
  ],
  bicicleta: [
    'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80',
  ],
  tv: [
    'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1547082299-de196ea013d6?auto=format&fit=crop&w=900&q=80',
  ],
  keyboard: [
    'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=900&q=80',
  ],
  laptop: [
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80',
  ],
  monitor: [
    'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1547082299-de196ea013d6?auto=format&fit=crop&w=900&q=80',
  ],
  audio: [
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=900&q=80',
  ],
  mouse: [
    'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=900&q=80',
  ],
  software: [
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=900&q=80',
  ],
  storage: [
    'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=900&q=80',
  ],
  server: [
    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=900&q=80',
  ],
  defaultPhysical: [
    'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=900&q=80',
  ],
  defaultDigital: [
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=900&q=80',
  ],
} as const;

/** Máximo de fotos que la ficha muestra en el collage. */
export const MAX_PRODUCT_PHOTOS = 6;

function curatedPhotos(name: string, type: ProductType): readonly string[] {
  const normalized = name.toLowerCase();

  if (normalized.includes('cafetera') || normalized.includes('espresso') || normalized.includes('barista')) {
    return CURATED_CATEGORY_PHOTOS.cafetera;
  }
  if (normalized.includes('freidora') || normalized.includes('airfryer') || normalized.includes('cocina')) {
    return CURATED_CATEGORY_PHOTOS.freidora;
  }
  if (normalized.includes('aspiradora') || normalized.includes('robot')) {
    return CURATED_CATEGORY_PHOTOS.aspiradora;
  }
  if (normalized.includes('tenis') || normalized.includes('calzado') || normalized.includes('zapatilla')) {
    return CURATED_CATEGORY_PHOTOS.tenis;
  }
  if (normalized.includes('morral') || normalized.includes('mochila') || normalized.includes('bolso')) {
    return CURATED_CATEGORY_PHOTOS.morral;
  }
  if (normalized.includes('café') || normalized.includes('cafe') || normalized.includes('origen')) {
    return CURATED_CATEGORY_PHOTOS.cafe;
  }
  if (normalized.includes('aceite') || normalized.includes('oliva') || normalized.includes('gourmet')) {
    return CURATED_CATEGORY_PHOTOS.aceite;
  }
  if (normalized.includes('mancuerna') || normalized.includes('pesa') || normalized.includes('gym')) {
    return CURATED_CATEGORY_PHOTOS.mancuerna;
  }
  if (normalized.includes('bicicleta') || normalized.includes('spinning') || normalized.includes('fitness')) {
    return CURATED_CATEGORY_PHOTOS.bicicleta;
  }
  if (normalized.includes('smart tv') || normalized.includes('oled') || normalized.includes('televisor')) {
    return CURATED_CATEGORY_PHOTOS.tv;
  }
  if (normalized.includes('teclado') || normalized.includes('keyboard')) {
    return CURATED_CATEGORY_PHOTOS.keyboard;
  }
  if (normalized.includes('mouse') || normalized.includes('raton')) {
    return CURATED_CATEGORY_PHOTOS.mouse;
  }
  if (
    normalized.includes('laptop') ||
    normalized.includes('portatil') ||
    normalized.includes('notebook') ||
    normalized.includes('macbook')
  ) {
    return CURATED_CATEGORY_PHOTOS.laptop;
  }
  if (normalized.includes('monitor') || normalized.includes('pantalla')) {
    return CURATED_CATEGORY_PHOTOS.monitor;
  }
  if (
    normalized.includes('audio') ||
    normalized.includes('auricular') ||
    normalized.includes('headphone') ||
    normalized.includes('diadema') ||
    normalized.includes('audífono') ||
    normalized.includes('audifono')
  ) {
    return CURATED_CATEGORY_PHOTOS.audio;
  }
  if (
    normalized.includes('licencia') ||
    normalized.includes('software') ||
    normalized.includes('cloud') ||
    normalized.includes('membresía') ||
    normalized.includes('membresia')
  ) {
    return CURATED_CATEGORY_PHOTOS.software;
  }
  if (normalized.includes('disco') || normalized.includes('ssd') || normalized.includes('memoria')) {
    return CURATED_CATEGORY_PHOTOS.storage;
  }
  if (normalized.includes('servidor') || normalized.includes('red') || normalized.includes('switch')) {
    return CURATED_CATEGORY_PHOTOS.server;
  }

  return type === ProductType.Digital
    ? CURATED_CATEGORY_PHOTOS.defaultDigital
    : CURATED_CATEGORY_PHOTOS.defaultPhysical;
}

function isHttpUrl(value: string | null | undefined): value is string {
  return Boolean(value && value.trim().startsWith('http'));
}

/**
 * Fotos de la ficha del producto, en orden de presentación.
 *
 * Prioridad: galería del vendedor → foto única del vendedor → set curado de
 * demostración. Nunca inventa miniaturas repetidas: si sólo hay una foto, la
 * galería muestra una sola.
 */
export function getProductImageUrls(product: {
  name: string;
  type: ProductType;
  imageUrl?: string | null;
  imageUrls?: string[] | null;
}): string[] {
  const fromSeller = (product.imageUrls ?? [])
    .filter(isHttpUrl)
    .map((url) => url.trim())
    .filter((url, index, all) => all.indexOf(url) === index)
    .slice(0, MAX_PRODUCT_PHOTOS);

  if (fromSeller.length > 0) {
    return fromSeller;
  }

  if (isHttpUrl(product.imageUrl)) {
    return [product.imageUrl.trim()];
  }

  return [...curatedPhotos(product.name, product.type)];
}

/**
 * Primera foto del producto (carrito, pedidos y miniaturas de listado).
 */
export function getProductImageUrl(product: {
  name: string;
  type: ProductType;
  imageUrl?: string | null;
  imageUrls?: string[] | null;
}): string {
  return getProductImageUrls(product)[0] ?? '';
}

/**
 * Clave de almacenamiento local para guardar productos vistos recientemente.
 */
const RECENTLY_VIEWED_KEY = 'zentric_recently_viewed_products';

export function saveRecentlyViewedProduct(product: Product): void {
  try {
    const raw = sessionStorage.getItem(RECENTLY_VIEWED_KEY);
    const existing: Product[] = raw ? JSON.parse(raw) : [];
    const filtered = existing.filter((p) => p.id !== product.id);
    const updated = [product, ...filtered].slice(0, 8);
    sessionStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated));
  } catch {
    // Si el entorno bloquea sessionStorage, continuar sin error
  }
}

export function getRecentlyViewedProducts(): Product[] {
  try {
    const raw = sessionStorage.getItem(RECENTLY_VIEWED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
