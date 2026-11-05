import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight, CheckCircle2, Flame, ImageOff } from 'lucide-react';
import { MoneyAmount } from '@zentric/ui';
import type { Product } from '../../../core';
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
 * Tarjeta compacta del carrusel de populares:
 * Espaciado respirable, tipografía Sans limpia y precio en cifras tabulares legibles.
 */
export function ProductRailCard({ product }: ProductRailCardProps) {
  const availability = resolveProductAvailability(product);
  const variantCount = product.variants?.length ?? 1;
  const sku = resolvePrimarySku(product);
  const imageUrl = getProductImageUrl(product);
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <Link
      to="/buyer/catalog/$productId"
      params={{ productId: product.id }}
      className="group relative flex w-72 shrink-0 flex-col overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-xs transition-all duration-300 ease-out hover:border-brand/60 hover:shadow-md motion-safe:hover:-translate-y-1"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-surface-muted/50">
        {imageFailed ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-foreground-muted">
            <ImageOff className="h-8 w-8 text-foreground-subtle" aria-hidden="true" />
            <span className="text-xs">Imagen no disponible</span>
          </div>
        ) : (
          <img
            src={imageUrl}
            alt={product.name}
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover object-center motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out motion-safe:group-hover:scale-105"
          />
        )}
        <div className="absolute top-2.5 left-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-surface/90 px-2.5 py-1 text-xs font-semibold text-brand shadow-xs backdrop-blur-md">
            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
            Envío Asegurado
          </span>
        </div>
        {availability === 'low-stock' && (
          <div className="absolute bottom-2.5 left-2.5">
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-600 px-2.5 py-0.5 text-xs font-bold text-white shadow-xs">
              <Flame className="h-3 w-3" aria-hidden="true" />
              ¡Últimas unidades!
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between gap-3 p-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-x-1.5 text-xs text-foreground-muted">
            <span className="font-semibold text-brand">{formatProductType(product.type)}</span>
            <span aria-hidden="true">·</span>
            <span>{formatVariantCount(variantCount)}</span>
            {sku && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-xs text-foreground-subtle">{sku}</span>
              </>
            )}
          </div>
          <h3 className="line-clamp-1 text-sm font-bold text-foreground transition-colors group-hover:text-brand">
            {product.name}
          </h3>
        </div>

        <div className="flex items-center justify-between border-t border-border/70 pt-2.5">
          <div>
            <span className="text-xs font-medium text-foreground-muted uppercase tracking-wider">
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
