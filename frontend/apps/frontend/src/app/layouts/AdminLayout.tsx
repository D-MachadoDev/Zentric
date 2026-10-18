import { useState, type ReactNode } from 'react';
import { LayoutDashboard, Users, Boxes, Sliders, RotateCcw, Receipt } from 'lucide-react';
import { LayoutHeader } from './LayoutHeader';
import { LayoutSidebar, type NavGroup, type NavItem } from './LayoutSidebar';

const adminAnchor: NavItem[] = [
  { href: '/admin', label: 'Panel General', icon: LayoutDashboard },
];

const adminGroups: NavGroup[] = [
  {
    label: 'GOBERNANZA',
    items: [
      { href: '/admin/users', label: 'Directorio de Usuarios', icon: Users },
    ],
  },
  {
    label: 'INFRAESTRUCTURA',
    items: [
      { href: '/admin/warehouses', label: 'Red de Bodegas', icon: Boxes },
      { href: '/admin/inventory-adjustments', label: 'Ajustes de Inventario', icon: Sliders },
    ],
  },
  {
    label: 'FINANZAS & POSTVENTA',
    items: [
      { href: '/admin/invoices', label: 'Facturación Split', icon: Receipt },
      { href: '/admin/returns', label: 'Reembolsos y Devoluciones', icon: RotateCcw },
    ],
  },
];

interface AdminLayoutProps {
  children?: ReactNode;
}

/**
 * Shell del Administrador — "Centro de Mando" (Frontend-Design-System §9.6).
 * Exige rol Administrator en beforeLoad (C4-4-Codigo-React.md §2: AdminShell).
 *
 * Estructura diferenciada: barra lateral persistente con secciones mono-caps
 * agrupadas (GOBERNANZA / INFRAESTRUCTURA / FINANZAS & POSTVENTA), acento
 * índigo de gobernanza. El lienzo fluido se expande a ancho completo (w-full max-w-none)
 * para evitar recortes en tablas de datos densas.
 */
export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div data-role="admin" className="flex min-h-screen bg-background text-foreground">
      {/* Barra lateral persistente de administración central con navegación agrupada */}
      <LayoutSidebar
        items={adminAnchor}
        groups={adminGroups}
        homeHref="/admin"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <LayoutHeader
          title="Administración Central"
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 w-full max-w-none">
          {children}
        </main>
      </div>
    </div>
  );
}
