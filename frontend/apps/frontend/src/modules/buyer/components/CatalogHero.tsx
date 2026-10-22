import { Link } from '@tanstack/react-router';
import { ArrowRight, ImageOff, Sparkles } from 'lucide-react';
import { Button, MoneyAmount, Skeleton } from '@zentric/ui';
import type { Product } from '../../../domain';
import { useHeroProductsQuery } from '../../../application/services/catalog';
import { getProductImageUrl } from '../productImages';

interface HeroTileProps {
  product: Product;
  featured?: boolean;
  className?: string;
}

/**
 * Ficha del mosaico: imagen real del producto con enlace a su ficha.
 *
 * El enlace se estira sobre toda la figura con `after:inset-0`, asi que el area
 * clicable es el mosaico completo sin perder la semantica de `figure` +
 * `figcaption` ni el texto alternativo real de la fotografia.
 */
function HeroTile({ product, featured = false, className = '' }: HeroTileProps) {
  return (
    <figure
      className={`group relative overflow-hidden rounded-2xl border border-border bg-surface-muted ${className}`}
    >
      <img
        src={getProductImageUrl(product)}
        alt={product.name}
        className="h-full w-full object-cover object-center outline-1 -outline-offset-1 outline-black/10 motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-out motion-safe:group-hover:scale-[1.04] dark:outline-white/10"
      />
      <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 via-background/45 to-transparent p-3 pt-8">
        <Link
          to="/buyer/catalog/$productId"
          params={{ productId: product.id }}
          className="flex flex-col gap-0.5 after:absolute after:inset-0 focus-visible:outline-none"
        >
          <span
            className={`line-clamp-2 font-semibold text-foreground ${
              featured ? 'text-sm sm:text-base' : 'text-xs'
            }`}
          >
            {product.name}
          </span>
          <MoneyAmount
            amount={product.price}
            currency={product.currency ?? 'COP'}
            className={`font-semibold text-brand ${featured ? 'text-xs' : 'text-[11px]'}`}
          />
        </Link>
      </figcaption>
    </figure>
  );
}

const MOSAIC_GRID =
  'grid grid-cols-2 gap-2.5 auto-rows-[5.75rem] sm:gap-3 sm:auto-rows-[6.75rem] lg:grid-cols-4 lg:auto-rows-[8rem]';

/** Posicion de cada ficha en el mosaico: destacada, soporte y banda final. */
function tileLayout(index: number): string {
  if (index === 0) {
    return 'col-span-2 row-span-2';
  }
  if (index === 5) {
    return 'hidden lg:col-span-4 lg:block';
  }
  return '';
}

interface CatalogHeroProps {
  onExploreAll: () => void;
}

/**
 * Primera impresion del catalogos del comprador (S2).
 *
 * El hero no depende de un rubro fijo: se compone con productos reales
 * (`GET api/catalog/products/hero`) y es estatico (sin autoplay ni trampas de
 * movimiento). Si la consulta falla o no hay destacados, lo dice en pantalla en
 * lugar de mostrar una imagen inventada.
 */
export function CatalogHero({ onExploreAll }: CatalogHeroProps) {
  const { data, isLoading, isError, refetch } = useHeroProductsQuery();
  const heroProducts = data ?? [];
  const hasHeroProducts = heroProducts.length > 0;

  return (
    <section
      aria-label="Productos destacados"
      className="relative overflow-hidden rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-7 lg:p-9"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-brand/5 blur-3xl"
      />

      <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center lg:gap-8">
        <div className="space-y-4 lg:col-span-5">
          <p className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-brand uppercase">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Marketplace multi-vendedor
          </p>

          <h2 className="text-3xl leading-tight font-bold tracking-tight text-foreground sm:text-4xl">
            Todo lo que buscas, con <span className="text-brand">vendedores verificados</span>
          </h2>

          <p className="max-w-xl text-sm leading-relaxed text-foreground-muted sm:text-base">
            Explora el catálogo completo, compara precios y compra con reserva de stock de 15
            minutos, despacho rastreable y devolución segura.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              to="/buyer/catalog"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-background transition-colors hover:bg-brand-strong focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:outline-none"
            >
              Explorar catálogo completo
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Button variant="outline" size="lg" onClick={onExploreAll}>
              Ver todos los productos
            </Button>
          </div>
        </div>

        <div className="lg:col-span-7">
          {isLoading && !hasHeroProducts ? (
            <div className={MOSAIC_GRID} aria-busy="true">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton
                  key={index}
                  className={`rounded-2xl bg-surface-muted ${tileLayout(index)}`}
                />
              ))}
            </div>
          ) : isError && !hasHeroProducts ? (
            <div
              role="status"
              className="flex min-h-[14rem] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface-muted/40 p-6 text-center"
            >
              <ImageOff className="h-5 w-5 text-foreground-subtle" aria-hidden="true" />
              <p className="text-sm font-medium text-foreground">
                No pudimos cargar los productos destacados
              </p>
              <p className="text-xs text-foreground-muted">
                El catálogo completo sigue disponible más abajo.
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Reintentar
              </Button>
            </div>
          ) : hasHeroProducts ? (
            <div className={MOSAIC_GRID}>
              {heroProducts.map((product, index) => (
                <HeroTile
                  key={product.id}
                  product={product}
                  featured={index === 0}
                  className={tileLayout(index)}
                />
              ))}
            </div>
          ) : (
            <div className="flex min-h-[14rem] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface-muted/40 p-6 text-center">
              <p className="text-sm font-medium text-foreground">
                Todavía no hay productos destacados
              </p>
              <p className="text-xs text-foreground-muted">
                En cuanto los vendedores publiquen, verás aquí una muestra real del catálogo.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
