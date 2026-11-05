import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight, CheckCircle2, FileCode, Flame, ImageOff, Package, XCircle, Zap } from 'lucide-react';
import { Badge, MoneyAmount } from '@zentric/ui';
import { ProductType, type Product } from '../../../core';
import { getProductImageUrl } from '../productImages';
import {
  formatProductType,
  formatVariantCount,
  resolvePrimarySku,
  resolveProductAvailability,
  type ProductAvailability,
} from './productPresentation';

interface AvailabilityPresentation {
  label: string;
  className: string;
  variant: 'default' | 'success' | 'warning' | 'danger';
  Icon: typeof CheckCircle2;
}

const AVAILABILITY: Record<
  Exclude<ProductAvailability, 'digital'>,
  AvailabilityPresentation
> = {
  'in-stock': {
    label: 'En Stock',
    className: '!bg-emerald-600 !text-white !border-transparent font-medium shadow-xs',
    variant: 'default',
    Icon: CheckCircle2,
  },
  'low-stock': {
    label: '¡Últimas unidades!',
    className: '!bg-amber-600 !text-white !border-transparent font-medium shadow-xs',
    variant: 'default',
    Icon: Flame,
  },
  'out-of-stock': {
    label: 'Agotado',
    className: '!bg-rose-600 !text-white !border-transparent font-medium shadow-xs',
    variant: 'default',
    Icon: XCircle,
  },
};

interface ProductCardProps {
  product: Product;
}

/**
 * Tarjeta comercial de la grilla de productos:
 * Proporciones limpias, tipografía Sans legible y precio destacado con cifras tabulares.
 */
export function ProductCard({ product }: ProductCardProps) {
  const availability = resolveProductAvailability(product);
  const variantCount = product.variants?.length ?? 1;
  const sku = resolvePrimarySku(product);
  const availabilityBadge = availability === 'digital' ? null : AVAILABILITY[availability];
  const TypeIcon = product.type === ProductType.Digital ? FileCode : Package;
  const imageUrl = getProductImageUrl(product);
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <Link
      to="/buyer/catalog/$productId"
      params={{ productId: product.id }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-xs transition-all duration-200 ease-out hover:border-brand/50 hover:shadow-md motion-safe:hover:-translate-y-0.5"
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

        <div className="absolute top-3 right-3">
          {availabilityBadge ? (
            <Badge variant={availabilityBadge.variant} className={`text-xs px-2.5 py-0.5 shadow-xs ${availabilityBadge.className}`}>
              <availabilityBadge.Icon className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
              {availabilityBadge.label}
            </Badge>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md bg-brand px-2.5 py-0.5 text-xs font-semibold text-primary-foreground shadow-xs">
              <Zap className="h-3.5 w-3.5" aria-hidden="true" />
              Entrega Inmediata
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between gap-3 p-5">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-foreground-muted">
            <span className="inline-flex items-center gap-1 font-semibold text-brand">
              <TypeIcon className="h-3.5 w-3.5" aria-hidden="true" />
              {formatProductType(product.type)}
            </span>
            <span aria-hidden="true">·</span>
            <span>{formatVariantCount(variantCount)}</span>
            {sku && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-xs text-foreground-subtle">
                  SKU: {sku}
                </span>
              </>
            )}
          </div>

          <h3 className="line-clamp-2 text-base leading-snug font-bold text-foreground transition-colors group-hover:text-brand">
            {product.name}
          </h3>

          <p className="line-clamp-2 text-xs leading-relaxed text-foreground-muted">
            {product.description || 'Sin descripción detallada del vendedor.'}
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-border/70 pt-3">
          <div className="space-y-0.5">
            <span className="text-xs font-medium text-foreground-muted uppercase tracking-wider">
              Precio
            </span>
            <div className="text-lg font-bold text-foreground">
              <MoneyAmount amount={product.price} currency={product.currency ?? 'COP'} />
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-xl bg-surface-muted px-3.5 py-1.5 text-xs font-semibold text-brand transition-colors group-hover:bg-brand group-hover:text-primary-foreground">
            Ver detalle
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  );
}
