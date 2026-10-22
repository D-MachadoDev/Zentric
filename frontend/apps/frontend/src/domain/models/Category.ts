/**
 * Categoría comercial del catálogo (`CategoryDto`).
 *
 * Origen: `GET /api/catalog/categories`
 * (`backend/Zentric.Infrastructure/Persistence/Repositories/ProductRepository.cs:130-146`).
 * Invariante de negocio (S1): una categoría existe solo si tiene al menos un
 * producto publicado; por eso la UI nunca debe renderizar (`productCount === 0`).
 * El backend ya devuelve el arreglo ordenado por `productCount` descendente.
 */
export interface Category {
  id: string;
  name: string;
  productCount: number;
}
