import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight, FileCode, ImageOff, Package } from 'lucide-react';
import { MoneyAmount } from '@zentric/ui';
import { ProductType, type Product } from '../../../core';
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

interface ProductCardProps {
  product: Product;
}

/**
 * Tarjeta de la grilla comercial: imagen consistente, nombre legible,
 * precio dominante y disponibilidad como dato, no como alarma.
 */
export function ProductCard({ product }: ProductCardProps) {
  const availability = AVAILABILITY[resolveProductAvailability(product)];
  const variantCount = product.variants?.length ?? 1;
  const TypeIcon = product.type === ProductType.Digital ? FileCode : Package;
  const imageUrl = getProductImageUrl(product);
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <Link
      to="/buyer/catalog/$productId"
      params={{ productId: product.id }}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-border/80 bg-surface transition-colors duration-200 hover:border-brand/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
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

      <div className="flex flex-1 flex-col gap-2.5 p-3 sm:gap-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-x-1.5 text-[10px] text-foreground-muted sm:text-[11px]">
          <span className="inline-flex items-center gap-1 font-medium text-brand">
            <TypeIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {formatProductType(product.type)}
          </span>
          <span aria-hidden="true">·</span>
          <span>{formatVariantCount(variantCount)}</span>
        </div>

        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-brand sm:text-[15px]">
          {product.name}
        </h3>

        <div className="mt-auto space-y-1.5">
          <div className="text-base font-semibold tabular-nums text-foreground sm:text-lg">
            <MoneyAmount amount={product.price} currency={product.currency ?? 'COP'} />
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] text-foreground-muted sm:text-[11px]">
              <span className={`size-1.5 rounded-full ${availability.dot}`} aria-hidden="true" />
              {availability.label}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-foreground-muted transition-colors group-hover:text-brand sm:text-[11px]">
              <span className="hidden sm:inline">Ver detalle</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
