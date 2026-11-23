import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight, Heart, ShoppingBag, Star } from 'lucide-react';
import { MoneyAmount } from '@zentric/ui';
import type { Product } from '../../../core';
import { getProductImageUrl, getProductImageUrls } from '../productImages';
import { useFavorite } from '../useFavorite';
import {
  formatProductType,
  resolveProductAvailability,
  type ProductAvailability,
} from './productPresentation';

const AVAILABILITY: Record<ProductAvailability, { label: string; dot: string }> = {
  'in-stock': { label: 'Disponible', dot: 'bg-emerald-500' },
  'low-stock': { label: 'Stock limitado', dot: 'bg-amber-500' },
  'out-of-stock': { label: 'Agotado', dot: 'bg-rose-500' },
  digital: { label: 'Entrega digital', dot: 'bg-emerald-500' },
};

export interface ProductCardProps {
  product: Product;
  /**
   * Disposición visual unificada:
   * - 'grid': Vista de cuadrícula comercial del catálogo (2 cols móvil, 4 cols desktop).
   * - 'carousel': Vista horizontal para carruseles/rieles (Más Vendidos, Vistos recientemente).
   * - 'compact': Fila compacta para carrito o recomendaciones.
   */
  variant?: 'grid' | 'carousel' | 'compact';
  rating?: number;
  reviewCount?: number;
  className?: string;
  isFavorite?: boolean;
  onToggleFavorite?: (productId: string) => void;
  onAddToCart?: (product: Product) => Promise<void> | void;
}

/**
 * Tarjeta Universal Unificada de Producto:
 * Réplica fiel del prototipo interactivo `prototypes/buyer-marketplace-v2.html`:
 * - Marco de imagen de estudio con esquinas suaves.
 * - Botón de favoritos con corazón interactivo en esquina superior derecha.
 * - Píldora de categoría y disponibilidad 'Envío 24h' con punto esmeralda.
 * - Calificación real conectada sin datos mock (`product.averageRating`).
 * - Precio en Geist Mono tabular-nums con 'COP IVA incl.'.
 * - Botón 'Agregar' al pie de alta conversión.
 */
export function ProductCard({
  product,
  variant = 'grid',
  rating,
  reviewCount,
  className,
  isFavorite: isFavoriteProp,
  onToggleFavorite,
  onAddToCart,
}: ProductCardProps) {
  const { isFavorite: remoteFavorite, toggle: toggleRemoteFavorite } = useFavorite(product);
  const isFavorite = isFavoriteProp !== undefined ? isFavoriteProp : remoteFavorite;

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isFavoriteProp !== undefined) {
      onToggleFavorite?.(product.id);
      return;
    }

    void toggleRemoteFavorite();
    onToggleFavorite?.(product.id);
  };

  const handleAddToCart = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onAddToCart || isAdding) return;

    setIsAdding(true);
    setAddFeedback(null);
    try {
      await onAddToCart(product);
      setAddFeedback('success');
      window.setTimeout(() => setAddFeedback(null), 2500);
    } catch {
      setAddFeedback('error');
      window.setTimeout(() => setAddFeedback(null), 4000);
    } finally {
      setIsAdding(false);
    }
  };

  const availability = AVAILABILITY[resolveProductAvailability(product)];
  const imageUrls = getProductImageUrls(product);
  const primaryImageUrl = imageUrls[0] ?? getProductImageUrl(product);
  const secondaryImageUrl = imageUrls[1];
  const [imageFailed, setImageFailed] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [addFeedback, setAddFeedback] = useState<'success' | 'error' | null>(null);

  // Calificación real (cero mocks hardcodeados)
  const productRating = rating ?? product.averageRating;
  const productReviewCount = reviewCount ?? product.reviewsCount;
  const hasRating = productRating !== undefined && productRating > 0;

  const vendorName =
    product.brandName ??
    (product.vendorId ? `Vendedor #${product.vendorId.slice(0, 6)}` : undefined);

  const categoryTitle = product.category ?? formatProductType(product.type);

  // Disposición 1: COMPACT (para Carrito o Drawer de recomendaciones)
  if (variant === 'compact') {
    return (
      <Link
        to="/buyer/catalog/$productId"
        params={{ productId: product.id }}
        className={`group flex items-center gap-3 w-full rounded-xl border border-border bg-surface p-3 transition-colors hover:border-brand/50 ${
          className ?? ''
        }`}
      >
        <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-border bg-surface-muted/30">
          <img
            src={primaryImageUrl}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover object-center"
          />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          {vendorName && (
            <div className="truncate text-[9px] font-semibold uppercase tracking-[0.12em] text-foreground-subtle">
              {vendorName}
            </div>
          )}
          <h4 className="line-clamp-1 text-xs font-semibold text-foreground transition-colors group-hover:text-brand">
            {product.name}
          </h4>
          <div className="text-xs font-bold tabular-nums text-foreground">
            <MoneyAmount amount={product.price} currency={product.currency ?? 'COP'} />
          </div>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-foreground-muted transition-colors group-hover:text-brand" />
      </Link>
    );
  }

  // Disposición 2: GRID & CAROUSEL (Anatomía del prototipo v2)
  const containerClasses =
    variant === 'carousel'
      ? 'w-72 sm:w-80 shrink-0'
      : 'w-full';

  return (
    <article
      className={`group relative h-full flex flex-col justify-between rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-2.5 sm:p-4 shadow-xs transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg dark:hover:border-zinc-700 ${containerClasses} ${
        className ?? ''
      }`}
    >
      <div className="flex flex-col flex-1">
        {/* Marco de Imagen de Estudio Cuadrado */}
        <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 mb-2 sm:mb-2.5">
          {/* Botón de Favoritos (Corazón) circular en esquina superior derecha */}
          <button
            type="button"
            onClick={handleFavoriteClick}
            aria-label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            className={`absolute top-1.5 right-1.5 sm:top-2 sm:right-2 z-10 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-white/85 dark:bg-zinc-900/85 backdrop-blur-xs border border-zinc-200/90 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-red-500 transition-colors shadow-2xs cursor-pointer ${
              isFavorite ? 'text-red-500 dark:text-red-500 border-red-200 dark:border-red-900/60' : ''
            }`}
          >
            <Heart
              className={`h-3.5 w-3.5 sm:h-4 sm:w-4 transition-colors ${
                isFavorite ? 'fill-red-500 text-red-500' : ''
              }`}
            />
          </button>

          {/* Badges Pill Flotantes en esquina superior izquierda */}
          {resolveProductAvailability(product) === 'low-stock' && (
            <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 z-10 flex flex-col gap-1">
              <span className="rounded-full bg-accent-burgundy text-white px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[9px] font-semibold tracking-wider uppercase shadow-xs">
                Últimas unidades
              </span>
            </div>
          )}

          {/* Enlace de imagen hacia el detalle con marca de agua institucional como fallback */}
          <Link
            to="/buyer/catalog/$productId"
            params={{ productId: product.id }}
            className="block h-full w-full focus-visible:outline-none"
            tabIndex={-1}
            aria-hidden="true"
          >
            {imageFailed ? (
              <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-zinc-300 dark:text-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 select-none">
                <span className="text-xl font-bold tracking-tight opacity-40">
                  zentric<span className="text-emerald-500">.</span>
                </span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium tracking-wider uppercase">
                  Fotografía de Estudio
                </span>
              </div>
            ) : (
              <img
                src={primaryImageUrl}
                alt={product.name}
                loading="lazy"
                decoding="async"
                onError={() => setImageFailed(true)}
                className={`h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-300 ease-out ${
                  secondaryImageUrl
                    ? 'group-hover:opacity-0'
                    : ''
                }`}
              />
            )}
            {secondaryImageUrl && !imageFailed && (
              <img
                src={secondaryImageUrl}
                alt=""
                loading="lazy"
                decoding="async"
                aria-hidden="true"
                className="absolute inset-0 m-auto h-full w-full object-cover object-center opacity-0 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:scale-105"
              />
            )}
          </Link>
        </div>

        {/* Metadatos superiores: Categoría / Tipo + Disponibilidad (Bloque horizontal rígido de una sola línea) */}
        <div className="flex items-center justify-between gap-1 text-[9px] sm:text-[10px] mb-1 min-w-0 overflow-hidden">
          <span className="text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-medium truncate flex-1 min-w-0">
            {categoryTitle}
          </span>
          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${availability.dot || 'bg-emerald-500'}`} />
            <span className="truncate">{availability.label}</span>
          </span>
        </div>

        {/* Título enlazado a la ficha con altura calibrada de 2 líneas (h-9 sm:h-10) */}
        <Link
          to="/buyer/catalog/$productId"
          params={{ productId: product.id }}
          className="block focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 rounded"
        >
          <h3 className="h-9 sm:h-10 text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-2 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors overflow-hidden">
            {product.name}
          </h3>
        </Link>

        {/* Calificación: Honesta y de altura fija a 20px (h-5) para evitar desfase vertical */}
        <div className="mt-1 h-5 flex items-center gap-1 text-[11px] sm:text-xs">
          {hasRating ? (
            <>
              <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-amber-400 text-amber-400 shrink-0" aria-hidden="true" />
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {productRating.toFixed(1)}
              </span>
              {productReviewCount !== undefined && productReviewCount > 0 && (
                <span className="text-zinc-400 dark:text-zinc-500 hidden sm:inline">
                  ({productReviewCount})
                </span>
              )}
            </>
          ) : (
            <span className="text-zinc-400 dark:text-zinc-500 flex items-center gap-1 text-[10px] sm:text-[11px]">
              <Star className="h-3 w-3 text-zinc-300 dark:text-zinc-700 shrink-0" aria-hidden="true" />
              Sin reseñas
            </span>
          )}
        </div>
      </div>

      {/* Fila Inferior Anclada (mt-auto): Precio responsivo + Botón Agregar sin desfase */}
      <div className="mt-auto pt-2 sm:pt-3 border-t border-zinc-200 dark:border-zinc-800 flex flex-col justify-end">
        <div className="mb-2 sm:mb-2.5 flex items-baseline gap-1 min-w-0 truncate">
          <span className="font-sans text-sm sm:text-base lg:text-lg font-bold text-zinc-950 dark:text-white tracking-tight truncate">
            $ {Math.round(product.price).toLocaleString('es-CO')}
          </span>
          <span className="font-sans text-[9px] sm:text-[10px] font-medium text-zinc-400 dark:text-zinc-500 shrink-0">
            COP
          </span>
        </div>

        {resolveProductAvailability(product) === 'out-of-stock' ? (
          <button
            type="button"
            disabled
            aria-disabled="true"
            aria-label={`Producto ${product.name} agotado`}
            className="w-full h-8.5 sm:h-10 px-2 inline-flex items-center justify-center gap-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 text-[11px] sm:text-xs font-semibold cursor-not-allowed opacity-75 whitespace-nowrap overflow-hidden"
          >
            <span className="truncate">Agotado</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isAdding}
            aria-label={
              addFeedback === 'success'
                ? 'Producto agregado al carrito'
                : addFeedback === 'error'
                  ? 'No fue posible agregar el producto'
                  : `Agregar ${product.name} al carrito`
            }
            className="w-full h-8.5 sm:h-10 px-2 inline-flex items-center justify-center gap-1.5 rounded-md bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 text-[11px] sm:text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-sm cursor-pointer disabled:opacity-50 whitespace-nowrap overflow-hidden"
          >
            <ShoppingBag className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {isAdding
                ? 'Agregando...'
                : addFeedback === 'success'
                  ? 'Agregado'
                  : addFeedback === 'error'
                    ? 'Reintentar'
                    : 'Agregar'}
            </span>
          </button>
        )}
      </div>
    </article>
  );
}
