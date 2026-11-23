import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ZentricApiPort } from '../../../core';
import {
  getWishlistItems,
  getWishlistCount,
  addFavorite,
  clearWishlist,
} from '../wishlistStorage';
import { syncGuestFavoritesToBackend } from '../favoritesSync';

describe('favoritesSync - Sincronización de favoritos de invitado', () => {
  beforeEach(() => {
    localStorage.clear();
    clearWishlist();
    vi.restoreAllMocks();
  });

  it('retorna contadores en cero sin invocar la API cuando la lista está vacía', async () => {
    const mockApi: ZentricApiPort = {
      addFavorite: vi.fn().mockResolvedValue({}),
    } as unknown as ZentricApiPort;

    const result = await syncGuestFavoritesToBackend(mockApi);

    expect(result).toEqual({ syncedCount: 0, failedCount: 0 });
    expect(mockApi.addFavorite).not.toHaveBeenCalled();
  });

  it('agrega cada favorito al backend y limpia el almacenamiento local al terminar', async () => {
    addFavorite({ id: 'prod-1', name: 'Producto Uno', price: 1000 });
    addFavorite({ id: 'prod-2', name: 'Producto Dos', price: 2000 });

    const mockApi: ZentricApiPort = {
      addFavorite: vi.fn().mockResolvedValue({}),
    } as unknown as ZentricApiPort;

    const result = await syncGuestFavoritesToBackend(mockApi);

    expect(result).toEqual({ syncedCount: 2, failedCount: 0 });
    expect(mockApi.addFavorite).toHaveBeenCalledTimes(2);
    expect(mockApi.addFavorite).toHaveBeenCalledWith('prod-1');
    expect(mockApi.addFavorite).toHaveBeenCalledWith('prod-2');
    expect(getWishlistCount()).toBe(0);
    expect(getWishlistItems()).toEqual([]);
  });

  it('ignora errores por ítem sin abortar la migración y limpia igualmente', async () => {
    addFavorite({ id: 'prod-ok-1', name: 'Producto OK', price: 1000 });
    addFavorite({ id: 'prod-fail', name: 'Producto Falla', price: 2000 });
    addFavorite({ id: 'prod-ok-2', name: 'Producto OK 2', price: 3000 });

    const mockApi: ZentricApiPort = {
      addFavorite: vi
        .fn()
        .mockImplementation((productId: string) => {
          if (productId === 'prod-fail') {
            return Promise.reject(new Error('Error de red en addFavorite'));
          }
          return Promise.resolve({});
        }),
    } as unknown as ZentricApiPort;

    const result = await syncGuestFavoritesToBackend(mockApi);

    expect(result).toEqual({ syncedCount: 2, failedCount: 1 });
    expect(mockApi.addFavorite).toHaveBeenCalledTimes(3);
    expect(getWishlistCount()).toBe(0);
  });

  it('guarda la ausencia del método opcional addFavorite y no lanza error', async () => {
    addFavorite({ id: 'prod-1', name: 'Producto Uno', price: 1000 });

    const mockApi = {} as ZentricApiPort;

    const result = await syncGuestFavoritesToBackend(mockApi);

    expect(result).toEqual({ syncedCount: 0, failedCount: 1 });
    expect(getWishlistCount()).toBe(0);
  });
});
