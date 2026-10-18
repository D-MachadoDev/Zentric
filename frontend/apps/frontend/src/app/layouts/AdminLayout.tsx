import { useState, type ReactNode } from 'react';
import { LayoutDashboard, Users, Boxes, Sliders, RotateCcw, Receipt } from 'lucide-react';
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

  return (
    <div data-role="admin" className="flex min-h-screen bg-background text-foreground">
      {/* Barra lateral persistente de administración central */}
      <LayoutSidebar
        items={adminNavItems}
        homeHref="/admin"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <LayoutHeader
          title="Administración Central"
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
