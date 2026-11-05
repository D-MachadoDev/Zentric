import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight, ImageOff } from 'lucide-react';
import { MoneyAmount } from '@zentric/ui';
import type { Product } from '../../../core';
import { getProductImageUrl } from '../productImages';
import {
  formatProductType,
  formatVariantCount,
  resolveProductAvailability,
  type ProductAvailability,
} from './productPresentation';

const AVAILABILITY: Record<ProductAvailability, { label: string; dot: string }> = {
  'in-stock': { label: 'Disponible', dot: 'bg-emerald-500' },
  'low-stock': { label: 'Stock limitado', dot: 'bg-amber-500' },
  'out-of-stock': { label: 'Agotado', dot: 'bg-rose-500' },
  digital: { label: 'Entrega digital', dot: 'bg-brand' },
};

interface ProductRailCardProps {
  product: Product;
}

/**
 * Tarjeta compacta del carrusel: misma jerarquía que la grilla
 * —imagen, nombre, precio y disponibilidad— en un formato horizontal.
 */
export function ProductRailCard({ product }: ProductRailCardProps) {
  const availability = AVAILABILITY[resolveProductAvailability(product)];
  const variantCount = product.variants?.length ?? 1;
  const imageUrl = getProductImageUrl(product);
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <Link
      to="/buyer/catalog/$productId"
      params={{ productId: product.id }}
      className="group flex w-64 shrink-0 flex-col overflow-hidden rounded-xl border border-border/80 bg-surface transition-colors duration-200 hover:border-brand/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-surface-muted/50">
        {imageFailed ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-foreground-muted">
            <ImageOff className="h-7 w-7 text-foreground-subtle" aria-hidden="true" />
            <span className="text-xs">Imagen no disponible</span>
          </div>
        ) : (
          <img
            src={imageUrl}
            alt={product.name}
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover object-center motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out motion-safe:group-hover:scale-[1.03]"
          />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-3.5">
        <div className="flex flex-wrap items-center gap-x-1.5 text-[11px] text-foreground-muted">
          <span className="font-medium text-brand">{formatProductType(product.type)}</span>
          <span aria-hidden="true">·</span>
          <span>{formatVariantCount(variantCount)}</span>
        </div>

        <h3 className="line-clamp-1 text-sm font-semibold text-foreground transition-colors group-hover:text-brand">
          {product.name}
        </h3>

        <div className="mt-auto space-y-1">
          <div className="text-base font-semibold tabular-nums text-foreground">
            <MoneyAmount amount={product.price} currency={product.currency ?? 'COP'} />
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-foreground-muted">
              <span className={`size-1.5 rounded-full ${availability.dot}`} aria-hidden="true" />
              {availability.label}
            </span>
            <ArrowRight
              className="h-3.5 w-3.5 text-foreground-muted transition-colors group-hover:text-brand"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
