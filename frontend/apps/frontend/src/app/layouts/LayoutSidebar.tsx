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

export interface NavGroup {
  /** Rótulo mono-caps del grupo (Frontend-Design-System §9.6). */
  label: string;
  items: NavItem[];
}

interface LayoutSidebarProps {
  /** Sección superior sin rótulo (elemento ancla del módulo). */
  items?: NavItem[];
  /** Secciones agrupadas con rótulo mono-caps (Estudio / Sala de Libros). */
  groups?: NavGroup[];
  homeHref: string;
  isOpen?: boolean;
  onClose?: () => void;
  /**
   * persistent: drawer en móvil + barra estática en escritorio (Estudio, Sala
   * de Libros). drawer: SOLO overlay móvil, se desmonta cuando está cerrado
   * (Centro de Mando y Tablero de Colas usan otra navegación de escritorio y
   * no pueden duplicar etiquetas en el árbol de accesibilidad).
   */
  variant?: 'persistent' | 'drawer';
  /** w-64 por defecto; narrow = w-56 para el índice forense del Supervisor. */
  width?: 'default' | 'narrow';
}

/**
 * Barra lateral de navegación responsiva (C4-4-Codigo-React.md §2 y Frontend-Design-System §9.6).
 *
 * Aplica:
 * - Identidad de rol por herencia: el acento de selección y el logo toman
 *   --brand del scope [data-role] del layout que la hospeda.
 * - Grupos mono-caps con rótulo accesible para los shells operativos.
 * - Variantes persistent/drawer: el drawer se DESMONTA al cerrarse para no
 *   duplicar la navegación de escritorio en lectores de pantalla.
 * - Iconografía funcional de Lucide y tipografía Geist.
 */
export function LayoutSidebar({
  items,
  groups,
  homeHref,
  isOpen = false,
  onClose,
  variant = 'persistent',
  width = 'default',
}: LayoutSidebarProps) {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const sections: NavGroup[] = [
    ...(items ? [{ label: '', items }] : []),
    ...(groups ?? []),
  ];

  const isDrawer = variant === 'drawer';
  const widthClass = width === 'narrow' ? 'w-56' : 'w-64';

  // Drawer puro: cerrado = desmontado. Evita duplicar etiquetas de navegación
  // cuando el shell de escritorio ya expone las suyas (tests RTL y a11y).
  if (isDrawer && !isOpen) return null;

  const renderLink = (item: NavItem) => {
    const Icon = item.icon;
    const isActive =
      currentPath === item.href || (item.href !== homeHref && currentPath.startsWith(item.href));

    return (
      <Link
        key={item.href}
        to={item.href as never}
        onClick={onClose}
        aria-current={isActive ? 'page' : undefined}
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive
            ? 'border border-brand/20 bg-brand/10 text-brand font-semibold shadow-xs'
            : 'text-foreground-muted hover:bg-surface-muted hover:text-foreground'
        }`}
      >
        <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-brand' : 'text-foreground-subtle'}`} />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  };

  return (
    <>
      {/* Overlay oscuro para vista móvil */}
      {isOpen && (
        <div
          role="presentation"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-xs md:hidden"
        />
      )}

      <aside
        aria-label="Navegación lateral del módulo"
        className={
          isDrawer
            ? // Overlay puro: entra deslizándose en cualquier viewport móvil.
              `fixed top-0 bottom-0 left-0 z-40 flex ${widthClass} animate-in flex-col border-r border-border bg-surface shadow-2xl duration-200 fade-in slide-in-from-left-4`
            : // Persistente: drawer traducible en móvil, estática en escritorio.
              `fixed top-0 bottom-0 left-0 z-40 flex ${widthClass} flex-col border-r border-border bg-surface transition-transform duration-200 ease-out md:static md:translate-x-0 ${
                isOpen ? 'translate-x-0' : '-translate-x-full'
              }`
        }
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
              className="text-foreground-muted hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Secciones de navegación con rótulos mono-caps */}
        <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
          {sections.map((section, i) => (
            <div key={i} className="space-y-1">
              {section.label && (
                <span aria-hidden="true" className="nav-group-label">
                  {section.label}
                </span>
              )}
              {section.items.map(renderLink)}
            </div>
          ))}
        </nav>

        {/* Pie del sidebar con telemetría de salud */}
        <div className="border-t border-border-subtle p-3">
          <Link
            to="/health"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-xs text-foreground-subtle transition-colors hover:bg-surface-muted hover:text-foreground-muted"
          >
            <Activity className="h-3.5 w-3.5 text-success" />
            <span>Telemetría de Red</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
