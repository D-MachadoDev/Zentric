import { ShieldCheck, ChevronRight } from 'lucide-react';

export interface OfficialStore {
  id: string;
  name: string;
  brandQuery: string;
  badge?: string;
  sector?: string;
  description?: string;
  logoText: string;
  actionText?: string;
}

const DEFAULT_OFFICIAL_STORES: OfficialStore[] = [
  {
    id: 'store-bosch',
    name: 'Bosch Profesional',
    brandQuery: 'Bosch Profesional',
    badge: 'Despacho 24h',
    logoText: 'BOSCH',
  },
  {
    id: 'store-apple',
    name: 'Apple Authorized',
    brandQuery: 'Apple Authorized',
    badge: 'AppleCare Oficial',
    logoText: 'APPLE',
  },
  {
    id: 'store-samsung',
    name: 'Samsung Enterprise',
    brandQuery: 'Samsung Enterprise',
    badge: 'Knox Security',
    logoText: 'SAMSUNG',
  },
  {
    id: 'store-3m',
    name: '3M Seguridad EPP',
    brandQuery: '3M Seguridad EPP',
    badge: 'Certificación ANSI',
    logoText: '3M',
  },
];

export interface OfficialStoresRailProps {
  stores?: OfficialStore[];
  onSelectStore: (storeBrand: string) => void;
  onViewAll?: () => void;
}

/**
 * Riel de Tiendas Oficiales (Carrusel Horizontal Minimalista):
 * Enfoque monocromático y limpio con logos de fabricantes, insignias de verificación
 * y hover sutil, erradicando descripciones largas y tarjetas complejas.
 */
export function OfficialStoresRail({
  stores = DEFAULT_OFFICIAL_STORES,
  onSelectStore,
  onViewAll,
}: OfficialStoresRailProps) {
  return (
    <section
      aria-label="Tiendas oficiales"
      className="py-4 sm:py-6 border-t border-zinc-200 dark:border-zinc-800"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
            Tiendas Oficiales en Zentric
          </h2>
          <p className="text-[11px] sm:text-xs text-foreground-muted">
            Marcas y distribuidores autorizados con inventario reservado en bodega
          </p>
        </div>
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1 transition-colors"
          >
            Ver todas
            <ChevronRight className="size-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto no-scrollbar py-1">
        {stores.map((store) => (
          <button
            key={store.id}
            type="button"
            onClick={() => onSelectStore(store.brandQuery)}
            aria-label={`Ver Catálogo ${store.name}`}
            className="group flex items-center gap-3 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-zinc-400 dark:hover:border-zinc-600 hover:shadow-xs transition-all shrink-0 cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            {/* Logo de Marca Monocromático */}
            <div
              aria-hidden="true"
              className="size-9 sm:size-10 shrink-0 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center font-bold text-xs tracking-wider text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-700/80 group-hover:scale-105 transition-transform"
            >
              {store.logoText}
            </div>

            {/* Nombre y Verificación */}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  <span className="sr-only">Ver Catálogo </span>
                  {store.name}
                </span>
                <ShieldCheck
                  className="size-3.5 text-emerald-500 shrink-0"
                  aria-label="Verificado"
                />
              </div>
              {store.badge && (
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium block truncate">
                  {store.badge}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
