import { Link, useRouterState } from '@tanstack/react-router';
import { Logo } from '@zentric/ui/logo';
import { ShoppingBag, Building2, Activity } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

/**
 * Cabecera pública unificada para pantallas institucionales, de login y acceso operativo.
 * Provee navegación clara entre la tienda de compradores, el portal corporativo y telemetría de salud,
 * incorporando conmutación de tema y diseño segmentado de alto contraste.
 */
export function PublicHeader() {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const isBuyer = currentPath.startsWith('/buyer');
  const isCorporate = currentPath === '/acceso-corporativo';
  const isHealth = currentPath === '/health';

  return (
    <header className="relative z-20 flex min-h-16 sm:min-h-[4.25rem] items-center justify-between border-b border-border bg-surface/95 px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 backdrop-blur-md overscroll-contain transition-colors">
      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
          aria-label="Zentric - Inicio"
        >
          <Logo className="h-8 sm:h-9" />
        </Link>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* Navegación segmentada de acceso institucional */}
        <nav
          aria-label="Navegación pública institucional"
          className="flex items-center gap-1 sm:gap-1.5 rounded-full border border-border/80 bg-background/80 p-1 sm:p-1.5 shadow-2xs backdrop-blur-xs"
        >
          <Link
            to="/buyer"
            aria-current={isBuyer ? 'page' : undefined}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 sm:px-4 py-1.5 text-xs sm:text-[13px] font-medium leading-normal transition-all ${
              isBuyer
                ? 'bg-brand text-primary-foreground font-semibold shadow-xs'
                : 'text-foreground-muted hover:text-foreground hover:bg-surface-muted'
            }`}
          >
            <ShoppingBag className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">Tienda Compradores</span>
            <span className="sm:hidden">Tienda</span>
          </Link>

          <Link
            to="/acceso-corporativo"
            aria-current={isCorporate ? 'page' : undefined}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 sm:px-4 py-1.5 text-xs sm:text-[13px] font-medium leading-normal transition-all ${
              isCorporate
                ? 'bg-brand text-primary-foreground font-semibold shadow-xs'
                : 'text-foreground-muted hover:text-foreground hover:bg-surface-muted'
            }`}
          >
            <Building2 className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="hidden md:inline">Acceso Vendedores</span>
            <span className="md:hidden">Vendedores</span>
          </Link>

          <Link
            to="/health"
            aria-current={isHealth ? 'page' : undefined}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 sm:px-4 py-1.5 text-xs sm:text-[13px] font-medium leading-normal transition-all ${
              isHealth
                ? 'bg-brand text-primary-foreground font-semibold shadow-xs'
                : 'text-foreground-muted hover:text-foreground hover:bg-surface-muted'
            }`}
          >
            <span className="relative flex size-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            <Activity className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">Estado del Sistema</span>
            <span className="sm:hidden">Estado</span>
          </Link>
        </nav>

        <div className="h-6 w-px bg-border/80 hidden sm:block" aria-hidden="true" />

        {/* Selector de tema Porcelana / Grafito */}
        <ThemeToggle />
      </div>
    </header>
  );
}
