import type { ComponentType } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { Activity, X } from 'lucide-react';
import { LogoMark } from '@zentric/ui/logo';
import { Button } from '@zentric/ui/components/ui/button';

export interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

interface LayoutSidebarProps {
  items: NavItem[];
  homeHref: string;
  isOpen?: boolean;
  onClose?: () => void;
}

/**
 * Barra lateral de navegación responsiva (C4-4-Codigo-React.md §2 y Frontend-Design-System §2).
 *
 * Aplica:
 * - Superficie primaria en `#111827` con borde `#1F293D`.
 * - Acento de selección en esmeralda `#00D4AA`.
 * - Persistente en escritorio (>900px), modo drawer colapsable en móvil.
 * - Iconografía funcional de Lucide y tipografía Geist Sans.
 */
export function LayoutSidebar({ items, homeHref, isOpen = false, onClose }: LayoutSidebarProps) {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  return (
    <>
      {/* Overlay oscuro para vista móvil */}
      {isOpen && (
        <div
          role="presentation"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs md:hidden"
        />
      )}

      <aside
        aria-label="Navegación lateral del módulo"
        className={`fixed top-0 bottom-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-surface transition-transform duration-200 ease-out md:static md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Cabecera del sidebar con Logo */}
        <div className="flex h-16 items-center justify-between border-b border-border-subtle px-5">
          <Link to={homeHref as never} className="flex items-center gap-2" onClick={onClose}>
            <LogoMark className="size-6 text-brand" />
            <span className="font-bold tracking-tight text-foreground">Zentric</span>
          </Link>

          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label="Cerrar navegación"
              className="text-foreground-muted hover:text-foreground md:hidden"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Lista de enlaces de navegación */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive =
              currentPath === item.href || (item.href !== homeHref && currentPath.startsWith(item.href));

            return (
              <Link
                key={item.href}
                to={item.href as never}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border border-brand/20 bg-brand/10 text-brand font-semibold shadow-xs'
                    : 'text-foreground-muted hover:bg-surface-muted hover:text-foreground'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-brand' : 'text-foreground-subtle'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Pie del sidebar con telemetría de salud */}
        <div className="border-t border-border-subtle p-3">
          <Link
            to="/health"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-xs text-foreground-subtle hover:bg-surface-muted hover:text-foreground-muted"
          >
            <Activity className="h-3.5 w-3.5 text-success" />
            <span>Telemetría de Red</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
