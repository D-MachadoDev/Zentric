import { Link, useRouterState } from '@tanstack/react-router';
import { LogoWordmark } from '@zentric/ui/logo';
import { ArrowLeft } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

/**
 * Cabecera pública unificada, minimalista y libre de distracciones.
 * Presenta exclusivamente el wordmark tipográfico "zentric.", enlace de retorno sutil a la tienda y ThemeToggle.
 * Erradica barras de navegación accesorias o elementos redundantes.
 */
export function PublicHeader() {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const isBuyer = currentPath === '/buyer';

  return (
    <header className="relative z-20 flex h-14 sm:h-16 items-center justify-between border-b border-border/80 bg-surface/90 px-4 sm:px-8 backdrop-blur-md transition-colors">
      <div className="flex items-center gap-3">
        <Link
          to="/buyer"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
          aria-label="Zentric - Inicio"
        >
          <LogoWordmark className="text-2xl font-bold tracking-tight text-foreground" />
        </Link>
        {!isBuyer && (
          <Link
            to="/buyer"
            className="inline-flex items-center gap-1.5 ml-2 sm:ml-3 pl-2 sm:pl-3 border-l border-border text-xs font-medium text-foreground-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            <span>Volver a la tienda</span>
          </Link>
        )}
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />
      </div>
    </header>
  );
}
