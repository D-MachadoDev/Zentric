/**
 * Formatos de entrada/salida de la capa de aplicación.
 *
 * Son formas que el contrato del backend no devuelve tal cual pero la interfaz
 * necesita mostrar; se construyen en los servicios, nunca se inventan reglas.
 */

/**
 * Identificadores devueltos por el alta de un producto.
 *
 * El identificador útil para inventario y carrito es el de la VARIANTE, no el
 * del producto (riesgo FR-03). Ambos campos son anulables porque un producto
 * `Digital` puede nacer sin variantes (ADR-0003).
 */
export interface ProductoRegistrado {
  productId: string;
  variantId: string | null;
  sku: string | null;
}
