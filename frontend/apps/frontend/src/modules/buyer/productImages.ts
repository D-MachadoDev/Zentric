import type { Product } from '../../domain';
import { ProductType } from '../../domain';

/**
 * Catálogo curado de fotografía de producto real de alta resolución (Unsplash Commercial).
 * Evita la apariencia genérica de IA o tarjetas sin imagen, proporcionando
 * una experiencia visual idéntica a los principales e-commerce de tecnología.
 */
const CURATED_CATEGORY_IMAGES = {
  keyboard:
    'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=900&q=80',
  mechanical:
    'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=900&q=80',
  laptop:
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80',
  monitor:
    'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=900&q=80',
  screen:
    'https://images.unsplash.com/photo-1547082299-de196ea013d6?auto=format&fit=crop&w=900&q=80',
  audio:
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80',
  headphone:
    'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=900&q=80',
  mouse:
    'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=900&q=80',
  software:
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=80',
  cloud:
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=900&q=80',
  licencia:
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=900&q=80',
  hardware:
    'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=900&q=80',
  storage:
    'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=900&q=80',
  server:
    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=900&q=80',
  defaultPhysical:
    'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=900&q=80',
  defaultDigital:
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=900&q=80',
} as const;

/**
 * Devuelve una URL de imagen real, nítida y profesional para un producto.
 * Si el producto no tiene `imageUrl` o es inválida, infiere fotográficamente
 * la mejor imagen según las palabras clave de su título y tipo de producto.
 */
export function getProductImageUrl(product: {
  name: string;
  type: ProductType;
  imageUrl?: string | null;
}): string {
  if (product.imageUrl && product.imageUrl.trim().startsWith('http')) {
    return product.imageUrl.trim();
  }

  const normalized = product.name.toLowerCase();

  if (normalized.includes('teclado') || normalized.includes('keyboard')) {
    return CURATED_CATEGORY_IMAGES.keyboard;
  }
  if (normalized.includes('mouse') || normalized.includes('raton')) {
    return CURATED_CATEGORY_IMAGES.mouse;
  }
  if (normalized.includes('laptop') || normalized.includes('portatil') || normalized.includes('notebook')) {
    return CURATED_CATEGORY_IMAGES.laptop;
  }
  if (normalized.includes('monitor') || normalized.includes('pantalla')) {
    return CURATED_CATEGORY_IMAGES.monitor;
  }
  if (normalized.includes('audio') || normalized.includes('auricular') || normalized.includes('headphone') || normalized.includes('diadema')) {
    return CURATED_CATEGORY_IMAGES.audio;
  }
  if (normalized.includes('licencia') || normalized.includes('software') || normalized.includes('cloud')) {
    return CURATED_CATEGORY_IMAGES.software;
  }
  if (normalized.includes('disco') || normalized.includes('ssd') || normalized.includes('memoria')) {
    return CURATED_CATEGORY_IMAGES.storage;
  }
  if (normalized.includes('servidor') || normalized.includes('red') || normalized.includes('switch')) {
    return CURATED_CATEGORY_IMAGES.server;
  }

  return product.type === ProductType.Digital
    ? CURATED_CATEGORY_IMAGES.defaultDigital
    : CURATED_CATEGORY_IMAGES.defaultPhysical;
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
