import { useState, type ReactNode } from 'react';
import { Truck, CheckSquare, LayoutDashboard } from 'lucide-react';
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
 * Shell para el módulo del Operador Logístico (C4-4-Codigo-React.md §2: LogisticsShell).
 * Exige rol LogisticsOperator o Administrator en beforeLoad.
 */
export function LogisticsLayout({ children }: LogisticsLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <LayoutSidebar
        items={logisticsNavItems}
        homeHref="/logistics"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <LayoutHeader
          title="Operaciones Logísticas"
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
