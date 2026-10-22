import { Link } from '@tanstack/react-router';
import { ArrowRight, CheckCircle2, FileCode, Flame, Package, XCircle, Zap } from 'lucide-react';
import { Badge, MoneyAmount } from '@zentric/ui';
import type { Product } from '../../../domain';
import { getProductImageUrl } from '../productImages';
import {
  formatProductType,
  formatVariantCount,
  resolveProductAvailability,
  type ProductAvailability,
} from './productPresentation';

interface AvailabilityPresentation {
  label: string;
  className: string;
  variant: 'success' | 'warning' | 'danger';
  Icon: typeof CheckCircle2;
}

/**
 * El color de la insignia de disponibilidad es informacion, no decoracion
 * (AGENTS.md 4.14): verde solo para disponible, ambar solo para escasez y rojo
 * solo para agotado. Las insignias van solidas porque se leen sobre fotografia.
 */
const AVAILABILITY: Record<
  Exclude<ProductAvailability, 'digital'>,
  AvailabilityPresentation
> = {
  'in-stock': {
    label: 'En Stock',
    className: 'border-transparent bg-success/95 text-background',
    variant: 'success',
    Icon: CheckCircle2,
  },
  'low-stock': {
    label: '¡Últimas unidades!',
    className: 'border-transparent bg-warning/95 text-background',
    variant: 'warning',
    Icon: Flame,
  },
  'out-of-stock': {
    label: 'Agotado',
    className: 'border-transparent bg-danger/90 text-white',
    variant: 'danger',
    Icon: XCircle,
  },
};

interface ProductCardProps {
  product: Product;
}

/**
 * Tarjeta comercial de la grilla "Todos los productos".
 *
 * Toda la tarjeta es clicable, el precio viaja siempre en Geist Mono con cifras
 * tabulares y la jerarquia se ordena tipo -> nombre -> descripcion -> precio.
 */
export function ProductCard({ product }: ProductCardProps) {
  const availability = resolveProductAvailability(product);
  const variantCount = product.variants?.length ?? 1;
  const availabilityBadge = availability === 'digital' ? null : AVAILABILITY[availability];

  return (
    <Link
      to="/buyer/catalog/$productId"
      params={{ productId: product.id }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-[transform,box-shadow,border-color] duration-200 ease-out hover:border-brand/50 hover:shadow-lg motion-safe:hover:-translate-y-0.5"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-surface-muted">
        <img
          src={getProductImageUrl(product)}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover object-center outline-1 -outline-offset-1 outline-black/10 motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out motion-safe:group-hover:scale-[1.04] dark:outline-white/10"
        />

        <div className="absolute top-3 right-3">
          {availabilityBadge ? (
            <Badge variant={availabilityBadge.variant} className={`shadow-xs ${availabilityBadge.className}`}>
              <availabilityBadge.Icon className="h-3 w-3" aria-hidden="true" />
              {availabilityBadge.label}
            </Badge>
          ) : (
            /* El color de este icono pertenece al bloque S6: sin cambios aqui. */
            <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/90 px-2 py-0.5 text-[10px] font-semibold text-white shadow-xs">
              <Zap className="h-3 w-3" aria-hidden="true" />
              Entrega Inmediata
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between gap-3 p-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-foreground-muted">
            {availability === 'digital' ? (
              <span className="inline-flex items-center gap-1 font-medium text-brand">
                <FileCode className="h-3 w-3" aria-hidden="true" />
                {formatProductType(product.type)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-medium text-brand">
                <Package className="h-3 w-3" aria-hidden="true" />
                {formatProductType(product.type)}
              </span>
            )}
            <span aria-hidden="true">·</span>
            <span>{formatVariantCount(variantCount)}</span>
          </div>

          <h3 className="line-clamp-2 text-base leading-snug font-semibold text-foreground transition-colors group-hover:text-brand">
            {product.name}
          </h3>

          <p className="line-clamp-2 text-xs leading-relaxed text-foreground-muted">
            {product.description || 'Sin descripción detallada del vendedor.'}
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3">
          <div className="space-y-0.5">
            <span className="font-mono text-[10px] tracking-wider text-foreground-muted uppercase">
              Precio
            </span>
            <div className="text-lg font-bold text-foreground">
              <MoneyAmount amount={product.price} currency={product.currency ?? 'COP'} />
            </div>
          </div>

          <span className="inline-flex items-center gap-1 rounded-lg bg-surface-muted px-3 py-1.5 text-xs font-semibold text-brand transition-colors group-hover:bg-brand group-hover:text-background">
            Ver
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  );
}
