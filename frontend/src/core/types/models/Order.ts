import type { OrderStatus } from '../enums';

/**
 * Línea de un pedido (`OrderItemDto`).
 * `unitPrice`/`totalPrice` son decimales con dos decimales (sección 3.5).
 */
export interface OrderItem {
  id: string;
  /** Identificador de la VARIANTE, no del producto (riesgo F). */
  variantId: string;
  productId?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  productName?: string;
  sku?: string;
  imageUrl?: string;
  vendorName?: string;
}

/**
 * Pedido de compra (`OrderDto`).
 *
 * Origen: `backend/Zentric.Application/Orders/Queries/GetOrderByIdQuery.cs`.
 * `status` viaja como nombre de enum (AD).
 */
export interface Order {
  id: string;
  buyerId: string;
  status: OrderStatus;
  totalAmount: number;
  currency: string;
  items: OrderItem[];
  /** ISO-8601 (DateTime). */
  createdAt: string;
  /** ISO-8601 (DateTime) que marca el fin de la ventana atómica de 15 minutos . */
  expiresAt?: string;
  /** Indica si el pedido aún cuenta con existencias disponibles para completar el pago. */
  canStillPay?: boolean;
}

/**
 * Fila de listado de pedidos (`OrderListItemDto`).
 * `buyerId` es `Guid?`: se oculta a quien no tiene por qué verlo .
 */
export interface OrderListItem {
  id: string;
  status: OrderStatus;
  currency: string;
  totalAmount: number;
  items: OrderItem[];
  itemCount: number;
  buyerId: string | null;
  /** ISO-8601 (DateTime). */
  createdAt: string;
  /** ISO-8601 (DateTime) de expiración de reserva atómica. */
  expiresAt?: string;
  /** Indica si el pedido aún cuenta con existencias disponibles para completar el pago. */
  canStillPay?: boolean;
}

/**
 * Vista de un pedido para el Vendedor (`SellerOrderViewDto`).
 * No expone `buyerId` y añade `vendorSubtotal` (split de facturación).
 */
export interface SellerOrderView {
  id: string;
  status: OrderStatus;
  currency: string;
  items: OrderItem[];
  vendorSubtotal: number;
  /** ISO-8601 (DateTime). */
  createdAt: string;
}

/**
 * Añadir una línea al carrito (`AddOrderItemCommand`).
 *
 * `BuyerId` lo inyecta el servidor desde el token y verifica la propiedad
 * del pedido, así que el cuerpo NO lo lleva.
 */
export interface AddCartItemInput {
  orderId: string;
  variantId: string;
  quantity: number;
}

/**
 * Eliminar una línea del carrito.
 * Coincide con el endpoint DELETE /api/orders/{orderId}/items/{variantId}.
 */
export interface RemoveCartItemInput {
  orderId: string;
  variantId: string;
}

/**
 * Actualizar cantidad de una línea del carrito.
 * Coincide con el endpoint PATCH /api/orders/{orderId}/items/{variantId}/quantity.
 */
export interface UpdateCartItemQuantityInput {
  orderId: string;
  variantId: string;
  quantity: number;
}
