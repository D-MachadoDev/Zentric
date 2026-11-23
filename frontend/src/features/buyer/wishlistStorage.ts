/**
 * Módulo de Persistencia y Gestión de Favoritos (Wishlist).
 *
 * Sigue el patrón modular y limpio de `guestCart`, con validación defensiva,
 * persistencia local en `localStorage` (para que los favoritos perduren entre
 * sesiones del navegador) y fallback en memoria para entornos restringidos o pruebas.
 * Notifica reactivamente a los componentes suscritos ante cualquier mutación.
 */

export interface WishlistItem {
  productId: string;
  name: string;
  price: number;
  currency?: string;
  imageUrl?: string;
  category?: string;
  addedAt: string;
}

export const WISHLIST_STORAGE_KEY = 'zentric_buyer_wishlist_v1';

type WishlistListener = () => void;
const listeners = new Set<WishlistListener>();

let memoryFallbackWishlist: WishlistItem[] = [];

function notifyWishlistListeners(): void {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      // Proteger el loop de notificación ante excepciones en callbacks
    }
  }

  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(new CustomEvent('zentric:wishlist-updated'));
    } catch {
      // Ignorar si CustomEvent no está disponible
    }
  }
}

/**
 * Suscribe un callback a las actualizaciones de la lista de favoritos.
 * Retorna la función de desuscripción.
 */
export function subscribeWishlist(listener: WishlistListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Obtiene la lista actual de productos favoritos guardados.
 */
export function getWishlistItems(): WishlistItem[] {
  try {
    if (typeof localStorage === 'undefined') {
      return [...memoryFallbackWishlist];
    }
    const raw = localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (!raw) return [...memoryFallbackWishlist];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const validItems: WishlistItem[] = [];
    for (const item of parsed) {
      if (item && typeof item === 'object' && typeof item.productId === 'string') {
        validItems.push({
          productId: item.productId,
          name: typeof item.name === 'string' ? item.name : 'Producto',
          price: typeof item.price === 'number' ? item.price : 0,
          currency: typeof item.currency === 'string' ? item.currency : 'COP',
          imageUrl: typeof item.imageUrl === 'string' ? item.imageUrl : undefined,
          category: typeof item.category === 'string' ? item.category : undefined,
          addedAt: typeof item.addedAt === 'string' ? item.addedAt : new Date().toISOString(),
        });
      }
    }
    return validItems;
  } catch {
    return [...memoryFallbackWishlist];
  }
}

/**
 * Retorna la cantidad total de productos en la lista de favoritos.
 */
export function getWishlistCount(): number {
  return getWishlistItems().length;
}

/**
 * Verifica si un producto está guardado en favoritos por su identificador.
 */
export function isProductFavorite(productId: string): boolean {
  if (!productId) return false;
  const items = getWishlistItems();
  return items.some((item) => item.productId === productId);
}

/**
 * Persiste los ítems en el almacenamiento seguro y notifica a los suscriptores.
 */
function saveWishlistItems(items: WishlistItem[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items));
    }
    memoryFallbackWishlist = [...items];
  } catch {
    memoryFallbackWishlist = [...items];
  }
  notifyWishlistListeners();
}

/**
 * Guarda un producto en la lista de favoritos si no existía previamente.
 */
export function addFavorite(product: {
  id?: string;
  productId?: string;
  name?: string;
  price?: number;
  currency?: string;
  imageUrl?: string;
  category?: string;
}): boolean {
  const pId = product.productId || product.id;
  if (!pId) return false;

  const currentItems = getWishlistItems();
  if (currentItems.some((item) => item.productId === pId)) {
    return false; // Ya existía
  }

  const newItem: WishlistItem = {
    productId: pId,
    name: product.name || 'Producto',
    price: typeof product.price === 'number' ? product.price : 0,
    currency: product.currency || 'COP',
    imageUrl: product.imageUrl,
    category: product.category,
    addedAt: new Date().toISOString(),
  };

  saveWishlistItems([newItem, ...currentItems]);
  return true;
}

/**
 * Elimina un producto de la lista de favoritos por su ID.
 */
export function removeFavorite(productId: string): boolean {
  if (!productId) return false;
  const currentItems = getWishlistItems();
  const filtered = currentItems.filter((item) => item.productId !== productId);
  if (filtered.length === currentItems.length) {
    return false; // No estaba en favoritos
  }

  saveWishlistItems(filtered);
  return true;
}

/**
 * Alterna el estado de favoritos (lo agrega si no estaba, o lo remueve si existía).
 * Retorna true si ahora está en favoritos, false si fue removido.
 */
export function toggleFavorite(product: {
  id?: string;
  productId?: string;
  name?: string;
  price?: number;
  currency?: string;
  imageUrl?: string;
  category?: string;
}): boolean {
  const pId = product.productId || product.id;
  if (!pId) return false;

  if (isProductFavorite(pId)) {
    removeFavorite(pId);
    return false;
  } else {
    addFavorite(product);
    return true;
  }
}

/**
 * Vacía por completo la lista de favoritos.
 */
export function clearWishlist(): void {
  saveWishlistItems([]);
}
