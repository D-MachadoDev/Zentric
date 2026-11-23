import type { ZentricApiPort } from '../../core';
import { getWishlistItems, clearWishlist } from './wishlistStorage';

/**
 * Resultado de la sincronización de favoritos de invitado hacia el backend.
 * Refleja cuántos favoritos se migraron con éxito y cuántos fallaron
 * (errores por ítem que se ignoran sin abortar la operación).
 */
export interface SyncGuestFavoritesResult {
  syncedCount: number;
  failedCount: number;
}

/**
 * Sincroniza los favoritos de invitado con el backend tras el login exitoso.
 * Cada favorito local se agrega mediante `api.addFavorite(productId)` (idempotente
 * en el backend). El método del puerto es OPCIONAL: se guarda su presencia con
 * `api.addFavorite?`. Los errores por ítem se ignoran para que una falla aislada
 * no aborte la migración del resto.
 *
 * A diferencia del carrito (que conserva el almacenamiento ante fallos para
 * reintentar), aquí el almacenamiento local se limpia una vez terminada la
 * iteración: los favoritos migrados ya viven en PostgreSQL y el corazón/pestaña
 * de un usuario autenticado se alimenta exclusivamente del backend.
 */
export async function syncGuestFavoritesToBackend(
  api: ZentricApiPort,
): Promise<SyncGuestFavoritesResult> {
  const guestItems = getWishlistItems();

  if (guestItems.length === 0) {
    return { syncedCount: 0, failedCount: 0 };
  }

  let syncedCount = 0;
  let failedCount = 0;

  for (const item of guestItems) {
    if (typeof api.addFavorite !== 'function') {
      failedCount += 1;
      continue;
    }
    try {
      await api.addFavorite(item.productId);
      syncedCount += 1;
    } catch {
      failedCount += 1;
    }
  }

  clearWishlist();

  return { syncedCount, failedCount };
}
