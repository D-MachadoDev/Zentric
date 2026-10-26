/**
 * Tipo de factura generada por un pedido pagado (split de facturación).
 *
 * Origen: `backend/Zentric.Domain/Billing/Enums/InvoiceType.cs`.
 * El backend les asigna valores enteros explícitos (1..3), pero ADestablece
 * que en el JSON viaja el NOMBRE; el cliente jamás usa el índice.
 */
export const InvoiceType = {
  Master: 'Master',
  ZentricDetail: 'ZentricDetail',
  VendorDetail: 'VendorDetail',
} as const;

export type InvoiceType = (typeof InvoiceType)[keyof typeof InvoiceType];
