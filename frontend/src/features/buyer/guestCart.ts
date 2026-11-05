import type { ZentricApiPort } from '../../core';

export interface GuestCartItem {
  variantId: string;
  productId: string;
  productName: string;
  sku: string;
  unitPrice: number;
  currency: string;
  quantity: number;
  imageUrl?: string | null;
  vendorName?: string;
}

const GUEST_CART_KEY = 'zentric_guest_cart_v1';
const PENDING_CHECKOUT_KEY = 'zentric_pending_checkout_v1';

const listeners = new Set<() => void>();

function notifyListeners() {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeGuestCart(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getGuestCartItems(): GuestCartItem[] {
  try {
    const raw = sessionStorage.getItem(GUEST_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as GuestCartItem[]) : [];
  } catch {
    return [];
  }
}

export function getGuestCartCount(): number {
  return getGuestCartItems().reduce((sum, item) => sum + (item.quantity || 0), 0);
}

export function saveGuestCartItems(items: GuestCartItem[]): void {
  try {
    sessionStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
  } catch {
    // ignore storage errors
  }
  notifyListeners();
}

export function addGuestCartItem(item: GuestCartItem): GuestCartItem[] {
  const current = getGuestCartItems();
  const existingIndex = current.findIndex((i) => i.variantId === item.variantId);
  if (existingIndex >= 0) {
    const existing = current[existingIndex]!;
    current[existingIndex] = {
      ...existing,
      quantity: existing.quantity + item.quantity,
    };
  } else {
    current.push(item);
  }
  saveGuestCartItems(current);
  return current;
}

export function updateGuestCartItemQuantity(variantId: string, quantity: number): GuestCartItem[] {
  const current = getGuestCartItems();
  const next = current
    .map((item) => (item.variantId === variantId ? { ...item, quantity: Math.max(1, quantity) } : item));
  saveGuestCartItems(next);
  return next;
}

export function removeGuestCartItem(variantId: string): GuestCartItem[] {
  const current = getGuestCartItems().filter((item) => item.variantId !== variantId);
  saveGuestCartItems(current);
  return current;
}

export function clearGuestCart(): void {
  try {
    sessionStorage.removeItem(GUEST_CART_KEY);
    sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
  } catch {
    // ignore
  }
  notifyListeners();
}

export function setPendingGuestCheckout(pending: boolean): void {
  try {
    if (pending) {
      sessionStorage.setItem(PENDING_CHECKOUT_KEY, 'true');
    } else {
      sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
    }
  } catch {
    // ignore
  }
}

export function hasPendingGuestCheckout(): boolean {
  try {
    return sessionStorage.getItem(PENDING_CHECKOUT_KEY) === 'true';
  } catch {
    return false;
  }
}

export function consumePendingGuestCheckout(): boolean {
  const pending = hasPendingGuestCheckout();
  setPendingGuestCheckout(false);
  return pending;
}

/**
 * Sincroniza el carrito de invitado con el servidor tras iniciar sesión como Comprador.
 * Si `autoCheckout` está activo, ejecuta `checkoutOrder` y devuelve el `orderId` listo para pagar.
 */
export async function syncGuestCartToBackend(
  api: ZentricApiPort,
  existingCartOrderId?: string | null,
): Promise<{ orderId: string | null; checkedOut: boolean }> {
  const guestItems = getGuestCartItems();
  const shouldCheckout = hasPendingGuestCheckout();

  if (guestItems.length === 0) {
    setPendingGuestCheckout(false);
    return { orderId: existingCartOrderId ?? null, checkedOut: false };
  }

  let targetOrderId = existingCartOrderId ?? null;
  if (!targetOrderId) {
    targetOrderId = await api.createCart();
  }

  for (const item of guestItems) {
    await api.addCartItem({
      orderId: targetOrderId,
      variantId: item.variantId,
      quantity: item.quantity,
    });
  }

  clearGuestCart();

  if (shouldCheckout && targetOrderId) {
    await api.checkoutOrder(targetOrderId);
    return { orderId: targetOrderId, checkedOut: true };
  }

  return { orderId: targetOrderId, checkedOut: false };
}
