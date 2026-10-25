import { Link } from '@tanstack/react-router';
import { ArrowRight, ImageOff, ShoppingBag, Sparkles } from 'lucide-react';
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
 * Ficha del mosaico: imagen real del producto con enlace directo a su ficha de compra.
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
      <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 via-background/55 to-transparent p-3 pt-8">
        <Link
          to="/buyer/catalog/$productId"
          params={{ productId: product.id }}
          className="flex flex-col gap-0.5 after:absolute after:inset-0 focus-visible:outline-none"
        >
          <span
            className={`line-clamp-2 font-semibold text-foreground group-hover:text-brand transition-colors ${
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

const PROMISES = [
  'Hogar, Moda, Supermercado, Deportes y Tecnología en un solo carrito',
  'Reserva de stock por 15 minutos al pasar a caja',
  'Envío rastreable desde bodega certificada y devolución garantizada',
];

const QUICK_DEPARTMENTS: Array<{ id: string; label: string }> = [
  { id: 'hogar', label: 'Hogar y Cocina' },
  { id: 'moda', label: 'Moda y Calzado' },
  { id: 'supermercado', label: 'Supermercado' },
  { id: 'deportes', label: 'Deportes' },
  { id: 'tecnologia', label: 'Tecnología' },
  { id: 'audio', label: 'Audio' },
];

interface CatalogHeroProps {
  onExploreAll: () => void;
  onSelectCategory?: (categoryId: string) => void;
}

/**
 * Primera impresion del catalogo del comprador (S2).
 *
 * Orientado a conversión estilo Mercado Libre / Éxito / Amazon:
 * - Botón primario que lleva directo a comprar el producto destacado o a explorar las ofertas en la grilla.
 * - Accesos rápidos por departamento que filtran y desplazan suavemente hacia `#product-grid`.
 * - Mosaico interactivo donde cada tarjeta abre la ficha de producto lista para comprar.
 */
export function CatalogHero({ onExploreAll, onSelectCategory }: CatalogHeroProps) {
  const { data, isLoading, isError, refetch } = useHeroProductsQuery();
  const heroProducts = data ?? [];
  const hasHeroProducts = heroProducts.length > 0;
  const featuredProduct = heroProducts[0];

  return (
    <section
      aria-label="Productos destacados"
      className="surface-hairline relative overflow-hidden rounded-3xl p-5 sm:p-7 lg:p-9"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-brand/5 blur-3xl"
      />

      <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center lg:gap-8">
        <div className="space-y-4 lg:col-span-5">
          <p className="kicker-spike">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Todo lo que necesitas, directo a tu puerta
          </p>

          <h2 className="text-3xl leading-[1.15] font-bold tracking-tight text-foreground sm:text-4xl">
            Compra de todo con{' '}
            <span className="text-brand">stock real y entrega protegida</span>
          </h2>

          <p className="max-w-xl text-sm leading-relaxed text-foreground-muted sm:text-base">
            Desde electrodomésticos de hogar, café de origen y moda hasta deporte y tecnología.
            Elige tu variante, agrégala al carrito sin registro previo y paga seguro.
          </p>

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
            {featuredProduct ? (
              <Link
                to="/buyer/catalog/$productId"
                params={{ productId: featuredProduct.id }}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-brand-strong focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:outline-none"
              >
                <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                Ver oferta destacada
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : (
              <Button
                type="button"
                onClick={onExploreAll}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-brand-strong"
              >
                Explorar catálogo completo
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onExploreAll}
              className="h-10 border-border text-foreground hover:border-brand/40 hover:text-brand"
            >
              Explorar catálogo completo
              <ArrowRight className="h-3.5 w-3.5 ml-1" aria-hidden="true" />
            </Button>
          </div>

          {onSelectCategory && (
            <div className="pt-2 border-t border-border/60 space-y-1.5">
              <span className="font-mono text-[10px] uppercase tracking-wider text-foreground-subtle block">
                Departamentos rápidos
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {QUICK_DEPARTMENTS.map((dept) => (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => onSelectCategory(dept.id)}
                    className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-foreground-muted transition-colors hover:border-brand/50 hover:bg-brand/10 hover:text-brand"
                  >
                    {dept.label}
                  </button>
                ))}
              </div>
            </div>
          )}
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
