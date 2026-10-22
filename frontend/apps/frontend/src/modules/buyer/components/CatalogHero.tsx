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

/**
 * Propuestas de valor que el backend sostiene de verdad (§8-A3). Se listan
 * como Compromisos en linea, no como tarjetas: §2.2 prohibe la cuadricula de
 * clones y §9.6 pide jerarquia, no simetria.
 */
const PROMISES = [
  'Reserva atomica de 15 minutos',
  'Despacho multi-bodega rastreable',
  'Split de facturacion 5/95',
];

interface CatalogHeroProps {
  onExploreAll: () => void;
}

/**
 * Primera impresion del catalogo del comprador (S2).
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
      className="surface-hairline relative overflow-hidden rounded-3xl p-5 sm:p-7 lg:p-9"
    >
      {/* Resplandor focal DERIVADO del acento de rol (§9.3-3): color-mix, no rgba fijo. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-brand/5 blur-3xl"
      />

      <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center lg:gap-8">
        <div className="space-y-4 lg:col-span-5">
          <p className="kicker-spike">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Marketplace multi-vendedor
          </p>

          <h2 className="text-3xl leading-[1.15] font-bold tracking-tight text-foreground sm:text-4xl">
            Cada producto, con el vendedor{' '}
            <span className="text-brand">y el stock verificados</span>
          </h2>

          <p className="max-w-xl text-sm leading-relaxed text-foreground-muted sm:text-base">
            El precio lo fija el vendedor y el stock lo bloquea la bodega: comparas en el
            catalogo y completas la compra sin sobreventa.
          </p>

          {/* Compromisos en linea: sin cajas, sin iconos de colores en paralelo. */}
          <ul className="space-y-1.5 pt-1">
            {PROMISES.map((promise) => (
              <li key={promise} className="flex items-start gap-2 text-xs text-foreground-muted">
                <span
                  aria-hidden="true"
                  className="mt-1.5 size-1 shrink-0 rounded-full bg-brand"
                />
                {promise}
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              to="/buyer/catalog"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-brand-strong focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:outline-none"
            >
              Explorar catalogo completo
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Button variant="ghost" size="sm" onClick={onExploreAll} className="text-foreground-muted">
              Ver en la grilla
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
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
