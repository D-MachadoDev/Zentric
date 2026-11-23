import type { ZentricApiPort } from '../../../core';
import type { SyncGuestCartResult } from './types';
import {
  getGuestCartItems,
  hasPendingGuestCheckout,
  setPendingGuestCheckout,
  clearGuestCart,
} from './storage';

/**
 * Sincroniza el carrito de invitado con el backend tras el login exitoso.
 * Si existía intención de checkout pendiente (`hasPendingGuestCheckout`), ejecuta
 * la mutación `checkoutOrder` en el backend.
 *
 * Invariante de Resiliencia:
 * - El almacenamiento local solo se limpia tras la confirmación exitosa de todas las mutaciones.
 * - Si alguna llamada a la API falla, no se limpia el almacenamiento para permitir reintentos.
 */
export async function syncGuestCartToBackend(
  api: ZentricApiPort,
  existingCartOrderId?: string | null,
): Promise<SyncGuestCartResult> {
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

  let checkedOut = false;
  if (shouldCheckout && targetOrderId) {
    await api.checkoutOrder(targetOrderId);
    checkedOut = true;
  }

  // Vaciar almacenamiento local solo tras confirmación exitosa de todas las operaciones de API
  clearGuestCart();

  return { orderId: targetOrderId, checkedOut };
}
