import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  ArrowRight,
  ImageOff,
  PackageCheck,
  RotateCcw,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { Button, MoneyAmount, Skeleton } from '@zentric/ui';
import type { Product } from '../../../core';
import { useCategoriesQuery, useHeroProductsQuery } from '../../../core';
import { getProductImageUrl } from '../productImages';
import { resolveProductAvailability, type ProductAvailability } from './productPresentation';

const MAX_QUICK_DEPARTMENTS = 6;

const TRUST_SIGNALS = [
  { Icon: PackageCheck, label: 'Stock físico' },
  { Icon: Truck, label: 'Despacho central' },
  { Icon: RotateCcw, label: 'Devolución clara' },
];

const AVAILABILITY_TONE: Record<ProductAvailability, { dot: string; label: string }> = {
  'in-stock': { dot: 'bg-emerald-500', label: 'Stock verificado en bodega' },
  'low-stock': { dot: 'bg-amber-500', label: 'Stock limitado' },
  'out-of-stock': { dot: 'bg-rose-500', label: 'Sin stock por ahora' },
  digital: { dot: 'bg-brand', label: 'Entrega digital inmediata' },
};

interface CatalogHeroProps {
  onExploreAll: () => void;
  onSelectCategory?: (categoryId: string) => void;
}

/**
 * Escaparate del producto estelar: una sola ficha, sin ruido,
 * con el precio y la disponibilidad como señales principales.
 */
function FeaturedProductShowcase({ product }: { product: Product }) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = getProductImageUrl(product);
  const availability = AVAILABILITY_TONE[resolveProductAvailability(product)];

  return (
    <article className="group w-full overflow-hidden rounded-2xl border border-border/70 bg-surface">
      <div className="aspect-[4/3] w-full overflow-hidden bg-surface-muted/40">
        {imageFailed ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-foreground-muted">
            <ImageOff className="h-8 w-8 text-foreground-subtle" aria-hidden="true" />
            <span className="text-xs">Imagen no disponible</span>
          </div>
        ) : (
          <img
            src={imageUrl}
            alt={product.name}
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover object-center motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out motion-safe:group-hover:scale-[1.02]"
          />
        )}
      </div>

      <div className="space-y-3 p-5 sm:p-6">
        <div className="flex items-center gap-2 text-xs text-foreground-muted">
          <span className={`size-1.5 rounded-full ${availability.dot}`} aria-hidden="true" />
          <span>{availability.label}</span>
        </div>

        <Link
          to="/buyer/catalog/$productId"
          params={{ productId: product.id }}
          className="block space-y-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          <h2 className="line-clamp-2 text-lg font-semibold leading-snug text-foreground transition-colors group-hover:text-brand sm:text-xl">
            {product.name}
          </h2>

          <div className="text-2xl font-semibold tabular-nums text-foreground">
            <MoneyAmount amount={product.price} currency={product.currency ?? 'COP'} />
          </div>
        </Link>

        {product.description?.trim() ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-foreground-muted">
            {product.description}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-4">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-foreground-muted">
            <ShieldCheck className="h-3.5 w-3.5 text-brand" strokeWidth={1.75} aria-hidden="true" />
            Garantía ZENTRIC
          </span>

          <Link
            to="/buyer/catalog/$productId"
            params={{ productId: product.id }}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            Comprar ahora
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

/**
 * Banner principal del catálogo de compradores.
 * Dos columnas equilibradas: mensaje de confianza a la izquierda y
 * un producto real a la derecha, sin decoración que compita con ellos.
 */
export function CatalogHero({ onExploreAll, onSelectCategory }: CatalogHeroProps) {
  const { data, isLoading, isError, refetch } = useHeroProductsQuery();
  const { data: categories = [] } = useCategoriesQuery();
  const heroProducts = data ?? [];
  const departments = categories.slice(0, MAX_QUICK_DEPARTMENTS);
  const featuredProduct = heroProducts[0];

  return (
    <section
      aria-label="Presentación del catálogo de compras"
      className="grid items-start gap-8 lg:grid-cols-2 lg:gap-14"
    >
      {/* Columna izquierda: propuesta de valor y accesos */}
      <div className="min-w-0 space-y-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">
          Marketplace centralizado · Inventario verificado
        </p>

        <h1 className="max-w-xl text-[2rem] font-semibold leading-[1.08] tracking-tight text-foreground sm:text-[2.6rem] lg:text-[3rem]">
          Compra con <span className="text-brand">stock real en bodega</span> y entrega protegida
        </h1>

        <p className="max-w-lg text-sm leading-relaxed text-foreground-muted sm:text-[15px]">
          Equipamiento profesional de vendedores verificados, con existencia física
          comprobada y despacho central asegurado.
        </p>

        <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-foreground-muted">
          {TRUST_SIGNALS.map(({ Icon, label }) => (
            <li key={label} className="inline-flex items-center gap-1.5">
              <Icon className="h-4 w-4 text-brand" strokeWidth={1.75} aria-hidden="true" />
              {label}
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button
            type="button"
            onClick={onExploreAll}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-brand-strong focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            Explorar catálogo
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        {onSelectCategory && departments.length > 0 && (
          <div className="space-y-2 pt-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground-muted">
              Departamentos
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {departments.map((department) => (
                <button
                  key={department.id}
                  type="button"
                  onClick={() => onSelectCategory(department.id)}
                  className="rounded-full border border-border/80 px-3 py-1 text-xs font-medium text-foreground-muted transition-colors hover:border-brand/40 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  {department.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Columna derecha: producto real, sin fichas secundarias */}
      <div className="w-full min-w-0 lg:max-w-[520px] lg:justify-self-end">
        {isLoading && !featuredProduct ? (
          <div
            className="w-full overflow-hidden rounded-2xl border border-border/70 bg-surface"
            aria-busy="true"
          >
            <Skeleton className="aspect-[4/3] w-full bg-surface-muted" />
            <div className="space-y-3 p-6">
              <Skeleton className="h-3 w-40 rounded bg-surface-muted" />
              <Skeleton className="h-5 w-3/4 rounded bg-surface-muted" />
              <Skeleton className="h-7 w-36 rounded bg-surface-muted" />
              <Skeleton className="h-10 w-full rounded-lg bg-surface-muted" />
            </div>
          </div>
        ) : isError && !featuredProduct ? (
          <div
            role="status"
            className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-surface-muted/30 p-8 text-center"
          >
            <ImageOff className="h-7 w-7 text-foreground-subtle" aria-hidden="true" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                No pudimos cargar los productos destacados
              </p>
              <p className="text-xs text-foreground-muted">
                El catálogo completo sigue disponible abajo.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Reintentar
            </Button>
          </div>
        ) : featuredProduct ? (
          <FeaturedProductShowcase product={featuredProduct} />
        ) : (
          <div className="flex min-h-64 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface-muted/30 p-8 text-center">
            <p className="text-sm font-semibold text-foreground">
              Próximamente productos destacados
            </p>
            <p className="text-xs text-foreground-muted">
              En cuanto los vendedores publiquen, verás aquí ofertas verificadas.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
