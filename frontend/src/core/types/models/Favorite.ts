/**
 * Proyección de un producto favorito enriquecido con metadatos comerciales.
 *
 * Origen: `BuyerFavoriteItemDto` en `backend/Zentric.Api/Contracts/
 * BuyerFavoritesContracts.cs` (GET/POST /api/buyer/favorites).
 * `price` y `averageRating` son decimales; `createdAt` es ISO-8601.
 */
export interface FavoriteItem {
  id: string;
  productId: string;
  productName: string;
  price: number;
  currency: string;
  imageUrl?: string | null;
  availableQuantity: number;
  averageRating: number;
  reviewsCount: number;
  createdAt: string;
}
