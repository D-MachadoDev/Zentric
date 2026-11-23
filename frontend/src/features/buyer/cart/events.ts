import { GUEST_CART_KEY } from './types';

type CartListener = () => void;

const listeners = new Set<CartListener>();

export function notifyListeners(): void {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      // Proteger el loop de notificación ante errores de listeners externos
    }
  }
}

/**
 * Suscribe un callback a cambios de estado del carrito de invitado.
 * Retorna una función de desuscripción.
 */
export function subscribeGuestCart(listener: CartListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Sincronización multiventana reactiva: si otra pestaña muta el carrito, notificar a los listeners locales
if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('storage', (event) => {
    if (event.key === GUEST_CART_KEY || event.key === null) {
      notifyListeners();
    }
  });
}
