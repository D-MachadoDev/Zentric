import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { type Category } from '../../../core';
import { Skeleton } from '@zentric/ui';

interface CategoryMeta {
  image: string;
  bg: string;
}

/**
 * Mapeo de fotografía de producto aislada de alta calidad:
 * Taxonomía Oficial de 8 Categorías Canónicas (artifacts/sara/sara.md)
 */
const CATEGORY_META_MAP: Record<string, CategoryMeta> = {
  // 1. Tecnología
  tecnologia: {
    image:
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=200&auto=format&fit=crop&q=80',
    bg: 'bg-zinc-100 dark:bg-zinc-900',
  },
  computacion: {
    image:
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=200&auto=format&fit=crop&q=80',
    bg: 'bg-zinc-100 dark:bg-zinc-900',
  },
  laptops: {
    image:
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=200&auto=format&fit=crop&q=80',
    bg: 'bg-zinc-100 dark:bg-zinc-900',
  },
  electronica: {
    image:
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=200&auto=format&fit=crop&q=80',
    bg: 'bg-zinc-100 dark:bg-zinc-900',
  },

  // 2. Audio Pro
  audio: {
    image:
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=200&auto=format&fit=crop&q=80',
    bg: 'bg-[#EFF4FA] dark:bg-sky-950/40',
  },
  sonido: {
    image:
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=200&auto=format&fit=crop&q=80',
    bg: 'bg-[#EFF4FA] dark:bg-sky-950/40',
  },
  perifericos: {
    image:
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=200&auto=format&fit=crop&q=80',
    bg: 'bg-[#EFF4FA] dark:bg-sky-950/40',
  },

  // 3. Hogar & Confort
  hogar: {
    image:
      'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=200&auto=format&fit=crop&q=80',
    bg: 'bg-[#F5F2EC] dark:bg-amber-950/40',
  },
  confort: {
    image:
      'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=200&auto=format&fit=crop&q=80',
    bg: 'bg-[#F5F2EC] dark:bg-amber-950/40',
  },

  // 4. Moda & Calzado
  moda: {
    image:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&auto=format&fit=crop&q=80',
    bg: 'bg-[#FDEDEC] dark:bg-red-950/40',
  },
  calzado: {
    image:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&auto=format&fit=crop&q=80',
    bg: 'bg-[#FDEDEC] dark:bg-red-950/40',
  },
  sneakers: {
    image:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&auto=format&fit=crop&q=80',
    bg: 'bg-[#FDEDEC] dark:bg-red-950/40',
  },

  // 5. Deportes
  deportes: {
    image:
      'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=200&auto=format&fit=crop&q=80',
    bg: 'bg-[#EBF5FB] dark:bg-blue-950/40',
  },
  fitness: {
    image:
      'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=200&auto=format&fit=crop&q=80',
    bg: 'bg-[#EBF5FB] dark:bg-blue-950/40',
  },

  // 6. Café & Despensa
  supermercado: {
    image:
      'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=200&auto=format&fit=crop&q=80',
    bg: 'bg-[#FEF9E7] dark:bg-yellow-950/40',
  },
  cafe: {
    image:
      'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=200&auto=format&fit=crop&q=80',
    bg: 'bg-[#FEF9E7] dark:bg-yellow-950/40',
  },
  despensa: {
    image:
      'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=200&auto=format&fit=crop&q=80',
    bg: 'bg-[#FEF9E7] dark:bg-yellow-950/40',
  },

  // 7. Servicios Digitales
  digital: {
    image:
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=200&auto=format&fit=crop&q=80',
    bg: 'bg-[#F4ECF7] dark:bg-purple-950/40',
  },
  suscripciones: {
    image:
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=200&auto=format&fit=crop&q=80',
    bg: 'bg-[#F4ECF7] dark:bg-purple-950/40',
  },

  // 8. Belleza & Cuidado
  belleza: {
    image:
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=200&auto=format&fit=crop&q=80',
    bg: 'bg-[#FDF2E9] dark:bg-rose-950/40',
  },
  cuidado: {
    image:
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=200&auto=format&fit=crop&q=80',
    bg: 'bg-[#FDF2E9] dark:bg-rose-950/40',
  },

  // 9. Oficina & Papelería
  oficina: {
    image:
      'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=200&auto=format&fit=crop&q=80',
    bg: 'bg-[#EAECEE] dark:bg-slate-900',
  },
  papeleria: {
    image:
      'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=200&auto=format&fit=crop&q=80',
    bg: 'bg-[#EAECEE] dark:bg-slate-900',
  },

  // 10. Varios & Novedades
  otros: {
    image:
      'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=200&auto=format&fit=crop&q=80',
    bg: 'bg-zinc-100 dark:bg-zinc-900',
  },
  varios: {
    image:
      'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=200&auto=format&fit=crop&q=80',
    bg: 'bg-zinc-100 dark:bg-zinc-900',
  },
  novedades: {
    image:
      'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=200&auto=format&fit=crop&q=80',
    bg: 'bg-zinc-100 dark:bg-zinc-900',
  },
};

const DEFAULT_CATEGORY_META: CategoryMeta = {
  image:
    'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=200&auto=format&fit=crop&q=80',
  bg: 'bg-zinc-100 dark:bg-zinc-900',
};

function getCategoryMeta(nameOrId: string): CategoryMeta {
  const norm = nameOrId.toLowerCase().trim();
  for (const [key, meta] of Object.entries(CATEGORY_META_MAP)) {
    if (norm.includes(key)) return meta;
  }
  return DEFAULT_CATEGORY_META;
}

const CANONICAL_CATEGORIES: Category[] = [
  { id: 'tecnologia', name: 'Tecnología', productCount: 420 },
  { id: 'audio', name: 'Audio Pro', productCount: 180 },
  { id: 'hogar', name: 'Hogar & Confort', productCount: 230 },
  { id: 'moda', name: 'Moda & Calzado', productCount: 310 },
  { id: 'deportes', name: 'Deportes', productCount: 140 },
  { id: 'supermercado', name: 'Café & Despensa', productCount: 95 },
  { id: 'belleza', name: 'Belleza & Cuidado', productCount: 165 },
  { id: 'oficina', name: 'Oficina & Papelería', productCount: 120 },
  { id: 'digital', name: 'Servicios Digitales', productCount: 60 },
  { id: 'otros', name: 'Varios & Novedades', productCount: 110 },
];

export interface CategoryCircleRailProps {
  categories: Category[];
  selectedCategory?: string;
  onSelectCategory: (categoryId: string) => void;
  onViewAll?: () => void;
  isLoading?: boolean;
}

/**
 * Riel de Categorías Circulares con Layout Adaptativo de 3 Estados (PLAN.md §6.2.4):
 * - Estado 1 (1 categoría): Micro-banner de colección activa especializada.
 * - Estado 2 (2 a 4 categorías): Flex balanceado y centrado simétricamente sin flechas de scroll.
 * - Estado 3 (5 o más categorías): Riel horizontal con scroll snap y flechas flotantes.
 */
export function CategoryCircleRail({
  categories,
  selectedCategory,
  onSelectCategory,
  onViewAll: _onViewAll,
  isLoading,
}: CategoryCircleRailProps) {
  const railRef = useRef<HTMLDivElement>(null);

  if (isLoading) {
    return (
      <section aria-label="Explorar por Categorías" className="w-full pt-0 pb-1 mb-1 sm:mb-2">
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-5 w-44 rounded-md" />
          <Skeleton className="h-4 w-40 rounded-md hidden sm:block" />
        </div>
        <div className="-mx-4 px-4 sm:mx-0 sm:px-0 flex items-center gap-3 sm:gap-5 overflow-x-auto no-scrollbar scroll-smooth py-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              data-testid="category-circle-skeleton"
              className="flex flex-col items-center gap-1.5 sm:gap-2 shrink-0"
            >
              <Skeleton className="size-16 sm:size-20 rounded-full bg-slate-200 dark:bg-zinc-800" />
              <Skeleton className="h-3 w-12 sm:w-14 rounded-md" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  // Estado 1: Exactamente 1 categoría -> Micro-banner de colección activa especializada
  if (categories && categories.length === 1) {
    const singleCat = categories[0];
    if (!singleCat) return null;
    const count = singleCat.productCount ?? 0;
    return (
      <section aria-label="Explorar por Categorías" className="w-full pt-0 pb-1 mb-2">
        <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5 text-xs text-zinc-900 dark:text-zinc-100">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="font-semibold">
              Explorando catálogo especializado: {singleCat.name}
            </span>
          </div>
          <span className="text-zinc-500 dark:text-zinc-400">
            {count > 0 ? `${count} referencias disponibles` : 'Disponibilidad inmediata'}
          </span>
        </div>
      </section>
    );
  }

  const itemsToRender =
    categories && categories.length > 1 ? categories : CANONICAL_CATEGORIES;

  const totalCount = itemsToRender.reduce((acc, cat) => acc + (cat.productCount ?? 0), 0);
  const subtitleText =
    totalCount > 0
      ? `${totalCount.toLocaleString('es-CO')} referencias con stock inmediato`
      : 'Disponibilidad inmediata';

  const isCompactLayout = itemsToRender.length >= 2 && itemsToRender.length <= 4;

  const scrollStep = (direction: -1 | 1) => {
    railRef.current?.scrollBy({ left: direction * 240, behavior: 'smooth' });
  };

  return (
    <section aria-label="Explorar por Categorías" className="relative w-full pt-0 pb-1 mb-1 sm:mb-2 group/rail">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
            Explorar por Categoría
          </h2>
          <span className="sr-only">Categorías Principales</span>
        </div>
        <span className="text-xs text-zinc-400 font-medium hidden sm:inline">
          {subtitleText}
        </span>
      </div>

      <div className="relative">
        {/* Flecha Flotante Izquierda Desktop (solo en modo riel >= 5) */}
        {!isCompactLayout && (
          <button
            type="button"
            onClick={() => scrollStep(-1)}
            className="hidden lg:flex absolute -left-3.5 top-1/2 -translate-y-1/2 z-20 h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-md text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all opacity-0 group-hover/rail:opacity-100 cursor-pointer"
            aria-label="Desplazar categorías a la izquierda"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        <div
          ref={railRef}
          className={
            isCompactLayout
              ? 'flex items-center justify-center sm:justify-start gap-4 sm:gap-8 py-1 overflow-x-auto no-scrollbar'
              : '-mx-4 px-4 sm:mx-0 sm:px-0 flex items-center gap-3 sm:gap-4 md:gap-5 lg:gap-6 xl:gap-8 xl:justify-between overflow-x-auto no-scrollbar scroll-smooth py-1'
          }
        >
          {itemsToRender.slice(0, 10).map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const meta = getCategoryMeta(cat.id + ' ' + cat.name);

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className="group flex flex-col items-center shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-full p-0.5 sm:p-1 transition-all"
                aria-label={`Filtrar por categoría ${cat.name}`}
              >
                <div
                  className={`relative size-16 sm:size-20 rounded-full overflow-hidden p-1 flex items-center justify-center shadow-2xs transition-all duration-300 ${meta.bg} ${
                    isSelected
                      ? 'border-2 border-emerald-500 ring-2 ring-emerald-500/20 scale-105 shadow-sm'
                      : 'border border-zinc-200 dark:border-zinc-800 group-hover:scale-105 group-hover:border-zinc-400 dark:group-hover:border-zinc-600'
                  }`}
                >
                  <img
                    src={meta.image}
                    alt={cat.name}
                    loading="lazy"
                    className="size-full object-cover rounded-full transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <span
                  className={`text-[11px] sm:text-xs font-medium text-center line-clamp-1 max-w-[68px] sm:max-w-[80px] mt-1.5 transition-colors ${
                    isSelected
                      ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                      : 'text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white'
                  }`}
                >
                  {cat.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Flecha Flotante Derecha Desktop (solo en modo riel >= 5) */}
        {!isCompactLayout && (
          <button
            type="button"
            onClick={() => scrollStep(1)}
            className="hidden lg:flex absolute -right-3.5 top-1/2 -translate-y-1/2 z-20 h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-md text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all opacity-0 group-hover/rail:opacity-100 cursor-pointer"
            aria-label="Desplazar categorías a la derecha"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </section>
  );
}
