import type { ReturnStatus } from '../enums';

/**
 * Solicitud de devolución (`ReturnRequestDto`).
 *
 * Origen: `backend/Zentric.Application/Returns/Queries/GetReturnByIdQuery.cs`.
 * Los literales de `status` son `Requested | Approved | Rejected | Refunded`.
 */
export interface ReturnRequest {
  id: string;
  customerOrderId: string;
  variantId: string;
  warehouseId: string;
  quantity: number;
  status: ReturnStatus;
  /** Dictamen de inspección del Operador logístico (AD). */
  isGoodCondition: boolean;
  /** Aprobación del Vendedor. */
  vendorApproved: boolean;
  /** ISO-8601 (DateTime). */
  createdAt: string;
}

/**
 * Alta de devolución (`RequestReturnCommand`).
 *
 * `BuyerId` lo inyecta el servidor y verifica que el pedido sea del
 * llamante, así que el cuerpo NO lo lleva. Prohibido para productos digitales
 * : `admiteDevolucion` lo decide en presentación.
 */
export interface RequestReturnInput {
  customerOrderId: string;
  variantId: string;
  warehouseId: string;
  quantity: number;
}

/** Dictamen de inspección (`InspectReturnRequestDto`). */
export interface InspectReturnInput {
  isGoodCondition: boolean;
}
