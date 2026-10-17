import { useState, type ReactNode } from 'react';
import { LayoutDashboard, Users, Boxes, Sliders, RotateCcw, Receipt } from 'lucide-react';
import { Link, useRouterState } from '@tanstack/react-router';
import { LayoutHeader } from './LayoutHeader';
import { LayoutSidebar, type NavItem } from './LayoutSidebar';

const adminNavItems: NavItem[] = [
  { href: '/admin', label: 'Panel General', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Directorio de Usuarios', icon: Users },
  { href: '/admin/warehouses', label: 'Red de Bodegas', icon: Boxes },
  { href: '/admin/inventory-adjustments', label: 'Ajustes de Inventario', icon: Sliders },
  { href: '/admin/returns', label: 'Reembolsos y Devoluciones', icon: RotateCcw },
  { href: '/admin/invoices', label: 'Facturación Split', icon: Receipt },
];

interface AdminLayoutProps {
  children?: ReactNode;
}

/**
 * Shell del Administrador — "Centro de Mando" (Frontend-Design-System §9.6).
 * Exige rol Administrator en beforeLoad (C4-4-Codigo-React.md §2: AdminShell).
 *
 * Estructura diferenciada: navegación horizontal de gobernanza tipo pestañas
 * con subrayado de acento (índigo), en lugar de barra lateral persistente.
 * El drawer móvil monta SOLO abierto para no duplicar la navegación.
 */
export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  return (
    <div data-role="admin" className="flex min-h-screen flex-col bg-background text-foreground">
      <LayoutHeader
        title="Administración Central"
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
      />

      {/* Navegación de escritorio: pestañas de mando con subrayado índigo.
          En móvil se oculta y gobierna el drawer (misma fuente de ítems). */}
      <nav
        aria-label="Navegación de gobernanza"
        className="hidden border-b border-border-subtle bg-surface md:block"
      >
        <div className="flex items-end gap-1 overflow-x-auto px-6">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              currentPath === item.href ||
              (item.href !== '/admin' && currentPath.startsWith(item.href));

            return (
              <Link
                key={item.href}
                to={item.href as never}
                aria-current={isActive ? 'page' : undefined}
                className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-brand font-semibold text-brand'
                    : 'border-transparent text-foreground-muted hover:border-border hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Drawer móvil (desmontado cuando está cerrado) */}
      <LayoutSidebar
        variant="drawer"
        items={adminNavItems}
        homeHref="/admin"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 overflow-y-auto bg-swiss-grid p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
