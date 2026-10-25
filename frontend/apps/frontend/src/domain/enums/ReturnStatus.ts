/**
 * Estados de una solicitud de devolución.
 *
 * Origen: `backend/Zentric.Domain/Returns/Enums/ReturnStatus.cs`. Los literales
 * que viajan por JSON (ADR-0012) son `Requested | Approved | Rejected |
 * Refunded`; «Solicitada» es el nombre en español de la Ley para el mismo estado,
 * no un valor del enum.
 */
export const ReturnStatus = {
  Requested: 'Requested',
  Approved: 'Approved',
  Rejected: 'Rejected',
  Refunded: 'Refunded',
} as const;

export type ReturnStatus = (typeof ReturnStatus)[keyof typeof ReturnStatus];
