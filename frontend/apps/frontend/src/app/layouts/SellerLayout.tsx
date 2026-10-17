import { useState, type ReactNode } from 'react';
import { LayoutDashboard, Package, Layers, ShoppingBag, Truck, RotateCcw } from 'lucide-react';
import { LayoutHeader } from './LayoutHeader';
import { LayoutSidebar, type NavItem } from './LayoutSidebar';

const sellerNavItems: NavItem[] = [
  { href: '/seller', label: 'Panel del Vendedor', icon: LayoutDashboard },
  { href: '/seller/products', label: 'Mis Productos', icon: Package },
  { href: '/seller/inventory', label: 'Mi Inventario', icon: Layers },
  { href: '/seller/orders', label: 'Pedidos Recibidos', icon: ShoppingBag },
  { href: '/seller/fulfillments', label: 'Cola de Despachos', icon: Truck },
  { href: '/seller/returns', label: 'Resolución Devoluciones', icon: RotateCcw },
];

interface SellerLayoutProps {
  children?: ReactNode;
}

/**
 * Shell para el módulo del Vendedor (C4-4-Codigo-React.md §2: SellerShell).
 * Exige rol Seller o Administrator en beforeLoad.
 */
export function SellerLayout({ children }: SellerLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <LayoutSidebar
        items={sellerNavItems}
        homeHref="/seller"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <LayoutHeader
          title="Consola del Vendedor"
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        />

        <main className="flex-1 overflow-y-auto bg-swiss-grid p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
