import { GUEST_CART_KEY, PENDING_CHECKOUT_KEY, type GuestCartItem } from './types';
import { GuestCartItemSchema } from './schemas';
import { notifyListeners } from './events';

function readRawStorage(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const val = window.localStorage.getItem(key);
      if (val !== null) return val;
    }
  } catch {
    // fallback a sessionStorage si localStorage está deshabilitado o restringido
  }
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage.getItem(key);
    }
  } catch {
    // ignore
  }
  return null;
}

function writeRawStorage(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // fallback seguro ante fallos de cuota o modo incógnito restringido
  }
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(key, value);
    }
  } catch {
    // ignore
  }
}

function removeRawStorage(key: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
}

/**
 * Recupera los ítems del carrito de invitado desde localStorage (con fallback a sessionStorage),
 * filtrando con Zod cualquier elemento con formato inválido o datos corruptos.
 */
export function getGuestCartItems(): GuestCartItem[] {
  try {
    const raw = readRawStorage(GUEST_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const validItems: GuestCartItem[] = [];
    for (const item of parsed) {
      const result = GuestCartItemSchema.safeParse(item);
      if (result.success) {
        validItems.push(result.data);
      }
    }
    return validItems;
  } catch {
    return [];
  }
}

/**
 * Calcula la suma total de cantidades de ítems en el carrito de invitado.
 */
export function getGuestCartCount(): number {
  return getGuestCartItems().reduce((sum, item) => sum + (item.quantity || 0), 0);
}

/**
 * Persiste los ítems validados en localStorage (y sessionStorage de respaldo) y notifica a los suscriptores.
 */
export function saveGuestCartItems(items: GuestCartItem[]): void {
  try {
    const validItems: GuestCartItem[] = [];
    for (const item of items) {
      const result = GuestCartItemSchema.safeParse(item);
      if (result.success) {
        validItems.push(result.data);
      }
    }
    writeRawStorage(GUEST_CART_KEY, JSON.stringify(validItems));
  } catch {
    // Ignorar excepciones en entornos con almacenamiento restringido
  }
  notifyListeners();
}

/**
 * Añade un ítem al carrito de invitado. Si ya existe la variante, incrementa
 * su cantidad respetando el límite máximo de 999.
 */
export function addGuestCartItem(item: GuestCartItem): GuestCartItem[] {
  const normalizedItem = {
    ...item,
    quantity: Math.min(999, Math.max(1, Math.floor(Number(item.quantity) || 1))),
  };
  const parseResult = GuestCartItemSchema.safeParse(normalizedItem);
  if (!parseResult.success) {
    return getGuestCartItems();
  }

  const validItem = parseResult.data;
  const current = getGuestCartItems();
  const existingIndex = current.findIndex((i) => i.variantId === validItem.variantId);

  if (existingIndex >= 0) {
    const existing = current[existingIndex]!;
    const nextQty = Math.min(999, existing.quantity + validItem.quantity);
    current[existingIndex] = {
      ...existing,
      quantity: nextQty,
    };
  } else {
    current.push(validItem);
  }

  saveGuestCartItems(current);
  return current;
}

/**
 * Actualiza la cantidad de una variante específica, ajustando el valor
 * entre 1 y 999.
 */
export function updateGuestCartItemQuantity(variantId: string, quantity: number): GuestCartItem[] {
  const clamped = Math.min(999, Math.max(1, Math.floor(quantity)));
  const current = getGuestCartItems();
  const next = current.map((item) =>
    item.variantId === variantId ? { ...item, quantity: clamped } : item,
  );
  saveGuestCartItems(next);
  return next;
}

/**
 * Remueve una variante del carrito de invitado.
 */
export function removeGuestCartItem(variantId: string): GuestCartItem[] {
  const current = getGuestCartItems().filter((item) => item.variantId !== variantId);
  saveGuestCartItems(current);
  return current;
}

/**
 * Vacía el carrito de invitado y limpia el flag de checkout pendiente.
 */
export function clearGuestCart(): void {
  try {
    removeRawStorage(GUEST_CART_KEY);
    removeRawStorage(PENDING_CHECKOUT_KEY);
  } catch {
    // ignore
  }
  notifyListeners();
}

/**
 * Establece el estado de checkout pendiente en localStorage y sessionStorage.
 */
export function setPendingGuestCheckout(pending: boolean): void {
  try {
    if (pending) {
      writeRawStorage(PENDING_CHECKOUT_KEY, 'true');
    } else {
      removeRawStorage(PENDING_CHECKOUT_KEY);
    }
  } catch {
    // ignore
  }
}

/**
 * Consulta si existe un checkout pendiente.
 */
export function hasPendingGuestCheckout(): boolean {
  try {
    return readRawStorage(PENDING_CHECKOUT_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Consume y limpia atómicamente el flag de checkout pendiente.
 */
export function consumePendingGuestCheckout(): boolean {
  const pending = hasPendingGuestCheckout();
  setPendingGuestCheckout(false);
  return pending;
}
