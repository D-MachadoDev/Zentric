import { Link } from '@tanstack/react-router';
import { ArrowRight, CheckCircle2, Flame } from 'lucide-react';
import { MoneyAmount } from '@zentric/ui';
import type { Product } from '../../../domain';
import { getProductImageUrl } from '../productImages';
import {
  formatProductType,
  formatVariantCount,
  resolvePrimarySku,
  resolveProductAvailability,
} from './productPresentation';

interface ProductRailCardProps {
  product: Product;
}

/**
 * Tarjeta compacta del carrusel de populares.
 *
 * La composicion se mantiene (el Owner la aprobo); comparte con la grilla las
 * reglas de escasez, la tipografia mono del precio y del SKU, y el respeto
 * por `prefers-reduced-motion`.
 */
export function ProductRailCard({ product }: ProductRailCardProps) {
  const availability = resolveProductAvailability(product);
  const variantCount = product.variants?.length ?? 1;
  const sku = resolvePrimarySku(product);

  return (
    <Link
      to="/buyer/catalog/$productId"
      params={{ productId: product.id }}
      className="group relative flex w-72 shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-[transform,box-shadow,border-color] duration-300 ease-out hover:border-brand/60 hover:shadow-lg motion-safe:hover:-translate-y-1"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-surface-muted">
        <img
          src={getProductImageUrl(product)}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover object-center outline-1 -outline-offset-1 outline-black/10 motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out motion-safe:group-hover:scale-105 dark:outline-white/10"
        />
        <div className="absolute top-2.5 left-2.5">
          <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface/90 px-2 py-0.5 text-[10px] font-bold text-brand shadow-xs backdrop-blur-md">
            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
            Envío Asegurado
          </span>
        </div>
        {availability === 'low-stock' && (
          <div className="absolute bottom-2.5 left-2.5">
            <span className="inline-flex items-center gap-1 rounded-md bg-warning/95 px-2 py-0.5 text-[10px] font-bold text-background shadow-xs">
              <Flame className="h-3 w-3" aria-hidden="true" />
              ¡Últimas unidades!
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between gap-3 p-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-x-1.5 font-mono text-[11px] text-foreground-muted">
            <span className="font-semibold text-brand">{formatProductType(product.type)}</span>
            <span aria-hidden="true">·</span>
            <span>{formatVariantCount(variantCount)}</span>
            {sku && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[10px] tracking-tight text-foreground-subtle">{sku}</span>
              </>
            )}
          </div>
          <h3 className="line-clamp-1 text-sm font-semibold text-foreground transition-colors group-hover:text-brand">
            {product.name}
          </h3>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-2">
          <div>
            <span className="font-mono text-[10px] tracking-wider text-foreground-muted uppercase">
              Precio
            </span>
            <div className="text-base font-bold text-foreground">
              <MoneyAmount amount={product.price} currency={product.currency ?? 'COP'} />
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand group-hover:underline">
            Ver Ficha
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  );
}
