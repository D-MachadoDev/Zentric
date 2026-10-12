/**
 * Estados del ciclo de vida de un pedido de compra.
 *
 * Origen: `backend/Zentric.Domain/Orders/Enums/OrderStatus.cs`.
 * ADR-0012: en el JSON viaja el NOMBRE, nunca el índice numérico.
 */
export const OrderStatus = {
  Cart: 'Cart',
  PendingPayment: 'PendingPayment',
  Paid: 'Paid',
  Dispatched: 'Dispatched',
  Delivered: 'Delivered',
  Cancelled: 'Cancelled',
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];
