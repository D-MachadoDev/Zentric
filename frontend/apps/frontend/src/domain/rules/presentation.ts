import { OrderStatus, ProductType } from '../enums';

/**
 * Reglas de presentación derivadas de la Ley.
 *
 * Son derivaciones PURAS del ciclo de vida que el backend ya impone: deciden qué
 * muestra la interfaz, no crean reglas de negocio nuevas. La autoridad sigue
 * siendo el servidor; si la Ley cambia, cambian estas funciones.
 */

/**
 * ¿Un pedido admite edición?
 *
 * Ciclo de vida del pedido (backendSDD Domain/07-lifecycle.md): sólo `Cart` y
 * `PendingPayment` transicionan; `Paid`, `Dispatched` y `Delivered` no admiten
 * cancelación ni cambio. Un pedido Pagado o posterior, por tanto, es de sólo lectura.
 */
export function esPedidoModificable(estado: OrderStatus): boolean {
  return estado === OrderStatus.Cart || estado === OrderStatus.PendingPayment;
}

/**
 * ¿Un producto admite devolución?
 *
 * ADDENDUM Dominio 10: los productos digitales no se pueden devolver.
 */
export function admiteDevolucion(tipo: ProductType): boolean {
  return tipo === ProductType.Physical;
}
