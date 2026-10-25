/**
 * Estados de la orden de fulfillment logístico (ADDENDUM Dominio 8).
 *
 * Origen: `backend/Zentric.Domain/Logistics/Enums/FulfillmentStatus.cs`.
 * El backend les asigna valores enteros explícitos (1..5), pero ADR-0012 establece
 * que en el JSON viaja el NOMBRE; el cliente jamás usa el índice.
 */
export const FulfillmentStatus = {
  PendingPack: 'PendingPack',
  Packed: 'Packed',
  Dispatched: 'Dispatched',
  Delivered: 'Delivered',
  Cancelled: 'Cancelled',
} as const;

export type FulfillmentStatus = (typeof FulfillmentStatus)[keyof typeof FulfillmentStatus];
