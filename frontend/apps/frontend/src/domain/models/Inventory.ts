/**
 * Existencias de una variante en una bodega (`InventoryDto`).
 *
 * Origen: `backend/Zentric.Application/Inventories/Queries/GetInventoryByVariantQuery.cs`.
 * El servidor separa disponible, reservado, usado y dañado; el stock real nunca
 * se recalcula en el cliente (Frontend-Domain-Services §5.3).
 */
export interface Inventory {
  id: string;
  variantId: string;
  warehouseId: string;
  availableQuantity: number;
  reservedQuantity: number;
  usedQuantity: number;
  damagedQuantity: number;
}

/**
 * Alta de existencias (`AddStockCommand`).
 *
 * Q-21b: `CallerId` y `CallerRole` los inyecta el servidor desde el token
 * (`command with { CallerId, CallerRole }`), así que el cuerpo NO los lleva.
 */
export interface AddStockInput {
  variantId: string;
  warehouseId: string;
  /** INV-01: el cliente valida cantidad > 0 como feedback; la autoridad es el servidor. */
  quantity: number;
}

/**
 * Entrada para ajuste de inventario por conteo físico.
 */
export interface AdjustInventoryInput {
  countedQuantity: number;
  reason: string;
}

/**
 * Resultado de un conteo físico (`AdjustInventoryResult`, ADR-0021).
 * Devuelve el antes y el después para que la UI pueda mostrar la diferencia.
 */
export interface AdjustInventoryResult {
  adjustmentId: string;
  inventoryId: string;
  previousAvailableQuantity: number;
  newAvailableQuantity: number;
  adjustedQuantity: number;
  reason: string;
  /** ISO-8601 (DateTime). */
  countedAt: string;
}

