import { ProductCard, type ProductCardProps } from './ProductCard';

export type ProductRailCardProps = Omit<ProductCardProps, 'variant'>;

/**
 * Tarjeta de riel / carrusel horizontal.
 * Reutiliza el componente unificado ProductCard con variant="carousel".
 */
export function ProductRailCard(props: ProductRailCardProps) {
  return <ProductCard {...props} variant="carousel" />;
}
