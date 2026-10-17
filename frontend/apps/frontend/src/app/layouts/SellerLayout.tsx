import { useState, type ReactNode } from 'react';
import {
  LayoutDashboard,
  Package,
  Layers,
  Warehouse as WarehouseIcon,
  ShoppingBag,
  Truck,
  RotateCcw,
} from 'lucide-react';
import { LayoutHeader } from './LayoutHeader';
import { LayoutSidebar, type NavGroup, type NavItem } from './LayoutSidebar';

const sellerAnchor: NavItem[] = [
  { href: '/seller', label: 'Panel del Vendedor', icon: LayoutDashboard },
];

const sellerGroups: NavGroup[] = [
  {
    label: 'Catálogo',
    items: [
      { href: '/seller/products', label: 'Mis Productos', icon: Package },
      { href: '/seller/inventory', label: 'Mi Inventario', icon: Layers },
      { href: '/seller/warehouses', label: 'Mis Bodegas', icon: WarehouseIcon },
    ],
  },
  {
    label: 'Ventas',
    items: [
      { href: '/seller/orders', label: 'Pedidos Recibidos', icon: ShoppingBag },
      { href: '/seller/fulfillments', label: 'Cola de Despachos', icon: Truck },
      { href: '/seller/returns', label: 'Resolución Devoluciones', icon: RotateCcw },
    ],
  },
];

interface SellerLayoutProps {
  children?: ReactNode;
}

/**
 * Shell del Vendedor — "Estudio del Vendedor" (Frontend-Design-System §9.6).
 * Exige rol Seller o Administrator en beforeLoad (C4-4 §2: SellerShell).
 *
 * Estructura diferenciada: barra lateral persistente con secciones mono-caps
 * (Catálogo / Ventas) tipo taller de gestión, acento violeta de socio
 * comercial. El lienzo completo queda para rejillas de catálogo.
 */
export function SellerLayout({ children }: SellerLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div data-role="seller" className="flex min-h-screen bg-background text-foreground">
      <LayoutSidebar
        items={sellerAnchor}
        groups={sellerGroups}
        homeHref="/seller"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
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
