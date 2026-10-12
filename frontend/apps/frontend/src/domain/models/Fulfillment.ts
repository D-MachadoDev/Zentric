import type { FulfillmentStatus } from '../enums';

/** Paquete de envío de un despacho (`ShipmentDto`). */
export interface Shipment {
  id: string;
  warehouseId: string;
  trackingNumber: string;
}

/**
 * Orden de fulfillment logístico (`FulfillmentOrderDto`).
 *
 * Origen: `backend/Zentric.Application/Logistics/Queries/GetFulfillmentByIdQuery.cs`.
 * `cancellationReason` es `string?`: sólo se llena al cancelar por quiebre (ADR-0014).
 */
export interface FulfillmentOrder {
  id: string;
  customerOrderId: string;
  vendorId: string;
  status: FulfillmentStatus;
  cancellationReason: string | null;
  shipments: Shipment[];
  /** ISO-8601 (DateTime). */
  createdAt: string;
}

/**
 * Alta de despacho (`CreateFulfillmentOrderCommand`).
 *
 * `vendorId` SÍ va en el cuerpo: el Vendedor crea despachos a su nombre y el
 * Operador puede crearlos para cualquier vendedor. Q-21b: `CallerId` y
 * `CallerRole` los inyecta el servidor, así que no viajan.
 */
export interface CreateFulfillmentInput {
  customerOrderId: string;
  vendorId: string;
}

/**
 * Cancelación por stock fantasma (`CancelFulfillmentOrderDueToNoStockCommand`).
 * Exige confirmación previa en la UI (Frontend-Domain-Services §2.6).
 * `CallerId`/`CallerRole` los inyecta el servidor (Q-21b).
 */
export interface CancelGhostStockInput {
  fulfillmentOrderId: string;
  variantId: string;
  warehouseId: string;
  quantityToCancel: number;
}
