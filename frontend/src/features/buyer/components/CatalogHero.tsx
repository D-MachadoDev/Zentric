import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ImageOff, ShoppingBag, Star } from 'lucide-react';
import { Button, Skeleton } from '@zentric/ui';
import { useHeroProductsQuery } from '../../../core';
import { getProductImageUrl } from '../productImages';

interface CatalogHeroProps {
  onExploreAll?: () => void;
  onSelectCategory?: (categoryId: string) => void;
}

/**
 * Bento Hero Showcase (Dual Bento 8 cols + 4 cols).
 *
 * Muestra exclusivamente las referencias destacadas que devuelve el backend:
 * - Card 1 (8 cols): primera referencia destacada con su precio real.
 * - Card 2 (4 cols): segunda referencia destacada con su precio real.
 *
 * Sin productos ni precios inventados: si el backend no devuelve destacados la
 * sección cae a un estado honesto (carga, error o vacío) en lugar de inventar
 * nombres de producto o cifras de relleno.
 */
export function CatalogHero({ onExploreAll: _onExploreAll }: CatalogHeroProps) {
  const { data, isLoading, isError, refetch } = useHeroProductsQuery();
  const heroProducts = data ?? [];

  const featuredProduct = heroProducts[0];
  const secondaryProduct = heroProducts[1];

  const primaryImageUrl = featuredProduct ? getProductImageUrl(featuredProduct) : '';
  const secondaryImageUrl = secondaryProduct ? getProductImageUrl(secondaryProduct) : '';

  const [primaryImageFailed, setPrimaryImageFailed] = useState(false);
  const [secondaryImageFailed, setSecondaryImageFailed] = useState(false);

  return (
    <section
      id="destacados"
      aria-label="Referencias Destacadas"
      className="relative overflow-hidden pt-0 pb-2 sm:pb-3 w-full"
    >
      {/* Estado de carga */}
      {isLoading && !featuredProduct && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" aria-busy="true">
          <div className="lg:col-span-8 rounded-xl bg-white dark:bg-zinc-900 p-6 sm:p-8 border border-zinc-200 dark:border-zinc-800 min-h-[360px]">
            <Skeleton className="h-6 w-1/3 mb-4 rounded-full" />
            <Skeleton className="h-10 w-2/3 mb-3 rounded-lg" />
            <Skeleton className="h-4 w-1/2 mb-6 rounded-md" />
            <Skeleton className="h-10 w-40 rounded-md" />
          </div>
          <div className="lg:col-span-4 rounded-xl bg-white dark:bg-zinc-900 p-6 border border-zinc-200 dark:border-zinc-800 min-h-[360px]">
            <Skeleton className="h-6 w-24 mb-4 rounded-full" />
            <Skeleton className="h-8 w-3/4 mb-3 rounded-lg" />
            <Skeleton className="h-32 w-full mb-4 rounded-xl" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        </div>
      )}

      {/* Estado de error */}
      {isError && !featuredProduct && (
        <div
          role="status"
          className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-8 text-center"
        >
          <ImageOff className="h-8 w-8 text-zinc-400" aria-hidden="true" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              No pudimos cargar los productos destacados
            </p>
            <p className="text-xs text-zinc-500">
              El catálogo completo sigue disponible abajo.
            </p>
          </div>
          <Button variant="outline" size="sm" pill onClick={() => refetch()} className="rounded-full">
            Reintentar
          </Button>
        </div>
      )}

      {/* Bento Showcase Dual (solo con referencias reales del backend) */}
      {!isLoading && !isError && featuredProduct && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-stretch">
          {/* ── Bento Card 1: Héroe Principal ── */}
          <article
            className={`${
              secondaryProduct ? 'lg:col-span-8' : 'lg:col-span-12'
            } rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-4 sm:p-6 lg:p-8 h-full flex flex-col justify-between transition-all hover:border-zinc-300 dark:hover:border-zinc-700 shadow-xs`}
          >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 items-center flex-1">
              {/* Left Info (7 cols) */}
              <div className="md:col-span-7 flex flex-col justify-between h-full space-y-3 sm:space-y-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 mb-2.5 sm:mb-3">
                    {featuredProduct.category && (
                      <span className="truncate max-w-[140px]">{featuredProduct.category}</span>
                    )}
                    <span className="text-zinc-400">·</span>
                    <span className="inline-flex items-center gap-1.5 text-emerald-800 dark:text-emerald-400 font-semibold">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Disponible · Envío 24h
                    </span>
                  </div>

                  <Link
                    to="/buyer/catalog/$productId"
                    params={{ productId: featuredProduct.id }}
                    className="block group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg"
                  >
                    <h1 className="text-xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white leading-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {featuredProduct.name}
                    </h1>
                    <div className="mt-3 sm:mt-4 flex flex-wrap items-baseline gap-1.5 sm:gap-2">
                      <span className="font-sans text-sm sm:text-base font-semibold text-zinc-500 dark:text-zinc-400">
                        $
                      </span>
                      <span className="font-sans text-xl sm:text-3xl font-bold text-zinc-950 dark:text-white tracking-tight">
                        {Math.round(featuredProduct.price).toLocaleString('es-CO')}
                      </span>
                      <span className="font-sans text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                        COP
                      </span>
                    </div>
                  </Link>

                  {featuredProduct.description && (
                    <p className="mt-2.5 sm:mt-3 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-2">
                      {featuredProduct.description}
                    </p>
                  )}

                  {featuredProduct.averageRating !== undefined &&
                  featuredProduct.averageRating > 0 ? (
                    <div className="mt-3 sm:mt-4 flex items-center gap-1.5 text-xs">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0" aria-hidden="true" />
                      <span className="font-semibold text-zinc-900 dark:text-white">
                        {featuredProduct.averageRating.toFixed(1)}
                      </span>
                      {(featuredProduct.reviewsCount ?? 0) > 0 && (
                        <span className="text-zinc-600 dark:text-zinc-400">
                          ({featuredProduct.reviewsCount} opiniones verificadas)
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="mt-3 sm:mt-4 flex items-center gap-1.5 text-xs text-zinc-500">
                      <span>Sin reseñas aún</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
                  <Link
                    to="/buyer/catalog/$productId"
                    params={{ productId: featuredProduct.id }}
                    className="touch-target h-10 px-6 inline-flex items-center justify-center gap-2 rounded-md bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 font-semibold text-xs hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-sm cursor-pointer"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    <span>Agregar al Carrito</span>
                  </Link>

                  <Link
                    to="/buyer/catalog/$productId"
                    params={{ productId: featuredProduct.id }}
                    className="touch-target h-10 px-4 inline-flex items-center justify-center rounded-md border border-zinc-200 dark:border-zinc-800 bg-transparent text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
                  >
                    Ficha Técnica
                  </Link>
                </div>
              </div>

              {/* Right Visual Frame (5 cols) */}
              <div className="md:col-span-5 h-48 sm:h-64 md:h-72 w-full rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-center justify-center">
                {primaryImageFailed ? (
                  <div className="flex h-full w-full items-center justify-center text-zinc-300 dark:text-zinc-700">
                    <ImageOff className="h-8 w-8" aria-hidden="true" />
                  </div>
                ) : (
                  <img
                    src={primaryImageUrl}
                    alt={featuredProduct.name}
                    onError={() => setPrimaryImageFailed(true)}
                    className="h-full w-full object-cover object-center transition-transform duration-500 hover:scale-105"
                  />
                )}
              </div>
            </div>
          </article>

          {/* ── Bento Card 2: Héroe Secundario ── */}
          {secondaryProduct && (
            <article className="lg:col-span-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-4 sm:p-6 h-full flex flex-col justify-between transition-all hover:border-zinc-300 dark:hover:border-zinc-700 shadow-xs">
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-medium tracking-wide bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                      {secondaryProduct.category || 'Destacado'}
                    </span>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                      Stock en Bodega
                    </span>
                  </div>

                  <Link
                    to="/buyer/catalog/$productId"
                    params={{ productId: secondaryProduct.id }}
                    className="block group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg"
                  >
                    <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {secondaryProduct.name}
                    </h2>
                    <div className="mt-3 flex items-baseline gap-1 sm:gap-1.5">
                      <span className="font-sans text-xs sm:text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                        $
                      </span>
                      <span className="font-sans text-xl font-bold text-zinc-950 dark:text-white tracking-tight">
                        {Math.round(secondaryProduct.price).toLocaleString('es-CO')}
                      </span>
                      <span className="font-sans text-xs text-zinc-400 dark:text-zinc-500 font-medium ml-0.5">
                        COP
                      </span>
                    </div>
                  </Link>

                  {secondaryProduct.description && (
                    <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-2">
                      {secondaryProduct.description}
                    </p>
                  )}

                  {secondaryProduct.averageRating !== undefined &&
                  secondaryProduct.averageRating > 0 ? (
                    <div className="mt-2.5 flex items-center gap-1.5 text-xs">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0" aria-hidden="true" />
                      <span className="font-semibold text-zinc-900 dark:text-white">
                        {secondaryProduct.averageRating.toFixed(1)}
                      </span>
                      {(secondaryProduct.reviewsCount ?? 0) > 0 && (
                        <span className="text-zinc-400 dark:text-zinc-500">
                          ({secondaryProduct.reviewsCount} opiniones)
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2.5 flex items-center gap-1.5 text-xs text-zinc-500">
                      <span>Sin reseñas aún</span>
                    </div>
                  )}
                </div>

                <div className="relative my-3 sm:my-4 h-36 sm:h-40 w-full rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-center justify-center">
                  {secondaryImageFailed ? (
                    <div className="flex h-full w-full items-center justify-center text-zinc-300 dark:text-zinc-700">
                      <ImageOff className="h-8 w-8" aria-hidden="true" />
                    </div>
                  ) : (
                    <img
                      src={secondaryImageUrl}
                      alt={secondaryProduct.name}
                      onError={() => setSecondaryImageFailed(true)}
                      className="h-full w-full object-cover object-center transition-transform duration-300 hover:scale-105"
                    />
                  )}
                </div>
              </div>

              <Link
                to="/buyer/catalog/$productId"
                params={{ productId: secondaryProduct.id }}
                className="w-full h-10 mt-auto inline-flex items-center justify-center gap-2 rounded-md bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-sm cursor-pointer"
              >
                <ShoppingBag className="h-4 w-4 shrink-0" />
                <span>Agregar al Carrito</span>
              </Link>
            </article>
          )}
        </div>
      )}
    </section>
  );
}
