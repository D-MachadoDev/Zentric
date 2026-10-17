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
 * Shell del Comprador — "Portal Comercial" (Frontend-Design-System §9.6).
 * Exige rol Buyer o Administrator en beforeLoad (C4-4 §2: BuyerShell).
 *
 * Estructura diferenciada: navegación horizontal superior tipo marketplace
 * (sin barra lateral), lienzo comercial ancho y aireado (max-w-7xl), barra de
 * pestañas inferior en móvil y pie comercial. Acento jade de marca.
 */
export function BuyerLayout({ children }: BuyerLayoutProps) {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  return (
    <div data-role="buyer" className="flex min-h-screen flex-col bg-background text-foreground">
      <LayoutHeader title="Portal de Compras">
        <nav aria-label="Navegación del comprador" className="ml-6 hidden items-center gap-1 sm:flex">
          {buyerNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              currentPath === item.href || (item.href !== '/buyer' && currentPath.startsWith(item.href));

            return (
              <Link
                key={item.href}
                to={item.href as never}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand/10 font-semibold text-brand'
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
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center gap-1 py-1 text-xs font-medium ${
                isActive ? 'font-semibold text-brand' : 'text-foreground-muted'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Lienzo comercial aireado: el comprador necesita respiro, no densidad. */}
      <main className="flex-1 bg-swiss-grid p-4 sm:p-6 lg:p-10">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>

      {/* ── Footer Comercial Zentric Marketplace ── */}
      <footer className="border-t border-border bg-surface/90 px-4 py-8 text-xs text-foreground-muted sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-tight text-foreground font-sans">Zentric Marketplace</span>
            <span>·</span>
            <span>Comercio Transaccional con Reserva Atómica</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono">
            <span>Red de Bodegas Físicas</span>
            <span>·</span>
            <span>Despacho Particionado</span>
            <span>·</span>
            <span>Inspección Técnica Certificada</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
