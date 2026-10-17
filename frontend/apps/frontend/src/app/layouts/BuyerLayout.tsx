import type { ReactNode } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { ShoppingBag, ShoppingCart, Package } from 'lucide-react';
import { LayoutHeader } from './LayoutHeader';

interface BuyerLayoutProps {
  children?: ReactNode;
}

const buyerNavItems = [
  { href: '/buyer', label: 'Catálogo', icon: Package },
  { href: '/buyer/cart', label: 'Carrito', icon: ShoppingCart },
  { href: '/buyer/orders', label: 'Mis Pedidos', icon: ShoppingBag },
];

/**
 * Shell para el módulo del Comprador (C4-4-Codigo-React.md §2: BuyerShell).
 * Exige rol Buyer o Administrator en beforeLoad.
 * Aplica navegación horizontal superior tipo portal de compras de alta fidelidad.
 */
export function BuyerLayout({ children }: BuyerLayoutProps) {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <LayoutHeader title="Portal de Compras">
        <nav aria-label="Navegación del comprador" className="hidden items-center gap-1 sm:flex ml-6">
          {buyerNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              currentPath === item.href || (item.href !== '/buyer' && currentPath.startsWith(item.href));

            return (
              <Link
                key={item.href}
                to={item.href as never}
                className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand/10 text-brand font-semibold'
                    : 'text-foreground-muted hover:bg-surface-muted hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </LayoutHeader>

      {/* Navegación móvil inferior o secundaria */}
      <nav
        aria-label="Navegación móvil del comprador"
        className="flex items-center justify-around border-b border-border bg-surface py-2 sm:hidden"
      >
        {buyerNavItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            currentPath === item.href || (item.href !== '/buyer' && currentPath.startsWith(item.href));

          return (
            <Link
              key={item.href}
              to={item.href as never}
              className={`flex flex-col items-center gap-1 py-1 text-xs font-medium ${
                isActive ? 'text-brand font-semibold' : 'text-foreground-muted'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <main className="flex-1 bg-swiss-grid p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
