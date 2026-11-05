import { useMemo, useRef } from 'react';
import { ArrowRight, Clock } from 'lucide-react';
import { Button, Skeleton } from '@zentric/ui';
import { getDefaultSession } from '../../../core';
import { useRecentlyViewedQuery } from '../../../core';
import type { Product } from '../../../core';
import { getRecentlyViewedProducts } from '../productImages';
import { ProductRailCard } from './ProductRailCard';

interface RecentlyViewedCarouselProps {
  title?: string;
  maxItems?: number;
}

const SCROLL_STEP_PX = 320;

/**
 * Banda de productos vistos recientemente.
 *
 * Una sola fuente de verdad por visitante: con sesión manda el historial del
 * backend (aislado por usuario); como invitado se usa el historial local que
 * ya guardaba la ficha. Reutiliza `ProductRailCard` para no inventar una
 * tarjeta paralela, y no pinta contenedores propios porque vive dentro de la
 * página, que ya aporta el ancho y el ritmo vertical.
 */
export function RecentlyViewedCarousel({
  title = 'Vistos Recientemente por Ti',
  maxItems = 10,
}: RecentlyViewedCarouselProps) {
  const hasActiveSession = Boolean(getDefaultSession()?.getAccessToken() ?? null);
  const { data, isLoading, isError, refetch } = useRecentlyViewedQuery(maxItems, undefined, {
    enabled: hasActiveSession,
  });
  const localHistory = useMemo(() => getRecentlyViewedProducts(), []);

  // Con sesion el historial es del backend. Si la API falla se muestra el error
  // y nunca el historial local: hacerlo pasar por datos reales confunde y, con
  // el servidor caido, dejaria la banda como lo unico "vivo" de la pagina.
  const products = useMemo<Product[]>(() => {
    if (!hasActiveSession) return localHistory.slice(0, maxItems);
    if (isError || !data) return [];
    return data.slice(0, maxItems);
  }, [data, hasActiveSession, isError, localHistory, maxItems]);

  const railRef = useRef<HTMLDivElement>(null);
  const scrollStep = (direction: -1 | 1) => {
    railRef.current?.scrollBy({ left: direction * SCROLL_STEP_PX, behavior: 'smooth' });
  };

  const hasProducts = products.length > 0;

  return (
    <section aria-label={title} className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-brand" aria-hidden="true" />
          <h2 className="text-lg font-bold text-foreground sm:text-xl">{title}</h2>
        </div>
        {hasProducts && (
          <div className="hidden items-center gap-2 sm:flex">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="rounded-full"
              aria-label="Desplazar a la izquierda"
              onClick={() => scrollStep(-1)}
            >
              <ArrowRight className="h-4 w-4 rotate-180" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="rounded-full"
              aria-label="Desplazar a la derecha"
              onClick={() => scrollStep(1)}
            >
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        )}
      </div>

      {isLoading && !hasProducts ? (
        <div className="flex gap-4 overflow-hidden" aria-busy="true" aria-label="Cargando historial">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-64 w-72 shrink-0 rounded-2xl" />
          ))}
        </div>
      ) : hasProducts ? (
        <div
          ref={railRef}
          role="list"
          aria-label={title}
          className="flex gap-4 overflow-x-auto pb-2 scrollbar-none"
        >
          {products.map((product) => (
            <div key={product.id} role="listitem" className="shrink-0">
              <ProductRailCard product={product} />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-xl border border-dashed border-border bg-surface-muted/40 p-4">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {isError ? 'No pudimos cargar tu historial' : 'Aún no has visto productos'}
            </p>
            <p className="text-xs text-foreground-muted">
              {isError
                ? 'El resto del catálogo sigue disponible más abajo.'
                : 'Los productos que visites aparecerán aquí para que los encuentres rápido.'}
            </p>
            {isError && (
              <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
                Reintentar
              </Button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
