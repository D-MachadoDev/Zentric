import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FavoriteItem, ZentricApiPort } from '../types';
import { queryKeys } from './queryKeys';
import { resolveApi } from './apiContext';

/**
 * Consulta de la lista de favoritos del comprador autenticado.
 *
 * Backend: GET /api/buyer/favorites (requiere token Bearer). La lista es
 * multidispositivo y vive en PostgreSQL; aquí sólo se consulta y se cachea.
 * staleTime corto (30 s) para que el corazón y la pestaña de favoritos
 * reflejen pronto los cambios realizados desde otros dispositivos.
 */
export function useFavoritesQuery(api?: ZentricApiPort, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.favorites.list(),
    queryFn: async ({ signal }): Promise<FavoriteItem[]> => {
      const client = resolveApi(api);
      if (!client.getFavorites) return [];
      return client.getFavorites(signal);
    },
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
  });
}

/**
 * Mutación para agregar un producto a favoritos (POST /api/buyer/favorites).
 *
 * El backend es idempotente (si ya existía devuelve 200 sin duplicar). Al
 * completarse invalida la caché de favoritos para refrescar corazón y pestaña.
 */
export function useAddFavoriteMutation(api?: ZentricApiPort) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productId: string): Promise<FavoriteItem> => {
      const client = resolveApi(api);
      if (!client.addFavorite) {
        throw new Error('addFavorite no disponible en el puerto de API.');
      }
      return client.addFavorite(productId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.favorites.all });
    },
  });
}

/**
 * Mutación para eliminar un producto de favoritos
 * (DELETE /api/buyer/favorites/{productId}).
 */
export function useRemoveFavoriteMutation(api?: ZentricApiPort) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productId: string): Promise<void> => {
      const client = resolveApi(api);
      if (!client.removeFavorite) {
        throw new Error('removeFavorite no disponible en el puerto de API.');
      }
      return client.removeFavorite(productId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.favorites.all });
    },
  });
}

/**
 * Mutación para vaciar la lista de favoritos.
 *
 * El backend no expone un endpoint bulk de borrado, así que remueve cada
 * favorito de forma secuencial y sólo después invalida la caché completa.
 */
export function useClearFavoritesMutation(api?: ZentricApiPort) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productIds: string[]): Promise<void> => {
      const client = resolveApi(api);
      if (!client.removeFavorite) {
        throw new Error('removeFavorite no disponible en el puerto de API.');
      }
      for (const productId of productIds) {
        await client.removeFavorite(productId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.favorites.all });
    },
  });
}
