import { ProductType, type Product } from '../../../domain';

/**
 * Estado comercial con el que la vitrina del comprador comunica disponibilidad.
 *
 * Los productos digitales no dependen de inventario fisico (la entrega es
 * inmediata), asi que nunca se marcan como agotados. El umbral de escasez se
 * define una sola vez para que la grilla y el carrusel no cuenten distinto.
 */
export type ProductAvailability = 'digital' | 'in-stock' | 'low-stock' | 'out-of-stock';

const LOW_STOCK_THRESHOLD = 5;

export function resolveProductAvailability(product: Product): ProductAvailability {
  if (product.type === ProductType.Digital) {
    return 'digital';
  }

  const availableStock = product.variants?.[0]?.availableStock;

  if (availableStock === undefined) {
    return 'in-stock';
  }
  if (availableStock === 0) {
    return 'out-of-stock';
  }
  if (availableStock <= LOW_STOCK_THRESHOLD) {
    return 'low-stock';
  }

  return 'in-stock';
}

/** Etiqueta del tipo de producto tal como la lee el comprador. */
export function formatProductType(type: ProductType): string {
  return type === ProductType.Physical ? 'Físico' : 'Digital';
}

export function formatVariantCount(count: number): string {
  return count === 1 ? '1 variante' : `${count} variantes`;
}

/**
 * SKU de la primera variante (el identificador util para stock y carrito es el
 * de la VARIANTE, no el del producto — riesgo FR-03). Se muestra en Geist Mono
 * con `tabular-nums` porque es un codigo legible literal, no una cifra.
 */
export function resolvePrimarySku(product: Product): string | null {
  return product.variants?.[0]?.sku ?? null;
}
