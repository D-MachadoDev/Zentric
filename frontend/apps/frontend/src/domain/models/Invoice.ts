import type { InvoiceType } from '../enums';

/**
 * Factura emitida por un pedido pagado (`InvoiceDto`, Q-18 split de facturación).
 *
 * Origen: `backend/Zentric.Application/Billing/Queries/GetInvoicesByOrderQuery.cs`.
 * `vendorId` es `Guid?`: la Factura Maestra y la Detalle Zentric no tienen
 * vendedor concreto; sólo la Detalle Vendor apunta a uno.
 */
export interface Invoice {
  id: string;
  customerOrderId: string;
  vendorId: string | null;
  type: InvoiceType;
  totalAmount: number;
  currency: string;
  /** ISO-8601 (DateTime). */
  issuedAt: string;
}

/** Entrada para anulación de facturas */
export interface AnnulInvoiceInput {
  reason: string;
}

