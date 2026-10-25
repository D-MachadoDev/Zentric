/**
 * Roles de usuario.
 *
 * Origen: `backend/Zentric.Domain/Users/Enums/UserRole.cs`.
 * ADR-0012: el JSON sólo acepta y devuelve el NOMBRE del enum; enviar un entero
 * responde 400. Por eso las constantes son literales de texto, nunca índices.
 */
export const UserRole = {
  Buyer: 'Buyer',
  Seller: 'Seller',
  Administrator: 'Administrator',
  Supervisor: 'Supervisor',
  LogisticsOperator: 'LogisticsOperator',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];
