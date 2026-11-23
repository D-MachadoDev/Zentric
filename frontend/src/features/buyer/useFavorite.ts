import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getDefaultSession,
  useFavoritesQuery,
  useAddFavoriteMutation,
  useRemoveFavoriteMutation,
} from '../../core';
import type { Product } from '../../core';
import { isProductFavorite, toggleFavorite, subscribeWishlist } from './wishlistStorage';

export interface FavoriteToggle {
  isFavorite: boolean;
  isPending: boolean;
  toggle: () => Promise<void>;
}

/**
 * Fuente única de estado de favorito para un producto.
 *
 * Con sesión activa lee/escribe la lista multidispositivo del backend
 * (GET/POST/DELETE /api/buyer/favorites) a través de TanStack Query; como
 * invitado usa `wishlistStorage` (localStorage) y se suscribe a sus cambios.
 * El almacenamiento local queda reservado exclusivamente al visitante sin sesión.
 */
export function useFavorite(product?: Product | null): FavoriteToggle {
  const productId = product?.id;
  const hasActiveSession = Boolean(getDefaultSession()?.getAccessToken());

  const favoritesQuery = useFavoritesQuery(undefined, {
    enabled: hasActiveSession && Boolean(productId),
  });
  const addMutation = useAddFavoriteMutation();
  const removeMutation = useRemoveFavoriteMutation();

  const backendIds = useMemo(
    () => new Set((favoritesQuery.data ?? []).map((item) => item.productId)),
    [favoritesQuery.data],
  );

  const [guestFavorite, setGuestFavorite] = useState<boolean>(() =>
    productId ? isProductFavorite(productId) : false,
  );

  useEffect(() => {
    if (hasActiveSession || !productId) return;
    setGuestFavorite(isProductFavorite(productId));
    return subscribeWishlist(() => setGuestFavorite(isProductFavorite(productId)));
  }, [hasActiveSession, productId]);

  const isFavorite = hasActiveSession ? backendIds.has(productId ?? '') : guestFavorite;

  const toggle = useCallback(async () => {
    if (!productId) return;

    if (hasActiveSession) {
      if (backendIds.has(productId)) {
        await removeMutation.mutateAsync(productId);
      } else {
        await addMutation.mutateAsync(productId);
      }
      return;
    }

    const next = toggleFavorite({
      id: productId,
      productId,
      name: product?.name,
      price: product?.price,
      currency: product?.currency,
      imageUrl: product?.imageUrl ?? undefined,
      category: product?.category,
    });
    setGuestFavorite(next);
  }, [hasActiveSession, productId, backendIds, addMutation, removeMutation, product]);

  return {
    isFavorite,
    isPending: addMutation.isPending || removeMutation.isPending,
    toggle,
  };
}
