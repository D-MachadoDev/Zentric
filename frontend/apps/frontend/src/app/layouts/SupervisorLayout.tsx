import { useState, type ReactNode } from 'react';
import { Eye, ShoppingBag, Truck, RotateCcw, Receipt, Sliders } from 'lucide-react';
import { LayoutHeader } from './LayoutHeader';
import { LayoutSidebar, type NavItem } from './LayoutSidebar';

const supervisorNavItems: NavItem[] = [
  { href: '/supervisor', label: 'Fiscalización General', icon: Eye },
  { href: '/supervisor/orders', label: 'Pedidos Globales', icon: ShoppingBag },
  { href: '/supervisor/fulfillments', label: 'Monitoreo de Despachos', icon: Truck },
  { href: '/supervisor/returns', label: 'Expedientes Devolución', icon: RotateCcw },
  { href: '/supervisor/invoices', label: 'Libro Mayor Facturas', icon: Receipt },
  { href: '/supervisor/inventory-audit', label: 'Auditoría Conteo Físico', icon: Sliders },
];

interface SupervisorLayoutProps {
  children?: ReactNode;
}

/**
 * Shell para el módulo del Supervisor de Auditoría (C4-4-Codigo-React.md §2: SupervisorShell).
 * Exige rol Supervisor o Administrator en beforeLoad.
 */
export function SupervisorLayout({ children }: SupervisorLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <LayoutSidebar
        items={supervisorNavItems}
        homeHref="/supervisor"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <LayoutHeader
          title="Auditoría y Fiscalización"
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        />

        <main className="flex-1 overflow-y-auto bg-swiss-grid p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
