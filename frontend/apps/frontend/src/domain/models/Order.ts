import type { OrderStatus } from '../enums';

/**
 * Línea de un pedido (`OrderItemDto`).
 * `unitPrice`/`totalPrice` son decimales con dos decimales (§3.5).
 */
export interface OrderItem {
  id: string;
  /** Identificador de la VARIANTE, no del producto (riesgo FR-03). */
  variantId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

/**
 * Pedido de compra (`OrderDto`).
 *
 * Origen: `backend/Zentric.Application/Orders/Queries/GetOrderByIdQuery.cs`.
 * `status` viaja como nombre de enum (ADR-0012).
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
}

/**
 * Fila de listado de pedidos (`OrderListItemDto`).
 * `buyerId` es `Guid?`: se oculta a quien no tiene por qué verlo (Q-21b).
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
}

/**
 * Vista de un pedido para el Vendedor (`SellerOrderViewDto`).
 * No expone `buyerId` y añade `vendorSubtotal` (Q-18: split de facturación).
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
 * Q-21b: `BuyerId` lo inyecta el servidor desde el token y verifica la propiedad
 * del pedido, así que el cuerpo NO lo lleva.
 */
export interface AddCartItemInput {
  orderId: string;
  variantId: string;
  quantity: number;
}
