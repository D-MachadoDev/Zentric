/**
 * Tipo de producto según su naturaleza.
 *
 * Origen: `backend/Zentric.Domain/Products/Enums/ProductType.cs`.
 * ADR-0012: en el JSON viaja el NOMBRE, nunca el índice numérico.
 */
export const ProductType = {
  Physical: 'Physical',
  Digital: 'Digital',
} as const;

export type ProductType = (typeof ProductType)[keyof typeof ProductType];
