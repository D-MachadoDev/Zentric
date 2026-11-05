import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  ArrowRight,
  CheckCircle2,
  ImageOff,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
} from 'lucide-react';
import { Button, MoneyAmount, Skeleton } from '@zentric/ui';
import type { Product } from '../../../domain';
import { useCategoriesQuery, useHeroProductsQuery } from '../../../application/services/catalog';
import { getProductImageUrl } from '../productImages';

const MAX_QUICK_DEPARTMENTS = 7;

interface CatalogHeroProps {
  onExploreAll: () => void;
  onSelectCategory?: (categoryId: string) => void;
}

/**
 * Escaparate editorial del producto estelar: imagen nítida en gran formato,
 * metadatos claros y precio en tipografía sans legible.
 */
function FeaturedProductShowcase({ product }: { product: Product }) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = getProductImageUrl(product);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-sm transition-all duration-300 hover:border-brand/40 hover:shadow-md">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-muted/50">
        {imageFailed ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-foreground-muted">
            <ImageOff className="h-10 w-10 text-foreground-subtle" aria-hidden="true" />
            <span className="text-xs">Imagen no disponible</span>
          </div>
        ) : (
          <img
            src={imageUrl}
            alt={product.name}
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
          />
        )}
        <div className="absolute top-3.5 left-3.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-surface/90 px-3 py-1 text-xs font-semibold text-brand shadow-xs backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
            Destacado del catálogo
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between gap-4 p-5 sm:p-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-foreground-muted">
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              Stock disponible en bodega
            </span>
          </div>

          <Link
            to="/buyer/catalog/$productId"
            params={{ productId: product.id }}
            className="block group/link focus-visible:outline-none"
          >
            <h3 className="text-lg font-bold text-foreground transition-colors group-hover/link:text-brand line-clamp-2">
              {product.name}
            </h3>
            <div className="mt-2 text-xl sm:text-2xl font-bold text-foreground">
              <MoneyAmount
                amount={product.price}
                currency={product.currency ?? 'COP'}
                className="text-foreground"
              />
            </div>
          </Link>

          <p className="line-clamp-2 text-xs sm:text-sm text-foreground-muted leading-relaxed">
            {product.description || 'Producto verificado listo para despacho inmediato desde centro logístico.'}
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-border/60 pt-4">
          <div className="space-y-0.5">
            <span className="text-xs font-medium text-foreground-muted uppercase tracking-wider">
              Garantía Zentric
            </span>
            <p className="text-xs text-foreground-muted">Despacho seguro</p>
          </div>

          <Link
            to="/buyer/catalog/$productId"
            params={{ productId: product.id }}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-xs sm:text-sm font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-brand-strong focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:outline-none"
          >
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            Comprar ahora
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

/**
 * Ficha complementaria horizontal limpia: 2 productos secundarios bien espaciados.
 */
function SupportProductCard({ product }: { product: Product }) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = getProductImageUrl(product);

  return (
    <Link
      to="/buyer/catalog/$productId"
      params={{ productId: product.id }}
      className="group flex items-center gap-3.5 rounded-xl border border-border/70 bg-surface p-3 shadow-xs transition-all duration-200 hover:border-brand/40 hover:shadow-sm"
    >
      <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-surface-muted/60">
        {imageFailed ? (
          <div className="flex h-full w-full items-center justify-center text-foreground-muted">
            <ImageOff className="h-5 w-5" aria-hidden="true" />
          </div>
        ) : (
          <img
            src={imageUrl}
            alt={product.name}
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
          />
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <h4 className="line-clamp-1 text-xs sm:text-sm font-semibold text-foreground transition-colors group-hover:text-brand">
          {product.name}
        </h4>
        <div className="text-xs sm:text-sm font-bold text-foreground">
          <MoneyAmount amount={product.price} currency={product.currency ?? 'COP'} />
        </div>
      </div>

      <div className="text-foreground-subtle transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-brand">
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </div>
    </Link>
  );
}

/**
 * Banner Principal del Catálogo de Compradores Zentric:
 * Diseño editorial, limpio y espacioso, enfocado en transparencia, stock real
 * y eliminación del abarrotamiento de plantillas estilo IA.
 */
export function CatalogHero({ onExploreAll, onSelectCategory }: CatalogHeroProps) {
  const { data, isLoading, isError, refetch } = useHeroProductsQuery();
  const { data: categories = [] } = useCategoriesQuery();
  const heroProducts = data ?? [];
  const departments = categories.slice(0, MAX_QUICK_DEPARTMENTS);
  const hasHeroProducts = heroProducts.length > 0;
  const featuredProduct = heroProducts[0];
  const secondaryProducts = heroProducts.slice(1, 3);

  return (
    <section
      aria-label="Presentación del catálogo de compras"
      className="relative overflow-hidden rounded-3xl border border-border/80 bg-surface p-6 sm:p-8 lg:p-10 shadow-xs"
    >
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center lg:gap-12">
        {/* Columna Izquierda: Mensaje Editorial y Acciones */}
        <div className="space-y-6 lg:col-span-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-surface-muted/60 px-3.5 py-1 text-xs font-semibold text-foreground-muted">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
              <span>Marketplace Centralizado · Inventario Verificado</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-[1.12]">
              Compra con <span className="text-brand">stock real en bodega</span> y entrega protegida
            </h1>

            <p className="text-sm sm:text-base text-foreground-muted leading-relaxed max-w-xl">
              Explora miles de productos de vendedores autorizados. Cada artículo cuenta con existencia
              física comprobada y trazabilidad logística garantizada desde el empaque hasta tu puerta.
            </p>
          </div>

          {/* Sellos de Confianza Tangibles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-y border-border/60 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                <PackageCheck className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="text-xs">
                <p className="font-semibold text-foreground">Stock Físico</p>
                <p className="text-foreground-muted">Sin sobreventa</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                <Truck className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="text-xs">
                <p className="font-semibold text-foreground">Despacho Central</p>
                <p className="text-foreground-muted">Con guía y seguimiento</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="text-xs">
                <p className="font-semibold text-foreground">Devolución Clara</p>
                <p className="text-foreground-muted">Respaldo Zentric</p>
              </div>
            </div>
          </div>

          {/* CTA Principal y Explorar */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={onExploreAll}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-6 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-brand-strong hover:shadow-md focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              Explorar catálogo completo
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>

          {/* Departamentos y Categorías con espacio respirable */}
          {onSelectCategory && departments.length > 0 && (
            <div className="space-y-2.5 pt-1">
              <span className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                Departamentos principales
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {departments.map((department) => (
                  <button
                    key={department.id}
                    type="button"
                    onClick={() => onSelectCategory(department.id)}
                    className="rounded-xl border border-border/80 bg-surface-muted/40 px-3.5 py-1.5 text-xs font-medium text-foreground transition-all duration-200 hover:border-brand/40 hover:bg-surface hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    {department.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Columna Derecha: Escaparate Destacado Limpio */}
        <div className="lg:col-span-6">
          {isLoading && !hasHeroProducts ? (
            <div className="space-y-4" aria-busy="true">
              <Skeleton className="aspect-[4/3] w-full rounded-2xl bg-surface-muted" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Skeleton className="h-20 w-full rounded-xl bg-surface-muted" />
                <Skeleton className="h-20 w-full rounded-xl bg-surface-muted" />
              </div>
            </div>
          ) : isError && !hasHeroProducts ? (
            <div
              role="status"
              className="flex min-h-[16rem] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-surface-muted/30 p-8 text-center"
            >
              <ImageOff className="h-8 w-8 text-foreground-subtle" aria-hidden="true" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  No pudimos cargar los productos destacados
                </p>
                <p className="text-xs text-foreground-muted">
                  El catálogo completo sigue disponible más abajo.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Reintentar
              </Button>
            </div>
          ) : hasHeroProducts && featuredProduct ? (
            <div className="space-y-3.5">
              <FeaturedProductShowcase product={featuredProduct} />

              {secondaryProducts.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {secondaryProducts.map((prod) => (
                    <SupportProductCard key={prod.id} product={prod} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex min-h-[16rem] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface-muted/30 p-8 text-center">
              <p className="text-sm font-semibold text-foreground">
                Próximamente productos destacados
              </p>
              <p className="text-xs text-foreground-muted">
                En cuanto los vendedores publiquen, verás aquí ofertas verificadas.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
