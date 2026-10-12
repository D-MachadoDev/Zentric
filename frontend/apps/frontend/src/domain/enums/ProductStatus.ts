/**
 * Estado de publicación de un producto (ZENTRIC.md Dominio 5).
 *
 * Origen: `backend/Zentric.Domain/Products/Enums/ProductStatus.cs`.
 * Un producto nace `Published` (auto-publicación, CAT-01); `Suspend` lo saca del
 * catálogo comercial y `publish` lo reactiva. ADR-0012: en el JSON viaja el NOMBRE.
 */
export const ProductStatus = {
  Published: 'Published',
  Suspended: 'Suspended',
  Discontinued: 'Discontinued',
} as const;

export type ProductStatus = (typeof ProductStatus)[keyof typeof ProductStatus];
