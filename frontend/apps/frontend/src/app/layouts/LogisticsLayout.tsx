import { useState, type ReactNode } from 'react';
import { Truck, CheckSquare, LayoutDashboard } from 'lucide-react';
import { Link, useRouterState } from '@tanstack/react-router';
import { LayoutHeader } from './LayoutHeader';
import { LayoutSidebar, type NavItem } from './LayoutSidebar';

const logisticsNavItems: NavItem[] = [
  { href: '/logistics', label: 'Panel Logístico', icon: LayoutDashboard },
  { href: '/logistics/fulfillments', label: 'Cola de Despachos', icon: Truck },
  { href: '/logistics/returns', label: 'Inspección de Devoluciones', icon: CheckSquare },
];

interface LogisticsLayoutProps {
  children?: ReactNode;
}

/**
 * Shell del Operador Logístico — "Tablero de Colas" (Frontend-Design-System §9.6).
 * Exige rol LogisticsOperator o Administrator en beforeLoad (C4-4 §2: LogisticsShell).
 *
 * Estructura diferenciada: sin barra lateral; franja de colas en Geist Mono
 * mayúsculas (ADN de terminal) bajo una cabecera compacta h-14, densidad de
 * trabajo máxima para escaneo de colas. Acento cian operativo.
 */
export function LogisticsLayout({ children }: LogisticsLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  return (
    <div data-role="logistics" className="flex min-h-screen flex-col bg-background text-foreground">
      <LayoutHeader
        title="Operaciones Logísticas"
        dense
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
      />

      {/* Franja de colas: pestañas mono-caps tipo terminal de despacho. */}
      <nav
        aria-label="Colas operativas"
        className="hidden border-b border-border-subtle bg-surface md:block"
      >
        <div className="flex items-center gap-1 overflow-x-auto px-4 lg:px-6">
          {logisticsNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              currentPath === item.href ||
              (item.href !== '/logistics' && currentPath.startsWith(item.href));

            return (
              <Link
                key={item.href}
                to={item.href as never}
                aria-current={isActive ? 'page' : undefined}
                className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 font-mono text-xs font-semibold tracking-wider whitespace-nowrap uppercase transition-colors ${
                  isActive
                    ? 'border-brand text-brand'
                    : 'border-transparent text-foreground-muted hover:border-border hover:text-foreground'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Drawer móvil (desmontado cuando está cerrado) */}
      <LayoutSidebar
        variant="drawer"
        items={logisticsNavItems}
        homeHref="/logistics"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Densidad operativa: padding reducido para máxima filas visibles. */}
      <main className="flex-1 overflow-y-auto bg-background p-4 lg:p-6">
        {children}
      </main>
    </div>
  );
}
