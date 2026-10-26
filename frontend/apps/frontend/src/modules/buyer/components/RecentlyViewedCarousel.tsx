import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { ArrowRight, Clock, RotateCcw, X } from 'lucide-react';
import { Button, MoneyAmount, Skeleton, StateView } from '@zentric/ui';
import { useRecentlyViewedQuery } from '../../../application/services/catalog';
import type { Product } from '../../../domain';
import { getProductImageUrl } from '../productImages';

interface RecentlyViewedCarouselProps {
  title?: string;
  onClearHistory?: () => void;
  maxItems?: number;
  containerId?: string;
}

const CAROUSEL_STEP_PX = 320;

export function RecentlyViewedCarousel({
  title = 'Vistos recientemente',
  onClearHistory,
  maxItems = 20,
  containerId = 'recently-viewed-rail',
}: RecentlyViewedCarouselProps) {
  const { data: products = [], isLoading, isError, refetch } = useRecentlyViewedQuery(maxItems);
  const [scrollOffset, setScrollOffset] = useState(0);

  const scrollLeft = () => setScrollOffset((prev) => Math.max(0, prev - CAROUSEL_STEP_PX));
  const scrollRight = () => setScrollOffset((prev) => prev + CAROUSEL_STEP_PX);
  const canScrollLeft = scrollOffset > 0;
  const canScrollRight = products.length > 0 && scrollOffset < (products.length - 1) * CAROUSEL_STEP_PX;
  const handleClearHistory = () => { if (onClearHistory) onClearHistory(); refetch(); };

  if (isLoading && products.length === 0) {
    return (
      <section id={containerId} className='py-6' aria-busy='true'>
        <div className='mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8'>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-lg font-semibold text-foreground'>{title}</h2>
          </div>
          <div className='flex gap-4 overflow-x-auto pb-4 scrollbar-hide' style={{ scrollBehavior: 'smooth' }}>{
            Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className='flex w-72 shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface' />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (isError || (products.length === 0 && !isLoading)) {
    return (
      <section id={containerId} className='py-6'>
        <div className='mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8'>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-lg font-semibold text-foreground'>{title}</h2>
            {products.length > 0 && onClearHistory && (
              <Button variant='ghost' size='sm' onClick={handleClearHistory} className='gap-1'>
                <X className='h-3 w-3' aria-hidden='true' />
                Limpiar historial
              </Button>
            )}
          </div>
          <StateView
            icon={Clock}
            title='Aún no has visto productos'
            description='Los productos que visites aparecerán aquí para que los encuentres rápido.'
            actionLabel={isError ? 'Reintentar' : undefined}
            onAction={isError ? refetch : undefined}
          />
        </div>
      </section>
    );
  }

  return (
    <section id={containerId} className='py-6'>
      <div className='mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8'>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-lg font-semibold text-foreground'>{title}</h2>
          <div className='flex items-center gap-2'>
            {onClearHistory && (
              <Button variant='ghost' size='sm' onClick={handleClearHistory} className='gap-1'>
                <RotateCcw className='h-3 w-3' aria-hidden='true' />
                <span className='hidden sm:inline'>Limpiar</span>
              </Button>
            )}
            <button type='button' onClick={scrollLeft} disabled={!canScrollLeft} className='inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-foreground transition-colors hover:border-brand/40 hover:text-brand disabled:cursor-not-allowed disabled:opacity-40' aria-label='Desplazar a la izquierda'>
              <ArrowRight className='h-4 w-4 rotate-180' aria-hidden='true' />
            </button>
            <button type='button' onClick={scrollRight} disabled={!canScrollRight} className='inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-foreground transition-colors hover:border-brand/40 hover:text-brand disabled:cursor-not-allowed disabled:opacity-40' aria-label='Desplazar a la derecha'>
              <ArrowRight className='h-4 w-4' aria-hidden='true' />
            </button>
          </div>
        </div>

        <div className='flex gap-4 overflow-x-auto pb-4 scrollbar-hide' role='list' aria-label={title} style={{ scrollBehavior: 'smooth', transform: 	ranslateX(-px) }}>{
          products.map((product: Product) => (
            <RecentProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}

function RecentProductCard({ product }: { product: Product }) {
  return (
    <Link to='/buyer/catalog/' params={{ productId: product.id }} className='group relative flex w-72 shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-[transform,box-shadow,border-color] duration-300 ease-out hover:border-brand/60 hover:shadow-lg motion-safe:hover:-translate-y-1' role='listitem'>
      <div className='relative aspect-[16/10] w-full overflow-hidden bg-surface-muted'>
        <img src={getProductImageUrl(product)} alt={product.name} loading='lazy' className='h-full w-full object-cover object-center outline-1 -outline-offset-1 outline-black/10 motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out motion-safe:group-hover:scale-105 dark:outline-white/10' />
      </div>
      <div className='flex flex-1 flex-col justify-between gap-3 p-4'>
        <div className='space-y-1'>
          <h3 className='line-clamp-1 text-sm font-semibold text-foreground transition-colors group-hover:text-brand'>{product.name}</h3>
        </div>
        <div className='flex items-center justify-between border-t border-border pt-2'>
          <div>
            <span className='font-mono text-[10px] tracking-wider text-foreground-muted uppercase'>Precio</span>
            <div className='text-base font-bold text-foreground'><MoneyAmount amount={product.price} currency={product.currency ?? 'COP'} /></div>
          </div>
          <span className='inline-flex items-center gap-1 text-xs font-semibold text-brand group-hover:underline'>Ver ficha <ArrowRight className='h-3.5 w-3.5' aria-hidden='true' /></span>
        </div>
      </div>
    </Link>
  );
}
